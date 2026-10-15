import { Module } from '@nestjs/common';
import { ScholarshipController } from './scholarship/scholarship.controller';
import { ScholarshipService } from './scholarship/scholarship.service';
import { IngestionService } from './ingestion/ingestion.service';
import { EligibilityEngineService } from './eligibility/eligibility-engine.service';

@Module({
  imports: [],
  controllers: [ScholarshipController],
  providers: [ScholarshipService, IngestionService, EligibilityEngineService],
  exports: [IngestionService, EligibilityEngineService],
})
export class AppModule {}

