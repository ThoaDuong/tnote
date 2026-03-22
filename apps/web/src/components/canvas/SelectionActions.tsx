import { useCanvasStore } from '../../store/canvasStore';

export default function SelectionActions() {
  const { selection, duplicateSelectedStrokes, deleteSelectedStrokes } = useCanvasStore();

  if (!selection) return null;

  return (
    <div
      className="selection-actions"
      style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        top: 12,
      }}
    >
      <button className="sel-action-btn" onClick={duplicateSelectedStrokes} title="Duplicate">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
        <span>Duplicate</span>
      </button>
      <button className="sel-action-btn delete" onClick={deleteSelectedStrokes} title="Delete">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
        <span>Delete</span>
      </button>
    </div>
  );
}
