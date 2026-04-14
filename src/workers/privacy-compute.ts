// Privacy Compute Worker - Local computation + LLM summarization
import { PIIMaskingService } from './pii-masking';
import { SchemaManager, applySchemaMasking } from '../lib/ttl-schema';
import type { Env, PIIsummary } from '../types';

interface ComputeRequest {
  company_id: string;
  task: 'analyze' | 'statistics' | 'transform' | 'query';
  data: any;
  operations: string[];
  privacy_level?: 'strict' | 'partial' | 'none';
  summarize?: boolean;
}

interface ComputedResult {
  success: boolean;
  computed: any;
  summary?: string;
  cost_usd: number;
  processing_time_ms: number;
  sensitivity_report?: PIIsummary;
}

/**
 * Handle privacy compute request
 */
export async function handlePrivacyCompute(
  request: Request,
  env: Env
): Promise<Response> {
  const startTime = Date.now();

  try {
    const body = await request.json() as ComputeRequest;

    if (!body.task || !body.data) {
      return Response.json({
        success: false,
        error: 'task and data are required'
      }, { status: 400 });
    }

    const privacyLevel = body.privacy_level || 'strict';
    const piiMasker = new PIIMaskingService();
    const companyId = body.company_id || 'unknown';

    // Step 0: Get company schema (if available)
    let schema = null;
    try {
      const schemaManager = new SchemaManager(env.ONTOLOGY_BUCKET, env.GRAPH_CACHE);
      schema = await schemaManager.getSchema(companyId);
    } catch (e) {
      // Schema is optional, continue without it
    }

    // Step 1: Detect PII in input data for sensitivity report (with context awareness)
    const piiDetection = piiMasker.detectInData(body.data);
    const sensitivityReport = piiDetection.summary;

    // Step 2: Apply schema-based masking if schema is available
    let processedData = body.data;
    if (schema) {
      processedData = applySchemaMasking(body.data, schema, (value, piiType) => {
        // Use PII masking service with schema-provided PII type
        const result = piiMasker.mask(value);
        if (result.detected.length > 0 && piiType) {
          // Apply schema-specified masking
          if (privacyLevel === 'strict') {
            return result.masked;
          } else if (privacyLevel === 'partial') {
            return partialMaskValue(value, piiType);
          }
        }
        return result.masked;
      });
    }

    // Step 3: Local computation (no LLM involved)
    const computed = localCompute(processedData, body.operations, piiMasker, privacyLevel);

    // Step 2: LLM summarization (optional)
    let summary: string | undefined;
    let cost_usd = 0;

    if (body.summarize) {
      const summaryResult = await generateSummary(computed, body.task, env);
      summary = summaryResult.summary;
      cost_usd = summaryResult.cost_usd;
    }

    const processingTime = Date.now() - startTime;

    // Step 3: Save privacy report to D1
    const requestId = `priv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const dataString = typeof body.data === 'string' ? body.data : JSON.stringify(body.data);
    const dataSizeBytes = new TextEncoder().encode(dataString).length;

    await savePrivacyReport(env, {
      id: requestId,
      company_id: companyId,
      task_type: body.task,
      data_size_bytes: dataSizeBytes,
      pii_count: sensitivityReport.total_pii_count,
      pii_types: JSON.stringify(sensitivityReport.pii_breakdown),
      sensitivity_level: sensitivityReport.sensitivity_level,
      operations: JSON.stringify(body.operations),
      compute_time_ms: processingTime,
      cost_usd
    });

    const response = {
      success: true,
      computed,
      summary,
      cost_usd,
      processing_time_ms: processingTime,
      sensitivity_report: sensitivityReport
    };

    return Response.json(response);

  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Compute failed'
    }, { status: 500 });
  }
}

/**
 * Save privacy report to D1
 */
async function savePrivacyReport(
  env: Env,
  report: {
    id: string;
    company_id: string;
    task_type: string;
    data_size_bytes: number;
    pii_count: number;
    pii_types: string;
    sensitivity_level: string;
    operations: string;
    compute_time_ms: number;
    cost_usd: number;
  }
): Promise<void> {
  try {
    await env.DB
      .prepare(`
        INSERT INTO privacy_reports (
          id, company_id, task_type, data_size_bytes, pii_count,
          pii_types, sensitivity_level, operations, compute_time_ms, cost_usd
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        report.id,
        report.company_id,
        report.task_type,
        report.data_size_bytes,
        report.pii_count,
        report.pii_types,
        report.sensitivity_level,
        report.operations,
        report.compute_time_ms,
        report.cost_usd
      )
      .run();
  } catch (error) {
    // Silently fail - don't break the main flow
    console.error('Failed to save privacy report:', error);
  }
}

