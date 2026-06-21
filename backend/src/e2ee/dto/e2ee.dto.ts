import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RegisterDeviceKeyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  publicKey: string;
}

export class KeyBundleItemDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  wrappedKey: string;

  @ApiProperty()
  @IsString()
  ephemeralKey: string;

  @ApiProperty()
  @IsString()
  iv: string;
}

export class UploadKeyBundlesDto {
  @ApiProperty({ type: [KeyBundleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KeyBundleItemDto)
  bundles: KeyBundleItemDto[];
}
