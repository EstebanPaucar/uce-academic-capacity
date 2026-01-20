import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ClientsModule.register([
      {
        name: 'INGESTION_SERVICE',
        transport: Transport.RMQ,
        options: {
          // 1. Priorizamos variables de entorno para AWS Academy [cite: 2026-01-06]
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          // 2. Sincronizamos el nombre de la cola con el Consumidor [cite: 2026-01-18]
          queue: 'academic_data_queue',
          queueOptions: {
            durable: true, // Persistencia de mensajes ante reinicios [cite: 2026-01-06]
          },
        },
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService,JwtStrategy],
})
export class AppModule {}