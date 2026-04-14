# Migration Guide

Switching from LiteLLM, Portkey, or building your own solution? Here's how.

## From LiteLLM

### What Changes

**Before (LiteLLM):**
```python
import litellm

# LiteLLM handles multi-provider routing
response = litellm.completion(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}],
    api_key=os.getenv("OPENAI_API_KEY")
)

# But PII? You need a separate library like Microsoft Presidio
# And compliance checks? You're on your own
```

**After (TokenRouter):**
```typescript
import OpenAI from 'openai';

const client = new OpenAI({
    apiKey: process.env.TR_API_KEY,
    baseURL: 'https://your-worker.workers.dev/v1'
});

// Same call, but now you get:
// - Automatic PII masking
// - EU AI Act compliance checking
// - Complete audit logging
const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Hello!' }]
});
```

### Key Differences

| Feature | LiteLLM | TokenRouter |
|---------|---------|------------|
| PII Masking | Via Presidio (separate) | Built-in, semantic NLP |
| EU AI Act | Manual | Real-time Annex III checks |
| Audit Logging | Via Helicone (separate) | Built-in |
| Deployment | Self-hosted or cloud | Edge-native (Cloudflare) |
| License | Custom | MIT |

### Migration Steps

1. Deploy TokenRouter following the [Quick Start Guide](QUICKSTART.md)
2. Update your base URL:
   ```typescript
   // Old
   baseURL: 'https://api.litellm.com'

   // New
   baseURL: 'https://your-tokenrouter.workers.dev/v1'
   ```
3. Remove LiteLLM dependencies
4. Test your flows — PII masking and compliance checks happen automatically

## From Portkey

### What Changes

**Before (Portkey):**
```typescript
import Portkey from 'portkey-ai';

const client = new Portkey({
    apiKey: process.env.PORTKEY_API_KEY,
    baseURL: 'https://api.portkey.ai/v1'
});
```

**After (TokenRouter):**
```typescript
import OpenAI from 'openai';

const client = new OpenAI({
    apiKey: process.env.TR_API_KEY,
    baseURL: 'https://your-tokenrouter.workers.dev/v1'
});
```

### Key Differences

| Feature | Portkey | TokenRouter |
|---------|---------|------------|
| License | Custom | MIT (fully open source) |
| PII Masking | Via Presidio integration | Built-in, semantic NLP |
| EU AI Act | Generic compliance | Annex III specific |
| Deployment | SaaS only | Self-hostable (Cloudflare) |
| Pricing | Usage-based, enterprise | Free for self-host |

### Migration Steps

1. Deploy TokenRouter
2. Update base URL
3. Replace `PORTKEY_API_KEY` with `TR_API_KEY`
4. Configure your AI provider API keys in TokenRouter secrets

## From Building Your Own

You were doing compliance manually? Stop.

**Before:**
```typescript
// You probably had something like this:
async function maskPII(text: string): Promise<string> {
    // Hand-coded regex for phone numbers, IDs, etc.
    // Brittle. Misses things. Constantly breaking.
    return text
        .replace(/\d{11}/g, '[PHONE]')
        .replace(/\d{17}[\dXx]/g, '[ID]');
}

async function checkCompliance(text: string): Promise<ComplianceResult> {
    // Manual compliance logic
    // Hard to maintain as regulations change
    return { isCompliant: true };
}

async function callLLM(messages: Message[]): Promise<Response> {
    const maskedMessages = messages.map(m => ({
        ...m,
        content: await maskPII(m.content)
    }));
    await checkCompliance(maskedMessages);
    // Then call provider...
}
```

**After:**
```typescript
import TokenRouter from '@tokenrouter/sdk';

const router = new TokenRouter({ apiKey: process.env.TR_API_KEY });

// Everything handled. Middleware does it all.
// You focus on your application logic.
const response = await router.chat.completions.create({
    model: 'gpt-4o',
    messages
});
```

### Benefits of Switching

- **Less code** — Remove thousands of lines of compliance boilerplate
- **Better coverage** — Semantic NLP catches what regex misses
- **Stay current** — TokenRouter updates with EU AI Act changes
- **Audit trail** — Built-in logging you don't have to maintain

## Getting Help

- [Open an issue](https://github.com/KudJason/tokenrouter/issues) with your specific migration question
- [Join our Discord](#) to chat with the community
