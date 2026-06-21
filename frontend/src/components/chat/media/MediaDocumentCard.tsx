'use client';

import { memo } from 'react';
import { Download, ExternalLink, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFileSize, getDocIconColor, getFileExtension } from '@/lib/message-media';
import { truncateFileName } from '@/lib/media-ui';
import { MediaUploadOverlay } from './MediaUploadOverlay';

interface MediaDocumentCardProps {
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  caption?: string;
  sending?: boolean;
  uploadProgress?: number;
  isSigned?: boolean;
  footerTime?: React.ReactNode;
}

export const MediaDocumentCard = memo(function MediaDocumentCard({
  fileUrl,
  fileName,
  fileSize,
  caption,
  sending,
  uploadProgress,
  isSigned,
  footerTime,
}: MediaDocumentCardProps) {
  const ext = getFileExtension(fileName);
  const shortName = truncateFileName(fileName, 28);
  const sizeLabel = formatFileSize(fileSize);
  const canPreview = ext === 'PDF' || fileUrl;

  return (
    <div className="relative min-w-[240px]">
      <div className="flex items-center gap-3 py-0.5">
        <div
          className={cn(
            'flex h-[52px] w-[52px] shrink-0 flex-col items-center justify-center rounded-lg text-white shadow-sm',
            getDocIconColor(ext),
          )}
        >
          <FileText className="h-6 w-6" strokeWidth={1.75} />
          <span className="mt-0.5 max-w-[44px] truncate text-[9px] font-bold tracking-wide">{ext}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium leading-tight" title={fileName}>
            {shortName}
          </p>
          <p className="mt-0.5 text-[12px] opacity-70">
            {[sizeLabel, isSigned ? 'Signed' : null].filter(Boolean).join(' · ') || ext}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          {canPreview && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/[0.06]"
              aria-label="Open preview"
            >
              <ExternalLink className="h-4 w-4 opacity-70" />
            </a>
          )}
          <a
            href={fileUrl}
            download={fileName}
            onClick={(e) => e.stopPropagation()}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/[0.06]"
            aria-label="Download"
          >
            <Download className="h-4 w-4 opacity-70" />
          </a>
        </div>
      </div>
      <MediaUploadOverlay sending={sending} progress={uploadProgress} />
      {caption && <p className="mt-1 whitespace-pre-wrap text-[14.2px] leading-[19px]">{caption}</p>}
      {footerTime && <div className="mt-0.5 flex items-end justify-end">{footerTime}</div>}
    </div>
  );
});
