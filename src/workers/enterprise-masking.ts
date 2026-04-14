// Enterprise Masking Worker - TTL Graph Based
import type { Env, DetectedEntity } from '../types';
import { R2Client } from '../lib/r2';
import { GraphCache } from '../lib/kv';
import { TTLParser, EnterpriseMasker } from '../lib/ttl-parser';
import { D1Client } from '../lib/d1';

/**
 * Enterprise Masking Service
 * Uses TTL ontology graph to detect and mask enterprise-sensitive information
 */
export class EnterpriseMaskingService {
  private r2Client: R2Client;
  private graphCache: GraphCache;

  constructor(env: Env) {
    this.r2Client = new R2Client(env.ONTOLOGY_BUCKET, env.ARCHIVE_BUCKET);
    this.graphCache = new GraphCache(env.GRAPH_CACHE);
  }

  /**
   * Get or build enterprise graph from cache/R2
   */
  async getGraph(companyId: string): Promise<ReturnType<TTLParser['parse']> | null> {
    // Try cache first
    const cached = await this.graphCache.getGraph(companyId);
    if (cached) {
      return cached as ReturnType<TTLParser['parse']>;
    }

    // Load from R2
    const ttlContent = await this.r2Client.getOntology(companyId);
    if (!ttlContent) {
      return null;
    }

    // Parse TTL
    const parser = new TTLParser();
    const graph = parser.parse(ttlContent, companyId);

    // Cache for next time
    await this.graphCache.setGraph(companyId, graph, 3600); // 1 hour TTL

    return graph;
  }

  /**
   * Mask enterprise sensitive information in text
   */
  async mask(text: string, companyId: string): Promise<{
    masked: string;
    detected: DetectedEntity[];
  }> {
    const graph = await this.getGraph(companyId);

    if (!graph) {
      return { masked: text, detected: [] };
    }

    const masker = new EnterpriseMasker(graph);
    return masker.mask(text);
  }

  /**
   * Upload or update company ontology
   */
  async updateOntology(companyId: string, ttlContent: string, env: Env): Promise<{
    success: boolean;
    version: string;
    entityCount: number;
  }> {
    const parser = new TTLParser();
    const graph = parser.parse(ttlContent, companyId);

    // Upload to R2
    const key = await this.r2Client.uploadOntology(companyId, ttlContent, graph.version);

    // Update cache
    await this.graphCache.setGraph(companyId, graph, 3600);

    // Save metadata to D1
    const d1Client = new D1Client(env.DB);
    await d1Client.saveOntologyMeta(companyId, key, graph.version, Object.keys(graph.entities).length);

    return {
      success: true,
      version: graph.version,
      entityCount: Object.keys(graph.entities).length
    };
  }
}

/**
 * Handle enterprise masking request
 */
export async function handleEnterpriseMask(
  request: Request,
  env: Env
): Promise<Response> {
  const startTime = Date.now();

  try {
    const body = await request.json() as { text: string; company_id: string };

    if (!body.text || !body.company_id) {
      return Response.json(
        { success: false, error: 'text and company_id are required' },
        { status: 400 }
      );
    }

    const service = new EnterpriseMaskingService(env);
    const result = await service.mask(body.text, body.company_id);

    return Response.json({
      success: true,
      original: body.text,
      masked: result.masked,
      detected: result.detected,
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
 * Handle ontology upload request
 */
export async function handleOntologyUpload(
  request: Request,
  env: Env
): Promise<Response> {
  const startTime = Date.now();

  try {
    // Get company_id from path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const companyIdIndex = pathParts.indexOf('ontology');
    const companyId = pathParts[companyIdIndex + 1];

    if (!companyId) {
      return Response.json(
        { success: false, error: 'company_id is required' },
        { status: 400 }
      );
    }

    const ttlContent = await request.text();

    if (!ttlContent || ttlContent.length < 10) {
      return Response.json(
        { success: false, error: 'Valid TTL content is required' },
        { status: 400 }
      );
    }

    const service = new EnterpriseMaskingService(env);
    const result = await service.updateOntology(companyId, ttlContent, env);

    return Response.json({
      success: true,
      ...result,
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
