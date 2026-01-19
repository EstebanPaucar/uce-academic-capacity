import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import * as XLSX from 'xlsx';

@Injectable()
export class AppService {
  // 1. Definimos las columnas que el Excel DEBE tener
  private readonly REQUIRED_COLUMNS = [
    'Facultad', 
    'Carrera', 
    'Asignatura', 
    'Nivel', 
    'Paralelo', 
    'Capacidad_Maxima', 
    'Alumnos_Matriculados'
  ];

  constructor(
    @Inject('INGESTION_SERVICE') private readonly client: ClientProxy,
  ) {}

  async parseAndValidateExcel(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const records: any[] = XLSX.utils.sheet_to_json(sheet);

    if (records.length === 0) {
      throw new BadRequestException('El archivo Excel no contiene datos.');
    }

    // 2. Validar que las columnas existan en la primera fila
    const firstRecordKeys = Object.keys(records[0]);
    const missingColumns = this.REQUIRED_COLUMNS.filter(col => !firstRecordKeys.includes(col));

    if (missingColumns.length > 0) {
      throw new BadRequestException(`Formato inválido. Faltan las columnas: ${missingColumns.join(', ')}`);
    }

    // 3. Si todo está bien, enviamos a RabbitMQ
    records.forEach((row) => {
      this.client.emit('course_created', row);
    });

    return {
      status: 'success',
      totalProcessed: records.length,
      message: 'Datos validados y enviados a la cola de procesamiento.'
    };
  }
}