import { create } from 'zustand';
import type { INote, CreateNoteDto, UpdateNoteDto } from '@note-app/shared';
import { notesApi } from '../services/api';

interface NoteState {
  notes: INote[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  fetchNotes: (folderId?: string | null) => Promise<void>;
  createNote: (data: CreateNoteDto) => Promise<INote>;
  updateNote: (id: string, data: UpdateNoteDto) => Promise<INote>;
  deleteNote: (id: string) => Promise<void>;
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  isLoading: false,
  searchQuery: '',

  setSearchQuery: (q) => set({ searchQuery: q }),

  fetchNotes: async (folderId) => {
    set({ isLoading: true });
    try {
      const params: any = {};
      if (folderId) params.folderId = folderId;
      const q = get().searchQuery;
      if (q) params.search = q;
      const notes = await notesApi.getAll(params);
      set({ notes, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createNote: async (data) => {
    const note = await notesApi.create(data);
    set((s) => ({ notes: [note, ...s.notes] }));
    return note;
  },

  updateNote: async (id, data) => {
    const note = await notesApi.update(id, data);
    set((s) => ({
      notes: s.notes.map((n) => (n._id === id ? { ...n, ...note } : n)),
    }));
    return note;
  },

  deleteNote: async (id) => {
    await notesApi.delete(id);
    set((s) => ({ notes: s.notes.filter((n) => n._id !== id) }));
  },
}));
