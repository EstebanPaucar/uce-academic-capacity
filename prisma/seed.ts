import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Database Seeding (UCE Data) ---');

  // 1. Crear Facultad
  const faculty = await prisma.faculty.upsert({
    where: { name: 'ARQUITECTURA Y URBANISMO' },
    update: {},
    create: { name: 'ARQUITECTURA Y URBANISMO' },
  });

  // 2. Crear Carrera
  const career = await prisma.career.upsert({
    where: { id: 1 }, // Usamos ID fijo para consistencia en pruebas
    update: {},
    create: {
      id: 1,
      name: 'ARQUITECTURA (R)',
      faculty_id: faculty.id,
    },
  });

  // 3. Crear Asignaturas (Datos reales del Excel)
  const coursesData = [
    {
      name: 'FUNDAMENTOS DE EXPRESIÓN PLÁSTICA',
      level: 'PRIMERO',
      parallel: 'A1-001',
      max_capacity: 30,
      current_students: 32,
    },
    {
      name: 'FUNDAMENTOS DE LA FÍSICA APLICADA AL DISEÑO Y ARQUITECTURA I',
      level: 'PRIMERO',
      parallel: 'A1-001',
      max_capacity: 40,
      current_students: 36,
    },
    {
      name: 'FUNDAMENTOS DE LA MATEMÁTICA APLICADA AL DISEÑO Y ARQUITECTURA I',
      level: 'PRIMERO',
      parallel: 'A1-001',
      max_capacity: 30,
      current_students: 26,
    },
  ];

  for (const item of coursesData) {
    await prisma.course.create({
      data: {
        ...item,
        career_id: career.id,
      },
    });
  }

  console.log(`--- Seed finished: Created Faculty, Career and ${coursesData.length} Courses ---`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });