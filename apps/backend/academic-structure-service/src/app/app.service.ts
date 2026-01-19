import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AppService {
  private prisma = new PrismaClient(); 
  private readonly logger = new Logger(AppService.name);

  // --- CONSULTA PARA EL FRONTEND (REACT) ---
  // Permite visualizar la jerarquía completa: Facultad -> Carrera -> Cursos
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

  // --- PROCESAMIENTO DEL ETL (RABBITMQ -> POSTGRES) ---
  // Recibe los datos crudos del Excel y los procesa con validación
  async saveAcademicData(rawData: any) {
    try {
      // 1. Normalización de encabezados (Smart Mapping)
      const data = this.validateHeaders(rawData); 

      // 2. Asegurar que la Facultad existe (Upsert evita duplicados)
      const faculty = await this.prisma.faculty.upsert({
        where: { name: data.Facultad },
        update: {},
        create: { name: data.Facultad }
      });

      // 3. Asegurar que la Carrera existe dentro de esa Facultad
      // Nota: Requiere el índice compuesto name_facultyId en schema.prisma
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

      // 4. Crear el registro del Curso con datos limpios
      return await this.prisma.course.create({
        data: {
          name: data.Asignatura,
          level: data.Nivel?.toString() || 'N/A',
          parallel: data.Paralelo?.toString() || 'N/A',
          maxCapacity: parseInt(data.Capacidad_Maxima) || 0,
          currentStudents: parseInt(data.Alumnos_Matriculados) || 0,
          careerId: career.id
        }
      });
    } catch (error) {
      // Manejo de errores para tipo 'unknown' de TypeScript
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error saving ETL record: ${errorMessage}`);
      throw error;
    }
  }

  // --- HELPER DE NORMALIZACIÓN PARA REPORTES UCE ---
  // Traduce los nombres de las columnas del reporte institucional al formato del sistema
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

    // Validación de campos obligatorios para asegurar integridad en AWS
    if (!mapping.Facultad || !mapping.Asignatura || mapping.Capacidad_Maxima === undefined) {
      throw new BadRequestException('Fila de Excel con formato incompatible o datos faltantes.');
    }

    return mapping;
  }
}