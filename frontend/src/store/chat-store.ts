import { create } from 'zustand';

import { api } from '@/lib/api';

import { socketService } from '@/lib/socket';

import { withMessageOwnership } from '@/lib/messages';

import { useAuthStore } from '@/store/auth-store';

import type { Chat, Message } from '@/types';



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

  replyTo: Message | null;

  socketReady: boolean;



  fetchChats: () => Promise<void>;

  setActiveChat: (chatId: string | null) => void;

  fetchMessages: (chatId: string, cursor?: string) => Promise<void>;

  sendMessage: (chatId: string, content: string, options?: Partial<Message>) => Promise<void>;

  addMessage: (message: Message) => void;

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

  initSocketListeners: () => void;

}



let socketUnsubs: (() => void)[] = [];

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

function mergeMessagesById(incoming: Message[], existing: Message[] = []) {
  const byId = new Map<string, Message>();

  for (const message of incoming) {
    byId.set(message.id, message);
  }

  for (const message of existing) {
    if (message.id.startsWith('pending-')) continue;
    if (!byId.has(message.id)) {
      byId.set(message.id, message);
    }
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function buildOptimisticMessage(
  chatId: string,
  content: string,
  options?: Partial<Message>,
  user?: { id: string; profile?: { displayName?: string; avatarUrl?: string } } | null,
): Message {
  return {
    id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    chatId,
    type: options?.type || 'TEXT',
    content,
    status: 'SENT',
    createdAt: new Date().toISOString(),
    metadata: options?.metadata,
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

  replyTo: null,

  socketReady: false,



  fetchChats: async () => {

    set({ isLoadingChats: true });

    try {

      const result = await api.get<{ items: Chat[] }>('/chats');

      set({ chats: result.items, isLoadingChats: false });

      result.items.forEach((chat) => socketService.joinChat(chat.id));

    } catch {

      set({ isLoadingChats: false });

    }

  },



  setActiveChat: (chatId) => {

    set({ activeChatId: chatId });

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
      const items = (result.items || []).map((m) => withMessageOwnership(m, userId));

      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: cursor
            ? [...items, ...(state.messages[chatId] || [])]
            : mergeMessagesById(items, state.messages[chatId]),
        },
        isLoadingMessages: false,
      }));

    } catch {

      set({ isLoadingMessages: false });

    }

  },



  sendMessage: async (chatId, content, options) => {

    const replyToId = get().replyTo?.id;
    const user = useAuthStore.getState().user;
    const optimistic = buildOptimisticMessage(chatId, content, options, user);
    get().addMessage(optimistic);

    const finalize = (message: Message) => {
      const userId = useAuthStore.getState().user?.id;
      const normalized = withMessageOwnership(message, userId);

      set((state) => {
        const list = (state.messages[chatId] || []).filter((m) => m.id !== optimistic.id);
        const existingIdx = list.findIndex((m) => m.id === normalized.id);

        if (existingIdx >= 0) {
          list[existingIdx] = withMessageOwnership(
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
            [chatId]: list,
          },
        };
      });
    };

    const dropOptimistic = () => {
      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: (state.messages[chatId] || []).filter((m) => m.id !== optimistic.id),
        },
      }));
    };

    try {

      const message = await socketService.sendMessage({

        chatId,

        content,

        type: options?.type || 'TEXT',

        replyToId,

        mediaFileId: options?.metadata?.mediaFileId as string,

        metadata: options?.metadata,

      });

      finalize(message);

    } catch {

      try {

        const message = await api.post<Message>('/messages', {

          chatId,

          content,

          type: options?.type || 'TEXT',

          replyToId,

          mediaFileId: options?.metadata?.mediaFileId as string,

          metadata: options?.metadata,

        });

        finalize(message);

      } catch (restError) {

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



  addMessage: (message) => {

    const userId = useAuthStore.getState().user?.id;

    const normalized = withMessageOwnership(message, userId);

    if (!get().chats.some((c) => c.id === normalized.chatId)) {

      void get().ensureChatInList(normalized.chatId);

    }

    set((state) => {

      const chatMessages = state.messages[normalized.chatId] || [];

      const existingIdx = chatMessages.findIndex((m) => m.id === normalized.id);
      const withoutMatchingPending = chatMessages.filter(
        (m) =>
          !(
            m.id.startsWith('pending-') &&
            m.isOwn &&
            m.content === normalized.content &&
            m.type === normalized.type
          ),
      );

      let nextMessages: Message[];
      if (existingIdx >= 0) {
        nextMessages = withoutMatchingPending.map((m) =>
          m.id === normalized.id
            ? withMessageOwnership(mergeMessage(m, normalized), userId)
            : m,
        );
      } else {
        nextMessages = [...withoutMatchingPending, normalized];
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

        chats,

        messages: {

          ...state.messages,

          [normalized.chatId]: nextMessages,

        },

      };

    });



    if (get().activeChatId === normalized.chatId) {

      get().markMessagesRead(normalized.chatId);

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

    set((state) => {

      const current = state.typingUsers[chatId] || [];

      const filtered = current.filter((t) => t.userId !== userId);

      return {

        typingUsers: {

          ...state.typingUsers,

          [chatId]: isTyping ? [...filtered, { userId, displayName }] : filtered,

        },

      };

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

    set((state) => ({

      chats: state.chats.map((c) =>

        c.id === chatId ? { ...c, unreadCount: 0 } : c,

      ),

    }));

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

      return { chats };

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



  initSocketListeners: () => {

    if (get().socketReady) return;



    socketUnsubs.forEach((unsub) => unsub());

    socketUnsubs = [

      socketService.on('message:new', (data) => get().addMessage(data as Message)),

      socketService.on('message:edit', (data) => {

        const userId = useAuthStore.getState().user?.id;

        get().updateMessage(withMessageOwnership(data as Message, userId));

      }),

      socketService.on('message:delete', (data) => {

        const d = data as { messageId: string; chatId?: string; scope?: string };

        if (d.scope === 'EVERYONE' && d.chatId) {

          get().removeMessage(d.chatId, d.messageId);

        }

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

                reactions.push({ emoji: d.emoji, userId: d.userId });

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

    ];



    set({ socketReady: true });

  },

}));


