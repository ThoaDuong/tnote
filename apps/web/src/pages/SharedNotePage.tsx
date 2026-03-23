import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { notesApi } from '../services/api';
import HandwritingCanvas from '../components/HandwritingCanvas';
import TextEditor from '../components/TextEditor';
import type { INote } from '@note-app/shared';
import { useCanvasStore } from '../store/canvasStore';

export default function SharedNotePage() {
  const { id } = useParams<{ id: string }>();
  const [note, setNote] = useState<INote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { loadStrokes, clearAll } = useCanvasStore();

  useEffect(() => {
    if (!id) return;

    setIsLoading(true);
    notesApi.getPublicById(id)
      .then((data) => {
        setNote(data);
        if (data.type === 'handwriting' && data.strokes) {
          loadStrokes(data.strokes);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Shared note load error:', err);
        setError('Tài liệu này không tồn tại hoặc đã bị tắt chế độ chia sẻ công khai.');
        setIsLoading(false);
      });

    return () => {
      clearAll();
    };
  }, [id, loadStrokes, clearAll]);

  if (isLoading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div style={{ 
        display: 'flex', flexDirection: 'column', alignItems: 'center', 
        justifyContent: 'center', height: '100vh', gap: '16px', padding: '24px', textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px' }}>🔒</div>
        <h2 style={{ color: '#333' }}>Rất tiếc!</h2>
        <p style={{ color: '#666', maxWidth: '400px' }}>{error}</p>
        <button 
          onClick={() => window.location.href = '/'}
          style={{ 
            padding: '10px 24px', backgroundColor: '#2DAADB', color: '#fff', 
            border: 'none', borderRadius: '6px', cursor: 'pointer' 
          }}
        >
          Quay lại trang chủ
        </button>
      </div>
    );
  }

  return (
    <div className="note-editor shared-view" style={{ backgroundColor: '#f5f5f7', minHeight: '100vh' }}>
      <div className="editor-header share-view-header" style={{ justifyContent: 'center' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#333' }}>{note.title}</h1>
        <div style={{ position: 'absolute', right: '24px', fontSize: '12px', color: '#888' }}>
          Read-only view
        </div>
      </div>

      <div className="text-editor-area" style={{ marginTop: '20px' }}>
        {note.type === 'text' ? (
          <TextEditor 
            initialContent={note.textContent || ''} 
            onChange={() => {}} 
            readOnly={true}
          />
        ) : (
          <HandwritingCanvas readOnly={true} />
        )}
      </div>
    </div>
  );
}
