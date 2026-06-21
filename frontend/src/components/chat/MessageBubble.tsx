'use client';

import { motion } from 'framer-motion';
import { memo, useRef, useState } from 'react';
import { AlertCircle, Check, CheckCheck, Clock, MapPin, Reply } from 'lucide-react';
import { cn, formatMessageTime } from '@/lib/utils';
import { isOwnMessage } from '@/lib/messages';
import { extractUrls } from '@/lib/link-utils';
import {
  getMessageMediaFile,
  isImageMedia,
  isVideoMedia,
} from '@/lib/message-media';
import { truncateFileName } from '@/lib/media-ui';
import { MediaImageCard } from './media/MediaImageCard';
import { MediaVideoCard } from './media/MediaVideoCard';
import { MediaDocumentCard } from './media/MediaDocumentCard';
import { useAuthStore } from '@/store/auth-store';
import { Avatar } from '@/components/ui/Avatar';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { LinkPreview } from './LinkPreview';
import { getVoiceMessageUrl } from '@/lib/audio';
import { resolveMediaUrl } from '@/lib/media-url';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  contactAvatar?: string;
  contactName?: string;
  showContactAvatar?: boolean;
  groupedWithPrev?: boolean;
  isGroup?: boolean;
  onLongPress: (message: Message) => void;
  onReply?: () => void;
  onReplyJump?: (messageId: string) => void;
  onRetry?: () => void;
  onImageClick?: (url: string) => void;
  selectMode?: boolean;
  selected?: boolean;
}

function MessageStatus({
  status,
  isOwn,
  onDark,
  sending,
}: {
  status: string;
  isOwn?: boolean;
  onDark?: boolean;
  sending?: boolean;
}) {
  if (sending) {
    return (
      <Clock
        className={cn(
          'h-[14px] w-[14px]',
          onDark ? 'text-white/70' : isOwn ? 'text-[var(--bubble-out-meta)]' : 'text-[var(--text-secondary)]',
        )}
      />
    );
  }
  if (status === 'READ') {
    return (
      <CheckCheck
        className={cn('h-[14px] w-[14px]', onDark ? 'text-cyan-300' : isOwn ? 'text-cyan-300' : 'text-[var(--read-tick)]')}
      />
    );
  }
  if (status === 'DELIVERED') {
    return (
      <CheckCheck
        className={cn(
          'h-[14px] w-[14px]',
          onDark ? 'text-white/80' : isOwn ? 'text-[var(--bubble-out-meta)]' : 'text-[var(--text-secondary)]',
        )}
      />
    );
  }
  return (
    <Check
      className={cn(
        'h-[14px] w-[14px]',
        onDark ? 'text-white/80' : isOwn ? 'text-[var(--bubble-out-meta)]' : 'text-[var(--text-secondary)]',
      )}
    />
  );
}

