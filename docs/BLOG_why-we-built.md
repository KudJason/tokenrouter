# Why We Built TokenRouter: AI Compliance Without the Pain

*April 2026*

---

## The Problem Nobody Talks About

Every developer building with LLMs knows the drill. You want to add AI to your product. You wire up the OpenAI SDK. Maybe Anthropic for variety. Soon you're juggling multiple providers, different API formats, scattered logs, and a growing sense of dread about GDPR.

Because here's the thing nobody tells you: **every time your user sends a message to your AI endpoint, you might be violating GDPR.**

That message might contain:
- A customer's name and phone number
- An employee's ID number
- Part numbers that are trade secrets
- Medical information subject to HIPAA
- Financial data regulated by GDPR Article 9

And you're sending all of that to servers in the US.

## The Naive Solution (That Everyone Tries First)

```typescript
// "We'll just filter the obvious stuff"
function maskPII(text: string): string {
    return text
        .replace(/\d{11}/g, '[PHONE]')
        .replace(/\d{17}[\dXx]/g, '[ID]');
}

// Later...
const maskedInput = maskPII(userMessage);
const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: maskedInput }]
});
```

This works until it doesn't. What about:
- "张三的贷款申请需要特批" — names that look like normal text
- "患者李明，入院号A12345，在5号病房" — context reveals sensitive data
- "供应商Acme Corp，合同号€500,000" — company secrets hidden in plain sight

**Keyword filtering catches nothing.** You need semantic understanding.

## The Enterprise Solution (That Nobody Can Afford)

The real solutions are either:

| Solution | Cost | Problem |
|----------|------|---------|
| Microsoft Copilot | €10,000+/month | Way too expensive for SMBs |
| IBM Watson | €100,000+/year | 6-month implementation |
| Build your own | €500K-2M | 6-12 months of work |

These work for enterprises. They don't work for the 99% of companies building with AI.

## EU AI Act: The Ticking Clock

And then there's the EU AI Act.

Starting August 2025, high-risk AI systems have compliance obligations. Starting August 2026, violations can cost **€30 million or 6% of global revenue**.

If you're using AI to:
- Score credit
- Assess insurance risk
- Evaluate job candidates
- Make medical decisions
- Provide legal advice

You need to:
1. Classify your AI system against Annex III
2. Provide explanations for AI decisions
3. Maintain audit logs
4. Enable human oversight

And document all of this. In a way regulators will accept.

**The average developer has no idea where to start.**

## So We Built TokenRouter

We wanted something that:
1. **Just works** — deploy to edge in minutes, not months
2. **Handles PII automatically** — semantic NLP, not regex
3. **Checks EU AI Act compliance** — real-time Annex III validation
4. **Logs everything** — complete audit trail built-in
5. **Doesn't cost a fortune** — MIT open source, self-hostable

Here's what it looks like:

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
    apiKey: process.env.TR_API_KEY,
    baseURL: 'https://your-worker.workers.dev/v1'
});

// That's it. Everything else is automatic:
// - PII detected and masked before hitting OpenAI
// - EU AI Act Annex III categories checked
// - Complete audit log created
// - Multi-provider fallback if one is down
const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Analyze this loan application...' }]
});
```

## What We Learned Building This

### 1. PII detection is harder than it looks

Keywords don't work. Even with entity extraction, context matters. "特批" (special approval) in a loan context signals financial data. A general entity detector misses this.

We built a semantic layer that understands context. It won't catch everything, but it catches orders of magnitude more than regex.

### 2. EU AI Act compliance is a process, not a checkbox

There's no magic "compliant" flag. Annex III lists high-risk categories. Your use of AI might fall into multiple categories. Each has different requirements.

We built a decision engine that helps you understand which categories apply and what documentation you need.

### 3. Edge deployment changes everything

Traditional web services have latency penalties for compliance. Every compliance check adds milliseconds. Users notice.

Cloudflare Workers run at the edge, 20ms from most users. Compliance checks add negligible latency. Our average PII masking + compliance check is under 5ms.

## What's Next

TokenRouter is MIT licensed. We want every European SMB to be able to use AI without worrying about compliance.

We're actively working on:
- More PII entity types
- Better compliance rule templates for common industries
- Integration guides for LangChain, CrewAI, AutoGen
- Industry-specific compliance packs (healthcare, finance, legal)

## Try It

Deploy your own instance in under 5 minutes:

```bash
git clone https://github.com/KudJason/tokenrouter.git
cd tokenrouter
npm install
npm run deploy
```

Or [try the live demo](https://tokenrouter.workers.dev).

Questions? [Open an issue](https://github.com/KudJason/tokenrouter/issues). We're responsive.

---

*Jason*
*Founder, TokenRouter*
