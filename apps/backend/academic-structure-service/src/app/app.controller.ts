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

import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('structure') // Esto crea la ruta /api/structure
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getStructure();
  }
}

