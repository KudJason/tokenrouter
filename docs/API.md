# TokenRouter MVP API Documentation

**Version:** 0.2.1
**Base URL:** `https://token.route.worthwolf.top`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Rate Limiting](#rate-limiting)
3. [AI Chat APIs](#ai-chat-apis)
4. [Privacy Compute API](#privacy-compute-api)
5. [PII Masking](#pii-masking)
6. [Enterprise Masking](#enterprise-masking)
7. [Compliance Check](#compliance-check)
8. [Audit Logs](#audit-logs)
9. [Admin API](#admin-api)
10. [Web Dashboard](#web-dashboard)
11. [Error Codes](#error-codes)

---

## Authentication

TokenRouter uses API keys for authentication on protected endpoints.

### Getting an API Key

Contact administrator to get your API key. Keys are stored as SHA-256 hashes in D1.

### Using API Key

Include your API key in the request header:

```
Authorization: Bearer your_api_key_here
```

Or via custom header:

```
X-API-Key: your_api_key_here
```

### Public vs Protected Endpoints


| Endpoint                      | Auth Required | Rate Limited |
| ----------------------------- | ------------- | ------------ |
| `GET /health`                 | No            | No           |
| `GET /v1/providers`           | No            | No           |
| `POST /v1/mask`               | No            | No           |
| `POST /v1/compliance/check`   | No            | No           |
| `POST /v1/chat`               | Yes           | Yes          |
| `POST /v1/anthropic/messages` | Yes           | Yes          |
| `POST /v1/mask/enterprise`    | Yes           | Yes          |
| `POST /v1/audit`              | Yes           | Yes          |
| `GET /v1/audit`               | Yes           | Yes          |


---

## Rate Limiting

Protected endpoints are rate limited to **60 requests per minute** per API key.

### Rate Limit Headers

Response headers indicate your rate limit status:


| Header                  | Description                      |
| ----------------------- | -------------------------------- |
| `X-RateLimit-Limit`     | Requests allowed per window      |
| `X-RateLimit-Remaining` | Requests remaining               |
| `X-RateLimit-Reset`     | Unix timestamp when limit resets |


### Rate Limit Exceeded

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMITED",
  "retry_after_ms": 45000
}
```

HTTP Status: `429 Too Many Requests`

---

## AI Chat APIs

TokenRouter supports multiple AI providers with automatic failover.

### Available Providers


| Provider    | API Type  | Default Model            | Status                         |
| ----------- | --------- | ------------------------ | ------------------------------ |
| DeepSeek    | OpenAI    | deepseek-chat            | Requires `DEEPSEEK_API_KEY`    |
| SiliconFlow | OpenAI    | deepseek-ai/DeepSeek-V3  | Requires `SILICONFLOW_API_KEY` |
| OpenAI      | OpenAI    | gpt-4o                   | Requires `OPENAI_API_KEY`      |
| Anthropic   | Anthropic | claude-3-5-sonnet-latest | Requires `ANTHROPIC_API_KEY`   |
| Google      | Google    | gemini-2.0-flash         | Requires `GOOGLE_API_KEY`      |


Only providers with valid API keys are activated.

### Check Available Providers

```bash
curl https://token.route.worthwolf.top/v1/providers
```

Response:

```json
{
  "available_providers": ["deepseek", "siliconflow"]
}
```

---

### OpenAI Protocol

**Endpoint:** `POST /v1/chat/completions`

Compatible with OpenAI SDK and any OpenAI-compatible client.

#### Request Example

```bash
curl -X POST https://token.route.worthwolf.top/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_api_key" \
  -d '{
    "model": "deepseek-chat",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Explain EU AI Act in simple terms"}
    ],
    "temperature": 0.7,
    "max_tokens": 500
  }'
```

#### Request Fields


| Field         | Type    | Required | Default          | Description                       |
| ------------- | ------- | -------- | ---------------- | --------------------------------- |
| `model`       | string  | No       | Provider default | Model identifier                  |
| `messages`    | array   | Yes      | -                | Chat messages `[{role, content}]` |
| `temperature` | float   | No       | 0.7              | Sampling temperature (0-2)        |
| `max_tokens`  | integer | No       | 1024             | Max response tokens               |
| `provider`    | string  | No       | First available  | Force specific provider           |


#### Response Example

```json
{
  "id": "chatcmpl_8a7b6c5d4e3f2g1h",
  "object": "chat.completion",
  "created": 1712500000,
  "model": "deepseek-chat",
  "provider": "deepseek",
  "usage": {
    "prompt_tokens": 45,
    "completion_tokens": 128,
    "total_tokens": 173,
    "cost_usd": 0.0000173
  },
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "The EU AI Act is a comprehensive regulation that..."
      },
      "finish_reason": "stop",
      "index": 0
    }
  ]
}
```

---

### Anthropic Protocol

**Endpoint:** `POST /v1/anthropic/messages`

Compatible with Anthropic SDK.

#### Request Example

```bash
curl -X POST https://token.route.worthwolf.top/v1/anthropic/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-5-sonnet-latest",
    "messages": [
      {"role": "user", "content": "What is GDPR?"}
    ],
    "system": "You are a compliance assistant.",
    "max_tokens": 500
  }'
```

#### Response Example

```json
{
  "id": "msg_9b8c7d6e5f4g3h2i",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "GDPR (General Data Protection Regulation) is..."
    }
  ],
  "model": "claude-3-5-sonnet-latest",
  "provider": "anthropic",
  "usage": {
    "input_tokens": 32,
    "output_tokens": 156
  },
  "stop_reason": "end_turn"
}
```

---

## Privacy Compute API

**本地计算 + LLM 汇总** - 数据不出本地，LLM 只做汇总

### Core Concept

```
用户数据 → 本地计算 → 脱敏结果 → LLM 汇总 → 最终回答
```

**优势：**

- Token 消耗降低 99%+
- 隐私数据不经过 LLM
- 支持复杂数据分析

### Privacy Compute

**Endpoint:** `POST /v1/privacy/compute`

Protected endpoint (requires API key).

#### Request Example

```bash
curl -X POST https://token.route.worthwolf.top/v1/privacy/compute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_api_key" \
  -d '{
    "company_id": "mycompany",
    "task": "statistics",
    "data": {
      "orders": [
        {"customer": "张三", "phone": "13812345678", "amount": 5000},
        {"customer": "李四", "phone": "13987654321", "amount": 8000}
      ]
    },
    "operations": ["sum", "average", "count"],
    "privacy_level": "strict",
    "summarize": true
  }'
