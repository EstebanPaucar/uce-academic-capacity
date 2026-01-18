import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

@Injectable()
export class AppService {
  
  parseExcel(buffer: Buffer): any[] {
    // Lectura del libro de trabajo (Workbook)
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Obtenemos la primera hoja de cálculo
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Transformación: Convertimos la hoja a un arreglo de objetos JSON
    const data = XLSX.utils.sheet_to_json(worksheet);

    return data;
  }
}