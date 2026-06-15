import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ChatsService } from './chats.service';
import { CreatePrivateChatDto, CreateGroupChatDto, UpdateChatDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('chats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatsController {
  constructor(private chats: ChatsService) {}

  @Get()
  getChats(
    @Req() req: { user: { userId: string } },
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chats.getUserChats(req.user.userId, cursor, limit ? parseInt(limit) : 20);
  }

  @Get('search')
  search(@Req() req: { user: { userId: string } }, @Query('q') q: string) {
    return this.chats.searchChats(req.user.userId, q);
  }

  @Get(':id')
  getChat(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.chats.getChat(id, req.user.userId);
  }

  @Post('private')
  createPrivate(
    @Req() req: { user: { userId: string } },
    @Body() dto: CreatePrivateChatDto,
  ) {
    return this.chats.createPrivateChat(req.user.userId, dto);
  }

  @Post('group')
  createGroup(
    @Req() req: { user: { userId: string } },
    @Body() dto: CreateGroupChatDto,
  ) {
    return this.chats.createGroupChat(req.user.userId, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() dto: UpdateChatDto,
  ) {
    return this.chats.updateChat(id, req.user.userId, dto);
  }

  @Post(':id/pin')
  pin(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.chats.pinChat(id, req.user.userId);
  }

  @Post(':id/unpin')
  unpin(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.chats.unpinChat(id, req.user.userId);
  }

  @Post(':id/mute')
  mute(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.chats.muteChat(id, req.user.userId);
  }

  @Post(':id/unmute')
  unmute(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.chats.unmuteChat(id, req.user.userId);
  }

  @Post(':id/archive')
  archive(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.chats.archiveChat(id, req.user.userId);
  }

  @Post(':id/unarchive')
  unarchive(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.chats.unarchiveChat(id, req.user.userId);
  }

  @Post(':id/pin-message')
  pinMessage(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() body: { messageId: string },
  ) {
    return this.chats.pinMessage(id, req.user.userId, body.messageId);
  }

  @Post(':id/unpin-message')
  unpinMessage(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.chats.unpinMessage(id, req.user.userId);
  }

  @Get(':id/media')
  getMedia(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Query('type') type?: string,
  ) {
    return this.chats.getChatMedia(id, req.user.userId, type);
  }

  @Post('block/:userId')
  blockUser(@Param('userId') blockedUserId: string, @Req() req: { user: { userId: string } }) {
    return this.chats.blockUser(req.user.userId, blockedUserId);
  }

  @Post('unblock/:userId')
  unblockUser(@Param('userId') blockedUserId: string, @Req() req: { user: { userId: string } }) {
    return this.chats.unblockUser(req.user.userId, blockedUserId);
  }
}
