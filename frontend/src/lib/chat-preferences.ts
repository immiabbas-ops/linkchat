const DRAFTS_KEY = 'linkchat_drafts';
const WALLPAPER_KEY = 'linkchat_wallpapers';

export type WallpaperId = 'default' | 'nebula' | 'dots' | 'gradient';

export const WALLPAPERS: Record<WallpaperId, string> = {
  default: '',
  nebula:
    'radial-gradient(ellipse 80% 50% at 20% 20%, rgba(124,58,237,0.12), transparent 50%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(6,182,212,0.08), transparent 50%)',
  dots: 'radial-gradient(circle, rgba(124,58,237,0.08) 1px, transparent 1px)',
  gradient: 'linear-gradient(160deg, rgba(91,33,182,0.15) 0%, rgba(6,182,212,0.08) 100%)',
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function getDraft(chatId: string): string {
  const drafts = readJson<Record<string, string>>(DRAFTS_KEY, {});
  return drafts[chatId] || '';
}

export function setDraft(chatId: string, text: string) {
  const drafts = readJson<Record<string, string>>(DRAFTS_KEY, {});
  if (text.trim()) drafts[chatId] = text;
  else delete drafts[chatId];
  writeJson(DRAFTS_KEY, drafts);
}

export function getWallpaper(chatId: string): WallpaperId {
  const all = readJson<Record<string, WallpaperId>>(WALLPAPER_KEY, {});
  return all[chatId] || 'default';
}

export function setWallpaper(chatId: string, id: WallpaperId) {
  const all = readJson<Record<string, WallpaperId>>(WALLPAPER_KEY, {});
  all[chatId] = id;
  writeJson(WALLPAPER_KEY, all);
}

export function wallpaperStyle(chatId: string): { backgroundImage?: string; backgroundSize?: string } {
  const id = getWallpaper(chatId);
  const overlay = WALLPAPERS[id];
  if (!overlay) return {};
  return {
    backgroundImage: overlay,
    backgroundSize: id === 'dots' ? '18px 18px' : undefined,
  };
}

const DISAPPEARING_KEY = 'linkchat_disappearing';

/** Disappearing message timer in seconds. 0 = off. */
export type DisappearingSeconds = 0 | 86400 | 604800 | 7776000;

export const DISAPPEARING_OPTIONS: { value: DisappearingSeconds; label: string }[] = [
  { value: 0, label: 'Off' },
  { value: 86400, label: '24 hours' },
  { value: 604800, label: '7 days' },
  { value: 7776000, label: '90 days' },
];

export function getDisappearingTimer(chatId: string): DisappearingSeconds {
  const all = readJson<Record<string, DisappearingSeconds>>(DISAPPEARING_KEY, {});
  return all[chatId] ?? 0;
}

export function setDisappearingTimer(chatId: string, seconds: DisappearingSeconds) {
  const all = readJson<Record<string, DisappearingSeconds>>(DISAPPEARING_KEY, {});
  if (seconds === 0) delete all[chatId];
  else all[chatId] = seconds;
  writeJson(DISAPPEARING_KEY, all);
}

export function isMessageExpired(chatId: string, createdAt: string): boolean {
  const timer = getDisappearingTimer(chatId);
  if (!timer) return false;
  const age = (Date.now() - new Date(createdAt).getTime()) / 1000;
  return age > timer;
}
