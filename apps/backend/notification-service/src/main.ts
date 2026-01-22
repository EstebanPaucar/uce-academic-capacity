import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.setGlobalPrefix('api');

  // Conectar a la nueva cola dedicada
  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
      queue: 'notification_queue', // Coincide con Go
      noAck: false,
      queueOptions: { durable: true },
    },
  });

  await app.startAllMicroservices();
  await app.listen(3007);
  Logger.log(`🔔 Notification Service running on port 3007`);
}
bootstrap();