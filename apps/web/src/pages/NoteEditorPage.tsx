import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useNoteStore } from '../store/noteStore';
import { useCanvasStore } from '../store/canvasStore';
import { notesApi } from '../services/api';
import HandwritingCanvas from '../components/HandwritingCanvas';
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
      </div>

      {/* Editor Body */}
      {noteType === 'text' ? (
        <div className="text-editor-area">
          <textarea
            value={textContent}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Start writing your note..."
            id="text-editor"
          />
        </div>
      ) : (
        <HandwritingCanvas onStrokesChange={handleStrokesChange} />
      )}
    </div>
  );
}
