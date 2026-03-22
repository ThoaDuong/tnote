import type { ShapeType } from '@note-app/shared';

export const PEN_COLORS = [
  '#2D2A26', '#E85D5D', '#4A90D9', '#3BAF7A',
  '#D4763A', '#8B7EC8', '#F5B731', '#E07BAD',
];

export const HIGHLIGHT_COLORS = [
  '#FFEB3B', '#76FF03', '#40C4FF', '#FF80AB',
  '#FF9100', '#B388FF', '#84FFFF', '#CCFF90',
];

export const SHAPE_LIST: { type: ShapeType; label: string; icon: string }[] = [
  { type: 'rectangle', label: 'Rectangle', icon: '▭' },
  { type: 'circle', label: 'Circle', icon: '○' },
  { type: 'ellipse', label: 'Ellipse', icon: '⬭' },
  { type: 'triangle', label: 'Triangle', icon: '△' },
  { type: 'diamond', label: 'Diamond', icon: '◇' },
  { type: 'star', label: 'Star', icon: '☆' },
];

export const PAGE_ASPECT_RATIO = Math.SQRT2;
