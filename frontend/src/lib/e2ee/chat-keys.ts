import { api } from '@/lib/api';
import { getDeviceId } from '@/lib/utils';
import {
  decryptText,
  encryptText,
  exportPrivateKey,
  exportPublicKey,
  generateChatKey,
  generateIdentityKeyPair,
  importPrivateKey,
  importPublicKey,
  isE2eePayload,
  unwrapChatKey,
  wrapChatKeyForUser,
} from './crypto';

const PRIV_KEY = 'linkchat_e2ee_priv';
const PUB_KEY = 'linkchat_e2ee_pub';

const chatKeyCache = new Map<string, CryptoKey>();
let identityPrivateKey: CryptoKey | null = null;
let identityPublicKey: CryptoKey | null = null;
let initPromise: Promise<void> | null = null;

async function loadOrCreateIdentity(): Promise<void> {
  const storedPriv = localStorage.getItem(PRIV_KEY);
  const storedPub = localStorage.getItem(PUB_KEY);

  if (storedPriv && storedPub) {
    identityPrivateKey = await importPrivateKey(storedPriv);
    identityPublicKey = await importPublicKey(storedPub);
    return;
  }

  const pair = await generateIdentityKeyPair();
  identityPrivateKey = pair.privateKey;
  identityPublicKey = pair.publicKey;
  localStorage.setItem(PRIV_KEY, await exportPrivateKey(pair.privateKey));
  localStorage.setItem(PUB_KEY, await exportPublicKey(pair.publicKey));
}

export async function ensureE2eeReady(): Promise<void> {
  if (typeof window === 'undefined' || !crypto.subtle) return;
  if (!initPromise) {
    initPromise = (async () => {
      await loadOrCreateIdentity();
      if (!identityPublicKey) return;
      await api.post('/e2ee/keys', {
        deviceId: getDeviceId(),
        publicKey: await exportPublicKey(identityPublicKey),
      });
    })();
  }
  await initPromise;
}

interface KeyBundle {
  wrappedKey: string;
  ephemeralKey: string;
  iv: string;
}

async function fetchUserPublicKey(userId: string): Promise<CryptoKey | null> {
  try {
    const res = await api.get<{ publicKey: string }>(`/e2ee/users/${userId}/key`);
    return importPublicKey(res.publicKey);
  } catch {
    return null;
  }
}

async function getChatKeyFromServer(chatId: string): Promise<CryptoKey | null> {
  if (!identityPrivateKey) return null;
  try {
    const bundle = await api.get<KeyBundle | null>(`/e2ee/chats/${chatId}/bundle`);
    if (!bundle) return null;
    return unwrapChatKey(bundle, identityPrivateKey);
  } catch {
    return null;
  }
}

async function uploadBundles(
  chatId: string,
  bundles: { userId: string; wrappedKey: string; ephemeralKey: string; iv: string }[],
) {
  if (!bundles.length) return;
  await api.post(`/e2ee/chats/${chatId}/bundles`, { bundles });
}

export async function setupChatKeys(chatId: string, memberUserIds: string[], currentUserId: string): Promise<void> {
  if (chatKeyCache.has(chatId)) return;

  const existing = await getChatKeyFromServer(chatId);
  if (existing) {
    chatKeyCache.set(chatId, existing);
    return;
  }

  const chatKey = await generateChatKey();
  chatKeyCache.set(chatId, chatKey);

  const others = memberUserIds.filter((id) => id !== currentUserId);
  const bundles: { userId: string; wrappedKey: string; ephemeralKey: string; iv: string }[] = [];

  if (identityPublicKey) {
    const selfWrap = await wrapChatKeyForUser(chatKey, identityPublicKey);
    bundles.push({ userId: currentUserId, ...selfWrap });
  }

  for (const userId of others) {
    const pub = await fetchUserPublicKey(userId);
    if (!pub) continue;
    const wrap = await wrapChatKeyForUser(chatKey, pub);
    bundles.push({ userId, ...wrap });
  }

  if (bundles.length) await uploadBundles(chatId, bundles);
}

export async function distributeChatKeys(chatId: string, memberUserIds: string[], currentUserId: string): Promise<void> {
  let chatKey = chatKeyCache.get(chatId);
  if (!chatKey) {
    chatKey = (await getChatKeyFromServer(chatId)) ?? undefined;
    if (chatKey) chatKeyCache.set(chatId, chatKey);
  }
  if (!chatKey) return;

  const bundles: { userId: string; wrappedKey: string; ephemeralKey: string; iv: string }[] = [];
  for (const userId of memberUserIds) {
    const pub = await fetchUserPublicKey(userId);
    if (!pub) continue;
    const wrap = await wrapChatKeyForUser(chatKey, pub);
    bundles.push({ userId, ...wrap });
  }
  if (bundles.length) await uploadBundles(chatId, bundles);
}

export async function getChatKey(chatId: string, memberUserIds: string[], currentUserId: string): Promise<CryptoKey | null> {
  if (chatKeyCache.has(chatId)) return chatKeyCache.get(chatId)!;
  await setupChatKeys(chatId, memberUserIds, currentUserId);
  return chatKeyCache.get(chatId) ?? null;
}

export async function encryptForChat(
  chatId: string,
  plaintext: string,
  memberUserIds: string[],
  currentUserId: string,
): Promise<string> {
  const key = await getChatKey(chatId, memberUserIds, currentUserId);
  if (!key) return plaintext;
  return encryptText(key, plaintext);
}

export async function decryptForChat(
  chatId: string,
  content: string | undefined,
  memberUserIds: string[],
  currentUserId: string,
): Promise<string | undefined> {
  if (!content || !isE2eePayload(content)) return content;
  const key = await getChatKey(chatId, memberUserIds, currentUserId);
  if (!key) return '🔒 Waiting for this message. This may take a while.';
  try {
    return await decryptText(key, content);
  } catch {
    return '🔒 Unable to decrypt message';
  }
}

export function clearChatKeyCache(chatId?: string) {
  if (chatId) chatKeyCache.delete(chatId);
  else chatKeyCache.clear();
}
