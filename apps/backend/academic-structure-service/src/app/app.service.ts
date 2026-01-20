import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AppService {
  private prisma = new PrismaClient();
  private readonly logger = new Logger(AppService.name);

  // Memoria persistente para procesar celdas combinadas del Excel de la UCE 
  private lastFaculty = '';
  private lastCareer = '';

  /**
   * 🚩 MÉTODO RESTAURADO: getStructure
   * Permite que el Frontend consulte la jerarquía académica completa[cite: 224].
   */
  async getStructure() {
    return this.prisma.faculty.findMany({
      include: { 
        careers: { 
          include: { 
            courses: true 
          } 
        } 
      }
    });
  }

  /**
   * Guarda los datos académicos procesados por el motor de Go[cite: 102, 147].
   */
  async saveAcademicData(data: any): Promise<any> {
    try {
      // 1. Identificación de jerarquía (Facultad y Carrera)
      const values = Object.values(data);
      const currentFac = values[2] || data['Facultad'] || data.Faculty;
      if (currentFac && String(currentFac).trim() !== '' && !String(currentFac).includes('__EMPTY')) {
        this.lastFaculty = String(currentFac).trim();
      }

      const currentCar = values[6] || values[7] || data['Carrera'] || data.Career;
      if (currentCar && String(currentCar).trim() !== '' && !String(currentCar).includes('__EMPTY')) {
        this.lastCareer = String(currentCar).trim();
      }

      // 2. Validación mínima de integridad académica [cite: 161]
      if (!this.lastFaculty || !this.lastCareer) {
        this.logger.warn(`Omitiendo registro: Facultad o Carrera no detectada.`);
        return null;
      }

      // 3. Persistencia jerárquica en PostgreSQL (Integridad ACID) [cite: 187, 225]
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

      // 4. Upsert del Curso con estados calculados por el motor de Go [cite: 102, 119]
      return await this.prisma.course.upsert({
        where: {
          name_parallel_level_careerId: {
            name: String(data.name).trim(),
            parallel: String(data.parallel).trim(),
            level: String(data.level).trim(),
            careerId: career.id
          }
        },
        update: {
          maxCapacity: data.maxCapacity,
          currentStudents: data.currentStudents,
          status: data.status, // 🚩 Proviene de Go
          occupancyPercentage: data.occupancyPercentage, // 🚩 Proviene de Go
          updatedAt: new Date()
        },
        create: {
          name: String(data.name).trim(),
          level: String(data.level).trim(),
          parallel: String(data.parallel).trim(),
          maxCapacity: data.maxCapacity,
          currentStudents: data.currentStudents,
          careerId: career.id,
          status: data.status,
          occupancyPercentage: data.occupancyPercentage
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error de persistencia: ${errorMessage}`);
      throw error;
    }
  }
}