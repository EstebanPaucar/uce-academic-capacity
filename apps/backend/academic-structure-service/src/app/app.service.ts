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
      // 🚩 PASO CLAVE: Mapear y validar los datos del Excel antes de procesar [cite: 2026-01-18]
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

      // 3. Crear el Curso con los datos mapeados [cite: 2026-01-18]
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

  // --- HELPER PARA COMPATIBILIDAD CON REPORTES UCE ---
  private validateHeaders(row: any) {
    // Este mapeo permite que el código entienda "Cupo" o "Capacidad" indistintamente [cite: 2026-01-18]
    const mapping = {
      Facultad: row.Facultad,
      Carrera: row.Carrera,
      Asignatura: row.Asignatura || row['Nombre Asignatura'] || row.subject,
      Nivel: row.Nivel || row.Semestre || row.level,
      Paralelo: row.Paralelo || row.parallel,
      Capacidad_Maxima: row.Capacidad_Maxima || row.Cupo || row.Capacidad || row.max_capacity,
      Alumnos_Matriculados: row.Alumnos_Matriculados || row.Inscritos || row.Registrados || row.current_students
    };

    // Validación de campos críticos para AWS Academy [cite: 2026-01-06]
    if (!mapping.Facultad || !mapping.Asignatura || mapping.Capacidad_Maxima === undefined) {
      this.logger.warn('Skipping invalid row: Missing mandatory fields');
      throw new BadRequestException('Formato de fila inválido');
    }

    return mapping;
  }
}

