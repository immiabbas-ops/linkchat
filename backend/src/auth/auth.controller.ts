import { Controller, Post, Body, Get, UseGuards, Req, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  RequestOtpDto,
  VerifyOtpDto,
  RefreshTokenDto,
  CheckPhoneDto,
  LoginPhoneDto,
  RegisterPhoneDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('otp/request')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto);
  }

  @Post('otp/verify')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto);
  }

  @Post('phone/check')
  checkPhone(@Body() dto: CheckPhoneDto) {
    return this.auth.checkPhone(dto.phone);
  }

  @Post('phone/login')
  loginWithPhone(@Body() dto: LoginPhoneDto) {
    return this.auth.loginWithPhone(dto);
  }

  @Post('phone/register')
  registerWithPhone(@Body() dto: RegisterPhoneDto) {
    return this.auth.registerWithPhone(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refreshTokens(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Req() req: { user: { userId: string; deviceId: string } }) {
    return this.auth.logout(req.user.userId, req.user.deviceId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  logoutAll(@Req() req: { user: { userId: string } }) {
    return this.auth.logoutAllDevices(req.user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('devices')
  getDevices(@Req() req: { user: { userId: string } }) {
    return this.auth.getDevices(req.user.userId);
  }
}