/**
 * Local computation engine - no LLM involved
 * Applies multiple operations to the same original data and accumulates results
 */
function localCompute(
  data: any,
  operations: string[],
  piiMasker: PIIMaskingService,
  privacyLevel: string
): any {
  const originalData = JSON.parse(JSON.stringify(data)); // Keep original data untouched
  const computed: any = {};

  // Extract array from data if it contains one (e.g., { orders: [...] })
  const dataArray = extractArrayFromData(originalData);

  for (const op of operations) {
    switch (op) {
      case 'mask_pii':
        computed.masked_data = maskDataRecursive(originalData, piiMasker, privacyLevel);
        break;

      case 'sum':
        computed.sum = calculateSum(dataArray);
        break;

      case 'count':
        computed.count = calculateCount(dataArray);
        break;

      case 'average':
        computed.average = calculateAverage(dataArray);
        break;

      case 'max':
        computed.max = calculateMax(dataArray);
        break;

      case 'min':
        computed.min = calculateMin(dataArray);
        break;

      case 'filter_amount_above':
        computed.filtered = filterByAmount(dataArray, 5000);
        computed.filtered_count = computed.filtered.length;
        break;

      case 'sort_by_amount':
        computed.sorted = sortByAmount(dataArray);
        break;

      case 'unique_customers':
        computed.unique_customers = getUniqueCustomers(dataArray);
        break;

      case 'group_by_customer':
        computed.grouped = groupByCustomer(dataArray);
        break;

      default:
        // Unknown operation, skip
        break;
    }
  }

  // If no operations produced results, return original data
  if (Object.keys(computed).length === 0) {
    return originalData;
  }

  return computed;
}

/**
 * Extract array from data object for computation
 * Automatically detects any array field in the object
 */
function extractArrayFromData(data: any): any[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (typeof data === 'object' && data !== null) {
    // Look for any array field in the object
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key])) {
        return data[key];
      }
    }
    // If data is a single object with scalar values, return as single-item array
    return [data];
  }
  return [];
}

/**
 * Recursively mask PII in data structure
 */
function maskDataRecursive(data: any, masker: PIIMaskingService, privacyLevel: string, parentKey?: string): any {
  if (typeof data === 'string') {
    // For strings, check if they contain PII and mask accordingly
    // Use context-aware detection for better bare name detection
    const result = masker.mask(data);
    if (result.detected.length > 0) {
      if (privacyLevel === 'strict') {
        return result.masked;
      } else if (privacyLevel === 'partial') {
        return partialMask(result.masked);
      }
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => maskDataRecursive(item, masker, privacyLevel, parentKey));
  }

  if (typeof data === 'object' && data !== null) {
    const masked: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Mask values but keep structure
      if (typeof value === 'string' && isSensitiveField(key)) {
        masked[key] = maskValue(value, masker, privacyLevel, key);
      } else if (typeof value === 'object') {
        masked[key] = maskDataRecursive(value, masker, privacyLevel, key);
      } else {
        masked[key] = value;
      }
    }
    return masked;
  }

  return data;
}

/**
 * Check if field name suggests sensitive data
 */
function isSensitiveField(fieldName: string): boolean {
  const sensitiveFields = ['phone', 'mobile', 'email', 'name', 'customer', 'address', 'id_card', 'ssn', 'bank_account'];
  return sensitiveFields.some(f => fieldName.toLowerCase().includes(f));
}

/**
 * Mask a single value with proper partial masking and context awareness
 */
