'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Search as SearchIcon, Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { MessageActionMenu } from './MessageActionMenu';
import { ForwardMessageSheet } from './ForwardMessageSheet';
import { ChatHeaderMenu } from './ChatHeaderMenu';
import { ContactInfoSheet } from './ContactInfoSheet';
import { GroupInfoSheet } from './GroupInfoSheet';
import { E2eeBanner } from './E2eeBanner';
import { DisappearingMessagesSheet } from './DisappearingMessagesSheet';
import { EditMessageSheet } from './EditMessageSheet';
import { AddToContactSheet } from './AddToContactSheet';
import { MessageInfoSheet } from './MessageInfoSheet';
import { InChatSearch } from './InChatSearch';
import { ImageLightbox } from './ImageLightbox';
import { StarredMessagesSheet } from './StarredMessagesSheet';
import { WallpaperPicker } from './WallpaperPicker';
import { PinnedMessageBar } from './PinnedMessageBar';
import { ScrollToBottomButton } from './ScrollToBottomButton';
import { DateSeparator } from './DateSeparator';
import { ConnectionBanner } from './ConnectionBanner';
import { useChatStore } from '@/store/chat-store';
import { useContactStore } from '@/store/contact-store';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { getPresenceLabel } from '@/lib/presence';
import { getChatDisplayTitle } from '@/lib/phone';
import { isOwnMessage } from '@/lib/messages';
import { wallpaperStyle, isMessageExpired } from '@/lib/chat-preferences';
import { resolveMediaUrl } from '@/lib/media-url';
import { getMessageMediaFile, isImageMedia } from '@/lib/message-media';
import { applySignedStamp, blobToFile } from '@/lib/document-utils';
import { distributeChatKeys, setupChatKeys } from '@/lib/e2ee';
import { ScreenshotAlertBanner } from './ScreenshotAlertBanner';
import { useScreenshotDetector } from '@/lib/use-screenshot-detector';
import type { Message } from '@/types';
import { dayKey, formatDateSeparator } from '@/lib/chat-dates';

interface ChatRoomProps {
  chatId: string;
}

function shouldShowContactAvatar(messages: Message[], index: number, userId?: string): boolean {
  const message = messages[index];
  if (isOwnMessage(message, userId)) return false;
  const next = messages[index + 1];
  if (!next) return true;
  if (isOwnMessage(next, userId)) return true;
  return next.sender?.id !== message.sender?.id;
}

function isGroupedWithPrev(messages: Message[], index: number, userId?: string): boolean {
  if (index === 0) return false;
  const prev = messages[index - 1];
  const curr = messages[index];
  if (dayKey(prev.createdAt) !== dayKey(curr.createdAt)) return false;
  const prevOwn = isOwnMessage(prev, userId);
  const currOwn = isOwnMessage(curr, userId);
  if (prevOwn !== currOwn) return false;
  if (!currOwn && prev.sender?.id !== curr.sender?.id) return false;
  return true;
}

