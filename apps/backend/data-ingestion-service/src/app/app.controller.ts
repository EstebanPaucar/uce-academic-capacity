import { Controller, Post, UploadedFile, UseInterceptors, Inject, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientProxy } from '@nestjs/microservices';
import { AppService } from './app.service';
import 'multer'; // 👈 Esta línea activa la definición de tipos para Express


@Controller('ingestion')
export class AppController {
  constructor(
    @Inject('INGESTION_SERVICE') private readonly client: ClientProxy,
    private readonly appService: AppService // Inyectamos el servicio para la lógica de Excel
  ) {}

  @Post('upload-excel')
  @UseInterceptors(FileInterceptor('file')) // El campo en el form-data debe llamarse 'file'
  async uploadExcel(@UploadedFile() file: Express.Multer.File) {
    
    if (!file) {
      throw new BadRequestException('No se ha detectado ningún archivo en la petición.');
    }

    // 1. Extraemos los datos del Excel usando el Servicio
    const records = this.appService.parseExcel(file.buffer);

    // 2. Emitimos CADA registro individualmente a RabbitMQ
    // Mantenemos el nombre del evento 'course_created' para compatibilidad
    records.forEach((row: any) => {
      this.client.emit('course_created', row);
    });
    
    console.log(`--- ETL Cloud: Distributed ${records.length} courses to RabbitMQ ---`);

    return { 
      status: 'success', 
      totalRecords: records.length,
      message: 'Excel data extracted and queued for processing' 
    };
  }
}