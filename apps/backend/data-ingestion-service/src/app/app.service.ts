import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  parseExcel(buffer: Buffer): any[] {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      // Saltamos 5 filas para llegar a los encabezados reales [cite: 2026-01-18]
      const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { range: 5, defval: null });

      // Filtramos filas que tengan al menos una asignatura o alguna referencia de carrera/facultad
      const cleanData = rawData.filter(row => 
        row.Facultad || row.Carrera || row['Nombre Asignatura'] || row.Asignatura || row['Unnamed: 6']
      );

      if (cleanData.length === 0) {
        throw new Error('El archivo no contiene registros válidos después de la cabecera.');
      }

      this.logger.log(`Ingestión: ${cleanData.length} registros listos para RabbitMQ.`);
      return cleanData;
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Error al leer Excel');
    }
  }
}