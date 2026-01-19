import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AppService {
  private prisma = new PrismaClient();
  private readonly logger = new Logger(AppService.name);

  // 🚩 MEMORIA DE CONTEXTO: Para manejar celdas combinadas [cite: 2026-01-18]
  private lastFaculty = '';
  private lastCareer = '';

  async getStructure() {
    return this.prisma.faculty.findMany({
      include: { careers: { include: { courses: true } } }
    });
  }

  async saveAcademicData(data: any): Promise<any> {
      try {
        // 1. Detección de Facultad (Busca en varios nombres posibles) [cite: 2026-01-18]
        const currentFac = data.Facultad || data['__EMPTY_2'];
        if  (currentFac) this.lastFaculty = String(currentFac).trim();
      
       // 2. 🚩 DETECCIÓN DE CARRERA BLINDADA [cite: 2026-01-19]
        // Buscamos en todas las columnas donde la UCE suele poner la carrera
        const currentCareer = data.Carrera || 
                              data['Unnamed: 6'] || 
                              data['__EMPTY_6'] || 
                              data['__EMPTY_7'] || 
                              data['Unnamed: 7'];

        if (currentCareer) {
          this.lastCareer = String(currentCareer).trim();
        }

        // 3. Mapeo de campos de la materia
        const asignatura = data.Asignatura || data['Nombre Asignatura'] || data['__EMPTY_12'];
        const cupoRaw = data['Cupo registrado'] || data.Cupo || data['__EMPTY_15'] || 0;
        const inscritosRaw = data['Estudiantes registrados'] || data.Inscritos || data['__EMPTY_16'] || 0;

        // 4. Validación de seguridad [cite: 2026-01-18]
        // Si no hay asignatura o la carrera sigue vacía, ignoramos la fila
        if (!asignatura || !this.lastFaculty || !this.lastCareer || this.lastCareer === '') {
          return null;
        }

        // 5. Persistencia (Facultad -> Carrera -> Curso)
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
              parallel: data.Paralelo?.toString() || data['__EMPTY_11']?.toString() || 'N/A',
              level: data.Nivel?.toString() || data['__EMPTY_10']?.toString() || 'N/A',
              careerId: career.id
            }
          },
          update: {
            maxCapacity: parseInt(cupoRaw.toString()) || 0,
            currentStudents: parseInt(inscritosRaw.toString()) || 0,
          },
          create: {
            name: String(asignatura).trim(),
            level: data.Nivel?.toString() || data['__EMPTY_10']?.toString() || 'N/A',
            parallel: data.Paralelo?.toString() || data['__EMPTY_11']?.toString() || 'N/A',
            maxCapacity: parseInt(cupoRaw.toString()) || 0,
            currentStudents: parseInt(inscritosRaw.toString()) || 0,
            careerId: career.id
          }
        });
      } catch (error) {
        this.logger.error(`Error en base de datos: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }
}