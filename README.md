# TokenRouter MVP

AI Compliance Middleware on Cloudflare Workers - GDPR + EU AI Act compliant

## Features

- **PII Masking** - Automatic detection and masking of personal identifiable information
- **Enterprise Sensitive Info Masking** - Custom ontology-based masking for company secrets
- **EU AI Act Compliance Check** - Real-time Annex III high-risk category detection
- **AI Router** - Multi-provider routing (OpenAI, Anthropic, Google)
- **Audit Logging** - Complete call logging with D1 + R2 archival

## Tech Stack

- **Cloudflare Workers** - Edge computing
- **Cloudflare D1** - SQLite database
- **Cloudflare R2** - Object storage (TTL ontologies, archives)
- **Cloudflare KV** - Caching
- **TypeScript** - Type safety

## Supported AI Providers

**Only providers with configured API keys will be activated.**


| Provider    | Default Model            | API Format        | Secret Name           |
| ----------- | ------------------------ | ----------------- | --------------------- |
| OpenAI      | gpt-4o                   | OpenAI            | `OPENAI_API_KEY`      |
| Anthropic   | claude-3-5-sonnet-latest | Anthropic         | `ANTHROPIC_API_KEY`   |
| Google      | gemini-2.0-flash         | Google            | `GOOGLE_API_KEY`      |
| DeepSeek    | deepseek-chat            | OpenAI-compatible | `DEEPSEEK_API_KEY`    |
| SiliconFlow | deepseek-ai/DeepSeek-V3  | OpenAI-compatible | `SILICONFLOW_API_KEY` |


### Check Available Providers

```bash
curl https://your-worker.workers.dev/health
# Returns: { "available_providers": ["deepseek", "siliconflow"] }

curl https://your-worker.workers.dev/v1/providers
# Returns: { "available_providers": ["deepseek", "siliconflow"] }
```

## Quick Start

```bash
# Install dependencies
npm install

# Configure wrangler (set your account ID in wrangler.jsonc)
# Then create databases
wrangler d1 create tokenrouter
wrangler r2 bucket create enterprise-ontologies
wrangler r2 bucket create tokenrouter-archive
wrangler kv:namespace create GRAPH_CACHE
wrangler kv:namespace create SESSIONS

# Apply migrations
wrangler d1 migrations apply tokenrouter --remote

# Set secrets
wrangler secret put OPENAI_API_KEY
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put GOOGLE_API_KEY
wrangler secret put DEEPSEEK_API_KEY
wrangler secret put SILICONFLOW_API_KEY

# Deploy
npm run deploy
```

## API Endpoints


| Endpoint                        | Method             | Description                            |
| ------------------------------- | ------------------ | -------------------------------------- |
| `POST /v1/chat/completions`     | AI Chat            | OpenAI protocol endpoint               |
| `POST /v1/anthropic/messages`   | AI Chat            | Anthropic protocol endpoint            |
| `POST /v1/mask`                 | PII masking        | Mask personal identifiable information |
| `POST /v1/mask/enterprise`      | Enterprise masking | Mask company-sensitive information     |
| `POST /v1/compliance/check`     | Compliance check   | Check EU AI Act Annex III categories   |
| `POST /v1/audit`                | Create log         | Log an audit event                     |
| `GET /v1/audit`                 | Query logs         | Query audit logs                       |
| `PUT /v1/ontology/{company_id}` | Upload TTL         | Upload company ontology                |
| `GET /v1/providers`             | Provider info      | List available AI providers            |
| `GET /health`                   | Health check       | Service health and available providers |


## API Documentation

Full API documentation: [docs/API.md](docs/API.md)

### OpenAI Protocol

Compatible with OpenAI SDK:

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.TR_API_KEY,
  baseURL: 'https://your-worker.workers.dev/v1'
});

const response = await client.chat.completions.create({
  model: 'deepseek-chat',
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

### Anthropic Protocol

Compatible with Anthropic SDK:

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.TR_API_KEY,
  baseURL: 'https://your-worker.workers.dev/v1/anthropic'
});

const response = await client.messages.create({
  model: 'claude-3-5-sonnet-latest',
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

## Example Usage

```bash
# AI Chat - OpenAI Protocol
curl -X POST https://your-worker.workers.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TR_API_KEY" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# AI Chat - Anthropic Protocol
curl -X POST https://your-worker.workers.dev/v1/anthropic/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: $TR_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-5-sonnet-latest",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# PII Masking
curl -X POST https://your-worker.workers.dev/v1/mask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TR_API_KEY" \
  -d '{"text": "张总，身份证号110101199001011234，手机13812345678"}'

# Compliance Check
curl -X POST https://your-worker.workers.dev/v1/compliance/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TR_API_KEY" \
  -d '{"text": "帮我评估这个贷款申请人的信用风险"}'
```

## Enterprise Ontology (TTL)

Upload a TTL file defining your company's sensitive entities:

```ttl
@prefix tr: <http://tokenrouter.ai/enterprise#> .

tr:Supplier_001 a tr:Supplier ;
    tr:supplierName "Acme Corp"@en ;
    tr:contractValue "€500,000" .

tr:Project_001 a tr:Project ;
    tr:projectName "Project Alpha"@en ;
    tr:budget "€2,000,000" .
```

## Cost


| Service | Free Tier              | Paid              |
| ------- | ---------------------- | ----------------- |
| Workers | 10M requests/day       | $5/10M additional |
| D1      | 5GB storage            | $0.75/GB/month    |
| R2      | 10GB storage           | $0.015/GB/month   |
| KV      | 1GB storage, 10M reads | $0.05/GB/month    |


## License

MIT