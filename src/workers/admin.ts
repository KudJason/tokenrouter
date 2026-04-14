// Admin API Worker - API Key Management and Usage Statistics
import { D1Client } from '../lib/d1';
import type { Env } from '../types';

/**
 * Generate a random API key
 */
function generateAPIKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const prefix = 'tr_';
  let key = prefix;
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

/**
 * Hash API key for storage
 */
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create new API key
 * POST /v1/admin/keys
 */
export async function handleCreateAPIKey(
  request: Request,
  env: Env
): Promise<Response> {
  const startTime = Date.now();

  try {
    const body = await request.json() as {
      company_id?: string;
      company_name?: string;
      key_name?: string;
      rate_limit_rpm?: number;
    };

    // company_id is optional for admin-created keys, use 'default' if not provided
    const companyId = body.company_id || 'default';

    const db = new D1Client(env.DB);

    // Generate new key
    const apiKey = generateAPIKey();
    const keyHash = await hashKey(apiKey);

    // Save to database
    const success = await db.createAPIKey(apiKey, companyId, body.key_name);

    if (!success) {
      return Response.json(
        { success: false, error: 'Failed to create API key' },
        { status: 500 }
      );
    }

    // Update rate limit if specified
    if (body.rate_limit_rpm) {
      await env.DB
        .prepare('UPDATE api_keys SET rate_limit_rpm = ? WHERE key_hash = ?')
        .bind(body.rate_limit_rpm, keyHash)
        .run();
    }

    return Response.json({
      success: true,
      api_key: apiKey, // Only returned once!
      key_hash: keyHash,
      company_id: companyId,
      key_name: body.key_name || null,
      rate_limit_rpm: body.rate_limit_rpm || 60,
      created_at: Date.now()
    }, { status: 201 });

  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
        processing_time_ms: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

/**
 * List API keys for a company
 * GET /v1/admin/keys?company_id=xxx
 */
export async function handleListAPIKeys(
  request: Request,
  env: Env
): Promise<Response> {
  const startTime = Date.now();

  try {
    const url = new URL(request.url);
    const companyId = url.searchParams.get('company_id');

    let query = `
      SELECT key_hash, company_id, key_name, created_at, last_used_at, is_active, is_enabled, rate_limit_rpm, token_limit, token_used
      FROM api_keys
    `;
    const bindings: string[] = [];

    if (companyId) {
      query += ` WHERE company_id = ?`;
      bindings.push(companyId);
    }
    query += ` ORDER BY created_at DESC`;

    const results = companyId
      ? await env.DB.prepare(query).bind(...bindings).all()
      : await env.DB.prepare(query).all();

    const keys = (results.results || []).map((row: any) => ({
      key_hash: row.key_hash,
      company_id: row.company_id,
      key_name: row.key_name,
      created_at: row.created_at,
      last_used_at: row.last_used_at,
      is_active: Boolean(row.is_active),
      is_enabled: row.is_enabled !== undefined ? Boolean(row.is_enabled) : true,
      rate_limit_rpm: row.rate_limit_rpm,
      token_limit: row.token_limit || 100000,
      token_used: row.token_used || 0
    }));

    return Response.json({
      success: true,
      keys,
      count: keys.length
    });

  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
        processing_time_ms: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

/**
 * Revoke API key
 * DELETE /v1/admin/keys/{keyHash}
 */
export async function handleRevokeAPIKey(
  request: Request,
  env: Env
): Promise<Response> {
  const startTime = Date.now();

  try {
    const url = new URL(request.url);
    // URL: /v1/admin/keys/{keyHash}
    const parts = url.pathname.split('/');
    // parts: ['', 'v1', 'admin', 'keys', '{keyHash}']
    const keyHash = parts[4];

    if (!keyHash) {
      return Response.json(
        { success: false, error: 'key_hash is required' },
        { status: 400 }
      );
    }

    const result = await env.DB
      .prepare('UPDATE api_keys SET is_active = 0 WHERE key_hash = ?')
      .bind(keyHash)
      .run();

    if (!result.success) {
      return Response.json(
        { success: false, error: 'Failed to revoke key' },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      revoked: true,
      key_hash: keyHash
    });

  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
        processing_time_ms: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

/**
 * Get usage statistics
 * GET /v1/admin/usage?company_id=xxx&from=timestamp&to=timestamp
 */
export async function handleGetUsage(
  request: Request,
  env: Env
): Promise<Response> {
  const startTime = Date.now();

  try {
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    // Global stats - no company_id required
    let sql = `
      SELECT date, provider, model,
             prompt_tokens, completion_tokens, total_tokens,
             cost_usd, request_count
      FROM usage_stats
      WHERE 1=1
    `;
    const bindings: (string | number)[] = [];

    if (from) {
      sql += ` AND date >= ?`;
      bindings.push(from);
    }
    if (to) {
      sql += ` AND date <= ?`;
      bindings.push(to);
    }

    sql += ` ORDER BY date DESC LIMIT 100`;

    const results = await env.DB
      .prepare(sql)
      .bind(...bindings)
      .all();

    // Calculate totals
    const stats = results.results || [];
    const totals = stats.reduce((acc: any, row: any) => {
      acc.prompt_tokens += row.prompt_tokens || 0;
      acc.completion_tokens += row.completion_tokens || 0;
      acc.total_tokens += row.total_tokens || 0;
      acc.cost_usd += row.cost_usd || 0;
      acc.request_count += row.request_count || 0;
      return acc;
    }, { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, cost_usd: 0, request_count: 0 });

    // Provider breakdown
    const byProvider: Record<string, any> = {};
    for (const row of stats) {
      const provider = row.provider;
      if (!byProvider[provider]) {
        byProvider[provider] = { total_tokens: 0, cost_usd: 0, request_count: 0 };
      }
      byProvider[provider].total_tokens += row.total_tokens || 0;
      byProvider[provider].cost_usd += row.cost_usd || 0;
      byProvider[provider].request_count += row.request_count || 0;
    }

    return Response.json({
      success: true,
      period: { from: from || 'all', to: to || 'now' },
      totals,
      by_provider: byProvider,
      daily: stats.slice(0, 30) // Last 30 days
    });

  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
        processing_time_ms: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

/**
 * Get audit logs (admin view)
 * GET /v1/admin/audit?company_id=xxx
 */
export async function handleAdminAudit(
  request: Request,
  env: Env
): Promise<Response> {
  const startTime = Date.now();

  try {
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') || '100';
    const offset = url.searchParams.get('offset') || '0';

    // Global audit logs - no company_id required
    const results = await env.DB
      .prepare(`
        SELECT * FROM audit_logs
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
      `)
      .bind(parseInt(limit), parseInt(offset))
      .all();

    const logs = (results.results || []).map((row: any) => ({
      id: row.id,
      timestamp: row.timestamp,
      company_id: row.company_id,
      user_id: row.user_id,
      status: row.status,
      risk_level: row.risk_level,
      provider: row.provider,
      model: row.model,
      pii_detected: Boolean(row.pii_detected),
      enterprise_masked: Boolean(row.enterprise_masked)
    }));

    return Response.json({
      success: true,
      logs,
      count: logs.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
        processing_time_ms: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

/**
 * Health check for admin API
 * GET /v1/admin/health
 */
export async function handleAdminHealth(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // Check D1 connectivity
    const dbResult = await env.DB
      .prepare('SELECT COUNT(*) as count FROM api_keys')
      .first();

    return Response.json({
      success: true,
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        api_keys_count: dbResult?.count || 0
      }
    });

  } catch (error) {
    return Response.json({
      success: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Database error'
    }, { status: 500 });
  }
}

/**
 * Rotate API key - generate new secret, keep key_hash updated
 * POST /v1/admin/keys/{keyHash}/rotate
 */
export async function handleRotateAPIKey(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    // URL: /v1/admin/keys/{keyHash}/rotate
    const parts = url.pathname.split('/');
    // parts: ['', 'v1', 'admin', 'keys', '{keyHash}', 'rotate']
    const keyHash = parts[4]; // Get keyHash at index 4

    if (!keyHash || keyHash === 'keys') {
      return Response.json(
        { success: false, error: 'Key hash is required' },
        { status: 400 }
      );
    }

    // Check if key exists
    const existing = await env.DB
      .prepare('SELECT * FROM api_keys WHERE key_hash = ?')
      .bind(keyHash)
      .first();

    if (!existing) {
      return Response.json(
        { success: false, error: 'API key not found' },
        { status: 404 }
      );
    }

    // Generate new key
    const newApiKey = generateAPIKey();
    const newKeyHash = await hashKey(newApiKey);

    // Update the key in database
    await env.DB
      .prepare('UPDATE api_keys SET key_hash = ?, created_at = ? WHERE key_hash = ?')
      .bind(newKeyHash, Date.now(), keyHash)
      .run();

    return Response.json({
      success: true,
      api_key: newApiKey,
      key_hash: newKeyHash,
      message: 'Key rotated successfully. Save the new key - it will not be shown again.'
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Rotate failed'
    }, { status: 500 });
  }
}

/**
 * Get AI providers and their usage stats
 * GET /v1/admin/models
 */
export async function handleGetModels(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // Define provider configs with their API endpoints for listing models
    const providerConfigs = [
      {
        name: 'openai',
        envKey: 'OPENAI_API_KEY',
        apiEndpoint: 'https://api.openai.com/v1/models',
        headerKey: 'Authorization',
        headerPrefix: 'Bearer '
      },
      {
        name: 'anthropic',
        envKey: 'ANTHROPIC_API_KEY',
        apiEndpoint: 'https://api.anthropic.com/v1/models',
        headerKey: 'x-api-key',
        headerPrefix: ''
      },
      {
        name: 'deepseek',
        envKey: 'DEEPSEEK_API_KEY',
        apiEndpoint: 'https://api.deepseek.com/v1/models',
        headerKey: 'Authorization',
        headerPrefix: 'Bearer '
      },
      {
        name: 'siliconflow',
        envKey: 'SILICONFLOW_API_KEY',
        apiEndpoint: 'https://api.siliconflow.cn/v1/models',
        headerKey: 'Authorization',
        headerPrefix: 'Bearer '
      }
    ];

    const providers = await Promise.all(
      providerConfigs.map(async (config) => {
        const apiKey = (env as any)[config.envKey];
        const enabled = apiKey && apiKey.trim() !== '';

        let models: string[] = [];
        let stats = null;
        let error = null;

        // If enabled, try to fetch model list from provider API
        if (enabled) {
          try {
            const response = await fetch(config.apiEndpoint, {
              headers: {
                [config.headerKey]: `${config.headerPrefix}${apiKey}`,
                'Content-Type': 'application/json'
              }
            });

            if (response.ok) {
              const data = await response.json();

              // Parse model list based on provider format
              if (config.name === 'openai' || config.name === 'siliconflow') {
                // OpenAI-compatible format: { data: [{ id: "gpt-4", ... }] }
                models = (data.data || [])
                  .map((m: any) => m.id)
                  .filter((id: string) => !id.startsWith('gpt-') || id.includes('gpt-4')) // Filter to useful models
                  .slice(0, 20); // Limit to 20 models
              } else if (config.name === 'anthropic') {
                // Anthropic format: { models: [{ name: "claude-3-5-sonnet-latest", ... }] }
                models = (data.models || [])
                  .map((m: any) => m.name)
                  .slice(0, 20);
              } else if (config.name === 'deepseek') {
                // DeepSeek uses OpenAI-compatible format
                models = (data.data || [])
                  .map((m: any) => m.id)
                  .filter((id: string) => id.includes('deepseek'))
                  .slice(0, 10);
              }
            } else {
              error = `API returned ${response.status}`;
              // Fallback to common models
              models = getDefaultModels(config.name);
            }
          } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to fetch models';
            models = getDefaultModels(config.name);
          }
        } else {
          // Not enabled - set empty defaults
          models = [];
          stats = null;
        }

        // Get usage stats from database for this provider
        if (enabled) {
          const result = await env.DB
            .prepare(`
              SELECT
                COALESCE(SUM(request_count), 0) as requests,
                COALESCE(SUM(prompt_tokens), 0) as prompt_tokens,
                COALESCE(SUM(completion_tokens), 0) as completion_tokens,
                COALESCE(SUM(total_tokens), 0) as total_tokens,
                COALESCE(SUM(cost_usd), 0) as cost_usd
              FROM usage_stats
              WHERE provider = ?
            `)
            .bind(config.name)
            .first();

          stats = {
            requests: result?.requests || 0,
            prompt_tokens: result?.prompt_tokens || 0,
            completion_tokens: result?.completion_tokens || 0,
            total_tokens: result?.total_tokens || 0,
            cost_usd: result?.cost_usd || 0
          };
        }

        return {
          name: config.name,
          enabled,
          error,
          models,
          stats
        };
      })
    );

    return Response.json({
      success: true,
      providers
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get models'
    }, { status: 500 });
  }
}

/**
 * Get default models for a provider (fallback when API fails)
 */
function getDefaultModels(providerName: string): string[] {
  const defaults: Record<string, string[]> = {
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4'],
    anthropic: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
    deepseek: ['deepseek-chat', 'deepseek-coder'],
    siliconflow: ['deepseek-ai/DeepSeek-V3', 'Qwen/Qwen2.5-7B-Instruct']
  };
  return defaults[providerName] || [];
}

/**
 * Enable a machine (set is_enabled = 1)
 * POST /v1/admin/keys/{keyHash}/enable
 */
export async function handleEnableMachine(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split('/');
    const keyHash = parts[4];

    if (!keyHash) {
      return Response.json({ success: false, error: 'Key hash required' }, { status: 400 });
    }

    await env.DB
      .prepare('UPDATE api_keys SET is_enabled = 1 WHERE key_hash = ?')
      .bind(keyHash)
      .run();

    return Response.json({ success: true, message: 'Machine enabled' });

  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to enable machine'
    }, { status: 500 });
  }
}

/**
 * Disable a machine (set is_enabled = 0)
 * POST /v1/admin/keys/{keyHash}/disable
 */
export async function handleDisableMachine(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split('/');
    const keyHash = parts[4];

    if (!keyHash) {
      return Response.json({ success: false, error: 'Key hash required' }, { status: 400 });
    }

    await env.DB
      .prepare('UPDATE api_keys SET is_enabled = 0 WHERE key_hash = ?')
      .bind(keyHash)
      .run();

    return Response.json({ success: true, message: 'Machine disabled' });

  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disable machine'
    }, { status: 500 });
  }
}

/**
 * Update machine info (name, rate_limit)
 * PATCH /v1/admin/keys/{keyHash}
 */
export async function handleUpdateMachine(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split('/');
    const keyHash = parts[4];

    if (!keyHash) {
      return Response.json({ success: false, error: 'Key hash required' }, { status: 400 });
    }

    const body = await request.json() as {
      machine_name?: string;
      rate_limit_rpm?: number;
    };

    const updates: string[] = [];
    const values: any[] = [];

    if (body.machine_name !== undefined) {
      updates.push('key_name = ?');
      values.push(body.machine_name);
    }
    if (body.rate_limit_rpm !== undefined) {
      updates.push('rate_limit_rpm = ?');
      values.push(body.rate_limit_rpm);
    }

    if (updates.length === 0) {
      return Response.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    values.push(keyHash);
    await env.DB
      .prepare(`UPDATE api_keys SET ${updates.join(', ')} WHERE key_hash = ?`)
      .bind(...values)
      .run();

    return Response.json({ success: true, message: 'Machine updated' });

  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update machine'
    }, { status: 500 });
  }
}

