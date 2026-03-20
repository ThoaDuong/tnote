import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFolderStore } from '../store/folderStore';
import { useNoteStore } from '../store/noteStore';
import Sidebar from '../components/Sidebar';
import type { NoteType } from '@note-app/shared';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { folders, activeFolderId, fetchFolders } = useFolderStore();
  const { notes, isLoading, fetchNotes, deleteNote } = useNoteStore();
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteType, setNewNoteType] = useState<NoteType>('text');

  useEffect(() => {
    fetchFolders();
    fetchNotes(null);
  }, []);

  const activeFolder = folders.find((f) => f._id === activeFolderId);
  const contentTitle = activeFolder ? activeFolder.name : 'All Notes';

  const handleCreateNote = () => {
    if (!newNoteTitle.trim()) return;
    // Navigate to editor with params
    const params = new URLSearchParams({
      title: newNoteTitle.trim(),
      type: newNoteType,
      ...(activeFolderId ? { folderId: activeFolderId } : {}),
    });
    navigate(`/editor/new?${params.toString()}`);
    setShowNewNoteModal(false);
    setNewNoteTitle('');
  };

  const handleDeleteNote = async (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    if (confirm('Delete this note?')) {
      await deleteNote(noteId);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="dashboard">
      <Sidebar />

      <div className="main-content">
        {/* Header */}
        <div className="content-header">
          <h1 className="content-title">{contentTitle}</h1>
          <button
            className="new-note-btn"
            onClick={() => setShowNewNoteModal(true)}
            id="new-note-btn"
          >
            <span>+</span>
            New Note
          </button>
        </div>

        {/* Notes Grid */}
        {isLoading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : notes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <div className="empty-title">No notes yet</div>
            <div className="empty-text">
              Create your first note to get started. Write text or draw with your Apple Pencil.
            </div>
          </div>
        ) : (
          <div className="notes-grid">
            {notes.map((note) => (
              <div
                key={note._id}
                className="note-card"
                onClick={() => navigate(`/editor/${note._id}`)}
              >
                <div className="note-card-preview">
                  {note.type === 'handwriting' && note.thumbnail ? (
                    <img src={note.thumbnail} alt={note.title} />
                  ) : note.type === 'text' && note.textContent ? (
                    <div className="preview-text">{note.textContent}</div>
                  ) : (
                    <div className="preview-icon">
                      {note.type === 'handwriting' ? '✏️' : '📄'}
                    </div>
                  )}
                </div>
                <div className="note-card-info">
                  <div className="note-card-title">{note.title}</div>
                  <div className="note-card-meta">
                    <span className={`note-card-type ${note.type}`}>
                      {note.type === 'handwriting' ? '✏️' : '📄'} {note.type}
                    </span>
                    <span>{formatDate(note.updatedAt)}</span>
                    <button
                      className="note-card-delete"
                      onClick={(e) => handleDeleteNote(e, note._id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Note Modal */}
      {showNewNoteModal && (
        <div className="modal-overlay" onClick={() => setShowNewNoteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create New Note</h2>
              <button className="modal-close" onClick={() => setShowNewNoteModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  className="form-input"
                  placeholder="My awesome note..."
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateNote()}
                  autoFocus
                  id="note-title-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <div className="note-type-selector">
                  <div
                    className={`note-type-option ${newNoteType === 'text' ? 'selected' : ''}`}
                    onClick={() => setNewNoteType('text')}
                  >
                    <div className="note-type-icon">📄</div>
                    <div className="note-type-label">Text</div>
                    <div className="note-type-desc">Type your notes</div>
                  </div>
                  <div
                    className={`note-type-option ${newNoteType === 'handwriting' ? 'selected' : ''}`}
                    onClick={() => setNewNoteType('handwriting')}
                  >
                    <div className="note-type-icon">✏️</div>
                    <div className="note-type-label">Handwriting</div>
                    <div className="note-type-desc">Draw with Apple Pencil</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowNewNoteModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreateNote} id="create-note-btn">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
