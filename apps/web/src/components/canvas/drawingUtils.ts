import type { IStroke, IPoint, ShapeType } from '@note-app/shared';

/**
 * Smooth a point using weighted moving average of nearby points.
 * Reduces jitter from stylus input while maintaining responsiveness.
 */
export const smoothPoint = (points: IPoint[], index: number, radius: number = 3): IPoint => {
  const start = Math.max(0, index - radius);
  const end = Math.min(points.length - 1, index + radius);
  let totalX = 0, totalY = 0, totalWeight = 0;
  for (let i = start; i <= end; i++) {
    const weight = 1 / (1 + Math.abs(i - index));
    totalX += points[i].x * weight;
    totalY += points[i].y * weight;
    totalWeight += weight;
  }
  return { ...points[index], x: totalX / totalWeight, y: totalY / totalWeight };
};

/**
 * Draw a shape outline on the canvas context.
 */
export const drawShapeOutline = (
  ctx: CanvasRenderingContext2D,
  shapeType: ShapeType,
  x: number, y: number, w: number, h: number,
  color: string, lineWidth: number
) => {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();

  switch (shapeType) {
    case 'rectangle':
      ctx.rect(x, y, w, h);
      break;
    case 'circle': {
      const radius = Math.min(Math.abs(w), Math.abs(h)) / 2;
      const cx = x + w / 2;
      const cy = y + h / 2;
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      break;
    }
    case 'ellipse': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      ctx.ellipse(cx, cy, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, Math.PI * 2);
      break;
    }
    case 'triangle': {
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      break;
    }
    case 'diamond': {
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h / 2);
      ctx.lineTo(x + w / 2, y + h);
      ctx.lineTo(x, y + h / 2);
      ctx.closePath();
      break;
    }
    case 'star': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const outerR = Math.min(Math.abs(w), Math.abs(h)) / 2;
      const innerR = outerR * 0.4;
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
  }
  ctx.stroke();
};

/**
 * Draw a pen or highlight stroke with smoothing.
 */
export const drawStroke = (ctx: CanvasRenderingContext2D, stroke: IStroke) => {
  const { points, color, size, tool, opacity } = stroke;
  if (points.length < 2) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = size;

  if (tool === 'highlight') {
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = opacity ?? 0.35;
    ctx.lineCap = 'square';
  }

  ctx.beginPath();
  const s0 = smoothPoint(points, 0);
  ctx.moveTo(s0.x, s0.y);

  for (let i = 1; i < points.length - 1; i++) {
    const sCurr = smoothPoint(points, i);
    const sNext = smoothPoint(points, i + 1);
    ctx.quadraticCurveTo(sCurr.x, sCurr.y, (sCurr.x + sNext.x) / 2, (sCurr.y + sNext.y) / 2);
  }

  const sLast = smoothPoint(points, points.length - 1);
  ctx.lineTo(sLast.x, sLast.y);
  ctx.stroke();
  ctx.restore();
};

/**
 * Draw a shape stroke from its bounding box.
 */
export const drawShapeStroke = (ctx: CanvasRenderingContext2D, stroke: IStroke) => {
  if (!stroke.boundingBox || !stroke.shapeType) return;
  const { x, y, width, height } = stroke.boundingBox;
  drawShapeOutline(ctx, stroke.shapeType, x, y, width, height, stroke.color, stroke.size);
};

/**
 * Draw the eraser cursor indicator.
 */
export const drawEraserCursor = (ctx: CanvasRenderingContext2D, point: IPoint, radius: number) => {
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

/**
 * Draw the selection rectangle with corner handles.
 */
export const drawSelectionUI = (
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number }
) => {
  ctx.save();
  ctx.strokeStyle = '#4A90D9';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.fillStyle = 'rgba(74, 144, 217, 0.08)';
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.width, rect.height);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);

  // Corner handles
  const handleSize = 8;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#4A90D9';
  ctx.lineWidth = 2;
  const corners = [
    [rect.x, rect.y], [rect.x + rect.width, rect.y],
    [rect.x, rect.y + rect.height], [rect.x + rect.width, rect.y + rect.height],
  ];
  for (const [cx, cy] of corners) {
    ctx.beginPath();
    ctx.rect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
};

/**
 * Find all strokes near a given point (for eraser).
 */
export const findStrokesAtPoint = (
  strokes: IStroke[], point: IPoint, radius: number, pageIdx: number, result: Set<number>
) => {
  for (let i = strokes.length - 1; i >= 0; i--) {
    if (result.has(i)) continue;
    const stroke = strokes[i];
    if (stroke.tool === 'eraser') continue;
    if ((stroke.pageIndex ?? 0) !== pageIdx) continue;
    for (const p of stroke.points) {
      if (Math.sqrt((p.x - point.x) ** 2 + (p.y - point.y) ** 2) < radius) {
        result.add(i);
        break;
      }
    }
  }
};

/**
 * Find all strokes inside a selection rectangle.
 */
export const findStrokesInRect = (
  strokes: IStroke[],
  rect: { x: number; y: number; width: number; height: number },
  pageIdx: number
): number[] => {
  const indices: number[] = [];
  const rx = rect.x, ry = rect.y, rw = rect.width, rh = rect.height;
  strokes.forEach((stroke, i) => {
    if (stroke.tool === 'eraser') return;
    if ((stroke.pageIndex ?? 0) !== pageIdx) return;
    const inside = stroke.points.some((p) =>
      p.x >= rx && p.x <= rx + rw && p.y >= ry && p.y <= ry + rh
    );
    if (inside) indices.push(i);
  });
  return indices;
};
