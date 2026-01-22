import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt'; // Necesario para verificar el Token

@Module({
  imports: [
    // 1. Configuración JWT (Para que el Guard funcione)
    JwtModule.register({
      secret: 'SECRET_KEY_UCE_2026', // ⚠️ Asegúrate de que coincida con tu Auth Service
      signOptions: { expiresIn: '1h' },
    }),

    // 2. Cliente RabbitMQ (Para enviar eventos a Go y Structure)
    ClientsModule.register([
      {
        name: 'RULES_MQ', // 🚩 Nombre de inyección
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: 'rules_updates_queue', // La cola donde todos escuchan cambios
          queueOptions: {
            durable: true
          },
        },
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}