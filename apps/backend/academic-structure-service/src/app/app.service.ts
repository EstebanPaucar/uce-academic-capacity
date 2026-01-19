import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AppService {
  private prisma = new PrismaClient(); 
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
  async saveAcademicData(rawData: any) {
    try {
      // 🚩 CORRECCIÓN: Debes invocar la validación y usar el objeto mapeado
      const data = this.validateHeaders(rawData); 

      // 1. Asegurar que la Facultad existe
      const faculty = await this.prisma.faculty.upsert({
        where: { name: data.Facultad },
        update: {},
        create: { name: data.Facultad }
      });

      // 2. Asegurar que la Carrera existe dentro de esa Facultad
      const career = await this.prisma.career.upsert({
        where: { 
          name_facultyId: { name: data.Carrera, facultyId: faculty.id } 
        },
        update: {},
        create: { 
          name: data.Carrera, 
          facultyId: faculty.id 
        }
      });

      // 3. Crear el Curso con los datos ya normalizados [cite: 2026-01-18]
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

  // --- HELPER DE NORMALIZACIÓN ---
  private validateHeaders(row: any) {
    const mapping = {
      Facultad: row.Facultad,
      Carrera: row.Carrera,
      Asignatura: row.Asignatura || row['Nombre Asignatura'],
      Nivel: row.Nivel || row.Semestre,
      Paralelo: row.Paralelo,
      Capacidad_Maxima: row.Capacidad_Maxima || row.Cupo || row.Capacidad,
      Alumnos_Matriculados: row.Alumnos_Matriculados || row.Inscritos || row.Registrados
    };

    // Validación de campos mínimos obligatorios [cite: 2026-01-18]
    if (!mapping.Facultad || !mapping.Asignatura || mapping.Capacidad_Maxima === undefined) {
      throw new BadRequestException('Fila de Excel con formato incompatible o datos faltantes.');
    }

    return mapping;
  }
}