import { Controller, Get, Query} from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { AppService } from './app.service';

@Controller('notifications')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @EventPattern('course_created')
  async handleNotification(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const msg = context.getMessage();
    
    await this.appService.processResult(data);
    channel.ack(msg);
  }

  @Get()
  async getAlerts(@Query('role') role: string, @Query('facultyId') facultyId: string) {
    return this.appService.getNotifications(role, Number(facultyId));
  }
}