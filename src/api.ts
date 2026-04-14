// TokenRouter MVP - Main API Entry Point
import { INDEX_HTML } from './generated-index';
import { handlePIIMask } from './workers/pii-masking';
import { handleEnterpriseMask, handleOntologyUpload } from './workers/enterprise-masking';
import { handleComplianceCheck } from './workers/compliance';
import { handleChat, handleAnthropicChat, AIRouterService } from './workers/ai-router';
import { handlePrivacyCompute } from './workers/privacy-compute';
import { handleAuditLog, handleAuditQuery, handleAuditExport } from './workers/audit';
import { handleCreateAPIKey, handleListAPIKeys, handleRevokeAPIKey, handleRotateAPIKey, handleGetUsage, handleAdminAudit, handleAdminHealth, handleGetModels, handleEnableMachine, handleDisableMachine, handleUpdateMachine, handleGetMachines, handleGetPrivacyReport, handleUpdateTokenLimit, handleResetTokenUsage } from './workers/admin';
import { handleRegisterUser, handleLogin, handleLogout, handleGetMe, handleListUsers, handleDeleteUser } from './workers/users';
import { D1Client } from './lib/d1';
import { GraphCache } from './lib/kv';
import type { Env } from './types';

/**
 * Authenticated user info
 */
interface AuthInfo {
  companyId: string;
  rateLimit: number;
  tokenLimit: number;
  tokenUsed: number;
}

/**
 * Extract API key from request
 */
function extractAPIKey(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  const apiKeyHeader = request.headers.get('X-API-Key');
  if (apiKeyHeader) {
    return apiKeyHeader;
  }
  return null;
}

/**
 * Validate API key and get auth info
 */
async function validateAuth(request: Request, env: Env): Promise<AuthInfo | null> {
  const apiKey = extractAPIKey(request);
  if (!apiKey) {
    return null;
  }

  const db = new D1Client(env.DB);
  const result = await db.validateAPIKey(apiKey);

  if (result.valid && result.company_id) {
    return {
      companyId: result.company_id,
      rateLimit: result.rate_limit || 60,
      tokenLimit: result.token_limit || 100000,
      tokenUsed: result.token_used || 0
    };
  }

  return null;
}

/**
 * Check token limit and reject if exceeded
 */
