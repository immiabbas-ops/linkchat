'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Search as SearchIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { MessageActionMenu } from './MessageActionMenu';
import { ForwardMessageSheet } from './ForwardMessageSheet';
import { ChatHeaderMenu } from './ChatHeaderMenu';
import { ContactInfoSheet } from './ContactInfoSheet';
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
import { useChatStore } from '@/store/chat-store';
import { useContactStore } from '@/store/contact-store';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { getPresenceLabel } from '@/lib/presence';
import { isOwnMessage } from '@/lib/messages';
import { wallpaperStyle, isMessageExpired } from '@/lib/chat-preferences';
import { resolveMediaUrl } from '@/lib/media-url';
import { applySignedStamp, blobToFile } from '@/lib/document-utils';
import type { Message } from '@/types';

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

export function ChatRoom({ chatId }: ChatRoomProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [actionMessage, setActionMessage] = useState<Message | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
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
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

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
    sendMessage,
  } = useChatStore();

  const { addContact } = useContactStore();

  const chat = chats.find((c) => c.id === chatId);
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
        .filter((m) => m.type === 'IMAGE' && m.mediaFiles?.[0]?.url)
        .map((m) => resolveMediaUrl(m.mediaFiles![0].url)),
    [chatMessages],
  );

  useEffect(() => {
    setActiveChat(chatId);
    void ensureChatInList(chatId);
    return () => setActiveChat(null);
  }, [chatId, setActiveChat, ensureChatInList]);

  useEffect(() => {
    if (!showScrollBtn) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages.length, presence, showScrollBtn]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(dist > 120);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBtn(false);
  };

  const jumpToMessage = (messageId: string) => {
    const el = messageRefs.current[messageId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightId(messageId);
      setTimeout(() => setHighlightId(null), 1500);
    }
  };

  const handleLongPress = (message: Message) => {
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
  };

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

  const statusLine = presence || (chat?.isOnline ? 'online' : '');

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
            <button type="button" onClick={() => setShowContactInfo(true)} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1 text-left hover:bg-white/10">
              <Avatar src={chat?.avatarUrl} name={chat?.title} size="md" online={chat?.isOnline} />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[16px] font-normal">{chat?.title || 'Chat'}</h2>
                {statusLine && <p className="truncate text-[13px] opacity-80">{statusLine}</p>}
              </div>
            </button>
            <button type="button" onClick={() => setShowSearch(true)} className="rounded-full p-2 hover:bg-white/10" aria-label="Search">
              <SearchIcon className="h-5 w-5" />
            </button>
            <ChatHeaderMenu
              chat={chat}
              onContactInfo={() => setShowContactInfo(true)}
              onAddToContact={() => setShowAddContact(true)}
              onClearChat={() => clearChatMessages(chatId)}
              onAction={handleHeaderAction}
            />
          </>
        )}
      </header>

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
        {chatMessages.map((message, index) => (
          <div
            key={message.id}
            ref={(el) => { messageRefs.current[message.id] = el; }}
            className={highlightId === message.id ? 'animate-pulse rounded-lg ring-2 ring-[var(--accent)]' : undefined}
          >
            <MessageBubble
              message={message}
              contactAvatar={chat?.avatarUrl}
              contactName={chat?.title}
              showContactAvatar={shouldShowContactAvatar(chatMessages, index, user?.id)}
              onLongPress={handleLongPress}
              onReply={() => setReplyTo(message)}
              onRetry={() => void retryMessage(chatId, message)}
              onImageClick={(url) => setLightbox({ images: imageUrls, index: Math.max(0, imageUrls.indexOf(url)) })}
              selectMode={selectMode}
              selected={selectedIds.has(message.id)}
            />
          </div>
        ))}
        {presence && <p className="px-12 py-1 text-xs italic text-[var(--accent-dark)]">{presence}</p>}
        <div ref={messagesEndRef} />
        <ScrollToBottomButton visible={showScrollBtn} onClick={scrollToBottom} />
      </div>

      {!selectMode && <ChatInput chatId={chatId} />}

      <MessageActionMenu message={actionMessage} open={showMenu} onClose={() => setShowMenu(false)} onAction={handleAction} onReact={handleReact} contactName={chat?.title} />
      <ForwardMessageSheet open={!!forwardMessage || bulkForwardQueue.length > 0} currentChatId={chatId} onClose={() => { setForwardMessage(null); setBulkForwardQueue([]); }} onSelect={handleForward} />
      <ContactInfoSheet
        chat={chat}
        chatId={chatId}
        open={showContactInfo}
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
