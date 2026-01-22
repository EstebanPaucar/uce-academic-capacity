import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AppService {
  private prisma = new PrismaClient();
  private readonly logger = new Logger(AppService.name);

  constructor(@Inject('GO_ENGINE') private clientGo: ClientProxy) {}

  async executeChange(data: any) {
    this.logger.log(`🔧 Ejecutando cambio de cupo: Curso ${data.courseId} -> ${data.newCapacity}`);

    // 1. Actualizar Base de Datos Centralizada
    await this.prisma.course.update({
      where: { id: Number(data.courseId) },
      data: { maxCapacity: Number(data.newCapacity) }
    });

    // 2. Enviar a Go para Recálculo Inmediato
    // Construimos el payload tal cual le gusta a Go
    const payloadForGo = {
      name: data.name,
      parallel: data.parallel,
      level: data.level,
      maxCapacity: Number(data.newCapacity), // El nuevo valor
      currentStudents: data.currentStudents,
      Facultad: data.Facultad,
      Carrera: data.Carrera
    };

    this.clientGo.emit('course_created', payloadForGo);
    this.logger.log('🚀 Enviado a motor de cálculo para actualización en tiempo real');
  }
}