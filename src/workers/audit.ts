// Audit Worker - Logging and Retrieval
import type { Env, AuditLog, AuditQuery } from '../types';
import { D1Client } from '../lib/d1';
import { R2Client } from '../lib/r2';

/**
 * Audit Service
 * Handles audit log creation, storage, and retrieval
 */
export class AuditService {
  private d1Client: D1Client;
  private r2Client: R2Client;

  constructor(env: Env) {
    this.d1Client = new D1Client(env.DB);
    this.r2Client = new R2Client(env.ONTOLOGY_BUCKET, env.ARCHIVE_BUCKET);
  }

  /**
   * Log an audit event
   */
  async log(event: Omit<AuditLog, 'id' | 'timestamp'>): Promise<string> {
    const id = this.generateId();
    const timestamp = Date.now();

    // Insert into D1
    await this.d1Client.insertAuditLog({
      id,
      timestamp,
      company_id: event.company_id,
      user_id: event.user_id,
      original_text_hash: event.original_text_hash,
      masked_text: event.masked_text,
      pii_detected: event.pii_detected,
      enterprise_masked: event.enterprise_masked,
      provider: event.provider,
      model: event.model,
      risk_level: event.risk_level,
      status: event.status
    });

    // For large volumes, also archive to R2
    // This is done asynchronously for performance
    this.archiveIfNeeded(event, id, timestamp).catch(console.error);

    return id;
  }

  /**
   * Query audit logs
   */
  async query(query: AuditQuery): Promise<AuditLog[]> {
    const results = await this.d1Client.queryAuditLogs({
      company_id: query.company_id,
      from: query.from,
      to: query.to,
      limit: query.limit || 100,
      offset: query.offset
    });

    return results.map(row => ({
      id: row.id as string,
      timestamp: row.timestamp as number,
      company_id: row.company_id as string,
      user_id: row.user_id as string | undefined,
      original_text_hash: row.original_text_hash as string,
      masked_text: row.masked_text as string,
      pii_detected: Boolean(row.pii_detected),
      enterprise_masked: Boolean(row.enterprise_masked),
      provider: row.provider as string | undefined,
      model: row.model as string | undefined,
      risk_level: row.risk_level as any,
      status: row.status as any
    }));
  }

  /**
   * Export audit logs
   */
  async export(query: AuditQuery, format: 'json' | 'csv' = 'json'): Promise<string> {
    const logs = await this.query({
      ...query,
      limit: 10000 // Max export
    });

    if (format === 'csv') {
      const headers = ['id', 'timestamp', 'company_id', 'user_id', 'status', 'risk_level', 'provider', 'pii_detected', 'enterprise_masked'];
      const rows = logs.map(log => [
        log.id,
        new Date(log.timestamp).toISOString(),
        log.company_id,
        log.user_id || '',
        log.status,
        log.risk_level || '',
        log.provider || '',
        String(log.pii_detected),
        String(log.enterprise_masked)
      ].join(','));

      return [headers.join(','), ...rows].join('\n');
    }

    return JSON.stringify(logs, null, 2);
  }

  /**
   * Archive to R2 if needed (for large volumes)
   */
  private async archiveIfNeeded(
    event: Omit<AuditLog, 'id' | 'timestamp'>,
    id: string,
    timestamp: number
  ): Promise<void> {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    const filename = `audit_${id}.json`;
    await this.r2Client.uploadAuditArchive(
      event.company_id,
      year,
      month,
      filename,
      JSON.stringify({ id, timestamp, ...event })
    );
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `audit_${timestamp}_${random}`;
  }
}

/**
 * Handle audit log creation
 */
export async function handleAuditLog(
  request: Request,
  env: Env
): Promise<Response> {
  const startTime = Date.now();

  try {
    const body = await request.json() as {
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
    };

    if (!body.company_id || !body.status) {
      return Response.json(
        { success: false, error: 'company_id and status are required' },
        { status: 400 }
      );
    }

    const audit = new AuditService(env);
    const id = await audit.log({
      company_id: body.company_id,
      user_id: body.user_id,
      original_text_hash: body.original_text_hash,
      masked_text: body.masked_text,
      pii_detected: body.pii_detected,
      enterprise_masked: body.enterprise_masked,
      provider: body.provider,
      model: body.model,
      risk_level: body.risk_level as any,
      status: body.status as any
    });

    return Response.json({
      success: true,
      id,
      processing_time_ms: Date.now() - startTime
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
 * Handle audit log query
 */
export async function handleAuditQuery(
  request: Request,
  env: Env
): Promise<Response> {
  const startTime = Date.now();

  try {
    const url = new URL(request.url);
    const companyId = url.searchParams.get('company_id');

    if (!companyId) {
      return Response.json(
        { success: false, error: 'company_id is required' },
        { status: 400 }
      );
    }

    const query: AuditQuery = {
      company_id: companyId,
      from: url.searchParams.get('from') ? parseInt(url.searchParams.get('from')!) : undefined,
      to: url.searchParams.get('to') ? parseInt(url.searchParams.get('to')!) : undefined,
      limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 100,
      offset: url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!) : 0
    };

    const audit = new AuditService(env);
    const logs = await audit.query(query);

    return Response.json({
      success: true,
      data: logs,
      count: logs.length,
      processing_time_ms: Date.now() - startTime
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
 * Handle audit export
 */
export async function handleAuditExport(
  request: Request,
  env: Env
): Promise<Response> {
  const startTime = Date.now();

  try {
    const url = new URL(request.url);
    const companyId = url.searchParams.get('company_id');
    const format = (url.searchParams.get('format') as 'json' | 'csv') || 'json';

    if (!companyId) {
      return Response.json(
        { success: false, error: 'company_id is required' },
        { status: 400 }
      );
    }

    const query: AuditQuery = {
      company_id: companyId,
      from: url.searchParams.get('from') ? parseInt(url.searchParams.get('from')!) : undefined,
      to: url.searchParams.get('to') ? parseInt(url.searchParams.get('to')!) : undefined
    };

    const audit = new AuditService(env);
    const content = await audit.export(query, format);

    return new Response(content, {
      headers: {
        'Content-Type': format === 'csv' ? 'text/csv' : 'application/json',
        'Content-Disposition': `attachment; filename="audit_export_${Date.now()}.${format}"`
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