function maskValue(value: string, masker: PIIMaskingService, privacyLevel: string, fieldName?: string): string {
  // Use context-aware detection if field name is provided
  let detection;
  if (fieldName && (masker as any).detectPIIWithContext) {
    detection = masker.detectPIIWithContext(value, fieldName);
  } else {
    detection = masker.detectAll(value);
  }

  if (detection.detected.length === 0) {
    return value;
  }

  if (privacyLevel === 'strict') {
    // Strict mode: full replacement
    // Check if person names were detected - they need special handling
    const personDetected = detection.detected.some((d: any) => d.type === 'PERSON');
    if (personDetected) {
      // For person names, directly replace with placeholder since masker.mask may not detect bare names
      return '[姓名]';
    }

    const result = masker.mask(value);
    return result.masked;
  } else if (privacyLevel === 'partial') {
    return partialMaskByType(value, detection.detected);
  }

  return value;
}

/**
 * Apply partial masking based on detected PII types
 */
function partialMaskByType(text: string, detected: any[]): string {
  let result = text;

  for (const entity of detected) {
    if (entity.type.startsWith('PHONE')) {
      // Phone: 13812345678 → 138****5678
      result = result.replace(entity.value, partialMaskPhone(entity.value));
    } else if (entity.type === 'EMAIL') {
      // Email: john@example.com → j***@e***.com
      result = result.replace(entity.value, partialMaskEmail(entity.value));
    }
    // Other types get full mask in partial mode
  }

  return result;
}

/**
 * Partial mask phone number
 */
function partialMaskPhone(phone: string): string {
  // Chinese mobile: 13812345678 → 138****5678
  const cnMobile = phone.match(/(\d{3})\d{5}(\d{3})/);
  if (cnMobile) {
    return `${cnMobile[1]}****${cnMobile[2]}`;
  }
  // Generic: keep first 3 and last 3 digits
  if (phone.length >= 7) {
    return phone.slice(0, 3) + '****' + phone.slice(-3);
  }
  return '****';
}

/**
 * Partial mask email
 */
function partialMaskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '****@****.com';

  const local = parts[0];
  const domain = parts[1];

  const maskedLocal = local.length > 1 ? local[0] + '***' : '***';
  const domainParts = domain.split('.');
  const maskedDomain = domainParts.length >= 2
    ? domainParts[0][0] + '***.' + domainParts.slice(1).join('.')
    : '***';

  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * Partial masking - preserve some digits
 */
function partialMask(text: string): string {
  // Phone: 13812345678 → 138****5678
  const phoneRegex = /(\d{3})\d{5}(\d{3})/;
  if (phoneRegex.test(text)) {
    return text.replace(phoneRegex, '$1****$2');
  }

  // Email: john@example.com → j***@e***.com
  const emailRegex = /([a-z])\w+@([a-z])\w+\.(\w+)/i;
  if (emailRegex.test(text)) {
    return text.replace(emailRegex, '$1***@$2***.$3');
  }

  // If already masked with brackets, keep as is
  if (text.includes('[') && text.includes(']')) {
    return text;
  }

  return `[${text.slice(0, 2)}...]`;
}

/**
 * Partial mask value based on PII type
 */
function partialMaskValue(value: string, piiType?: string): string {
  if (!piiType) return partialMask(value);

  switch (piiType) {
    case 'phone':
      return partialMaskPhone(value);
    case 'email':
      return partialMaskEmail(value);
    default:
      return partialMask(value);
  }
}

/**
 * Calculate sum of numeric fields
 */
function calculateSum(data: any): number {
  if (Array.isArray(data)) {
    // Find a numeric field to sum
    const numericField = findNumericField(data[0]);
    return data.reduce((sum, item) => {
      if (typeof item === 'object' && item !== null && numericField) {
        return sum + (Number(item[numericField]) || 0);
      }
      return sum + (Number(item) || 0);
    }, 0);
  }
  if (typeof data === 'object' && data !== null) {
    const numericField = findNumericField(data);
    return numericField ? (Number(data[numericField]) || 0) : 0;
  }
  return Number(data) || 0;
}

/**
 * Find the first numeric field in an object
 */
