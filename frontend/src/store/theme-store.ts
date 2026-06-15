import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  theme: 'dark' | 'light';
  locale: string;
  setTheme: (theme: 'dark' | 'light') => void;
  setLocale: (locale: string) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      locale: 'en',

      setTheme: (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        document.documentElement.classList.toggle('light', theme === 'light');
        set({ theme });
      },

      setLocale: (locale) => set({ locale }),

      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        get().setTheme(next);
      },
    }),
    {
      name: 'linkchat-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.classList.toggle('dark', state.theme === 'dark');
          document.documentElement.classList.toggle('light', state.theme === 'light');
        }
      },
    },
  ),
);
