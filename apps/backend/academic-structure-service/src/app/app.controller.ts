import { Controller, Get, Logger, Inject } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext, ClientProxy } from '@nestjs/microservices';
import { AppService } from './app.service';



@Controller('structure')
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    // 🚩 INYECCIÓN: Cliente para reenviar datos a Go cuando cambien las reglas
    @Inject('CALCULATION_SERVICE') private readonly calcClient: ClientProxy
  ) {}

  @Get()
  async getData() {
    this.logger.log('Frontend request: Fetching academic structure');
    return this.appService.getStructure();
  }

  // --- RECEPTOR DE RESULTADOS (GO ENGINE) ---
  @EventPattern('course_created') 
  async handleCourseCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    // this.logger.log(`📥 Result received from Go for course: ${data.name || 'Unknown'}`);

    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      // 2. Persistencia jerárquica directa en PostgreSQL
      await this.appService.saveAcademicData(data);
      
      // 3. Confirmación manual exitosa
      channel.ack(originalMsg);
      // this.logger.log(`✅ Success: ${data.name} persisted with status ${data.status}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Persistence Error: ${errorMessage}`);
      
      // 4. Rechazo sin reencolar
      channel.nack(originalMsg, false, false);
    }
  }

  // --- 🚩 NUEVO: RECEPTOR DE CAMBIO DE REGLAS ---
  @EventPattern('rule_updated')
  async handleRuleUpdate(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      this.logger.warn(`🔄 Regla '${data.key}' cambiada a ${data.value}. Iniciando RECÁLCULO MASIVO...`);

      // 1. Obtenemos TODOS los cursos de la BD (con Facultad y Carrera)
      const allCourses = await this.appService.getAllCoursesForRecalculation();
      
      this.logger.log(`📤 Re-enviando ${allCourses.length} cursos al motor Go con las nuevas reglas...`);

      // 2. Reenviamos cada curso a la cola de entrada de Go
      allCourses.forEach(course => {
        // Mapeamos el objeto de Prisma al formato JSON que Go espera
        const payload = {
          Facultad: course.career.faculty.name,
          Carrera: course.career.name,
          name: course.name,
          level: course.level,
          parallel: course.parallel,
          maxCapacity: course.maxCapacity,
          currentStudents: course.currentStudents
        };
        
        // Emitimos al mismo evento que usa el Ingestion Service
        this.calcClient.emit('course_created', payload);
      });

      // Confirmamos recepción del cambio de regla
      channel.ack(originalMsg);

    } catch (error) {
      this.logger.error(`Error en recálculo: ${error}`);
      channel.nack(originalMsg, false, false);
    }
  }
}