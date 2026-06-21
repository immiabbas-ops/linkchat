'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Avatar } from '@/components/ui/Avatar';
import { QrContactCard } from '@/components/contacts/QrContactCard';
import { useAuthStore } from '@/store/auth-store';
import { useThemeStore } from '@/store/theme-store';
import { api } from '@/lib/api';
import { formatUsername, isValidUsername, normalizeUsername, usernameHint } from '@/lib/username';
import type { User } from '@/types';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const { setTheme } = useThemeStore();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [locale, setLocale] = useState('en');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.profile) return;
    setDisplayName(user.profile.displayName || '');
    setUsername(user.profile.username || '');
    setPhone(user.profile.phone || '');
    setBio(user.profile.bio || '');
    setAvatarUrl(user.profile.avatarUrl || '');
    setLocale(user.profile.locale || 'en');
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    const normalizedUsername = normalizeUsername(username);
    if (normalizedUsername && !isValidUsername(normalizedUsername)) {
      setError('Choose a valid username. ' + usernameHint());
      setSaving(false);
      return;
    }

    try {
      const updated = await api.patch<User>('/users/me', {
        displayName,
        username: normalizedUsername || undefined,
        phone,
        bio,
        avatarUrl: avatarUrl || undefined,
        locale,
        theme: user?.profile?.theme,
      });

      updateUser(updated);
      if (updated.profile?.theme) setTheme(updated.profile.theme as 'dark' | 'light');
      setMessage('Profile saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard>
      <div className="flex h-full flex-col bg-[var(--list-bg)]">
        <header className="safe-top flex items-center gap-3 bg-[var(--list-bg)] px-2 py-3">
          <Link href="/settings" className="rounded-full p-2 text-[var(--text-primary)] hover:bg-black/[0.05]">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-[19px] font-normal text-[var(--text-primary)]">Profile</h1>
        </header>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="flex flex-col items-center bg-[var(--bg-panel)] py-8">
            <Avatar src={avatarUrl || user?.profile?.avatarUrl} name={displayName} size="xl" />
            {user?.profile?.username && (
              <p className="mt-2 text-sm font-medium text-[var(--accent-dark)]">
                {formatUsername(user.profile.username)}
              </p>
            )}
          </div>

          <div className="mt-2 bg-[var(--list-bg)]">
            <label className="block border-b border-[var(--border-glass)] px-4 py-3">
              <span className="text-xs text-[var(--accent-dark)]">Name</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="mt-1 w-full bg-transparent text-[17px] text-[var(--text-primary)] focus:outline-none"
              />
            </label>
            <label className="block border-b border-[var(--border-glass)] px-4 py-3">
              <span className="text-xs text-[var(--accent-dark)]">Username</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                placeholder="johndoe"
                className="mt-1 w-full bg-transparent text-[17px] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{usernameHint()}</p>
            </label>
            <label className="block border-b border-[var(--border-glass)] px-4 py-3">
              <span className="text-xs text-[var(--accent-dark)]">About</span>
              <input
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Available"
                className="mt-1 w-full bg-transparent text-[17px] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none"
              />
            </label>
            <label className="block border-b border-[var(--border-glass)] px-4 py-3">
              <span className="text-xs text-[var(--accent-dark)]">Phone</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="mt-1 w-full bg-transparent text-[17px] text-[var(--text-primary)] focus:outline-none"
              />
            </label>
            <label className="block border-b border-[var(--border-glass)] px-4 py-3">
              <span className="text-xs text-[var(--accent-dark)]">Avatar URL</span>
              <input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1 w-full bg-transparent text-[17px] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none"
              />
            </label>
            <div className="flex items-center justify-between border-b border-[var(--border-glass)] px-4 py-3">
              <span className="text-[17px] text-[var(--text-primary)]">Language</span>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="bg-transparent text-[var(--text-secondary)] focus:outline-none"
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>

          <div className="mt-4 px-4">
            <QrContactCard
              compact
              displayName={displayName || user?.profile?.displayName}
              username={username || user?.profile?.username}
              avatarUrl={avatarUrl || user?.profile?.avatarUrl}
            />
          </div>

          {(message || error) && (
            <p className={`px-4 py-3 text-sm ${error ? 'text-[var(--danger)]' : 'text-[var(--accent-dark)]'}`}>
              {error || message}
            </p>
          )}

          <div className="p-4">
            <button
              type="submit"
              disabled={saving}
              className="flex h-12 w-full items-center justify-center rounded-full bg-[var(--accent-dark)] text-[15px] font-medium text-white disabled:opacity-60"
            >
              {saving ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'Save'
              )}
            </button>
          </div>
        </form>
      </div>
    </AuthGuard>
  );
}
