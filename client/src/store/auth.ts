import { create } from 'zustand';
import { User } from '../types';
import api from '../lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('kraft_token'),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('kraft_token', data.token);
      set({ user: data.user, token: data.token, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('kraft_token');
    set({ user: null, token: null });
  },

  fetchMe: async () => {
    const token = localStorage.getItem('kraft_token');
    if (!token) return;
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data });
    } catch {
      localStorage.removeItem('kraft_token');
      set({ user: null, token: null });
    }
  },
}));
