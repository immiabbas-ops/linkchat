import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';
import type { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import * as path from 'path';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const AUDIO_MIME: Record<string, string> = {
  '.webm': 'audio/webm',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.mp4': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.aac': 'audio/aac',
};

class UploadUrlDto {
  @IsString()
  fileName: string;

  @IsString()
  mimeType: string;
}

class ConfirmUploadDto {
  @IsString()
  mediaFileId: string;

  @IsInt()
  @Min(0)
  fileSize: number;
}

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private media: MediaService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('upload-url')
  getUploadUrl(@Req() req: { user: { userId: string } }, @Body() dto: UploadUrlDto) {
    return this.media.getUploadUrl(req.user.userId, dto.fileName, dto.mimeType);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  uploadDirect(
    @Req() req: { user: { userId: string } },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.media.uploadDirect(req.user.userId, file);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('confirm')
  confirm(@Req() req: { user: { userId: string } }, @Body() dto: ConfirmUploadDto) {
    return this.media.confirmUpload(dto.mediaFileId, req.user.userId, dto.fileSize);
  }

  @Get('files/:path(*)')
  serveFile(@Req() req: Request, @Param('path') storageKey: string, @Res() res: Response) {
    const key =
      storageKey ||
      req.originalUrl.split('/media/files/')[1]?.split('?')[0] ||
      '';

    if (!key) {
      res.status(404).json({ message: 'File not found', statusCode: 404 });
      return;
    }

    const filePath = this.media.getLocalFilePath(decodeURIComponent(key));
    const ext = path.extname(filePath).toLowerCase();
    const mime = AUDIO_MIME[ext];
    if (mime) {
      res.type(mime);
    }
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.sendFile(filePath);
  }
}
