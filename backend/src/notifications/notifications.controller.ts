import { Controller, Get, Patch, Param, Query, UseGuards, Req, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get()
  getAll(
    @Req() req: { user: { userId: string } },
    @Query('cursor') cursor?: string,
  ) {
    return this.notifications.getNotifications(req.user.userId, cursor);
  }

  @Get('unread-count')
  unreadCount(@Req() req: { user: { userId: string } }) {
    return this.notifications.getUnreadCount(req.user.userId);
  }

  @Patch(':id/read')
  markRead(@Req() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.notifications.markRead(req.user.userId, id);
  }

  @Post('read-all')
  markAllRead(@Req() req: { user: { userId: string } }) {
    return this.notifications.markAllRead(req.user.userId);
  }
}
