import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaClient as ScholarshipPrismaClient, OpportunityStatus, CycleStatus } from '@prisma/scholarship-client';
import { PrismaClient as IdentityPrismaClient } from '@prisma/client';
import { PrismaClient as ApplicationPrismaClient } from '@prisma/application-client';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private scholarshipPrisma: ScholarshipPrismaClient;
  private identityPrisma: IdentityPrismaClient;
  private applicationPrisma: ApplicationPrismaClient;

  constructor() {
    this.scholarshipPrisma = new ScholarshipPrismaClient();
    this.identityPrisma = new IdentityPrismaClient();
    this.applicationPrisma = new ApplicationPrismaClient();
  }

  async getOverview() {
    const totalScholarships = await this.scholarshipPrisma.scholarship.count();
    const publishedScholarships = await this.scholarshipPrisma.scholarship.count({
      where: { opportunityStatus: OpportunityStatus.PUBLISHED },
    });
    const draftScholarships = await this.scholarshipPrisma.scholarship.count({
      where: { opportunityStatus: OpportunityStatus.DRAFT },
    });

    const totalRules = await this.scholarshipPrisma.eligibilityRule.count();
    const verifiedRules = await this.scholarshipPrisma.eligibilityRule.count({
      where: { reviewStatus: 'VERIFIED' },
    });
    const pendingRules = await this.scholarshipPrisma.eligibilityRule.count({
      where: { reviewStatus: { not: 'VERIFIED' } },
    });

    const totalStudents = await this.identityPrisma.user.count();
    const totalApplications = await this.applicationPrisma.application.count();

    return {
      metrics: {
        totalScholarships,
        publishedScholarships,
        draftScholarships,
        totalRules,
        verifiedRules,
        pendingRules,
        totalStudents,
        totalApplications,
      },
    };
  }

  async getScholarshipsForAdmin() {
    return await this.scholarshipPrisma.scholarship.findMany({
      include: {
        provider: true,
        cycles: {
          include: {
            eligibilityRules: true,
            documentRequirements: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateScholarshipStatus(id: string, status: OpportunityStatus) {
    const existing = await this.scholarshipPrisma.scholarship.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Scholarship not found');
    }

    return await this.scholarshipPrisma.scholarship.update({
      where: { id },
      data: { opportunityStatus: status },
      include: {
        provider: true,
        cycles: true,
      },
    });
  }

  async updateRuleReviewStatus(ruleId: string, reviewStatus: string) {
    const rule = await this.scholarshipPrisma.eligibilityRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      throw new NotFoundException('Eligibility rule not found');
    }

    return await this.scholarshipPrisma.eligibilityRule.update({
      where: { id: ruleId },
      data: { reviewStatus },
    });
  }

  async updateCycleStatus(cycleId: string, status: CycleStatus) {
    const cycle = await this.scholarshipPrisma.scholarshipCycle.findUnique({
      where: { id: cycleId },
    });

    if (!cycle) {
      throw new NotFoundException('Scholarship cycle not found');
    }

    return await this.scholarshipPrisma.scholarshipCycle.update({
      where: { id: cycleId },
      data: { status },
    });
  }
}

