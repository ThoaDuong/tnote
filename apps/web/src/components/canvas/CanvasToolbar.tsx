import type { ToolType } from '@note-app/shared';
import { useCanvasStore } from '../../store/canvasStore';
import { PEN_COLORS, HIGHLIGHT_COLORS, SHAPE_LIST } from './constants';

interface CanvasToolbarProps {
  showSettings: string | null;
  onShowSettings: (tool: string | null) => void;
}

export default function CanvasToolbar({ showSettings, onShowSettings }: CanvasToolbarProps) {
  const {
    currentTool,
    penColor, penSize,
    highlightColor, highlightSize,
    eraserSize, eraserAutoSwitch,
    shapeType, shapeColor, shapeSize,
    setTool,
    setPenColor, setPenSize,
    setHighlightColor, setHighlightSize,
    setEraserSize, setEraserAutoSwitch,
    setShapeType, setShapeColor, setShapeSize,
    undo, redo,
  } = useCanvasStore();

  const handleToolClick = (tool: ToolType | 'select') => {
    if (currentTool === tool) {
      if (tool !== 'select') {
        onShowSettings(showSettings === tool ? null : tool);
      }
    } else {
      setTool(tool);
      onShowSettings(null);
    }
  };

  return (
    <>
      <div className="canvas-toolbar">
        {/* Pen */}
        <button className={`tool-btn ${currentTool === 'pen' ? 'active' : ''}`} onClick={() => handleToolClick('pen')} title="Pen">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
          </svg>
        </button>

        {/* Highlight */}
        <button className={`tool-btn ${currentTool === 'highlight' ? 'active' : ''}`} onClick={() => handleToolClick('highlight')} title="Highlight">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15.5 4.5l4 4L8 20H4v-4L15.5 4.5z"/>
            <path d="M2 22h20" strokeOpacity="0.5"/>
          </svg>
        </button>

        {/* Eraser */}
        <button className={`tool-btn ${currentTool === 'eraser' ? 'active' : ''}`} onClick={() => handleToolClick('eraser')} title="Eraser">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8L14.6 1.6c.8-.8 2-.8 2.8 0L21 5.2c.8.8.8 2 0 2.8L11 18"/>
            <path d="M6 12l5 5"/>
          </svg>
        </button>

        {/* Shape */}
        <button className={`tool-btn ${currentTool === 'shape' ? 'active' : ''}`} onClick={() => handleToolClick('shape')} title="Shape">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
          </svg>
        </button>

        {/* Select */}
        <button className={`tool-btn ${currentTool === 'select' ? 'active' : ''}`} onClick={() => handleToolClick('select')} title="Select">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2">
            <rect x="3" y="3" width="18" height="18" rx="1"/>
          </svg>
        </button>

        <div className="toolbar-divider" />

        {/* Undo / Redo */}
        <button className="tool-btn" onClick={undo} title="Undo">↩</button>
        <button className="tool-btn" onClick={redo} title="Redo">↪</button>
      </div>

      {/* ─── Settings Popups ────────────────────────────────── */}
      {showSettings === 'pen' && (
        <div className="tool-settings-popup">
          <div className="settings-section">
            <label className="settings-label">Color</label>
            <div className="color-grid">
              {PEN_COLORS.map((c) => (
                <div
                  key={c}
                  className={`color-swatch ${penColor === c ? 'active' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setPenColor(c)}
                />
              ))}
            </div>
          </div>
          <div className="settings-section">
            <label className="settings-label">Size: {penSize}px</label>
            <input type="range" min="1" max="20" value={penSize} onChange={(e) => setPenSize(Number(e.target.value))} className="settings-slider" />
          </div>
        </div>
      )}

      {showSettings === 'highlight' && (
        <div className="tool-settings-popup">
          <div className="settings-section">
            <label className="settings-label">Color</label>
            <div className="color-grid">
              {HIGHLIGHT_COLORS.map((c) => (
                <div
                  key={c}
                  className={`color-swatch ${highlightColor === c ? 'active' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setHighlightColor(c)}
                />
              ))}
            </div>
          </div>
          <div className="settings-section">
            <label className="settings-label">Size: {highlightSize}px</label>
            <input type="range" min="8" max="40" value={highlightSize} onChange={(e) => setHighlightSize(Number(e.target.value))} className="settings-slider" />
          </div>
        </div>
      )}

      {showSettings === 'eraser' && (
        <div className="tool-settings-popup">
          <div className="settings-section">
            <label className="settings-label">Size: {eraserSize}px</label>
            <input type="range" min="4" max="40" value={eraserSize} onChange={(e) => setEraserSize(Number(e.target.value))} className="settings-slider" />
          </div>
          <div className="settings-section">
            <label className="settings-label">
              <span>Auto switch back</span>
              <div className={`toggle-switch ${eraserAutoSwitch ? 'on' : ''}`} onClick={() => setEraserAutoSwitch(!eraserAutoSwitch)}>
                <div className="toggle-thumb" />
              </div>
            </label>
          </div>
        </div>
      )}

      {showSettings === 'shape' && (
        <div className="tool-settings-popup">
          <div className="settings-section">
            <label className="settings-label">Shape</label>
            <div className="shape-grid">
              {SHAPE_LIST.map((s) => (
                <button
                  key={s.type}
                  className={`shape-btn ${shapeType === s.type ? 'active' : ''}`}
                  onClick={() => setShapeType(s.type)}
                  title={s.label}
                >
                  {s.icon}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-section">
            <label className="settings-label">Color</label>
            <div className="color-grid">
              {PEN_COLORS.map((c) => (
                <div
                  key={c}
                  className={`color-swatch ${shapeColor === c ? 'active' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setShapeColor(c)}
                />
              ))}
            </div>
          </div>
          <div className="settings-section">
            <label className="settings-label">Stroke: {shapeSize}px</label>
            <input type="range" min="1" max="10" value={shapeSize} onChange={(e) => setShapeSize(Number(e.target.value))} className="settings-slider" />
          </div>
        </div>
      )}
    </>
  );
}
