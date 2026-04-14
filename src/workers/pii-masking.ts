// PII Masking Worker
import type { Env, MaskResponse, DetectedEntity, PIIType } from '../types';

/**
 * PII Masking Service
 * Detects and masks Personally Identifiable Information (multilingual)
 */
export class PIIMaskingService {
  private patterns: Map<string, RegExp>;
  private chineseNames: Set<string>;
  private europeanNames: Set<string>;

  constructor() {
    // Use array of patterns instead of Map to avoid key collisions
    this.patterns = new Map();

    // Chinese ID Card
    this.patterns.set('ID_CARD_CN', /\b\d{15}|\d{18}\b/g);

    // Bank Card (13-19 digits with optional spaces)
    this.patterns.set('BANK_CARD', /\b(?:\d{4}[\s-]?){3}\d{3,4}\b/g);

    // Chinese Phone
    this.patterns.set('PHONE_CN', /\b(?:\+86[\s-]?)?1[3-9]\d{9}\b/g);

    // European Phone
    this.patterns.set('PHONE_EU', /\b\+\d{1,3}[\s-]?\d{2,4}[\s-]?\d{3,4}[\s-]?\d{3,4}\b/g);

    // Email
    this.patterns.set('EMAIL', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);

    // Passport (General)
    this.patterns.set('PASSPORT', /\b[A-Z]{1,2}\d{6,9}\b/g);

    // Chinese Social Security Number
    this.patterns.set('SSN_CN', /\b\d{18}\b/g);

    // German Personalausweis (German ID)
    this.patterns.set('ID_CARD_DE', /\b[L-Z]{2}\d{7}\b/gi);

    // French INSEE (French Social Security)
    this.patterns.set('SSN_FR', /\b[12]\d{2}\d{2}\d{2}\d{6}\b/gi);

    // Spanish DNI
    this.patterns.set('ID_CARD_ES', /\b\d{8}[A-Z]\b/gi);

    // US SSN format
    this.patterns.set('SSN_US', /\b\d{3}-\d{2}-\d{4}\b/g);

    // Credit Card
    this.patterns.set('CREDIT_CARD', /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g);

    // Common Chinese surnames
    this.chineseNames = new Set([
      '张', '王', '李', '赵', '刘', '陈', '杨', '黄', '周', '吴',
      '徐', '孙', '马', '朱', '胡', '郭', '何', '高', '林', '罗',
      '郑', '梁', '谢', '宋', '唐', '许', '韩', '冯', '邓', '曹',
      '彭', '曾', '肖', '田', '董', '潘', '袁', '蔡', '蒋', '余',
      '于', '杜', '叶', '程', '苏', '魏', '吕', '丁', '任', '沈',
      '姚', '卢', '姜', '崔', '钟', '谭', '陆', '汪', '范', '金',
    ]);

    // Common European given names (for detection in context)
    this.europeanNames = new Set([
      // English
      'john', 'james', 'michael', 'david', 'robert', 'william', 'richard', 'joseph', 'thomas', 'charles',
      'mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah', 'karen',
      // German
      'hans', 'peter', 'franz', 'klaus', 'werner', 'wolfgang', 'helmut', 'juergen', 'andreas', 'thomas',
      'anna', 'maria', 'susanne', 'petra', 'karin', 'elke', 'heike', 'christina', 'sabine', 'lisa',
      // French
      'jean', 'pierre', 'michel', 'philippe', 'antoine', 'nicolas', 'louis', 'alexandre', 'julien', 'thomas',
      'marie', 'sophie', 'claire', 'camille', 'emma', 'julia', 'lucy', 'amelie', 'charlotte', 'eva',
      // Spanish
      'juan', 'carlos', 'miguel', 'francisco', 'jose', 'david', 'alexander', 'daniel', 'pablo', 'adrian',
      'maria', 'ana', 'laura', 'sofia', 'patricia', 'carmen', 'isabel', 'elena', 'rosa', 'angeles',
    ]);
  }

  /**
   * Mask PII in text
   */
  mask(text: string, options?: { strategy?: 'replace' | 'hash' }): MaskResponse {
    const startTime = Date.now();
    const detected: DetectedEntity[] = [];
    let masked = text;

    // Detect patterns
    for (const [type, pattern] of this.patterns) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;

      while ((match = regex.exec(text)) !== null) {
        detected.push({
          type,
          value: match[0],
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.95
        });

        // Replace with placeholder
        const placeholder = this.getPlaceholder(type);
        masked = masked.replace(match[0], placeholder);
      }
    }

    // Detect names (multilingual)
    const nameMatches = this.detectNames(text);
    detected.push(...nameMatches);

