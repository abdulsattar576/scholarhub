import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ScholarshipService } from './scholarship.service';
import { EligibilityEngineService } from '../eligibility/eligibility-engine.service';

@Controller()
export class ScholarshipController {
  constructor(
    private readonly scholarshipService: ScholarshipService,
    private readonly eligibilityEngine: EligibilityEngineService,
  ) {}

  @GrpcMethod('ScholarshipService', 'SearchScholarships')
  searchScholarships(data: any) {
    return this.scholarshipService.searchScholarships(data);
  }

  @GrpcMethod('ScholarshipService', 'GetScholarship')
  getScholarship(data: { id: string; cycleId?: string }) {
    return this.scholarshipService.getScholarship(data.id);
  }

  @GrpcMethod('ScholarshipService', 'SubmitCandidate')
  submitCandidate(data: any) {
    return this.scholarshipService.submitCandidate(data);
  }

  @GrpcMethod('ScholarshipService', 'ApproveCandidate')
  approveCandidate(data: any) {
    return this.scholarshipService.approveCandidate(data);
  }

  @GrpcMethod('ScholarshipService', 'ExpireCycles')
  expireCycles(data: { referenceTimestampUtc: string }) {
    return this.scholarshipService.expireCycles(data.referenceTimestampUtc);
  }

  @GrpcMethod('ScholarshipService', 'EvaluateEligibility')
  async evaluateEligibility(data: any) {
    const res = await this.eligibilityEngine.evaluate(
      data.scholarshipId || data.scholarship_id,
      data.cycleId || data.cycle_id,
      data.studentProfile || data.student_profile || {},
    );
    return {
      overallStatus: res.overallStatus,
      summaryExplanation: res.summaryExplanation,
      results: res.results.map((r) => ({
        ruleId: r.ruleId,
        ruleType: r.ruleType,
        status: r.status,
        reason: r.reason,
        evidenceSource: r.evidenceSource || '',
      })),
    };
  }

  @GrpcMethod('ScholarshipService', 'Health')
  health() {
    return { ready: true };
  }
}

