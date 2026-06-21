import parsePhoneNumberFromString, { type CountryCode } from 'libphonenumber-js';

export const DEFAULT_PHONE_COUNTRY = (process.env.NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY ||
  'AE') as CountryCode;

function parsePhone(raw: string, defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY) {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  let parsed = parsePhoneNumberFromString(trimmed);
  if (parsed?.isValid()) return parsed;

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return undefined;

  parsed = parsePhoneNumberFromString(`+${digits}`);
  if (parsed?.isValid()) return parsed;

  parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
  if (parsed?.isValid()) return parsed;

  if (digits.startsWith('0')) {
    parsed = parsePhoneNumberFromString(digits.slice(1), defaultCountry);
    if (parsed?.isValid()) return parsed;
  }

  parsed = parsePhoneNumberFromString(digits, defaultCountry);
  if (parsed?.isValid()) return parsed;

  return undefined;
}

export function normalizePhone(value: string): string {
  const parsed = parsePhone(value);
  if (parsed) return parsed.number.slice(1);
  return value.replace(/\D/g, '');
}

export function formatPhoneDisplay(
  phone?: string | null,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY,
): string {
  if (!phone) return '';

  const parsed = parsePhone(phone, defaultCountry);
  if (parsed) return parsed.formatInternational();

  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('0')) {
    const retried = parsePhone(digits.slice(1), defaultCountry);
    if (retried) return retried.formatInternational();
  }

  return `+${digits}`;
}

function looksLikePhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && /^[\d+\s\-().]+$/.test(value.trim());
}

export function getChatDisplayTitle(chat?: {
  title: string;
  isContact?: boolean;
  contactName?: string;
  participantPhone?: string;
}): string {
  if (!chat) return 'Chat';
  if (chat.isContact) return chat.contactName || chat.title;
  if (chat.participantPhone) return formatPhoneDisplay(chat.participantPhone);
  if (looksLikePhone(chat.title)) return formatPhoneDisplay(chat.title);
  return chat.title;
}