function findNumericField(obj: any): string | null {
  if (typeof obj !== 'object' || obj === null) return null;
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'number') {
      return key;
    }
  }
  return null;
}

/**
 * Calculate count
 */
function calculateCount(data: any): number {
  if (Array.isArray(data)) {
    return data.length;
  }
  if (typeof data === 'object' && data !== null) {
    return Object.keys(data).length;
  }
  return 1;
}

/**
 * Calculate average
 */
function calculateAverage(data: any): number {
  const count = calculateCount(data);
  if (count === 0) return 0;
  const sum = calculateSum(data);
  return Math.round((sum / count) * 100) / 100;
}

/**
 * Calculate max
 */
function calculateMax(data: any): number {
  if (Array.isArray(data)) {
    if (data.length === 0) return 0;
    const values = data.map(item => {
      if (typeof item === 'object' && item !== null) {
        return item.amount || item.price || item.value || 0;
      }
      return Number(item) || 0;
    }).filter(v => !isNaN(v));
    return values.length > 0 ? Math.max(...values) : 0;
  }
  return Number(data) || 0;
}

/**
 * Calculate min
 */
function calculateMin(data: any): number {
  if (Array.isArray(data)) {
    return Math.min(...data.map(item => {
      if (typeof item === 'object' && item !== null) {
        return item.amount || item.price || item.value || 0;
      }
      return Number(item) || 0;
    }));
  }
  return Number(data) || 0;
}

/**
 * Filter by amount above threshold
 */
function filterByAmount(data: any, threshold: number): any {
  if (Array.isArray(data)) {
    return data.filter(item => {
      const amount = item.amount || item.price || item.value || 0;
      return amount >= threshold;
    });
  }
  return data;
}

/**
 * Sort by amount descending
 */
function sortByAmount(data: any): any {
  if (Array.isArray(data)) {
    return [...data].sort((a, b) => {
      const amtA = a.amount || a.price || a.value || 0;
      const amtB = b.amount || b.price || b.value || 0;
      return amtB - amtA;
    });
  }
  return data;
}

/**
 * Get unique customers
 */
function getUniqueCustomers(data: any): string[] {
  if (Array.isArray(data)) {
    const names = data.map(item => item.customer || item.name).filter(Boolean);
    return [...new Set(names)];
  }
  return [];
}

/**
 * Group by customer
 */
function groupByCustomer(data: any): any {
  if (!Array.isArray(data)) return data;

  const grouped: any = {};
  for (const item of data) {
    const customer = item.customer || item.name || 'Unknown';
    if (!grouped[customer]) {
      grouped[customer] = [];
    }
    grouped[customer].push(item);
  }
  return grouped;
}

/**
 * Generate summary using LLM (minimal tokens)
 */
async function generateSummary(
  computed: any,
  task: string,
  env: Env
): Promise<{ summary: string; cost_usd: number }> {
  const taskTemplates: Record<string, { prompt: string; costEstimate: number }> = {
    analyze: {
      prompt: `分析结果: ${JSON.stringify(computed)}\n请用一句话总结。`,
      costEstimate: 0.00001
    },
    statistics: {
      prompt: `统计数据: ${JSON.stringify(computed)}\n请简洁描述关键发现。`,
      costEstimate: 0.00001
    },
    transform: {
      prompt: `转换完成: ${JSON.stringify(computed)}\n确认转换是否成功。`,
      costEstimate: 0.000005
    },
    query: {
      prompt: `查询结果: ${JSON.stringify(computed)}\n一句话说明结果。`,
      costEstimate: 0.00001
    }
  };

  const template = taskTemplates[task] || taskTemplates.analyze;

  // Use AI Router for summarization
  const router = new (await import('./ai-router')).AIRouterService(env);

  try {
    const result = await router.chat({
      messages: [{ role: 'user', content: template.prompt }],
      model: 'deepseek-chat'
    });

    return {
      summary: result.content || JSON.stringify(computed),
      cost_usd: result.usage?.cost_usd || template.costEstimate
    };
  } catch (error) {
    // Fallback: return computed data as summary
    return {
      summary: `计算完成，结果: ${JSON.stringify(computed)}`,
      cost_usd: template.costEstimate
    };
  }
}
