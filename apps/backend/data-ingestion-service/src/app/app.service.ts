import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  // 1. Mapeo flexible para validar que el reporte tenga lo mínimo necesario [cite: 2026-01-18]
  private readonly MANDATORY_KEYWORDS = ['Facultad', 'Carrera', 'Asignatura', 'Cupo'];

  parseExcel(buffer: Buffer): any[] {
    try {
      this.logger.log('Iniciando procesamiento de reporte institucional UCE...');
      
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      // 2. CORRECCIÓN: Saltamos las primeras 5 filas de logotipos/títulos [cite: 2026-01-18]
      const records: any[] = XLSX.utils.sheet_to_json(sheet, { 
        range: 5, 
        defval: null 
      });

      if (!records || records.length === 0) {
        throw new BadRequestException('El archivo Excel no contiene datos después de la fila 5.');
      }

      // 3. Validación flexible: Buscamos si las columnas clave existen de alguna forma [cite: 2026-01-18]
      const firstRow = JSON.stringify(records[0]);
      const missing = this.MANDATORY_KEYWORDS.filter(key => !firstRow.includes(key));

      // Si falta 'Asignatura', pero existe 'Nombre Asignatura', la validación pasa
      if (missing.length > 0 && !firstRow.includes('Nombre Asignatura')) {
        throw new BadRequestException(`El reporte no tiene el formato esperado. Faltan referencias a: ${missing.join(', ')}`);
      }

      this.logger.log(`Éxito: ${records.length} registros extraídos.`);
      return records;

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error en AppService: ${msg}`);
      throw new BadRequestException(msg);
    }
  }
}