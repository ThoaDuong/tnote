import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useNoteStore } from '../store/noteStore';
import { useCanvasStore } from '../store/canvasStore';
import { notesApi } from '../services/api';
import HandwritingCanvas from '../components/HandwritingCanvas';
import TextEditor from '../components/TextEditor';
import type { INote, IStroke, NoteType } from '@note-app/shared';

export default function NoteEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { createNote, updateNote } = useNoteStore();
  const { loadStrokes, clearAll } = useCanvasStore();

  const [, setNote] = useState<INote | null>(null);
  const [title, setTitle] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('text');
  const [textContent, setTextContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const saveTimerRef = useRef<any>(null);
  const noteIdRef = useRef<string | null>(null);
  const latestStrokesRef = useRef<IStroke[]>([]);


  const isNew = id === 'new';

  // Load existing note
  useEffect(() => {
    if (isNew) {
      setTitle(searchParams.get('title') || 'Untitled');
      setNoteType((searchParams.get('type') as NoteType) || 'text');
      clearAll();
    } else if (id) {
      setIsLoading(true);
      notesApi.getById(id).then((data) => {
        setNote(data);
        setTitle(data.title);
        setNoteType(data.type as NoteType);
        setTextContent(data.textContent || '');
        setIsPublic(data.isPublic || false);
        noteIdRef.current = data._id;
        if (data.strokes) {
          loadStrokes(data.strokes);
          latestStrokesRef.current = data.strokes;
        }
        setIsLoading(false);
      }).catch(() => {
        navigate('/');
      });
    }

    return () => {
      clearAll();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [id]);

  // Auto-save for new notes — create on first change
  const ensureNoteCreated = useCallback(async () => {
    if (noteIdRef.current) return noteIdRef.current;

    if (isNew) {
      const folderId = searchParams.get('folderId') || undefined;
      const created = await createNote({
        title: title || 'Untitled',
        type: noteType,
        folderId: folderId || '',
        textContent: noteType === 'text' ? textContent : undefined,
        strokes: noteType === 'handwriting' ? latestStrokesRef.current : undefined,
      });
      noteIdRef.current = created._id;
      // Update URL without reload
      window.history.replaceState(null, '', `/editor/${created._id}`);
      return created._id;
    }
    return id!;
  }, [isNew, title, noteType, textContent, searchParams, id]);

  // Debounced save
  const triggerSave = useCallback(async (data: any) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        const noteId = await ensureNoteCreated();
        await updateNote(noteId, data);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error('Save error:', err);
        setSaveStatus('idle');
      }
    }, 1000);
  }, [ensureNoteCreated, updateNote]);

  // Handle title change
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    triggerSave({ title: newTitle });
  };

  // Handle text content change
  const handleTextChange = (newText: string) => {
    setTextContent(newText);
    triggerSave({ textContent: newText });
  };

  // Handle strokes change from canvas
  const handleStrokesChange = useCallback((strokes: IStroke[]) => {
    latestStrokesRef.current = strokes;

    // Generate thumbnail from first page canvas
    const firstPageCanvas = document.querySelector('.canvas-page:first-child .drawing-canvas') as HTMLCanvasElement;
    let thumbnail: string | undefined;
    if (firstPageCanvas) {
      try {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 240;
        tempCanvas.height = 160;
        const ctx = tempCanvas.getContext('2d')!;
        ctx.fillStyle = '#FAF8F5';
        ctx.fillRect(0, 0, 240, 160);
        ctx.drawImage(firstPageCanvas, 0, 0, firstPageCanvas.width, firstPageCanvas.height, 0, 0, 240, 160);
        thumbnail = tempCanvas.toDataURL('image/png', 0.6);
      } catch (e) {
        // Ignore thumbnail generation errors
      }
    }

    triggerSave({ strokes, thumbnail });
  }, [triggerSave]);

  if (isLoading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="note-editor">
      {/* Header */}
      <div className="editor-header">
        <button className="back-btn" onClick={() => navigate('/')} title="Back">
          ←
        </button>
        <input
          className="editor-title-input"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Note title..."
          id="editor-title"
        />
        <span className={`save-indicator ${saveStatus}`}>
          {saveStatus === 'saving' ? '💾 Saving...' : saveStatus === 'saved' ? '✅ Saved' : ''}
        </span>

        {/* Share Button & Popover */}
        <div style={{ position: 'relative', marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          <button 
            className="share-btn" 
            style={{ 
              backgroundColor: '#2DAADB', color: '#fff', border: 'none', 
              padding: '6px 16px', borderRadius: '4px', cursor: 'pointer',
              fontWeight: 500
            }}
            onClick={() => setIsShareOpen(!isShareOpen)}
          >
            Share
          </button>

          {isShareOpen && (
            <div 
              style={{
                position: 'absolute', top: '40px', right: '0', 
                backgroundColor: '#fff', borderRadius: '8px', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', width: '300px',
                padding: '16px', zIndex: 1000
              }}
            >
              <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#333' }}>Share this note</h3>
              
              <div 
                style={{ 
                  padding: '8px', borderRadius: '4px', cursor: 'pointer',
                  backgroundColor: !isPublic ? 'rgba(45,170,219,0.1)' : 'transparent',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
                onClick={() => { setIsPublic(false); triggerSave({ isPublic: false }); }}
              >
                🔒 <div style={{ flex: 1 }}><div style={{ fontWeight: 500, fontSize: '13px' }}>Only me</div><div style={{ fontSize: '11px', color: '#666' }}>Private to you</div></div>
                {!isPublic && <span style={{ color: '#2DAADB' }}>✓</span>}
              </div>

              <div 
                style={{ 
                  padding: '8px', borderRadius: '4px', cursor: 'pointer',
                  backgroundColor: isPublic ? 'rgba(45,170,219,0.1)' : 'transparent',
                  display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px'
                }}
                onClick={() => { setIsPublic(true); triggerSave({ isPublic: true }); }}
              >
                🌐 <div style={{ flex: 1 }}><div style={{ fontWeight: 500, fontSize: '13px' }}>Anyone with the link</div><div style={{ fontSize: '11px', color: '#666' }}>Can view only</div></div>
                {isPublic && <span style={{ color: '#2DAADB' }}>✓</span>}
              </div>

              {isPublic && noteIdRef.current && (
                <div style={{ marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      readOnly 
                      value={`${window.location.origin}/share/${noteIdRef.current}`}
                      style={{ 
                        flex: 1, padding: '6px 8px', borderRadius: '4px', 
                        border: '1px solid #ddd', fontSize: '12px', outline: 'none'
                      }}
                      onClick={(e) => e.currentTarget.select()}
                    />
                    <button 
                      style={{ 
                        padding: '6px 12px', backgroundColor: '#f1f1f1', 
                        border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
                      }}
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/share/${noteIdRef.current}`);
                        alert('Link copied to clipboard!');
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Editor Body */}
      {noteType === 'text' ? (
        <div className="text-editor-area">
          <TextEditor 
            initialContent={textContent} 
            onChange={handleTextChange} 
          />
        </div>
      ) : (
        <HandwritingCanvas onStrokesChange={handleStrokesChange} />
      )}
    </div>
  );
}
