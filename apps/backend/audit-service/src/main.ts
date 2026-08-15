import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices'; // Importante
import { AppModule } from './app/app.module';

async function bootstrap() {
  // 1. Crear la instancia base de la aplicación (HTTP)
  
  const app = await NestFactory.create(AppModule);
  
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // 2. CONECTAR EL MICROSERVICIO (RabbitMQ)
  // Esto permite que el servicio escuche mensajes mientras sigue atendiendo peticiones HTTP
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
      queue: 'audit_queue',
      queueOptions: { 
        durable: true // Sincronizado con tu productor de ingesta
      },
    },
  });

  // 3. INICIAR EL ESCUCHA DE MENSAJES
  // Sin esta línea, RabbitMQ nunca se activará
  await app.startAllMicroservices();

  const port = process.env.PORT || 3003;
  app.enableCors();
  // 4. INICIAR EL SERVIDOR HTTP
  await app.listen(port);

  Logger.log(
    `🚀 Audit Service is running as Hybrid (HTTP/RMQ) on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();