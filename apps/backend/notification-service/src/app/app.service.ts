import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AppService {
  private prisma = new PrismaClient();
  private readonly logger = new Logger(AppService.name);

  // --- GUARDAR SOLO LO IMPORTANTE ---
  async processResult(data: any) {
    const status = data.status || '';

    // Filtro: Solo guardamos si es SATURADO o tiene problema NORMATIVO
    // Si es solo "ALERTA" (amarillo por porcentaje) no saturamos el buzón, a menos que quieras.
    const isCritical = status.includes('SATURADO') || status.includes('ALERTA_NORMATIVA');

    if (isCritical) {
      try {
        // Buscamos el ID de la facultad para filtrar luego
        const faculty = await this.prisma.faculty.findUnique({ where: { name: data.Facultad } });

        await this.prisma.notification.create({
          data: {
            facultyName: data.Facultad,
            careerName: data.Carrera,
            courseName: data.name,
            status: status,
            message: `El curso ${data.name} (${data.parallel}) requiere atención: ${status}`,
            facultyId: faculty ? faculty.id : null,
            createdAt: new Date()
          }
        });
        // this.logger.log(`🔔 Alerta guardada: ${data.name}`);
      } catch (e) {
        this.logger.error(`Error guardando notificación: ${e}`);
      }
    }
  }

  // --- CONSULTAR POR ROL ---
  async getNotifications(role: string, facultyId?: number) {
    // ADMIN (Vicerrectorado): Ve todo
    if (role === 'ADMIN') {
      return this.prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100
      });
    }
    // DIRECTOR: Ve solo su facultad
    if (role === 'DIRECTOR' && facultyId) {
      return this.prisma.notification.findMany({
        where: { facultyId: Number(facultyId) },
        orderBy: { createdAt: 'desc' },
        take: 100
      });
    }
    return [];
  }
}