function checkTokenLimit(auth: AuthInfo, tokensNeeded: number): Response | null {
  // tokenLimit of 0 means unlimited
  if (auth.tokenLimit > 0) {
    if (auth.tokenUsed + tokensNeeded > auth.tokenLimit) {
      return Response.json(
        {
          success: false,
          error: 'Token limit exceeded',
          code: 'TOKEN_LIMIT_EXCEEDED',
          token_limit: auth.tokenLimit,
          token_used: auth.tokenUsed,
          tokens_requested: tokensNeeded,
          message: `Token limit of ${auth.tokenLimit.toLocaleString()} exceeded. Current usage: ${auth.tokenUsed.toLocaleString()}. Contact admin to increase limit.`
        },
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
  return null;
}

/**
 * Require authentication - returns 401 if not authenticated
 */
async function requireAuth(request: Request, env: Env): Promise<Response | null> {
  const auth = await validateAuth(request, env);
  if (!auth) {
    return Response.json(
      {
        success: false,
        error: 'Unauthorized - valid API key required',
        code: 'UNAUTHORIZED'
      },
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return null;
}

/**
 * Require authentication and return auth info
 */
async function requireAuthWithInfo(request: Request, env: Env): Promise<{ error: Response | null; auth: AuthInfo | null }> {
  const auth = await validateAuth(request, env);
  if (!auth) {
    return {
      error: Response.json(
        {
          success: false,
          error: 'Unauthorized - valid API key required',
          code: 'UNAUTHORIZED'
        },
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
      auth: null
    };
  }
  return { error: null, auth };
}

/**
 * Check rate limit for request
 */
async function checkRateLimit(request: Request, env: Env, limit: number): Promise<Response | null> {
  const apiKey = extractAPIKey(request) || 'anonymous';
  const cache = new GraphCache(env.SESSIONS);
  
  // Hash the API key for privacy
  const keyHash = await hashString(apiKey.substring(0, 32));
  const result = await cache.checkRateLimit(keyHash, limit, 60);
  
  if (!result.allowed) {
    return Response.json(
      {
        success: false,
        error: 'Rate limit exceeded',
        code: 'RATE_LIMITED',
        retry_after_ms: result.resetAt - Date.now()
      },
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(result.resetAt)
        }
      }
    );
  }
  return null;
}

/**
 * Simple string hash for rate limit key
 */
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate admin request (session-based auth)
 */
async function requireAdmin(request: Request, env: Env): Promise<Response | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json(
      {
        success: false,
        error: 'Admin access required',
        code: 'UNAUTHORIZED'
      },
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const token = authHeader.slice(7);
  const tokenHash = await hashString(token);

  // Check session in database
  const session = await env.DB
    .prepare(`
      SELECT s.*, u.username, u.role
      FROM admin_sessions s
      JOIN admin_users u ON s.user_id = u.id
      WHERE s.token_hash = ? AND s.expires_at > ? AND u.is_active = 1
    `)
    .bind(tokenHash, Date.now())
    .first();

  if (!session) {
    // Fallback: check static ADMIN_SECRET for backward compatibility
    if (token !== env.ADMIN_SECRET) {
      return Response.json(
        {
          success: false,
          error: 'Invalid or expired session',
          code: 'FORBIDDEN'
        },
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return null;
}

/**
 * Main Worker Handler
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key'
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route to handler
      const response = await routeRequest(request, env, path, url);

      // Add CORS headers
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(corsHeaders)) {
        headers.set(key, value);
      }

      return new Response(response.body, {
        status: response.status,
        headers
      });
    } catch (error) {
      return Response.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Internal error'
        },
        {
          status: 500,
          headers: corsHeaders
        }
      );
    }
  }
};

/**
 * Route request to appropriate handler
 */
async function routeRequest(
  request: Request,
  env: Env,
  path: string,
  url: URL
): Promise<Response> {
  // Health check
  if (path === '/health') {
    const router = new AIRouterService(env);
    return Response.json({
      status: 'ok',
      version: env.VERSION || '0.1.0',
      timestamp: new Date().toISOString(),
      available_providers: router.getAvailableProviders()
    });
  }

  // SPA fallback - serve index.html for client-side routes
  // The INDEX_HTML is auto-generated at build time from dist/index.html
  if (path === '/admin' || path === '/admin.html') {
    return new Response(INDEX_HTML, {
      headers: { 'Content-Type': 'text/html', 'Cache-Control': 'public, max-age=0' }
    });
  }

  // API v1 routes
  if (path.startsWith('/v1/')) {
    const route = path.slice(4); // Remove '/v1/'

    // Provider info endpoint
    if (route === 'providers' && request.method === 'GET') {
      const router = new AIRouterService(env);
      return Response.json({
        available_providers: router.getAvailableProviders()
      });
    }

    switch (route) {
      // Public endpoints (no auth required)
      case 'mask':
      case 'compliance/check':
      case 'providers':
        break;

      // Protected endpoints - require authentication
      case 'mask/enterprise':
      case 'audit':
      case 'audit/export':
      case 'privacy/compute': {
        const authError = await requireAuth(request, env);
        if (authError) return authError;

        // Check rate limit (default 60 req/min)
        const rateLimitError = await checkRateLimit(request, env, 60);
        if (rateLimitError) return rateLimitError;
        break;
      }

      default:
        // Check for ontology upload: PUT /v1/ontology/{company_id}
        if (route.startsWith('ontology/') && request.method === 'PUT') {
          const authError = await requireAuth(request, env);
          if (authError) return authError;
          return handleOntologyUpload(request, env);
        }
    }

    // Route to handler
    switch (route) {
      // PII Masking (public)
      case 'mask':
        if (request.method === 'POST') {
          return handlePIIMask(request, env);
        }
        break;

      // Enterprise Masking (protected)
      case 'mask/enterprise':
        if (request.method === 'POST') {
          return handleEnterpriseMask(request, env);
        }
        break;

      // Privacy Compute (protected) - local computation + LLM summary
      case 'privacy/compute':
        if (request.method === 'POST') {
          return handlePrivacyCompute(request, env);
        }
        break;

      // Compliance (public)
      case 'compliance/check':
        if (request.method === 'POST') {
          return handleComplianceCheck(request, env);
        }
        break;

      // Provider info (public)
      case 'providers':
        if (request.method === 'GET') {
          const router = new AIRouterService(env);
          return Response.json({
            available_providers: router.getAvailableProviders()
          });
        }
        break;

      // Chat / AI Routing - OpenAI Protocol (protected)
      case 'chat':
      case 'chat/completions':
        if (request.method === 'POST') {
          const chatAuthResult = await requireAuthWithInfo(request, env);
          if (chatAuthResult.error) return chatAuthResult.error;
          return handleChat(request, env, chatAuthResult.auth!);
        }
        break;

      // Chat / AI Routing - Anthropic Protocol (protected)
      case 'anthropic/messages':
        if (request.method === 'POST') {
          const chatAuthResult = await requireAuthWithInfo(request, env);
          if (chatAuthResult.error) return chatAuthResult.error;
          return handleAnthropicChat(request, env, chatAuthResult.auth!);
        }
        break;

      // Audit (protected)
      case 'audit':
        if (request.method === 'POST') {
          return handleAuditLog(request, env);
        }
        if (request.method === 'GET') {
          return handleAuditQuery(request, env);
        }
        break;

      case 'audit/export':
        if (request.method === 'GET') {
          return handleAuditExport(request, env);
        }
        break;

      // User management endpoints (public - registration/login)
      case 'admin/register':
        if (request.method === 'POST') {
          return handleRegisterUser(request, env);
        }
        break;

      case 'admin/login':
        if (request.method === 'POST') {
          return handleLogin(request, env);
        }
        break;

      case 'admin/logout':
        if (request.method === 'POST') {
          return handleLogout(request, env);
        }
        break;

      case 'admin/me':
        if (request.method === 'GET') {
          return handleGetMe(request, env);
        }
        break;

      // Admin endpoints (protected with admin secret)
      case 'admin/health':
        if (request.method === 'GET') {
          return handleAdminHealth(request, env);
        }
        break;

      case 'admin/keys':
      case 'admin/usage':
      case 'admin/audit':
      case 'admin/models':
      case 'admin/machines':
      case 'admin/privacy-report': {
        const adminError = await requireAdmin(request, env);
        if (adminError) return adminError;

        if (route === 'admin/keys') {
          if (request.method === 'POST') {
            return handleCreateAPIKey(request, env);
          }
          if (request.method === 'GET') {
            return handleListAPIKeys(request, env);
          }
        }
        if (route === 'admin/usage' && request.method === 'GET') {
          return handleGetUsage(request, env);
        }
        if (route === 'admin/audit' && request.method === 'GET') {
          return handleAdminAudit(request, env);
        }
        if (route === 'admin/models' && request.method === 'GET') {
          return handleGetModels(request, env);
        }
        if (route === 'admin/machines' && request.method === 'GET') {
          return handleGetMachines(request, env);
        }
        if (route === 'admin/privacy-report' && request.method === 'GET') {
          return handleGetPrivacyReport(request, env);
        }
        break;
      }

      default:
        // Check for key operations with keyHash: /v1/admin/keys/{keyHash}/[action]
        if (route.startsWith('admin/keys/')) {
          const adminError = await requireAdmin(request, env);
          if (adminError) return adminError;

          const pathParts = route.split('/');
          // parts: ['admin', 'keys', '{keyHash}', 'action?']
          if (pathParts.length >= 3) {
            const keyHash = pathParts[2];
            const action = pathParts[3];

            if (request.method === 'DELETE') {
              return handleRevokeAPIKey(request, env);
            }
            if (request.method === 'POST' && action === 'rotate') {
              return handleRotateAPIKey(request, env);
            }
            if (request.method === 'POST' && action === 'enable') {
              return handleEnableMachine(request, env);
            }
            if (request.method === 'POST' && action === 'disable') {
              return handleDisableMachine(request, env);
            }
            if (request.method === 'PATCH') {
              return handleUpdateMachine(request, env);
            }
            if (request.method === 'PUT' && action === 'token-limit') {
              return handleUpdateTokenLimit(request, env);
            }
            if (request.method === 'POST' && action === 'reset-usage') {
              return handleResetTokenUsage(request, env);
            }
          }
        }
    }
  }

  // 404 Not Found
  return Response.json(
    {
      success: false,
      error: `Route not found: ${path}`,
      available_routes: [
        'POST /v1/mask - PII masking',
        'POST /v1/mask/enterprise - Enterprise sensitive info masking',
        'POST /v1/compliance/check - EU AI Act compliance check',
        'POST /v1/chat - AI chat with routing',
        'POST /v1/audit - Create audit log',
        'GET /v1/audit - Query audit logs',
        'GET /v1/audit/export - Export audit logs',
        'PUT /v1/ontology/{company_id} - Upload enterprise ontology (TTL)'
      ]
    },
    { status: 404 }
  );
}
