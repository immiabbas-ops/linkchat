import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { E2eeService } from './e2ee.service';
import { RegisterDeviceKeyDto, UploadKeyBundlesDto } from './dto/e2ee.dto';

@ApiTags('e2ee')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('e2ee')
export class E2eeController {
  constructor(private e2ee: E2eeService) {}

  @Post('keys')
  registerKey(@Req() req: { user: { userId: string } }, @Body() dto: RegisterDeviceKeyDto) {
    return this.e2ee.registerDeviceKey(req.user.userId, dto.deviceId, dto.publicKey);
  }

  @Get('users/:userId/key')
  getUserKey(@Param('userId') userId: string) {
    return this.e2ee.getUserPublicKey(userId);
  }

  @Get('chats/:chatId/bundle')
  getBundle(@Req() req: { user: { userId: string } }, @Param('chatId') chatId: string) {
    return this.e2ee.getChatKeyBundle(chatId, req.user.userId);
  }

  @Post('chats/:chatId/bundles')
  uploadBundles(
    @Req() req: { user: { userId: string } },
    @Param('chatId') chatId: string,
    @Body() dto: UploadKeyBundlesDto,
  ) {
    return this.e2ee.uploadKeyBundles(chatId, req.user.userId, dto.bundles);
  }
}
