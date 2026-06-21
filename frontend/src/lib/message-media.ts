import { resolveMediaUrl } from './media-url';
import type { MediaFile, Message } from '@/types';

export function getMessageMediaFile(message: Message): MediaFile | null {
  const fromDb = message.mediaFiles?.[0];
  if (fromDb) return fromDb;

  const url = message.metadata?.url as string | undefined;
  if (!url) return null;

  return {
    id: (message.metadata?.mediaFileId as string) || 'pending-media',
    fileName: (message.metadata?.fileName as string) || message.content || 'file',
    mimeType: (message.metadata?.mimeType as string) || '',
    url: resolveMediaUrl(url),
    fileSize: message.metadata?.fileSize as number | undefined,
  };
}

export function isImageMedia(mimeType?: string, url?: string, fileName?: string): boolean {
  if (mimeType?.startsWith('video/')) return false;
  if (mimeType?.startsWith('image/')) return true;
  if (url && /\.(mp4|webm|mov|m4v|avi|mkv)(\?|$)/i.test(url)) return false;
  if (url && /\.(jpe?g|png|webp|gif|bmp|heic|avif)(\?|$)/i.test(url)) return true;
  if (fileName && /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(fileName)) return false;
  return !!fileName && /\.(jpe?g|png|webp|gif|bmp|heic|avif)$/i.test(fileName);
}

export function isVideoMedia(mimeType?: string, url?: string, fileName?: string): boolean {
  if (mimeType?.startsWith('video/')) return true;
  if (url && /\.(mp4|webm|mov|m4v|avi|mkv|3gp)(\?|$)/i.test(url)) return true;
  return !!fileName && /\.(mp4|webm|mov|m4v|avi|mkv|3gp)$/i.test(fileName);
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileExtension(fileName?: string): string {
  if (!fileName) return 'FILE';
  const ext = fileName.split('.').pop()?.toUpperCase();
  return ext && ext.length <= 6 ? ext : 'FILE';
}

export function getDocIconColor(ext: string): string {
  if (ext === 'PDF') return 'bg-[#e74c3c]';
  if (['DOC', 'DOCX'].includes(ext)) return 'bg-[#2b579a]';
  if (['XLS', 'XLSX', 'CSV'].includes(ext)) return 'bg-[#217346]';
  if (['PPT', 'PPTX'].includes(ext)) return 'bg-[#d24726]';
  if (['ZIP', 'RAR', '7Z'].includes(ext)) return 'bg-[#f39c12]';
  return 'bg-[#8696a0]';
}
