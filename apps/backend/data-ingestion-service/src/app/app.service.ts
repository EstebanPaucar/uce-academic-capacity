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

      // 🚩 MODO MATRIZ PURA (Header: 1)
      // Esto devuelve un Array de Arrays: [ [A1, B1, C1...], [A2, B2, C2...] ]
      // defval: '' asegura que si la columna B está vacía, el índice se respete y C siga siendo [2]
      const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { 
        header: 1, 
        defval: '' 
      });

      return rawData;
    } catch (error) {
      throw new BadRequestException('Error al leer el archivo Excel.');
    }
  }
}