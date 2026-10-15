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

  async reconcileLifecycle() {
    const now = new Date();
    const cycles = await this.scholarshipPrisma.scholarshipCycle.findMany({
      include: {
        scholarship: true,
      },
    });

    const closedCycles: Array<{ id: string; title: string; cycleLabel: string; deadlineAt: Date; previousStatus: CycleStatus }> = [];
    const openedCycles: Array<{ id: string; title: string; cycleLabel: string; openAt: Date }> = [];
    const approachingDeadlines: Array<{
      cycleId: string;
      scholarshipTitle: string;
      cycleLabel: string;
      deadlineAt: Date;
      daysRemaining: number;
      urgencyLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'UPCOMING';
      affectedStudentApplications: number;
    }> = [];

    for (const cycle of cycles) {
      // 1. Expiration Check: If deadline has passed and cycle is not already closed or archived
      if (cycle.deadlineAt && new Date(cycle.deadlineAt).getTime() < now.getTime()) {
        if (cycle.status !== CycleStatus.CLOSED && cycle.status !== CycleStatus.ARCHIVED) {
          await this.scholarshipPrisma.scholarshipCycle.update({
            where: { id: cycle.id },
            data: { status: CycleStatus.CLOSED },
          });
          closedCycles.push({
            id: cycle.id,
            title: cycle.scholarship.title,
            cycleLabel: cycle.cycleLabel,
            deadlineAt: cycle.deadlineAt,
            previousStatus: cycle.status,
          });
          this.logger.log(`Lifecycle: Cycle "${cycle.cycleLabel}" of "${cycle.scholarship.title}" expired. Status transitioned to CLOSED.`);
        }
      } else {
        // 2. Opening Check: If cycle is upcoming and openAt has arrived
        if (cycle.openAt && new Date(cycle.openAt).getTime() <= now.getTime() && cycle.status === CycleStatus.UPCOMING) {
          await this.scholarshipPrisma.scholarshipCycle.update({
            where: { id: cycle.id },
            data: { status: CycleStatus.OPEN },
          });
          openedCycles.push({
            id: cycle.id,
            title: cycle.scholarship.title,
            cycleLabel: cycle.cycleLabel,
            openAt: cycle.openAt,
          });
          this.logger.log(`Lifecycle: Upcoming cycle "${cycle.cycleLabel}" of "${cycle.scholarship.title}" reached start date. Transitioned to OPEN.`);
        }

        // 3. Deadline Approaching Check (if deadline is within next 14 days)
        if (cycle.deadlineAt) {
          const diffMs = new Date(cycle.deadlineAt).getTime() - now.getTime();
          const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

          if (daysRemaining <= 14 && cycle.status === CycleStatus.OPEN) {
            let urgencyLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'UPCOMING' = 'UPCOMING';
            if (daysRemaining <= 1) urgencyLevel = 'CRITICAL';
            else if (daysRemaining <= 3) urgencyLevel = 'HIGH';
            else if (daysRemaining <= 7) urgencyLevel = 'MEDIUM';

            const affectedApplications = await this.applicationPrisma.application.count({
              where: { scholarshipId: cycle.scholarshipId },
            });

            approachingDeadlines.push({
              cycleId: cycle.id,
              scholarshipTitle: cycle.scholarship.title,
              cycleLabel: cycle.cycleLabel,
              deadlineAt: cycle.deadlineAt,
              daysRemaining,
              urgencyLevel,
              affectedStudentApplications: affectedApplications,
            });
          }
        }
      }
    }

    approachingDeadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return {
      evaluatedAt: now.toISOString(),
      totalCyclesEvaluated: cycles.length,
      closedCount: closedCycles.length,
      openedCount: openedCycles.length,
      closedCycles,
      openedCycles,
      approachingDeadlines,
      summary: `Evaluated ${cycles.length} cycles. ${closedCycles.length} auto-closed due to passed deadlines. ${openedCycles.length} transitioned to OPEN. ${approachingDeadlines.length} cycles have deadlines in the next 14 days.`,
    };
  }
}

