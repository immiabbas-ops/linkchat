const RESERVED = new Set(['admin', 'support', 'help', 'linkchat', 'official', 'system']);

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase().replace(/^@/, '');
}

export function isValidUsername(username: string): boolean {
  if (username.length < 3 || username.length > 30) return false;
  if (!/^[a-z][a-z0-9_]*$/.test(username)) return false;
  return !RESERVED.has(username);
}

export function formatUsername(username?: string | null): string {
  if (!username) return '';
  return `@${username}`;
}

export function usernameHint(): string {
  return '3–30 characters · letters, numbers, underscore · starts with a letter';
}
