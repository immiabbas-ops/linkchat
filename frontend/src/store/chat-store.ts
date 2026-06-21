import { create } from 'zustand';

import { api } from '@/lib/api';

import { socketService } from '@/lib/socket';

import { withMessageOwnership } from '@/lib/messages';
import { resolveMediaUrl } from '@/lib/media-url';

import { useAuthStore } from '@/store/auth-store';

import type { Chat, Message } from '@/types';
import type { ScreenshotAlert } from '@/components/chat/ScreenshotAlertBanner';
import { decryptForChat, encryptForChat, setupChatKeys } from '@/lib/e2ee';
import { sortChats } from '@/lib/chat-sort';
import { sortMessagesByCreatedAt, getClientMessageId, createClientMessageId } from '@/lib/message-sort';
import { enqueueOutbound, dequeueOutbound, getOutboundQueue } from '@/lib/message-queue';
import { scheduleTypingHide, cancelTypingHide } from '@/lib/typing-debounce';



interface PresenceUser {

  userId: string;

  displayName?: string;

}



interface ChatState {

  chats: Chat[];

  activeChatId: string | null;

  messages: Record<string, Message[]>;

  typingUsers: Record<string, PresenceUser[]>;

  recordingUsers: Record<string, PresenceUser[]>;

  onlineUsers: Record<string, boolean>;

  isLoadingChats: boolean;

  isLoadingMessages: boolean;

  messageCursors: Record<string, string | null>;

  loadingMoreMessages: Record<string, boolean>;

  replyTo: Message | null;

  socketReady: boolean;



  fetchChats: () => Promise<void>;

  setActiveChat: (chatId: string | null) => void;

  fetchMessages: (chatId: string, cursor?: string) => Promise<void>;

  loadMoreMessages: (chatId: string) => Promise<void>;

  sendMessage: (chatId: string, content: string, options?: Partial<Message>) => Promise<void>;

  addMessage: (message: Message) => Promise<void>;

  updateMessage: (message: Message) => void;

  removeMessage: (chatId: string, messageId: string) => void;

  setReplyTo: (message: Message | null) => void;

  setTyping: (chatId: string, userId: string, displayName?: string, isTyping?: boolean) => void;

  setRecording: (chatId: string, userId: string, displayName?: string, isRecording?: boolean) => void;

  setUserOnline: (userId: string, online: boolean) => void;

  markMessagesRead: (chatId: string) => void;

  ensureChatInList: (chatId: string) => Promise<void>;

  upsertChat: (chat: Chat) => void;

  fetchChat: (chatId: string) => Promise<Chat | null>;

  clearChatMessages: (chatId: string) => void;

  retryMessage: (chatId: string, message: Message) => Promise<void>;

  updateChatMeta: (chatId: string, patch: Partial<Chat>) => void;

  removeChatFromList: (chatId: string) => void;

  screenshotAlerts: Record<string, ScreenshotAlert | null>;
  setScreenshotAlert: (chatId: string, alert: ScreenshotAlert | null) => void;

  initSocketListeners: () => void;

  onReconnect: () => Promise<void>;

}



let socketUnsubs: (() => void)[] = [];

function getChatMemberIds(chat: Chat | undefined, userId?: string | null): string[] {
  if (chat?.members?.length) return chat.members.map((m) => m.id);
  if (userId && chat?.participantId) return [userId, chat.participantId];
  return userId ? [userId] : [];
}

function shouldEncryptChat(chat: Chat | undefined): boolean {
  return !!chat?.isEncrypted && chat.source !== 'SMS' && chat.source !== 'TELEGRAM';
}

async function decryptMessageIfNeeded(message: Message, chat: Chat | undefined, userId?: string | null): Promise<Message> {
  if (!shouldEncryptChat(chat) || !userId) return message;

  let content = message.content;
  if (message.content) {
    content = await decryptForChat(
      message.chatId,
      message.content,
      getChatMemberIds(chat, userId),
      userId,
    );
  }

  let replyTo = message.replyTo;
  if (replyTo?.content) {
    const decryptedReply = await decryptForChat(
      message.chatId,
      replyTo.content,
      getChatMemberIds(chat, userId),
      userId,
    );
    replyTo = { ...replyTo, content: decryptedReply };
  }

  return { ...message, content, replyTo };
}

