import { create } from 'zustand';
import { api } from '@/lib/api';
import { getDeviceId } from '@/lib/utils';

export interface SimActivation {
  phone: string;
  carrier?: string | null;
  status: string;
  provider: string;
  receiveEnabled: boolean;
  sendEnabled: boolean;
  activatedAt?: string;
}

interface SimState {
  loading: boolean;
  activated: boolean;
  activation: SimActivation | null;
  fetchStatus: () => Promise<void>;
  requestActivation: (phone: string, carrier?: string) => Promise<void>;
  verifyActivation: (phone: string, code: string) => Promise<void>;
  updateSettings: (patch: { receiveEnabled?: boolean; sendEnabled?: boolean }) => Promise<void>;
  deactivate: () => Promise<void>;
  sendSms: (to: string, body: string) => Promise<{ chatId: string }>;
}

export const useSimStore = create<SimState>((set, get) => ({
  loading: false,
  activated: false,
  activation: null,

  fetchStatus: async () => {
    set({ loading: true });
    try {
      const result = await api.get<{
        activated: boolean;
        activation?: SimActivation;
      }>('/sim/status');
      set({
        activated: result.activated,
        activation: result.activation || null,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  requestActivation: async (phone, carrier) => {
    await api.post('/sim/request-activation', { phone, carrier });
  },

  verifyActivation: async (phone, code) => {
    await api.post('/sim/verify', { phone, code, deviceId: getDeviceId() });
    await get().fetchStatus();
  },

  updateSettings: async (patch) => {
    await api.patch('/sim/settings', patch);
    await get().fetchStatus();
  },

  deactivate: async () => {
    await api.post('/sim/deactivate');
    set({ activated: false, activation: null });
  },

  sendSms: async (to, body) => {
    const result = await api.post<{ chatId: string }>('/sim/send', { to, body });
    return { chatId: result.chatId };
  },
}));
