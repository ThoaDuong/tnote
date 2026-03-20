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
  const [showSize, setShowSize] = useState(false);

  const {
    strokes, currentTool, currentColor, currentSize,
    setTool, setColor, setSize, addStroke, removeStroke, undo, redo,
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

  // Redraw all strokes
  const redrawAll = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
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

    // Draw strokes
    strokes.forEach((stroke) => {
      if (stroke.tool === 'eraser') return;
      drawStroke(ctx, stroke);
    });
  };

  // Draw single stroke with pressure sensitivity
  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: IStroke) => {
    const { points, color, size } = stroke;
    if (points.length < 2) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];

      const pressure = Math.max(0.1, curr.pressure);
      ctx.lineWidth = size * pressure * 2;

      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);

      if (i < points.length - 1) {
        const next = points[i + 1];
        const midX = (curr.x + next.x) / 2;
        const midY = (curr.y + next.y) / 2;
        ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
      } else {
        ctx.lineTo(curr.x, curr.y);
      }

      ctx.stroke();
    }
  };

  // Pointer event handlers
  const getCanvasPoint = (e: React.PointerEvent): IPoint => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure || 0.5,
      timestamp: Date.now(),
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    e.preventDefault();
    isDrawing.current = true;
    currentPoints.current = [getCanvasPoint(e)];
    const canvas = canvasRef.current!;
    canvas.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing.current) return;
    e.preventDefault();

    const point = getCanvasPoint(e);
    currentPoints.current.push(point);

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const container = containerRef.current!;
    const rect = container.getBoundingClientRect();

    redrawAll(ctx, rect.width, rect.height);

    if (currentTool === 'pen') {
      const tempStroke: IStroke = {
        points: currentPoints.current,
        color: currentColor,
        size: currentSize,
        tool: 'pen',
      };
      drawStroke(ctx, tempStroke);
    } else if (currentTool === 'eraser') {
      const eraserRadius = currentSize * 4;
      const strokeIndex = findStrokeAtPoint(point, eraserRadius);
      if (strokeIndex >= 0) {
        const targetStroke = strokes[strokeIndex];
        const highlightStroke = { ...targetStroke, color: 'rgba(232, 93, 93, 0.5)' };
        drawStroke(ctx, highlightStroke);
      }
    }
  };

  const handlePointerUp = (_e: React.PointerEvent) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    if (currentTool === 'pen' && currentPoints.current.length >= 2) {
      const newStroke: IStroke = {
        points: [...currentPoints.current],
        color: currentColor,
        size: currentSize,
        tool: 'pen',
      };
      addStroke(newStroke);
    } else if (currentTool === 'eraser') {
      const eraserRadius = currentSize * 4;
      for (const point of currentPoints.current) {
        const index = findStrokeAtPoint(point, eraserRadius);
        if (index >= 0) {
          removeStroke(index);
          break;
        }
      }
    }

    currentPoints.current = [];
  };

  // Find stroke near a point
  const findStrokeAtPoint = (point: IPoint, radius: number): number => {
    for (let i = strokes.length - 1; i >= 0; i--) {
      const stroke = strokes[i];
      for (const p of stroke.points) {
        const dist = Math.sqrt((p.x - point.x) ** 2 + (p.y - point.y) ** 2);
        if (dist < radius) return i;
      }
    }
    return -1;
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
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
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
            🧹
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
