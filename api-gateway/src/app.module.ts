import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScholarshipsModule } from './scholarships/scholarships.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [ScholarshipsModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

