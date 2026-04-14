# TokenRouter API 测试场景

## 基本信息

- **API Base URL**: [https://token.route.worthwolf.top](https://token.route.worthwolf.top)
- **API Key**: `tr_ulffeAACHMhNpwcjwpDnspYOlXrJb3os`

---

## 1. PII 脱敏测试

### 1.1 中文 PII

```bash
# 测试中文手机号
curl -s -X POST https://token.route.worthwolf.top/v1/mask \
  -H "Content-Type: application/json" \
  -H "X-API-Key: tr_ulffeAACHMhNpwcjwpDnspYOlXrJb3os" \
  -d '{
    "text": "李四的手机号是13812345678，身份证号是110101199001011234",
    "company_id": "jason"
  }'

# 测试中文姓名 + 手机号
curl -s -X POST https://token.route.worthwolf.top/v1/mask \
  -H "Content-Type: application/json" \
  -H "X-API-Key: tr_ulffeAACHMhNpwcjwpDnspYOlXrJb3os" \
  -d '{
    "text": "张伟的手机号是13987654321，邮箱是zhangwei@company.cn",
    "company_id": "jason"
  }'
```

### 1.2 英文 PII

```bash
# 测试邮箱 + 电话
curl -s -X POST https://token.route.worthwolf.top/v1/mask \
  -H "Content-Type: application/json" \
  -H "X-API-Key: tr_ulffeAACHMhNpwcjwpDnspYOlXrJb3os" \
  -d '{
    "text": "Contact: john.doe@email.com, Phone: +1-555-123-4567",
    "company_id": "jason"
  }'

# 测试信用卡 + SSN
curl -s -X POST https://token.route.worthwolf.top/v1/mask \
  -H "Content-Type: application/json" \
  -H "X-API-Key: tr_ulffeAACHMhNpwcjwpDnspYOlXrJb3os" \
  -d '{
    "text": "Card: 4532-1234-5678-9012, SSN: 123-45-6789",
    "company_id": "jason"
  }'

# 测试护照 + 地址
curl -s -X POST https://token.route.worthwolf.top/v1/mask \
  -H "Content-Type: application/json" \
  -H "X-API-Key: tr_ulffeAACHMhNpwcjwpDnspYOlXrJb3os" \
  -d '{
    "text": "Passport: A12345678, Address: 123 Main St, New York, NY 10001",
    "company_id": "jason"
  }'
```

---

## 2. 公司敏感信息脱敏测试

首先需要上传企业本体（Ontology）。TTL 格式说明：

- `ex:xxx` 定义实体ID
- `ex:projectname`, `ex:suppliername` 等定义属性
- 支持的属性类型: `projectname`, `suppliername`, `hasBudget`, `hasAmount`, `hasContractValue`

```bash
# 上传企业本体（正确格式）
curl -s -X PUT https://token.route.worthwolf.top/v1/ontology/jason \
  -H "Content-Type: text/turtle" \
  -H "X-API-Key: tr_ulffeAACHMhNpwcjwpDnspYOlXrJb3os" \
  --data-raw '@prefix ex: <http://example.org/> .
ex:ProjectAlpha ex:projectname "Project Alpha" .
ex:ProjectAlpha ex:hasBudget "5000000" .
ex:SupplierXYZ ex:suppliername "SupplierXYZ Ltd" .
ex:Budget2024 ex:hasAmount "15000000" .'

# 测试公司信息脱敏
curl -s -X POST https://token.route.worthwolf.top/v1/mask/enterprise \
  -H "Content-Type: application/json" \
  -H "X-API-Key: tr_ulffeAACHMhNpwcjwpDnspYOlXrJb3os" \
  -d '{
    "text": "我们的Project Alpha预算5000000元，供应商是SupplierXYZ Ltd",
    "company_id": "jason"
  }'
# 预期结果: "我们的[PROJECT]预算[PROJECT]元，供应商是[SUPPLIER]"
```

---

## 3. LLM 对话测试

### 3.1 基础对话

```bash
# 简单问候
curl -s -X POST https://token.route.worthwolf.top/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: tr_ulffeAACHMhNpwcjwpDnspYOlXrJb3os" \
  -d '{
    "messages": [
      {"role": "user", "content": "你好，请介绍一下你自己"}
    ],
    "company_id": "jason"
  }'

# 技术问答
curl -s -X POST https://token.route.worthwolf.top/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: tr_ulffeAACHMhNpwcjwpDnspYOlXrJb3os" \
  -d '{
    "messages": [
      {"role": "user", "content": "什么是RESTful API？"}
    ],
    "company_id": "jason"
  }'
```

### 3.2 带系统提示

```bash
# 法律顾问角色
curl -s -X POST https://token.route.worthwolf.top/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: tr_ulffeAACHMhNpwcjwpDnspYOlXrJb3os" \
  -d '{
    "messages": [
      {"role": "system", "content": "你是一个专业的法律顾问，请用简洁的语言回答问题"},
      {"role": "user", "content": "劳动合同可以口头约定吗？"}
    ],
    "company_id": "jason"
  }'
```

### 3.3 多轮对话

```bash
# 多轮对话
curl -s -X POST https://token.route.worthwolf.top/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: tr_ulffeAACHMhNpwcjwpDnspYOlXrJb3os" \
  -d '{
    "messages": [
      {"role": "user", "content": "我想开发一个电商网站"},
      {"role": "assistant", "content": "好的！请问您需要什么类型的电商网站？B2C、B2B还是C2C？"},
      {"role": "user", "content": "B2C，主要是移动端"}
    ],
    "company_id": "jason"
  }'
```

---

## 4. 合规检查测试

```bash
# 测试 AI 用例合规检查
curl -s -X POST https://token.route.worthwolf.top/v1/compliance/check \
  -H "Content-Type: application/json" \
  -H "X-API-Key: tr_ulffeAACHMhNpwcjwpDnspYOlXrJb3os" \
  -d '{
    "use_case": "简历筛选系统",
    "description": "使用AI自动筛选求职者的简历，根据学历、工作经验等条件进行排序",
    "company_id": "jason"
  }'

# 测试高风险场景
curl -s -X POST https://token.route.worthwolf.top/v1/compliance/check \
  -H "Content-Type: application/json" \
  -H "X-API-Key: tr_ulffeAACHMhNpwcjwpDnspYOlXrJb3os" \
  -d '{
    "use_case": "信用评分系统",
    "description": "使用AI对用户的信用进行评分，决定是否批准贷款申请",
    "company_id": "jason"
  }'
```

---

## 5. 组合测试（脱敏 + LLM）

```bash
# 先脱敏再发送 LLM
curl -s -X POST https://token.route.worthwolf.top/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: tr_ulffeAACHMhNpwcjwpDnspYOlXrJb3os" \
  -d '{
    "messages": [
      {"role": "user", "content": "请总结这篇文档的要点：用户张三，手机号13812345678，邮箱zhangsan@company.com，住在北京市朝阳区建国路88号。"}
    ],
    "company_id": "jason",
    "mask_pii": true
  }'
```

---

## 6. 查看用量统计

```bash
# 登录获取 token
TOKEN=$(curl -s -X POST https://token.route.worthwolf.top/v1/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"jason","password":"TokenRouter2026!"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# 查看用量
curl -s -X GET "https://token.route.worthwolf.top/v1/admin/usage?company_id=jason" \
  -H "Authorization: Bearer $TOKEN"

# 查看审计日志
curl -s -X GET "https://token.route.worthwolf.top/v1/admin/audit?company_id=jason&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 测试检查清单

- 中文 PII 脱敏
- 英文 PII 脱敏
- 企业本体上传
- 企业信息脱敏
- LLM 对话
- 多轮对话
- 合规检查
- 用量统计显示
- 审计日志记录

