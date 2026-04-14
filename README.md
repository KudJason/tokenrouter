# TokenRouter

> **AI Compliance Middleware for European SMBs** — PII masking, EU AI Act checks, and multi-provider routing in one edge-native gateway.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com/)
[![GitHub stars](https://img.shields.io/github/stars/KudJason/tokenrouter)](https://github.com/KudJason/tokenrouter)
[![GitHub forks](https://img.shields.io/github/forks/KudJason/tokenrouter)](https://github.com/KudJason/tokenrouter)

[Demo](#demo) · [Quick Start](#quick-start) · [Documentation](#documentation) · [Examples](#examples) · [Who's Using](#whos-using) · [Contributing](#contributing)

---

## The Problem

Building AI-powered applications in Europe means dealing with **GDPR** and the **EU AI Act**. But every time you send user data to OpenAI, Anthropic, or Google, you're potentially violating these regulations.

**Without TokenRouter:**

```typescript
// You handle compliance manually. Every. Single. Time.
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: userInput }] // ← PII might be here!
});

// Later: "Why did we get a GDPR fine?"
```

**With TokenRouter:**

```typescript
import TokenRouter from '@tokenrouter/sdk';

const router = new TokenRouter({ apiKey: process.env.TR_API_KEY });

// PII is masked automatically. EU AI Act compliance is checked.
// Audit log is created. All before your request reaches the LLM.
const response = await router.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: userInput }]
});
```

**Before TokenRouter:**
- ❌ Manual PII filtering — easy to miss something
- ❌ No EU AI Act compliance checks
- ❌ Scattered audit logs (or none)
- ❌ Managing multiple AI providers is a nightmare
- ❌ GDPR/HIPAA compliance is a headache

**After TokenRouter:**
- ✅ Semantic PII detection (not just keyword matching)
- ✅ Real-time EU AI Act Annex III compliance checks
- ✅ Complete audit trail with every call
- ✅ Single API for OpenAI, Anthropic, Google, DeepSeek, SiliconFlow
- ✅ Deploy to edge in minutes

---

## Demo

> **[Live Demo](https://tokenrouter.workers.dev)** — Paste any text to see PII masking and compliance checking in action.

---

## Features

| Feature | Description |
|---------|-------------|
| **PII Masking** | Semantic NLP detection of names, IDs,银行卡号, phone numbers, addresses — not keyword filtering |
| **Enterprise Masking** | Upload custom TTL ontologies to define your company's sensitive data patterns |
| **EU AI Act Compliance** | Real-time Annex III high-risk category detection for every AI request |
| **AI Router** | Single API for OpenAI, Anthropic, Google, DeepSeek, SiliconFlow with automatic failover |
| **Audit Logging** | Complete request/response logging with D1 storage and R2 archival |
| **Edge-Native** | Deployed to 300+ Cloudflare edge locations worldwide |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Your Application                       │
└─────────────────────┬───────────────────────────────────┘
                      │ AI Request
                      ▼
┌─────────────────────────────────────────────────────────┐
│              TokenRouter Middleware                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │  1. PII Masking Engine                         │   │
│  │     └── Semantic NLP detects personal data     │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  2. Compliance Check Engine                    │   │
│  │     └── EU AI Act Annex III validation         │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  3. AI Router                                  │   │
│  │     └── Smart routing + failover               │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  4. Audit Logger                              │   │
│  │     └── D1 + R2 for complete traceability     │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────┘
                      │ Masked, Compliant Request
                      ▼
              OpenAI / Anthropic / Google / DeepSeek / SiliconFlow
```

---

## Quick Start

```bash
# 1. Install
npm install @tokenrouter/sdk

# 2. Configure wrangler
wrangler d1 create tokenrouter
wrangler r2 bucket create enterprise-ontologies
wrangler kv:namespace create GRAPH_CACHE

# 3. Set secrets
wrangler secret put OPENAI_API_KEY
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put TR_API_KEY

# 4. Deploy
npm run deploy
```

### Or use the proxy directly

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.TR_API_KEY,
  baseURL: 'https://your-worker.workers.dev/v1'
});

// All requests are automatically:
// - PII masked
// - EU AI Act compliance checked
// - Audited
const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

---

## Documentation

- [Quick Start Guide](docs/QUICKSTART.md) — Get running in 5 minutes
- [API Reference](docs/API.md) — Complete endpoint documentation
- [Architecture Overview](docs/ARCHITECTURE.md) — How TokenRouter works
- [EU AI Act Compliance Guide](docs/COMPLIANCE.md) — Annex III deep dive
- [PII Masking Guide](docs/PRIVACY_API.md) — Semantic vs keyword masking
- [Migration Guide](docs/MIGRATION.md) — Migrate from LiteLLM/Portkey

---

## Examples

### PII Masking

```bash
curl -X POST https://your-worker.workers.dev/v1/mask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TR_API_KEY" \
  -d '{"text": "张总，身份证号110101199001011234，手机13812345678"}'

# Response:
# {
#   "original": "张总，身份证号110101199001011234，手机13812345678",
#   "masked": "【姓名】，身份证号【ID_NUMBER】，手机【PHONE】",
#   "entities": [
#     { "type": "NAME", "start": 0, "end": 2 },
#     { "type": "ID_NUMBER", "start": 5, "end": 19 },
#     { "type": "PHONE", "start": 22, "end": 33 }
#   ]
# }
```

### Compliance Check

```bash
curl -X POST https://your-worker.workers.dev/v1/compliance/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TR_API_KEY" \
  -d '{"text": "帮我评估这个贷款申请人的信用风险"}'

# Response:
# {
#   "isHighRisk": true,
#   "categories": ["CREDIT_SCORING", "RISK_ASSESSMENT"],
#   "requiresDisclosure": true,
#   "complianceSteps": [
#     "Provide explanation of AI decision to applicant",
#     "Enable human oversight mechanism",
#     "Log decision for audit purposes"
#   ]
# }
```

### Multi-Provider Routing

```typescript
// Automatically routes to the best available provider
// Falls back automatically if one provider is down
const response = await router.chat.completions.create({
  messages: [{ role: 'user', content: 'Hello!' }],
  // TokenRouter tries providers in order, falls back on failure
  providers: ['openai', 'anthropic', 'deepseek']
});
```

---

## Supported AI Providers

Only providers with configured API keys are activated.

| Provider | Default Model | Protocol |
|----------|---------------|----------|
| OpenAI | gpt-4o | OpenAI |
| Anthropic | claude-3-5-sonnet-latest | Anthropic |
| Google | gemini-2.0-flash | Google |
| DeepSeek | deepseek-chat | OpenAI-compatible |
| SiliconFlow | deepseek-ai/DeepSeek-V3 | OpenAI-compatible |

---

## Who's Using

> **Are you using TokenRouter?** [Open an issue](https://github.com/KudJason/tokenrouter/issues) and add your company to the list!

<!--
| Company | Use Case |
|---------|----------|
| [Your Company](https://yourcompany.com) | Description |
-->

---

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

```bash
# Fork the repo
# Create your feature branch
git checkout -b feature/amazing-feature

# Commit your changes
git commit -m 'Add amazing feature'

# Push to your branch
git push origin feature/amazing-feature

# Open a Pull Request
```

### Good First Issues

Looking for a way to contribute? Check out these issues:

- [ ] Add support for additional PII entity types
- [ ] Write integration guide for LangChain
- [ ] Add more compliance rule templates
- [ ] Improve error messages and debugging

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Links

- **[Live Demo](https://tokenrouter.workers.dev)** — Try it now
- **[GitHub Repository](https://github.com/KudJason/tokenrouter)** — Star and watch
- **[Discord Community](#)** — Join the discussion
- **[Issue Tracker](https://github.com/KudJason/tokenrouter/issues)** — Report bugs, request features
