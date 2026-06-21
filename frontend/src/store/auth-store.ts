import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket-client';
import { getDeviceId } from '@/lib/utils';
import type { User } from '@/types';

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  checkPhone: (phone: string) => Promise<{ registered: boolean }>;
  loginWithPhone: (phone: string, code: string) => Promise<void>;
  registerWithPhone: (phone: string, displayName: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (user: User) => void;
}

async function persistSession(result: AuthResponse) {
  localStorage.setItem('linkchat_access_token', result.accessToken);
  localStorage.setItem('linkchat_refresh_token', result.refreshToken);
  await connectSocket(result.accessToken);
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,

      checkPhone: async (phone) => {
        return api.post<{ registered: boolean }>('/auth/phone/check', { phone });
      },

      loginWithPhone: async (phone, code) => {
        const result = await api.post<AuthResponse>('/auth/phone/login', {
          phone,
          code,
          deviceId: getDeviceId(),
          deviceName: navigator.userAgent.slice(0, 50),
        });

        set({
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          isAuthenticated: true,
        });

        await persistSession(result);
        const { ensureE2eeReady } = await import('@/lib/e2ee');
        void ensureE2eeReady();
      },

      registerWithPhone: async (phone, displayName, code) => {
        const result = await api.post<AuthResponse>('/auth/phone/register', {
          phone,
          displayName,
          code,
          deviceId: getDeviceId(),
          deviceName: navigator.userAgent.slice(0, 50),
        });

        set({
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          isAuthenticated: true,
        });

        await persistSession(result);
        const { ensureE2eeReady } = await import('@/lib/e2ee');
        void ensureE2eeReady();
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch {
          /* ignore */
        }
        disconnectSocket();
        localStorage.removeItem('linkchat_access_token');
        localStorage.removeItem('linkchat_refresh_token');
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      logoutAll: async () => {
        await api.post('/auth/logout-all');
        await get().logout();
      },

      checkAuth: async () => {
        const token = localStorage.getItem('linkchat_access_token');
        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        try {
          const user = await api.get<User>('/users/me');
          set({ user, accessToken: token, isAuthenticated: true, isLoading: false });
          void connectSocket(token);
          const { ensureE2eeReady } = await import('@/lib/e2ee');
          void ensureE2eeReady();
        } catch {
          localStorage.removeItem('linkchat_access_token');
          localStorage.removeItem('linkchat_refresh_token');
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isLoading: false });
        }
      },

      updateUser: (user) => set({ user }),
    }),
    {
      name: 'linkchat-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
