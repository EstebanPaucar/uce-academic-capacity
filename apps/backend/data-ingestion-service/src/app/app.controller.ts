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
    @Inject('CALCULATION_SERVICE') private readonly calcClient: ClientProxy,
    private readonly appService: AppService
  ) {}

  @Post('upload')
  async handleManualUpload(@Body() body: { records: any[] }) {
    if (!body.records || body.records.length === 0) {
      throw new BadRequestException('No hay registros.');
    }
    body.records.forEach((row: any) => {
      this.calcClient.emit('course_created', row);
    });
    return { status: 'success', message: 'Carga manual enviada' };
  }

  @Post('upload-excel')
  @UseGuards(AuthGuard('jwt')) 
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException('Archivo no encontrado.');

    const rawRecords = this.appService.parseExcel(file.buffer);
    this.logger.log(`Analizando ${rawRecords.length} filas crudas...`);

    // --- VARIABLES DE MEMORIA (Para celdas combinadas) ---
    let lastFaculty = '';
    let lastCareer = '';
    let processedCount = 0;

    rawRecords.forEach((row: any, index: number) => {
      const values = Object.values(row);

      // 1. DETECCIÓN INTELIGENTE DE JERARQUÍA
      // Buscamos si esta fila define una nueva Facultad o Carrera
      const rowFac = row['Facultad'] || values[2];
      const rowCar = row['Carrera'] || values[6] || values[7];

      // Si la fila tiene texto en la columna Facultad, actualizamos la memoria
      if (rowFac && String(rowFac).trim().length > 3 && !String(rowFac).includes('__EMPTY')) {
        lastFaculty = String(rowFac).trim();
      }

      // Si la fila tiene texto en la columna Carrera, actualizamos la memoria
      if (rowCar && String(rowCar).trim().length > 3 && !String(rowCar).includes('__EMPTY')) {
        lastCareer = String(rowCar).trim();
      }

      // 2. EXTRACCIÓN DE DATOS DE LA MATERIA
      const rawName = row['Asignatura'] || row['Nombre Asignatura'] || values[12];
      const rawCupo = row['Cupo registrado'] || values[15];
      const rawInscritos = row['Estudiantes registrados'] || values[16];

      // 3. FILTRO DE BASURA (CRÍTICO) 🛑
      // Ignoramos la fila si:
      // - No hay nombre de asignatura
      // - El nombre es un encabezado de tabla (ej: "Nombre Asignatura")
      // - No tenemos Facultad/Carrera detectada aún
      const isHeader = String(rawName).includes('Asignatura') || String(rawName).includes('ASIGNATURA');
      const isEmpty = !rawName || String(rawName).trim() === '';
      const isTitle = !rawCupo && !rawInscritos; // Si no tiene números, suele ser título

      if (isEmpty || isHeader || isTitle || !lastFaculty || !lastCareer) {
        return; // Saltamos esta fila, no se envía a Go
      }

      // 4. CONSTRUCCIÓN DEL OBJETO LIMPIO
      const cleanData = {
        Facultad: lastFaculty, // Usamos la memoria
        Carrera:  lastCareer,  // Usamos la memoria
        name:     String(rawName).trim(),
        level:    String(row['Nivel'] || values[10] || 'N/A'),
        parallel: String(row['Paralelo'] || values[11] || 'N/A'),
        
        // Conversión numérica segura
        maxCapacity:     parseInt(String(rawCupo || 0)),
        currentStudents: parseInt(String(rawInscritos || 0))
      };

      // Enviamos solo datos válidos
      this.calcClient.emit('course_created', cleanData);
      processedCount++;
    });

    // Auditoría
    this.auditClient.emit('log_created', {
      userId: req.user.userId,
      username: req.user.username,
      action: 'EXCEL_UPLOAD',
      service: 'data-ingestion-service',
      metadata: { filename: file.originalname, processed: processedCount }
    });

    this.logger.log(`✅ ETL Finalizado: Se enviaron ${processedCount} materias válidas a Go.`);

    return { 
      status: 'success', 
      message: `Procesamiento exitoso. ${processedCount} materias enviadas.`,
      filename: file.originalname 
    };
  }
}