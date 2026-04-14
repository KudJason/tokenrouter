// TTL/RDF Parser for Enterprise Ontology
import type { EnterpriseGraphData, EnterpriseEntityData } from './kv';

/**
 * TTL Parser - Parses Turtle/Terse RDF Triple Language
 * Supports a subset of TTL for enterprise ontology
 */
export class TTLParser {
  private prefixes: Map<string, string> = new Map();

  /**
   * Parse TTL content into EnterpriseGraphData
   */
  parse(ttlContent: string, companyId: string): EnterpriseGraphData {
    const entities: Record<string, EnterpriseEntityData> = {};
    const keywordsByType: Record<string, string[]> = {};

    // Initialize keywords storage by type
    const entityTypes = ['SUPPLIER', 'PROJECT', 'BUDGET', 'CONTRACT', 'SERVICE_PROVIDER', 'INTERNAL_PERSON'];
    for (const type of entityTypes) {
      keywordsByType[type] = [];
    }

    // Parse lines
    const lines = ttlContent.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

    for (const line of lines) {
      // Skip prefixes
      if (line.startsWith('@prefix')) continue;

      // Parse triples
      const triple = this.parseTriple(line);
      if (triple) {
        this.processTriple(triple, entities, keywordsByType);
      }
    }

    return {
      company_id: companyId,
      version: this.extractVersion(ttlContent),
      entities,
      keywordsByType
    };
  }

  /**
   * Parse a single TTL triple line
   */
  private parseTriple(line: string): { subject: string; predicate: string; object: string } | null {
    // Handle multi-line statements (ending with .)
    const cleanLine = line.replace(/\.\s*$/, '');

    // Split by whitespace, respecting quoted strings
    const parts = this.splitByWhitespace(cleanLine);

    if (parts.length < 3) return null;

    const subject = this.cleanURI(parts[0]);
    const predicate = this.cleanURI(parts[1]);

    // Object can be URI or literal
    let object = parts[2];
    if (object.startsWith('"')) {
      // Extract literal value
      const match = object.match(/"([^"]*)"/);
      object = match ? match[1] : object;
    } else {
      object = this.cleanURI(object);
    }

    return { subject, predicate, object };
  }

  /**
   * Split by whitespace but respect quoted strings
   */
  private splitByWhitespace(str: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of str) {
      if (char === '"') {
        inQuotes = !inQuotes;
        current += char;
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          parts.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      parts.push(current);
    }

    return parts;
  }

  /**
   * Clean URI by removing < > and resolving prefixes
   */
  private cleanURI(uri: string): string {
    uri = uri.replace(/^[<|"]+/, '').replace(/[>|"]+$/, '');

    // Resolve prefix
    for (const [prefix, ns] of this.prefixes) {
      if (uri.startsWith(prefix)) {
        return uri.replace(prefix, ns);
      }
    }

    // Extract local name from full URI
    if (uri.includes('/') || uri.includes('#')) {
      const match = uri.match(/[#/]([^#/]+)$/);
      if (match) {
        return match[1];
      }
    }

    return uri;
  }

  /**
   * Process a triple and update entities/index
   */
  private processTriple(
    triple: { subject: string; predicate: string; object: string },
    entities: Record<string, EnterpriseEntityData>,
    keywordsByType: Record<string, string[]>
  ): void {
    const { subject, predicate, object } = triple;

    // Determine entity type from predicate
    const entityType = this.getEntityType(predicate);
    if (!entityType) return;

    // Initialize entity if needed
    if (!entities[subject]) {
      entities[subject] = {
        id: subject,
        type: entityType,
        label: '',
        values: []
      };
    }

    // Map predicate to field
    switch (predicate.toLowerCase()) {
      case 'a':
      case 'rdf:type':
        // Type is already set from predicate mapping
        break;

      case 'suppliername':
      case 'supplier_name':
      case 'suppliername@en':
      case 'spname':
      case 'spname@en':
      case 'projectname':
      case 'projectname@en':
      case 'projectmanager':
      case 'projectmanager@en':
        entities[subject].label = object;
        entities[subject].values.push(object);
        // Add to keywords for matching
        if (keywordsByType[entityType] && !keywordsByType[entityType].includes(object)) {
          keywordsByType[entityType].push(object);
        }
        break;

      case 'contractvalue':
      case 'contract_value':
      case 'budget':
      case 'monthlycost':
      case 'monthly_cost':
        // These are values, add to keywords for detection
        if (!keywordsByType[entityType].includes(object)) {
          keywordsByType[entityType].push(object);
        }
        break;

      default:
        // Add as generic value
        if (!entities[subject].values.includes(object)) {
          entities[subject].values.push(object);
        }
    }
  }

  /**
   * Map predicate to entity type
   */
  private getEntityType(predicate: string): string | null {
    const pred = predicate.toLowerCase();

    if (pred.includes('supplier')) return 'SUPPLIER';
    if (pred.includes('project')) return 'PROJECT';
    if (pred.includes('budget')) return 'BUDGET';
    if (pred.includes('contract')) return 'CONTRACT';
    if (pred.includes('sp') || pred.includes('serviceprovider')) return 'SERVICE_PROVIDER';
    if (pred.includes('manager') || pred.includes('person')) return 'INTERNAL_PERSON';

    // Also check the predicate value itself for type
    if (pred === 'a' || pred === 'rdf:type') {
      // Type is usually specified as a separate triple like "subject a tr:Supplier"
      return null; // Will be set by the object
    }

    return null;
  }

  /**
   * Extract version from TTL content
   */
  private extractVersion(ttlContent: string): string {
    const versionMatch = ttlContent.match(/@version[:\s]+"?([^"\s]+)"?/i);
    return versionMatch ? versionMatch[1] : new Date().toISOString();
  }
}

/**
 * Enterprise Masker - Uses parsed graph to mask sensitive information
 */
export class EnterpriseMasker {
  constructor(private graph: EnterpriseGraphData) {}

  /**
   * Find and mask enterprise sensitive information in text
   */
  mask(text: string): { masked: string; detected: DetectedEntity[] } {
    const detected: DetectedEntity[] = [];
    let masked = text;

    // Search through all entities
    for (const entity of Object.values(this.graph.entities)) {
      for (const value of entity.values) {
        if (!value || value.length < 2) continue;

        // Case-insensitive search
        const regex = new RegExp(this.escapeRegex(value), 'gi');
        let match;

        while ((match = regex.exec(text)) !== null) {
          detected.push({
            type: entity.type,
            value: match[0],
            start: match.index,
            end: match.index + match[0].length,
            confidence: 0.9  // High confidence for exact matches
          });

          // Replace with mask placeholder
          const placeholder = `[${entity.type}]`;
          masked = masked.replace(match[0], placeholder);
        }
      }
    }

    return { masked, detected };
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

interface DetectedEntity {
  type: string;
  value: string;
  start: number;
  end: number;
  confidence: number;
}
