import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  parseExcel(buffer: Buffer): any[] {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // MODO MATRIZ PURA (Header: 1)
      const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { 
        header: 1, 
        defval: '' 
      });

      // 🚩 SOLUCIÓN: Usamos el logger aquí para informar y eliminar la advertencia
      this.logger.log(`Archivo Excel decodificado en memoria. Total filas matriz: ${rawData.length}`);

      return rawData;
    } catch (error) {
      // También es bueno loguear el error antes de lanzar la excepción
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error parseando Excel: ${errorMessage}`);
      throw new BadRequestException('Error al leer el archivo Excel.');
    }
  }
}