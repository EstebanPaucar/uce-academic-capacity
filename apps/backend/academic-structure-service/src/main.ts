import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app/app.module';

async function bootstrap() {
  // 1. Crear la instancia de la aplicación HTTP
  const app = await NestFactory.create(AppModule);

  // 2. Configuraciones globales
  app.enableCors();
  app.setGlobalPrefix('api');

  // 3. Conectar RabbitMQ como microservicio (Híbrido)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://guest:guest@localhost:5672'],
      queue: 'file_processing_queue',
      queueOptions: { durable: true },
    },
  });

  // 4. Iniciar AMBOS: Microservicio y Servidor HTTP
  // IMPORTANTE: No llames a listen más de una vez
  await app.startAllMicroservices();
  await app.listen(3001);
  
  console.log('--- Academic Structure Service is running on port 3001 ---');
}

// 5. ASEGÚRATE DE QUE ESTO SOLO ESTÉ UNA VEZ AL FINAL
bootstrap();