import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CapacityEngineService } from './capacity-engine.service'; // 1. IMPORTAR MOTOR

@Injectable()
export class AppService {
  private prisma = new PrismaClient();
  private readonly logger = new Logger(AppService.name);

  // 2. INYECTAR MOTOR EN EL CONSTRUCTOR
  constructor(private readonly capacityEngine: CapacityEngineService) {}

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
      // --- TU LÓGICA DE EXTRACCIÓN PROBADA (INTACTA) ---
      const values = Object.values(data);

      // FACULTAD (Columna C -> Índice 2)
      const currentFac = values[2] || data['Facultad'];
      if (currentFac && String(currentFac).trim() !== '' && !String(currentFac).includes('__EMPTY')) {
        this.lastFaculty = String(currentFac).trim();
      }

      // CARRERA (Índice 6 o 7)
      const currentCar = values[6] || values[7] || data['Carrera'];
      if (currentCar && String(currentCar).trim() !== '' && !String(currentCar).includes('__EMPTY')) {
        this.lastCareer = String(currentCar).trim();
      }

      // NIVEL y PARALELO
      const nivel = values[10] || data['Nivel'] || 'N/A';
      const paralelo = values[11] || data['Paralelo'] || 'N/A';

      // ASIGNATURA (Índice 12)
      const asignatura = values[12] || data['Asignatura'] || data['Nombre Asignatura'];

      // CUPOS y REGISTRADOS (Índices 15 y 16 - Tu código funcional)
      const cupoRaw = values[15] || data['Cupo registrado'] || 0;
      const inscritosRaw = values[16] || data['Estudiantes registrados'] || 0;

      // Limpieza numérica segura
      const maxCapacity = parseInt(cupoRaw.toString()) || 0;
      const currentStudents = parseInt(inscritosRaw.toString()) || 0;

      // VALIDACIÓN DE INTEGRIDAD
      if (!asignatura || String(asignatura).trim() === '' || !this.lastFaculty || !this.lastCareer) {
        if (asignatura) {
          this.logger.warn(`Omitiendo materia: ${asignatura} | Causa: Carrera o Facultad no detectada.`);
        }
        return null;
      }

      // --- 3. NUEVO: INVOCAMOS AL MOTOR DE CÁLCULO ---
      // Aquí es donde el backend "piensa" antes de guardar
      const health = this.capacityEngine.analyzeCourseHealth(currentStudents, maxCapacity);

      // --- 4. PERSISTENCIA CON ESTADOS ---
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
          maxCapacity: maxCapacity,
          currentStudents: currentStudents,
          // Guardamos lo que calculó el motor
          status: health.status,
          occupancyPercentage: health.percentage,
          updatedAt: new Date() // Importante para la base de datos
        },
        create: {
          name: String(asignatura).trim(),
          level: String(nivel).trim(),
          parallel: String(paralelo).trim(),
          maxCapacity: maxCapacity,
          currentStudents: currentStudents,
          careerId: career.id,
          // Guardamos lo que calculó el motor
          status: health.status,
          occupancyPercentage: health.percentage
        }
      });

    } catch (error) {
      this.logger.error(`Error de persistencia: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}