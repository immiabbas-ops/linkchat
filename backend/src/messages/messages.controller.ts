import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import {
  SendMessageDto,
  EditMessageDto,
  ReactMessageDto,
  ForwardMessageDto,
  DeleteMessageDto,
  MarkReadDto,
} from './dto/message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatGateway } from '../gateway/chat.gateway';

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(
    private messages: MessagesService,
    private moduleRef: ModuleRef,
  ) {}

  @Get('chat/:chatId')
  getMessages(
    @Param('chatId') chatId: string,
    @Req() req: { user: { userId: string } },
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messages.getMessages(chatId, req.user.userId, cursor, limit ? parseInt(limit, 10) || 30 : 30);
  }

  @Post()
  async send(@Req() req: { user: { userId: string } }, @Body() dto: SendMessageDto) {
    const message = await this.messages.sendMessage(req.user.userId, dto);
    const gateway = this.moduleRef.get(ChatGateway, { strict: false });
    await gateway?.publishMessage(dto.chatId, message);
    return message;
  }

  @Patch(':id')
  edit(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() dto: EditMessageDto,
  ) {
    return this.messages.editMessage(id, req.user.userId, dto);
  }

  @Delete(':id')
  deleteMsg(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() dto: DeleteMessageDto,
  ) {
    return this.messages.deleteMessage(id, req.user.userId, dto);
  }

  @Post(':id/react')
  react(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() dto: ReactMessageDto,
  ) {
    return this.messages.reactToMessage(id, req.user.userId, dto);
  }

  @Post(':id/forward')
  async forward(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() dto: ForwardMessageDto,
  ) {
    const message = await this.messages.forwardMessage(id, req.user.userId, dto);
    const gateway = this.moduleRef.get(ChatGateway, { strict: false });
    await gateway?.publishMessage(dto.targetChatId, message);
    return message;
  }

  @Post(':id/star')
  star(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.messages.starMessage(id, req.user.userId);
  }

  @Post('read')
  async markRead(@Req() req: { user: { userId: string } }, @Body() dto: MarkReadDto) {
    const result = await this.messages.markAsRead(dto.chatId, req.user.userId, dto.messageId);
    if (result.messageIds?.length) {
      const gateway = this.moduleRef.get(ChatGateway, { strict: false });
      await gateway?.publishRead(dto.chatId, {
        chatId: dto.chatId,
        userId: req.user.userId,
        messageIds: result.messageIds,
      });
    }
    return result;
  }

  @Get('search')
  search(
    @Req() req: { user: { userId: string } },
    @Query('q') q: string,
    @Query('chatId') chatId?: string,
  ) {
    return this.messages.searchMessages(req.user.userId, q, chatId);
  }

  @Get('starred')
  starred(@Req() req: { user: { userId: string } }) {
    return this.messages.getStarredMessages(req.user.userId);
  }

  @Get(':id/info')
  getInfo(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.messages.getMessageInfo(id, req.user.userId);
  }
}
