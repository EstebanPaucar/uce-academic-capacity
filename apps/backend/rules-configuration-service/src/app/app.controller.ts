import { Body, Controller, Inject, Post, Logger, Get, UseGuards, Request } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AuthGuard } from '@nestjs/passport'; // El guardia estándar de JWT
import { RolesGuard } from './roles.guard'; // 🚩 Nuestro nuevo guardia

@Controller('rules')
export class AppController {
  private readonly logger = new Logger(AppController.name);

  // Memoria temporal
  private currentConfig = {
    UMBRAL_ALERTA: 80,
    MIN_ESTUDIANTES: 35
  };

  constructor(@Inject('RULES_MQ') private readonly client: ClientProxy) {}

  @Get()
  // @UseGuards(AuthGuard('jwt')) // Opcional: ¿Cualquiera puede VER las reglas?
  getRules() {
    return this.currentConfig;
  }

  @Post('update')
  @UseGuards(AuthGuard('jwt'), RolesGuard) // 🛑 DOBLE CANDADO: 1. Token válido, 2. Es Admin
  async updateRule(@Body() body: { key: 'UMBRAL_ALERTA' | 'MIN_ESTUDIANTES'; value: number }, @Request() req: any) {
    
    // Log de auditoría interna
    this.logger.log(`👮 Admin ${req.user.username} está cambiando ${body.key} a ${body.value}`);
    
    // Actualizamos memoria local
    this.currentConfig[body.key] = body.value;

    // Enviamos a RabbitMQ
    this.client.emit('rule_updated', {
      key: body.key,
      value: body.value,
      adminUser: req.user.username // Trazabilidad extra para Go
    });

    return { 
      status: 'success', 
      message: `Regla ${body.key} actualizada correctamente por Administrador.` 
    };
  }
}