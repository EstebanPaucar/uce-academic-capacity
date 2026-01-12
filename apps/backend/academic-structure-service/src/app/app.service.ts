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
          include: { 
            courses: true,
           }
        }
      }
    });
  }

async saveCourseFromETL(data: any) {
  // 1. Asegurar que la Facultad existe (Usamos 'Facultad' con F mayúscula)
  const facultyName = data.Facultad || data.faculty; // Soporta ambos por si acaso
  
  const faculty = await prisma.faculty.upsert({
    where: { name: facultyName },
    update: {},
    create: { name: facultyName }
  });

  // 2. Asegurar que la Carrera existe
  const careerName = data.Carrera || data.career;
  const career = await prisma.career.findFirst({
    where: { name: careerName, faculty_id: faculty.id }
  }) || await prisma.career.create({
    data: { name: careerName, faculty_id: faculty.id }
  });

  // 3. Crear el Curso/Asignatura con los datos del Excel
  return prisma.course.create({
    data: {
      name: data.Asignatura || data.subject,
      level: data.Nivel || data.level,
      parallel: data.Paralelo || data.parallel,
      max_capacity: parseInt(data.Cupo) || 0,
      current_students: parseInt(data.Registrados) || 0,
      career_id: career.id
    }
  });
}

}

