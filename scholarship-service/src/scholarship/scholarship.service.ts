import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ScholarshipService {
  private readonly logger = new Logger(ScholarshipService.name);
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  private mapFundingType(type: string): number {
    switch (type) {
      case 'FULL': return 1;
      case 'PARTIAL': return 2;
      case 'TUITION_ONLY': return 3;
      case 'STIPEND_ONLY': return 4;
      default: return 0;
    }
  }

  private mapCycleStatus(status: string): number {
    switch (status) {
      case 'DISCOVERED': return 1;
      case 'PENDING_REVIEW': return 2;
      case 'UPCOMING': return 3;
      case 'OPEN': return 4;
      case 'CLOSED': return 5;
      case 'ARCHIVED': return 6;
      default: return 0;
    }
  }

  async searchScholarships(query: any) {
    const page = Math.max(1, query?.page || 1);
    const pageSize = Math.min(50, Math.max(1, query?.pageSize || 10));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query?.query) {
      where.OR = [
        { title: { contains: query.query, mode: 'insensitive' } },
        { description: { contains: query.query, mode: 'insensitive' } },
      ];
    }

    const [total, records] = await Promise.all([
      this.prisma.scholarship.count({ where }),
      this.prisma.scholarship.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          provider: true,
          cycles: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    const items = records.map((record) => {
      const activeCycle = record.cycles[0];
      return {
        id: record.id,
        providerId: record.providerId || '',
        providerName: record.provider?.name || '',
        title: record.title,
        description: record.description || '',
        officialUrl: record.officialUrl,
        fundingType: this.mapFundingType(record.fundingType),
        status: record.opportunityStatus === 'PUBLISHED' ? 2 : 1,
        degreeLevels: [2], // Default Masters
        targetCountryCodes: ['DE'],
        activeCycle: activeCycle
          ? {
              id: activeCycle.id,
              scholarshipId: record.id,
              cycleLabel: activeCycle.cycleLabel,
              status: this.mapCycleStatus(activeCycle.status),
              openAtIso: activeCycle.openAt?.toISOString() || '',
              deadlineAtIso: activeCycle.deadlineAt?.toISOString() || '',
              deadlineLocalDate: activeCycle.deadlineLocalDate || '',
              deadlineTimezone: activeCycle.deadlineTimezone || 'Europe/Berlin',
              deadlinePrecision: activeCycle.deadlinePrecision || 'DATE_ONLY',
              verifiedAtIso: activeCycle.verifiedAt?.toISOString() || '',
            }
          : undefined,
        lastVerifiedAtIso: activeCycle?.verifiedAt?.toISOString() || record.updatedAt.toISOString(),
      };
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  async getScholarship(id: string) {
    const record = await this.prisma.scholarship.findUnique({
      where: { id },
      include: {
        provider: true,
        cycles: {
          include: {
            eligibilityRules: true,
            documentRequirements: true,
            fundingComponents: true,
          },
        },
      },
    });

    if (!record) {
      return { scholarship: null };
    }

    const activeCycle = record.cycles[0];

    return {
      scholarship: {
        id: record.id,
        providerId: record.providerId || '',
        providerName: record.provider?.name || '',
        title: record.title,
        description: record.description || '',
        officialUrl: record.officialUrl,
        fundingType: this.mapFundingType(record.fundingType),
        status: record.opportunityStatus === 'PUBLISHED' ? 2 : 1,
        cycles: record.cycles.map((c) => ({
          id: c.id,
          scholarshipId: record.id,
          cycleLabel: c.cycleLabel,
          status: this.mapCycleStatus(c.status),
          openAtIso: c.openAt?.toISOString() || '',
          deadlineAtIso: c.deadlineAt?.toISOString() || '',
          deadlineLocalDate: c.deadlineLocalDate || '',
          deadlineTimezone: c.deadlineTimezone || '',
          deadlinePrecision: c.deadlinePrecision,
          verifiedAtIso: c.verifiedAt?.toISOString() || '',
        })),
        eligibilityRules: activeCycle?.eligibilityRules.map((r) => {
          const val = r.structuredValue as any;
          return {
            id: r.id,
            cycleId: r.cycleId,
            ruleType: r.ruleType,
            operator: r.operator,
            structuredValueJson: JSON.stringify(val),
            evidenceSource: val?.quote || '',
            reviewStatus: r.reviewStatus,
          };
        }) || [],
        documentRequirements: activeCycle?.documentRequirements.map((d) => ({
          id: d.id,
          cycleId: d.cycleId,
          documentType: d.documentType,
          requirementLevel: d.requirementLevel,
          attestationRequired: d.attestationStatus === 'REQUIRED',
          translationRequired: false,
          instructions: d.instructions || '',
        })) || [],
        fundingComponents: activeCycle?.fundingComponents.map((f) => ({
          id: f.id,
          kind: f.kind,
          amount: Number(f.amount || 0),
          currency: f.currency || 'EUR',
          period: f.period || 'MONTHLY',
          conditions: f.conditions || '',
        })) || [],
        lastVerifiedAtIso: activeCycle?.verifiedAt?.toISOString() || record.updatedAt.toISOString(),
      },
    };
  }

  submitCandidate(data: any) {
    return {
      candidateId: `candidate-${Date.now()}`,
      reviewTaskId: `review-${Date.now()}`,
      status: 'PENDING_REVIEW',
    };
  }

  approveCandidate(data: any) {
    return {
      scholarshipId: `scholarship-${Date.now()}`,
      cycleId: `cycle-${Date.now()}`,
      published: true,
    };
  }

  expireCycles(referenceUtc: string) {
    return {
      expiredCycleIds: [],
      count: 0,
    };
  }
}
