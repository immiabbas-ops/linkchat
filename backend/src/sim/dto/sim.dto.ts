import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequestSimActivationDto {
  @ApiProperty({ example: '+971501234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: 'Etisalat' })
  @IsOptional()
  @IsString()
  carrier?: string;
}

export class VerifySimActivationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '0000' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class UpdateSimSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  receiveEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sendEnabled?: boolean;
}

export class SendSmsDto {
  @ApiProperty({ example: '+971509876543' })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  body: string;
}

export class DeviceInboundSmsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  from: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receivedAt?: string;
}
