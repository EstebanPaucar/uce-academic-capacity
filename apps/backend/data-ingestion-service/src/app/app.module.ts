import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'INGESTION_SERVICE',
        transport: Transport.RMQ,
        options: {
          // Usamos localhost para desarrollo local en Docker
          urls: ['amqp://guest:guest@localhost:5672'],
          queue: 'file_processing_queue',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}