```

#### Request Fields


| Field           | Type    | Required | Default  | Description                                                                                              |
| --------------- | ------- | -------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `company_id`    | string  | Yes      | -        | Company identifier                                                                                       |
| `task`          | string  | Yes      | -        | Task type: `analyze`, `statistics`, `transform`, `query`                                                 |
| `data`          | object  | Yes      | -        | Input data for computation                                                                               |
| `operations`    | array   | No       | `[]`     | Operations: `sum`, `count`, `average`, `max`, `min`, `filter_amount_above`, `sort_by_amount`, `mask_pii` |
| `privacy_level` | string  | No       | `strict` | `strict` (完全脱敏) / `partial` (部分脱敏) / `none` (不脱敏)                                                        |
| `summarize`     | boolean | No       | `false`  | Enable LLM summarization                                                                                 |


#### Response Example

```json
{
  "success": true,
  "computed": {
    "sum": 13000,
    "average": 6500,
    "count": 2
  },
  "summary": "共2笔订单，总金额13000元，平均6500元。",
  "cost_usd": 0.00001,
  "processing_time_ms": 45
}
```

---

## PII Masking

Detects and masks personal identifiable information.

### Mask PII

**Endpoint:** `POST /v1/mask`

Public endpoint (no auth required).

#### Request Example

```bash
curl -X POST https://token.route.worthwolf.top/v1/mask \
  -H "Content-Type: application/json" \
  -d '{
    "text": "张三的身份证号是110101199001011234，"
  }'
