import { Module } from '@nestjs/common';
import { MessagesModule } from '../messages/messages.module';
import { TelegramService } from './telegram.service';

@Module({
  imports: [MessagesModule],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
