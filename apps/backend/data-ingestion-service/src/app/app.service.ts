import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

@Injectable()
export class AppService {
  // Columnas obligatorias según la estructura académica de la UCE
  private readonly REQUIRED_COLUMNS = [
    'Facultad', 
    'Carrera', 
    'Asignatura', 
    'Nivel', 
    'Paralelo', 
    'Capacidad_Maxima', 
    'Alumnos_Matriculados'
  ];

  // 1. Renombramos a parseExcel para que el controlador la encuentre
  parseExcel(buffer: Buffer): any[] { 
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Convertimos a JSON
      const records: any[] = XLSX.utils.sheet_to_json(sheet);

      if (!records || records.length === 0) {
        throw new BadRequestException('El archivo Excel no contiene datos.');
      }

      // 2. Validación de columnas
      const firstRecordKeys = Object.keys(records[0]);
      const missingColumns = this.REQUIRED_COLUMNS.filter(col => !firstRecordKeys.includes(col));

      if (missingColumns.length > 0) {
        throw new BadRequestException(`Formato inválido. Faltan las columnas: ${missingColumns.join(', ')}`);
      }

      // 3. IMPORTANTE: Devolvemos el array de registros al controlador
      // Quitamos el emit de aquí porque ya lo haces en el AppController
      return records; 

    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Error al procesar el archivo Excel. Verifique el formato.');
    }
  }
}