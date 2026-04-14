// Test Data for TokenRouter MVP

/**
 * PII Test Cases - Multilingual
 */
export const piiTestCases = [
  // Chinese PII
  {
    name: 'Chinese ID Card',
    input: '张三的身份证号是110101199001011234，手机13812345678',
    expected: {
      types: ['PERSON', 'ID_CARD', 'PHONE'],
      maskedContains: ['[姓名]', '[身份证号]', '[手机号]']
    }
  },
  {
    name: 'Chinese Email',
    input: '请联系王经理，邮箱是wang.manager@company.cn',
    expected: {
      types: ['PERSON', 'EMAIL'],
      maskedContains: ['[姓名]', '[邮箱]']
    }
  },
  // European PII
  {
    name: 'German ID',
    input: 'Herr Mueller hat Personalausweis L1234567',
    expected: {
      types: ['PERSON'],
      maskedContains: ['[姓名]']
    }
  },
  {
    name: 'French SSN',
    input: 'Le numéro de sécurité sociale est 1 89 12 45 123456',
    expected: {
      types: ['SSN'],
      maskedContains: ['[社保号]']
    }
  },
  {
    name: 'Spanish DNI',
    input: 'El DNI de Maria Garcia es 12345678A',
    expected: {
      types: ['PERSON', 'ID_CARD'],
      maskedContains: ['[姓名]', '[身份证号]']
    }
  },
  {
    name: 'US SSN',
    input: 'Employee SSN: 123-45-6789',
    expected: {
      types: ['SSN'],
      maskedContains: ['[社保号]']
    }
  },
  {
    name: 'Credit Card',
    input: 'Payment card: 4532015112830366',
    expected: {
      types: ['BANK_CARD'],
      maskedContains: ['[银行卡号]']
    }
  },
  // Mixed content
  {
    name: 'Multilingual Contact',
    input: 'Contact: Dr. Hans Schmidt (+49 30 1234 5678), email hans@company.de',
    expected: {
      types: ['PERSON', 'PHONE', 'EMAIL'],
      maskedContains: ['[姓名]', '[手机号]', '[邮箱]']
    }
  }
];

/**
 * Enterprise Masking Test Cases
 */
export const enterpriseTestCases = [
  {
    name: 'Budget Detection',
    input: 'Project Alpha预算为€2,000,000，供应商是Acme Corp',
    companyId: 'test_company',
    expected: {
      types: ['PROJECT', 'BUDGET', 'SUPPLIER']
    }
  },
  {
    name: 'Contract Detection',
    input: '合同编号CTR-2024-001，价值$500,000',
    companyId: 'test_company',
    expected: {
      types: ['CONTRACT']
    }
  },
  {
    name: 'Internal Person',
    input: '项目经理李明负责这个项目',
    companyId: 'test_company',
    expected: {
      types: ['INTERNAL_PERSON']
    }
  }
];

/**
 * Compliance Test Cases
 */
export const complianceTestCases = [
  {
    name: 'Credit Assessment',
    input: '评估贷款申请人张飞的信用风险，申请额度50万元',
    expected: {
      riskLevel: 'high',
      categories: ['credit']
    }
  },
  {
    name: 'Biometric',
    input: '人脸识别系统需要采集员工指纹数据',
    expected: {
      riskLevel: 'high',
      categories: ['biometric']
    }
  },
  {
    name: 'Healthcare',
    input: 'AI辅助诊断系统帮助医生分析CT影像',
    expected: {
      riskLevel: 'high',
      categories: ['healthcare']
    }
  },
  {
    name: 'Education',
    input: '学生成绩评估系统自动评分',
    expected: {
      riskLevel: 'high',
      categories: ['education']
    }
  },
  {
    name: 'Low Risk',
    input: '天气查询API返回明日气温',
    expected: {
      riskLevel: 'low',
      categories: []
    }
  }
];

/**
 * TTL Ontology Samples
 */
export const ttlSamples = {
  basic: `
@prefix tr: <http://tokenrouter.ai/enterprise#> .

tr:Supplier_001 a tr:Supplier ;
    tr:supplierName "Acme Corp"@en ;
    tr:contractValue "€500,000" .

tr:Project_001 a tr:Project ;
    tr:projectName "Project Alpha"@en ;
    tr:budget "€2,000,000" ;
    tr:projectManager "李明"@zh .
`,
  multilingual: `
@prefix tr: <http://tokenrouter.ai/enterprise#> .

tr:Supplier_DE a tr:Supplier ;
    tr:supplierName "Siemens AG"@de ;
    tr:supplierName "西门子"@zh .

tr:Project_EU a tr:Project ;
    tr:projectName "European Expansion"@en ;
    tr:budget "€5,000,000" .

tr:Contract_001 a tr:Contract ;
    tr:contractId "CTR-2024-001" ;
    tr:contractValue "$1,200,000" .

tr:Manager_001 a tr:InternalPerson ;
    tr:personName "Hans Mueller"@de ;
    tr:personName "汉斯·穆勒"@zh .
`
};

/**
 * AI Chat Test Cases
 */
export const chatTestCases = [
  {
    name: 'Simple Chat',
    provider: 'deepseek',
    model: 'deepseek-chat',
    messages: [
      { role: 'user', content: 'Hello, how are you?' }
    ],
    expected: {
      success: true,
      hasContent: true
    }
  },
  {
    name: 'System Prompt',
    provider: 'siliconflow',
    model: 'deepseek-ai/DeepSeek-V3',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'What is 2+2?' }
    ],
    expected: {
      success: true,
      hasContent: true
    }
  }
];

/**
 * API Key Test Cases
 */
export const apiKeyTestCases = [
  {
    name: 'Valid API Key',
    key: 'tr_test_key_123456789',
    expected: {
      valid: true,
      hasCompanyId: true
    }
  },
  {
    name: 'Invalid API Key',
    key: 'invalid_key_xyz',
    expected: {
      valid: false
    }
  }
];

/**
 * Export all test data
 */
export const testData = {
  pii: piiTestCases,
  enterprise: enterpriseTestCases,
  compliance: complianceTestCases,
  ttl: ttlSamples,
  chat: chatTestCases,
  apiKey: apiKeyTestCases
};
