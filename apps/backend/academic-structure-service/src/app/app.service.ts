import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AppService {
  private prisma = new PrismaClient();
  private readonly logger = new Logger(AppService.name);

  // 🚩 ESTA ES LA FUNCIÓN QUE FALTABA Y CAUSABA EL ERROR [cite: 2026-01-18]
  async getStructure() {
    this.logger.log('Fetching full academic structure from database');
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

  // --- PROCESAMIENTO DEL ETL ---
  async saveAcademicData(rawData: any) {
    try {
      // MAPEADOR INTELIGENTE: Traduce los nombres del reporte de la UCE [cite: 2026-01-18]
      const data = {
        Facultad: rawData.Facultad,
        Carrera: rawData.Carrera,
        Asignatura: rawData.Asignatura || rawData['Nombre Asignatura'],
        Nivel: rawData.Nivel || rawData.Semestre,
        Paralelo: rawData.Paralelo,
        Capacidad_Maxima: rawData.Capacidad_Maxima || rawData.Cupo || rawData.Capacidad,
        Alumnos_Matriculados: rawData.Alumnos_Matriculados || rawData.Inscritos
      };

      // Si la fila no tiene Facultad o Asignatura, la ignoramos silenciosamente [cite: 2026-01-18]
      if (!data.Facultad || !data.Asignatura) {
        return; 
      }

      const faculty = await this.prisma.faculty.upsert({
        where: { name: data.Facultad },
        update: {},
        create: { name: data.Facultad }
      });

      const career = await this.prisma.career.upsert({
        where: { name_facultyId: { name: data.Carrera, facultyId: faculty.id } },
        update: {},
        create: { name: data.Carrera, facultyId: faculty.id }
      });

      return await this.prisma.course.create({
        data: {
          name: data.Asignatura,
          level: data.Nivel?.toString() || 'N/A',
          parallel: data.Paralelo?.toString() || 'N/A',
          maxCapacity: parseInt(data.Capacidad_Maxima as string) || 0,
          currentStudents: parseInt(data.Alumnos_Matriculados as string) || 0,
          careerId: career.id
        }
      });
    } catch (error) {
      this.logger.error(`Error procesando materia: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }
}