async function decryptMessages(messages: Message[], chatId: string, userId?: string | null): Promise<Message[]> {
  const chat = useChatStore.getState().chats.find((c) => c.id === chatId);
  if (!shouldEncryptChat(chat)) return messages;
  return Promise.all(messages.map((m) => decryptMessageIfNeeded(m, chat, userId)));
}

function mergeMessage(existing: Message, incoming: Message): Message {
  return {
    ...existing,
    ...incoming,
    content: incoming.content?.trim() ? incoming.content : existing.content,
    sender: incoming.sender?.id ? incoming.sender : existing.sender,
    mediaFiles: incoming.mediaFiles?.length ? incoming.mediaFiles : existing.mediaFiles,
    metadata: incoming.metadata ?? existing.metadata,
  };
}

function normalizeMessageMedia(message: Message): Message {
  if (!message.mediaFiles?.length) return message;
  return {
    ...message,
    mediaFiles: message.mediaFiles.map((file) => ({
      ...file,
      url: resolveMediaUrl(file.url),
      thumbnailUrl: file.thumbnailUrl ? resolveMediaUrl(file.thumbnailUrl) : undefined,
    })),
  };
}

function normalizeMessage(message: Message, userId?: string | null): Message {
  return withMessageOwnership(normalizeMessageMedia(message), userId);
}

function mergeMessagesById(incoming: Message[], existing: Message[] = []) {
  const byId = new Map<string, Message>();

  for (const message of incoming) {
    byId.set(message.id, message);
  }

  for (const message of existing) {
    if (message.id.startsWith('pending-')) {
      byId.set(message.id, message);
      continue;
    }
    if (!byId.has(message.id)) {
      byId.set(message.id, message);
    }
  }

  return sortMessagesByCreatedAt(Array.from(byId.values()));
}

function buildOptimisticMessage(
  chatId: string,
  content: string,
  options?: Partial<Message>,
  user?: { id: string; profile?: { displayName?: string; avatarUrl?: string } } | null,
): Message {
  const meta = options?.metadata;
  const metaUrl = meta?.url as string | undefined;
  const mediaFiles = metaUrl
    ? [
        {
          id: (meta?.mediaFileId as string) || `pending-media-${Date.now()}`,
          fileName: (meta?.fileName as string) || content || 'file',
          mimeType: (meta?.mimeType as string) || '',
          url: resolveMediaUrl(metaUrl),
          fileSize: meta?.fileSize as number | undefined,
        },
      ]
    : undefined;

  const clientMessageId = createClientMessageId();

  return {
    id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    chatId,
    type: options?.type || 'TEXT',
    content,
    status: 'SENT',
    sendState: 'sending',
    createdAt: new Date().toISOString(),
    metadata: { ...options?.metadata, clientMessageId },
    mediaFiles,
    sender: user
      ? {
          id: user.id,
          displayName: user.profile?.displayName,
          avatarUrl: user.profile?.avatarUrl,
        }
      : undefined,
    isOwn: true,
  };
}