    // Replace names
    for (const name of nameMatches) {
      masked = masked.replace(name.value, this.getPlaceholder('PERSON'));
    }

    return {
      success: true,
      original: text,
      masked,
      detected,
      processing_time_ms: Date.now() - startTime
    };
  }

  /**
   * Detect all PII in text without masking, return summary statistics
   */
  detectAll(text: string): { detected: DetectedEntity[]; summary: PIIsummary } {
    return this.detectPIIWithContext(text);
  }

  /**
   * Detect PII in structured data (objects/arrays) with context awareness
   */
  detectInData(data: any, parentKey?: string): { detected: DetectedEntity[]; summary: PIIsummary } {
    const detected: DetectedEntity[] = [];

    if (typeof data === 'string') {
      const result = this.detectPIIWithContext(data, parentKey);
      return result;
    }

    if (Array.isArray(data)) {
      for (const item of data) {
        const result = this.detectInData(item, parentKey);
        detected.push(...result.detected);
      }
      const summary = this.buildSummary(detected);
      return { detected, summary };
    }

    if (typeof data === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        const result = this.detectInData(value, key);
        detected.push(...result.detected);
      }
      const summary = this.buildSummary(detected);
      return { detected, summary };
    }

    return { detected: [], summary: this.buildSummary([]) };
  }

  /**
   * Detect PII with context awareness for better accuracy
   */
  detectPIIWithContext(text: string, contextFieldName?: string): { detected: DetectedEntity[]; summary: PIIsummary } {
    const detected: DetectedEntity[] = [];

    // Detect patterns
    for (const [type, pattern] of this.patterns) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;

      while ((match = regex.exec(text)) !== null) {
        detected.push({
          type,
          value: match[0],
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.95
        });
      }
    }

    // Detect names (multilingual) - with context awareness for bare name detection
    const nameMatches = this.detectNames(text, contextFieldName);
    detected.push(...nameMatches);

    // Build summary
    const summary = this.buildSummary(detected);

    return { detected, summary };
  }

  /**
   * Build PII summary from detected entities
   */
  private buildSummary(detected: DetectedEntity[]): PIIsummary {
    const breakdown: Record<string, number> = {};
    let totalCount = 0;

    for (const entity of detected) {
      // Normalize type to main category
      const mainType = this.normalizeType(entity.type);
      breakdown[mainType] = (breakdown[mainType] || 0) + 1;
      totalCount++;
    }

    // Determine sensitivity level
    let sensitivityLevel: 'none' | 'low' | 'medium' | 'high' = 'none';
    if (totalCount === 0) {
      sensitivityLevel = 'none';
    } else if (totalCount <= 2) {
      sensitivityLevel = 'low';
    } else if (totalCount <= 5) {
      sensitivityLevel = 'medium';
    } else {
      sensitivityLevel = 'high';
    }

    return {
      total_pii_count: totalCount,
      pii_breakdown: breakdown,
      sensitivity_level: sensitivityLevel
    };
  }

  /**
   * Normalize PII type to main category
   */
  private normalizeType(type: string): string {
    if (type.startsWith('PHONE')) return 'phone';
    if (type.startsWith('ID_CARD') || type === 'ID_CARD') return 'id_card';
    if (type.startsWith('SSN')) return 'ssn';
    if (type.startsWith('BANK') || type === 'BANK_CARD' || type === 'CREDIT_CARD') return 'bank_card';
    if (type.startsWith('EMAIL') || type === 'EMAIL') return 'email';
    if (type.startsWith('PASSPORT') || type === 'PASSPORT') return 'passport';
    if (type === 'PERSON' || type.includes('NAME')) return 'person';
    return type.toLowerCase();
  }

  /**
   * Detect names using heuristics (multilingual)
   */
  private detectNames(text: string, contextFieldName?: string): DetectedEntity[] {
    const detected: DetectedEntity[] = [];

    // Pattern: Chinese surname + name + title
    const chineseTitlePattern = /([\u4e00-\u9fa5])[\u4e00-\u9fa5]{1,2}(先生|女士|老师|医生|经理|总|董事|长|总监|主任|工程师)/g;

    let match;
    while ((match = chineseTitlePattern.exec(text)) !== null) {
      const fullName = match[0];
      const surname = match[1];

      if (this.chineseNames.has(surname)) {
        detected.push({
          type: 'PERSON',
          value: fullName,
          start: match.index,
          end: match.index + fullName.length,
          confidence: 0.85
        });
      }
    }

    // Chinese surname + title standalone
    const chineseStandalonePattern = /([\u4e00-\u9fa5]{2,3})(先生|女士|小姐)/g;
    while ((match = chineseStandalonePattern.exec(text)) !== null) {
      const name = match[1];
      const firstChar = name[0];

      if (this.chineseNames.has(firstChar) && !detected.some(d => d.start === match!.index)) {
        detected.push({
          type: 'PERSON',
          value: match[0],
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.8
        });
      }
    }

    // European names with titles (Mr., Mrs., Ms., Dr., etc.)
    const europeanTitlePattern = /\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\b/g;
    while ((match = europeanTitlePattern.exec(text)) !== null) {
      const fullName = match[0];
      detected.push({
        type: 'PERSON',
        value: fullName,
        start: match.index,
        end: match.index + fullName.length,
        confidence: 0.75
      });
    }

    // German names with titles
    const germanPattern = /\b(Herr|Frau)\s+([A-Z][a-zäöüß]+)\s+([A-Z][a-zäöüß]+)\b/gi;
    while ((match = germanPattern.exec(text)) !== null) {
      const fullName = match[0];
      detected.push({
        type: 'PERSON',
        value: fullName,
        start: match.index,
        end: match.index + fullName.length,
        confidence: 0.8
      });
    }

    // French names with titles
    const frenchPattern = /\b(M\.|Mme|Mlle|Dr)\s+([A-Z][a-zàâäçéèêëîïôûùüÿœæ]+)\s+([A-Z][a-zàâäçéèêëîïôûùüÿœæ]+)\b/gi;
    while ((match = frenchPattern.exec(text)) !== null) {
      const fullName = match[0];
      detected.push({
        type: 'PERSON',
        value: fullName,
        start: match.index,
        end: match.index + fullName.length,
        confidence: 0.8
      });
    }

    // Spanish names with titles
    const spanishPattern = /\b(Sr\.|Sra\.|Srta\.|Dr\.|Dra\.)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\b/g;
    while ((match = spanishPattern.exec(text)) !== null) {
      const fullName = match[0];
      detected.push({
        type: 'PERSON',
        value: fullName,
        start: match.index,
        end: match.index + fullName.length,
        confidence: 0.8
      });
    }

    // Bare Chinese names (2-3 characters) - when context suggests it's a name field
    // This is a heuristic for fields like "name", "customer", "contact", etc.
    if (contextFieldName) {
      const nameFieldPatterns = ['name', 'customer', 'contact', 'person', 'username', '姓名', '客户', '联系人'];
      const isNameField = nameFieldPatterns.some(f =>
        contextFieldName.toLowerCase().includes(f)
      );

      if (isNameField) {
        // Match 2-4 Chinese characters (common Chinese name length)
        const bareChinesePattern = /[\u4e00-\u9fa5]{2,4}/g;
        while ((match = bareChinesePattern.exec(text)) !== null) {
          const name = match[0];
          const firstChar = name[0];

          // Check if first character is a known surname
          if (this.chineseNames.has(firstChar) && !detected.some(d => d.start === match!.index)) {
            detected.push({
              type: 'PERSON',
              value: name,
              start: match.index,
              end: match.index + name.length,
              confidence: 0.7 // Lower confidence for bare names
            });
          }
        }
      }
    }

    return detected;
  }

  /**
   * Get placeholder for PII type
   */
  private getPlaceholder(type: PIIType | 'PERSON' | string): string {
    const placeholders: Record<string, string> = {
      'PERSON': '[姓名]',
      'ID_CARD': '[身份证号]',
      'ID_CARD_CN': '[身份证号]',
      'ID_CARD_DE': '[身份证号]',
      'ID_CARD_ES': '[身份证号]',
      'BANK_CARD': '[银行卡号]',
      'CREDIT_CARD': '[信用卡号]',
      'PHONE': '[手机号]',
      'PHONE_CN': '[手机号]',
      'PHONE_EU': '[电话号码]',
      'EMAIL': '[邮箱]',
      'ADDRESS': '[地址]',
      'MEDICAL_RECORD': '[病历号]',
      'PASSPORT': '[护照号]',
      'SSN': '[社保号]',
      'SSN_CN': '[社保号]',
      'SSN_FR': '[社保号]',
      'SSN_US': '[社保号]'
    };

    return placeholders[type] || '[已遮蔽]';
  }
}

/**
 * Handle PII masking request
 */
export async function handlePIIMask(
  request: Request,
  env: Env
): Promise<Response> {
  const startTime = Date.now();

  try {
    const body = await request.json() as { text: string; options?: { strategy?: string } };

    if (!body.text) {
      return Response.json(
        { success: false, error: 'text is required' },
        { status: 400 }
      );
    }

    const masker = new PIIMaskingService();
    const result = masker.mask(body.text, body.options as any);

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
