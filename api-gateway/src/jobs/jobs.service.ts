import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaClient as ApplicationPrismaClient, JobStatus } from '@prisma/application-client';
import { AdminService } from '../admin/admin.service';
import { StudioService } from '../studio/studio.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private applicationPrisma: ApplicationPrismaClient;

  constructor(
    private readonly adminService: AdminService,
    private readonly studioService: StudioService,
  ) {
    this.applicationPrisma = new ApplicationPrismaClient();
  }

  async enqueueJob(
    jobType: string,
    payload: any,
    options?: {
      ownerUserId?: string;
      entityId?: string;
      idempotencyKey?: string;
    },
  ) {
    // 1. Idempotency Check
    if (options?.idempotencyKey) {
      const existing = await this.applicationPrisma.backgroundJob.findUnique({
        where: { idempotencyKey: options.idempotencyKey },
      });
      if (existing) {
        this.logger.log(`Idempotent job hit for key: ${options.idempotencyKey}. Returning existing job ${existing.id}`);
        return existing;
      }
    }

    // 2. Insert Durable Background Job
    const job = await this.applicationPrisma.backgroundJob.create({
      data: {
        jobType,
        payload: payload ? payload : undefined,
        ownerUserId: options?.ownerUserId,
        entityId: options?.entityId,
        idempotencyKey: options?.idempotencyKey,
        status: JobStatus.QUEUED,
        attempts: 0,
        progress: 0,
      },
    });

    this.logger.log(`Enqueued job ${job.id} of type ${jobType}`);

    // 3. Asynchronously trigger background processing (non-blocking HTTP response)
    setImmediate(() => {
      this.processJob(job.id).catch((err) => {
        this.logger.error(`Unhandled error in job runner for ${job.id}:`, err);
      });
    });

    return job;
  }

  async processJob(jobId: string) {
    const job = await this.applicationPrisma.backgroundJob.findUnique({
      where: { id: jobId },
    });

    if (!job || job.status === JobStatus.CANCELLED) {
      return;
    }

    // Mark as RUNNING
    await this.applicationPrisma.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.RUNNING,
        attempts: job.attempts + 1,
        progress: 15,
      },
    });

    try {
      let result: any = null;

      switch (job.jobType) {
        case 'SCHOLARSHIP_LIFECYCLE_AUDIT': {
          result = await this.adminService.reconcileLifecycle();
          break;
        }

        case 'AI_MOTIVATION_LETTER_DRAFT': {
          result = await this.studioService.generateMotivationLetter(job.payload as any);
          break;
        }

        case 'AI_ACADEMIC_CV_DRAFT': {
          result = await this.studioService.generateAcademicCv(job.payload as any);
          break;
        }

        case 'DOCUMENT_EXPORT_CV': {
          const p = job.payload as any;
          result = this.studioService.exportAcademicCv(p.cvData, p.format);
          break;
        }

        case 'DOCUMENT_EXPORT_LETTER': {
          const p = job.payload as any;
          result = this.studioService.exportMotivationLetter(p.letterData, p.format);
          break;
        }

        default:
          throw new Error(`Unknown job type: ${job.jobType}`);
      }

      // Mark COMPLETED
      await this.applicationPrisma.backgroundJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.COMPLETED,
          progress: 100,
          result: result ?? {},
          completedAt: new Date(),
        },
      });

      this.logger.log(`Job ${jobId} (${job.jobType}) successfully completed.`);
    } catch (err: any) {
      this.logger.error(`Job ${jobId} failed: ${err.message}`);
      await this.applicationPrisma.backgroundJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.FAILED,
          errorMessage: err.message || String(err),
          updatedAt: new Date(),
        },
      });
    }
  }

  async getJob(jobId: string, requestUserId?: string, isAdmin = false) {
    const job = await this.applicationPrisma.backgroundJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    // Tenant / Owner security check
    if (job.ownerUserId && requestUserId && job.ownerUserId !== requestUserId && !isAdmin) {
      throw new ForbiddenException('You do not have permission to view this job');
    }

    return job;
  }

  async getUserJobs(userId: string) {
    return await this.applicationPrisma.backgroundJob.findMany({
      where: { ownerUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}

