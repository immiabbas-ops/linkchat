import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsInt, IsBoolean } from 'class-validator';
import { FamilyService } from './family.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class CreateFamilyDto {
  @IsString()
  name: string;
}

class AddSpouseDto {
  @IsEmail()
  email: string;
}

class AddChildDto {
  @IsString()
  displayName: string;

  @IsOptional()
  @IsInt()
  age?: number;

  @IsEmail()
  email: string;
}

class UpdateChildDto {
  @IsOptional()
  @IsInt()
  screenTimeLimit?: number;

  @IsOptional()
  approvedContacts?: string[];

  @IsOptional()
  @IsBoolean()
  restrictedMode?: boolean;
}

@ApiTags('family')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('family')
export class FamilyController {
  constructor(private family: FamilyService) {}

  @Get()
  getFamily(@Req() req: { user: { userId: string } }) {
    return this.family.getFamilyGroup(req.user.userId);
  }

  @Post()
  create(@Req() req: { user: { userId: string } }, @Body() dto: CreateFamilyDto) {
    return this.family.createFamilyGroup(req.user.userId, dto.name);
  }

  @Post('spouse')
  addSpouse(@Req() req: { user: { userId: string } }, @Body() dto: AddSpouseDto) {
    return this.family.addSpouse(req.user.userId, dto.email);
  }

  @Post('child')
  addChild(@Req() req: { user: { userId: string } }, @Body() dto: AddChildDto) {
    return this.family.addChildProfile(req.user.userId, dto);
  }

  @Patch('child/:id')
  updateChild(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() dto: UpdateChildDto,
  ) {
    return this.family.updateChildPermissions(req.user.userId, id, dto);
  }
}
