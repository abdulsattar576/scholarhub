import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export type TriState = 'ELIGIBLE' | 'INELIGIBLE' | 'NEEDS_REVIEW';

export interface StudentProfileDto {
  nationality?: string;
  degreeLevel?: string;
  fieldOfStudy?: string;
  cgpa?: number;
  gradingScale?: number;
  graduationYear?: number;
  languageTests?: Array<{ testType: string; score: string | number }>;
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleType: string;
  status: TriState;
  reason: string;
  evidenceSource?: string;
}

export interface EvaluationResponse {
  overallStatus: TriState;
  summaryExplanation: string;
  results: RuleEvaluationResult[];
}

@Injectable()
export class EligibilityEngineService {
  private readonly logger = new Logger(EligibilityEngineService.name);
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async evaluate(scholarshipId: string, cycleId?: string, profile: StudentProfileDto = {}): Promise<EvaluationResponse> {
    this.logger.log(`Evaluating eligibility for scholarship=${scholarshipId}, cycle=${cycleId}`);

    // 1. Fetch scholarship and cycle rules from PostgreSQL
    const scholarship = await this.prisma.scholarship.findUnique({
      where: { id: scholarshipId },
      include: {
        cycles: {
          where: cycleId ? { id: cycleId } : undefined,
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            eligibilityRules: true,
          },
        },
      },
    });

    if (!scholarship || scholarship.cycles.length === 0) {
      return {
        overallStatus: 'NEEDS_REVIEW',
        summaryExplanation: 'No verified active cycle or eligibility rules found for this scholarship.',
        results: [],
      };
    }

    const activeCycle = scholarship.cycles[0];
    const rules = activeCycle.eligibilityRules;

    if (rules.length === 0) {
      return {
        overallStatus: 'NEEDS_REVIEW',
        summaryExplanation: 'No structured rules registered for this cycle yet. Manual verification required.',
        results: [],
      };
    }

    // 2. Evaluate each rule individually
    const results: RuleEvaluationResult[] = [];

    for (const rule of rules) {
      const structured = (rule.structuredValue || {}) as any;
      const quote = structured?.quote || '';
      const ruleVal = structured?.value;

      const evalResult = this.evaluateSingleRule(rule.id, rule.ruleType, rule.operator, ruleVal, quote, profile);
      results.push(evalResult);
    }

    // 3. Compute overall status
    let overallStatus: TriState = 'ELIGIBLE';
    let summaryExplanation = 'You meet all evaluated criteria for this scholarship!';

    const hasIneligible = results.some((r) => r.status === 'INELIGIBLE');
    const hasNeedsReview = results.some((r) => r.status === 'NEEDS_REVIEW');

    if (hasIneligible) {
      overallStatus = 'INELIGIBLE';
      const failedRules = results.filter((r) => r.status === 'INELIGIBLE').map((r) => r.ruleType).join(', ');
      summaryExplanation = `You do not meet the criteria for: ${failedRules}. Check requirements details below.`;
    } else if (hasNeedsReview) {
      overallStatus = 'NEEDS_REVIEW';
      const reviewRules = results.filter((r) => r.status === 'NEEDS_REVIEW').map((r) => r.ruleType).join(', ');
      summaryExplanation = `Some requirements require manual confirmation or additional profile information: ${reviewRules}.`;
    }

