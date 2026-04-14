// TTL Schema Parser - Extracts field sensitivity metadata from TTL
import type { R2Bucket, KVNamespace } from '@cloudflare/workers-types';

export interface FieldSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  sensitive: boolean;
  piiType?: 'phone' | 'person' | 'email' | 'id_card' | 'bank_card' | 'ssn' | 'passport';
  maskFormat?: 'strict' | 'partial' | 'hash';
}

export interface SchemaDefinition {
  version: string;
  companyId: string;
  fields: FieldSchema[];
}

/**
 * TTL Schema Parser
 * Parses TTL files to extract field sensitivity metadata
 */
export class TTLSchemaParser {
  private prefixes: Map<string, string> = new Map();

  /**
   * Parse TTL content to extract schema metadata
   */
  parse(ttlContent: string, companyId: string): SchemaDefinition {
    const fields: FieldSchema[] = [];

    // Parse lines
    const lines = ttlContent.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

    for (const line of lines) {
      // Skip prefixes
      if (line.startsWith('@prefix')) {
        this.parsePrefix(line);
        continue;
      }

      // Parse schema field definitions
      const fieldDef = this.parseFieldDefinition(line);
      if (fieldDef) {
        fields.push(fieldDef);
      }
    }

    return {
      version: this.extractVersion(ttlContent),
      companyId,
      fields
    };
  }

  /**
   * Parse prefix declaration
   */
  private parsePrefix(line: string): void {
    const match = line.match(/@prefix\s+(\w+):\s*<?([^>\s]+)>?/);
    if (match) {
      this.prefixes.set(match[1], match[2]);
    }
  }

  /**
   * Parse a field definition line
   * Format: ex:fieldName a tr:Field ; tr:sensitive true ; tr:piiType "phone" .
   */
  private parseFieldDefinition(line: string): FieldSchema | null {
    // Check if this is a field definition (contains tr:Field or tr:field)
    if (!line.includes('tr:Field') && !line.includes('tr:field') && !line.includes('tr:sensitive')) {
      return null;
    }

    // Extract field name
    const nameMatch = line.match(/ex:(\w+)/);
    if (!nameMatch) return null;

    const name = nameMatch[1];

    // Extract type
    const type = this.extractType(line);

    // Extract sensitive flag
    const sensitive = line.includes('tr:sensitive') &&
      (line.includes('true') || line.includes('"true"'));

    // Extract PII type
    const piiType = this.extractPIIType(line);

    // Extract mask format
    const maskFormat = this.extractMaskFormat(line);

    return {
      name,
      type: type || 'string',
      sensitive,
      piiType,
      maskFormat
    };
  }

  /**
   * Extract field type from line
   */
  private extractType(line: string): 'string' | 'number' | 'boolean' | 'date' | undefined {
    if (line.includes('tr:type') || line.includes('tr:fieldType')) {
      if (line.includes('"number"') || line.includes('"int"') || line.includes('"float"')) return 'number';
      if (line.includes('"boolean"')) return 'boolean';
      if (line.includes('"date"')) return 'date';
      return 'string';
    }
    return 'string'; // Default
  }

  /**
   * Extract PII type from line
   */
  private extractPIIType(line: string): FieldSchema['piiType'] | undefined {
    const piiTypes: Array<'phone' | 'person' | 'email' | 'id_card' | 'bank_card' | 'ssn' | 'passport'> = [
      'phone', 'person', 'email', 'id_card', 'bank_card', 'ssn', 'passport'
    ];

    for (const piiType of piiTypes) {
      if (line.includes(`"${piiType}"`)) {
        return piiType;
      }
    }
    return undefined;
  }

  /**
   * Extract mask format from line
   */
  private extractMaskFormat(line: string): 'strict' | 'partial' | 'hash' | undefined {
    if (line.includes('"strict"')) return 'strict';
    if (line.includes('"partial"')) return 'partial';
    if (line.includes('"hash"')) return 'hash';
    return undefined;
  }

  /**
   * Extract version from TTL content
   */
  private extractVersion(ttlContent: string): string {
    const versionMatch = ttlContent.match(/tr:version\s+"([^"]+)"/);
    return versionMatch ? versionMatch[1] : '1.0';
  }

  /**
   * Get sensitive fields from schema
   */
  getSensitiveFields(schema: SchemaDefinition): FieldSchema[] {
    return schema.fields.filter(f => f.sensitive);
  }

  /**
   * Get PII type for a field name
   */
  getPIIType(schema: SchemaDefinition, fieldName: string): FieldSchema['piiType'] | undefined {
    const field = schema.fields.find(f => f.name.toLowerCase() === fieldName.toLowerCase());
    return field?.piiType;
  }

  /**
   * Check if a field is sensitive
   */
  isFieldSensitive(schema: SchemaDefinition, fieldName: string): boolean {
    const field = schema.fields.find(f => f.name.toLowerCase() === fieldName.toLowerCase());
    return field?.sensitive || false;
  }
}

/**
 * Schema Manager - Handles schema fetching, caching, and management
 */
export class SchemaManager {
  constructor(
    private r2: R2Bucket,
    private kv: KVNamespace
  ) {}

  /**
   * Get schema for a company (with caching)
   */
  async getSchema(companyId: string): Promise<SchemaDefinition | null> {
    const cacheKey = `schema:${companyId}`;

    // Check cache first
    const cached = await this.kv.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // Invalid cache, continue to fetch
      }
    }

    // Fetch from R2
    const ttl = await this.getTTLFromR2(companyId);
    if (!ttl) {
      return null;
    }

    // Parse TTL
    const parser = new TTLSchemaParser();
    const schema = parser.parse(ttl, companyId);

    // Cache for 1 hour
    await this.kv.put(cacheKey, JSON.stringify(schema), {
      expirationTtl: 3600
    });

    return schema;
  }

  /**
   * Get TTL file from R2
   */
  private async getTTLFromR2(companyId: string): Promise<string | null> {
    const key = `enterprise-ontologies/${companyId}/ontology.ttl`;

    try {
      const object = await this.r2.get(key);
      if (!object) {
        return null;
      }
      return await object.text();
    } catch {
      return null;
    }
  }

  /**
   * Clear schema cache for a company
   */
  async clearCache(companyId: string): Promise<void> {
    await this.kv.delete(`schema:${companyId}`);
  }
}

/**
 * Apply schema-based masking to data
 */
export function applySchemaMasking(
  data: any,
  schema: SchemaDefinition,
  masker: (value: string, piiType?: string) => string
): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveFields = schema.fields.filter(f => f.sensitive);
  const masked = Array.isArray(data) ? [...data] : { ...data };

  for (const field of sensitiveFields) {
    if (field.name in masked) {
      const value = masked[field.name];
      if (typeof value === 'string') {
        masked[field.name] = masker(value, field.piiType);
      }
    }
  }

  return masked;
}