export const useChatStore = create<ChatState>((set, get) => ({

  chats: [],

  activeChatId: null,

  messages: {},

  typingUsers: {},

  recordingUsers: {},

  onlineUsers: {},

  isLoadingChats: false,

  isLoadingMessages: false,

  messageCursors: {},

  loadingMoreMessages: {},

  replyTo: null,

  screenshotAlerts: {},

  socketReady: false,



  fetchChats: async () => {

    set({ isLoadingChats: true });

    try {

      const result = await api.get<{ items: Chat[] }>('/chats');

      set({ chats: sortChats(result.items), isLoadingChats: false });

      result.items.forEach((chat) => socketService.joinChat(chat.id));

    } catch {

      set({ isLoadingChats: false });

    }

  },



  setActiveChat: (chatId) => {
    set({ activeChatId: chatId, replyTo: null });

    if (chatId) {
      socketService.joinChat(chatId);
      get().fetchMessages(chatId);
      get().markMessagesRead(chatId);
    }
  },



  fetchMessages: async (chatId, cursor) => {

    set({ isLoadingMessages: !cursor });

    try {

      const result = await api.get<{ items: Message[]; nextCursor: string | null }>(

        `/messages/chat/${chatId}${cursor ? `?cursor=${cursor}` : ''}`,

      );

      const userId = useAuthStore.getState().user?.id;
      const items = (result.items || []).map((m) => normalizeMessage(m, userId));
      const decrypted = await decryptMessages(items, chatId, userId);

      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: cursor
            ? mergeMessagesById(decrypted, state.messages[chatId] || [])
            : mergeMessagesById(decrypted, state.messages[chatId]),
        },
        messageCursors: { ...state.messageCursors, [chatId]: result.nextCursor ?? null },
        isLoadingMessages: false,
        loadingMoreMessages: { ...state.loadingMoreMessages, [chatId]: false },
      }));

      const toAck = decrypted
        .filter((m) => !m.isOwn && m.status === 'SENT')
        .map((m) => m.id);
      if (toAck.length) socketService.acknowledgeDelivery(chatId, toAck);

    } catch {

      set((state) => ({
        isLoadingMessages: false,
        loadingMoreMessages: { ...state.loadingMoreMessages, [chatId]: false },
      }));

    }

  },

  loadMoreMessages: async (chatId) => {
    const { messageCursors, loadingMoreMessages } = get();
    const cursor = messageCursors[chatId];
    if (!cursor || loadingMoreMessages[chatId]) return;
    set((state) => ({
      loadingMoreMessages: { ...state.loadingMoreMessages, [chatId]: true },
    }));
    await get().fetchMessages(chatId, cursor);
  },



  sendMessage: async (chatId, content, options) => {
    const reply = get().replyTo;
    const replyToId = reply?.chatId === chatId ? reply.id : undefined;
    const user = useAuthStore.getState().user;
    const chat = get().chats.find((c) => c.id === chatId);
    const optimistic = buildOptimisticMessage(chatId, content, options, user);
    get().addMessage(optimistic);

    let contentToSend = content;
    if (shouldEncryptChat(chat) && user?.id) {
      const memberIds = getChatMemberIds(chat, user.id);
      await setupChatKeys(chatId, memberIds, user.id);
      contentToSend = await encryptForChat(chatId, content, memberIds, user.id);
    }

    const clientMessageId = getClientMessageId(optimistic);
    const sendMeta = { ...options?.metadata, clientMessageId };

    const finalize = async (message: Message) => {
      const userId = useAuthStore.getState().user?.id;
      const chatState = get().chats.find((c) => c.id === chatId);
      let normalized = normalizeMessage(message, userId);
      normalized = await decryptMessageIfNeeded(normalized, chatState, userId);
      normalized = { ...normalized, sendState: undefined };

      if (clientMessageId) dequeueOutbound(optimistic.id);

      set((state) => {
        const list = (state.messages[chatId] || []).filter(
          (m) =>
            m.id !== optimistic.id &&
            !(
              m.id.startsWith('pending-') &&
              m.isOwn &&
              getClientMessageId(m) === clientMessageId
            ),
        );
        const existingIdx = list.findIndex((m) => m.id === normalized.id);

        if (existingIdx >= 0) {
          list[existingIdx] = normalizeMessage(
            mergeMessage(list[existingIdx], normalized),
            userId,
          );
        } else {
          list.push(normalized);
        }

        return {
          replyTo: null,
          messages: {
            ...state.messages,
            [chatId]: sortMessagesByCreatedAt(list),
          },
        };
      });
    };

    try {
      const message = await socketService.sendMessage({
        chatId,
        content: contentToSend,
        type: options?.type || 'TEXT',
        replyToId,
        mediaFileId: options?.metadata?.mediaFileId as string,
        metadata: sendMeta,
      });
      await finalize(message);
    } catch {
      try {
        const message = await api.post<Message>('/messages', {
          chatId,
          content: contentToSend,
          type: options?.type || 'TEXT',
          replyToId,
          mediaFileId: options?.metadata?.mediaFileId as string,
          metadata: sendMeta,
        });
        await finalize(message);
      } catch (restError) {
        enqueueOutbound({
          id: optimistic.id,
          chatId,
          content,
          options,
          replyToId,
          createdAt: Date.now(),
        });
        set((state) => ({
          messages: {
            ...state.messages,
            [chatId]: (state.messages[chatId] || []).map((m) =>
              m.id === optimistic.id ? { ...m, sendState: 'failed' as const } : m,
            ),
          },
        }));
        throw restError;
      }
    }
  },

  addMessage: async (message) => {
    const userId = useAuthStore.getState().user?.id;
    let normalized = normalizeMessage(message, userId);
    const chat = get().chats.find((c) => c.id === normalized.chatId);
    normalized = await decryptMessageIfNeeded(normalized, chat, userId);

    if (!get().chats.some((c) => c.id === normalized.chatId)) {
      await get().ensureChatInList(normalized.chatId);
    }

    set((state) => {
      const chatMessages = state.messages[normalized.chatId] || [];
      const existingIdx = chatMessages.findIndex((m) => m.id === normalized.id);
      const incomingClientId = getClientMessageId(normalized);
      const withoutMatchingPending = chatMessages.filter((m) => {
        if (!m.id.startsWith('pending-') || !m.isOwn) return true;
        if (incomingClientId && getClientMessageId(m) === incomingClientId) return false;
        if (m.id === normalized.id) return false;
        return !(m.content === normalized.content && m.type === normalized.type);
      });

      let nextMessages: Message[];
      if (existingIdx >= 0) {
        nextMessages = sortMessagesByCreatedAt(
          withoutMatchingPending.map((m) =>
            m.id === normalized.id
              ? normalizeMessage(mergeMessage(m, normalized), userId)
              : m,
          ),
        );
      } else {
        nextMessages = sortMessagesByCreatedAt([...withoutMatchingPending, normalized]);
      }

      const chats = state.chats.map((c) =>
        c.id === normalized.chatId
          ? {
              ...c,
              lastMessage: {
                id: normalized.id,
                content: normalized.content,
                type: normalized.type,
                createdAt: normalized.createdAt,
                senderId: normalized.sender?.id || '',
                status: normalized.status,
              },
              updatedAt: normalized.createdAt,
              unreadCount:
                state.activeChatId === normalized.chatId
                  ? 0
                  : normalized.isOwn
                    ? c.unreadCount || 0
                    : (c.unreadCount || 0) + 1,
            }
          : c,
      );

      chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      return {
        chats: sortChats(chats),
        messages: {
          ...state.messages,
          [normalized.chatId]: nextMessages,
        },
      };
    });

    if (get().activeChatId === normalized.chatId) {
      get().markMessagesRead(normalized.chatId);
    }

    if (
      !normalized.isOwn &&
      normalized.id &&
      !normalized.id.startsWith('pending-')
    ) {
      socketService.acknowledgeDelivery(normalized.chatId, [normalized.id]);
    }
  },



  updateMessage: (message) => {

    set((state) => ({

      messages: {

        ...state.messages,

        [message.chatId]: (state.messages[message.chatId] || []).map((m) =>

          m.id === message.id ? message : m,

        ),

      },

    }));

  },



  removeMessage: (chatId, messageId) => {

    set((state) => ({

      messages: {

        ...state.messages,

        [chatId]: (state.messages[chatId] || []).filter((m) => m.id !== messageId),

      },

    }));

  },



  setReplyTo: (message) => set({ replyTo: message }),



  setTyping: (chatId, userId, displayName, isTyping = true) => {
    const key = `${chatId}:${userId}`;

    if (isTyping) {
      cancelTypingHide(key);
      set((state) => {
        const current = state.typingUsers[chatId] || [];
        const filtered = current.filter((t) => t.userId !== userId);
        return {
          typingUsers: {
            ...state.typingUsers,
            [chatId]: [...filtered, { userId, displayName }],
          },
        };
      });
      return;
    }

    scheduleTypingHide(key, () => {
      set((state) => {
        const current = state.typingUsers[chatId] || [];
        return {
          typingUsers: {
            ...state.typingUsers,
            [chatId]: current.filter((t) => t.userId !== userId),
          },
        };
      });
    });
  },



  setRecording: (chatId, userId, displayName, isRecording = true) => {

    set((state) => {

      const current = state.recordingUsers[chatId] || [];

      const filtered = current.filter((r) => r.userId !== userId);

      return {

        recordingUsers: {

          ...state.recordingUsers,

          [chatId]: isRecording ? [...filtered, { userId, displayName }] : filtered,

        },

      };

    });

  },



  setUserOnline: (userId, online) => {

    set((state) => ({

      onlineUsers: { ...state.onlineUsers, [userId]: online },

      chats: state.chats.map((c) => ({

        ...c,

        isOnline: c.members?.some((m) => m.id === userId) ? online : c.isOnline,

        members: c.members?.map((m) => (m.id === userId ? { ...m, isOnline: online } : m)),

      })),

    }));

  },



  markMessagesRead: (chatId) => {
    const readReceiptsEnabled = useAuthStore.getState().user?.settings?.readReceipts !== false;

    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === chatId ? { ...c, unreadCount: 0 } : c,
      ),
    }));

    if (!readReceiptsEnabled) return;

    if (socketService.isConnected()) {
      socketService.markRead(chatId);
    } else {
      api.post('/messages/read', { chatId }).catch(() => {});
    }
  },



  ensureChatInList: async (chatId) => {

    if (get().chats.some((c) => c.id === chatId)) return;

    await get().fetchChat(chatId);

  },



  upsertChat: (chat) => {

    socketService.joinChat(chat.id);

    set((state) => {

      const idx = state.chats.findIndex((c) => c.id === chat.id);

      const chats =

        idx >= 0

          ? state.chats.map((c) => (c.id === chat.id ? { ...c, ...chat } : c))

          : [chat, ...state.chats];

      chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      return { chats: sortChats(chats) };

    });

  },



  fetchChat: async (chatId) => {

    try {

      const chat = await api.get<Chat>(`/chats/${chatId}`);

      get().upsertChat(chat);

      return chat;

    } catch {

      return null;

    }

  },



  clearChatMessages: (chatId) => {

    set((state) => ({

      messages: { ...state.messages, [chatId]: [] },

      chats: state.chats.map((c) =>

        c.id === chatId ? { ...c, lastMessage: undefined, unreadCount: 0 } : c,

      ),

    }));

  },

  retryMessage: async (chatId, message) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).filter((m) => m.id !== message.id),
      },
    }));
    await get().sendMessage(chatId, message.content || '', {
      type: message.type,
      metadata: message.metadata,
    });
  },

  updateChatMeta: (chatId, patch) => {
    set((state) => ({
      chats: state.chats.map((c) => (c.id === chatId ? { ...c, ...patch } : c)),
    }));
  },

  removeChatFromList: (chatId) => {
    set((state) => ({
      chats: state.chats.filter((c) => c.id !== chatId),
    }));
  },

  setScreenshotAlert: (chatId, alert) => {
    set((state) => ({
      screenshotAlerts: { ...state.screenshotAlerts, [chatId]: alert },
    }));
  },



  onReconnect: async () => {
    const { activeChatId, fetchMessages, fetchChats } = get();
    await fetchChats();
    if (activeChatId) {
      socketService.joinChat(activeChatId);
      await fetchMessages(activeChatId);
    }
    const queue = getOutboundQueue();
    for (const item of queue) {
      try {
        await get().sendMessage(item.chatId, item.content, {
          ...item.options,
          metadata: {
            ...item.options?.metadata,
            _fromQueue: item.id,
          },
        });
        dequeueOutbound(item.id);
      } catch {
        /* keep queued */
      }
    }
  },

  initSocketListeners: () => {

    if (get().socketReady) return;



    socketUnsubs.forEach((unsub) => unsub());

    socketUnsubs = [

      socketService.on('message:new', (data) => {
        void get().addMessage(data as Message);
      }),

      socketService.on('message:edit', (data) => {

        const userId = useAuthStore.getState().user?.id;
        const chat = get().chats.find((c) => c.id === (data as Message).chatId);
        void decryptMessageIfNeeded(normalizeMessage(data as Message, userId), chat, userId).then(
          (msg) => get().updateMessage(msg),
        );

      }),

      socketService.on('message:delete', (data) => {

        const d = data as { messageId: string; chatId?: string; scope?: string };

        if (d.scope !== 'EVERYONE') return;

        let targetChatId = d.chatId;
        if (!targetChatId) {
          const state = get();
          targetChatId = Object.keys(state.messages).find((cid) =>
            state.messages[cid].some((m) => m.id === d.messageId),
          );
        }
        if (targetChatId) get().removeMessage(targetChatId, d.messageId);

      }),

      socketService.on('message:delivered', (data) => {

        const d = data as { chatId: string; messageIds?: string[] };

        if (!d.messageIds?.length) return;

        set((state) => ({

          messages: {

            ...state.messages,

            [d.chatId]: (state.messages[d.chatId] || []).map((m) =>

              m.isOwn && d.messageIds!.includes(m.id) && m.status !== 'READ'

                ? { ...m, status: 'DELIVERED' as const }

                : m,

            ),

          },

        }));

      }),

      socketService.on('message:read', (data) => {

        const d = data as { chatId: string; messageIds?: string[] };

        if (!d.messageIds?.length) return;

        set((state) => ({

          messages: {

            ...state.messages,

            [d.chatId]: (state.messages[d.chatId] || []).map((m) =>

              m.isOwn && d.messageIds!.includes(m.id) ? { ...m, status: 'READ' } : m,

            ),

          },

        }));

      }),

      socketService.on('message:react', (data) => {

        const d = data as {

          messageId: string;

          emoji: string;

          userId: string;

          added?: boolean;

          removed?: boolean;

        };

        set((state) => {

          const updated: Record<string, Message[]> = { ...state.messages };

          for (const chatId of Object.keys(updated)) {

            updated[chatId] = updated[chatId].map((m) => {

              if (m.id !== d.messageId) return m;

              let reactions = [...(m.reactions || [])];

              if (d.removed) {

                reactions = reactions.filter(

                  (r) => !(r.userId === d.userId && r.emoji === d.emoji),

                );

              } else {
                const exists = reactions.some(
                  (r) => r.userId === d.userId && r.emoji === d.emoji,
                );
                if (!exists) {
                  reactions.push({ emoji: d.emoji, userId: d.userId });
                }
              }

              return { ...m, reactions };

            });

          }

          return { messages: updated };

        });

      }),

      socketService.on('user:typing', (data) => {

        const d = data as { chatId: string; userId: string; displayName?: string; isTyping: boolean };

        get().setTyping(d.chatId, d.userId, d.displayName, d.isTyping);

      }),

      socketService.on('user:recording', (data) => {

        const d = data as {

          chatId: string;

          userId: string;

          displayName?: string;

          isRecording: boolean;

        };

        get().setRecording(d.chatId, d.userId, d.displayName, d.isRecording);

      }),

      socketService.on('user:online', (data) => {

        const d = data as { userId: string; online: boolean };

        get().setUserOnline(d.userId, d.online);

      }),

      socketService.on('user:screenshot', (data) => {
        const d = data as {
          chatId: string;
          userId: string;
          displayName?: string;
          username?: string;
          at: string;
        };
        const currentUserId = useAuthStore.getState().user?.id;
        if (!d.chatId || d.userId === currentUserId) return;
        get().setScreenshotAlert(d.chatId, {
          id: `${d.userId}-${d.at}`,
          displayName: d.displayName,
          username: d.username,
          at: d.at,
        });
      }),

    ];



    set({ socketReady: true });

  },

}));


