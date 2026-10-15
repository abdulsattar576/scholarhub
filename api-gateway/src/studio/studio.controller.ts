import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { StudioService } from './studio.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('v1/studio')
@UseGuards(AuthGuard)
export class StudioController {
  constructor(private readonly studioService: StudioService) {}

  @Post('motivation-letter')
  async generateMotivationLetter(
    @Req() req: any,
    @Body()
    body: {
      scholarshipTitle: string;
      providerName: string;
      targetDegree: string;
      fieldOfStudy: string;
      instructions?: string;
      studentPersonalContext?: string;
    },
  ) {
    const profile = req.user.profile || {};
    return await this.studioService.generateMotivationLetter({
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
    });
  }

  @Post('academic-cv')
  async generateAcademicCv(
    @Req() req: any,
    @Body()
    body: {
      targetScholarship?: string;
      technicalSkills?: string;
      projectsSummary?: string;
    },
  ) {
    const profile = req.user.profile || {};
    return await this.studioService.generateAcademicCv({
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
    });
  }
}

