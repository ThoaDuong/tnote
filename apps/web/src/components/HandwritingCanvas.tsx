import { useRef, useEffect, useCallback, useState } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import type { IStroke, IPoint } from '@note-app/shared';

const PEN_COLORS = [
  '#2D2A26', '#E85D5D', '#4A90D9', '#3BAF7A',
  '#D4763A', '#8B7EC8', '#F5B731', '#E07BAD',
];

interface HandwritingCanvasProps {
  onStrokesChange?: (strokes: IStroke[]) => void;
}

export default function HandwritingCanvas({ onStrokesChange }: HandwritingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const currentPoints = useRef<IPoint[]>([]);
  const erasedIndices = useRef<Set<number>>(new Set());
  const [showSize, setShowSize] = useState(false);

  const {
    strokes, currentTool, currentColor, currentSize,
    setTool, setColor, setSize, addStroke, removeStrokes, undo, redo,
  } = useCanvasStore();

  // Resize canvas to fill container
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    redrawAll(ctx, rect.width, rect.height);
  }, [strokes]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  // Prevent touch interactions on canvas (palm rejection)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventTouch = (e: TouchEvent) => {
      e.preventDefault();
    };

    canvas.addEventListener('touchstart', preventTouch, { passive: false });
    canvas.addEventListener('touchmove', preventTouch, { passive: false });
    canvas.addEventListener('touchend', preventTouch, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', preventTouch);
      canvas.removeEventListener('touchmove', preventTouch);
      canvas.removeEventListener('touchend', preventTouch);
    };
  }, []);

  // Redraw all strokes
  const redrawAll = (ctx: CanvasRenderingContext2D, w: number, h: number, skipIndices?: Set<number>) => {
    ctx.clearRect(0, 0, w, h);

    // Draw paper lines (GoodNotes style)
    ctx.strokeStyle = '#E8E2DA';
    ctx.lineWidth = 0.5;
    const lineSpacing = 32;
    for (let y = lineSpacing; y < h; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw strokes (skip erased ones)
    strokes.forEach((stroke, index) => {
      if (stroke.tool === 'eraser') return;
      if (skipIndices?.has(index)) return;
      drawStroke(ctx, stroke);
    });
  };

  // Draw single stroke – uniform width, continuous path for smooth lines
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

    // Last point
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  };

  // Pointer event handlers – only allow pen and mouse, reject touch (palm)
  const getCanvasPoint = (e: React.PointerEvent): IPoint => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: 0.5, // fixed pressure – no sensitivity
      timestamp: Date.now(),
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Palm rejection: only allow pen (stylus) and mouse
    if (e.pointerType === 'touch') return;
    e.preventDefault();
    e.stopPropagation();
    isDrawing.current = true;
    currentPoints.current = [getCanvasPoint(e)];
    erasedIndices.current = new Set();
    const canvas = canvasRef.current!;
    canvas.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing.current) return;
    if (e.pointerType === 'touch') return;
    e.preventDefault();
    e.stopPropagation();

    const point = getCanvasPoint(e);
    currentPoints.current.push(point);

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const container = containerRef.current!;
    const rect = container.getBoundingClientRect();

    if (currentTool === 'pen') {
      redrawAll(ctx, rect.width, rect.height);
      const tempStroke: IStroke = {
        points: currentPoints.current,
        color: currentColor,
        size: currentSize,
        tool: 'pen',
      };
      drawStroke(ctx, tempStroke);
    } else if (currentTool === 'eraser') {
      // Find all strokes under the eraser point and mark them
      const eraserRadius = currentSize * 4;
      findAllStrokesAtPoint(point, eraserRadius, erasedIndices.current);

      // Redraw without erased strokes
      redrawAll(ctx, rect.width, rect.height, erasedIndices.current);

      // Draw eraser cursor
      drawEraserCursor(ctx, point, eraserRadius);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDrawing.current) return;
    if (e.pointerType === 'touch') return;
    isDrawing.current = false;

    if (currentTool === 'pen' && currentPoints.current.length >= 2) {
      const newStroke: IStroke = {
        points: [...currentPoints.current],
        color: currentColor,
        size: currentSize,
        tool: 'pen',
      };
      addStroke(newStroke);
    } else if (currentTool === 'eraser' && erasedIndices.current.size > 0) {
      removeStrokes([...erasedIndices.current]);
    }

    currentPoints.current = [];
    erasedIndices.current = new Set();

    // Redraw to clean up eraser cursor
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const container = containerRef.current!;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redrawAll(ctx, rect.width, rect.height);
  };

  // Find all strokes near a point and add their indices to the set
  const findAllStrokesAtPoint = (point: IPoint, radius: number, result: Set<number>) => {
    for (let i = strokes.length - 1; i >= 0; i--) {
      if (result.has(i)) continue;
      const stroke = strokes[i];
      if (stroke.tool === 'eraser') continue;
      for (const p of stroke.points) {
        const dist = Math.sqrt((p.x - point.x) ** 2 + (p.y - point.y) ** 2);
        if (dist < radius) {
          result.add(i);
          break;
        }
      }
    }
  };

  // Draw eraser cursor indicator
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

  // Redraw when strokes change
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d')!;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redrawAll(ctx, rect.width, rect.height);
  }, [strokes]);

  return (
    <>
      <div className="canvas-container" ref={containerRef}>
        <canvas
          ref={canvasRef}
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
      </div>
    </>
  );
}
