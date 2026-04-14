// KV Cache Operations
import type { KVNamespace } from '@cloudflare/workers-types';

/**
 * Graph Cache for Enterprise Ontology
 * Stores parsed TTL data for quick access
 */
export class GraphCache {
  constructor(private kv: KVNamespace) {}

  /**
   * Cache parsed enterprise graph
   */
  async setGraph(companyId: string, graph: EnterpriseGraphData, ttlSeconds: number = 3600): Promise<void> {
    const key = `graph:${companyId}`;
    const value = JSON.stringify(graph);
    await this.kv.put(key, value, { expirationTtl: ttlSeconds });
  }

  /**
   * Get cached enterprise graph
   */
  async getGraph(companyId: string): Promise<EnterpriseGraphData | null> {
    const key = `graph:${companyId}`;
    const value = await this.kv.get(key, 'json');
    return value as EnterpriseGraphData | null;
  }

  /**
   * Invalidate cached graph
   */
  async invalidateGraph(companyId: string): Promise<void> {
    const key = `graph:${companyId}`;
    await this.kv.delete(key);
  }

  /**
   * Cache entity labels for quick matching
   * Key: companyId -> entityType -> Set of labels
   */
  async setEntityIndex(
    companyId: string,
    entityType: string,
    labels: string[],
    ttlSeconds: number = 3600
  ): Promise<void> {
    const key = `index:${companyId}:${entityType}`;
    const value = JSON.stringify(labels);
    await this.kv.put(key, value, { expirationTtl: ttlSeconds });
  }

  async getEntityIndex(companyId: string, entityType: string): Promise<string[] | null> {
    const key = `index:${companyId}:${entityType}`;
    const value = await this.kv.get(key, 'json');
    return value as string[] | null;
  }

  /**
   * Rate limiting
   */
  async checkRateLimit(
    identifier: string,
    limit: number,
    windowSeconds: number = 60
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // Get current count
    const current = await this.kv.get(key, 'json') as { count: number; resetAt: number } | null;

    if (!current || current.resetAt < now) {
      // New window
      await this.kv.put(key, JSON.stringify({ count: 1, resetAt: now + windowSeconds * 1000 }), {
        expirationTtl: windowSeconds * 2
      });
      return { allowed: true, remaining: limit - 1, resetAt: now + windowSeconds * 1000 };
    }

    if (current.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: current.resetAt };
    }

    // Increment
    current.count++;
    await this.kv.put(key, JSON.stringify(current), {
      expirationTtl: windowSeconds * 2
    });

    return { allowed: true, remaining: limit - current.count, resetAt: current.resetAt };
  }
}

// Types for cached data
export interface EnterpriseGraphData {
  company_id: string;
  version: string;
  entities: Record<string, EnterpriseEntityData>;
  keywordsByType: Record<string, string[]>;
}

export interface EnterpriseEntityData {
  id: string;
  type: string;
  label: string;
  values: string[];  // All variations (names, aliases, etc.)
}
