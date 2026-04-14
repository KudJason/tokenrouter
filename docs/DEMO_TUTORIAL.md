# TokenRouter Demo Tutorial

**TokenRouter** provides AI infrastructure for enterprise automation with privacy-first processing, PII masking, and cost-optimized AI routing.

## Quick Start

### 1. Get Your API Key

Contact `jason.jia@thirdhour.eu` to receive your demo API key.

### 2. Test Your Setup

```bash
curl -X POST https://token.route.worthwolf.top/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"messages":[{"role":"user","content":"Hello!"}]}'
```

---

## API Reference

### 1. AI Chat with Routing

Route requests to optimal AI providers with automatic fallback.

**Endpoint:** `POST /v1/chat/completions`

**Headers:**

- `Authorization: Bearer YOUR_API_KEY`
- `Content-Type: application/json`

**Request Body:**

```json
{
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What is 2+2?"}
  ],
  "model": "deepseek-chat",
  "provider": "deepseek",
  "temperature": 0.7
}
```

**Response:**

```json
{
  "id": "abc123",
  "provider": "deepseek",
  "model": "deepseek-chat",
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "2+2 equals 4."
    }
  }],
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 8,
    "total_tokens": 23,
    "cost_usd": 0.0000023
  }
}
```

**Example with cURL:**

```bash
curl -X POST https://token.route.worthwolf.top/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer tr_ZMvIeDLLzeJQrCwuA8K0UIGbISZZBCJK" \
  -d '{
    "messages": [{"role": "user", "content": "What is machine learning?"}],
    "provider": "deepseek"
  }'
```

---

### 2. PII Masking

Automatically detect and mask Personally Identifiable Information (PII).

**Endpoint:** `POST /v1/mask`

**Request Body:**

```json
{
  "text": "Contact: Zhang Wei, Phone: 13812345678, Email: zhang@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "original": "Contact: Zhang Wei, Phone: 13812345678, Email: zhang@example.com",
  "masked": "Contact: Zhang Wei, Phone: [手机号], Email: [邮箱]",
  "detected": [
    {"type": "PHONE_CN", "value": "13812345678", "confidence": 0.95},
    {"type": "EMAIL", "value": "zhang@example.com", "confidence": 0.95}
  ],
  "processing_time_ms": 2
}
```

**Example with cURL:**

```bash
curl -X POST https://token.route.worthwolf.top/v1/mask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer tr_ZMvIeDLLzeJQrCwuA8K0UIGbISZZBCJK" \
  -d '{"text": "李先生电话13812345678，邮箱li@example.com"}'
```

**Supported PII Types:**


| Type       | Description     | Example                                     |
| ---------- | --------------- | ------------------------------------------- |
| PHONE_CN   | Chinese phone   | 13812345678                                 |
| EMAIL      | Email address   | [user@example.com](mailto:user@example.com) |
| ID_CARD_CN | Chinese ID card | 110101199001011234                          |
| SSN_CN     | Chinese SSN     | 110101199001011234                          |
| BANK_CARD  | Bank card       | 6222021234567890                            |
| PERSON     | Person name     | 张三                                          |


---

### 3. Privacy Compute

Perform local computations on sensitive data without sending it to AI providers. This is **free** and keeps your data private.

**Endpoint:** `POST /v1/privacy/compute`

**Request Body:**

```json
{
  "task": "Calculate sales statistics",
  "data": {
    "sales": [
      {"product": "iPhone", "amount": 5999},
      {"product": "MacBook", "amount": 12999},
      {"product": "AirPods", "amount": 1499}
    ]
  },
  "operations": ["count", "sum", "average"],
  "privacy_level": "strict"
}
```

**Response:**

```json
{
  "success": true,
  "computed": {
    "count": 3,
    "sum": 20497,
    "average": 6832.33
  },
  "cost_usd": 0,
  "processing_time_ms": 45,
  "sensitivity_report": {
    "total_pii_count": 0,
    "sensitivity_level": "none"
  }
}
```

**Available Operations:**


| Operation  | Description                         |
| ---------- | ----------------------------------- |
| `count`    | Count number of records             |
| `sum`      | Sum numeric field values            |
| `average`  | Calculate average of numeric values |
| `mask_pii` | Mask PII in the data                |


**Example with cURL:**

```bash
curl -X POST https://token.route.worthwolf.top/v1/privacy/compute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer tr_ZMvIeDLLzeJQrCwuA8K0UIGbISZZBCJK" \
  -d '{
    "task": "Employee salary statistics",
    "data": {
      "employees": [
        {"name": "Zhang Wei", "salary": 15000},
        {"name": "Li Si", "salary": 18000},
        {"name": "Wang Wu", "salary": 22000}
      ]
    },
    "operations": ["count", "sum", "average"]
  }'
```

