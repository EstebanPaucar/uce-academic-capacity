import { Controller, Get, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { AppService } from './app.service';

@Controller('structure')
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  // --- INTERFAZ PARA EL FRONTEND (REST) ---
  @Get()
  async getData() {
    this.logger.log('Frontend request: Fetching academic structure');
    return this.appService.getStructure();
  }

  // --- RECEPTOR PARA EL ETL (RABBITMQ) ---
  @EventPattern('course_created') 
  async handleCourseCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    // 1. Log genérico para evitar errores de referencia en datos nulos [cite: 2026-01-18]
    this.logger.log('RabbitMQ message received. Starting persistence process...');

    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      // 2. Procesar los datos mediante el servicio [cite: 2026-01-18]
      await this.appService.saveAcademicData(data);
      
      // 3. Confirmación manual exitosa [cite: 2026-01-18]
      channel.ack(originalMsg);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`ETL Error: ${errorMessage}`);
      
      // 4. En caso de error, rechazamos el mensaje sin reencolarlo para evitar bucles [cite: 2026-01-06]
      // El segundo parámetro 'false' indica que no se vuelva a intentar procesar esta fila fallida
      channel.nack(originalMsg, false, false);
    }
  }
}