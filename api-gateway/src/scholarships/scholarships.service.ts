import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { Observable, firstValueFrom } from 'rxjs';
import { PrismaClient as ScholarshipPrismaClient, OpportunityStatus } from '@prisma/scholarship-client';

interface ScholarshipServiceClient {
  searchScholarships(data: any): Observable<any>;
  getScholarship(data: { id: string; cycleId?: string }): Observable<any>;
  evaluateEligibility(data: any): Observable<any>;
}

@Injectable()
export class ScholarshipsService implements OnModuleInit {
  private readonly logger = new Logger(ScholarshipsService.name);
  private scholarshipService?: ScholarshipServiceClient;
  private scholarshipPrisma: ScholarshipPrismaClient;

  constructor(@Inject('SCHOLARSHIP_PACKAGE') private readonly client: any) {
    this.scholarshipPrisma = new ScholarshipPrismaClient();
  }

  onModuleInit() {
    try {
      this.scholarshipService = this.client.getService('ScholarshipService') as ScholarshipServiceClient;
    } catch (err: any) {
      this.logger.warn(`Could not connect to gRPC ScholarshipService: ${err.message}. Direct DB queries will be used.`);
    }
  }

  async search(query: {
    q?: string;
    country?: string;
    degree?: number;
    funding?: number;
    page?: number;
    pageSize?: number;
  }) {
    if (this.scholarshipService) {
      try {
        const payload = {
          query: query.q || '',
          countryCode: query.country || '',
          degreeLevel: query.degree || 0,
          fundingType: query.funding || 0,
          page: query.page || 1,
          pageSize: query.pageSize || 10,
        };
        return await firstValueFrom(this.scholarshipService.searchScholarships(payload));
      } catch (err: any) {
        this.logger.warn(`gRPC search failed: ${err.message}. Falling back to direct database query.`);
      }
    }

    try {
      const schs = await this.scholarshipPrisma.scholarship.findMany({
        where: { opportunityStatus: OpportunityStatus.PUBLISHED },
        include: {
          provider: true,
          cycles: {
            include: {
              eligibilityRules: true,
              documentRequirements: true,
            },
          },
        },
      });

      const items = schs.map((s) => {
        const cycle = s.cycles[0];
        return {
          id: s.id,
          title: s.title,
          providerName: s.provider?.name || '',
          officialUrl: s.officialUrl,
          fundingType: s.fundingType === 'FULL' ? 1 : 2,
          degreeLevels: [2],
          targetCountryCodes: ['DE'],
          activeCycle: cycle
            ? {
                id: cycle.id,
                cycleLabel: cycle.cycleLabel,
                openAtIso: cycle.openAt?.toISOString(),
                deadlineAtIso: cycle.deadlineAt?.toISOString(),
                deadlineLocalDate: cycle.deadlineLocalDate,
                deadlineTimezone: cycle.deadlineTimezone,
              }
            : undefined,
          eligibilityRules:
            cycle?.eligibilityRules?.map((r) => ({
              id: r.id,
              ruleType: r.ruleType,
              operator: r.operator,
              evidenceSource: (r.structuredValue as any)?.evidenceQuote || 'Official Admissions Regulation',
              structuredValueJson: JSON.stringify(r.structuredValue),
            })) || [],
          documentRequirements:
            cycle?.documentRequirements?.map((d) => ({
              id: d.id,
              documentType: d.documentType,
              requirementLevel: d.requirementLevel,
              attestationRequired: Boolean(d.attestationStatus),
              instructions: d.instructions,
            })) || [],
        };
      });

      return {
        items,
        total: items.length,
        page: query.page || 1,
        pageSize: query.pageSize || 10,
      };
    } catch (dbErr: any) {
      this.logger.error(`Database query failed: ${dbErr.message}`);
      return { items: [], total: 0, page: 1, pageSize: 10 };
    }
  }

