/*import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }
}*/

import { Controller, Get, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { AppService } from './app.service';

@Controller('structure') // Ruta base: /api/structure [cite: 2026-01-18]
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  // --- INTERFAZ PARA EL FRONTEND (REST) ---
  @Get()
  async getData() {
    this.logger.log('Frontend request: Fetching academic structure');
    // Retorna los datos que se mostrarán en las tablas de React
    return this.appService.getStructure();
  }

  // --- RECEPTOR PARA EL ETL (RABBITMQ) ---
  @EventPattern('course_created') // Debe coincidir con el emisor [cite: 2026-01-18]
  async handleCourseCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    this.logger.log(`ETL Data Received: Processing course ${data.Asignatura}`);
    
    try {
      // 1. Persistencia en PostgreSQL mediante Prisma
      await this.appService.saveAcademicData(data);
      
      // 2. Confirmación manual (Acknowledge) para mayor fiabilidad en AWS [cite: 2026-01-06]
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
      
    } catch (error) {
      this.logger.error(`Failed to process ETL record: ${error.message}`);
      // En AWS Academy, es vital loguear errores para depuración sin acceso total [cite: 2026-01-06]
    }
  }
}