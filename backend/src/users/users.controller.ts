import { Controller, Get, Patch, Body, Query, UseGuards, Req, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from '../auth/dto/auth.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me')
  getMe(@Req() req: { user: { userId: string } }) {
    return this.users.getMe(req.user.userId);
  }

  @Patch('me')
  updateProfile(@Req() req: { user: { userId: string } }, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(req.user.userId, dto);
  }

  @Get('search')
  search(
    @Req() req: { user: { userId: string } },
    @Query('q') q: string,
  ) {
    return this.users.searchUsers(q, req.user.userId);
  }

  @Get('by-username/:username')
  getByUsername(
    @Req() req: { user: { userId: string } },
    @Param('username') username: string,
  ) {
    return this.users.getByUsername(username, req.user.userId);
  }

  @Patch('settings')
  updateSettings(
    @Req() req: { user: { userId: string } },
    @Body() body: Record<string, unknown>,
  ) {
    return this.users.updateSettings(req.user.userId, body);
  }
}
