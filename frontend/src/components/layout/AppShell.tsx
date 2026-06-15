'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, LayoutGrid, Compass, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/store/chat-store';

const navItems = [
  { href: '/chats', label: 'Chats', icon: MessageCircle },
  { href: '/hub', label: 'Hub', icon: LayoutGrid },
  { href: '/discover', label: 'Discover', icon: Compass },
];

function UnreadBadge({ count, desktop = false }: { count: number; desktop?: boolean }) {
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        'absolute -right-3 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold leading-none text-white',
        desktop && 'md:hidden',
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const inChatRoom = !!pathname.match(/\/chats\/[^/]+$/);
  const hideMobileNav =
    pathname.startsWith('/auth') || pathname.startsWith('/settings') || inChatRoom;
  const hideDesktopSidebar = pathname.startsWith('/auth');
  const totalUnread = useChatStore((s) =>
    s.chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0),
  );

  return (
    <div className="flex h-screen flex-col bg-[var(--list-bg)]">
      <main
        className={cn(
          'flex-1 overflow-hidden',
          !hideMobileNav && 'pb-[80px]',
          !hideDesktopSidebar && 'md:pl-[72px]',
        )}
      >
        {children}
      </main>

      {!hideMobileNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--nav-bg)] safe-bottom md:hidden">
          <div className="flex items-end justify-around px-2 pb-2 pt-1">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              const badgeCount = item.href === '/chats' ? totalUnread : 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-w-[72px] flex-1 flex-col items-center gap-0.5"
                >
                  <span
                    className={cn(
                      'relative flex h-8 min-w-[56px] items-center justify-center rounded-full px-5 transition-colors',
                      isActive && 'bg-[var(--nav-active-pill)]',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-6 w-6',
                        isActive ? 'text-[var(--accent-dark)]' : 'text-[var(--text-secondary)]',
                      )}
                      strokeWidth={isActive ? 2.25 : 1.75}
                    />
                    <UnreadBadge count={badgeCount} />
                  </span>
                  <span
                    className={cn(
                      'text-[12px] leading-tight',
                      isActive
                        ? 'font-medium text-[var(--accent-dark)]'
                        : 'text-[var(--text-secondary)]',
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {!hideDesktopSidebar && (
        <aside className="fixed left-0 top-0 z-40 hidden h-full w-[72px] flex-col border-r border-[var(--border-glass)] bg-[var(--list-bg)] py-3 md:flex">
          <div className="flex flex-1 flex-col items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                pathname.startsWith(item.href) ||
                (item.href === '/chats' && inChatRoom);
              const Icon = item.icon;
              const badgeCount = item.href === '/chats' ? totalUnread : 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={cn(
                    'relative flex h-12 w-12 items-center justify-center rounded-xl transition-colors',
                    isActive
                      ? 'bg-[var(--nav-active-pill)] text-[var(--accent-dark)]'
                      : 'text-[var(--text-secondary)] hover:bg-black/[0.04]',
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <UnreadBadge count={badgeCount} desktop />
                </Link>
              );
            })}
          </div>
          <Link
            href="/settings"
            title="Settings"
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl transition-colors',
              pathname.startsWith('/settings')
                ? 'bg-[var(--nav-active-pill)] text-[var(--accent-dark)]'
                : 'text-[var(--text-secondary)] hover:bg-black/[0.04]',
            )}
          >
            <Settings className="h-5 w-5" />
          </Link>
        </aside>
      )}
    </div>
  );
}
