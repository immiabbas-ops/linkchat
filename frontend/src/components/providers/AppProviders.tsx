'use client';

import { useEffect, useLayoutEffect } from 'react';
import { useThemeStore } from '@/store/theme-store';

function applyTheme(theme: 'dark' | 'light') {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.classList.toggle('light', theme === 'light');
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();

  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    applyTheme(useThemeStore.getState().theme);
  }, []);

  return <>{children}</>;
}
