// R2 Object Storage Operations
import type { R2Bucket } from '@cloudflare/workers-types';

export class R2Client {
  constructor(
    private ontologyBucket: R2Bucket,
    private archiveBucket: R2Bucket
  ) {}

  // ============ Ontology (TTL Files) ============

  /**
   * Upload TTL ontology file for a company
   */
  async uploadOntology(companyId: string, ttlContent: string, version: string): Promise<string> {
    const key = `enterprise-ontologies/${companyId}/ontology.ttl`;

    await this.ontologyBucket.put(key, ttlContent, {
      httpMetadata: {
        contentType: 'application/x-turtle',
        cacheControl: 'public, max-age=3600'
      },
      customMetadata: {
        company_id: companyId,
        version,
        uploaded_at: new Date().toISOString()
      }
    });

    return key;
  }

  /**
   * Get TTL ontology file for a company
   */
  async getOntology(companyId: string): Promise<string | null> {
    const key = `enterprise-ontologies/${companyId}/ontology.ttl`;
    const object = await this.ontologyBucket.get(key);

    if (!object) {
      return null;
    }

    return await object.text();
  }

  /**
   * List all companies with ontologies
   */
  async listOntologies(): Promise<string[]> {
    const companies: string[] = [];
    let cursor: string | null = null;

    do {
      const listing = await this.ontologyBucket.list({
        prefix: 'enterprise-ontologies/',
        cursor,
        limit: 100
      });

      for (const obj of listing.objects) {
        // Extract company_id from key like "enterprise-ontologies/{company_id}/ontology.ttl"
        const match = obj.key.match(/enterprise-ontologies\/([^/]+)\/ontology\.ttl/);
        if (match && !companies.includes(match[1])) {
          companies.push(match[1]);
        }
      }

      cursor = listing.truncated ? listing.cursor ?? null : null;
    } while (cursor);

    return companies;
  }

  /**
   * Delete ontology for a company
   */
  async deleteOntology(companyId: string): Promise<void> {
    const key = `enterprise-ontologies/${companyId}/ontology.ttl`;
    await this.ontologyBucket.delete(key);
  }

  // ============ Archive (Audit Logs) ============

  /**
   * Upload audit log archive
   */
  async uploadAuditArchive(
    companyId: string,
    year: number,
    month: number,
    filename: string,
    content: string
  ): Promise<string> {
    const key = `archive/${companyId}/${year}/${String(month).padStart(2, '0')}/${filename}`;

    await this.archiveBucket.put(key, content, {
      httpMetadata: {
        contentType: 'application/jsonl',
        cacheControl: 'private, max-age=86400'
      }
    });

    return key;
  }

  /**
   * Get audit archive
   */
  async getAuditArchive(
    companyId: string,
    year: number,
    month: number,
    filename: string
  ): Promise<string | null> {
    const key = `archive/${companyId}/${year}/${String(month).padStart(2, '0')}/${filename}`;
    const object = await this.archiveBucket.get(key);

    if (!object) {
      return null;
    }

    return await object.text();
  }

  /**
   * List archives for a company
   */
  async listArchives(
    companyId: string,
    year?: number,
    month?: number
  ): Promise<{ key: string; size: number; uploaded: string }[]> {
    let prefix = `archive/${companyId}/`;

    if (year) {
      prefix += `${year}/`;
      if (month) {
        prefix += `${String(month).padStart(2, '0')}/`;
      }
    }

    const listing = await this.archiveBucket.list({
      prefix,
      limit: 1000
    });

    return listing.objects.map(obj => ({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded?.toISOString() || ''
    }));
  }

  // ============ Helpers ============

  /**
   * Generate signed URL for temporary download access
   * Note: R2 doesn't have native signed URLs, this would need a Worker to serve as a signed URL generator
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // For MVP, we'll use a Worker endpoint to generate presigned URLs
    // In production, you might use Cloudflare's Workers for this
    return `/r2/download?key=${encodeURIComponent(key)}&expires=${Date.now() + expiresIn * 1000}`;
  }
}
