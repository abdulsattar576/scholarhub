import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ReadinessService } from './readiness.service';

@Controller('v1/readiness')
export class ReadinessController {
  constructor(private readonly readinessService: ReadinessService) {}

  @Get('guides')
  getAllGuides() {
    return {
      guides: this.readinessService.getAllGuides(),
    };
  }

  @Get('guides/:id')
  getGuide(@Param('id') id: string) {
    const guide = this.readinessService.getGuide(id);
    if (!guide) {
      throw new NotFoundException(`Guide for "${id}" not found.`);
    }
    return guide;
  }
}

