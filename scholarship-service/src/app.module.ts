import { Module } from '@nestjs/common';
import { ScholarshipController } from './scholarship/scholarship.controller';
import { ScholarshipService } from './scholarship/scholarship.service';
import { IngestionService } from './ingestion/ingestion.service';

@Module({
  imports: [],
  controllers: [ScholarshipController],
  providers: [ScholarshipService, IngestionService],
  exports: [IngestionService],
})
export class AppModule {}

