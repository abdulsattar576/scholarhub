import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScholarshipsModule } from './scholarships/scholarships.module';

@Module({
  imports: [ScholarshipsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
