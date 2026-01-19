import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app/app.module';

async function bootstrap() {
  // 1. Crear la instancia de la aplicación HTTP (Puerto 3001)
  const app = await NestFactory.create(AppModule);

  // 2. Configuraciones globales de red
  app.enableCors();
  app.setGlobalPrefix('api');

  // 3. Conectar RabbitMQ como microservicio (Arquitectura Híbrida)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      // Priorizamos variables de entorno para la conectividad en AWS Academy [cite: 2026-01-06]
      urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
      // 🚩 CAMBIO CRÍTICO: Debe coincidir exactamente con el Productor (data-ingestion)
      queue: 'academic_data_queue',
      queueOptions: { 
        durable: true // Garantiza que los mensajes no se pierdan si el contenedor se reinicia [cite: 2026-01-06]
      },
    },
  });

  // 4. Iniciar AMBOS: Microservicio (Eventos) y Servidor HTTP (API REST)
  await app.startAllMicroservices();
  await app.listen(3001);
  
  console.log('--- 🚀 Academic Structure Service is running on port 3001 ---');
  console.log('--- 📦 Listening to queue: academic_data_queue ---');
}

bootstrap();