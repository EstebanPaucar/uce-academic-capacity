import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.setGlobalPrefix('api');

  // Conectar a RabbitMQ para recibir datos del ETL
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://guest:guest@localhost:5672'],
      queue: 'file_processing_queue',
      queueOptions: { durable: true },
    },
  });

  await app.startAllMicroservices(); // Inicia la escucha de mensajes
  await app.listen(3001);
}
bootstrap();
