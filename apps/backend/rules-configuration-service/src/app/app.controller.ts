import { Body, Controller, Inject, Post, Logger, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RolesGuard } from './roles.guard';

@Controller('rules')
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    @Inject('RULES_MQ') private readonly clientGo: ClientProxy,      // Para Go
    @Inject('STRUCTURE_MQ') private readonly clientStructure: ClientProxy // Para NestJS
  ) {}

  @Post('update')
  @UseGuards(RolesGuard)
  async updateRule(@Body() body: { key: string; value: number }) {
    
    this.logger.log(`📢 ADMIN cambiando regla ${body.key} a ${body.value}%`);

    const payload = {
      key: body.key,
      value: body.value,
      timestamp: new Date()
    };

    // 1. Avisar a Go (Actualiza variable en RAM)
    this.clientGo.emit('rule_updated', payload);

    // 2. Avisar a Academic Structure (Inicia loop de base de datos)
    this.clientStructure.emit('rule_updated', payload);

    return { 
      status: 'success', 
      message: `Regla actualizada. El sistema se está recalculando en BD y Memoria.` 
    };
  }
}