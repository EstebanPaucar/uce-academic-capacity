import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: 'SECRET_KEY_UCE_2026', 
      signOptions: { expiresIn: '1h' },
    }),

    ClientsModule.register([
      // CLIENTE 1: Para el motor Go (Memoria RAM)
      {
        name: 'RULES_MQ', 
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: 'rules_updates_queue', 
          queueOptions: { durable: true },
        },
      },
      // 🚩 CLIENTE 2: Para Academic Structure (Base de Datos)
      {
        name: 'STRUCTURE_MQ', 
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: 'structure_rules_queue', // ⚠️ Debe coincidir con el main.ts de academic-structure
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}