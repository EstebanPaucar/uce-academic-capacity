import { Controller, Post, UploadedFile, UseInterceptors, Inject, Logger, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientProxy } from '@nestjs/microservices';
import { AppService } from './app.service';
import 'multer';

@Controller('ingestion')
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    @Inject('INGESTION_SERVICE') private readonly client: ClientProxy,
    private readonly appService: AppService
  ) {}

  // 1. Cambiamos a POST upload-excel y usamos interceptor de archivos [cite: 2026-01-18]
  @Post('upload-excel')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    
    if (!file) {
      throw new BadRequestException('No se ha subido ningún archivo.');
    }

    // 2. Procesamos el buffer usando la lógica de salto de filas (range: 5) [cite: 2026-01-18]
    const records = this.appService.parseExcel(file.buffer);

    // 3. Emitimos CADA registro a RabbitMQ con el evento 'course_created' [cite: 2026-01-18]
    records.forEach((row: any) => {
      this.client.emit('course_created', row);
    });

    this.logger.log(`--- ETL: Distributed ${records.length} courses to RabbitMQ ---`);

    return { 
      status: 'success', 
      totalProcessed: records.length,
      message: 'Datos académicos enviados a la cola de procesamiento' 
    };
  }
}