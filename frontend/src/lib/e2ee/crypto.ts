function bufToB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function b64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export async function generateIdentityKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']);
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  return bufToB64(await crypto.subtle.exportKey('spki', key));
}

export async function importPublicKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('spki', b64ToBuf(b64), { name: 'ECDH', namedCurve: 'P-256' }, true, []);
}

export async function exportPrivateKey(key: CryptoKey): Promise<string> {
  return bufToB64(await crypto.subtle.exportKey('pkcs8', key));
}

export async function importPrivateKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('pkcs8', b64ToBuf(b64), { name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveKey',
    'deriveBits',
  ]);
}

export async function generateChatKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  return buf;
}

async function exportRawKey(key: CryptoKey): Promise<ArrayBuffer> {
  const exported = await crypto.subtle.exportKey('raw', key);
  if (exported instanceof ArrayBuffer) return exported;
  return toArrayBuffer(new Uint8Array(exported));
}

async function importAesKey(raw: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function wrapChatKeyForUser(
  chatKey: CryptoKey,
  recipientPublicKey: CryptoKey,
): Promise<{ wrappedKey: string; ephemeralKey: string; iv: string }> {
  const ephemeral = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
  const shared = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: recipientPublicKey },
    ephemeral.privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const rawChatKey = await exportRawKey(chatKey);
  const wrapped = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, shared, rawChatKey);
  return {
    wrappedKey: bufToB64(wrapped),
    ephemeralKey: await exportPublicKey(ephemeral.publicKey),
    iv: bufToB64(iv),
  };
}

export async function unwrapChatKey(
  bundle: { wrappedKey: string; ephemeralKey: string; iv: string },
  privateKey: CryptoKey,
): Promise<CryptoKey> {
  const ephemeralPublic = await importPublicKey(bundle.ephemeralKey);
  const shared = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: ephemeralPublic },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  const raw = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(b64ToBuf(bundle.iv)) },
    shared,
    b64ToBuf(bundle.wrappedKey),
  );
  return importAesKey(raw);
}

export async function encryptText(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));
  return JSON.stringify({ e2ee: 1, iv: bufToB64(iv), ct: bufToB64(ct) });
}

export async function decryptText(key: CryptoKey, payload: string): Promise<string> {
  const parsed = JSON.parse(payload) as { iv: string; ct: string };
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(b64ToBuf(parsed.iv)) },
    key,
    b64ToBuf(parsed.ct),
  );
  return new TextDecoder().decode(plain);
}

export function isE2eePayload(content?: string | null): boolean {
  if (!content?.startsWith('{"e2ee"')) return false;
  try {
    const o = JSON.parse(content) as { e2ee?: number; ct?: string; iv?: string };
    return o.e2ee === 1 && !!o.ct && !!o.iv;
  } catch {
    return false;
  }
}
