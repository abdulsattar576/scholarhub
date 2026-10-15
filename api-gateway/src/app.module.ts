import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScholarshipsModule } from './scholarships/scholarships.module';
import { AuthModule } from './auth/auth.module';
import { ApplicationsModule } from './applications/applications.module';
import { StudioModule } from './studio/studio.module';
import { AdminModule } from './admin/admin.module';
import { ReadinessModule } from './readiness/readiness.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [ScholarshipsModule, AuthModule, ApplicationsModule, StudioModule, AdminModule, ReadinessModule, JobsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

