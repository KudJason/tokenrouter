# Quick Start Guide

Get TokenRouter running in 5 minutes.

## Prerequisites

- Node.js 18+
- npm or yarn
- Cloudflare account (free tier works)
- API keys for at least one AI provider

## Step 1: Clone and Install

```bash
git clone https://github.com/KudJason/tokenrouter.git
cd tokenrouter
npm install
```

## Step 2: Configure Cloudflare

Create a `.dev.vars` file in the project root:

```bash
# Get your API keys from the respective provider dashboards
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
DEEPSEEK_API_KEY=sk-...

# Generate a secure API key for your users
TR_API_KEY=$(openssl rand -hex 32)
```

## Step 3: Create Infrastructure

```bash
# Create D1 database
wrangler d1 create tokenrouter

# Create R2 buckets
wrangler r2 bucket create enterprise-ontologies
wrangler r2 bucket create tokenrouter-archive

# Create KV namespaces
wrangler kv:namespace create GRAPH_CACHE
wrangler kv:namespace create SESSIONS

# Apply migrations
wrangler d1 migrations apply tokenrouter --local
```

Update `wrangler.jsonc` with your account ID and the resource IDs from the commands above.

## Step 4: Deploy

```bash
npm run deploy
```

Your TokenRouter instance is now live at `https://tokenrouter.<your-subdomain>.workers.dev`

## Step 5: Test It

```bash
# Check health
curl https://tokenrouter.<your-subdomain>.workers.dev/health

# Test PII masking
curl -X POST https://tokenrouter.<your-subdomain>.workers.dev/v1/mask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TR_API_KEY" \
  -d '{"text": "张三，身份证号110101199001011234，手机13812345678"}'

# Test chat completions
curl -X POST https://tokenrouter.<your-subdomain>.workers.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TR_API_KEY" \
  -d '{"model": "gpt-4o", "messages": [{"role": "user", "content": "Hello!"}]}'
```

## What's Next?

- [API Reference](API.md) — Full endpoint documentation
- [EU AI Act Compliance Guide](COMPLIANCE.md) — Understanding Annex III
- [PII Masking Guide](PRIVACY_API.md) — Advanced masking options
- [Migration Guide](MIGRATION.md) — Coming from LiteLLM or Portkey?

## Troubleshooting

### "Worker not found" error

Make sure you deployed successfully and your subdomain is correct.

### "Invalid API key" error

Generate a new `TR_API_KEY` and try again:
```bash
openssl rand -hex 32
```

### D1 migration failed

Make sure your D1 database was created successfully:
```bash
wrangler d1 list
```

## Need Help?

- [Open an issue](https://github.com/KudJason/tokenrouter/issues)
- [Join our Discord](#)
