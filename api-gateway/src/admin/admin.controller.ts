import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '../auth/auth.guard';
import { OpportunityStatus, CycleStatus } from '@prisma/scholarship-client';

@Controller('v1/admin')
@UseGuards(AuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  async getOverview() {
    return await this.adminService.getOverview();
  }

  @Get('scholarships')
  async getScholarships() {
    return await this.adminService.getScholarshipsForAdmin();
  }

  @Patch('scholarships/:id/status')
  async updateScholarshipStatus(
    @Param('id') id: string,
    @Body('status') status: OpportunityStatus,
  ) {
    return await this.adminService.updateScholarshipStatus(id, status);
  }

  @Patch('rules/:ruleId/status')
  async updateRuleStatus(
    @Param('ruleId') ruleId: string,
    @Body('reviewStatus') reviewStatus: string,
  ) {
    return await this.adminService.updateRuleReviewStatus(ruleId, reviewStatus);
  }

  @Patch('cycles/:cycleId/status')
  async updateCycleStatus(
    @Param('cycleId') cycleId: string,
    @Body('status') status: CycleStatus,
  ) {
    return await this.adminService.updateCycleStatus(cycleId, status);
  }
}

