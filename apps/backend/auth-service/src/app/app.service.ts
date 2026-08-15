import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AuthService {
  private prisma = new PrismaClient();
  private readonly logger = new Logger(AuthService.name);

  constructor(private jwtService: JwtService) {}

  // --- REGISTRO DE USUARIOS ---
  async register(userData: any) {
    // 1. Validación previa: ¿Ya existe el email?
    const existingUser = await this.prisma.user.findUnique({
      where: { email: userData.email },
    });
    
    if (existingUser) {
      throw new BadRequestException('El correo electrónico ya está registrado.');
    }

    // 2. Encriptar contraseña
    const hash = await bcrypt.hash(userData.password, 10);

    try {
      // 3. Crear usuario usando 'connect' para las relaciones
      return await this.prisma.user.create({
        data: {
          username: userData.username,
          email: userData.email,
          passwordHash: hash,

          // ROL: Es obligatorio, usamos 'connect' para vincularlo al ID existente
          role: {
            connect: { id: Number(userData.roleId) }
          },

          // FACULTAD: Es opcional. Usamos propagación condicional.
          // Si userData.facultyId existe (es un número), conecta la facultad.
          // Si es null o undefined (caso Admin), esta sección se ignora y guarda NULL.
          ...(userData.facultyId && {
            faculty: {
              connect: { id: Number(userData.facultyId) }
            }
          })
        },
      });
    } catch (error: any) {
      this.logger.error(`Error al registrar usuario: ${error.message}`);
      
      // Manejo de errores de Prisma (Foreign Key fallida)
      if (error.code === 'P2025') {
        throw new BadRequestException('El Rol o la Facultad seleccionada no existen en la base de datos.');
      }
      throw new BadRequestException('No se pudo completar el registro.');
    }
  }

  // --- INICIO DE SESIÓN ---
  async login(email: string, pass: string) {
    // 1. Buscamos usuario + Rol + Facultad (JOIN automático de Prisma)
    const user = await this.prisma.user.findUnique({ 
      where: { email },
      include: { 
        role: true, 
        faculty: true // 🚩 IMPORTANTE: Traemos el nombre de la facultad
      } 
    });
    
    // 2. Validación de Contraseña
    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      
      // 3. Construcción del Payload del Token
      // Incluimos todos los datos que el Frontend necesita para filtrar la tabla
      const payload = { 
        sub: user.id, 
        username: user.username,
        role: user.role.name, // 'ADMIN' o 'DIRECTOR'
        facultyId: user.facultyId, // ID numérico (ej: 5) o null
        facultyName: user.faculty?.name // Nombre (ej: 'Ingeniería') o undefined
      };
      
      return {
        access_token: this.jwtService.sign(payload),
        user: {
          id: user.id,
          username: user.username,
          role: user.role.name,
          facultyId: user.facultyId,
          faculty: user.faculty // Enviamos el objeto completo por si acaso
        }
      };
    }

    throw new UnauthorizedException('Credenciales inválidas para la UCE');
  }
}