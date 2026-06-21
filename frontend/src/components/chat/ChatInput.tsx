'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Paperclip, Camera, Send, Mic, X, Smile } from 'lucide-react';
import { AttachmentSheet } from './AttachmentSheet';
import { VoiceRecorder } from './VoiceRecorder';
import { EmojiPicker } from './EmojiPicker';
import { DocumentScanner } from './DocumentScanner';
import { DocumentSignSheet } from './DocumentSignSheet';
import { ImageComposer } from './ImageComposer';
import { useChatStore } from '@/store/chat-store';
import { socketService } from '@/lib/socket';
import { api } from '@/lib/api';
import { compressImage } from '@/lib/utils';
import { extensionForMime, getSupportedRecordingMime } from '@/lib/audio';
import { isVideoMedia } from '@/lib/message-media';
import { getDraft, setDraft } from '@/lib/chat-preferences';
import { cameraErrorMessage, getRecommendedSecureUrl, isSecureBrowserContext, requestCurrentPosition } from '@/lib/permissions';
import type { Message } from '@/types';

interface ChatInputProps {
  chatId: string;
  isSmsChat?: boolean;
  smsPeerPhone?: string;
}

export function ChatInput({ chatId, isSmsChat = false, smsPeerPhone }: ChatInputProps) {
  const [text, setText] = useState('');
  const [showAttachments, setShowAttachments] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [pendingSignFile, setPendingSignFile] = useState<File | null>(null);
  const [pendingImages, setPendingImages] = useState<File[] | null>(null);
  const typingTimeout = useRef<NodeJS.Timeout>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, replyTo, setReplyTo, addMessage } = useChatStore();

  useEffect(() => {
    setText(getDraft(chatId));
    return () => {
      socketService.setTyping(chatId, false);
      socketService.setRecording(chatId, false);
    };
  }, [chatId]);

  const draftTimer = useRef<NodeJS.Timeout>();
  useEffect(() => {
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => setDraft(chatId, text), 400);
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [chatId, text]);

  const activeReply = replyTo?.chatId === chatId ? replyTo : null;

  const handleTyping = useCallback(() => {
    if (!socketService.isConnected()) return;
    socketService.setTyping(chatId, true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socketService.setTyping(chatId, false), 2000);
  }, [chatId]);

  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending) return;

    setSending(true);
    setError('');
    try {
      if (isSmsChat && smsPeerPhone) {
        const result = await api.post<{ message: Message; chatId: string }>('/sim/send', {
          to: smsPeerPhone.replace(/\D/g, ''),
          body: content,
        });
        await addMessage(result.message);
      } else {
        await sendMessage(chatId, content);
      }
      setText('');
      setDraft(chatId, '');
      setShowEmoji(false);
      socketService.setTyping(chatId, false);
    } catch {
      setError(isSmsChat ? 'Could not send SMS. Check SIM activation.' : 'Could not send message. Check that the backend is running.');
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const insertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  const uploadFile = async (
    file: File,
    type: string,
    caption?: string,
    extraMeta?: Record<string, unknown>,
    skipCompress = false,
  ) => {
    setUploadProgress(0);
    setError('');
    try {
      const shouldCompress =
        !skipCompress &&
        (type === 'gallery' || (type === 'document' && file.type.startsWith('image/')));
      const compressed = shouldCompress ? await compressImage(file) : file;
      const formData = new FormData();
      formData.append('file', compressed);

      setUploadProgress(30);
      const { mediaFileId, url } = await api.upload<{
        mediaFileId: string;
        url: string;
      }>('/media/upload', formData);

      setUploadProgress(100);

      const messageType =
        type === 'gallery'
          ? 'IMAGE'
          : type === 'scanner'
            ? 'DOCUMENT'
            : type === 'video'
              ? 'VIDEO'
              : type === 'audio'
                ? 'VOICE'
                : isVideoMedia(compressed.type, undefined, file.name)
                  ? 'VIDEO'
                  : type === 'document'
                    ? 'DOCUMENT'
                    : 'FILE';

      const content =
        caption?.trim() ||
        (messageType === 'IMAGE' || messageType === 'VIDEO' ? '' : file.name);

      await sendMessage(chatId, content, {
        type: messageType as Message['type'],
        metadata: {
          mediaFileId,
          url,
          fileName: file.name,
          mimeType: compressed.type || file.type,
          fileSize: compressed.size,
          ...extraMeta,
        },
      });
      if (caption) setText('');
    } catch {
      setError('Upload failed. Try again.');
    } finally {
      setUploadProgress(null);
    }
  };

  const openImageComposer = (imageFiles: File[]) => {
    if (!imageFiles.length) return;
    setError('');
    setShowEmoji(false);
    setPendingImages(imageFiles);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) openImageComposer([file]);
        return;
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.type.startsWith('image/')) {
      openImageComposer([file]);
      return;
    }
    const type = file.type.startsWith('video/') ? 'video' : 'document';
    void uploadFile(file, type, text.trim() || undefined);
  };

  const handleAttachment = (type: string) => {
    if (type === 'scanner') {
      setShowScanner(true);
    } else if (type === 'gallery' || type === 'video' || type === 'document' || type === 'files') {
      const input = fileInputRef.current;
      if (input) {
        if (type === 'video') input.accept = 'video/*';
        else if (type === 'gallery') input.accept = 'image/*,video/*';
        else if (type === 'document') input.accept = 'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx';
        else input.accept = '*/*';
        input.click();
        input.dataset.attachmentType = type;
      }
    } else if (type === 'camera') {
      if (!isSecureBrowserContext()) {
        setError(cameraErrorMessage());
        return;
      }
      cameraInputRef.current?.click();
    } else if (type === 'location') {
      void requestCurrentPosition()
        .then(async (pos) => {
          await sendMessage(chatId, 'Shared location', {
            type: 'LOCATION',
            metadata: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          });
        })
        .catch((err: Error) => {
          setError(err.message || 'Could not send location.');
        });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    const type = e.target.dataset.attachmentType || 'files';
    e.target.value = '';

    if (!selected.length) return;

    const videos = selected.filter((f) => f.type.startsWith('video/') || isVideoMedia(f.type, undefined, f.name));
    const images = selected.filter((f) => f.type.startsWith('image/') && !isVideoMedia(f.type, undefined, f.name));

    if (type === 'gallery') {
      if (images.length) openImageComposer(images);
      for (const v of videos) void uploadFile(v, 'video', text.trim() || undefined);
      return;
    }

    const file = selected[0];
    if (file.type.startsWith('video/') || isVideoMedia(file.type, undefined, file.name)) {
      void uploadFile(file, 'video', text.trim() || undefined);
      return;
    }

    if ((type === 'document' || type === 'files') && file.type.startsWith('image/')) {
      setPendingSignFile(file);
    } else {
      void uploadFile(file, type, text.trim() || undefined);
    }
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) openImageComposer([file]);
  };

  const handleComposerSend = async (files: File[], caption: string) => {
    for (const file of files) {
      await uploadFile(file, 'gallery', caption || undefined, undefined, true);
    }
    setText('');
    setDraft(chatId, '');
    setPendingImages(null);
  };

  const handleVoiceSend = async (blob: Blob) => {
    setIsRecording(false);
    const mime = blob.type || getSupportedRecordingMime();
    const ext = extensionForMime(mime);
    const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mime });
    await uploadFile(file, 'audio');
  };

  const handleVoiceCancel = () => {
    socketService.setRecording(chatId, false);
    setIsRecording(false);
  };

  if (isRecording) {
    return (
      <VoiceRecorder chatId={chatId} onSend={handleVoiceSend} onCancel={handleVoiceCancel} />
    );
  }

  return (
    <>
      <div
        className={`safe-bottom relative z-30 wa-input-bar px-2 py-2 ${dragOver ? 'ring-2 ring-[var(--accent)] ring-inset' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {activeReply && (
          <div className="mb-2 flex items-center justify-between rounded-lg border-l-4 border-[var(--accent)] bg-[var(--input-bg)] px-3 py-2">
            <div className="min-w-0 text-sm">
              <span className="font-medium text-[var(--accent-light)]">Replying to </span>
              <span className="text-[var(--text-secondary)]">{activeReply.content?.slice(0, 50)}</span>
            </div>
            <button type="button" onClick={() => setReplyTo(null)} className="shrink-0 p-1">
              <X className="h-4 w-4 text-[var(--text-secondary)]" />
            </button>
          </div>
        )}

        {error && (
          <div className="mb-2 rounded-lg bg-[var(--danger)]/15 px-3 py-2 text-sm text-[var(--danger)]">
            <p>{error}</p>
            {error.includes('HTTPS') && (
              <a
                href={getRecommendedSecureUrl()}
                className="mt-1 inline-block font-medium underline"
              >
                Open secure LinkChat
              </a>
            )}
          </div>
        )}

        <EmojiPicker open={showEmoji} onSelect={insertEmoji} />

        {uploadProgress !== null && (
          <div className="mb-2 h-1 overflow-hidden rounded-full bg-black/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${uploadProgress}%` }}
              className="h-full bg-[var(--accent)]"
            />
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex min-h-[48px] flex-1 items-end rounded-[24px] bg-[var(--input-bg)] px-1 shadow-sm ring-1 ring-[var(--border-glass)]">
            {!isSmsChat && (
              <button
                type="button"
                onClick={() => setShowEmoji((v) => !v)}
                className={`flex h-11 w-10 shrink-0 items-center justify-center ${
                  showEmoji ? 'text-[var(--accent-light)]' : 'text-[var(--text-secondary)]'
                }`}
                aria-label="Emoji"
              >
                <Smile className="h-[26px] w-[26px]" />
              </button>
            )}

            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (!isSmsChat) handleTyping();
              }}
              onKeyDown={handleKeyDown}
              onPaste={isSmsChat ? undefined : handlePaste}
              placeholder={isSmsChat ? 'SMS message' : 'Message'}
              rows={1}
              disabled={sending}
              className="max-h-28 min-h-[48px] flex-1 resize-none bg-transparent px-1 py-3 text-[16px] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none disabled:opacity-60"
            />

            {!isSmsChat && (
              <>
            <button
              type="button"
              onClick={() => {
                setShowEmoji(false);
                setShowAttachments(true);
              }}
              className="flex h-11 w-10 shrink-0 items-center justify-center text-[var(--text-secondary)]"
              aria-label="Attach"
            >
              <Paperclip className="h-[22px] w-[22px] -rotate-45" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (!isSecureBrowserContext()) {
                  setError(cameraErrorMessage());
                  return;
                }
                cameraInputRef.current?.click();
              }}
              className="flex h-11 w-10 shrink-0 items-center justify-center text-[var(--text-secondary)]"
              aria-label="Camera"
            >
              <Camera className="h-[22px] w-[22px]" />
            </button>
              </>
            )}
          </div>

          {text.trim() ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => void handleSend()}
              disabled={sending}
              className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-sm disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="h-5 w-5" />
            </motion.button>
          ) : !isSmsChat ? (
            <button
              type="button"
              onClick={() => {
                setShowEmoji(false);
                setIsRecording(true);
              }}
              className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-sm"
              aria-label="Record voice message"
            >
              <Mic className="h-6 w-6" />
            </button>
          ) : null}
        </div>
      </div>

      <AttachmentSheet
        open={showAttachments}
        onClose={() => setShowAttachments(false)}
        onSelect={handleAttachment}
      />

      <DocumentScanner
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onSend={async (file, meta) => {
          await uploadFile(file, 'scanner', undefined, {
            scanned: meta.scanned,
            signed: meta.signed,
            pageCount: meta.pageCount,
            signedAt: meta.signed ? new Date().toISOString() : undefined,
          });
        }}
      />

      <ImageComposer
        open={!!pendingImages?.length}
        files={pendingImages || []}
        initialCaption={text.trim()}
        onClose={() => setPendingImages(null)}
        onSend={handleComposerSend}
      />

      <DocumentSignSheet
        open={!!pendingSignFile}
        file={pendingSignFile}
        onClose={() => setPendingSignFile(null)}
        onSend={async (file, meta) => {
          const type = pendingSignFile?.type.startsWith('image/') ? 'document' : 'files';
          await uploadFile(file, type, undefined, {
            signed: meta.signed,
            signedAt: meta.signed ? new Date().toISOString() : undefined,
          });
          setPendingSignFile(null);
        }}
      />

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraChange}
      />
    </>
  );
}
