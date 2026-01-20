import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seeding...');

  // 1. Crear Roles (Quitamos los nombres de variables innecesarios)
  await prisma.role.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'ADMIN',
      permissions: { all: true, upload: true, delete: true },
    },
  });

  await prisma.role.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      name: 'DIRECTOR',
      permissions: { all: false, upload: true, delete: false },
    },
  });

  console.log('✅ Roles created: ADMIN, DIRECTOR');

  // 2. Crear Usuario Administrador inicial
  const adminPassword = await bcrypt.hash('admin123', 10);
  
  await prisma.user.upsert({
    where: { email: 'admin@uce.edu.ec' },
    update: {},
    create: {
      username: 'admin_uce',
      email: 'admin@uce.edu.ec',
      passwordHash: adminPassword,
      roleId: 1, // Usamos directamente el ID 1 (ADMIN)
    },
  });

  console.log('✅ Default ADMIN user created: admin@uce.edu.ec / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });