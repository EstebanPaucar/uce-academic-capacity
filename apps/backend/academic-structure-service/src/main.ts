import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app/app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api');

  // 🚩 CONEXIÓN 1: Escuchar RESULTADOS de Go (Para guardar en BD)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
      queue: 'calculation_results_queue', 
      noAck: false, 
      queueOptions: { durable: true },
    },
  });

  // 🚩 CONEXIÓN 2: Escuchar REGLAS (Para iniciar recálculo masivo)
  // Esta es la pieza que te faltaba para que NestJS se entere del cambio
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
      queue: 'structure_rules_queue', // ⚠️ COLA EXCLUSIVA PARA NEST
      noAck: false, 
      queueOptions: { durable: true },
    },
  });

  await app.startAllMicroservices();
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  Logger.log(`🚀 Academic Structure Service is running on port ${port}`);
  Logger.log('🐰 Listening to: calculation_results_queue AND structure_rules_queue');
}

bootstrap();