/**
 * Get all machines with usage stats
 * GET /v1/admin/machines
 */
export async function handleGetMachines(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const companyId = url.searchParams.get('company_id');

    let query = `
      SELECT k.key_hash, k.company_id, k.key_name, k.created_at, k.last_used_at,
             k.is_active, k.is_enabled, k.rate_limit_rpm,
             COALESCE(SUM(s.request_count), 0) as total_requests,
             COALESCE(SUM(s.total_tokens), 0) as total_tokens,
             COALESCE(SUM(s.cost_usd), 0) as total_cost
      FROM api_keys k
      LEFT JOIN usage_stats s ON k.company_id = s.company_id
    `;

    let results;
    if (companyId) {
      query += ` WHERE k.company_id = ? GROUP BY k.key_hash, k.company_id, k.key_name, k.created_at, k.last_used_at, k.is_active, k.is_enabled, k.rate_limit_rpm ORDER BY k.created_at DESC`;
      results = await env.DB.prepare(query).bind(companyId).all();
    } else {
      query += ` GROUP BY k.key_hash, k.company_id, k.key_name, k.created_at, k.last_used_at, k.is_active, k.is_enabled, k.rate_limit_rpm ORDER BY k.created_at DESC`;
      results = await env.DB.prepare(query).all();
    }

    const machines = (results.results || []).map((row: any) => ({
      key_hash: row.key_hash,
      company_id: row.company_id,
      machine_name: row.key_name,
      is_active: Boolean(row.is_active),
      is_enabled: Boolean(row.is_enabled),
      rate_limit_rpm: row.rate_limit_rpm,
      created_at: row.created_at,
      last_used_at: row.last_used_at,
      total_requests: row.total_requests,
      total_tokens: row.total_tokens,
      total_cost: row.total_cost
    }));

    return Response.json({ success: true, machines });

  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get machines'
    }, { status: 500 });
  }
}

