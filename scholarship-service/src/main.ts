import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const port = process.env.GRPC_PORT || '50051';
  
  // Resolve proto path both in dev and containerized structures
  const protoPath = process.env.PROTO_PATH || 
    join(__dirname, '../../proto/scholarship/v1/scholarship.proto');

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: 'scholarship.v1',
      protoPath: protoPath,
      url: `0.0.0.0:${port}`,
    },
  });

  await app.listen();
  console.log(`[ScholarshipService] gRPC microservice listening on port ${port}`);
}

bootstrap();

