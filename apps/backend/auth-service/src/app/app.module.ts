import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppController } from './app.controller';
import { AuthService } from './app.service';

@Module({
  imports: [
    PassportModule,
    // Configuración del JWT
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'uce_secret_key_2026', // Usa una variable de entorno
      signOptions: { expiresIn: '8h' }, // El token dura una jornada laboral
    }),
  ],
  controllers: [AppController],
  providers: [AuthService],
})
export class AppModule {}