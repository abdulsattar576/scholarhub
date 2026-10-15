import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { AuthGuard } from '../auth/auth.guard';
import { ApplicationState } from '@prisma/application-client';

@Controller('v1/applications')
@UseGuards(AuthGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  async getMyApplications(@Req() req: any) {
    return await this.applicationsService.getUserApplications(req.user.id);
  }

  @Post()
  async trackApplication(
    @Req() req: any,
    @Body()
    body: {
      scholarshipId: string;
      scholarshipTitle: string;
      providerName: string;
      cycleLabel?: string;
      targetDeadline?: string;
      initialDocuments?: Array<{
        documentType: string;
        requirementLevel: string;
        instructions?: string;
      }>;
    },
  ) {
    return await this.applicationsService.trackApplication(req.user.id, body);
  }

  @Patch(':id')
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { status: ApplicationState; notes?: string },
  ) {
    return await this.applicationsService.updateApplicationStatus(
      req.user.id,
      id,
      body.status,
      body.notes,
    );
  }

  @Patch(':id/documents/:docId')
  async updateDocument(
    @Req() req: any,
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Body()
    body: {
      isPrepared?: boolean;
      attestationDone?: boolean;
      translationDone?: boolean;
      notes?: string;
    },
  ) {
    return await this.applicationsService.updateDocumentStatus(
      req.user.id,
      id,
      docId,
      body,
    );
  }

  @Delete(':id')
  async deleteApplication(@Req() req: any, @Param('id') id: string) {
    return await this.applicationsService.deleteApplication(req.user.id, id);
  }
}

