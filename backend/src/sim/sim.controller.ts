import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SimService } from './sim.service';
import {
  DeviceInboundSmsDto,
  RequestSimActivationDto,
  SendSmsDto,
  UpdateSimSettingsDto,
  VerifySimActivationDto,
} from './dto/sim.dto';

@ApiTags('sim')
@Controller('sim')
export class SimController {
  constructor(private sim: SimService) {}

  @Get('status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  status(@Req() req: { user: { userId: string } }) {
    return this.sim.getStatus(req.user.userId);
  }

  @Post('request-activation')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  requestActivation(@Req() req: { user: { userId: string } }, @Body() dto: RequestSimActivationDto) {
    return this.sim.requestActivation(req.user.userId, dto.phone, dto.carrier);
  }

  @Post('verify')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  verify(@Req() req: { user: { userId: string } }, @Body() dto: VerifySimActivationDto) {
    return this.sim.verifyActivation(req.user.userId, dto);
  }

  @Patch('settings')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  settings(@Req() req: { user: { userId: string } }, @Body() dto: UpdateSimSettingsDto) {
    return this.sim.updateSettings(req.user.userId, dto);
  }

  @Post('deactivate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  deactivate(@Req() req: { user: { userId: string } }) {
    return this.sim.deactivate(req.user.userId);
  }

  @Post('send')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  send(@Req() req: { user: { userId: string } }, @Body() dto: SendSmsDto) {
    return this.sim.sendSms(req.user.userId, dto);
  }

  @Post('device/inbound')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  deviceInbound(@Req() req: { user: { userId: string } }, @Body() dto: DeviceInboundSmsDto) {
    return this.sim.handleDeviceInbound(req.user.userId, dto);
  }
}
