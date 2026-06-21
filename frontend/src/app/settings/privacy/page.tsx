'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera, Eye, Shield } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api';
import type { User, UserSettings } from '@/types';

export default function PrivacyPage() {
  const { user, updateUser } = useAuthStore();
  const [settings, setSettings] = useState<UserSettings>({
    readReceipts: true,
    lastSeenVisible: true,
    screenshotAlerts: true,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const me = await api.get<User>('/users/me');
        updateUser(me);
        if (me.settings) setSettings((prev) => ({ ...prev, ...me.settings }));
      } catch {
        /* use defaults */
      }
    })();
  }, [updateUser]);

  useEffect(() => {
    if (user?.settings) setSettings((prev) => ({ ...prev, ...user.settings }));
  }, [user?.settings]);

  const toggle = async (key: keyof UserSettings) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    setSaving(true);
    setMessage('');
    try {
      await api.patch('/users/settings', { [key]: next[key] });
      setMessage('Saved');
    } catch {
      setSettings(settings);
      setMessage('Could not save');
    } finally {
      setSaving(false);
    }
  };

  const items = [
    {
      key: 'readReceipts' as const,
      icon: Eye,
      title: 'Read receipts',
      description: 'Let others know when you have read their messages',
    },
    {
      key: 'lastSeenVisible' as const,
      icon: Shield,
      title: 'Last seen',
      description: 'Show when you were last online',
    },
    {
      key: 'screenshotAlerts' as const,
      icon: Camera,
      title: 'Screenshot notifications',
      description: 'Get notified when someone takes a screenshot in your chats (like Snapchat)',
    },
  ];

  return (
    <AuthGuard>
      <div className="flex h-full flex-col bg-[var(--list-bg)]">
        <header className="safe-top flex items-center gap-3 border-b border-[var(--border-glass)] px-4 py-4">
          <Link href="/settings" className="rounded-full p-2 hover:bg-black/[0.05]">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Privacy</h1>
            <p className="text-xs text-[var(--text-secondary)]">Control visibility and alerts</p>
          </div>
        </header>

        <div className="space-y-3 p-4">
          {items.map((item) => {
            const Icon = item.icon;
            const enabled = !!settings[item.key];
            return (
              <button
                key={item.key}
                type="button"
                disabled={saving}
                onClick={() => void toggle(item.key)}
                className="flex w-full items-start gap-4 rounded-2xl bg-[var(--bg-panel)] px-4 py-4 text-left ring-1 ring-[var(--border-glass)] transition hover:bg-black/[0.02] disabled:opacity-60"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/12">
                  <Icon className="h-5 w-5 text-[var(--accent-dark)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--text-primary)]">{item.title}</p>
                  <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{item.description}</p>
                </div>
                <div
                  className={`mt-1 h-7 w-12 shrink-0 rounded-full p-0.5 transition ${
                    enabled ? 'bg-[var(--accent)]' : 'bg-[var(--search-bg)]'
                  }`}
                >
                  <div
                    className={`h-6 w-6 rounded-full bg-white shadow transition ${
                      enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {message && <p className="px-4 text-sm text-[var(--accent-dark)]">{message}</p>}

        <p className="px-4 pb-6 text-xs leading-relaxed text-[var(--text-secondary)]">
          Screenshot detection works best on desktop (Print Screen) and may vary by device. Your chat partner is
          notified in real time when a screenshot is detected.
        </p>
      </div>
    </AuthGuard>
  );
}
