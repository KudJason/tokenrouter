# TokenRouter 本地计算 + LLM 汇总架构

## 核心理念

**数据不出本地，LLM 只做汇总**

1. **本地计算** - 敏感数据在本地处理，不上传
2. **脱敏传输** - 传给 LLM 的只是中间结果
3. **小模型汇总** - 用 DeepSeek 做轻量级汇总

---

## 新 API: `/v1/privacy/compute`

### 请求

```json
POST /v1/privacy/compute
{
  "company_id": "jason",
  "task": "analyze_orders",
  "data": {
    "orders": [
      {"customer": "张三", "phone": "13812345678", "amount": 5000},
      {"customer": "李四", "phone": "13987654321", "amount": 8000}
    ]
  },
  "operations": ["filter_amount_above", "calculate_total", "group_by_customer"],
  "summarize": true
}
```

### 响应

```json
{
  "success": true,
  "computed": {
    "filtered_count": 2,
    "total_amount": 13000,
    "customers": [
      {"name": "[姓名]", "amount": 5000},
      {"name": "[姓名]", "amount": 8000}
    ]
  },
  "summary": "共2笔订单，总金额13000元。客户A消费5000元，客户B消费8000元。",
  "cost_usd": 0.00003
}
```

---

## 计算任务类型

### 1. 数据分析 (`analyze`)

```json
{
  "task": "analyze",
  "data": {
    "records": [
      {"name": "张三", "phone": "13812345678", "score": 85},
      {"name": "李四", "phone": "13987654321", "score": 92}
    ]
  },
  "operations": ["filter_score_above_80", "sort_by_score", "count"]
}
```

**本地计算结果**:
```json
{
  "filtered_count": 2,
  "sorted": [
    {"name": "李四", "score": 92},
    {"name": "张三", "score": 85}
  ]
}
```

**LLM 汇总**:
> "分析了2条记录，其中2条符合条件（分数>80）。按分数排序：李四(92分)、张三(85分)。"

---

### 2. 统计计算 (`statistics`)

```json
{
  "task": "statistics",
  "data": {
    "transactions": [
      {"id": "TX001", "amount": 5000, "date": "2024-01-15"},
      {"id": "TX002", "amount": 8000, "date": "2024-01-16"}
    ]
  },
  "operations": ["sum", "average", "max", "min", "count"]
}
```

**本地计算结果**:
```json
{
  "sum": 13000,
  "average": 6500,
  "max": 8000,
  "min": 5000,
  "count": 2
}
```

**LLM 汇总**:
> "共2笔交易，总金额13000元，平均6500元，最高8000元，最低5000元。"

---

### 3. 数据转换 (`transform`)

```json
{
  "task": "transform",
  "data": {
    "raw_data": "张三,13812345678,5000\n李四,13987654321,8000"
  },
  "format": "csv",
  "operations": ["parse", "mask_pii", "convert_to_json"]
}
```

---

### 4. 隐私查询 (`query`)

```json
{
  "task": "query",
  "data": {
    "customers": [
      {"name": "张三", "phone": "13812345678", "vip_level": "gold"},
      {"name": "李四", "phone": "13987654321", "vip_level": "silver"}
    ]
  },
  "query": "找出所有VIP客户"
}
```

**本地计算结果**:
```json
{
  "result": [
    {"name": "[姓名]", "vip_level": "gold"}
  ],
  "count": 1
}
```

**LLM 汇总**:
> "查询结果：共1位VIP客户。"

---

## 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      用户请求                              │
│  "统计客户张三和李四的消费总额"                             │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   本地计算引擎                              │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ 1. 解析用户数据 (张三 13812345678 消费5000元)        │ │
│  │ 2. 识别敏感字段 (手机号、姓名)                       │ │
│  │ 3. 本地计算 (5000 + 8000 = 13000)                   │ │
│  │ 4. 脱敏输出 (张三→[姓名], 138****5678)              │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              DeepSeek (本地 LLM 汇总)                      │
│  "2位客户消费总计13000元，平均6500元"                      │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
                    最终结果 (已脱敏)
```

---

## 实现方式

### 1. 本地计算函数 (Worker 内)

```typescript
// 本地计算 - 不需要 LLM
function localCompute(data: any, operations: string[]): ComputedResult {
  let result = { ...data };

  for (const op of operations) {
    switch (op) {
      case 'sum':
        result.sum = calculateSum(result.items);
        break;
      case 'count':
        result.count = result.items.length;
        break;
      case 'mask_pii':
        result.items = result.items.map(maskPII);
        break;
    }
  }

  return result;
}
```

### 2. 隐私级别

```typescript
enum PrivacyLevel {
  STRICT = 'strict',    // 完全脱敏: 13812345678 → [手机号]
  PARTIAL = 'partial',   // 部分脱敏: 13812345678 → 138****5678
  NONE = 'none'          // 不脱敏 (仅内部使用)
}
```

### 3. LLM 汇总提示词

```
你是一个数据分析助手。本地系统已经完成了数据计算，
你需要将结果用自然语言总结。

本地计算结果:
- 订单数: 2
- 总金额: 13000元
- 平均金额: 6500元
- 客户: [姓名]A, [姓名]B

请用简洁的语言总结，不需要重复原始数据。
```

---

## 与现有 API 的关系

| API | 用途 | LLM 参与 |
|-----|------|---------|
| `/v1/mask` | 脱敏工具 | 不需要 |
| `/v1/chat` | 标准对话 | 完全参与 |
| `/v1/privacy/compute` | 本地计算+汇总 | **最后参与** |

---

## 成本优势

| 方案 | Token 消耗 | 成本 | 隐私风险 |
|------|-----------|------|---------|
| 全部 LLM | 10,000 | $0.10 | 高 |
| 本地计算 + LLM 汇总 | 50 | $0.0005 | 低 |

**成本降低 99.5%**