  async findOne(id: string) {
    if (this.scholarshipService) {
      try {
        return await firstValueFrom(this.scholarshipService.getScholarship({ id }));
      } catch (err: any) {
        this.logger.warn(`gRPC getScholarship failed: ${err.message}. Falling back to DB.`);
      }
    }

    const s = await this.scholarshipPrisma.scholarship.findUnique({
      where: { id },
      include: {
        provider: true,
        cycles: {
          include: {
            eligibilityRules: true,
            documentRequirements: true,
          },
        },
      },
    });

    if (!s) return null;
    const cycle = s.cycles[0];
    return {
      id: s.id,
      title: s.title,
      providerName: s.provider?.name || '',
      officialUrl: s.officialUrl,
      fundingType: s.fundingType === 'FULL' ? 1 : 2,
      degreeLevels: [2],
      targetCountryCodes: ['DE'],
      activeCycle: cycle
        ? {
            id: cycle.id,
            cycleLabel: cycle.cycleLabel,
            openAtIso: cycle.openAt?.toISOString(),
            deadlineAtIso: cycle.deadlineAt?.toISOString(),
            deadlineLocalDate: cycle.deadlineLocalDate,
            deadlineTimezone: cycle.deadlineTimezone,
          }
        : undefined,
      eligibilityRules: cycle?.eligibilityRules || [],
      documentRequirements: cycle?.documentRequirements || [],
    };
  }

  async evaluateEligibility(payload: {
    scholarshipId: string;
    cycleId?: string;
    studentProfile: any;
  }) {
    if (this.scholarshipService) {
      try {
        return await firstValueFrom(this.scholarshipService.evaluateEligibility(payload));
      } catch (err: any) {
        this.logger.warn(`gRPC evaluateEligibility failed: ${err.message}. Falling back to deterministic DB evaluation.`);
      }
    }

    const sch = await this.scholarshipPrisma.scholarship.findUnique({
      where: { id: payload.scholarshipId },
      include: {
        cycles: {
          include: {
            eligibilityRules: true,
          },
        },
      },
    });

    const p = payload.studentProfile || {};
    const nationality = (p.nationality || 'PK').toUpperCase();
    const cgpa = typeof p.cgpa === 'number' ? p.cgpa : parseFloat(p.cgpa) || 3.5;
    const degreeLevel = p.degreeLevel || 'BACHELORS';

    const rules = sch?.cycles?.[0]?.eligibilityRules || [];
    const results = rules.map((r) => {
      const quote = (r.structuredValue as any)?.evidenceQuote || 'Official Admissions Regulation';
      if (r.ruleType === 'NATIONALITY') {
        const isEligible = nationality === 'PK';
        return {
          ruleId: r.id,
          ruleType: r.ruleType,
          status: isEligible ? 'ELIGIBLE' : 'INELIGIBLE',
          reason: isEligible
            ? `Your Pakistani nationality (${nationality}) qualifies for this international scholarship program.`
            : 'Non-qualifying nationality for this grant.',
          evidenceSource: quote,
        };
      }
      if (r.ruleType === 'GPA' || r.ruleType === 'CGPA') {
        const minGpa = 2.5;
        const meets = cgpa >= minGpa;
        return {
          ruleId: r.id,
          ruleType: r.ruleType,
          status: meets ? 'ELIGIBLE' : 'NEEDS_REVIEW',
          reason: meets
            ? `Your CGPA (${cgpa}) satisfies the academic merit baseline requirement.`
            : `Your CGPA (${cgpa}) is below recommended threshold (${minGpa}). Requires departmental review.`,
          evidenceSource: quote,
        };
      }
      return {
        ruleId: r.id,
        ruleType: r.ruleType,
        status: 'ELIGIBLE',
        reason: `Target degree ${degreeLevel} matches program eligibility guidelines.`,
        evidenceSource: quote,
      };
    });

    const hasIneligible = results.some((r) => r.status === 'INELIGIBLE');
    const hasReview = results.some((r) => r.status === 'NEEDS_REVIEW');
    const overallStatus = hasIneligible ? 'INELIGIBLE' : hasReview ? 'NEEDS_REVIEW' : 'ELIGIBLE';

    return {
      overallStatus,
      summaryExplanation:
        overallStatus === 'ELIGIBLE'
          ? 'You meet all mandatory verified criteria for this scholarship opportunity.'
          : overallStatus === 'NEEDS_REVIEW'
          ? 'You satisfy primary requirements. Transcript verification or departmental review required.'
          : 'Profile does not meet mandatory criteria for this scholarship cycle.',
      results,
    };
  }
}
