import { Module } from '@nestjs/common';
import { SimController } from './sim.controller';
import { SimService } from './sim.service';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [MessagesModule],
  controllers: [SimController],
  providers: [SimService],
  exports: [SimService],
})
export class SimModule {}
