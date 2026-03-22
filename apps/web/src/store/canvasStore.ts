import { create } from 'zustand';
import type { IStroke, ToolType, ShapeType } from '@note-app/shared';

interface SelectionState {
  pageIndex: number;
  rect: { x: number; y: number; width: number; height: number };
  strokeIndices: number[];
}

interface CanvasState {
  // Strokes
  strokes: IStroke[];
  redoStack: IStroke[];
  pageCount: number;

  // Tool state
  currentTool: ToolType | 'select';
  previousTool: ToolType | 'select';

  // Pen
  penColor: string;
  penSize: number;

  // Highlight
  highlightColor: string;
  highlightSize: number;

  // Eraser
  eraserSize: number;
  eraserAutoSwitch: boolean;

  // Shape
  shapeType: ShapeType;
  shapeColor: string;
  shapeSize: number;

  // Selection
  selection: SelectionState | null;

  // Actions — Tool
  setTool: (tool: ToolType | 'select') => void;
  switchBackToPrevious: () => void;

  // Actions — Pen
  setPenColor: (color: string) => void;
  setPenSize: (size: number) => void;

  // Actions — Highlight
  setHighlightColor: (color: string) => void;
  setHighlightSize: (size: number) => void;

  // Actions — Eraser
  setEraserSize: (size: number) => void;
  setEraserAutoSwitch: (on: boolean) => void;

  // Actions — Shape
  setShapeType: (type: ShapeType) => void;
  setShapeColor: (color: string) => void;
  setShapeSize: (size: number) => void;

  // Actions — Selection
  setSelection: (selection: SelectionState | null) => void;
  moveSelectedStrokes: (dx: number, dy: number) => void;
  duplicateSelectedStrokes: () => void;
  deleteSelectedStrokes: () => void;
  resizeSelectedStrokes: (scaleX: number, scaleY: number, originX: number, originY: number) => void;

  // Actions — Strokes
  addStroke: (stroke: IStroke) => void;
  removeStroke: (index: number) => void;
  removeStrokes: (indices: number[]) => void;
  undo: () => void;
  redo: () => void;
  loadStrokes: (strokes: IStroke[]) => void;
  clearAll: () => void;

  // Actions — Pages
  addPage: () => void;
  setPageCount: (count: number) => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  strokes: [],
  redoStack: [],
  pageCount: 2,

  currentTool: 'pen',
  previousTool: 'pen',

  penColor: '#2D2A26',
  penSize: 3,

  highlightColor: '#FFEB3B',
  highlightSize: 16,

  eraserSize: 10,
  eraserAutoSwitch: true,

  shapeType: 'rectangle',
  shapeColor: '#2D2A26',
  shapeSize: 2,

  selection: null,

  // Tool
  setTool: (tool) => set((s) => ({
    previousTool: s.currentTool,
    currentTool: tool,
    selection: tool !== 'select' ? null : s.selection,
  })),
  switchBackToPrevious: () => set((s) => ({
    currentTool: s.previousTool !== 'eraser' ? s.previousTool : 'pen',
  })),

  // Pen
  setPenColor: (color) => set({ penColor: color }),
  setPenSize: (size) => set({ penSize: size }),

  // Highlight
  setHighlightColor: (color) => set({ highlightColor: color }),
  setHighlightSize: (size) => set({ highlightSize: size }),

  // Eraser
  setEraserSize: (size) => set({ eraserSize: size }),
  setEraserAutoSwitch: (on) => set({ eraserAutoSwitch: on }),

  // Shape
  setShapeType: (type) => set({ shapeType: type }),
  setShapeColor: (color) => set({ shapeColor: color }),
  setShapeSize: (size) => set({ shapeSize: size }),

  // Selection
  setSelection: (selection) => set({ selection }),

  moveSelectedStrokes: (dx, dy) => set((s) => {
    if (!s.selection) return s;
    const newStrokes = [...s.strokes];
    for (const idx of s.selection.strokeIndices) {
      const stroke = { ...newStrokes[idx] };
      stroke.points = stroke.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
      if (stroke.boundingBox) {
        stroke.boundingBox = {
          ...stroke.boundingBox,
          x: stroke.boundingBox.x + dx,
          y: stroke.boundingBox.y + dy,
        };
      }
      newStrokes[idx] = stroke;
    }
    const newRect = { ...s.selection.rect, x: s.selection.rect.x + dx, y: s.selection.rect.y + dy };
    return { strokes: newStrokes, selection: { ...s.selection, rect: newRect } };
  }),

  duplicateSelectedStrokes: () => set((s) => {
    if (!s.selection) return s;
    const offset = 20;
    const duplicated: IStroke[] = s.selection.strokeIndices.map((idx) => {
      const stroke = s.strokes[idx];
      return {
        ...stroke,
        points: stroke.points.map((p) => ({ ...p, x: p.x + offset, y: p.y + offset })),
        boundingBox: stroke.boundingBox ? {
          ...stroke.boundingBox,
          x: stroke.boundingBox.x + offset,
          y: stroke.boundingBox.y + offset,
        } : undefined,
      };
    });
    const newStrokes = [...s.strokes, ...duplicated];
    const newIndices = duplicated.map((_, i) => s.strokes.length + i);
    const newRect = { ...s.selection.rect, x: s.selection.rect.x + offset, y: s.selection.rect.y + offset };
    return {
      strokes: newStrokes,
      redoStack: [],
      selection: { ...s.selection, strokeIndices: newIndices, rect: newRect },
    };
  }),

  deleteSelectedStrokes: () => set((s) => {
    if (!s.selection) return s;
    const toDelete = new Set(s.selection.strokeIndices);
    const newStrokes = s.strokes.filter((_, i) => !toDelete.has(i));
    return { strokes: newStrokes, redoStack: [], selection: null };
  }),

  resizeSelectedStrokes: (scaleX, scaleY, originX, originY) => set((s) => {
    if (!s.selection) return s;
    const newStrokes = [...s.strokes];
    for (const idx of s.selection.strokeIndices) {
      const stroke = { ...newStrokes[idx] };
      stroke.points = stroke.points.map((p) => ({
        ...p,
        x: originX + (p.x - originX) * scaleX,
        y: originY + (p.y - originY) * scaleY,
      }));
      if (stroke.boundingBox) {
        stroke.boundingBox = {
          x: originX + (stroke.boundingBox.x - originX) * scaleX,
          y: originY + (stroke.boundingBox.y - originY) * scaleY,
          width: stroke.boundingBox.width * scaleX,
          height: stroke.boundingBox.height * scaleY,
        };
      }
      newStrokes[idx] = stroke;
    }
    const sel = s.selection;
    const newRect = {
      x: originX + (sel.rect.x - originX) * scaleX,
      y: originY + (sel.rect.y - originY) * scaleY,
      width: sel.rect.width * scaleX,
      height: sel.rect.height * scaleY,
    };
    return { strokes: newStrokes, selection: { ...sel, rect: newRect } };
  }),

  // Strokes
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

  loadStrokes: (strokes) => {
    const maxPage = strokes.reduce((max, s) => Math.max(max, s.pageIndex ?? 0), 0);
    set({ strokes, redoStack: [], pageCount: Math.max(2, maxPage + 2) });
  },
  clearAll: () => set({ strokes: [], redoStack: [], pageCount: 2, selection: null }),

  // Pages
  addPage: () => set((s) => ({ pageCount: s.pageCount + 1 })),
  setPageCount: (count) => set({ pageCount: count }),
}));
