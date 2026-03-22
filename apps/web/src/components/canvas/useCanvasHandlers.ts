import { useRef, useEffect, useCallback, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { IStroke, IPoint } from '@note-app/shared';
import { PAGE_ASPECT_RATIO } from './constants';
import {
  smoothPoint, drawShapeOutline, drawStroke, drawShapeStroke,
  drawEraserCursor, drawSelectionUI, findStrokesAtPoint, findStrokesInRect,
} from './drawingUtils';

interface PageDimensions {
  width: number;
  height: number;
}

export interface CanvasHandlers {
  containerRef: React.RefObject<HTMLDivElement | null>;
  canvasRefs: React.MutableRefObject<Map<number, HTMLCanvasElement>>;
  pageDimensions: PageDimensions;
  showSettings: string | null;
  setShowSettings: (v: string | null) => void;
  setCanvasRef: (pageIdx: number) => (el: HTMLCanvasElement | null) => void;
  handlePointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerUp: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  getCursor: () => string;
}

export function useCanvasHandlers(onStrokesChange?: (strokes: IStroke[]) => void): CanvasHandlers {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const isDrawing = useRef(false);
  const currentPoints = useRef<IPoint[]>([]);
  const activePageIndex = useRef<number>(-1);
  const erasedIndices = useRef<Set<number>>(new Set());
  const lastDrawnIndex = useRef(0);
  const shapeStart = useRef<IPoint | null>(null);
  const selectionDragStart = useRef<{ x: number; y: number } | null>(null);
  const isMovingSelection = useRef(false);

  const [showSettings, setShowSettings] = useState<string | null>(null);
  const [pageDimensions, setPageDimensions] = useState<PageDimensions>({ width: 0, height: 0 });

  const {
    strokes, currentTool, pageCount,
    penColor, penSize,
    highlightColor, highlightSize,
    eraserSize, eraserAutoSwitch,
    shapeType, shapeColor, shapeSize,
    selection,
    switchBackToPrevious,
    setSelection, moveSelectedStrokes,
    addStroke, removeStrokes, addPage,
  } = useCanvasStore();

  // ─── Page Dimensions ────────────────────────────────────────
  const updatePageDimensions = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerWidth = container.clientWidth;
    const pageWidth = Math.min(containerWidth - 48, 800);
    const pageHeight = Math.round(pageWidth * PAGE_ASPECT_RATIO);
    setPageDimensions({ width: pageWidth, height: pageHeight });
  }, []);

  useEffect(() => {
    updatePageDimensions();
    window.addEventListener('resize', updatePageDimensions);
    return () => window.removeEventListener('resize', updatePageDimensions);
  }, [updatePageDimensions]);

  // ─── Canvas Setup & Redraw ──────────────────────────────────
  const redrawPage = useCallback((ctx: CanvasRenderingContext2D, pageIdx: number, skipIndices?: Set<number>) => {
    const { width, height } = pageDimensions;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Paper lines
    ctx.strokeStyle = '#E8E2DA';
    ctx.lineWidth = 0.5;
    const lineSpacing = 32;
    for (let y = lineSpacing; y < height; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    strokes.forEach((stroke, index) => {
      if (stroke.tool === 'eraser') return;
      if ((stroke.pageIndex ?? 0) !== pageIdx) return;
      if (skipIndices?.has(index)) return;
      if (stroke.tool === 'shape') drawShapeStroke(ctx, stroke);
      else drawStroke(ctx, stroke);
    });
  }, [pageDimensions, strokes]);

  const setupCanvas = useCallback((canvas: HTMLCanvasElement, pageIdx: number) => {
    if (!pageDimensions.width) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = pageDimensions.width * dpr;
    canvas.height = pageDimensions.height * dpr;
    canvas.style.width = `${pageDimensions.width}px`;
    canvas.style.height = `${pageDimensions.height}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    redrawPage(ctx, pageIdx);
  }, [pageDimensions, strokes, redrawPage]);

  // ─── Touch Prevention ───────────────────────────────────────
  useEffect(() => {
    const preventTouch = (e: TouchEvent) => { e.preventDefault(); };
    const canvases = canvasRefs.current;
    canvases.forEach((canvas) => {
      canvas.addEventListener('touchstart', preventTouch, { passive: false });
      canvas.addEventListener('touchmove', preventTouch, { passive: false });
      canvas.addEventListener('touchend', preventTouch, { passive: false });
    });
    return () => {
      canvases.forEach((canvas) => {
        canvas.removeEventListener('touchstart', preventTouch);
        canvas.removeEventListener('touchmove', preventTouch);
        canvas.removeEventListener('touchend', preventTouch);
      });
    };
  }, [pageCount]);

  // Redraw all when deps change
  useEffect(() => {
    if (!pageDimensions.width) return;
    canvasRefs.current.forEach((canvas, pageIdx) => {
      setupCanvas(canvas, pageIdx);
    });
  }, [pageDimensions, strokes, pageCount, selection, setupCanvas]);

  // Draw selection overlay
  useEffect(() => {
    if (!selection || !pageDimensions.width) return;
    const canvas = canvasRefs.current.get(selection.pageIndex);
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawSelectionUI(ctx, selection.rect);
  }, [selection, strokes, pageDimensions]);

  // Notify parent of stroke changes
  useEffect(() => {
    onStrokesChange?.(strokes);
  }, [strokes]);

  // ─── Pointer Helpers ────────────────────────────────────────
  const getCanvasPoint = (e: PointerEvent | React.PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement): IPoint => {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, pressure: 0.5, timestamp: Date.now() };
  };

  const getPageIndex = (canvas: HTMLCanvasElement): number => {
    for (const [idx, c] of canvasRefs.current.entries()) {
      if (c === canvas) return idx;
    }
    return 0;
  };

  const getCtx = (pageIdx: number): CanvasRenderingContext2D | null => {
    const canvas = canvasRefs.current.get(pageIdx);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  };

  // ─── Pointer Down ──────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'touch') return;
    e.preventDefault();
    e.stopPropagation();

    const pageIdx = getPageIndex(e.currentTarget);
    const point = getCanvasPoint(e.nativeEvent, e.currentTarget);
    setShowSettings(null);

    // Select tool
    if (currentTool === 'select') {
      e.currentTarget.setPointerCapture(e.pointerId);
      if (selection) {
        const r = selection.rect;
        if (point.x >= r.x && point.x <= r.x + r.width && point.y >= r.y && point.y <= r.y + r.height) {
          isMovingSelection.current = true;
          selectionDragStart.current = { x: point.x, y: point.y };
          return;
        }
        setSelection(null);
      }
      isDrawing.current = true;
      activePageIndex.current = pageIdx;
      selectionDragStart.current = { x: point.x, y: point.y };
      return;
    }

    // Drawing tools
    isDrawing.current = true;
    activePageIndex.current = pageIdx;
    currentPoints.current = [point];
    erasedIndices.current = new Set();
    lastDrawnIndex.current = 0;
    e.currentTarget.setPointerCapture(e.pointerId);

    if (currentTool === 'shape') shapeStart.current = point;
    if (pageIdx === pageCount - 1) addPage();
  };

  // ─── Pointer Move ──────────────────────────────────────────
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'touch') return;

    // Select tool movement
    if (currentTool === 'select' && (isMovingSelection.current || isDrawing.current)) {
      e.preventDefault();
      e.stopPropagation();
      const pageIdx = activePageIndex.current >= 0 ? activePageIndex.current : (selection?.pageIndex ?? 0);
      const canvas = canvasRefs.current.get(pageIdx);
      if (!canvas) return;
      const point = getCanvasPoint(e.nativeEvent, canvas);
      const ctx = getCtx(pageIdx);
      if (!ctx) return;

      if (isMovingSelection.current && selectionDragStart.current) {
        moveSelectedStrokes(point.x - selectionDragStart.current.x, point.y - selectionDragStart.current.y);
        selectionDragStart.current = { x: point.x, y: point.y };
        redrawPage(ctx, pageIdx);
        if (selection) drawSelectionUI(ctx, selection.rect);
      } else if (isDrawing.current && selectionDragStart.current) {
        redrawPage(ctx, pageIdx);
        ctx.save();
        ctx.strokeStyle = '#4A90D9';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.fillStyle = 'rgba(74, 144, 217, 0.08)';
        ctx.beginPath();
        ctx.rect(selectionDragStart.current.x, selectionDragStart.current.y,
          point.x - selectionDragStart.current.x, point.y - selectionDragStart.current.y);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
      return;
    }

    if (!isDrawing.current) return;
    e.preventDefault();
    e.stopPropagation();

    const pageIdx = activePageIndex.current;
    const canvas = canvasRefs.current.get(pageIdx);
    if (!canvas) return;

    const coalescedEvents = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() || [e.nativeEvent];
    const newPoints: IPoint[] = coalescedEvents.map((ce) => getCanvasPoint(ce, canvas));
    const ctx = getCtx(pageIdx);
    if (!ctx) return;

    // Pen / Highlight
    if (currentTool === 'pen' || currentTool === 'highlight') {
      currentPoints.current.push(...newPoints);
      const allPoints = currentPoints.current;
      if (allPoints.length < 2) return;

      const isPen = currentTool === 'pen';
      ctx.save();
      ctx.lineCap = isPen ? 'round' : 'square';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = isPen ? penColor : highlightColor;
      ctx.lineWidth = isPen ? penSize : highlightSize;
      if (!isPen) { ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.35; }

      const drawStart = Math.max(1, lastDrawnIndex.current - 1);
      ctx.beginPath();
      if (drawStart === 1) {
        const s0 = smoothPoint(allPoints, 0);
        ctx.moveTo(s0.x, s0.y);
      } else {
        const sPrev = smoothPoint(allPoints, drawStart - 1);
        const sCurr = smoothPoint(allPoints, drawStart);
        ctx.moveTo((sPrev.x + sCurr.x) / 2, (sPrev.y + sCurr.y) / 2);
      }
      for (let i = drawStart; i < allPoints.length - 1; i++) {
        const sCurr = smoothPoint(allPoints, i);
        const sNext = smoothPoint(allPoints, i + 1);
        ctx.quadraticCurveTo(sCurr.x, sCurr.y, (sCurr.x + sNext.x) / 2, (sCurr.y + sNext.y) / 2);
      }
      ctx.lineTo(smoothPoint(allPoints, allPoints.length - 1).x, smoothPoint(allPoints, allPoints.length - 1).y);
      ctx.stroke();
      ctx.restore();
      lastDrawnIndex.current = allPoints.length - 1;

    // Eraser
    } else if (currentTool === 'eraser') {
      currentPoints.current.push(...newPoints);
      for (const point of newPoints) {
        findStrokesAtPoint(strokes, point, eraserSize * 2, pageIdx, erasedIndices.current);
      }
      redrawPage(ctx, pageIdx, erasedIndices.current);
      drawEraserCursor(ctx, newPoints[newPoints.length - 1], eraserSize * 2);

    // Shape
    } else if (currentTool === 'shape' && shapeStart.current) {
      const lastPoint = newPoints[newPoints.length - 1];
      redrawPage(ctx, pageIdx);
      drawShapeOutline(ctx, shapeType, shapeStart.current.x, shapeStart.current.y,
        lastPoint.x - shapeStart.current.x, lastPoint.y - shapeStart.current.y, shapeColor, shapeSize);
    }
  };

  // ─── Pointer Up ────────────────────────────────────────────
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'touch') return;

    // Select tool
    if (currentTool === 'select') {
      if (isMovingSelection.current) {
        isMovingSelection.current = false;
        selectionDragStart.current = null;
        return;
      }
      if (isDrawing.current && selectionDragStart.current) {
        isDrawing.current = false;
        const pageIdx = activePageIndex.current;
        const canvas = canvasRefs.current.get(pageIdx);
        if (!canvas) return;
        const point = getCanvasPoint(e.nativeEvent, canvas);
        const rect = {
          x: Math.min(selectionDragStart.current.x, point.x),
          y: Math.min(selectionDragStart.current.y, point.y),
          width: Math.abs(point.x - selectionDragStart.current.x),
          height: Math.abs(point.y - selectionDragStart.current.y),
        };
        if (rect.width > 5 && rect.height > 5) {
          const indices = findStrokesInRect(strokes, rect, pageIdx);
          setSelection(indices.length > 0 ? { pageIndex: pageIdx, rect, strokeIndices: indices } : null);
        }
        selectionDragStart.current = null;
        activePageIndex.current = -1;
      }
      return;
    }

    // Drawing tools
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const pageIdx = activePageIndex.current;

    if ((currentTool === 'pen' || currentTool === 'highlight') && currentPoints.current.length >= 2) {
      const isPen = currentTool === 'pen';
      addStroke({
        points: [...currentPoints.current],
        color: isPen ? penColor : highlightColor,
        size: isPen ? penSize : highlightSize,
        tool: currentTool,
        pageIndex: pageIdx,
        opacity: isPen ? undefined : 0.35,
      });
    } else if (currentTool === 'eraser' && erasedIndices.current.size > 0) {
      removeStrokes([...erasedIndices.current]);
      if (eraserAutoSwitch) switchBackToPrevious();
    } else if (currentTool === 'shape' && shapeStart.current) {
      const canvas = canvasRefs.current.get(pageIdx);
      if (canvas) {
        // Always use the pointer event position as end point
        // (currentPoints is not populated during shape drag)
        const endPoint = getCanvasPoint(e.nativeEvent, canvas);
        const sx = shapeStart.current.x, sy = shapeStart.current.y;
        const w = endPoint.x - sx, h = endPoint.y - sy;
        if (Math.abs(w) > 5 && Math.abs(h) > 5) {
          addStroke({
            points: [shapeStart.current, endPoint],
            color: shapeColor, size: shapeSize,
            tool: 'shape', pageIndex: pageIdx, shapeType,
            boundingBox: { x: Math.min(sx, sx + w), y: Math.min(sy, sy + h), width: Math.abs(w), height: Math.abs(h) },
          });
        }
      }
      shapeStart.current = null;
    }

    currentPoints.current = [];
    erasedIndices.current = new Set();
    activePageIndex.current = -1;
  };

  // ─── Helpers ────────────────────────────────────────────────
  const setCanvasRef = (pageIdx: number) => (el: HTMLCanvasElement | null) => {
    if (el) canvasRefs.current.set(pageIdx, el);
    else canvasRefs.current.delete(pageIdx);
  };

  const getCursor = () => {
    switch (currentTool) {
      case 'eraser': return 'none';
      default: return 'crosshair';
    }
  };

  return {
    containerRef, canvasRefs, pageDimensions,
    showSettings, setShowSettings,
    setCanvasRef,
    handlePointerDown, handlePointerMove, handlePointerUp,
    getCursor,
  };
}
