import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ScholarshipService } from './scholarship.service';

@Controller()
export class ScholarshipController {
  constructor(private readonly scholarshipService: ScholarshipService) {}

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

  @GrpcMethod('ScholarshipService', 'Health')
  health() {
    return { ready: true };
  }
}

