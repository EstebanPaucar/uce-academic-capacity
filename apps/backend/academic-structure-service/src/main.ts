import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api');

  // 🚩 CORRECCIÓN: Conexión al final del pipeline
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
      // Escuchamos la cola de resultados procesados por Go
      queue: 'calculation_results_queue', 
      
      // Confirmación manual obligatoria para evitar pérdida de datos [cite: 2026-01-18]
      noAck: false, 
      
      queueOptions: { 
        // Persistencia garantizada para AWS Academy [cite: 2026-01-06]
        durable: true 
      },
    },
  });

  await app.startAllMicroservices();
  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log(`--- 🚀 Academic Structure Service is running on port ${port} ---`);
  // Log actualizado para reflejar la nueva cola
  console.log('--- 📦 Listening to results from Go: calculation_results_queue ---');
}

bootstrap();