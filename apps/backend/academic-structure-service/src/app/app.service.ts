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
      // 1. Lógica de Memoria: Si el campo viene, actualizamos; si no, usamos el anterior [cite: 2026-01-18]
      if (data.Facultad) this.lastFaculty = String(data.Facultad).trim();
      
      // En el reporte UCE, la carrera suele venir en 'Unnamed: 6' si la columna 'Carrera' está vacía [cite: 2026-01-18]
      const currentCareer = data.Carrera || data['Unnamed: 6'];
      if (currentCareer) this.lastCareer = String(currentCareer).trim();

      // 2. CORRECCIÓN DE CEROS: Mapeo de nombres exactos del reporte UCE [cite: 2026-01-18]
      const asignatura = data.Asignatura || data['Nombre Asignatura'];
      const cupoRaw = data['Cupo registrado'] || data.Cupo || 0;
      const inscritosRaw = data['Estudiantes registrados'] || data.Inscritos || 0;

      // Si no hay asignatura o facultad, saltamos la fila (posible fila vacía del Excel)
      if (!asignatura || !this.lastFaculty) return null;

      // 3. Persistencia de Facultad
      const faculty = await this.prisma.faculty.upsert({
        where: { name: this.lastFaculty },
        update: {},
        create: { name: this.lastFaculty }
      });

      // 4. Persistencia de Carrera
      const career = await this.prisma.career.upsert({
        where: { name_facultyId: { name: this.lastCareer, facultyId: faculty.id } },
        update: {},
        create: { name: this.lastCareer, facultyId: faculty.id }
      });

      // 5. Creación del Curso con valores reales
// ... dentro de saveAcademicData
// 4. Upsert del Curso (Evita duplicados) [cite: 2026-01-18]
      return await this.prisma.course.upsert({
        where: {
    // Debe coincidir exactamente con el @@unique del esquema
          name_parallel_level_careerId: {
            name: String(asignatura).trim(),
            parallel: data.Paralelo?.toString() || 'N/A',
            level: data.Nivel?.toString() || 'N/A',
            careerId: career.id
          }
        },
        update: {
    // Si ya existe, actualizamos los números por si cambiaron [cite: 2026-01-18]
          maxCapacity: parseInt(cupoRaw.toString()) || 0,
          currentStudents: parseInt(inscritosRaw.toString()) || 0,
        },
        create: {
          name: String(asignatura).trim(),
          level: data.Nivel?.toString() || 'N/A',
          parallel: data.Paralelo?.toString() || 'N/A',
          maxCapacity: parseInt(cupoRaw.toString()) || 0,
          currentStudents: parseInt(inscritosRaw.toString()) || 0,
          careerId: career.id
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error en base de datos: ${errorMessage}`);
      throw error;
    }
  }
}