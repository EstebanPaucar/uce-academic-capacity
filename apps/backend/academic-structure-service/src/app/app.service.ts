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

  async saveCourseFromETL(data: any) {
  // 1. Asegurar que la Facultad existe
  const faculty = await prisma.faculty.upsert({
    where: { name: data.faculty },
    update: {},
    create: { name: data.faculty }
  });

  // 2. Asegurar que la Carrera existe
  const career = await prisma.career.findFirst({
    where: { name: data.career, faculty_id: faculty.id }
  }) || await prisma.career.create({
    data: { name: data.career, faculty_id: faculty.id }
  });

  // 3. Crear el Curso/Asignatura
  return prisma.course.create({
    data: {
      name: data.subject,
      level: data.level,
      parallel: data.parallel,
      max_capacity: data.max_capacity,
      current_students: data.current_students,
      career_id: career.id
    }
  });
}

}

