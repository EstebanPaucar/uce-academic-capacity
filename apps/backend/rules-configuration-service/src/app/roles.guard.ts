import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
//import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  //constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 1. Validamos que el usuario exista (que haya pasado el AuthGuard)
    if (!user) {
      throw new ForbiddenException('Usuario no identificado.');
    }

    // 2. Validamos el Rol
    // Asumimos que tu Auth-Service guarda el rol en el JWT como "role"
    if (!user.role || user.role.toUpperCase() !== 'ADMIN') { // 🛡️ Compara siempre en MAYÚSCULAS
    throw new ForbiddenException('⛔ Acceso Denegado: Se requiere rol de Administrador.');
    }

    return true;
  }
}