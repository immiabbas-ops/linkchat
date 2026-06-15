import { Module } from '@nestjs/common';
import { ConnectorsController } from './connectors.controller';
import { ConnectorsService } from './connectors.service';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [TelegramModule],
  controllers: [ConnectorsController],
  providers: [ConnectorsService],
  exports: [ConnectorsService],
})
export class ConnectorsModule {}