/**
 * Get privacy report statistics
 * GET /v1/admin/privacy-report
 */
export async function handleGetPrivacyReport(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const companyId = url.searchParams.get('company_id');
    const fromDate = url.searchParams.get('from'); // Unix timestamp
    const toDate = url.searchParams.get('to'); // Unix timestamp
    const limit = parseInt(url.searchParams.get('limit') || '100');

    let whereClause = 'WHERE 1=1';
    const bindings: any[] = [];

    if (companyId) {
      whereClause += ' AND company_id = ?';
      bindings.push(companyId);
    }
    if (fromDate) {
      whereClause += ' AND created_at >= ?';
      bindings.push(parseInt(fromDate));
    }
    if (toDate) {
      whereClause += ' AND created_at <= ?';
      bindings.push(parseInt(toDate));
    }

    // Get aggregate statistics
    const statsQuery = `
      SELECT
        COUNT(*) as total_requests,
        SUM(pii_count) as total_pii_detected,
        SUM(CASE WHEN pii_count > 0 THEN 1 ELSE 0 END) as requests_with_pii,
        ROUND(CAST(SUM(CASE WHEN pii_count > 0 THEN 1 ELSE 0 END) AS FLOAT) / CAST(COUNT(*) AS FLOAT) * 100, 2) as pii_percentage,
        AVG(compute_time_ms) as avg_compute_time_ms,
        SUM(cost_usd) as total_cost,
        AVG(data_size_bytes) as avg_data_size
      FROM privacy_reports
      ${whereClause}
    `;

    const statsResult = await env.DB.prepare(statsQuery).bind(...bindings).first();

    // Get sensitivity level distribution
    const sensitivityQuery = `
      SELECT sensitivity_level, COUNT(*) as count
      FROM privacy_reports
      ${whereClause}
      GROUP BY sensitivity_level
    `;

    const sensitivityResult = await env.DB.prepare(sensitivityQuery).bind(...bindings).all();

    // Get PII type distribution
    const recentReports = await env.DB
      .prepare(`SELECT pii_types FROM privacy_reports ${whereClause} ORDER BY created_at DESC LIMIT ?`)
      .bind(...bindings, limit)
      .all();

    // Aggregate PII types from recent reports
    const piiTypeDistribution: Record<string, number> = {};
    for (const row of recentReports.results || []) {
      try {
        const types = JSON.parse(row.pii_types as string || '{}');
        for (const [type, count] of Object.entries(types)) {
          piiTypeDistribution[type] = (piiTypeDistribution[type] || 0) + (count as number);
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }

    // Get task type distribution
    const taskQuery = `
      SELECT task_type, COUNT(*) as count
      FROM privacy_reports
      ${whereClause}
      GROUP BY task_type
    `;

    const taskResult = await env.DB.prepare(taskQuery).bind(...bindings).all();

    // Get recent requests
    const recentQuery = `
      SELECT id, company_id, task_type, pii_count, sensitivity_level, compute_time_ms, cost_usd, created_at
      FROM privacy_reports
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ?
    `;

    const recentResult = await env.DB.prepare(recentQuery).bind(...bindings, limit).all();

    return Response.json({
      success: true,
      report: {
        summary: {
          total_requests: statsResult?.total_requests || 0,
          total_pii_detected: statsResult?.total_pii_detected || 0,
          requests_with_pii: statsResult?.requests_with_pii || 0,
          pii_percentage: statsResult?.pii_percentage || 0,
          avg_compute_time_ms: Math.round((statsResult?.avg_compute_time_ms || 0) * 100) / 100,
          total_cost: statsResult?.total_cost || 0,
          avg_data_size: Math.round((statsResult?.avg_data_size || 0) * 100) / 100
        },
        sensitivity_distribution: (sensitivityResult.results || []).reduce((acc: Record<string, number>, row: any) => {
          acc[row.sensitivity_level] = row.count;
          return acc;
        }, {}),
        pii_type_distribution: piiTypeDistribution,
        task_type_distribution: (taskResult.results || []).reduce((acc: Record<string, number>, row: any) => {
          acc[row.task_type] = row.count;
          return acc;
        }, {}),
        recent_requests: recentResult.results || []
      }
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get privacy report'
    }, { status: 500 });
  }
}

/**
 * Update token limit for an API key
 * PUT /v1/admin/keys/{keyHash}/token-limit
 * Body: { "token_limit": 100000 } or { "token_limit": 0 } for unlimited
 */
export async function handleUpdateTokenLimit(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split('/');
    const keyHash = parts[4];

    if (!keyHash) {
      return Response.json({ success: false, error: 'Key hash required' }, { status: 400 });
    }

    const body = await request.json() as { token_limit?: number };

    if (body.token_limit === undefined) {
      return Response.json({ success: false, error: 'token_limit is required' }, { status: 400 });
    }

    // Validate: 0 or negative = unlimited (store as NULL or 0), positive = limit
    // We use 0 to mean unlimited
    const tokenLimit = body.token_limit <= 0 ? 0 : body.token_limit;

    // Check if key exists
    const existing = await env.DB
      .prepare('SELECT * FROM api_keys WHERE key_hash = ?')
      .bind(keyHash)
      .first();

    if (!existing) {
      return Response.json({ success: false, error: 'API key not found' }, { status: 404 });
    }

    await env.DB
      .prepare('UPDATE api_keys SET token_limit = ? WHERE key_hash = ?')
      .bind(tokenLimit, keyHash)
      .run();

    return Response.json({
      success: true,
      token_limit: tokenLimit,
      unlimited: tokenLimit === 0,
      message: tokenLimit === 0 ? 'Token limit removed (unlimited)' : `Token limit set to ${tokenLimit.toLocaleString()}`
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update token limit'
    }, { status: 500 });
  }
}

/**
 * Reset token usage for an API key
 * POST /v1/admin/keys/{keyHash}/reset-usage
 */
export async function handleResetTokenUsage(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split('/');
    const keyHash = parts[4];

    if (!keyHash) {
      return Response.json({ success: false, error: 'Key hash required' }, { status: 400 });
    }

    await env.DB
      .prepare('UPDATE api_keys SET token_used = 0 WHERE key_hash = ?')
      .bind(keyHash)
      .run();

    return Response.json({
      success: true,
      message: 'Token usage reset to 0'
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset usage'
    }, { status: 500 });
  }
}
