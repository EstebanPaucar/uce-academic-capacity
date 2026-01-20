import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // Extrae el token del encabezado 'Authorization: Bearer <TOKEN>'
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // ⚠️ IMPORTANTE: Debe ser la misma clave que usaste en auth-service
      secretOrKey: process.env.JWT_SECRET || 'uce_secret_key_2026',
    });
  }

  async validate(payload: any) {
    // Lo que retornes aquí se inyectará en 'req.user'
    return { userId: payload.sub, username: payload.username, role: payload.role };
  }
}