```

#### Response Example

```json
{
  "success": true,
  "original": "张三的身份证号是110101199001011234",
  "masked": "[姓名]的身份证号是[身份证号]",
  "detected": [
    {"type": "PERSON", "value": "张三", "start": 0, "end": 2, "confidence": 0.85},
    {"type": "ID_CARD", "value": "110101199001011234", "start": 6, "end": 20, "confidence": 0.95}
  ],
  "processing_time_ms": 8
}
```

### Supported PII Types


| Type      | Languages                                 | Mask   |
| --------- | ----------------------------------------- | ------ |
| PERSON    | Chinese, English, German, French, Spanish | [姓名]   |
| ID_CARD   | Chinese, German, Spanish                  | [身份证号] |
| BANK_CARD | International                             | [银行卡号] |
| PHONE     | Chinese (+86), International              | [手机号]  |
| EMAIL     | International                             | [邮箱]   |
| PASSPORT  | International                             | [护照号]  |
| SSN       | Chinese, US, French                       | [社保号]  |


### Multilingual Examples

**German:**

```json
{
  "text": "Herr Mueller, Personalausweis L1234567",
  "masked": "[姓名], Personalausweis [身份证号]"
}
```

**French:**

```json
{
  "text": "M. Dupont, SSN: 1 89 12 45 123456",
  "masked": "[姓名], SSN: [社保号]"
}
```

---

## Enterprise Masking

Masks company-sensitive information based on custom TTL ontology.

### Mask Enterprise Info

**Endpoint:** `POST /v1/mask/enterprise`

Requires authentication.

#### Request Example

```bash
curl -X POST https://token.route.worthwolf.top/v1/mask/enterprise \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_api_key" \
  -d '{
    "text": "Project Alpha预算€2,000,000，供应商是Acme Corp",
    "company_id": "your_company_id"
  }'
```

#### Response Example

```json
{
  "success": true,
  "original": "Project Alpha预算€2,000,000，供应商是Acme Corp",
  "masked": "[PROJECT]预算[BUDGET]，供应商是[SUPPLIER]",
  "detected": [
    {"type": "PROJECT", "value": "Project Alpha", "confidence": 0.95},
    {"type": "BUDGET", "value": "€2,000,000", "confidence": 0.92},
    {"type": "SUPPLIER", "value": "Acme Corp", "confidence": 0.88}
  ],
  "processing_time_ms": 12
}
```

### Upload Ontology

**Endpoint:** `PUT /v1/ontology/{company_id}`

Upload TTL file defining company entities.

#### Request Example

```bash
curl -X PUT https://token.route.worthwolf.top/v1/ontology/your_company_id \
  -H "Content-Type: text/plain" \
  -H "Authorization: Bearer your_api_key" \
  -d '@company_ontology.ttl'
```

#### TTL Format

```ttl
@prefix tr: <http://tokenrouter.ai/enterprise#> .

tr:Supplier_001 a tr:Supplier ;
    tr:supplierName "Acme Corp"@en ;
    tr:contractValue "€500,000" .

tr:Project_001 a tr:Project ;
    tr:projectName "Project Alpha"@en ;
    tr:budget "€2,000,000" .
```

### Entity Types


| Type             | Description                 |
| ---------------- | --------------------------- |
| SUPPLIER         | Supplier names and contacts |
| PROJECT          | Project names and codes     |
| BUDGET           | Budget amounts              |
| CONTRACT         | Contract IDs and values     |
| SERVICE_PROVIDER | External service providers  |
| INTERNAL_PERSON  | Staff names                 |


---

## Compliance Check

Checks for EU AI Act Annex III high-risk categories.

### Check Compliance

**Endpoint:** `POST /v1/compliance/check`

Public endpoint (no auth required).

#### Request Example

```bash
curl -X POST https://token.route.worthwolf.top/v1/compliance/check \
  -H "Content-Type: application/json" \
  -d '{
    "text": "评估贷款申请人李明的信用风险"
  }'
