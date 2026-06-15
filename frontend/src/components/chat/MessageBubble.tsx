'use client';

import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { AlertCircle, Check, CheckCheck, FileText, MapPin, Reply, ScanLine, Stamp } from 'lucide-react';
import { cn, formatMessageTime } from '@/lib/utils';
import { isOwnMessage } from '@/lib/messages';
import { extractUrls } from '@/lib/link-utils';
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
  onLongPress: (message: Message) => void;
  onReply?: () => void;
  onRetry?: () => void;
  onImageClick?: (url: string) => void;
  selectMode?: boolean;
  selected?: boolean;
}

function MessageStatus({ status, isOwn }: { status: string; isOwn?: boolean }) {
  if (status === 'READ') {
    return <CheckCheck className={cn('h-[14px] w-[14px]', isOwn ? 'text-cyan-300' : 'text-[var(--read-tick)]')} />;
  }
  if (status === 'DELIVERED') {
    return (
      <CheckCheck
        className={cn('h-[14px] w-[14px]', isOwn ? 'text-[var(--bubble-out-meta)]' : 'text-[var(--text-secondary)]')}
      />
    );
  }
  return (
    <Check className={cn('h-[14px] w-[14px]', isOwn ? 'text-[var(--bubble-out-meta)]' : 'text-[var(--text-secondary)]')} />
  );
}

export function MessageBubble({
  message,
  contactAvatar,
  contactName,
  showContactAvatar = false,
  onLongPress,
  onReply,
  onRetry,
  onImageClick,
  selectMode = false,
  selected = false,
}: MessageBubbleProps) {
  const { user } = useAuthStore();
  const isOwn = isOwnMessage(message, user?.id);
  const voiceUrl = getVoiceMessageUrl(message);
  const fileUrl = resolveMediaUrl(message.mediaFiles?.[0]?.url);
  const isVoice = message.type === 'VOICE' && !!voiceUrl;
  const isDoc = message.type === 'DOCUMENT' || message.type === 'FILE';
  const isScanned = !!message.metadata?.scanned;
  const isSigned = !!message.metadata?.signed;
  const docImageUrl = fileUrl;
  const docIsImage =
    isDoc &&
    !!docImageUrl &&
    (message.mediaFiles?.[0]?.mimeType?.startsWith('image/') ||
      /\.(jpe?g|png|webp|gif)(\?|$)/i.test(docImageUrl));
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

  const timeRow = (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 pb-0.5 text-[11px] leading-none',
        isOwn ? 'text-[var(--bubble-out-meta)]' : 'text-[var(--bubble-in-meta)]',
      )}
    >
      {message.editedAt && <span>edited</span>}
      <span>{formatMessageTime(message.createdAt)}</span>
      {isOwn && message.sendState !== 'failed' && <MessageStatus status={message.status} isOwn={isOwn} />}
      {isOwn && message.sendState === 'failed' && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onRetry?.(); }} className="text-red-300">
          <AlertCircle className="h-3.5 w-3.5" />
        </button>
      )}
    </span>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('relative mb-[2px] flex items-end gap-1 px-[6px]', isOwn ? 'justify-end' : 'justify-start')}
    >
      {swipeX > 20 && (
        <Reply className="absolute left-2 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--accent)] opacity-70" />
      )}
      {!isOwn && (
        <div className="mb-1 w-7 shrink-0">
          {showContactAvatar ? (
            <Avatar src={contactAvatar} name={contactName} size="sm" className="h-7 w-7 [&_img]:h-7 [&_img]:w-7 [&>div]:h-7 [&>div]:w-7 [&>div]:text-[10px]" />
          ) : null}
        </div>
      )}

      <div
        style={{ transform: `translateX(${swipeX}px)` }}
        onContextMenu={(e) => { e.preventDefault(); onLongPress(message); }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClick={() => selectMode && onLongPress(message)}
        className={cn(
          'relative max-w-[82%] cursor-pointer select-none shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] transition-transform',
          isVoice ? 'rounded-lg px-1.5 py-1' : 'px-2 py-1.5',
          isOwn ? 'wa-bubble-out' : 'wa-bubble-in',
          message.reactions?.length ? 'mb-3' : '',
          selected ? 'ring-2 ring-[var(--accent)]' : '',
          message.sendState === 'failed' ? 'opacity-90' : '',
        )}
      >
        {message.replyTo && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onReply?.(); }}
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
        ) : message.type === 'IMAGE' && message.mediaFiles?.[0] ? (
          <div>
            <button type="button" onClick={() => onImageClick?.(fileUrl)} className="block">
              <img src={fileUrl} alt="Shared" className="max-h-64 rounded-md object-cover" />
            </button>
            {message.content && message.content !== message.mediaFiles[0].fileName && (
              <p className="mt-1 whitespace-pre-wrap text-[14px]">{message.content}</p>
            )}
            <div className="mt-0.5 flex items-end justify-end gap-1">{timeRow}</div>
          </div>
        ) : isDoc && docIsImage ? (
          <div>
            <button
              type="button"
              onClick={() => onImageClick?.(docImageUrl!)}
              className="relative block"
            >
              <img src={docImageUrl} alt="Document" className="max-h-64 rounded-md object-cover" />
              {(isScanned || isSigned) && (
                <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                  {isScanned && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">
                      <ScanLine className="h-3 w-3" />
                      Scanned
                    </span>
                  )}
                  {isSigned && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#1d4ed8]/90 px-2 py-0.5 text-[10px] font-medium text-white">
                      <Stamp className="h-3 w-3" />
                      Signed
                    </span>
                  )}
                </div>
              )}
            </button>
            <p className="mt-1 truncate text-[12px] opacity-80">
              {message.mediaFiles?.[0]?.fileName || message.content || 'Document'}
            </p>
            <div className="mt-0.5 flex items-end justify-end gap-1">{timeRow}</div>
          </div>
        ) : isDoc ? (
          <a
            href={fileUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2"
          >
            <FileText className="h-8 w-8 shrink-0 opacity-80" />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium">{message.mediaFiles?.[0]?.fileName || message.content}</p>
              <p className="flex items-center gap-1 text-[11px] opacity-70">
                Document
                {isSigned && (
                  <>
                    <span>·</span>
                    <Stamp className="h-3 w-3" />
                    Signed
                  </>
                )}
              </p>
            </div>
          </a>
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
            <div className="mt-0.5 flex items-end justify-end gap-1">{timeRow}</div>
          </a>
        ) : (
          <div className="flex flex-wrap items-end gap-x-1.5 gap-y-0.5 text-[14.2px] leading-[19px]">
            <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">
              {message.content?.trim() || '\u00A0'}
            </span>
            {timeRow}
          </div>
        )}

        {urls.map((url) => (
          <LinkPreview key={url} url={url} isOwn={isOwn} />
        ))}

        {message.sendState === 'failed' && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRetry?.(); }}
            className="mt-1 text-[11px] text-red-300 underline"
          >
            Tap to retry
          </button>
        )}

        {message.reactions && message.reactions.length > 0 && (
          <div
            className={cn(
              'absolute -bottom-2 flex items-center gap-0.5 rounded-full bg-[var(--bg-panel)] px-1.5 py-0.5 shadow-sm ring-1 ring-[var(--border-glass)]',
              isOwn ? 'right-2' : 'left-2',
            )}
          >
            {Array.from(new Set(message.reactions.map((r) => r.emoji))).map((emoji) => (
              <span key={emoji} className="text-[13px] leading-none">{emoji}</span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
