import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices'; // 🚩 Import vital
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // 🚩 REGISTRO DEL CLIENTE RABBITMQ
    // Esto permite que el Controller use @Inject('CALCULATION_SERVICE')
    // y envíe los datos de vuelta a Go cuando cambian las reglas.
    ClientsModule.register([
      {
        name: 'CALCULATION_SERVICE', // Debe coincidir con el @Inject del Controller
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: 'academic_data_queue', // 🎯 La cola donde escucha el motor de Go
          queueOptions: {
            durable: true
          },
        },
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService
    // 🗑️ Eliminamos CapacityEngineService (Ahora usamos Go)
  ],
})
export class AppModule {}