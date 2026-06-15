import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePrivateChatDto {
  @ApiPropertyOptional()
  @IsString()
  participantId: string;
}

export class CreateGroupChatDto {
  @ApiPropertyOptional()
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional()
  participantIds: string[];
}

export class UpdateChatDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
