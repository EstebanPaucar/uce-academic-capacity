import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AppService {
  private prisma = new PrismaClient();
  private readonly logger = new Logger(AppService.name);

  async getStructure() {
    return this.prisma.faculty.findMany({
      include: { careers: { include: { courses: true } } }
    });
  }

  // 🚩 NUEVO MÉTODO: Obtener datos crudos para recálculo
  async getAllCoursesForRecalculation() {
    return this.prisma.course.findMany({
      // Incluimos las relaciones para poder enviar "Facultad" y "Carrera" a Go
      include: {
        career: {
          include: {
            faculty: true
          }
        }
      }
    });
  }

  private getEcuadorTime(): Date {
    const now = new Date();
    return new Date(now.getTime() - (5 * 60 * 60 * 1000));
  }

  async saveAcademicData(data: any): Promise<any> {
    const facultyName = data.Facultad || data.Faculty;
    const careerName = data.Carrera || data.Career;
    
    // Obtenemos la hora corregida
    const ecuadorNow = this.getEcuadorTime();

    if (!facultyName || !careerName) return;

    try {
      // Guardar Facultad de forma segura
      const faculty = await this.upsertFacultySafe(String(facultyName).trim());
      // Guardar Carrera de forma segura
      const career = await this.upsertCareerSafe(String(careerName).trim(), faculty.id);

      // Guardar Curso con la hora correcta
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
          status: data.status,
          occupancyPercentage: data.occupancyPercentage,
          updatedAt: ecuadorNow // 🕒 HORA ECUADOR
        },
        create: {
          name: String(data.name).trim(),
          level: String(data.level).trim(),
          parallel: String(data.parallel).trim(),
          maxCapacity: data.maxCapacity,
          currentStudents: data.currentStudents,
          careerId: career.id,
          status: data.status,
          occupancyPercentage: data.occupancyPercentage,
          createdAt: ecuadorNow, // 🕒 HORA ECUADOR
          updatedAt: ecuadorNow  // 🕒 HORA ECUADOR
        }
      });

    } catch (error) {
      // 🚩 CORRECCIÓN: Casteamos 'error' a 'any' para leer el mensaje
      const msg = (error as any).message || String(error);
      this.logger.error(`❌ Error persistiendo ${data.name}: ${msg}`);
      // No lanzamos el error (throw) para que el proceso continúe con la siguiente materia
      return null;
    }
  }

  // --- MÉTODOS AUXILIARES ANTI-RACE CONDITION ---

  private async upsertFacultySafe(name: string) {
    try {
      return await this.prisma.faculty.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    } catch (e) {
      // 🚩 CORRECCIÓN: Casteamos 'e' a 'any'
      if ((e as any).code === 'P2002') {
        return await this.prisma.faculty.findUniqueOrThrow({ where: { name } });
      }
      throw e;
    }
  }

  private async upsertCareerSafe(name: string, facultyId: number) {
    try {
      return await this.prisma.career.upsert({
        where: { name_facultyId: { name, facultyId } },
        update: {},
        create: { name, facultyId },
      });
    } catch (e) {
      // 🚩 CORRECCIÓN: Casteamos 'e' a 'any'
      if ((e as any).code === 'P2002') {
        return await this.prisma.career.findUniqueOrThrow({ 
          where: { name_facultyId: { name, facultyId } } 
        });
      }
      throw e;
    }
  }
}