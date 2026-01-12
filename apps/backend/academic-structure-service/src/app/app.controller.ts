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

import { Controller, Get } from '@nestjs/common'; // Agregamos Get
import { EventPattern, Payload } from '@nestjs/microservices';
import { AppService } from './app.service';

@Controller('structure') // Especificamos que este controlador maneja /structure
export class AppController {
  constructor(private readonly appService: AppService) {}

  // --- ESTO ES LO QUE LE FALTA PARA EL FRONTEND ---
  @Get()
  async getData() {
    console.log('Petición GET recibida desde el frontend');
    return this.appService.getStructure();
  }

  // --- ESTO ES LO QUE YA TENÍAS PARA EL ETL ---
  @EventPattern('course_created')
  async handleCourseCreated(@Payload() data: any) {
    console.log('Recibiendo datos del ETL:', data.Asignatura); 
    await this.appService.saveCourseFromETL(data);
  }
}