---

### 4. Get Available Providers

Check which AI providers are currently available.

**Endpoint:** `GET /v1/providers`

**Response:**

```json
{
  "available_providers": ["deepseek", "siliconflow"]
}
```

---

## Code Examples

### Python

```python
import requests

API_KEY = "YOUR_API_KEY"
BASE_URL = "https://token.route.worthwolf.top"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Chat API
def chat(message):
    response = requests.post(
        f"{BASE_URL}/v1/chat/completions",
        headers=headers,
        json={
            "messages": [{"role": "user", "content": message}],
            "provider": "deepseek"
        }
    )
    return response.json()

# PII Masking
def mask_pii(text):
    response = requests.post(
        f"{BASE_URL}/v1/mask",
        headers=headers,
        json={"text": text}
    )
    return response.json()

# Privacy Compute
def compute_stats(data):
    response = requests.post(
        f"{BASE_URL}/v1/privacy/compute",
        headers=headers,
        json={
            "task": "Calculate statistics",
            "data": data,
            "operations": ["count", "sum", "average"]
        }
    )
    return response.json()

# Usage
print(chat("Hello!"))
print(mask_pii("Contact: John, phone 13812345678"))
print(compute_stats({"sales": [{"amount": 100}, {"amount": 200}]}))
```

### JavaScript / Node.js

```javascript
const API_KEY = 'YOUR_API_KEY';
const BASE_URL = 'https://token.route.worthwolf.top';

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json'
};

// Chat API
async function chat(message) {
  const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      messages: [{ role: 'user', content: message }],
      provider: 'deepseek'
    })
  });
  return response.json();
}

// PII Masking
async function maskPII(text) {
  const response = await fetch(`${BASE_URL}/v1/mask`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text })
  });
  return response.json();
}

// Privacy Compute
async function computeStats(data) {
  const response = await fetch(`${BASE_URL}/v1/privacy/compute`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      task: 'Calculate statistics',
      data,
      operations: ['count', 'sum', 'average']
    })
  });
  return response.json();
}

// Usage
console.log(await chat('Hello!'));
console.log(await maskPII('Contact: John, phone 13812345678'));
```

### OpenAI SDK Compatible

```python
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_API_KEY",
    base_url="https://token.route.worthwolf.top/v1"
)

# Works with OpenAI SDK!
response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[{"role": "user", "content": "Hello!"}]
)

print(response.choices[0].message.content)
```

---

## Use Cases

### 1. Customer Service Automation

Mask customer PII before processing with AI:

```bash
curl -X POST https://token.route.worthwolf.top/v1/mask \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"text": "Customer Chen Wei, phone 13912345678, email chen@example.com needs help"}'
```

### 2. Financial Report Analysis

Calculate statistics without exposing sensitive data:

```bash
curl -X POST https://token.route.worthwolf.top/v1/privacy/compute \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "task": "Q4 Sales Report",
    "data": {
      "orders": [
        {"region": "Beijing", "revenue": 500000},
        {"region": "Shanghai", "revenue": 750000},
        {"region": "Shenzhen", "revenue": 600000}
      ]
    },
    "operations": ["sum", "average"]
  }'
```

### 3. HR Data Analysis

Analyze salary data privately:

```bash
curl -X POST https://token.route.worthwolf.top/v1/privacy/compute \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "task": "Salary distribution",
    "data": {
      "employees": [
        {"name": "Zhang", "salary": 15000, "dept": "Engineering"},
        {"name": "Li", "salary": 18000, "dept": "Sales"},
        {"name": "Wang", "salary": 22000, "dept": "Engineering"}
      ]
    },
    "operations": ["count", "sum", "average", "mask_pii"]
  }'
```

---

## Pricing


| Feature                   | Price                        |
| ------------------------- | ---------------------------- |
| AI Chat (via DeepSeek)    | $0.0001 / 1K tokens          |
| AI Chat (via SiliconFlow) | $0.001 / 1K tokens           |
| PII Masking               | Free                         |
| Privacy Compute           | **Free** (local computation) |


**100,000 free tokens** available for testing.

---

## Troubleshooting

### "Invalid API key"

- Check your API key is correct
- Ensure `Authorization: Bearer YOUR_KEY` header is set

### "Provider not available"

- The requested provider may not have API key configured
- Try using a different provider

### "Rate limit exceeded"

- Reduce request frequency
- Contact us for higher limits

---

## Support

- **Email:** [jason.jia@thirdhour.eu](mailto:jason.jia@thirdhour.eu)
- **Dashboard:** [https://token.route.worthwolf.top/admin](https://token.route.worthwolf.top/admin)
- **Documentation:** [https://token.route.worthwolf.top](https://token.route.worthwolf.top)

