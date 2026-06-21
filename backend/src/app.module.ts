import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ChatsModule } from './chats/chats.module';
import { MessagesModule } from './messages/messages.module';
import { MediaModule } from './media/media.module';
import { ServicesModule } from './services/services.module';
import { FamilyModule } from './family/family.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ConnectorsModule } from './connectors/connectors.module';
import { ContactsModule } from './contacts/contacts.module';
import { TelegramModule } from './telegram/telegram.module';
import { SimModule } from './sim/sim.module';
import { E2eeModule } from './e2ee/e2ee.module';
import { ChatGateway } from './gateway/chat.gateway';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    ChatsModule,
    MessagesModule,
    MediaModule,
    ServicesModule,
    FamilyModule,
    NotificationsModule,
    ConnectorsModule,
    ContactsModule,
    TelegramModule,
    SimModule,
    E2eeModule,
  ],
  controllers: [HealthController],
  providers: [ChatGateway],
})
export class AppModule {}
