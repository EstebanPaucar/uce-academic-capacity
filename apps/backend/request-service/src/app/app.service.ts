import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AppService {
  private prisma = new PrismaClient();

  constructor(@Inject('CAPACITY_MQ') private client: ClientProxy) {}

  // 1. Crear Solicitud (Director)
  async createRequest(data: any) {
    return this.prisma.request.create({
      data: {
        courseId: Number(data.courseId),
        directorId: Number(data.directorId),
        currentCapacity: Number(data.currentCapacity),
        requestedCapacity: Number(data.requestedCapacity),
        justificationType: data.justificationType,
        details: data.details,
        status: 'PENDING'
      }
    });
  }

  // 2. Listar Solicitudes (Admin ve todo, Director ve lo suyo)
  async getRequests(role: string, userId: number) {
    if (role === 'ADMIN') {
      return this.prisma.request.findMany({
        include: { course: { include: { career: true } } },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      return this.prisma.request.findMany({
        where: { directorId: Number(userId) },
        include: { course: true },
        orderBy: { createdAt: 'desc' }
      });
    }
  }

  // 3. Aprobar/Rechazar (Vicerrectorado)
  async resolveRequest(id: number, status: 'APPROVED' | 'REJECTED', resolutionCode?: string) {
    const request = await this.prisma.request.update({
      where: { id: Number(id) },
      data: { 
        status, 
        resolutionCode 
      },
      include: { course: { include: { career: { include: { faculty: true } } } } }
    });

    // 🚩 SI SE APRUEBA -> ENVIAR A COLA DE EJECUCIÓN
    if (status === 'APPROVED') {
      this.client.emit('execute_capacity_change', {
        courseId: request.courseId,
        newCapacity: request.requestedCapacity,
        // Datos para re-cálculo en Go:
        name: request.course.name,
        parallel: request.course.parallel,
        level: request.course.level,
        currentStudents: request.course.currentStudents,
        Facultad: request.course.career.faculty.name,
        Carrera: request.course.career.name
      });
    }

    return request;
  }
}