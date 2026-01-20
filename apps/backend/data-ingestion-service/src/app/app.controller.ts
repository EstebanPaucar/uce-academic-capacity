import { Controller, Post, UseGuards, UploadedFile, UseInterceptors, Inject, Logger, BadRequestException, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientProxy } from '@nestjs/microservices';
import { AppService } from './app.service';
import 'multer';
import { AuthGuard } from '@nestjs/passport';


@Controller('ingestion')
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    @Inject('INGESTION_SERVICE') private readonly client: ClientProxy,
    private readonly appService: AppService
  ) {}

  // 🚩 1. NUEVA RUTA PARA EL BOTÓN DE REACT (JSON) [cite: 2026-01-19]
  // Esta ruta atiende el POST a /api/ingestion/upload
  @Post('upload')
  async handleManualUpload(@Body() body: { records: any[] }) {
    if (!body.records || body.records.length === 0) {
      throw new BadRequestException('No hay registros para procesar.');
    }

    this.logger.log(`Recibidos ${body.records.length} registros manuales desde React.`);

    // Enviamos a RabbitMQ
    body.records.forEach((row: any) => {
      this.client.emit('course_created', row);
    });

    return { 
      status: 'success', 
      message: 'Simulación de carga enviada a la cola' 
    };
  }

  // 🚩 2. RUTA PARA ARCHIVOS REALES (EXCEL) [cite: 2026-01-18]
  // Esta ruta atiende el POST a /api/ingestion/upload-excel
  @Post('upload-excel')
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(AuthGuard('jwt')) // 🔒 ESTE ES EL ESCUDO
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se ha subido ningún archivo.');
    }

    const records = this.appService.parseExcel(file.buffer);

    records.forEach((row: any) => {
      this.client.emit('course_created', row);
    });

    this.logger.log(`--- ETL: Distributed ${records.length} courses to RabbitMQ ---`);

    return { 
      status: 'success', 
      totalProcessed: records.length,
      message: 'Archivo recibido y procesado con seguridad',
      filename: file.originalname, 
    };
  }
}