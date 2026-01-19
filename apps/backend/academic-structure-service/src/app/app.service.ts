import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AppService {
  private prisma = new PrismaClient(); // Lo ideal es inyectar un PrismaService
  private readonly logger = new Logger(AppService.name);

  // --- CONSULTA PARA EL FRONTEND ---
  async getStructure() {
    this.logger.log('Fetching full academic structure for React dashboard');
    return this.prisma.faculty.findMany({
      include: {
        careers: {
          include: { 
            courses: true,
          }
        }
      }
    });
  }

  // --- PROCESAMIENTO DEL ETL (EXCEL) ---
  // Renombramos para coincidir con el controlador: saveAcademicData [cite: 2026-01-18]
  async saveAcademicData(data: any) {
    try {
      // 1. Asegurar que la Facultad existe (Source: Excel column 'Facultad') [cite: 2026-01-18]
      const faculty = await this.prisma.faculty.upsert({
        where: { name: data.Facultad },
        update: {},
        create: { name: data.Facultad }
      });

      // 2. Asegurar que la Carrera existe dentro de esa Facultad
      const career = await this.prisma.career.upsert({
        where: { 
          // Suponiendo un índice compuesto name_facultyId en tu esquema
          name_facultyId: { name: data.Carrera, facultyId: faculty.id } 
        },
        update: {},
        create: { 
          name: data.Carrera, 
          facultyId: faculty.id 
        }
      });

      // 3. Crear el Curso con los nombres de columna exactos del validador [cite: 2026-01-18]
      return await this.prisma.course.create({
        data: {
          name: data.Asignatura,
          level: data.Nivel?.toString(),
          parallel: data.Paralelo?.toString(),
          maxCapacity: parseInt(data.Capacidad_Maxima) || 0,
          currentStudents: parseInt(data.Alumnos_Matriculados) || 0,
          careerId: career.id
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error saving ETL record: ${errorMessage}`);
      throw error;
    }
  }
}