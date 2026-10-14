import { IngestionService, ExtractedScholarshipPayload } from './ingestion.service';

describe('IngestionService', () => {
  let service: IngestionService;
  let mockPrisma: any;

  beforeEach(() => {
    service = new IngestionService();
    mockPrisma = {
      $transaction: jest.fn().mockImplementation(async (callback) => {
        const tx = {
          scholarshipProvider: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'mock-provider-1', name: 'TUM' }),
          },
          scholarship: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'mock-scholarship-1', title: 'Test Scholarship' }),
          },
          scholarshipCycle: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'mock-cycle-1', cycleLabel: '2026/2027' }),
          },
          eligibilityRule: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            create: jest.fn().mockResolvedValue({ id: 'rule-1' }),
          },
          documentRequirement: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            create: jest.fn().mockResolvedValue({ id: 'doc-1' }),
          },
          fundingComponent: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            create: jest.fn().mockResolvedValue({ id: 'fund-1' }),
          },
        };
        return await callback(tx);
      }),
    };
    (service as any).prisma = mockPrisma;
  });

  it('should successfully store extracted scholarship payload', async () => {
    const samplePayload: ExtractedScholarshipPayload = {
      title: 'TUM International Scholarship',
      provider: 'TUM',
      official_url: 'https://tum.de/scholarship',
      target_countries: ['DE'],
      degree_levels: ['MASTERS'],
      funding: {
        funding_type: 'PARTIAL',
        monthly_stipend: 500,
        currency: 'EUR',
      },
      cycle: {
        cycle_label: 'Winter 2026',
        deadline_date: '2026-10-15',
      },
      eligibility_rules: [
        {
          rule_type: 'NATIONALITY',
          operator: 'EQUALS',
          value: 'Non-EU',
          evidence_quote: 'Must be international student',
        },
      ],
      document_requirements: [
        {
          document_type: 'ACADEMIC_CV',
          is_mandatory: true,
          instructions: 'Europass format',
        },
      ],
    };

    const result = await service.storeExtractedScholarship(samplePayload);

    expect(result.success).toBe(true);
    expect(result.providerId).toBe('mock-provider-1');
    expect(result.scholarshipId).toBe('mock-scholarship-1');
    expect(result.cycleId).toBe('mock-cycle-1');
    expect(result.rulesCount).toBe(1);
    expect(result.docsCount).toBe(1);
  });
});

