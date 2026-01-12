import { Body, Controller, Post, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Controller('ingestion')
export class AppController {
  constructor(
    @Inject('INGESTION_SERVICE') private readonly client: ClientProxy,
  ) {}

  @Post('upload')
  async uploadFile(@Body() fileData: any) {
    // Emitimos el evento 'file_uploaded' hacia RabbitMQ
    this.client.emit('file_uploaded', {
      timestamp: new Date(),
      payload: fileData,
    });
    
    return { 
      status: 'success', 
      message: 'Data queued for processing' 
    };
  }
}