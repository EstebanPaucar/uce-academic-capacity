import { Controller, Post, UseGuards, UploadedFile, UseInterceptors, Inject, Logger, BadRequestException, Body, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientProxy } from '@nestjs/microservices';
import { AppService } from './app.service';
import { AuthGuard } from '@nestjs/passport';
import 'multer';

@Controller('ingestion')
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    // 🚩 CAMBIO: El nombre de la variable debe ser 'client' para que 'this.client' funcione
    @Inject('AUDIT_SERVICE') private readonly client: ClientProxy, 
    private readonly appService: AppService
  ) {}

  // 🚩 1. RUTA PARA REGISTROS MANUALES (JSON)
  @Post('upload')
  async handleManualUpload(@Body() body: { records: any[] }) {
    if (!body.records || body.records.length === 0) {
      throw new BadRequestException('No hay registros para procesar.');
    }

    this.logger.log(`Recibidos ${body.records.length} registros manuales.`);

    body.records.forEach((row: any) => {
      // Ahora 'this.client' sí existe
      this.client.emit('course_created', row);
    });

    return { status: 'success', message: 'Simulación de carga enviada' };
  }

  // 🚩 2. RUTA PARA ARCHIVOS REALES (EXCEL) PROTEGIDA
  @Post('upload-excel')
  @UseGuards(AuthGuard('jwt')) 
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('No se ha subido ningún archivo.');
    }

    const records = this.appService.parseExcel(file.buffer);

    records.forEach((row: any) => {
      // Envía datos al Motor de Cálculo (Go)
      this.client.emit('course_created', row);
    });

    // Envía log al Audit Service (MongoDB)
    this.client.emit('log_created', {
      userId: req.user.userId,
      username: req.user.username,
      action: 'EXCEL_UPLOAD',
      service: 'data-ingestion-service',
      metadata: { 
        filename: file.originalname, 
        totalRecords: records.length 
      }
    });

    this.logger.log(`--- ETL: Distributed ${records.length} courses and sent Audit Log ---`);

    return { 
      status: 'success', 
      totalProcessed: records.length,
      message: 'Archivo procesado y auditoría registrada',
      filename: file.originalname, 
    };
  }
}