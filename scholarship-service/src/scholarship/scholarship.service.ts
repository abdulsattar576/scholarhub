import { Injectable } from '@nestjs/common';

@Injectable()
export class ScholarshipService {
  searchScholarships(data: any) {
    return {
      items: [
        {
          id: 'mock-daad-001',
          providerId: 'daad-germany',
          providerName: 'DAAD (German Academic Exchange Service)',
          title: 'DAAD Study Scholarships - Master Studies for All Academic Disciplines',
          description: 'Fully funded scholarship for master studies at state-recognized universities in Germany.',
          officialUrl: 'https://www.daad.de/en/study-and-research-in-germany/scholarships/',
          fundingType: 1, // FUNDING_TYPE_FULL
          status: 2, // OPPORTUNITY_STATUS_PUBLISHED
          degreeLevels: [2], // DEGREE_LEVEL_MASTERS
          targetCountryCodes: ['DE'],
          activeCycle: {
            id: 'cycle-2027-01',
            scholarshipId: 'mock-daad-001',
            cycleLabel: '2026/2027 Academic Year',
            status: 4, // CYCLE_STATUS_OPEN
            openAtIso: '2026-06-01T00:00:00Z',
            deadlineAtIso: '2026-10-31T23:59:59Z',
            deadlineLocalDate: '2026-10-31',
            deadlineTimezone: 'Europe/Berlin',
            deadlinePrecision: 'DATETIME',
            verifiedAtIso: '2026-10-14T00:00:00Z',
          },
          lastVerifiedAtIso: '2026-10-14T00:00:00Z',
        },
      ],
      total: 1,
      page: data.page || 1,
      pageSize: data.pageSize || 10,
      totalPages: 1,
    };
  }

  getScholarship(id: string) {
    return {
      scholarship: {
        id: id || 'mock-daad-001',
        providerId: 'daad-germany',
        providerName: 'DAAD',
        title: 'DAAD Study Scholarships - Master Studies for All Academic Disciplines',
        description: 'Comprehensive funding for Pakistani graduates in German universities.',
        officialUrl: 'https://www.daad.de/en/study-and-research-in-germany/scholarships/',
        fundingType: 1,
        status: 2,
        cycles: [],
        eligibilityRules: [],
        documentRequirements: [],
        fundingComponents: [],
        lastVerifiedAtIso: '2026-10-14T00:00:00Z',
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