```

#### Response Example

```json
{
  "success": true,
  "risk_level": "high",
  "annex_categories": [
    {
      "id": "credit",
      "name": "信用评估",
      "description": "AI systems for creditworthiness evaluation",
      "confidence": 0.92,
      "obligations": [
        "Transparency: must inform subject about AI in credit decisions",
        "Human oversight: must have human review mechanism",
        "Documentation: must maintain audit trail"
      ]
    }
  ],
  "recommendations": [
    "信用评估 category detected. Ensure compliance with Article 9.",
    "Consider implementing human oversight.",
    "Document all high-risk AI interactions."
  ],
  "processing_time_ms": 5
}
```

### Risk Levels


| Level    | Description                           |
| -------- | ------------------------------------- |
| `high`   | Annex III high-risk category detected |
| `medium` | Potential risk, review recommended    |
| `low`    | No high-risk categories detected      |


### Annex III Categories


| Category                | Keywords                            |
| ----------------------- | ----------------------------------- |
| biometric               | 人脸识别, fingerprint, face recognition |
| critical_infrastructure | 交通, energy, power grid              |
| education               | 学生评分, admission, exam               |
| employment              | 招聘, recruitment, performance        |
| credit                  | 信用评估, loan, credit scoring          |
| healthcare              | 诊断, treatment, medical              |
| justice                 | 法律咨询, legal advice                  |


---

## Audit Logs

Log and query AI interaction audit trails.

### Create Audit Log

**Endpoint:** `POST /v1/audit`

```bash
curl -X POST https://token.route.worthwolf.top/v1/audit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_api_key" \
  -d '{
    "company_id": "your_company_id",
    "user_id": "user_123",
    "original_text_hash": "sha256_hash",
    "masked_text": "sanitized content",
    "pii_detected": true,
    "enterprise_masked": false,
    "provider": "deepseek",
    "model": "deepseek-chat",
    "risk_level": "low",
    "status": "success"
  }'
```

### Query Audit Logs

**Endpoint:** `GET /v1/audit`

```bash
curl "https://token.route.worthwolf.top/v1/audit?company_id=your_company_id&limit=50" \
  -H "Authorization: Bearer your_api_key"
```

### Export Audit Logs

**Endpoint:** `GET /v1/audit/export`

```bash
curl "https://token.route.worthwolf.top/v1/audit/export?company_id=your_company_id&format=csv" \
  -H "Authorization: Bearer your_api_key" \
  -o audit_export.csv
```

---

## Error Codes

### HTTP Status Codes


| Status | Code                | Description                   |
| ------ | ------------------- | ----------------------------- |
| 400    | INVALID_REQUEST     | Missing or invalid parameters |
| 401    | UNAUTHORIZED        | Invalid or missing API key    |
| 429    | RATE_LIMITED        | Rate limit exceeded           |
| 500    | INTERNAL_ERROR      | Server error                  |
| 503    | SERVICE_UNAVAILABLE | AI provider unavailable       |


### Error Response Format

```json
{
  "success": false,
  "error": "Error message here",
  "code": "ERROR_CODE",
  "processing_time_ms": 5
}
```

---

## SDK Examples

### Python (OpenAI SDK)

```python
from openai import OpenAI

client = OpenAI(
    api_key="your_api_key",
    base_url="https://token.route.worthwolf.top/v1"
)

response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[{"role": "user", "content": "Hello!"}]
)

print(response.choices[0].message.content)
```

### Python (Anthropic SDK)

```python
from anthropic import Anthropic

client = Anthropic(
    api_key="your_api_key",
    base_url="https://token.route.worthwolf.top/v1/anthropic"
)

