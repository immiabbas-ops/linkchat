'use client';

import Link from 'next/link';
import {
  Moon,
  Sun,
  Globe,
  Shield,
  Smartphone,
  LogOut,
  ChevronRight,
  Users,
  QrCode,
  Bell,
  Radio,
} from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/auth-store';
import { useThemeStore } from '@/store/theme-store';
import { api } from '@/lib/api';
import { formatPhoneDisplay } from '@/lib/presence';

const settingsSections = [
  {
    title: 'Account',
    items: [
      { label: 'SIM Activation', href: '/settings/sim', icon: Radio },
      { label: 'Family', href: '/settings/family', icon: Users },
      { label: 'Devices', href: '/settings/devices', icon: Smartphone },
      { label: 'QR Login', href: '/settings/qr-login', icon: QrCode },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { label: 'Notifications', href: '/settings/notifications', icon: Bell },
      { label: 'Privacy', href: '/settings/privacy', icon: Shield },
    ],
  },
];

export default function SettingsPage() {
  const { user, logout, logoutAll, updateUser } = useAuthStore();
  const { theme, toggleTheme, setTheme } = useThemeStore();
  const locale = user?.profile?.locale || 'en';

  const savePreference = async (patch: { theme?: string; locale?: string }) => {
    try {
      const updated = await api.patch<typeof user>('/users/me', patch);
      if (updated) updateUser(updated);
      if (patch.theme) setTheme(patch.theme as 'dark' | 'light');
    } catch {
      /* ignore */
    }
  };

  return (
    <AuthGuard>
      <div className="flex h-full flex-col bg-[var(--list-bg)]">
        <header className="safe-top flex items-center gap-3 bg-[var(--list-bg)] px-2 py-3">
          <Link
            href="/chats"
            className="rounded-full p-2 text-[var(--text-primary)] hover:bg-black/[0.05] md:hidden"
          >
            <ChevronRight className="h-6 w-6 rotate-180" />
          </Link>
          <h1 className="text-[19px] font-normal text-[var(--text-primary)]">Settings</h1>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <Link
            href="/settings/profile"
            className="flex items-center gap-4 bg-[var(--list-bg)] px-4 py-6 hover:bg-black/[0.03]"
          >
            <Avatar
              src={user?.profile?.avatarUrl}
              name={user?.profile?.displayName}
              size="xl"
            />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-normal text-[var(--text-primary)]">
                {user?.profile?.displayName}
              </h2>
              {user?.profile?.phone && (
                <p className="truncate text-sm text-[var(--text-secondary)]">
                  {formatPhoneDisplay(user.profile.phone)}
                </p>
              )}
              {user?.email && (
                <p className="truncate text-sm text-[var(--text-secondary)]">{user.email}</p>
              )}
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-[var(--text-secondary)]" />
          </Link>

          <div className="mt-1 bg-[var(--bg-panel)]">
            <button
              type="button"
              onClick={() => {
                const next = theme === 'dark' ? 'light' : 'dark';
                toggleTheme();
                savePreference({ theme: next });
              }}
              className="flex w-full items-center justify-between border-b border-[var(--border-glass)] bg-[var(--list-bg)] px-4 py-4 hover:bg-black/[0.03]"
            >
              <div className="flex items-center gap-4">
                {theme === 'dark' ? (
                  <Moon className="h-5 w-5 text-[var(--accent-dark)]" />
                ) : (
                  <Sun className="h-5 w-5 text-[var(--accent-dark)]" />
                )}
                <span className="text-[var(--text-primary)]">Theme</span>
              </div>
              <span className="text-sm capitalize text-[var(--text-secondary)]">{theme}</span>
            </button>

            <div className="flex items-center justify-between border-b border-[var(--border-glass)] bg-[var(--list-bg)] px-4 py-4">
              <div className="flex items-center gap-4">
                <Globe className="h-5 w-5 text-[var(--accent-dark)]" />
                <span className="text-[var(--text-primary)]">Language</span>
              </div>
              <select
                value={locale}
                onChange={(e) => savePreference({ locale: e.target.value })}
                className="bg-transparent text-sm text-[var(--text-secondary)] focus:outline-none"
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>

          {settingsSections.map((section) => (
            <div key={section.title} className="mt-2">
              <h3 className="px-4 py-2 text-xs font-medium uppercase tracking-wide text-[var(--accent-dark)]">
                {section.title}
              </h3>
              <div className="bg-[var(--list-bg)]">
                {section.items.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between bg-[var(--list-bg)] px-4 py-4 hover:bg-black/[0.03] ${
                        i > 0 ? 'border-t border-[var(--border-glass)]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <Icon className="h-5 w-5 text-[var(--accent-dark)]" />
                        <span className="text-[var(--text-primary)]">{item.label}</span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-[var(--text-secondary)]" />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="mt-2 bg-[var(--list-bg)]">
            <button
              type="button"
              onClick={() => logout()}
              className="flex w-full items-center gap-4 border-b border-[var(--border-glass)] px-4 py-4 text-[var(--danger)] hover:bg-black/[0.03]"
            >
              <LogOut className="h-5 w-5" />
              <span>Log out</span>
            </button>
            <button
              type="button"
              onClick={() => logoutAll()}
              className="flex w-full items-center gap-4 px-4 py-4 text-[var(--danger)] hover:bg-black/[0.03]"
            >
              <LogOut className="h-5 w-5" />
              <span>Log out all devices</span>
            </button>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