    return {
      overallStatus,
      summaryExplanation,
      results,
    };
  }

  private evaluateSingleRule(
    ruleId: string,
    ruleType: string,
    operator: string,
    expectedVal: any,
    quote: string,
    profile: StudentProfileDto,
  ): RuleEvaluationResult {
    const normRuleType = ruleType.toUpperCase();

    // 1. NATIONALITY
    if (normRuleType === 'NATIONALITY') {
      const studentNat = (profile.nationality || '').toUpperCase().trim();
      if (!studentNat) {
        return {
          ruleId,
          ruleType,
          status: 'NEEDS_REVIEW',
          reason: 'Nationality not specified in student profile.',
          evidenceSource: quote,
        };
      }

      const expectedStr = String(expectedVal).toLowerCase();
      // E.g. "not eligible for BAföG due to nationality" (i.e. Non-EU/International students)
      if (expectedStr.includes('not eligible for bafög') || expectedStr.includes('international') || expectedStr.includes('non-eu')) {
        const isInternational = !['DE', 'GERMAN', 'GERMANY', 'EU'].includes(studentNat);
        if (isInternational) {
          return {
            ruleId,
            ruleType,
            status: 'ELIGIBLE',
            reason: `Your nationality (${profile.nationality}) satisfies the international / non-BAföG requirement.`,
            evidenceSource: quote,
          };
        } else {
          return {
            ruleId,
            ruleType,
            status: 'INELIGIBLE',
            reason: `German/EU nationals are eligible for regular BAföG and cannot apply for this international grant.`,
            evidenceSource: quote,
          };
        }
      }

      return {
        ruleId,
        ruleType,
        status: 'NEEDS_REVIEW',
        reason: `Please verify that your nationality (${profile.nationality}) matches: "${expectedVal}".`,
        evidenceSource: quote,
      };
    }

    // 2. DEGREE LEVEL
    if (normRuleType === 'DEGREE_LEVEL') {
      const studentDegree = (profile.degreeLevel || '').toUpperCase().trim();
      if (!studentDegree) {
        return {
          ruleId,
          ruleType,
          status: 'NEEDS_REVIEW',
          reason: 'Degree level not specified in student profile.',
          evidenceSource: quote,
        };
      }

      const expectedStr = String(expectedVal).toUpperCase();
      if (expectedStr.includes(studentDegree)) {
        return {
          ruleId,
          ruleType,
          status: 'ELIGIBLE',
          reason: `Your degree level (${profile.degreeLevel}) matches the program requirements.`,
          evidenceSource: quote,
        };
      }

      return {
        ruleId,
        ruleType,
        status: 'NEEDS_REVIEW',
        reason: `Verify degree requirement: student has "${profile.degreeLevel}", program specifies: "${expectedVal}".`,
        evidenceSource: quote,
      };
    }

    // 3. GPA / MERIT
    if (normRuleType === 'GPA' || normRuleType === 'MERIT') {
      const studentCgpa = profile.cgpa;
      const studentScale = profile.gradingScale || 4.0;

      if (studentCgpa === undefined || studentCgpa === null) {
        return {
          ruleId,
          ruleType,
          status: 'NEEDS_REVIEW',
          reason: 'CGPA not provided in student profile.',
          evidenceSource: quote,
        };
      }

      // Check if requirement is a strict number
      const numMatch = String(expectedVal).match(/(\d+\.?\d*)/);
      if (numMatch && !isNaN(Number(numMatch[1]))) {
        const requiredMin = Number(numMatch[1]);
        if (studentScale === 4.0 && requiredMin <= 4.0) {
          if (studentCgpa >= requiredMin) {
            return {
              ruleId,
              ruleType,
              status: 'ELIGIBLE',
              reason: `Your CGPA of ${studentCgpa}/${studentScale} meets the minimum requirement of ${requiredMin}.`,
              evidenceSource: quote,
            };
          } else {
            return {
              ruleId,
              ruleType,
              status: 'INELIGIBLE',
              reason: `Your CGPA of ${studentCgpa}/${studentScale} is below the required minimum of ${requiredMin}.`,
              evidenceSource: quote,
            };
          }
        }
      }

      // Qualitative merit (e.g. "good academic records")
      return {
        ruleId,
        ruleType,
        status: 'NEEDS_REVIEW',
        reason: `Merit requirement: "${expectedVal}". A good academic standing is required based on your transcripts.`,
        evidenceSource: quote,
      };
    }

    // 4. LANGUAGE (IELTS / TOEFL)
    if (normRuleType === 'LANGUAGE') {
      const tests = profile.languageTests || [];
      if (tests.length === 0) {
        return {
          ruleId,
          ruleType,
          status: 'NEEDS_REVIEW',
          reason: 'No language test scores found in profile. Please upload IELTS or TOEFL certificate.',
          evidenceSource: quote,
        };
      }

      return {
        ruleId,
        ruleType,
        status: 'ELIGIBLE',
        reason: 'Language test certificate provided.',
        evidenceSource: quote,
      };
    }

    // 5. OTHER / UNSTRUCTURED REQUIREMENTS
    return {
      ruleId,
      ruleType,
      status: 'NEEDS_REVIEW',
      reason: `Self-check required: "${expectedVal}".`,
      evidenceSource: quote,
    };
  }
}
