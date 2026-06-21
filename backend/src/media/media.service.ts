import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private s3: S3Client | null = null;
  private bucket: string;
  private publicUrl: string;
  private useLocalStorage: boolean;
  private localDir: string;
  private apiPublicUrl: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.useLocalStorage = this.config.get('USE_LOCAL_STORAGE', 'true') === 'true';
    this.bucket = this.config.get('S3_BUCKET', 'linkchat-media');
    this.publicUrl = this.config.get('S3_PUBLIC_URL', 'http://localhost:9000/linkchat-media');
    this.apiPublicUrl = this.config.get(
      'API_PUBLIC_URL',
      `http://localhost:${this.config.get('PORT', 4000)}/api/v1`,
    ).replace(/\/$/, '');
    this.localDir = path.join(process.cwd(), 'uploads');
    fs.mkdirSync(this.localDir, { recursive: true });

    if (!this.useLocalStorage) {
      this.s3 = new S3Client({
        region: this.config.get('S3_REGION', 'us-east-1'),
        endpoint: this.config.get('S3_ENDPOINT'),
        forcePathStyle: true,
        credentials: {
          accessKeyId: this.config.get('S3_ACCESS_KEY', 'linkchat'),
          secretAccessKey: this.config.get('S3_SECRET_KEY', 'linkchat_dev_secret'),
        },
      });
      this.ensureBucket();
    } else {
      this.logger.log('Using local file storage for media uploads');
    }
  }

  private async ensureBucket() {
    if (!this.s3) return;
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
      } catch (e) {
        this.logger.warn('Could not create S3 bucket — falling back to local storage');
        this.useLocalStorage = true;
        this.s3 = null;
      }
    }
  }

  async getUploadUrl(userId: string, fileName: string, mimeType: string) {
    const ext = fileName.split('.').pop() || 'bin';
    const key = `uploads/${userId}/${uuidv4()}.${ext}`;

    if (this.useLocalStorage) {
      const url = `${this.apiPublicUrl}/media/files/${key}`;
      const mediaFile = await this.prisma.mediaFile.create({
        data: {
          uploaderId: userId,
          fileName,
          mimeType,
          fileSize: 0,
          storageKey: key,
          url,
        },
      });

      return {
        uploadUrl: `${this.apiPublicUrl}/media/upload/${mediaFile.id}`,
        mediaFileId: mediaFile.id,
        url,
        key,
        storage: 'local' as const,
      };
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(this.s3!, command, { expiresIn: 3600 });
    const url = `${this.publicUrl}/${key}`;

    const mediaFile = await this.prisma.mediaFile.create({
      data: {
        uploaderId: userId,
        fileName,
        mimeType,
        fileSize: 0,
        storageKey: key,
        url,
      },
    });

    return { uploadUrl, mediaFileId: mediaFile.id, url, key, storage: 's3' as const };
  }

  async saveLocalUpload(
    mediaFileId: string,
    userId: string,
    buffer: Buffer,
    mimeType?: string,
  ) {
    const file = await this.prisma.mediaFile.findFirst({
      where: { id: mediaFileId, uploaderId: userId },
    });
    if (!file) throw new NotFoundException('Upload not found');

    const filePath = path.join(this.localDir, file.storageKey);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buffer);

    return this.prisma.mediaFile.update({
      where: { id: mediaFileId },
      data: {
        fileSize: buffer.length,
        ...(mimeType ? { mimeType } : {}),
      },
    });
  }

  async uploadDirect(userId: string, file: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException('File is required');

    const ext = file.originalname.split('.').pop() || 'bin';
    const key = `uploads/${userId}/${uuidv4()}.${ext}`;

    if (this.useLocalStorage) {
      const filePath = path.join(this.localDir, key);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, file.buffer);
      const url = `${this.apiPublicUrl}/media/files/${key}`;
      const mediaFile = await this.prisma.mediaFile.create({
        data: {
          uploaderId: userId,
          fileName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          storageKey: key,
          url,
        },
      });
      return { mediaFileId: mediaFile.id, url, key };
    }

    await this.s3!.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const url = `${this.publicUrl}/${key}`;
    const mediaFile = await this.prisma.mediaFile.create({
      data: {
        uploaderId: userId,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        storageKey: key,
        url,
      },
    });

    return { mediaFileId: mediaFile.id, url, key };
  }

  getLocalFilePath(storageKey: string) {
    const safeKey = storageKey.replace(/\.\./g, '');
    const filePath = path.join(this.localDir, safeKey);
    if (!filePath.startsWith(this.localDir)) {
      throw new NotFoundException('File not found');
    }
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }
    return filePath;
  }

  async assertFileAccess(storageKey: string, userId?: string) {
    const file = await this.prisma.mediaFile.findFirst({
      where: { storageKey },
      select: { uploaderId: true, messageId: true, message: { select: { chatId: true } } },
    });
    if (!file) throw new NotFoundException('File not found');

    if (!file.messageId) {
      if (!userId || file.uploaderId !== userId) {
        throw new NotFoundException('File not found');
      }
      return;
    }

    if (!userId) return;

    const member = await this.prisma.chatMember.findFirst({
      where: {
        chatId: file.message!.chatId,
        userId,
        leftAt: null,
      },
    });
    if (member || file.uploaderId === userId) return;

    throw new NotFoundException('File not found');
  }

  async confirmUpload(mediaFileId: string, userId: string, fileSize: number) {
    const file = await this.prisma.mediaFile.findFirst({
      where: { id: mediaFileId, uploaderId: userId },
    });
    if (!file) return null;

    return this.prisma.mediaFile.update({
      where: { id: mediaFileId },
      data: { fileSize },
    });
  }

  async attachToMessage(mediaFileId: string, messageId: string) {
    return this.prisma.mediaFile.update({
      where: { id: mediaFileId },
      data: { messageId },
    });
  }

  /** Rewrite dev / IP / HTTP URLs stored in DB to the public HTTPS API origin. */
  resolvePublicUrl(url?: string | null): string | undefined {
    if (!url) return undefined;
    try {
      const parsed = new URL(url);
      const base = new URL(`${this.apiPublicUrl}/`);
      const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(parsed.hostname);
      const needsRewrite =
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        isIp ||
        (parsed.protocol === 'http:' && base.protocol === 'https:') ||
        parsed.hostname !== base.hostname;

      if (needsRewrite) {
        return `${base.origin}${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return url;
    }
    return url;
  }

  mapMediaFile<T extends { url: string; thumbnailUrl?: string | null }>(file: T): T {
    return {
      ...file,
      url: this.resolvePublicUrl(file.url) ?? file.url,
      ...(file.thumbnailUrl != null
        ? { thumbnailUrl: this.resolvePublicUrl(file.thumbnailUrl) ?? file.thumbnailUrl }
        : {}),
    };
  }
}
