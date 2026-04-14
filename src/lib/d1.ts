// D1 Database Operations
import type { D1Database } from '@cloudflare/workers-types';
import type { Env } from '../types';

export class D1Client {
  constructor(private db: D1Database) {}

  // ============ Audit Logs ============

  async insertAuditLog(log: {
    id: string;
    company_id: string;
    user_id?: string;
    original_text_hash: string;
    masked_text: string;
    pii_detected: boolean;
    enterprise_masked: boolean;
    provider?: string;
    model?: string;
    risk_level?: string;
    status: string;
  }): Promise<boolean> {
    const response = await this.db
      .prepare(`
        INSERT INTO audit_logs (
          id, timestamp, company_id, user_id, original_text_hash,
          masked_text, pii_detected, enterprise_masked,
          provider, model, risk_level, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        log.id,
        Date.now(),
        log.company_id,
        log.user_id || null,
        log.original_text_hash,
        log.masked_text,
        log.pii_detected ? 1 : 0,
        log.enterprise_masked ? 1 : 0,
        log.provider || null,
        log.model || null,
        log.risk_level || null,
        log.status
      )
      .run();

    return response.success ?? false;
  }

  async queryAuditLogs(query: {
    company_id: string;
    from?: number;
    to?: number;
    limit?: number;
    offset?: number;
  }) {
    let sql = 'SELECT * FROM audit_logs WHERE company_id = ?';
    const bindings: (string | number)[] = [query.company_id];

    if (query.from) {
      sql += ' AND timestamp >= ?';
      bindings.push(query.from);
    }
    if (query.to) {
      sql += ' AND timestamp <= ?';
      bindings.push(query.to);
    }

    sql += ' ORDER BY timestamp DESC';

    if (query.limit) {
      sql += ' LIMIT ?';
      bindings.push(query.limit);
    }
    if (query.offset) {
      sql += ' OFFSET ?';
      bindings.push(query.offset);
    }

    const { results } = await this.db
      .prepare(sql)
      .bind(...bindings)
      .all();

    return results || [];
  }

  // ============ API Keys ============

  async validateAPIKey(key: string): Promise<{ valid: boolean; company_id?: string; rate_limit?: number; token_limit?: number; token_used?: number }> {
    const keyHash = await this.hashKey(key);

    const result = await this.db
      .prepare('SELECT company_id, rate_limit_rpm, token_limit, token_used FROM api_keys WHERE key_hash = ? AND is_active = 1')
      .bind(keyHash)
      .first();

    if (result) {
      // Update last_used_at
      await this.db
        .prepare('UPDATE api_keys SET last_used_at = ? WHERE key_hash = ?')
        .bind(Date.now(), keyHash)
        .run();

      return {
        valid: true,
        company_id: result.company_id as string,
        rate_limit: result.rate_limit_rpm as number,
        token_limit: result.token_limit as number,
        token_used: result.token_used as number
      };
    }

    return { valid: false };
  }

  async createAPIKey(key: string, companyId: string, keyName?: string): Promise<boolean> {
    const keyHash = await this.hashKey(key);

    const response = await this.db
      .prepare(`
        INSERT INTO api_keys (key_hash, company_id, key_name, created_at, is_active, token_limit, token_used)
        VALUES (?, ?, ?, ?, 1, 100000, 0)
      `)
      .bind(keyHash, companyId, keyName || null, Date.now())
      .run();

    return response.success ?? false;
  }

  async updateTokenUsed(keyHash: string, tokensUsed: number): Promise<void> {
    await this.db
      .prepare('UPDATE api_keys SET token_used = token_used + ? WHERE key_hash = ?')
      .bind(tokensUsed, keyHash)
      .run();
  }

  // ============ Ontologies ============

  async saveOntologyMeta(companyId: string, ttlFileKey: string, version: string, entityCount: number): Promise<boolean> {
    const response = await this.db
      .prepare(`
        INSERT OR REPLACE INTO ontologies (company_id, ttl_file_key, uploaded_at, version, entity_count, last_modified)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(companyId, ttlFileKey, Date.now(), version, entityCount, Date.now())
      .run();

    return response.success ?? false;
  }

  async getOntologyMeta(companyId: string) {
    return await this.db
      .prepare('SELECT * FROM ontologies WHERE company_id = ?')
      .bind(companyId)
      .first();
  }

  // ============ Compliance Rules ============

  async getEnabledRules(): Promise<any[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM compliance_rules WHERE is_enabled = 1')
      .all();

    return results || [];
  }

  // ============ Usage Stats ============

  async incrementUsage(stats: {
    company_id: string;
    date: string;
    provider: string;
    model?: string;
    prompt_tokens: number;
    completion_tokens: number;
    cost_usd: number;
  }): Promise<boolean> {
    const response = await this.db
      .prepare(`
        INSERT INTO usage_stats (id, company_id, date, provider, model, prompt_tokens, completion_tokens, total_tokens, cost_usd, request_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(company_id, date, provider, model) DO UPDATE SET
          prompt_tokens = prompt_tokens + excluded.prompt_tokens,
          completion_tokens = completion_tokens + excluded.completion_tokens,
          total_tokens = total_tokens + excluded.total_tokens,
          cost_usd = cost_usd + excluded.cost_usd,
          request_count = request_count + 1
      `)
      .bind(
        `${stats.company_id}_${stats.date}_${stats.provider}_${stats.model || 'default'}`,
        stats.company_id,
        stats.date,
        stats.provider,
        stats.model || null,
        stats.prompt_tokens,
        stats.completion_tokens,
        stats.prompt_tokens + stats.completion_tokens,
        stats.cost_usd
      )
      .run();

    return response.success ?? false;
  }

  // ============ Helpers ============

  private async hashKey(key: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