response = client.messages.create(
    model="claude-3-5-sonnet-latest",
    messages=[{"role": "user", "content": "Hello!"}]
)

print(response.content[0].text)
```

### JavaScript

```javascript
// OpenAI format
const response = await fetch('https://token.route.worthwolf.top/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_api_key'
  },
  body: JSON.stringify({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: 'Hello!' }]
  })
});
```

---

## Admin API

Admin API requires `ADMIN_SECRET` Bearer token authentication.

### Create API Key

**Endpoint:** `POST /v1/admin/keys`

```bash
curl -X POST https://token.route.worthwolf.top/v1/admin/keys \
  -H "Authorization: Bearer your_admin_secret" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "acme_corp",
    "company_name": "Acme Corporation",
    "key_name": "Production Key",
    "rate_limit_rpm": 100
  }'
```

**Response:**

```json
{
  "success": true,
  "api_key": "tr_abc123...",
  "company_id": "acme_corp",
  "rate_limit_rpm": 100
}
```

### List API Keys

**Endpoint:** `GET /v1/admin/keys?company_id=xxx`

```bash
curl "https://token.route.worthwolf.top/v1/admin/keys?company_id=acme_corp" \
  -H "Authorization: Bearer your_admin_secret"
```

### Revoke API Key

**Endpoint:** `DELETE /v1/admin/keys/{keyHash}`

```bash
curl -X DELETE "https://token.route.worthwolf.top/v1/admin/keys/abc123..." \
  -H "Authorization: Bearer your_admin_secret"
```

### Get Usage Statistics

**Endpoint:** `GET /v1/admin/usage?company_id=xxx`

```bash
curl "https://token.route.worthwolf.top/v1/admin/usage?company_id=acme_corp" \
  -H "Authorization: Bearer your_admin_secret"
```

**Response:**

```json
{
  "success": true,
  "company_id": "acme_corp",
  "totals": {
    "request_count": 15420,
    "total_tokens": 2456789,
    "cost_usd": 0.245
  },
  "by_provider": {
    "deepseek": { "request_count": 10000, "total_tokens": 2000000, "cost_usd": 0.2 },
    "anthropic": { "request_count": 5420, "total_tokens": 456789, "cost_usd": 0.045 }
  }
}
```

### Get Audit Logs (Admin)

**Endpoint:** `GET /v1/admin/audit?company_id=xxx`

```bash
curl "https://token.route.worthwolf.top/v1/admin/audit?company_id=acme_corp&limit=50" \
  -H "Authorization: Bearer your_admin_secret"
```

### System Health

**Endpoint:** `GET /v1/admin/health`

```bash
curl "https://token.route.worthwolf.top/v1/admin/health" \
  -H "Authorization: Bearer your_admin_secret"
```

---

## Web Dashboard

A web-based admin dashboard is available at:

**URL:** `https://token.route.worthwolf.top/`

Features:

- Create and manage API keys
- View usage statistics by company and provider
- Monitor audit logs
- System health check

First time users will be prompted for the Admin Secret.

---

## Changelog

### v0.3.0 (2026-04-10)

- Added `/v1/privacy/compute` API for local computation + LLM summarization
- Data stays local, only summary goes to LLM
- 99%+ cost reduction for data analysis tasks

### v0.2.1 (2026-04-09)

- Added Admin API for API key management
- Added Web Dashboard at `/`
- Usage statistics per company/provider
- Audit log admin view
- System health endpoint

### v0.2.0 (2026-04-09)

- Added API key authentication for protected endpoints
- Added rate limiting (60 req/min)
- Added AI provider retry with exponential backoff
- Enhanced PII detection with multilingual support (DE, FR, ES)
- Added real test data and examples
- Bug fixes

### v0.1.0 (2026-04-09)

- Initial MVP release
- PII Masking
- Enterprise Masking (TTL ontology)
- EU AI Act Compliance Check
- AI Router with 5 providers
- Audit Logging
- OpenAI and Anthropic protocol support

