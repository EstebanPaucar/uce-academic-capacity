import { Controller, Get } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AppService } from './app.service';

@Controller('audit') // Prefijo para las rutas HTTP: /api/audit
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * 1. PARTE ASÍNCRONA (RabbitMQ)
   * Escucha los eventos que enviamos desde Ingestión o Auth.
   */
  @EventPattern('log_created') 
  async handleLogCreated(@Payload() data: any) {
    console.log('📥 Mensaje capturado desde RabbitMQ:', data);
    
    // Guardamos el log en MongoDB usando el servicio
    try {
      const savedLog = await this.appService.createLog(data);
      console.log('✅ Log guardado en MongoDB con ID:', savedLog._id);
    } catch (error) {
      console.error('❌ Error al guardar el log de auditoría:', error);
    }
  }

  /**
   * 2. PARTE SÍNCRONA (HTTP)
   * Permite consultar todos los logs desde el Frontend o Postman.
   */
  @Get('logs')
  async getLogs() {
    return await this.appService.getAllLogs();
  }
}