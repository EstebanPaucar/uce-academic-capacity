import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AppService {
  private prisma = new PrismaClient();
  private readonly logger = new Logger(AppService.name);

  // Memoria persistente para celdas combinadas
  private lastFaculty = '';
  private lastCareer = '';

  async getStructure() {
    return this.prisma.faculty.findMany({
      include: { careers: { include: { courses: true } } }
    });
  }

  async saveAcademicData(data: any): Promise<any> {
    try {
      // 1. Convertimos a valores para manejar la desalineación de la UCE [cite: 2026-01-19]
      const values = Object.values(data);

      // 2. MAPEADO DE PRECISIÓN (Basado en el análisis del archivo real)
      
      // FACULTAD (Columna C -> Índice 2)
      const currentFac = values[2] || data['Facultad'];
      if (currentFac && String(currentFac).trim() !== '' && !String(currentFac).includes('__EMPTY')) {
        this.lastFaculty = String(currentFac).trim();
      }

      // CARRERA (🚩 CORRECCIÓN: En datos está en Índice 6, en Header en Índice 7) [cite: 2026-01-19]
      const currentCar = values[6] || values[7] || data['Carrera'];
      if (currentCar && String(currentCar).trim() !== '' && !String(currentCar).includes('__EMPTY')) {
        this.lastCareer = String(currentCar).trim();
      }

      // NIVEL (Columna K -> Índice 10) y PARALELO (Columna L -> Índice 11)
      const nivel = values[10] || data['Nivel'] || 'N/A';
      const paralelo = values[11] || data['Paralelo'] || 'N/A';

      // ASIGNATURA (Columna M -> Índice 12)
      const asignatura = values[12] || data['Asignatura'] || data['Nombre Asignatura'];

      // CUPOS (Columna P -> Índice 15) y REGISTRADOS (Columna Q -> Índice 16)
      const cupoRaw = values[15] || data['Cupo registrado'] || 0;
      const inscritosRaw = values[16] || data['Estudiantes registrados'] || 0;

      // 3. VALIDACIÓN DE INTEGRIDAD
      if (!asignatura || String(asignatura).trim() === '' || !this.lastFaculty || !this.lastCareer) {
        // Log preventivo para filas de relleno o errores de lectura
        if (asignatura) {
          this.logger.warn(`Omitiendo materia: ${asignatura} | Causa: Carrera o Facultad no detectada.`);
        }
        return null;
      }

      // 4. PERSISTENCIA (Upsert para evitar duplicados en AWS Academy) [cite: 2026-01-06]
      const faculty = await this.prisma.faculty.upsert({
        where: { name: this.lastFaculty },
        update: {},
        create: { name: this.lastFaculty }
      });

      const career = await this.prisma.career.upsert({
        where: { name_facultyId: { name: this.lastCareer, facultyId: faculty.id } },
        update: {},
        create: { name: this.lastCareer, facultyId: faculty.id }
      });

      return await this.prisma.course.upsert({
        where: {
          name_parallel_level_careerId: {
            name: String(asignatura).trim(),
            parallel: String(paralelo).trim(),
            level: String(nivel).trim(),
            careerId: career.id
          }
        },
        update: {
          maxCapacity: parseInt(cupoRaw.toString()) || 0,
          currentStudents: parseInt(inscritosRaw.toString()) || 0,
        },
        create: {
          name: String(asignatura).trim(),
          level: String(nivel).trim(),
          parallel: String(paralelo).trim(),
          maxCapacity: parseInt(cupoRaw.toString()) || 0,
          currentStudents: parseInt(inscritosRaw.toString()) || 0,
          careerId: career.id
        }
      });

    } catch (error) {
      this.logger.error(`Error de persistencia: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}