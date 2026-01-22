import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) throw new UnauthorizedException('Token no encontrado');

    const token = authHeader.split(' ')[1];
    try {
      // Decodificamos el token manualmente o usamos el AuthGuard de Passport si lo tienes configurado.
      // Aquí lo hacemos directo para simplicidad en este microservicio.
      const user = this.jwtService.decode(token) as any;
      
      if (!user) throw new UnauthorizedException('Token inválido');

      // 🛡️ VERIFICACIÓN DE ROL
      if (user.role !== 'ADMIN') {
        throw new ForbiddenException('⛔ Acceso Denegado: Solo Vicerrectorado puede cambiar reglas.');
      }

      request.user = user; // Guardamos el usuario en la request
      return true;

    } catch (e) {
      throw new ForbiddenException('Acceso denegado o token inválido');
    }
  }
}