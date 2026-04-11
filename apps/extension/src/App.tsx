import { useState, useEffect, useRef, useCallback } from 'react';
import BlockNoteEditor from './BlockNoteEditor';
import './App.css';
import {
  CheckIcon,
  ArrowTopRightOnSquareIcon,
  ArrowsRightLeftIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

declare const chrome: any;

interface Note {
  _id: string;
  title: string;
  type: 'text' | 'handwriting';
  textContent?: string;
  isQuickNote?: boolean;
}

const WEB_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [quickNote, setQuickNote] = useState<Note | null>(null);
  const [user, setUser] = useState<{ displayName: string; email: string; avatar: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showPicker, setShowPicker] = useState(false);
  const [textNotes, setTextNotes] = useState<Note[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);


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
          fetchUserAndNote(cookie.value);
        } else {
          setLoading(false);
        }
      });
    } else {
      const tkn = localStorage.getItem('token');
      if (tkn) {
        setToken(tkn);
        fetchUserAndNote(tkn);
      } else {
        setLoading(false);
      }
    }
  };

  const fetchUserAndNote = async (tkn: string) => {
    try {
      // Fetch user profile
      const userRes = await fetch(`${API_URL}/auth/me`, {
        headers: authHeaders(tkn),
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData);
      }
      
      // Fetch quick note
      await fetchQuickNote(tkn);
    } catch (e) {
      console.error('Failed to fetch user data', e);
      setLoading(false);
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
      } else if (res.status === 401 || res.status === 403) {
        // Token expired or invalid — force re-login
        setToken(null);
      }
      // 404 = no quick note set yet — user sees "No quick note found" UI
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

  const handleSwitchNote = async (note: Note) => {
    if (!token) return;
    try {
      setPickerLoading(true);
      const res = await fetch(`${API_URL}/users/quick-note`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify({ noteId: note._id }),
      });
      
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        setQuickNote(note);
        quickNoteIdRef.current = note._id;
        setShowPicker(false);
        setSaveStatus('idle');
      }
    } catch (e) {
      console.error('Failed to switch quick note:', e);
      alert('Failed to update quick note setting.');
    } finally {
      setPickerLoading(false);
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
        <p className="login-subtitle">Sign in to start taking quick notes.</p>
        <button className="google-btn" onClick={handleLogin}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>
      </div>
    );
  }

  // ─── Main UI ───────────────────────────────────────────────────────────────
  return (
    <div className="app-container">
      {/* Header */}
      <div className="header">
        <img src="/tnote.png" alt="TNote" className="header-logo" />
        <span className="header-title">{quickNote?.title || 'Quick Note'}</span>
        
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '4px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.2 }}>{user.displayName}</span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{user.email}</span>
            </div>
            {user.avatar ? (
              <img src={user.avatar} alt="User" style={{ width: 22, height: 22, borderRadius: '50%' }} />
            ) : (
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>
                {user.displayName?.[0] || '?'}
              </div>
            )}
          </div>
        )}

        <div className="header-actions">
          {saveStatus === 'saving' && <span className="save-indicator saving">Saving…</span>}
          {saveStatus === 'saved' && <span className="save-indicator saved"><CheckIcon style={{ width: 12, height: 12 }} /> Saved</span>}
          <button
            className="icon-btn"
            onClick={openInWeb}
            title="Open in TNote"
          >
            <ArrowTopRightOnSquareIcon style={{ width: 16, height: 16 }} />
          </button>
          <button
            className="icon-btn change-btn"
            onClick={openPicker}
            title="Switch note"
          >
            <ArrowsRightLeftIcon style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="editor-area">
        {quickNote ? (
          <BlockNoteEditor
            initialContent={quickNote.textContent ?? ''}
            onChange={triggerSave}
          />
        ) : (
          <div className="no-quick-note">
            <p>No quick note found.</p>
            <p style={{ fontSize: 12, color: '#9CA3AF' }}>Login at TNote web to create your quick note.</p>
            <button className="primary-btn" onClick={handleLogin}>Open TNote</button>
          </div>
        )}
      </div>

      {/* Note Picker Modal */}
      {showPicker && (
        <div className="picker-overlay" onClick={() => setShowPicker(false)}>
          <div className="picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="picker-header">
              <span>Switch Note</span>
              <button className="picker-close" onClick={() => setShowPicker(false)}><XMarkIcon style={{ width: 16, height: 16 }} /></button>
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
                      onClick={() => handleSwitchNote(note)}
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
