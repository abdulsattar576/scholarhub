import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient, FundingType, OpportunityStatus, CycleStatus, RequirementLevel } from '@prisma/client';

export interface ExtractedScholarshipPayload {
  title: string;
  provider: string;
  official_url?: string | null;
  target_countries?: string[];
  degree_levels?: string[];
  funding?: {
    funding_type?: string;
    monthly_stipend?: number | null;
    currency?: string | null;
    covers_tuition?: boolean | null;
    covers_travel?: boolean | null;
    covers_health_insurance?: boolean | null;
  };
  cycle?: {
    cycle_label?: string;
    open_date?: string | null;
    deadline_date?: string | null;
    deadline_timezone?: string | null;
    deadline_precision?: string;
  };
  eligibility_rules?: Array<{
    rule_type: string;
    operator: string;
    value: any;
    evidence_quote?: string;
  }>;
  document_requirements?: Array<{
    document_type: string;
    is_mandatory: boolean;
    attestation_required?: boolean;
    instructions?: string | null;
  }>;
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async storeExtractedScholarship(payload: ExtractedScholarshipPayload) {
    this.logger.log(`Ingesting scholarship: "${payload.title}" from provider: "${payload.provider}"`);

    return await this.prisma.$transaction(async (tx) => {
      // 1. Upsert Scholarship Provider
      let provider = await tx.scholarshipProvider.findFirst({
        where: { name: payload.provider },
      });

      if (!provider) {
        provider = await tx.scholarshipProvider.create({
          data: {
            name: payload.provider,
            type: 'UNIVERSITY',
          },
        });
      }

      // Map funding type safely
      let fundingType: FundingType = FundingType.FULL;
      if (payload.funding?.funding_type === 'PARTIAL') fundingType = FundingType.PARTIAL;
      else if (payload.funding?.funding_type === 'STIPEND_ONLY') fundingType = FundingType.STIPEND_ONLY;
      else if (payload.funding?.funding_type === 'TUITION_ONLY') fundingType = FundingType.TUITION_ONLY;

      // 2. Upsert Scholarship
      let scholarship = await tx.scholarship.findFirst({
        where: {
          title: payload.title,
          providerId: provider.id,
        },
      });

      if (!scholarship) {
        scholarship = await tx.scholarship.create({
          data: {
            title: payload.title,
            providerId: provider.id,
            officialUrl: payload.official_url || '',
            fundingType: fundingType,
            opportunityStatus: OpportunityStatus.PUBLISHED,
          },
        });
      }

      // 3. Create or Update Cycle
      const cycleLabel = payload.cycle?.cycle_label || 'Current Cycle';
      let cycle = await tx.scholarshipCycle.findFirst({
        where: {
          scholarshipId: scholarship.id,
          cycleLabel: cycleLabel,
        },
      });

      const deadlineAt = payload.cycle?.deadline_date ? new Date(payload.cycle.deadline_date) : null;
      const openAt = payload.cycle?.open_date ? new Date(payload.cycle.open_date) : null;

      if (!cycle) {
        cycle = await tx.scholarshipCycle.create({
          data: {
            scholarshipId: scholarship.id,
            cycleLabel: cycleLabel,
            status: CycleStatus.OPEN,
            openAt: openAt,
            deadlineAt: deadlineAt,
            deadlineLocalDate: payload.cycle?.deadline_date || null,
            deadlineTimezone: payload.cycle?.deadline_timezone || 'Europe/Berlin',
            deadlinePrecision: payload.cycle?.deadline_precision || 'DATE_ONLY',
            verifiedAt: new Date(),
          },
        });
      }

      // 4. Store Eligibility Rules
      if (payload.eligibility_rules && payload.eligibility_rules.length > 0) {
        // Clear previous rules for this cycle to avoid duplicate spam on re-ingestion
        await tx.eligibilityRule.deleteMany({
          where: { cycleId: cycle.id },
        });

        for (const rule of payload.eligibility_rules) {
          await tx.eligibilityRule.create({
            data: {
              cycleId: cycle.id,
              ruleType: rule.rule_type,
              operator: rule.operator,
              structuredValue: { value: rule.value, quote: rule.evidence_quote || '' },
              reviewStatus: 'VERIFIED',
            },
          });
        }
      }

      // 5. Store Document Requirements
      if (payload.document_requirements && payload.document_requirements.length > 0) {
        await tx.documentRequirement.deleteMany({
          where: { cycleId: cycle.id },
        });

        for (const doc of payload.document_requirements) {
          await tx.documentRequirement.create({
            data: {
              cycleId: cycle.id,
              documentType: doc.document_type,
              requirementLevel: doc.is_mandatory ? RequirementLevel.MANDATORY : RequirementLevel.OPTIONAL,
              attestationStatus: doc.attestation_required ? 'REQUIRED' : 'NOT_REQUIRED',
              instructions: doc.instructions || null,
            },
          });
        }
      }

      // 6. Store Funding Components
      if (payload.funding && payload.funding.monthly_stipend) {
        await tx.fundingComponent.deleteMany({
          where: { cycleId: cycle.id },
        });

        await tx.fundingComponent.create({
          data: {
            cycleId: cycle.id,
            kind: 'MONTHLY_STIPEND',
            amount: payload.funding.monthly_stipend,
            currency: payload.funding.currency || 'EUR',
            period: 'MONTHLY',
          },
        });
      }

      return {
        success: true,
        providerId: provider.id,
        scholarshipId: scholarship.id,
        cycleId: cycle.id,
        rulesCount: payload.eligibility_rules?.length || 0,
        docsCount: payload.document_requirements?.length || 0,
      };
    });
  }
}

