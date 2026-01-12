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

import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @EventPattern('course_created') // Escucha el evento del ETL
  async handleCourseCreated(@Payload() data: any) {
    console.log('Recibiendo datos del ETL:', data.subject);
    await this.appService.saveCourseFromETL(data);
  }
}

