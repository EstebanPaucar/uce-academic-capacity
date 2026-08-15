import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('analytics')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getStats(@Query('role') role: string, @Query('facultyId') facultyId: string) {
    return this.appService.getAnalytics(role, Number(facultyId));
  }
}