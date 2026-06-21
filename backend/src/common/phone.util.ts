import parsePhoneNumberFromString, { type CountryCode } from 'libphonenumber-js';

export const DEFAULT_PHONE_COUNTRY = (process.env.DEFAULT_PHONE_COUNTRY || 'AE') as CountryCode;

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

export function normalizePhoneToE164Digits(
  phone: string,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY,
): string {
  const parsed = parsePhone(phone, defaultCountry);
  if (parsed) return parsed.number.slice(1);
  return phone.replace(/\D/g, '');
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