export const MessageBubble = memo(function MessageBubble({
  message,
  contactAvatar,
  contactName,
  showContactAvatar = false,
  groupedWithPrev = false,
  isGroup = false,
  onLongPress,
  onReply,
  onReplyJump,
  onRetry,
  onImageClick,
  selectMode = false,
  selected = false,
}: MessageBubbleProps) {
  const { user } = useAuthStore();
  const isOwn = isOwnMessage(message, user?.id);
  const voiceUrl = getVoiceMessageUrl(message);
  const mediaFile = getMessageMediaFile(message);
  const fileUrl = mediaFile ? resolveMediaUrl(mediaFile.url) : '';
  const fileName = mediaFile?.fileName || 'Document';

  const isVoice = message.type === 'VOICE' && !!voiceUrl;
  const isVideoFile = !!mediaFile && isVideoMedia(mediaFile.mimeType, fileUrl, fileName);
  const isVideo = (message.type === 'VIDEO' || isVideoFile) && !!mediaFile;
  const isDoc = message.type === 'DOCUMENT' || message.type === 'FILE';
  const isImage = message.type === 'IMAGE' && !!mediaFile && !isVideoFile;
  const isSending = message.sendState === 'sending';
  const uploadProgress =
    typeof message.metadata?.uploadProgress === 'number'
      ? message.metadata.uploadProgress
      : undefined;
  const isScanned = !!message.metadata?.scanned;
  const isSigned = !!message.metadata?.signed;
  const docIsImage = isDoc && !!mediaFile && isImageMedia(mediaFile.mimeType, fileUrl, fileName) && !isVideoFile;
  const isMediaVisual = isImage || isVideo || docIsImage;
  const isGenericFile =
    !!mediaFile && !!fileUrl && !isVoice && !isImage && !isVideo && !docIsImage;

  const senderAvatar = message.sender?.avatarUrl || contactAvatar;
  const senderName = message.sender?.displayName || contactName;

  const imageCaption =
    isImage && message.content?.trim() && message.content.trim() !== fileName
      ? message.content.trim()
      : '';
  const videoCaption =
    isVideo && message.content?.trim() && message.content.trim() !== fileName
      ? message.content.trim()
      : '';
  const docCaption =
    (isDoc || isGenericFile) &&
    !docIsImage &&
    message.content?.trim() &&
    message.content.trim() !== fileName
      ? message.content.trim()
      : '';

  const locationMeta = message.metadata as { lat?: number; lng?: number } | undefined;
  const hasLocation = message.type === 'LOCATION' && locationMeta?.lat != null && locationMeta?.lng != null;
  const urls = extractUrls(message.content);
  const [swipeX, setSwipeX] = useState(0);

  const longPressTimer = useRef<NodeJS.Timeout>();
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    longPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(10);
      onLongPress(message);
    }, 450);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    if (longPressTimer.current && (Math.abs(dx) > 10 || dy > 10)) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = undefined;
    }
    if (!selectMode && dx > 0 && dy < 30) setSwipeX(Math.min(dx, 72));
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (swipeX > 48 && onReply) onReply();
    setSwipeX(0);
    touchStartPos.current = null;
  };

  const renderTimeRow = (onDark = false) => (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 text-[11px] leading-none',
        onDark
          ? 'text-white/90'
          : isOwn
            ? 'text-[var(--bubble-out-meta)]'
            : 'text-[var(--bubble-in-meta)]',
      )}
    >
      {message.editedAt && <span>edited</span>}
      <span>{formatMessageTime(message.createdAt)}</span>
      {isOwn && message.sendState !== 'failed' && (
        <MessageStatus status={message.status} isOwn={isOwn} onDark={onDark} sending={isSending} />
      )}
      {isOwn && message.sendState === 'failed' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRetry?.();
          }}
          className={onDark ? 'text-red-200' : 'text-red-300'}
        >
          <AlertCircle className="h-3.5 w-3.5" />
        </button>
      )}
    </span>
  );

  const isPlainText =
    !isVoice &&
    !isImage &&
    !isVideo &&
    !docIsImage &&
    !isDoc &&
    !isGenericFile &&
    !hasLocation;

  const textContent = (() => {
    const raw = message.content?.trim();
    if (!raw) return '';
    if (mediaFile && raw === fileName) return '';
    if (mediaFile && raw === mediaFile.fileName) return '';
    return raw;
  })();

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative flex items-end gap-1 px-[6px]',
        groupedWithPrev ? 'mb-0' : 'mb-[2px]',
        isOwn ? 'justify-end' : 'justify-start',
      )}
    >
      {swipeX > 20 && (
        <Reply className="absolute left-2 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--accent)] opacity-70" />
      )}
      {!isOwn && (
        <div className="mb-1 w-7 shrink-0">
          {showContactAvatar ? (
            <Avatar
              src={senderAvatar}
              name={senderName}
              size="sm"
              className="h-7 w-7 [&_img]:h-7 [&_img]:w-7 [&>div]:h-7 [&>div]:w-7 [&>div]:text-[10px]"
            />
          ) : null}
        </div>
      )}

      <div className="min-w-0 max-w-[82%]">
        {isGroup && !isOwn && showContactAvatar && senderName && (
          <p className="mb-0.5 px-1 text-[12px] font-medium text-[var(--accent-dark)]">{senderName}</p>
        )}
      <div
        style={{ transform: `translateX(${swipeX}px)` }}
        onContextMenu={(e) => {
          e.preventDefault();
          onLongPress(message);
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClick={() => selectMode && onLongPress(message)}
        className={cn(
          'relative w-fit max-w-full cursor-pointer select-none shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] transition-transform',
          isVoice
            ? 'rounded-lg px-1.5 py-1'
            : isMediaVisual
              ? 'overflow-hidden p-1'
              : isDoc || isGenericFile
                ? 'min-w-[240px] px-2 py-1.5'
                : 'px-2 py-1.5',
          isOwn ? 'wa-bubble-out' : 'wa-bubble-in',
          message.reactions?.length ? 'mb-3' : '',
          selected ? 'ring-2 ring-[var(--accent)]' : '',
          message.sendState === 'failed' ? 'opacity-90' : '',
        )}
      >
        {message.replyTo && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (message.replyTo?.id && onReplyJump) onReplyJump(message.replyTo.id);
              else onReply?.();
            }}
            className={cn(
              'mb-1 w-full rounded border-l-4 px-2 py-1 text-left text-xs',
              isOwn
                ? 'border-white/60 bg-black/10 text-[var(--bubble-out-text)]'
                : 'border-[var(--accent)] bg-black/[0.04] text-[var(--bubble-in-text)]',
            )}
          >
            <p className="font-medium opacity-90">{message.replyTo.sender?.displayName}</p>
            <p className="truncate opacity-80">{message.replyTo.content}</p>
          </button>
        )}

        {isVoice ? (
          <VoiceMessagePlayer
            src={voiceUrl!}
            isOwn={isOwn}
            avatarUrl={isOwn ? user?.profile?.avatarUrl : contactAvatar}
            avatarName={isOwn ? user?.profile?.displayName : contactName}
            createdAt={message.createdAt}
            status={<MessageStatus status={message.status} isOwn={isOwn} />}
          />
        ) : isImage ? (
          <MediaImageCard
            src={fileUrl}
            alt={truncateFileName(fileName, 20)}
            caption={imageCaption}
            sending={isSending}
            uploadProgress={uploadProgress}
            isScanned={isScanned}
            isSigned={isSigned}
            onClick={() => onImageClick?.(fileUrl)}
            timeOverlay={!imageCaption ? renderTimeRow(true) : undefined}
            footerTime={imageCaption ? renderTimeRow() : undefined}
          />
        ) : isVideo ? (
          <MediaVideoCard
            src={fileUrl}
            fileName={fileName}
            caption={videoCaption}
            sending={isSending}
            uploadProgress={uploadProgress}
            timeOverlay={!videoCaption ? renderTimeRow(true) : undefined}
            footerTime={videoCaption ? renderTimeRow() : undefined}
          />
        ) : docIsImage ? (
          <MediaImageCard
            src={fileUrl}
            alt={truncateFileName(fileName, 20)}
            caption={docCaption}
            sending={isSending}
            uploadProgress={uploadProgress}
            isScanned={isScanned}
            isSigned={isSigned}
            onClick={() => onImageClick?.(fileUrl)}
            showTruncatedName={!docCaption}
            truncatedName={truncateFileName(fileName, 28)}
            footerTime={renderTimeRow()}
          />
        ) : isDoc || isGenericFile ? (
          <MediaDocumentCard
            fileUrl={fileUrl}
            fileName={fileName}
            fileSize={mediaFile?.fileSize}
            caption={docCaption}
            sending={isSending}
            uploadProgress={uploadProgress}
            isSigned={isSigned}
            footerTime={renderTimeRow()}
          />
        ) : hasLocation ? (
          <a
            href={`https://www.google.com/maps?q=${locationMeta!.lat},${locationMeta!.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="block min-w-[200px]"
          >
            <div className="flex items-center gap-3 rounded-md bg-black/[0.06] px-3 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15">
                <MapPin className="h-5 w-5 text-[var(--accent-dark)]" />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-medium">{message.content || 'Shared location'}</p>
                <p className="text-[11px] opacity-70">Tap to open in Maps</p>
              </div>
            </div>
            <div className="mt-0.5 flex items-end justify-end">{renderTimeRow()}</div>
          </a>
        ) : isPlainText ? (
          <div className="text-[14.2px] leading-[19px]">
            <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {textContent || '\u00A0'}
              {/* Reserve space so the timestamp sits on the last line like WhatsApp */}
              <span className="inline-block w-[52px]" aria-hidden="true" />
            </span>
            <span className="float-right -mt-[18px] ml-1.5 flex shrink-0 items-center">
              {renderTimeRow()}
            </span>
          </div>
        ) : null}

        {isPlainText && urls.map((url) => (
          <LinkPreview key={url} url={url} isOwn={isOwn} />
        ))}

        {message.reactions && message.reactions.length > 0 && (
          <div
            className={cn(
              'absolute -bottom-2 flex items-center gap-0.5 rounded-full bg-[var(--bg-panel)] px-1.5 py-0.5 shadow-sm ring-1 ring-[var(--border-glass)]',
              isOwn ? 'right-2' : 'left-2',
            )}
          >
            {Array.from(new Set(message.reactions.map((r) => r.emoji))).map((emoji) => (
              <span key={emoji} className="text-[13px] leading-none">
                {emoji}
              </span>
            ))}
          </div>
        )}
      </div>
      </div>
    </motion.div>
  );
});
