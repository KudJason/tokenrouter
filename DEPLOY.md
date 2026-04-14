# TokenRouter MVP - 部署指南

## 前置要求

### 1. 配置 Cloudflare API Token

访问 [https://dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) 创建 API Token：

```
Account: Worthwolf
Permission: Account:All, Zone:All
```

然后设置环境变量：

```bash
export CLOUDFLARE_API_TOKEN="your_token_here"
```

---

## 第一步：创建云资源

### 创建 D1 数据库

```bash
cd /Users/jasonjia/Documents/Robotics/AI安全/TokenRouterMVP

# 创建 D1 数据库
npx wrangler d1 create tokenrouter
```

输出示例：

```
┌──────────────────────────────────────┐
│ uuid                                 │
├──────────────────────────────────────┤
│ xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx │
└──────────────────────────────────────┘
```

将返回的 `uuid` 填入 `wrangler.jsonc` 中的 `${D1_DATABASE_ID}`

### 创建 R2 Buckets

```bash
# 创建 ontology bucket
npx wrangler r2 bucket create enterprise-ontologies

# 创建 archive bucket
npx wrangler r2 bucket create tokenrouter-archive
```

### 创建 KV Namespaces

```bash
# 创建 graph cache namespace
npx wrangler kv namespace create GRAPH_CACHE

# 创建 sessions namespace
npx wrangler kv namespace create SESSIONS
```

将返回的 `id` 填入 `wrangler.jsonc` 中的 `${KV_GRAPH_CACHE_ID}` 和 `${KV_SESSIONS_ID}`

---

## 第二步：初始化数据库 Schema

```bash
cd /Users/jasonjia/Documents/Robotics/AI安全/TokenRouterMVP

# 应用 migrations
npx wrangler d1 migrations apply tokenrouter --remote
```

---

## 第三步：配置 API Keys (Secrets)

```bash
cd /Users/jasonjia/Documents/Robotics/AI安全/TokenRouterMVP

# 设置 AI Provider API Keys（可选，只激活你配置了的）
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put GOOGLE_API_KEY
npx wrangler secret put DEEPSEEK_API_KEY
npx wrangler secret put SILICONFLOW_API_KEY
```

---

## 第四步：部署

```bash
cd /Users/jasonjia/Documents/Robotics/AI安全/TokenRouterMVP

# 部署到 Cloudflare Workers
npx wrangler deploy
```

---

## 验证部署

```bash
# 健康检查
curl https://token.route.worthwolf.top/health

# 查看可用 providers
curl https://token.route.worthwolf.top/v1/providers

# 测试 PII 脱敏
curl -X POST https://token.route.worthwolf.top/api/pii/mask \
  -H "Content-Type: application/json" \
  -d '{"text":"张三的手机号是13800138000"}'

# 测试 OpenAI 协议调用 (DeepSeek)
curl -X POST https://token.route.worthwolf.top/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-key" \
  -d '{"model":"deepseek","messages":[{"role":"user","content":"Hello"}]}'

# 测试 Anthropic 协议调用 (SiliconFlow)
curl -X POST https://token.route.worthwolf.top/v1/anthropic/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-key" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"siliconflow","messages":[{"role":"user","content":"Hello"}]}'
```

---

## 自定义域名配置

`wrangler.jsonc` 中已配置路由：

```jsonc
"routes": [
  {
    "pattern": "token.route.worthwolf.top",
    "zone_name": "worthwolf.top"
  }
]
```

部署后访问：[https://token.route.worthwolf.top](https://token.route.worthwolf.top)

---

## 快速部署脚本

```bash
# 一键部署（确保已配置好所有资源）
chmod +x deploy.sh
./deploy.sh
```

