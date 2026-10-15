import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScholarshipsModule } from './scholarships/scholarships.module';
import { AuthModule } from './auth/auth.module';
import { ApplicationsModule } from './applications/applications.module';
import { StudioModule } from './studio/studio.module';

@Module({
  imports: [ScholarshipsModule, AuthModule, ApplicationsModule, StudioModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

