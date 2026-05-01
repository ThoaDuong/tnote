import { useState, useEffect, useRef, useCallback } from 'react';
import BlockNoteEditor from './BlockNoteEditor';
import './App.css';
import {
  CheckIcon,
  ArrowTopRightOnSquareIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';


interface Note {
  _id: string;
  title: string;
  type: 'text' | 'handwriting';
  textContent?: string;
}

const WEB_URL = 'https://tnote-web.vercel.app';
const API_URL = 'https://tnote.onrender.com';

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [user, setUser] = useState<{ displayName: string; email: string; avatar: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [textNotes, setTextNotes] = useState<Note[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeNoteIdRef = useRef<string | null>(null);

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
      chrome.cookies.get({ url: WEB_URL, name: 'token' }, (cookie: chrome.cookies.Cookie | null) => {
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
      const userRes = await fetch(`${API_URL}/auth/me?_t=${Date.now()}`, {
        headers: authHeaders(tkn),
        cache: 'no-store'
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData);
      }

      // Fetch list of text notes initially
      await fetchTextNotes(tkn);
    } catch (e) {
      console.error('Failed to fetch user data', e);
      setLoading(false);
    }
  };

  const fetchTextNotes = async (tkn: string) => {
    try {
      setListLoading(true);
      const res = await fetch(`${API_URL}/notes?type=text&_t=${Date.now()}`, {
        headers: authHeaders(tkn),
        cache: 'no-store'
      });

      if (res.ok) {
        const notes = await res.json();
        setTextNotes(notes);
      } else if (res.status === 401 || res.status === 403) {
        setToken(null);
      }
    } catch (e) {
      console.error('Failed to fetch text notes', e);
    } finally {
      setListLoading(false);
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
    if (!activeNoteIdRef.current || !token) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const res = await fetch(`${API_URL}/notes/${activeNoteIdRef.current}`, {
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

  const handleOpenNote = async (note: Note) => {
    if (!token) return;
    try {
      setLoading(true);
      // Fetch full note with textContent since the list might not contain it
      const noteRes = await fetch(`${API_URL}/notes/${note._id}?_t=${Date.now()}`, {
        headers: authHeaders(token),
        cache: 'no-store'
      });
      if (noteRes.ok) {
        const fullNote = await noteRes.json();
        setActiveNote(fullNote);
        activeNoteIdRef.current = fullNote._id;
      } else {
        setActiveNote(note);
        activeNoteIdRef.current = note._id;
      }
      setSaveStatus('idle');
    } catch (e) {
      console.error('Failed to open note:', e);
    } finally {
      setLoading(false);
    }
  };

  const openInWeb = () => {
    if (!activeNoteIdRef.current) return;
    const url = `${WEB_URL}/editor/${activeNoteIdRef.current}`;
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
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
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
        {activeNote ? (
          <button
            className="icon-btn"
            onClick={() => { setActiveNote(null); activeNoteIdRef.current = null; }}
            style={{ marginRight: 4 }}
            title="Back to List"
          >
            <ArrowLeftIcon style={{ width: 18, height: 18 }} />
          </button>
        ) : (
          <img src="/tnote.png" alt="TNote" className="header-logo" />
        )}
        <span className="header-title">{activeNote ? activeNote.title : 'My Notes'}</span>

        {!activeNote && user && (
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
          {activeNote && (
            <>
              {saveStatus === 'saving' && <span className="save-indicator saving">Saving…</span>}
              {saveStatus === 'saved' && <span className="save-indicator saved"><CheckIcon style={{ width: 12, height: 12 }} /> Saved</span>}
              <button
                className="icon-btn"
                onClick={openInWeb}
                title="Open in TNote"
              >
                <ArrowTopRightOnSquareIcon style={{ width: 16, height: 16 }} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="main-area">
        {activeNote ? (
          <div className="editor-area">
            <BlockNoteEditor
              key={activeNote._id}
              initialContent={activeNote.textContent ?? ''}
              onChange={triggerSave}
            />
          </div>
        ) : (
          <div className="list-area">
            {listLoading ? (
              <div className="loading-container"><div className="spinner-ring small" /></div>
            ) : textNotes.length === 0 ? (
              <div className="empty-state">
                <p>No notes available.</p>
                <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>Create a text note on TNote web.</p>
                <button className="primary-btn" style={{ marginTop: 12 }} onClick={handleLogin}>Open TNote</button>
              </div>
            ) : (
              <ul className="note-list">
                {textNotes.map((note) => (
                  <li key={note._id} className="note-list-item" onClick={() => handleOpenNote(note)}>
                    <span className="note-item-title">{note.title}</span>
                    <span className="note-item-arrow">›</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
