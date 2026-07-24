'use client';

import { create } from 'zustand';

interface AdminState {
  admin: { id: string; name: string; email: string } | null;
  token: string | null;
  hydrated: boolean;
  setSession: (admin: { id: string; name: string; email: string }, token: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  admin: null,
  token: null,
  hydrated: false,

  setSession: (admin, token) => {
    localStorage.setItem('th_ia_admin_token', token);
    localStorage.setItem('th_ia_admin', JSON.stringify(admin));
    set({ admin, token });
  },

  logout: () => {
    localStorage.removeItem('th_ia_admin_token');
    localStorage.removeItem('th_ia_admin');
    set({ admin: null, token: null });
  },

  hydrate: () => {
    const token = localStorage.getItem('th_ia_admin_token');
    const raw = localStorage.getItem('th_ia_admin');
    if (token && raw) {
      set({ admin: JSON.parse(raw), token, hydrated: true });
    } else {
      set({ hydrated: true });
    }
  },
}));
