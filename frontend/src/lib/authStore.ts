'use client';

import { create } from 'zustand';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  plan: 'FREE' | 'PREMIUM';
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  hydrated: boolean;
  setSession: (user: AuthUser, token: string) => void;
  updatePlan: (plan: 'FREE' | 'PREMIUM') => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  hydrated: false,

  setSession: (user, token) => {
    localStorage.setItem('th_ia_token', token);
    localStorage.setItem('th_ia_user', JSON.stringify(user));
    set({ user, token });
  },

  updatePlan: (plan) =>
    set((state) => {
      if (!state.user) return state;
      const updated = { ...state.user, plan };
      localStorage.setItem('th_ia_user', JSON.stringify(updated));
      return { user: updated };
    }),

  logout: () => {
    localStorage.removeItem('th_ia_token');
    localStorage.removeItem('th_ia_user');
    set({ user: null, token: null });
  },

  hydrate: () => {
    const token = localStorage.getItem('th_ia_token');
    const userRaw = localStorage.getItem('th_ia_user');
    if (token && userRaw) {
      set({ user: JSON.parse(userRaw), token, hydrated: true });
    } else {
      set({ hydrated: true });
    }
  },
}));
