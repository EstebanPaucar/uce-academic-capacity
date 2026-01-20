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
    @Inject('AUDIT_SERVICE') private readonly auditClient: ClientProxy,
    @Inject('CALCULATION_SERVICE') private readonly calcClient: ClientProxy, // Nuevo cable
    private readonly appService: AppService
  ) {}

  @Post('upload')
  async handleManualUpload(@Body() body: { records: any[] }) {
    if (!body.records || body.records.length === 0) {
      throw new BadRequestException('No hay registros.');
    }

    body.records.forEach((row: any) => {
      // 🚩 Enviamos al motor de cálculo en Go [cite: 266]
      this.calcClient.emit('course_created', row);
    });

    return { status: 'success', message: 'Carga manual enviada al motor de cálculo' };
  }

  @Post('upload-excel')
  @UseGuards(AuthGuard('jwt')) 
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException('Archivo no encontrado.');

    const records = this.appService.parseExcel(file.buffer);

    // 🚩 DISTRIBUCIÓN DE DATOS:
    records.forEach((row: any) => {
      // 1. Al Motor de Cálculo (Go) para procesamiento paralelo 
      this.calcClient.emit('course_created', row);
    });

    // 2. Al Audit Service (MongoDB) para trazabilidad [cite: 297]
    this.auditClient.emit('log_created', {
      userId: req.user.userId,
      username: req.user.username,
      action: 'EXCEL_UPLOAD',
      service: 'data-ingestion-service',
      metadata: { filename: file.originalname, totalRecords: records.length }
    });

    this.logger.log(`--- Pipeline: Sent ${records.length} courses to Go and Log to Mongo ---`);

    return { 
      status: 'success', 
      message: 'Datos distribuidos correctamente en la arquitectura',
      filename: file.originalname 
    };
  }
}