import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AppService {
  private prisma = new PrismaClient();
  private readonly logger = new Logger(AppService.name);

  private lastFaculty = '';
  private lastCareer = '';

  async saveAcademicData(data: any): Promise<any> {
    try {
      // 🚩 EL CAMBIO: Los datos ya vienen calculados desde el servicio de Go
      // data.status y data.occupancyPercentage ya existen en el mensaje.
      
      const values = Object.values(data);
      const currentFac = values[2] || data['Facultad'];
      if (currentFac && String(currentFac).trim() !== '' && !String(currentFac).includes('__EMPTY')) {
        this.lastFaculty = String(currentFac).trim();
      }

      const currentCar = values[6] || values[7] || data['Carrera'];
      if (currentCar && String(currentCar).trim() !== '' && !String(currentCar).includes('__EMPTY')) {
        this.lastCareer = String(currentCar).trim();
      }

      // ... (lógica de extracción igual hasta llegar a la persistencia)

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
            name: String(data.name).trim(),
            parallel: String(data.parallel).trim(),
            level: String(data.level).trim(),
            careerId: career.id
          }
        },
        update: {
          maxCapacity: data.maxCapacity,
          currentStudents: data.currentStudents,
          // 🚩 USAMOS LO QUE CALCULÓ GO
          status: data.status, 
          occupancyPercentage: data.occupancyPercentage,
          updatedAt: new Date()
        },
        create: {
          name: String(data.name).trim(),
          level: String(data.level).trim(),
          parallel: String(data.parallel).trim(),
          maxCapacity: data.maxCapacity,
          currentStudents: data.currentStudents,
          careerId: career.id,
          // 🚩 USAMOS LO QUE CALCULÓ GO
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