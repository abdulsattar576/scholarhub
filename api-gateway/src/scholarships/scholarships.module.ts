import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { ScholarshipsController } from './scholarships.controller';
import { ScholarshipsService } from './scholarships.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'SCHOLARSHIP_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'scholarship.v1',
          protoPath: join(__dirname, '../../../proto/scholarship/v1/scholarship.proto'),
          url: process.env.SCHOLARSHIP_GRPC_URL || 'localhost:50051',
        },
      },
    ]),
  ],
  controllers: [ScholarshipsController],
  providers: [ScholarshipsService],
  exports: [ScholarshipsService],
})
export class ScholarshipsModule {}

