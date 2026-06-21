export interface User {
  id: string;
  email: string;
  profile?: Profile;
  settings?: UserSettings;
}

export interface UserSettings {
  readReceipts?: boolean;
  lastSeenVisible?: boolean;
  screenshotAlerts?: boolean;
  pushEnabled?: boolean;
  secretChatDefault?: number | null;
}

export interface Profile {
  displayName: string;
  username?: string;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  locale?: string;
  theme?: string;
}

export interface Chat {
  id: string;
  type: 'PRIVATE' | 'GROUP';
  title: string;
  avatarUrl?: string;
  isPinned?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;
  pinnedMessageId?: string | null;
  description?: string;
  isOnline?: boolean;
  isContact?: boolean;
  participantId?: string;
  participantPhone?: string;
  contactName?: string;
  unreadCount?: number;
  source?: 'TELEGRAM' | 'SMS';
  isEncrypted?: boolean;
  members?: ChatMember[];
  lastMessage?: LastMessage;
  updatedAt: string;
}

export interface ChatMember {
  id: string;
  displayName?: string;
  avatarUrl?: string;
  role?: string;
  isOnline?: boolean;
}

export interface LastMessage {
  id: string;
  content?: string;
  type: MessageType;
  createdAt: string;
  senderId: string;
  status?: MessageStatus;
}

export type MessageType =
  | 'TEXT'
  | 'IMAGE'
  | 'VIDEO'
  | 'AUDIO'
  | 'VOICE'
  | 'DOCUMENT'
  | 'LOCATION'
  | 'CONTACT'
  | 'FILE'
  | 'NOTE'
  | 'SYSTEM';

export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

export interface Message {
  id: string;
  chatId: string;
  type: MessageType;
  content?: string;
  status: MessageStatus;
  editedAt?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
  sender?: { id: string; displayName?: string; avatarUrl?: string };
  replyTo?: { id: string; content?: string; type: MessageType; sender?: { displayName?: string } };
  reactions?: { emoji: string; userId: string; displayName?: string }[];
  readBy?: { userId: string; readAt: string }[];
  mediaFiles?: MediaFile[];
  isStarred?: boolean;
  isOwn?: boolean;
  sendState?: 'sending' | 'failed';
}

export interface MediaFile {
  id: string;
  fileName: string;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
  fileSize?: number;
  duration?: number;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt?: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
}

export type ConnectorType = 'TELEGRAM' | 'EMAIL' | 'DISCORD' | 'MATRIX';

export interface ChatConnector {
  id: string;
  type: ConnectorType;
  label: string;
  identifier: string;
  enabled: boolean;
  config?: { live?: boolean; botUsername?: string };
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  userId: string;
  contactUserId: string;
  savedName: string;
  phone: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}
