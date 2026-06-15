import { create } from 'zustand';
import { api } from '@/lib/api';
import type { ChatConnector, ConnectorType } from '@/types';

interface ConnectorStore {
  connectors: ChatConnector[];
  isLoading: boolean;
  fetchConnectors: () => Promise<void>;
  addConnector: (data: {
    type: ConnectorType;
    label: string;
    identifier?: string;
    config?: Record<string, unknown>;
  }) => Promise<void>;
  removeConnector: (id: string) => Promise<void>;
}

export const useConnectorStore = create<ConnectorStore>((set, get) => ({
  connectors: [],
  isLoading: false,

  fetchConnectors: async () => {
    set({ isLoading: true });
    try {
      const connectors = await api.get<ChatConnector[]>('/connectors');
      set({ connectors });
    } catch {
      set({ connectors: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  addConnector: async (data) => {
    const connector = await api.post<ChatConnector>('/connectors', data);
    set({ connectors: [...get().connectors, connector] });
  },

  removeConnector: async (id) => {
    await api.delete(`/connectors/${id}`);
    set({ connectors: get().connectors.filter((c) => c.id !== id) });
  },
}));
