import { create } from 'zustand';
import { api } from '@/lib/api';
import type { Contact } from '@/types';

interface ContactStore {
  contacts: Contact[];
  isLoading: boolean;
  fetchContacts: () => Promise<void>;
  addContact: (contactUserId: string, savedName: string, notes?: string) => Promise<Contact>;
  updateContact: (contactUserId: string, data: { savedName?: string; notes?: string }) => Promise<Contact>;
  removeContact: (contactUserId: string) => Promise<void>;
  getByUserId: (userId: string) => Contact | undefined;
}

export const useContactStore = create<ContactStore>((set, get) => ({
  contacts: [],
  isLoading: false,

  fetchContacts: async () => {
    if (typeof window !== 'undefined' && !localStorage.getItem('linkchat_access_token')) {
      return;
    }
    set({ isLoading: true });
    try {
      const contacts = await api.get<Contact[]>('/contacts');
      set({ contacts, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addContact: async (contactUserId, savedName, notes) => {
    const contact = await api.post<Contact>('/contacts', { contactUserId, savedName, notes });
    set((state) => ({
      contacts: [...state.contacts.filter((c) => c.contactUserId !== contactUserId), contact],
    }));
    return contact;
  },

  updateContact: async (contactUserId, data) => {
    const contact = await api.patch<Contact>(`/contacts/${contactUserId}`, data);
    set((state) => ({
      contacts: state.contacts.map((c) => (c.contactUserId === contactUserId ? contact : c)),
    }));
    return contact;
  },

  removeContact: async (contactUserId) => {
    await api.delete(`/contacts/${contactUserId}`);
    set((state) => ({
      contacts: state.contacts.filter((c) => c.contactUserId !== contactUserId),
    }));
  },

  getByUserId: (userId) => get().contacts.find((c) => c.contactUserId === userId),
}));

/** Minimum digits required before searching (full number, no partial matches). */
export const MIN_PHONE_SEARCH_DIGITS = 10;
