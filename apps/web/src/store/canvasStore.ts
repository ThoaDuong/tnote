import { create } from 'zustand';
import type { IStroke } from '@note-app/shared';


interface CanvasState {
  strokes: IStroke[];
  redoStack: IStroke[];
  currentTool: 'pen' | 'eraser';
  currentColor: string;
  currentSize: number;
  setTool: (tool: 'pen' | 'eraser') => void;
  setColor: (color: string) => void;
  setSize: (size: number) => void;
  addStroke: (stroke: IStroke) => void;
  removeStroke: (index: number) => void;
  removeStrokes: (indices: number[]) => void;
  undo: () => void;
  redo: () => void;
  loadStrokes: (strokes: IStroke[]) => void;
  clearAll: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  strokes: [],
  redoStack: [],
  currentTool: 'pen',
  currentColor: '#2D2A26',
  currentSize: 3,

  setTool: (tool) => set({ currentTool: tool }),
  setColor: (color) => set({ currentColor: color, currentTool: 'pen' }),
  setSize: (size) => set({ currentSize: size }),

  addStroke: (stroke) =>
    set((s) => ({ strokes: [...s.strokes, stroke], redoStack: [] })),

  removeStroke: (index) =>
    set((s) => {
      const newStrokes = [...s.strokes];
      const removed = newStrokes.splice(index, 1);
      return { strokes: newStrokes, redoStack: [...s.redoStack, ...removed] };
    }),

  removeStrokes: (indices) =>
    set((s) => {
      const sortedIndices = [...new Set(indices)].sort((a, b) => b - a);
      const newStrokes = [...s.strokes];
      const removed: IStroke[] = [];
      for (const idx of sortedIndices) {
        if (idx >= 0 && idx < newStrokes.length) {
          removed.push(...newStrokes.splice(idx, 1));
        }
      }
      return { strokes: newStrokes, redoStack: [...s.redoStack, ...removed] };
    }),

  undo: () =>
    set((s) => {
      if (s.strokes.length === 0) return s;
      const newStrokes = [...s.strokes];
      const last = newStrokes.pop()!;
      return { strokes: newStrokes, redoStack: [...s.redoStack, last] };
    }),

  redo: () =>
    set((s) => {
      if (s.redoStack.length === 0) return s;
      const newRedo = [...s.redoStack];
      const last = newRedo.pop()!;
      return { strokes: [...s.strokes, last], redoStack: newRedo };
    }),

  loadStrokes: (strokes) => set({ strokes, redoStack: [] }),
  clearAll: () => set({ strokes: [], redoStack: [] }),
}));
