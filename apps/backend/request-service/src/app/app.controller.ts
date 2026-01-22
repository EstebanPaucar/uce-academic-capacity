import { Controller, Get, Post, Patch, Body, Query, Param } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('requests')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  create(@Body() body: any) {
    return this.appService.createRequest(body);
  }

  @Get()
  getAll(@Query('role') role: string, @Query('userId') userId: string) {
    return this.appService.getRequests(role, Number(userId));
  }

  @Patch(':id/resolve')
  resolve(@Param('id') id: string, @Body() body: { status: 'APPROVED' | 'REJECTED', resolutionCode?: string }) {
    return this.appService.resolveRequest(Number(id), body.status, body.resolutionCode);
  }
}