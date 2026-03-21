import { useRef, useEffect, useCallback, useState } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import type { IStroke, IPoint } from '@note-app/shared';

const PEN_COLORS = [
  '#2D2A26', '#E85D5D', '#4A90D9', '#3BAF7A',
  '#D4763A', '#8B7EC8', '#F5B731', '#E07BAD',
];

// A4 ratio: width / height ≈ 1 / √2
const PAGE_ASPECT_RATIO = Math.SQRT2;

interface HandwritingCanvasProps {
  onStrokesChange?: (strokes: IStroke[]) => void;
}

export default function HandwritingCanvas({ onStrokesChange }: HandwritingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const isDrawing = useRef(false);
  const currentPoints = useRef<IPoint[]>([]);
  const activePageIndex = useRef<number>(-1);
  const erasedIndices = useRef<Set<number>>(new Set());
  const [showSize, setShowSize] = useState(false);
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });

  const {
    strokes, currentTool, currentColor, currentSize, pageCount,
    setTool, setColor, setSize, addStroke, removeStrokes, addPage, undo, redo,
  } = useCanvasStore();

  // Calculate page dimensions based on container width
  const updatePageDimensions = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerWidth = container.clientWidth;
    const pageWidth = Math.min(containerWidth - 48, 800); // max 800px, with padding
    const pageHeight = Math.round(pageWidth * PAGE_ASPECT_RATIO);
    setPageDimensions({ width: pageWidth, height: pageHeight });
  }, []);

  useEffect(() => {
    updatePageDimensions();
    window.addEventListener('resize', updatePageDimensions);
    return () => window.removeEventListener('resize', updatePageDimensions);
  }, [updatePageDimensions]);

  // Set up canvas for a page
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
  }, [pageDimensions, strokes]);

  // Redraw a specific page
  const redrawPage = (ctx: CanvasRenderingContext2D, pageIdx: number, skipIndices?: Set<number>) => {
    const { width, height } = pageDimensions;
    ctx.clearRect(0, 0, width, height);

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Draw paper lines
    ctx.strokeStyle = '#E8E2DA';
    ctx.lineWidth = 0.5;
    const lineSpacing = 32;
    for (let y = lineSpacing; y < height; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw strokes for this page
    strokes.forEach((stroke, index) => {
      if (stroke.tool === 'eraser') return;
      if ((stroke.pageIndex ?? 0) !== pageIdx) return;
      if (skipIndices?.has(index)) return;
      drawStroke(ctx, stroke);
    });
  };

  // Draw single stroke – uniform width, continuous path
  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: IStroke) => {
    const { points, color, size } = stroke;
    if (points.length < 2) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = size;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const midX = (curr.x + next.x) / 2;
      const midY = (curr.y + next.y) / 2;
      ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
    }

    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  };

  // Prevent touch events on canvas (palm rejection)
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

  // Setup and redraw all canvases when dimensions or strokes change
  useEffect(() => {
    if (!pageDimensions.width) return;
    canvasRefs.current.forEach((canvas, pageIdx) => {
      setupCanvas(canvas, pageIdx);
    });
  }, [pageDimensions, strokes, pageCount]);

  // Get point relative to canvas — accepts both React and native PointerEvent
  const getCanvasPoint = (e: PointerEvent | React.PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement): IPoint => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: 0.5,
      timestamp: Date.now(),
    };
  };

  const getPageIndex = (canvas: HTMLCanvasElement): number => {
    for (const [idx, c] of canvasRefs.current.entries()) {
      if (c === canvas) return idx;
    }
    return 0;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'touch') return;
    e.preventDefault();
    e.stopPropagation();

    const pageIdx = getPageIndex(e.currentTarget);
    isDrawing.current = true;
    activePageIndex.current = pageIdx;
    currentPoints.current = [getCanvasPoint(e.nativeEvent, e.currentTarget)];
    erasedIndices.current = new Set();
    e.currentTarget.setPointerCapture(e.pointerId);

    // Auto-add page if drawing on the last page
    if (pageIdx === pageCount - 1) {
      addPage();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    if (e.pointerType === 'touch') return;
    e.preventDefault();
    e.stopPropagation();

    const pageIdx = activePageIndex.current;
    const canvas = canvasRefs.current.get(pageIdx);
    if (!canvas) return;

    // Use coalesced events to capture ALL intermediate stylus points
    // Apple Pencil fires at 240Hz but browser batches into fewer pointermove events
    const coalescedEvents = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() || [e.nativeEvent];
    const newPoints: IPoint[] = coalescedEvents.map((ce) => getCanvasPoint(ce, canvas));
    
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (currentTool === 'pen') {
      // Incremental drawing: only draw new segments, don't redraw entire page
      const prevPoints = currentPoints.current;
      currentPoints.current.push(...newPoints);

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = currentSize;

      // Draw smooth curve through the new points + last existing point
      const startIdx = Math.max(0, prevPoints.length - 2);
      const allPoints = currentPoints.current;

      for (let i = startIdx; i < allPoints.length - 1; i++) {
        const p0 = allPoints[i];
        const p1 = allPoints[i + 1];
        const midX = (p0.x + p1.x) / 2;
        const midY = (p0.y + p1.y) / 2;

        ctx.beginPath();
        if (i === 0) {
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(midX, midY);
        } else {
          const prev = allPoints[i - 1];
          const prevMidX = (prev.x + p0.x) / 2;
          const prevMidY = (prev.y + p0.y) / 2;
          ctx.moveTo(prevMidX, prevMidY);
          ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
        }
        ctx.stroke();
      }
    } else if (currentTool === 'eraser') {
      // For eraser, check all coalesced points
      for (const point of newPoints) {
        currentPoints.current.push(point);
        const eraserRadius = currentSize * 4;
        findAllStrokesAtPoint(point, eraserRadius, pageIdx, erasedIndices.current);
      }
      redrawPage(ctx, pageIdx, erasedIndices.current);
      const lastPoint = newPoints[newPoints.length - 1];
      drawEraserCursor(ctx, lastPoint, currentSize * 4);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    if (e.pointerType === 'touch') return;
    isDrawing.current = false;

    const pageIdx = activePageIndex.current;

    if (currentTool === 'pen' && currentPoints.current.length >= 2) {
      addStroke({
        points: [...currentPoints.current],
        color: currentColor,
        size: currentSize,
        tool: 'pen',
        pageIndex: pageIdx,
      });
      // Full redraw to clean up incremental drawing artifacts
      const canvas = canvasRefs.current.get(pageIdx);
      if (canvas) {
        const ctx = canvas.getContext('2d')!;
        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // strokes updated via addStroke will trigger useEffect redraw
      }
    } else if (currentTool === 'eraser' && erasedIndices.current.size > 0) {
      removeStrokes([...erasedIndices.current]);
    }

    currentPoints.current = [];
    erasedIndices.current = new Set();
    activePageIndex.current = -1;
  };

  const findAllStrokesAtPoint = (point: IPoint, radius: number, pageIdx: number, result: Set<number>) => {
    for (let i = strokes.length - 1; i >= 0; i--) {
      if (result.has(i)) continue;
      const stroke = strokes[i];
      if (stroke.tool === 'eraser') continue;
      if ((stroke.pageIndex ?? 0) !== pageIdx) continue;
      for (const p of stroke.points) {
        const dist = Math.sqrt((p.x - point.x) ** 2 + (p.y - point.y) ** 2);
        if (dist < radius) {
          result.add(i);
          break;
        }
      }
    }
  };

  const drawEraserCursor = (ctx: CanvasRenderingContext2D, point: IPoint, radius: number) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();
    ctx.setLineDash([]);
    ctx.restore();
  };

  // Notify parent of stroke changes
  useEffect(() => {
    onStrokesChange?.(strokes);
  }, [strokes]);

  // Canvas ref callback
  const setCanvasRef = (pageIdx: number) => (el: HTMLCanvasElement | null) => {
    if (el) {
      canvasRefs.current.set(pageIdx, el);
    } else {
      canvasRefs.current.delete(pageIdx);
    }
  };

  return (
    <>
      <div className="canvas-scroll-container" ref={containerRef}>
        <div className="canvas-pages-wrapper">
          {Array.from({ length: pageCount }, (_, pageIdx) => (
            <div
              key={pageIdx}
              className="canvas-page"
              style={{
                width: pageDimensions.width || '100%',
                height: pageDimensions.height || 'auto',
              }}
            >
              <canvas
                ref={setCanvasRef(pageIdx)}
                className="drawing-canvas"
                style={{
                  touchAction: 'none',
                  cursor: currentTool === 'eraser' ? 'none' : 'crosshair',
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onPointerCancel={handlePointerUp}
              />
              <div className="page-number">{pageIdx + 1}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="canvas-toolbar">
        <button
          className={`tool-btn ${currentTool === 'pen' ? 'active' : ''}`}
          onClick={() => setTool('pen')}
          title="Pen"
        >
          ✏️
        </button>

        <button
          className={`tool-btn ${currentTool === 'eraser' ? 'active' : ''}`}
          onClick={() => setTool('eraser')}
          title="Eraser"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8L14.6 1.6c.8-.8 2-.8 2.8 0L21 5.2c.8.8.8 2 0 2.8L11 18" />
            <path d="M6 12l5 5" />
          </svg>
        </button>

        <div className="toolbar-divider" />

        <div className="pen-colors">
          {PEN_COLORS.map((c) => (
            <div
              key={c}
              className={`pen-color-swatch ${currentColor === c ? 'active' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>

        <div className="toolbar-divider" />

        <div style={{ position: 'relative' }}>
          <button
            className="tool-btn"
            onClick={() => setShowSize(!showSize)}
            title="Pen size"
          >
            <div
              className="size-preview"
              style={{
                width: Math.min(currentSize * 2, 20),
                height: Math.min(currentSize * 2, 20),
              }}
            />
          </button>
          {showSize && (
            <div className="size-slider-popup">
              <span className="size-label">{currentSize}px</span>
              <input
                type="range"
                min="1"
                max="20"
                value={currentSize}
                onChange={(e) => setSize(Number(e.target.value))}
              />
            </div>
          )}
        </div>

        <div className="toolbar-divider" />

        <div className="undo-redo">
          <button className="tool-btn" onClick={undo} title="Undo">↩</button>
          <button className="tool-btn" onClick={redo} title="Redo">↪</button>
        </div>
      </div>
    </>
  );
}
