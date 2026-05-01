import axios from 'axios';
import type { IUser, IFolder, INote, CreateFolderDto, UpdateFolderDto, CreateNoteDto, UpdateNoteDto } from '@note-app/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const authApi = {
  getGoogleLoginUrl: () => `${API_URL}/auth/google`,
  getMe: () => api.get<IUser>('/auth/me').then(r => r.data),
};

// Folders
export const foldersApi = {
  getAll: () => api.get<IFolder[]>('/folders').then(r => r.data),
  create: (data: CreateFolderDto) => api.post<IFolder>('/folders', data).then(r => r.data),
  update: (id: string, data: UpdateFolderDto) => api.patch<IFolder>(`/folders/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/folders/${id}`),
};

// Notes
export const notesApi = {
  getAll: (params?: { folderId?: string; search?: string }) =>
    api.get<INote[]>('/notes', { params }).then(r => r.data),
  getById: (id: string) => api.get<INote>(`/notes/${id}`).then(r => r.data),
  getPublicById: (id: string) => api.get<INote>(`/public/notes/${id}`).then(r => r.data),
  create: (data: CreateNoteDto) => api.post<INote>('/notes', data).then(r => r.data),
  update: (id: string, data: UpdateNoteDto) => api.patch<INote>(`/notes/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/notes/${id}`),
};
