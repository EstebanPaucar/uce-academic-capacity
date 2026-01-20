import { Controller, Get, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { AppService } from './app.service';

@Controller('structure')
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Get()
  async getData() {
    this.logger.log('Frontend request: Fetching academic structure');
    return this.appService.getStructure();
  }

  // --- RECEPTOR DE RESULTADOS (GO ENGINE) ---
  @EventPattern('course_created') 
  async handleCourseCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    // 🚩 Log actualizado: Confirmamos que el mensaje viene de la etapa de cálculo
    this.logger.log(`📥 Result received from Go for course: ${data.name || 'Unknown'}`);

    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      // 2. Persistencia jerárquica directa en PostgreSQL [cite: 2026-01-18]
      await this.appService.saveAcademicData(data);
      
      // 3. Confirmación manual exitosa [cite: 2026-01-18]
      channel.ack(originalMsg);
      this.logger.log(`✅ Success: ${data.name} persisted with status ${data.status}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Persistence Error: ${errorMessage}`);
      
      // 4. Rechazo sin reencolar para evitar bucles en AWS Academy [cite: 2026-01-06]
      channel.nack(originalMsg, false, false);
    }
  }
}