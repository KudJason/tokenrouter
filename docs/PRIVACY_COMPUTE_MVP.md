# MVP: TTL Schema 元数据驱动

## 架构

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  TTL Schema │     │ Privacy Compute  │     │  Privacy Report │
│  (R2)      │────>│ API             │────>│ D1             │
│  company_id │     │                  │     │                │
└─────────────┘     └──────────────────┘     └─────────────────┘
```

## TTL Schema 格式

```turtle
@prefix tr: <http://tokenrouter.org/schema/>
@prefix ex: <http://example.org/>

ex:Schema a tr:Schema ;
  tr:version "1.0" ;
  tr:fields [
    tr:name "name" ;
    tr:type "string" ;
    tr:sensitive true ;
    tr:piiType "person"
  ], [
    tr:name "phone" ;
    tr:type "string" ;
    tr:sensitive true ;
    tr:piiType "phone"
  ], [
    tr:name "amount" ;
    tr:type "number" ;
    tr:sensitive false
  ] .
```

## API 请求格式

```json
POST /v1/privacy/compute
{
  "company_id": "mycompany",
  "task": "statistics",
  "data": {
    "name": "张三",
    "phone": "13812345678",
    "amount": 5000
  },
  "operations": ["sum", "count"]
}
```

## 处理流程

1. 获取 `company_id` 对应的 TTL Schema（从 R2 cache 或直接获取）
2. 解析 Schema，构建字段敏感度映射
3. 根据 Schema 对 `data` 进行 PII 脱敏
4. 执行本地计算
5. 保存隐私报告到 D1

## 文件变更

| 文件 | 变更 |
|-----|------|
| `src/lib/ttl-schema.ts` | 新建 - 解析 TTL Schema，构建字段映射 |
| `src/workers/privacy-compute.ts` | 集成 Schema 获取和应用 |
| `src/lib/r2.ts` | 添加 `getSchema(companyId)` 方法 |

## 关键代码

```typescript
// ttl-schema.ts
interface FieldSchema {
  name: string;
  type: string;
  sensitive: boolean;
  piiType?: 'phone' | 'person' | 'email' | 'id_card';
}

interface Schema {
  version: string;
  fields: FieldSchema[];
}

function parseSchema(ttlContent: string): Schema {
  // 解析 TTL，返回字段定义
}
```

---

## MVP 范围

- TTL Schema 定义字段敏感属性
- Privacy Compute 根据 Schema 脱敏和计算
- 不做复杂查询逻辑
