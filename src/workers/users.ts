// User Management Worker - Admin Users and Sessions
import type { Env } from '../types';

/**
 * Generate a random session token
 */
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'tok_';
  for (let i = 0; i < 40; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Hash password using SHA-256
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash token using SHA-256 (truncated to 16 bytes / 32 hex chars)
 * MUST match the hashString function in api.ts
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Register new admin user
 * POST /v1/admin/users
 */
export async function handleRegisterUser(
  request: Request,
  env: Env
): Promise<Response> {
  const startTime = Date.now();

  try {
    const body = await request.json() as {
      username: string;
      password: string;
      email?: string;
    };

    if (!body.username || !body.password) {
      return Response.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    if (body.password.length < 8) {
      return Response.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check if username exists
    const existing = await env.DB
      .prepare('SELECT id FROM admin_users WHERE username = ?')
      .bind(body.username)
      .first();

    if (existing) {
      return Response.json(
        { success: false, error: 'Username already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(body.password);
    const id = generateId();

    // Insert user
    await env.DB
      .prepare(`
        INSERT INTO admin_users (id, username, password_hash, email, created_at)
        VALUES (?, ?, ?, ?, ?)
      `)
      .bind(id, body.username, passwordHash, body.email || null, Date.now())
      .run();

    return Response.json({
      success: true,
      user: {
        id,
        username: body.username,
        email: body.email || null
      }
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
 * Login with username/password
 * POST /v1/admin/login
 */
export async function handleLogin(
  request: Request,
  env: Env
): Promise<Response> {
  const startTime = Date.now();

  try {
    const body = await request.json() as {
      username: string;
      password: string;
    };

    if (!body.username || !body.password) {
      return Response.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await env.DB
      .prepare('SELECT * FROM admin_users WHERE username = ? AND is_active = 1')
      .bind(body.username)
      .first() as any;

    if (!user) {
      return Response.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordHash = await hashPassword(body.password);
    if (passwordHash !== user.password_hash) {
      return Response.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create session
    const sessionId = generateId();
    const token = generateToken();
    const tokenHash = await hashToken(token);
    const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days

    await env.DB
      .prepare(`
        INSERT INTO admin_sessions (id, user_id, token_hash, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?)
      `)
      .bind(sessionId, user.id, tokenHash, expiresAt, Date.now())
      .run();

    // Update last login
    await env.DB
      .prepare('UPDATE admin_users SET last_login_at = ? WHERE id = ?')
      .bind(Date.now(), user.id)
      .run();

    return Response.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      expires_at: expiresAt
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
 * Logout (invalidate session)
 * POST /v1/admin/logout
 */
export async function handleLogout(
  request: Request,
  env: Env
): Promise<Response> {
  const startTime = Date.now();

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const tokenHash = await hashToken(token);

    // Delete session
    await env.DB
      .prepare('DELETE FROM admin_sessions WHERE token_hash = ?')
      .bind(tokenHash)
      .run();

    return Response.json({
      success: true,
      message: 'Logged out successfully'
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
 * Validate token and get user info
 * GET /v1/admin/me
 */
export async function handleGetMe(
  request: Request,
  env: Env
): Promise<Response> {
  const startTime = Date.now();

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const tokenHash = await hashToken(token);

    // Find valid session
    const session = await env.DB
      .prepare(`
        SELECT s.*, u.username, u.email, u.role
        FROM admin_sessions s
        JOIN admin_users u ON s.user_id = u.id
        WHERE s.token_hash = ? AND s.expires_at > ? AND u.is_active = 1
      `)
      .bind(tokenHash, Date.now())
      .first() as any;

    if (!session) {
      return Response.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    return Response.json({
      success: true,
      user: {
        id: session.user_id,
        username: session.username,
        email: session.email,
        role: session.role
      },
      expires_at: session.expires_at
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
 * List users (admin only)
 * GET /v1/admin/users
 */
export async function handleListUsers(
  request: Request,
  env: Env
): Promise<Response> {
  const startTime = Date.now();

  try {
    const results = await env.DB
      .prepare(`
        SELECT id, username, email, role, is_active, created_at, last_login_at
        FROM admin_users
        ORDER BY created_at DESC
      `)
      .all();

    return Response.json({
      success: true,
      users: (results.results || []).map((row: any) => ({
        id: row.id,
        username: row.username,
        email: row.email,
        role: row.role,
        is_active: Boolean(row.is_active),
        created_at: row.created_at,
        last_login_at: row.last_login_at
      }))
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
 * Delete user (admin only)
 * DELETE /v1/admin/users/{id}
 */
export async function handleDeleteUser(
  request: Request,
  env: Env
): Promise<Response> {
  const startTime = Date.now();

  try {
    const url = new URL(request.url);
    const userId = url.pathname.split('/').pop();

    if (!userId) {
      return Response.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    // Delete sessions first
    await env.DB
      .prepare('DELETE FROM admin_sessions WHERE user_id = ?')
      .bind(userId)
      .run();

    // Delete user
    await env.DB
      .prepare('DELETE FROM admin_users WHERE id = ?')
      .bind(userId)
      .run();

    return Response.json({
      success: true,
      message: 'User deleted'
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
