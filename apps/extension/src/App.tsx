import { useState, useEffect, useRef, useCallback } from 'react';
import TiptapEditor, { type TiptapEditorHandle } from './TiptapEditor';
import './App.css';

declare const chrome: any;

interface Note {
  _id: string;
  title: string;
  type: 'text' | 'handwriting';
  textContent?: string;
  isQuickNote?: boolean;
}

const WEB_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000/api';

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [quickNote, setQuickNote] = useState<Note | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showPicker, setShowPicker] = useState(false);
  const [textNotes, setTextNotes] = useState<Note[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const editorRef = useRef<TiptapEditorHandle>(null);
  const saveTimerRef = useRef<any>(null);
  const quickNoteIdRef = useRef<string | null>(null);

  useEffect(() => {
    checkAuth();
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);


  const authHeaders = (tkn: string) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${tkn}`,
  });

  const checkAuth = () => {
    if (typeof chrome !== 'undefined' && chrome.cookies) {
      chrome.cookies.get({ url: WEB_URL, name: 'token' }, (cookie: any) => {
        if (cookie?.value) {
          setToken(cookie.value);
          fetchQuickNote(cookie.value);
        } else {
          setLoading(false);
        }
      });
    } else {
      const tkn = localStorage.getItem('token');
      if (tkn) {
        setToken(tkn);
        fetchQuickNote(tkn);
      } else {
        setLoading(false);
      }
    }
  };

  const fetchQuickNote = async (tkn: string) => {
    try {
      const res = await fetch(`${API_URL}/notes/quick`, {
        headers: authHeaders(tkn),
      });
      if (res.ok) {
        const note = await res.json();
        setQuickNote(note);
        quickNoteIdRef.current = note._id;
      }
    } catch (e) {
      console.error('Failed to fetch quick note', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: `${WEB_URL}/login` });
    } else {
      window.open(`${WEB_URL}/login`);
    }
  };

  // Debounced auto-save
  const triggerSave = useCallback((html: string) => {
    if (!quickNoteIdRef.current || !token) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const res = await fetch(`${API_URL}/notes/${quickNoteIdRef.current}`, {
          method: 'PATCH',
          headers: authHeaders(token),
          body: JSON.stringify({ textContent: html }),
        });
        if (res.ok) {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } else {
          setSaveStatus('idle');
        }
      } catch {
        setSaveStatus('idle');
      }
    }, 1000);
  }, [token]);

  const openPicker = async () => {
    if (!token) return;
    setPickerLoading(true);
    setShowPicker(true);
    try {
      const res = await fetch(`${API_URL}/notes?type=text`, {
        headers: authHeaders(token),
      });
      if (res.ok) {
        const notes = await res.json();
        setTextNotes(notes);
      }
    } catch (e) {
      console.error('Failed to fetch notes', e);
    } finally {
      setPickerLoading(false);
    }
  };

  const handleChangeQuickNote = async (note: Note) => {
    if (!token) return;
    try {
      await fetch(`${API_URL}/users/quick-note`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify({ noteId: note._id }),
      });
      setQuickNote(note);
      quickNoteIdRef.current = note._id;
      setShowPicker(false);
      // Reset save timer
      setSaveStatus('idle');
    } catch (e) {
      console.error('Failed to change quick note', e);
    }
  };

  const openInWeb = () => {
    if (!quickNoteIdRef.current) return;
    const url = `${WEB_URL}/editor/${quickNoteIdRef.current}`;
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url });
    } else {
      window.open(url);
    }
  };

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="app-container center">
        <div className="spinner-ring" />
      </div>
    );
  }

  // ─── Not logged in ─────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="app-container center">
        <img src="/tnote.png" alt="TNote" className="app-logo" />
        <h2 className="login-title">TNote</h2>
        <p className="login-subtitle">Log in to start taking quick notes.</p>
        <button className="primary-btn" onClick={handleLogin}>Log In</button>
      </div>
    );
  }

  // ─── Main UI ───────────────────────────────────────────────────────────────
  return (
    <div className="app-container">
      {/* Header */}
      <div className="header">
        <img src="/tnote.png" alt="TNote" className="header-logo" />
        <span className="header-title">Quick Note</span>
        <div className="header-actions">
          {saveStatus === 'saving' && <span className="save-indicator saving">Saving…</span>}
          {saveStatus === 'saved' && <span className="save-indicator saved">✓ Saved</span>}
          <button
            className="icon-btn"
            onClick={openInWeb}
            title="Open in TNote"
          >
            ↗
          </button>
          <button
            className="icon-btn change-btn"
            onClick={openPicker}
            title="Change quick note"
          >
            ⇄
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="editor-area">
        {quickNote ? (
          <TiptapEditor
            ref={editorRef}
            initialHTML={quickNote.textContent ?? ''}
            onChange={triggerSave}
          />
        ) : (
          <div className="no-quick-note">
            <p>No quick note found.</p>
            <button className="primary-btn" onClick={openPicker}>Select a note</button>
          </div>
        )}
      </div>

      {/* Note Picker Modal */}
      {showPicker && (
        <div className="picker-overlay" onClick={() => setShowPicker(false)}>
          <div className="picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="picker-header">
              <span>Change Quick Note</span>
              <button className="picker-close" onClick={() => setShowPicker(false)}>×</button>
            </div>
            <div className="picker-body">
              {pickerLoading ? (
                <div className="picker-loading"><div className="spinner-ring small" /></div>
              ) : textNotes.length === 0 ? (
                <p className="picker-empty">No text notes available.</p>
              ) : (
                <ul className="picker-list">
                  {textNotes.map((note) => (
                    <li
                      key={note._id}
                      className={`picker-item ${note._id === quickNoteIdRef.current ? 'current' : ''}`}
                      onClick={() => handleChangeQuickNote(note)}
                    >
                      <span className="picker-item-title">{note.title}</span>
                      {note._id === quickNoteIdRef.current && (
                        <span className="picker-current-badge">current</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
