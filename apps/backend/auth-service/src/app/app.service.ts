import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AuthService {
  private prisma = new PrismaClient();

  constructor(private jwtService: JwtService) {}

  // Registro adaptado a tu schema.prisma
  async register(userData: any) {
    // Encriptamos la clave antes de guardarla
    const hash = await bcrypt.hash(userData.password, 10);
    
    return this.prisma.user.create({
      data: {
        username: userData.username,
        email: userData.email,
        passwordHash: hash, // Mapeado a password_hash en tu DB
        roleId: userData.roleId, // Relación con el modelo Role
        facultyId: userData.facultyId || null,
      },
    });
  }

  // Login adaptado
  async login(email: string, pass: string) {
    // Buscamos por email e incluimos el rol para el token
    const user = await this.prisma.user.findUnique({ 
      where: { email },
      include: { role: true } 
    });
    
    // Comparamos el hash guardado con la contraseña ingresada
    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const payload = { 
        sub: user.id, 
        username: user.username,
        role: user.role.name // Usamos el nombre del rol (ADMIN, DIRECTOR, etc)
      };
      
      return {
        access_token: this.jwtService.sign(payload),
        user: {
          id: user.id,
          username: user.username,
          role: user.role.name
        }
      };
    }
    throw new UnauthorizedException('Credenciales inválidas para la UCE');
  }
}