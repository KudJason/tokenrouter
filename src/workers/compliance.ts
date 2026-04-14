// Compliance Check Worker - EU AI Act Annex III
import type { Env, ComplianceResponse, AnnexCategory, RiskLevel } from '../types';

/**
 * EU AI Act Compliance Check Service
 * Determines if AI system usage falls under Annex III high-risk categories
 */
export class ComplianceService {
  // Annex III high-risk categories with keywords
  private rules: AnnexCategoryRule[] = [
    {
      id: 'biometric',
      name: '生物识别',
      keywords: ['人脸识别', '指纹', '刷脸', '虹膜', 'face recognition', 'fingerprint', 'biometric', 'facial recognition'],
      riskLevel: 'high',
      obligations: [
        'Transparency: must inform subjects about AI processing',
        'Human oversight: must have human review mechanism',
        'Documentation: must maintain audit trail'
      ]
    },
    {
      id: 'critical_infrastructure',
      name: '关键基础设施',
      keywords: ['交通', '能源', '电网', '水务', '交通系统', 'transport', 'energy', 'power grid'],
      riskLevel: 'high',
      obligations: [
        'Risk management: must implement risk assessment',
        'Technical robustness: must ensure reliability',
        'Security: must protect against cyber threats'
      ]
    },
    {
      id: 'education',
      name: '教育评估',
      keywords: ['学生评分', '入学', '考试', '成绩评估', 'student grading', 'admission', 'exam scoring', 'educational assessment'],
      riskLevel: 'high',
      obligations: [
        'Transparency: must inform about AI involvement',
        'Human oversight: human review of decisions',
        'Fairness: must not discriminate'
      ]
    },
    {
      id: 'employment',
      name: '就业/人力资源',
      keywords: ['招聘', '面试', '绩效', '晋升', '裁员', 'recruitment', 'hiring', 'performance review', 'promotion', 'layoff'],
      riskLevel: 'high',
      obligations: [
        'Transparency: must inform candidates about AI use',
        'Human oversight: human review of decisions',
        'Fairness: must not discriminate'
      ]
    },
    {
      id: 'credit',
      name: '信用评估',
      keywords: ['信用评估', '贷款', '征信', '风险评分', '还款能力', 'credit scoring', 'loan', 'creditworthiness', 'risk assessment'],
      riskLevel: 'high',
      obligations: [
        'Transparency: must inform subject about AI in credit decisions',
        'Human oversight: must have human review mechanism',
        'Documentation: must maintain audit trail'
      ]
    },
    {
      id: 'healthcare',
      name: '医疗健康',
      keywords: ['诊断', '病历', '治疗', '手术', '处方', '医生建议', 'diagnosis', 'treatment', 'medical', 'healthcare', 'prescription'],
      riskLevel: 'high',
      obligations: [
        'Transparency: must inform about AI involvement',
        'Human oversight: medical AI requires healthcare professional review',
        'Data protection: health data subject to strict GDPR requirements'
      ]
    },
    {
      id: 'justice',
      name: '司法协助',
      keywords: ['法律咨询', '案件分析', '判决', '律师', '法院', 'legal advice', 'case analysis', 'judgment', 'court'],
      riskLevel: 'high',
      obligations: [
        'Transparency: must inform about AI involvement',
        'Human oversight: must have legal professional review',
        'Documentation: must maintain full audit trail'
      ]
    }
  ];

  /**
   * Check compliance for given text
   */
  check(text: string, language: 'zh' | 'en' | 'auto' = 'auto'): ComplianceResponse {
    const startTime = Date.now();
    const detectedCategories: AnnexCategory[] = [];
    let highestRisk: RiskLevel = 'low';

    // Check each rule
    for (const rule of this.rules) {
      const matchScore = this.calculateMatchScore(text, rule.keywords);

      if (matchScore > 0.5) {
        detectedCategories.push({
          id: rule.id,
          name: rule.name,
          description: this.getCategoryDescription(rule.id),
          confidence: matchScore,
          obligations: rule.obligations
        });

        // Update highest risk level
        if (rule.riskLevel === 'high' && highestRisk !== 'critical') {
          highestRisk = 'high';
        }
      }
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(detectedCategories);

    return {
      success: true,
      risk_level: highestRisk,
      annex_categories: detectedCategories,
      recommendations,
      processing_time_ms: Date.now() - startTime
    };
  }

  /**
   * Calculate match score for keywords in text
   */
  private calculateMatchScore(text: string, keywords: string[]): number {
    const lowerText = text.toLowerCase();
    let matches = 0;

    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase();
      if (lowerText.includes(lowerKeyword)) {
        matches++;
      }
    }

    // Score based on keyword matches
    if (matches === 0) return 0;
    if (matches === 1) return 0.6;
    if (matches === 2) return 0.8;
    return 0.95;
  }

  /**
   * Get description for Annex III category
   */
  private getCategoryDescription(categoryId: string): string {
    const descriptions: Record<string, string> = {
      'biometric': 'AI systems for biometric identification and categorization',
      'critical_infrastructure': 'AI systems for management and operation of critical infrastructure',
      'education': 'AI systems for education and vocational training',
      'employment': 'AI systems for recruitment, selection, and performance evaluation',
      'credit': 'AI systems for creditworthiness evaluation and insurance risk assessment',
      'healthcare': 'AI systems for medical diagnosis and treatment recommendations',
      'justice': 'AI systems for administration of justice and democratic processes'
    };

    return descriptions[categoryId] || 'AI system requiring compliance assessment';
  }

  /**
   * Generate recommendations based on detected categories
   */
  private generateRecommendations(categories: AnnexCategory[]): string[] {
    const recommendations: string[] = [];

    if (categories.length === 0) {
      return ['No high-risk categories detected. Standard AI usage guidelines apply.'];
    }

    for (const category of categories) {
      recommendations.push(
        `${category.name} category detected. Ensure compliance with EU AI Act Article 9 requirements.`
      );
    }

    recommendations.push('Consider implementing human oversight for high-risk AI decisions.');
    recommendations.push('Document all high-risk AI interactions in audit trail.');

    return [...new Set(recommendations)]; // Remove duplicates
  }
}

/**
 * Handle compliance check request
 */
export async function handleComplianceCheck(
  request: Request,
  env: Env
): Promise<Response> {
  const startTime = Date.now();

  try {
    const body = await request.json() as { text: string; language?: 'zh' | 'en' | 'auto' };

    if (!body.text) {
      return Response.json(
        { success: false, error: 'text is required' },
        { status: 400 }
      );
    }

    const service = new ComplianceService();
    const result = service.check(body.text, body.language || 'auto');

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
        processing_time_ms: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}
