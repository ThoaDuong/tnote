import { useState, useEffect } from 'react';
import './App.css';

declare const chrome: any;

interface Note {
  _id: string;
  title: string;
  type: 'text' | 'handwriting';
  textContent?: string;
  thumbnail?: string;
  updatedAt: string;
}

const WEB_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000/api';

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [quickNote, setQuickNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    if (typeof chrome !== 'undefined' && chrome.cookies) {
      chrome.cookies.get({ url: WEB_URL, name: 'token' }, (cookie: any) => {
        if (cookie && cookie.value) {
          setToken(cookie.value);
          fetchRecentNotes(cookie.value);
        } else {
          setLoading(false);
        }
      });
    } else {
      // In non-extension environment, mock or fallback
      setLoading(false);
    }
  };

  const fetchRecentNotes = async (authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/notes?type=text&limit=3`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch (e) {
      console.error('Failed to fetch notes', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: `${WEB_URL}/login` });
    }
  };

  const handleSave = async () => {
    if (!quickNote.trim() || !token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: `Quick Note ${new Date().toLocaleTimeString()}`,
          type: 'text',
          textContent: quickNote.trim()
        })
      });
      if (res.ok) {
        setQuickNote('');
        fetchRecentNotes(token); // Refresh the list
      }
    } catch (e) {
      console.error('Failed to save note', e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="app-container"><div className="spinner">Verifying auth...</div></div>;
  }

  if (!token) {
    return (
      <div className="app-container center">
        <h2>Note App Extension</h2>
        <p>Please log in to your Note App account to use the extension.</p>
        <button className="primary-btn" onClick={handleLogin}>Log In</button>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="header">
        <h3>Quick Note</h3>
      </div>
      
      <div className="quick-note-section">
        <textarea
          value={quickNote}
          onChange={(e) => setQuickNote(e.target.value)}
          placeholder="Take a quick note..."
          autoFocus
          className="quick-note-input"
          rows={4}
        />
        <div className="actions">
          <button 
            className="primary-btn" 
            onClick={handleSave} 
            disabled={!quickNote.trim() || saving}
          >
            {saving ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </div>

      <div className="recent-notes-section">
        <h4>Recent Notes</h4>
        {notes.length === 0 ? (
          <p className="empty">No text notes yet.</p>
        ) : (
          <ul className="notes-list">
            {notes.map(note => (
              <li key={note._id} className="note-item" onClick={() => typeof chrome !== 'undefined' ? chrome.tabs.create({url: `${WEB_URL}/editor/${note._id}`}) : window.open(`${WEB_URL}/editor/${note._id}`)}>
                <div className="note-title">{note.title}</div>
                <div className="note-preview">{note.textContent ? note.textContent.substring(0, 50) + (note.textContent.length > 50 ? '...' : '') : 'Empty note'}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;
