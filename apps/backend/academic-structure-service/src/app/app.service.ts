import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class AppService {
  async getStructure() {
    // Retorna Facultades con sus Carreras y Cursos
    return prisma.faculty.findMany({
      include: {
        careers: {
          include: { courses: true }
        }
      }
    });
  }
}