export function ChatRoom({ chatId }: ChatRoomProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [actionMessage, setActionMessage] = useState<Message | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showDisappearing, setShowDisappearing] = useState(false);
  const [editMessage, setEditMessage] = useState<Message | null>(null);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [bulkForwardQueue, setBulkForwardQueue] = useState<string[]>([]);
  const [infoMessageId, setInfoMessageId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showStarred, setShowStarred] = useState(false);
  const [showWallpaper, setShowWallpaper] = useState(false);
  const [wallpaperKey, setWallpaperKey] = useState(0);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [newMessagesMarkerId, setNewMessagesMarkerId] = useState<string | null>(null);
  const prevMessageCountRef = useRef(0);
  const lastMessageIdRef = useRef<string | null>(null);
  const loadingMoreRef = useRef(false);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [chatLoadState, setChatLoadState] = useState<'loading' | 'ready' | 'not-found'>('loading');

  const { user } = useAuthStore();
  const {
    chats,
    messages,
    typingUsers,
    recordingUsers,
    setActiveChat,
    setReplyTo,
    clearChatMessages,
    removeMessage,
    addMessage,
    retryMessage,
    updateChatMeta,
    fetchChats,
    ensureChatInList,
    fetchChat,
    upsertChat,
    removeChatFromList,
    sendMessage,
    screenshotAlerts,
    setScreenshotAlert,
    messageCursors,
    loadingMoreMessages,
    loadMoreMessages,
    isLoadingMessages,
  } = useChatStore();

  const { addContact } = useContactStore();

  const chat = chats.find((c) => c.id === chatId);
  const isGroup = chat?.type === 'GROUP';
  const screenshotAlertsEnabled = user?.settings?.screenshotAlerts !== false;
  const screenshotAlert = screenshotAlerts[chatId] ?? null;
  useScreenshotDetector(chatId, chat?.type === 'PRIVATE' && screenshotAlertsEnabled);
  const chatMessages = (messages[chatId] || []).filter((m) => !isMessageExpired(chatId, m.createdAt));
  const typing = typingUsers[chatId] || [];
  const recording = recordingUsers[chatId] || [];
  const presence = getPresenceLabel(typing, recording, user?.id);

  const pinnedMessage = useMemo(
    () => chatMessages.find((m) => m.id === chat?.pinnedMessageId) || null,
    [chatMessages, chat?.pinnedMessageId],
  );

  const imageUrls = useMemo(
    () =>
      chatMessages
        .filter((m) => {
          const media = getMessageMediaFile(m);
          if (!media) return false;
          return m.type === 'IMAGE' || (m.type === 'DOCUMENT' && isImageMedia(media.mimeType, media.url, media.fileName));
        })
        .map((m) => resolveMediaUrl(getMessageMediaFile(m)!.url)),
    [chatMessages],
  );

  useEffect(() => {
    setActiveChat(chatId);
    void ensureChatInList(chatId);
    return () => setActiveChat(null);
  }, [chatId, setActiveChat, ensureChatInList]);

  useEffect(() => {
    let active = true;
    setChatLoadState('loading');
    void (async () => {
      await ensureChatInList(chatId);
      if (!active) return;
      const found = useChatStore.getState().chats.some((c) => c.id === chatId);
      setChatLoadState(found ? 'ready' : 'not-found');
    })();
    return () => {
      active = false;
    };
  }, [chatId, ensureChatInList]);

  useEffect(() => {
    if (chat) setChatLoadState('ready');
  }, [chat]);

  useEffect(() => {
    if (!chat?.isEncrypted || chat.source === 'SMS' || chat.source === 'TELEGRAM' || !user?.id) return;
    const memberIds = chat.members?.map((m) => m.id) || (chat.participantId ? [user.id, chat.participantId] : [user.id]);
    void setupChatKeys(chatId, memberIds, user.id);
  }, [chatId, chat?.isEncrypted, chat?.source, chat?.members, chat?.participantId, user?.id]);

  useEffect(() => {
    if (!showScrollBtn) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages.length, showScrollBtn]);

  useEffect(() => {
    const last = chatMessages[chatMessages.length - 1];
    const prevCount = prevMessageCountRef.current;
    const grew = chatMessages.length > prevCount;

    if (grew && showScrollBtn && last && !loadingMoreRef.current) {
      const prevLastId = lastMessageIdRef.current;
      if (prevLastId && last.id !== prevLastId) {
        setNewMessagesMarkerId(last.id);
      }
    }

    if (last) lastMessageIdRef.current = last.id;
    prevMessageCountRef.current = chatMessages.length;
  }, [chatMessages, showScrollBtn]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(dist > 120);

    if (el.scrollTop < 80 && messageCursors[chatId] && !loadingMoreMessages[chatId] && !loadingMoreRef.current) {
      loadingMoreRef.current = true;
      const prevHeight = el.scrollHeight;
      void loadMoreMessages(chatId).then(() => {
        requestAnimationFrame(() => {
          const node = scrollRef.current;
          if (node) node.scrollTop = node.scrollHeight - prevHeight;
          loadingMoreRef.current = false;
        });
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBtn(false);
    setNewMessagesMarkerId(null);
  };

  const jumpToMessage = useCallback(
    async (messageId: string) => {
      const scrollTo = () => {
        const el = messageRefs.current[messageId];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightId(messageId);
          setTimeout(() => setHighlightId(null), 1500);
          return true;
        }
        return false;
      };

      if (scrollTo()) return;

      let cursor = useChatStore.getState().messageCursors[chatId];
      let attempts = 0;
      while (!messageRefs.current[messageId] && cursor && attempts < 12) {
        await loadMoreMessages(chatId);
        await new Promise((r) => setTimeout(r, 80));
        cursor = useChatStore.getState().messageCursors[chatId];
        attempts += 1;
      }
      scrollTo();
    },
    [chatId, loadMoreMessages],
  );

  const handleLongPress = useCallback(
    (message: Message) => {
      if (selectMode) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(message.id)) next.delete(message.id);
          else next.add(message.id);
          return next;
        });
        return;
      }
      setActionMessage(message);
      setShowMenu(true);
    },
    [selectMode],
  );

  const handleReply = useCallback(
    (message: Message) => {
      setReplyTo(message);
    },
    [setReplyTo],
  );

  const handleRetry = useCallback(
    (message: Message) => {
      void retryMessage(chatId, message);
    },
    [chatId, retryMessage],
  );

  const handleImageClick = useCallback(
    (url: string) => {
      setLightbox({ images: imageUrls, index: Math.max(0, imageUrls.indexOf(url)) });
    },
    [imageUrls],
  );

  const handleReact = (message: Message, emoji: string) => {
    const userId = user?.id;
    if (!userId) return;
    useChatStore.setState((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).map((m) => {
          if (m.id !== message.id) return m;
          const reactions = [...(m.reactions || [])];
          const idx = reactions.findIndex((r) => r.userId === userId && r.emoji === emoji);
          if (idx >= 0) reactions.splice(idx, 1);
          else reactions.push({ emoji, userId, displayName: user.profile?.displayName });
          return { ...m, reactions };
        }),
      },
    }));
    socketService.reactToMessage(message.id, emoji, chatId);
  };

  const handleForward = async (targetChatId: string) => {
    const ids = bulkForwardQueue.length
      ? bulkForwardQueue
      : forwardMessage
        ? [forwardMessage.id]
        : [];
    if (ids.length === 0) return;

    try {
      for (const messageId of ids) {
        const forwarded = await api.post<Message>(`/messages/${messageId}/forward`, { targetChatId });
        if (targetChatId === chatId) addMessage(forwarded);
      }
    } catch {
      alert('Could not forward message.');
    } finally {
      setForwardMessage(null);
      setBulkForwardQueue([]);
    }
  };

  const handleAction = async (action: string, message: Message) => {
    switch (action) {
      case 'reply':
        setReplyTo(message);
        break;
      case 'forward':
        setForwardMessage(message);
        break;
      case 'copy':
        if (message.content) await navigator.clipboard.writeText(message.content);
        break;
      case 'star':
        await api.post(`/messages/${message.id}/star`);
        break;
      case 'pin':
        await api.post(`/chats/${chatId}/pin-message`, { messageId: message.id });
        updateChatMeta(chatId, { pinnedMessageId: message.id });
        break;
      case 'delete-me':
        socketService.deleteMessage(message.id, chatId, 'ME');
        removeMessage(chatId, message.id);
        break;
      case 'delete-everyone':
        socketService.deleteMessage(message.id, chatId, 'EVERYONE');
        removeMessage(chatId, message.id);
        break;
      case 'edit':
        setEditMessage(message);
        break;
      case 'info':
        setInfoMessageId(message.id);
        break;
      case 'save': {
        const url = message.mediaFiles?.[0]?.url;
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
        break;
      }
      case 'sign-document': {
        const url = message.mediaFiles?.[0]?.url;
        if (!url) break;
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          const stamped = await applySignedStamp(blob, user?.profile?.displayName || 'User');
          const file = blobToFile(stamped, message.mediaFiles?.[0]?.fileName || `signed-${Date.now()}.jpg`);
          const formData = new FormData();
          formData.append('file', file);
          const { mediaFileId, url: newUrl } = await api.upload<{ mediaFileId: string; url: string }>(
            '/media/upload',
            formData,
          );
          await sendMessage(chatId, file.name, {
            type: 'DOCUMENT',
            metadata: {
              mediaFileId,
              url: newUrl,
              signed: true,
              signedAt: new Date().toISOString(),
              signedFromMessageId: message.id,
            },
          });
        } catch {
          alert('Could not sign and send document.');
        }
        break;
      }
      default:
        break;
    }
  };

  const handleHeaderAction = async (action: string) => {
    switch (action) {
      case 'select':
        setSelectMode(true);
        setSelectedIds(new Set());
        break;
      case 'mute':
        if (chat?.isMuted) await api.post(`/chats/${chatId}/unmute`);
        else await api.post(`/chats/${chatId}/mute`);
        updateChatMeta(chatId, { isMuted: !chat?.isMuted });
        break;
      case 'archive':
        await api.post(`/chats/${chatId}/archive`);
        updateChatMeta(chatId, { isArchived: true });
        router.push('/chats');
        break;
      case 'pin-chat':
        if (chat?.isPinned) await api.post(`/chats/${chatId}/unpin`);
        else await api.post(`/chats/${chatId}/pin`);
        updateChatMeta(chatId, { isPinned: !chat?.isPinned });
        void fetchChats();
        break;
      case 'wallpaper':
        setShowWallpaper(true);
        break;
      case 'starred':
        setShowStarred(true);
        break;
      case 'search':
        setShowSearch(true);
        break;
      case 'block': {
        const other = chat?.members?.find((m) => m.id !== user?.id);
        if (other && confirm(`Block ${chat?.title}?`)) {
          await api.post(`/chats/block/${other.id}`);
          router.push('/chats');
        }
        break;
      }
      case 'disappearing':
        setShowDisappearing(true);
        break;
      default:
        break;
    }
  };

  const bulkForward = () => {
    const ids = chatMessages.filter((m) => selectedIds.has(m.id)).map((m) => m.id);
    if (ids.length === 0) return;
    setBulkForwardQueue(ids);
    setForwardMessage(chatMessages.find((m) => m.id === ids[0]) || null);
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const bulkDelete = () => {
    selectedIds.forEach((id) => {
      socketService.deleteMessage(id, chatId, 'ME');
      removeMessage(chatId, id);
    });
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const statusLine =
    presence ||
    (chat?.type === 'GROUP'
      ? `${chat.members?.length || 0} participants`
      : chat?.isOnline
        ? 'online'
        : '');
  const showE2eeBanner =
    chat?.isEncrypted && chat.source !== 'SMS' && chat.source !== 'TELEGRAM' && chatMessages.length < 8;

  if (chatLoadState === 'not-found') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6">
        <p className="text-center text-[var(--text-secondary)]">
          Chat not found or you don&apos;t have access.
        </p>
        <Link href="/chats" className="font-medium text-[var(--accent-dark)]">
          Back to chats
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col wa-chat-bg" key={wallpaperKey}>
      <header className="safe-top wa-header flex items-center gap-1 px-1 py-1.5 shadow-sm">
        {selectMode ? (
          <>
            <button type="button" onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }} className="px-3 text-sm text-white">
              Cancel
            </button>
            <span className="flex-1 text-center text-sm text-white">{selectedIds.size} selected</span>
            <button type="button" onClick={bulkForward} className="px-2 text-sm text-white">Forward</button>
            <button type="button" onClick={bulkDelete} className="px-3 text-sm text-red-300">Delete</button>
          </>
        ) : (
          <>
            <Link href="/chats" className="rounded-full p-2 hover:bg-white/10 md:hidden" aria-label="Back">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <button
              type="button"
              onClick={() => (chat?.type === 'GROUP' ? setShowGroupInfo(true) : setShowContactInfo(true))}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1 text-left hover:bg-white/10"
            >
              <Avatar src={chat?.avatarUrl} name={chat?.title} size="md" online={chat?.isOnline} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h2 className="truncate text-[16px] font-normal">{getChatDisplayTitle(chat) || 'Chat'}</h2>
                  {chat?.isEncrypted && chat.source !== 'SMS' && chat.source !== 'TELEGRAM' && (
                    <Lock className="h-3.5 w-3.5 shrink-0 opacity-80" />
                  )}
                </div>
                {statusLine && <p className="truncate text-[13px] opacity-80">{statusLine}</p>}
              </div>
            </button>
            <button type="button" onClick={() => setShowSearch(true)} className="rounded-full p-2 hover:bg-white/10" aria-label="Search">
              <SearchIcon className="h-5 w-5" />
            </button>
            <ChatHeaderMenu
              chat={chat}
              onContactInfo={() => setShowContactInfo(true)}
              onGroupInfo={() => setShowGroupInfo(true)}
              onAddToContact={() => setShowAddContact(true)}
              onAddMembers={() => setShowGroupInfo(true)}
              onLeaveGroup={async () => {
                await api.post(`/chats/${chatId}/leave`);
                removeChatFromList(chatId);
                router.push('/chats');
              }}
              onClearChat={() => clearChatMessages(chatId)}
              onAction={handleHeaderAction}
            />
          </>
        )}
      </header>

      <ConnectionBanner />
      <PinnedMessageBar
        message={pinnedMessage}
        onUnpin={async () => {
          await api.post(`/chats/${chatId}/unpin-message`);
          updateChatMeta(chatId, { pinnedMessageId: null });
        }}
        onJump={() => pinnedMessage && jumpToMessage(pinnedMessage.id)}
      />

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="relative flex-1 overflow-y-auto scrollbar-hide py-2"
        style={{ ...wallpaperStyle(chatId), backgroundColor: 'var(--bg-primary)' }}
      >
        <ScreenshotAlertBanner
          alert={screenshotAlert}
          onDismiss={() => setScreenshotAlert(chatId, null)}
        />
        {showE2eeBanner && <E2eeBanner />}
        {isLoadingMessages && chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-dark)] border-t-transparent" />
            <p className="text-sm text-[var(--text-secondary)]">Loading messages…</p>
          </div>
        )}
        {loadingMoreMessages[chatId] && (
          <div className="flex justify-center py-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent-dark)] border-t-transparent" />
          </div>
        )}
        {chatMessages.map((message, index) => {
          const prev = chatMessages[index - 1];
          const showDate = !prev || dayKey(prev.createdAt) !== dayKey(message.createdAt);
          return (
          <div key={message.id}>
            {showDate && <DateSeparator label={formatDateSeparator(message.createdAt)} />}
            {message.id === newMessagesMarkerId && (
              <div className="my-2 flex justify-center">
                <span className="rounded-full bg-[var(--accent)]/15 px-3 py-1 text-xs font-medium text-[var(--accent-dark)]">
                  New messages
                </span>
              </div>
            )}
          <div
            ref={(el) => { messageRefs.current[message.id] = el; }}
            className={highlightId === message.id ? 'animate-pulse rounded-lg ring-2 ring-[var(--accent)]' : undefined}
          >
            <MessageBubble
              message={message}
              contactAvatar={isGroup ? message.sender?.avatarUrl : chat?.avatarUrl}
              contactName={isGroup ? message.sender?.displayName : chat?.title}
              isGroup={isGroup}
              showContactAvatar={shouldShowContactAvatar(chatMessages, index, user?.id)}
              groupedWithPrev={isGroupedWithPrev(chatMessages, index, user?.id)}
              onLongPress={handleLongPress}
              onReply={() => handleReply(message)}
              onReplyJump={(id) => void jumpToMessage(id)}
              onRetry={() => handleRetry(message)}
              onImageClick={handleImageClick}
              selectMode={selectMode}
              selected={selectedIds.has(message.id)}
            />
          </div>
          </div>
          );
        })}
        {presence && <p className="px-12 py-1 text-xs italic text-[var(--accent-dark)]">{presence}</p>}
        <div ref={messagesEndRef} />
      </div>

      <ScrollToBottomButton
        visible={showScrollBtn}
        onClick={scrollToBottom}
        className="absolute bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-[4.75rem] z-20"
      />

      {!selectMode && (
        <ChatInput
          chatId={chatId}
          isSmsChat={chat?.source === 'SMS'}
          smsPeerPhone={chat?.participantPhone}
        />
      )}

      <MessageActionMenu message={actionMessage} open={showMenu} onClose={() => setShowMenu(false)} onAction={handleAction} onReact={handleReact} contactName={chat?.title} />
      <ForwardMessageSheet open={!!forwardMessage || bulkForwardQueue.length > 0} currentChatId={chatId} onClose={() => { setForwardMessage(null); setBulkForwardQueue([]); }} onSelect={handleForward} />
      <ContactInfoSheet
        chat={chat}
        chatId={chatId}
        open={showContactInfo && chat?.type !== 'GROUP'}
        onClose={() => setShowContactInfo(false)}
        onContactRemoved={async () => {
          await fetchChats();
          const stillVisible = useChatStore.getState().chats.some((c) => c.id === chatId);
          if (!stillVisible) router.push('/chats');
        }}
        onContactUpdated={async () => {
          await fetchChats();
          const updated = await fetchChat(chatId);
          if (updated) upsertChat(updated);
        }}
      />
      <GroupInfoSheet
        chat={chat}
        chatId={chatId}
        open={showGroupInfo && chat?.type === 'GROUP'}
        onClose={() => setShowGroupInfo(false)}
        onUpdated={async (updated) => {
          upsertChat(updated);
          if (user?.id && updated.members?.length) {
            const memberIds = updated.members.map((m) => m.id);
            await distributeChatKeys(
              chatId,
              memberIds.filter((id) => id !== user.id),
              user.id,
            );
          }
        }}
        onLeft={() => {
          removeChatFromList(chatId);
          router.push('/chats');
        }}
      />
      <AddToContactSheet
        open={showAddContact}
        phone={chat?.participantPhone || chat?.title}
        onClose={() => setShowAddContact(false)}
        onSave={async ({ savedName, notes }) => {
          if (!chat?.participantId) return;
          await addContact(chat.participantId, savedName, notes || undefined);
          await fetchChats();
          const updated = await fetchChat(chatId);
          if (updated) upsertChat(updated);
        }}
      />
      <DisappearingMessagesSheet chatId={chatId} open={showDisappearing} onClose={() => setShowDisappearing(false)} />
      <EditMessageSheet
        open={!!editMessage}
        initialContent={editMessage?.content || ''}
        onClose={() => setEditMessage(null)}
        onSave={(content) => {
          if (editMessage) socketService.editMessage(editMessage.id, content, chatId);
        }}
      />
      <MessageInfoSheet messageId={infoMessageId} open={!!infoMessageId} onClose={() => setInfoMessageId(null)} />
      <InChatSearch chatId={chatId} open={showSearch} onClose={() => setShowSearch(false)} onJumpTo={jumpToMessage} />
      <StarredMessagesSheet open={showStarred} onClose={() => setShowStarred(false)} onOpenChat={(cid, mid) => { router.push(`/chats/${cid}`); setTimeout(() => jumpToMessage(mid), 500); }} />
      <WallpaperPicker chatId={chatId} open={showWallpaper} onClose={() => setShowWallpaper(false)} onChange={() => setWallpaperKey((k) => k + 1)} />
      <ImageLightbox
        images={lightbox?.images || []}
        index={lightbox?.index || 0}
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        onChangeIndex={(index) => setLightbox((lb) => (lb ? { ...lb, index } : null))}
      />
    </div>
  );
}
