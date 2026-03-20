export interface IPoint {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

export interface IStroke {
  points: IPoint[];
  color: string;
  size: number;
  tool: 'pen' | 'eraser';
}

export interface IUser {
  _id: string;
  googleId: string;
  email: string;
  displayName: string;
  avatar: string;
  createdAt: string;
}

export interface IFolder {
  _id: string;
  name: string;
  color: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export type NoteType = 'text' | 'handwriting';

export interface INote {
  _id: string;
  title: string;
  type: NoteType;
  folderId: string;
  userId: string;

  // Text note
  textContent?: string;

  // Handwriting note
  strokes?: IStroke[];
  thumbnail?: string;
  canvasWidth?: number;
  canvasHeight?: number;

  createdAt: string;
  updatedAt: string;
}

export interface CreateFolderDto {
  name: string;
  color?: string;
}

export interface UpdateFolderDto {
  name?: string;
  color?: string;
}

export interface CreateNoteDto {
  title: string;
  type: NoteType;
  folderId: string;
  textContent?: string;
  strokes?: IStroke[];
  thumbnail?: string;
  canvasWidth?: number;
  canvasHeight?: number;
}

export interface UpdateNoteDto {
  title?: string;
  textContent?: string;
  strokes?: IStroke[];
  thumbnail?: string;
  canvasWidth?: number;
  canvasHeight?: number;
}
