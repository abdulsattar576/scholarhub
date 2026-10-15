import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ScholarshipsService } from './scholarships.service';

@Controller('v1/scholarships')
export class ScholarshipsController {
  constructor(private readonly scholarshipsService: ScholarshipsService) {}

  @Get()
  async search(
    @Query('q') q?: string,
    @Query('country') country?: string,
    @Query('degree') degree?: string,
    @Query('funding') funding?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.scholarshipsService.search({
      q,
      country,
      degree: degree ? parseInt(degree, 10) : undefined,
      funding: funding ? parseInt(funding, 10) : undefined,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 10,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.scholarshipsService.findOne(id);
  }

  @Post(':id/evaluate')
  async evaluate(
    @Param('id') id: string,
    @Body() body: { cycleId?: string; studentProfile: any },
  ) {
    return this.scholarshipsService.evaluateEligibility({
      scholarshipId: id,
      cycleId: body?.cycleId,
      studentProfile: body?.studentProfile || {},
    });
  }
}

