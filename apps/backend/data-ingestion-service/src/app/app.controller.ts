import { Body, Controller, Post, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Controller('ingestion')
export class AppController {
  constructor(
    @Inject('INGESTION_SERVICE') private readonly client: ClientProxy,
  ) {}

  @Post('upload')
  async uploadFile(@Body() body: any) {
    // 1. Extraemos los registros que vienen del frontend
    const { records } = body;

    if (!records || !Array.isArray(records)) {
      return { status: 'error', message: 'No records found in payload' };
    }

    // 2. Emitimos CADA registro individualmente a RabbitMQ
    // IMPORTANTE: El nombre del evento DEBE ser 'course_created'
    records.forEach((row: any) => {
      this.client.emit('course_created', row);
    });
    
    console.log(`--- ETL: Distributed ${records.length} courses to RabbitMQ ---`);

    return { 
      status: 'success', 
      message: 'Academic data queued for processing' 
    };
  }
}