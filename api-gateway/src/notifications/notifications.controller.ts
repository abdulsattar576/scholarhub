import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('v1/notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(@Req() req: any) {
    // Automatically evaluate upcoming deadline alerts for the student on fetch
    await this.notificationsService.dispatchDeadlineAlerts(req.user.id);
    return await this.notificationsService.getUserNotifications(req.user.id);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    return await this.notificationsService.markAsRead(id, req.user.id);
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: any) {
    return await this.notificationsService.markAllAsRead(req.user.id);
  }

  @Post('check-alerts')
  async checkAlerts(@Req() req: any) {
    return await this.notificationsService.dispatchDeadlineAlerts(req.user.id);
  }
}

