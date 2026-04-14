// TokenRouter MVP - Type Definitions

// ============ Environment Bindings ============
export interface Env {
  DB: D1Database;
  ONTOLOGY_BUCKET: R2Bucket;
  ARCHIVE_BUCKET: R2Bucket;
  GRAPH_CACHE: KVNamespace;
  SESSIONS: KVNamespace;
  AI: Ai;
  ASSETS: Fetcher;

  // Secrets
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  GOOGLE_API_KEY: string;
  DEEPSEEK_API_KEY: string;
  SILICONFLOW_API_KEY: string;
  ADMIN_SECRET: string;  // For admin API access

  // Vars
  VERSION: string;
}

// ============ API Types ============
export interface APIRequest {
  text: string;
  company_id?: string;
  user_id?: string;
  options?: MaskOptions;
}

export interface MaskOptions {
  strategy?: 'replace' | 'hash' | 'generalize';
  mask_format?: 'type' | 'sequential';
  include_details?: boolean;
}

export interface MaskResponse {
  success: boolean;
  original: string;
  masked: string;
  detected: DetectedEntity[];
  processing_time_ms: number;
}

export interface DetectedEntity {
  type: PIIType | EnterpriseType;
  value: string;
  start: number;
  end: number;
  confidence: number;
}

export type PIIType =
  | 'PERSON'
  | 'ID_CARD'
  | 'BANK_CARD'
  | 'PHONE'
  | 'EMAIL'
  | 'ADDRESS'
  | 'MEDICAL_RECORD'
  | 'PASSPORT'
  | 'SSN';

export type EnterpriseType =
  | 'SUPPLIER'
  | 'PROJECT'
  | 'BUDGET'
  | 'CONTRACT'
  | 'SERVICE_PROVIDER'
  | 'INTERNAL_PERSON';

// ============ Compliance Types ============
export interface ComplianceRequest {
  text: string;
  language?: 'zh' | 'en' | 'auto';
}

export interface ComplianceResponse {
  success: boolean;
  risk_level: RiskLevel;
  annex_categories: AnnexCategory[];
  recommendations: string[];
  processing_time_ms: number;
}

export type RiskLevel = 'high' | 'medium' | 'low';

export interface AnnexCategory {
  id: string;
  name: string;
  description: string;
  confidence: number;
  obligations: string[];
}

// ============ AI Router Types ============
export interface ChatRequest {
  messages: Message[];
  model?: string;
  provider?: Provider;
  routing?: RoutingStrategy;
  temperature?: number;
  max_tokens?: number;
  metadata?: Record<string, string>;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type Provider = 'openai' | 'anthropic' | 'google' | 'deepseek' | 'siliconflow';
export type RoutingStrategy = 'cost_optimal' | 'latency_optimal' | 'quality_optimal' | 'balanced';

export interface ChatResponse {
  success: boolean;
  id: string;
  content: string;
  provider: Provider;
  model: string;
  usage: TokenUsage;
  latency_ms: number;
  error?: string;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
}

// ============ Audit Types ============
export interface AuditLog {
  id: string;
  timestamp: number;
  company_id: string;
  user_id?: string;
  original_text_hash: string;
  masked_text: string;
  pii_detected: boolean;
  enterprise_masked: boolean;
  provider?: string;
  model?: string;
  risk_level?: RiskLevel;
  status: AuditStatus;
}

export type AuditStatus = 'success' | 'pii_blocked' | 'compliance_blocked' | 'error';

export interface AuditQuery {
  company_id: string;
  from?: number;
  to?: number;
  limit?: number;
  offset?: number;
}

// ============ TTL/RDF Types ============
export interface RDFTriple {
  subject: string;
  predicate: string;
  object: string;
}

export interface EnterpriseEntity {
  id: string;
  type: EnterpriseType;
  label: string;
  properties: Record<string, string>;
}

export interface EnterpriseGraph {
  company_id: string;
  version: string;
  entities: Map<string, EnterpriseEntity>;
  triples: RDFTriple[];
}

// ============ API Keys ============
export interface APIKey {
  key_hash: string;
  company_id: string;
  created_at: number;
  is_active: boolean;
}

// ============ Compliance Rules ============
export interface ComplianceRule {
  id: string;
  name: string;
  annex_category?: string;
  risk_level: RiskLevel;
  conditions: RuleConditions;
  actions: RuleAction[];
  is_enabled: boolean;
}

export interface RuleConditions {
  keywords?: string[];
  expressions?: string[];
}

export interface RuleAction {
  type: 'block' | 'warn' | 'log';
  message: string;
}

// ============ Privacy Compute Types ============
export interface PIIsummary {
  total_pii_count: number;
  pii_breakdown: Record<string, number>;
  sensitivity_level: 'none' | 'low' | 'medium' | 'high';
}
