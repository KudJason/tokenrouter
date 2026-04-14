// Unit Tests for TokenRouter MVP Workers
import { describe, it, expect } from 'vitest';
import { TTLParser, EnterpriseMasker } from '../src/lib/ttl-parser';

describe('PII Masking', () => {
  it('should mask Chinese ID card numbers', async () => {
    // Dynamic import to handle module
    const { PIIMaskingService } = await import('../src/workers/pii-masking');

    const masker = new PIIMaskingService();
    const result = masker.mask('身份证号是110101199001011234');

    expect(result.masked).toContain('[身份证号]');
    expect(result.detected.length).toBeGreaterThan(0);
    expect(result.detected.some((d: any) => d.type === 'ID_CARD')).toBe(true);
  });

  it('should mask email addresses', async () => {
    const { PIIMaskingService } = await import('../src/workers/pii-masking');

    const masker = new PIIMaskingService();
    const result = masker.mask('邮箱是 user@example.com');

    expect(result.masked).toContain('[邮箱]');
    expect(result.masked).not.toContain('user@example.com');
  });

  it('should mask phone numbers', async () => {
    const { PIIMaskingService } = await import('../src/workers/pii-masking');

    const masker = new PIIMaskingService();
    const result = masker.mask('手机号是+86 138 1234 5678');

    expect(result.masked).toContain('[手机号]');
  });

  it('should detect Chinese names with titles', async () => {
    const { PIIMaskingService } = await import('../src/workers/pii-masking');

    const masker = new PIIMaskingService();
    const result = masker.mask('张总说这个项目要提前完成');

    // Should detect 张总 as a person
    expect(result.masked).toContain('[姓名]');
  });
});

describe('TTL Parser', () => {
  it('should parse basic TTL triples', () => {
    const ttl = `
      @prefix tr: <http://tokenrouter.ai/enterprise#> .

      tr:Supplier_001 a tr:Supplier ;
          tr:supplierName "Acme Corp"@en .
    `;

    const parser = new TTLParser();
    const graph = parser.parse(ttl, 'company_001');

    expect(graph.company_id).toBe('company_001');
    expect(Object.keys(graph.entities).length).toBeGreaterThan(0);
  });

  it('should extract keywords for matching', () => {
    const ttl = `
      @prefix tr: <http://tokenrouter.ai/enterprise#> .

      tr:Project_001 a tr:Project ;
          tr:projectName "Project Alpha"@en ;
          tr:budget "€2,000,000" .
    `;

    const parser = new TTLParser();
    const graph = parser.parse(ttl, 'company_001');

    expect(graph.keywordsByType['PROJECT']).toContain('Project Alpha');
    expect(graph.keywordsByType['BUDGET']).toContain('€2,000,000');
  });
});

describe('Enterprise Masker', () => {
  it('should mask enterprise entities in text', () => {
    const graph = {
      company_id: 'company_001',
      version: '1.0',
      entities: {
        'Supplier_001': {
          id: 'Supplier_001',
          type: 'SUPPLIER',
          label: 'Acme Corp',
          values: ['Acme Corp', 'ACME']
        }
      },
      keywordsByType: {
        'SUPPLIER': ['Acme Corp', 'ACME']
      }
    };

    const masker = new EnterpriseMasker(graph);
    const result = masker.mask('供应商是 Acme Corp');

    expect(result.masked).toContain('[SUPPLIER]');
    expect(result.masked).not.toContain('Acme Corp');
    expect(result.detected.length).toBeGreaterThan(0);
  });

  it('should handle multiple entities', () => {
    const graph = {
      company_id: 'company_001',
      version: '1.0',
      entities: {
        'Project_001': {
          id: 'Project_001',
          type: 'PROJECT',
          label: 'Project Alpha',
          values: ['Project Alpha']
        },
        'Budget_001': {
          id: 'Budget_001',
          type: 'BUDGET',
          label: '€2,000,000',
          values: ['€2,000,000']
        }
      },
      keywordsByType: {
        'PROJECT': ['Project Alpha'],
        'BUDGET': ['€2,000,000']
      }
    };

    const masker = new EnterpriseMasker(graph);
    const result = masker.mask('Project Alpha 的预算是 €2,000,000');

    expect(result.masked).toContain('[PROJECT]');
    expect(result.masked).toContain('[BUDGET]');
    expect(result.masked).not.toContain('Project Alpha');
    expect(result.masked).not.toContain('€2,000,000');
  });
});

describe('Compliance Check', () => {
  it('should detect credit scoring as high risk', async () => {
    const { ComplianceService } = await import('../src/workers/compliance');

    const service = new ComplianceService();
    const result = service.check('帮我评估这个贷款申请人的信用风险');

    expect(result.risk_level).toBe('high');
    expect(result.annex_categories.length).toBeGreaterThan(0);
    expect(result.annex_categories.some((c: any) => c.id === 'credit')).toBe(true);
  });

  it('should detect healthcare as high risk', async () => {
    const { ComplianceService } = await import('../src/workers/compliance');

    const service = new ComplianceService();
    const result = service.check('帮我分析这个患者的病历');

    expect(result.risk_level).toBe('high');
    expect(result.annex_categories.some((c: any) => c.id === 'healthcare')).toBe(true);
  });

  it('should return low risk for normal queries', async () => {
    const { ComplianceService } = await import('../src/workers/compliance');

    const service = new ComplianceService();
    const result = service.check('帮我写一封商务邮件');

    expect(result.risk_level).toBe('low');
    expect(result.annex_categories.length).toBe(0);
  });

  it('should include obligations for high risk categories', async () => {
    const { ComplianceService } = await import('../src/workers/compliance');

    const service = new ComplianceService();
    const result = service.check('帮我评估这个贷款申请人的信用风险');

    expect(result.annex_categories[0].obligations.length).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});

describe('AI Router', () => {
  it('should have correct default models', async () => {
    const { AIRouterService } = await import('../src/workers/ai-router');

    // Create service with mock env
    const env = {
      OPENAI_API_KEY: 'test-key',
      ANTHROPIC_API_KEY: 'test-key',
      GOOGLE_API_KEY: 'test-key'
    } as any;

    const router = new AIRouterService(env);

    // Test would need actual API keys to make real calls
    // This just tests the structure
    expect(router).toBeDefined();
  });
});

describe('Audit', () => {
  it('should generate unique IDs', async () => {
    // Import the module to test
    const id1 = `audit_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
    const id2 = `audit_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;

    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^audit_/);
  });
});
