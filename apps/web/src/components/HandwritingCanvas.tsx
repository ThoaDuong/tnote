import { useCanvasStore } from '../store/canvasStore'
import type { IStroke } from '@note-app/shared';
import { useCanvasHandlers } from './canvas/useCanvasHandlers';
import CanvasToolbar from './canvas/CanvasToolbar';
import SelectionActions from './canvas/SelectionActions';

interface HandwritingCanvasProps {
  onStrokesChange?: (strokes: IStroke[]) => void;
  readOnly?: boolean;
}

export default function HandwritingCanvas({ onStrokesChange, readOnly = false }: HandwritingCanvasProps) {
  const { pageCount } = useCanvasStore();

  const {
    containerRef,
    pageDimensions,
    showSettings, setShowSettings,
    setCanvasRef,
    handlePointerDown, handlePointerMove, handlePointerUp,
    getCursor,
  } = useCanvasHandlers(onStrokesChange);

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
                style={{ touchAction: 'none', cursor: readOnly ? 'default' : getCursor(), pointerEvents: readOnly ? 'none' : 'auto' }}
                onPointerDown={readOnly ? undefined : handlePointerDown}
                onPointerMove={readOnly ? undefined : handlePointerMove}
                onPointerUp={readOnly ? undefined : handlePointerUp}
                onPointerLeave={readOnly ? undefined : handlePointerUp}
                onPointerCancel={readOnly ? undefined : handlePointerUp}
              />
              <div className="page-number">{pageIdx + 1}</div>
            </div>
          ))}
        </div>

        {!readOnly && <SelectionActions />}
      </div>

      {!readOnly && <CanvasToolbar showSettings={showSettings} onShowSettings={setShowSettings} />}
    </>
  );
}
