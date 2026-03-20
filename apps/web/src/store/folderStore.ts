import { create } from 'zustand';
import type { IFolder } from '@note-app/shared';
import { foldersApi } from '../services/api';

interface FolderState {
  folders: IFolder[];
  activeFolderId: string | null;
  isLoading: boolean;
  setActiveFolderId: (id: string | null) => void;
  fetchFolders: () => Promise<void>;
  createFolder: (name: string, color?: string) => Promise<IFolder>;
  updateFolder: (id: string, data: { name?: string; color?: string }) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
}

export const useFolderStore = create<FolderState>((set, get) => ({
  folders: [],
  activeFolderId: null,
  isLoading: false,

  setActiveFolderId: (id) => set({ activeFolderId: id }),

  fetchFolders: async () => {
    set({ isLoading: true });
    try {
      const folders = await foldersApi.getAll();
      set({ folders, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createFolder: async (name, color) => {
    const folder = await foldersApi.create({ name, color });
    set((s) => ({ folders: [folder, ...s.folders] }));
    return folder;
  },

  updateFolder: async (id, data) => {
    const updated = await foldersApi.update(id, data);
    set((s) => ({
      folders: s.folders.map((f) => (f._id === id ? updated : f)),
    }));
  },

  deleteFolder: async (id) => {
    await foldersApi.delete(id);
    set((s) => ({
      folders: s.folders.filter((f) => f._id !== id),
      activeFolderId: s.activeFolderId === id ? null : s.activeFolderId,
    }));
  },
}));
