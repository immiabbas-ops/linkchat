const RESERVED_USERNAMES = new Set([
  'admin',
  'support',
  'help',
  'linkchat',
  'system',
  'official',
  'null',
  'undefined',
  'me',
  'you',
]);

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase().replace(/^@/, '');
}

export function isValidUsername(username: string): boolean {
  if (username.length < 3 || username.length > 30) return false;
  if (!/^[a-z][a-z0-9_]*$/.test(username)) return false;
  if (RESERVED_USERNAMES.has(username)) return false;
  return true;
}

export function slugifyDisplayName(displayName: string): string {
  return displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .slice(0, 24);
}

export async function generateUniqueUsername(
  displayName: string,
  isTaken: (username: string) => Promise<boolean>,
): Promise<string> {
  const base = slugifyDisplayName(displayName) || 'user';
  const safeBase = isValidUsername(base) ? base : `user_${base.replace(/[^a-z0-9]/g, '').slice(0, 20)}`;

  for (let i = 0; i < 100; i++) {
    const candidate = i === 0 ? safeBase : `${safeBase}_${i}`;
    if (!isValidUsername(candidate)) continue;
    if (!(await isTaken(candidate))) return candidate;
  }

  return `user_${Date.now().toString(36).slice(-8)}`;
}
