import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '@prisma/client';

export class SendMessageDto {
  @ApiProperty()
  @IsUUID()
  chatId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  content?: string;

  @ApiPropertyOptional({ enum: MessageType })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  replyToId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  mediaFileId?: string;
}

export class EditMessageDto {
  @ApiProperty()
  @IsString()
  @MaxLength(10000)
  content: string;
}

export class ReactMessageDto {
  @ApiProperty({ example: '👍' })
  @IsString()
  emoji: string;
}

export class ForwardMessageDto {
  @ApiProperty()
  @IsUUID()
  targetChatId: string;
}

export class DeleteMessageDto {
  @ApiPropertyOptional({ enum: ['ME', 'EVERYONE'] })
  @IsOptional()
  @IsString()
  scope?: 'ME' | 'EVERYONE';
}

export class MarkReadDto {
  @ApiProperty()
  @IsUUID()
  chatId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  messageId?: string;
}

export class SearchMessagesDto {
  @ApiProperty()
  @IsString()
  query: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  chatId?: string;
}
