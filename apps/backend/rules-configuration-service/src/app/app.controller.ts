import { Body, Controller, Inject, Post, Logger, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RolesGuard } from './roles.guard';

@Controller('rules')
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    @Inject('RULES_MQ') private readonly client: ClientProxy // Inyectamos el cliente del Module
  ) {}

  @Post('update')
  @UseGuards(RolesGuard) // 🔒 Protegido
  async updateRule(@Body() body: { key: string; value: number }) {
    
    this.logger.log(`📢 ADMIN cambiando regla ${body.key} a ${body.value}%`);

    // 1. Emitir evento a la cola (Fanout lógico)
    // Esto lo escuchará Go (para RAM) y Academic-Structure (para Recálculo)
    this.client.emit('rule_updated', {
      key: body.key,
      value: body.value,
      timestamp: new Date()
    });

    return { 
      status: 'success', 
      message: `Regla actualizada. El sistema se está recalculando.` 
    };
  }
}