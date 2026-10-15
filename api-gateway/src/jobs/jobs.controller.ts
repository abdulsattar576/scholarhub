import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('v1/jobs')
@UseGuards(AuthGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post('lifecycle-audit')
  async triggerLifecycleAudit(@Req() req: any) {
    const isAdmin = req.user?.role === 'ADMIN';
    const idempotencyKey = `lifecycle-audit-${new Date().toISOString().slice(0, 13)}`; // 1-hour window idempotency

    return await this.jobsService.enqueueJob(
      'SCHOLARSHIP_LIFECYCLE_AUDIT',
      {},
      {
        ownerUserId: req.user?.id,
        idempotencyKey,
      },
    );
  }

  @Post('motivation-letter')
  async triggerMotivationLetterJob(
    @Req() req: any,
    @Body()
    body: {
      scholarshipTitle: string;
      providerName: string;
      targetDegree?: string;
      fieldOfStudy?: string;
      instructions?: string;
      studentPersonalContext?: string;
      idempotencyKey?: string;
    },
  ) {
    const profile = req.user.profile || {};
    const payload = {
      scholarshipTitle: body.scholarshipTitle,
      providerName: body.providerName,
      targetDegree: body.targetDegree || profile.degreeLevel || 'MASTERS',
      fieldOfStudy: body.fieldOfStudy || profile.fieldOfStudy || 'Computer Science',
      instructions: body.instructions,
      studentName: req.user.name || 'Student',
      nationality: profile.nationality || 'PK',
      cgpa: profile.cgpa,
      gradingScale: profile.gradingScale,
      studentPersonalContext: body.studentPersonalContext,
    };

    return await this.jobsService.enqueueJob(
      'AI_MOTIVATION_LETTER_DRAFT',
      payload,
      {
        ownerUserId: req.user?.id,
        entityId: body.scholarshipTitle,
        idempotencyKey: body.idempotencyKey,
      },
    );
  }

  @Post('academic-cv')
  async triggerAcademicCvJob(
    @Req() req: any,
    @Body()
    body: {
      targetScholarship?: string;
      technicalSkills?: string;
      projectsSummary?: string;
      idempotencyKey?: string;
    },
  ) {
    const profile = req.user.profile || {};
    const payload = {
      studentName: req.user.name || 'Scholarship Applicant',
      email: req.user.email,
      nationality: profile.nationality || 'Pakistani',
      degreeLevel: profile.degreeLevel || 'BACHELORS',
      fieldOfStudy: profile.fieldOfStudy || 'Computer Science',
      cgpa: profile.cgpa,
      gradingScale: profile.gradingScale,
      graduationYear: profile.graduationYear,
      targetScholarship: body.targetScholarship,
      technicalSkills: body.technicalSkills,
      projectsSummary: body.projectsSummary,
    };

    return await this.jobsService.enqueueJob(
      'AI_ACADEMIC_CV_DRAFT',
      payload,
      {
        ownerUserId: req.user?.id,
        idempotencyKey: body.idempotencyKey,
      },
    );
  }

  @Get(':id')
  async getJobStatus(@Param('id') id: string, @Req() req: any) {
    const isAdmin = req.user?.role === 'ADMIN';
    return await this.jobsService.getJob(id, req.user?.id, isAdmin);
  }

  @Get()
  async getUserJobs(@Req() req: any) {
    return await this.jobsService.getUserJobs(req.user.id);
  }
}

