import { create } from 'zustand';
import type { IUser } from '@note-app/shared';
import { authApi, usersApi } from '../services/api';

interface AuthState {
  user: IUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  fetchUser: () => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  updateQuickNote: (noteId: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: true,
  isAuthenticated: false,

  setToken: (token: string) => {
    localStorage.setItem('token', token);
    document.cookie = `token=${token}; path=/; max-age=2592000; samesite=Lax`;
    set({ token, isAuthenticated: true });
  },

  fetchUser: async () => {
    try {
      const user = await authApi.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      localStorage.removeItem('token');
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    set({ user: null, token: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = get().token;
    if (!token) {
      set({ isLoading: false });
      return;
    }
    // Ensure cookie exists for Chrome extension to read
    document.cookie = `token=${token}; path=/; max-age=2592000; samesite=Lax`;
    await get().fetchUser();
  },

  updateQuickNote: async (noteId: string) => {
    try {
      const user = await usersApi.setQuickNote(noteId);
      set({ user });
    } catch (err) {
      console.error('Failed to update quick note:', err);
      throw err;
    }
  },
}));
