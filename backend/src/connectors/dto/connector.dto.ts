import { IsEnum, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { ConnectorType } from '@prisma/client';

export class CreateConnectorDto {
  @IsEnum(ConnectorType)
  type: ConnectorType;

  @IsString()
  @MinLength(1)
  label: string;

  @IsString()
  @IsOptional()
  identifier?: string;

  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;
}
