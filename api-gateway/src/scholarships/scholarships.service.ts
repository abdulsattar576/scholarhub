import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable, firstValueFrom } from 'rxjs';

interface ScholarshipServiceClient {
  searchScholarships(data: any): Observable<any>;
  getScholarship(data: { id: string; cycleId?: string }): Observable<any>;
  evaluateEligibility(data: any): Observable<any>;
}

@Injectable()
export class ScholarshipsService implements OnModuleInit {
  private scholarshipService: ScholarshipServiceClient;

  constructor(@Inject('SCHOLARSHIP_PACKAGE') private readonly client: any) {}

  onModuleInit() {
    this.scholarshipService = this.client.getService('ScholarshipService') as ScholarshipServiceClient;
  }

  async search(query: {
    q?: string;
    country?: string;
    degree?: number;
    funding?: number;
    page?: number;
    pageSize?: number;
  }) {
    const payload = {
      query: query.q || '',
      countryCode: query.country || '',
      degreeLevel: query.degree || 0,
      fundingType: query.funding || 0,
      page: query.page || 1,
      pageSize: query.pageSize || 10,
    };

    return await firstValueFrom(this.scholarshipService.searchScholarships(payload));
  }

  async findOne(id: string) {
    return await firstValueFrom(this.scholarshipService.getScholarship({ id }));
  }

  async evaluateEligibility(payload: {
    scholarshipId: string;
    cycleId?: string;
    studentProfile: any;
  }) {
    return await firstValueFrom(this.scholarshipService.evaluateEligibility(payload));
  }
}
