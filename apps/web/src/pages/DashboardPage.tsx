import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFolderStore } from '../store/folderStore';
import { useNoteStore } from '../store/noteStore';
import { useAuthStore } from '../store/authStore';
import Sidebar from '../components/Sidebar';
import { Alert } from '../components/Alert';
import type { NoteType } from '@note-app/shared';
import {
  PlusIcon,
  PencilSquareIcon,
  DocumentTextIcon,
  StarIcon,
  TrashIcon,
  EllipsisVerticalIcon,
  XMarkIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { folders, activeFolderId, fetchFolders } = useFolderStore();
  const { notes, isLoading, fetchNotes, deleteNote } = useNoteStore();
  const { user, updateQuickNote } = useAuthStore();
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteType, setNewNoteType] = useState<NoteType>('text');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    fetchFolders();
    fetchNotes(null);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
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

  const handleDeleteNote = async (e: React.MouseEvent, note: { _id: string; isQuickNote?: boolean }) => {
    e.stopPropagation();
    setOpenMenuId(null);
    if (note.isQuickNote) {
      Alert.error(
        'Cannot delete Quick Note',
        'To delete it, first change your Quick Note to another text note.'
      );
      return;
    }
    const confirmed = await Alert.confirm('Delete this note?', 'This action cannot be undone.', 'Delete');
    if (confirmed) {
      await deleteNote(note._id);
    }
  };

  const handleSetQuickNote = async (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    setOpenMenuId(null);
    try {
      await updateQuickNote(noteId);
      Alert.successToast('Quick Note updated!');
    } catch {
      Alert.error('Failed to update Quick Note.');
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
            <PlusIcon style={{ width: 16, height: 16 }} />
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
            <PencilSquareIcon style={{ width: 48, height: 48, opacity: 0.4, color: 'var(--text-tertiary)' }} />
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
                      {note.type === 'handwriting' ? <PencilIcon style={{ width: 32, height: 32, color: 'var(--text-tertiary)', opacity: 0.5 }} /> : <DocumentTextIcon style={{ width: 32, height: 32, color: 'var(--text-tertiary)', opacity: 0.5 }} />}
                    </div>
                  )}
                </div>
                <div className="note-card-info">
                  <div className="note-card-title">
                    {note.isQuickNote && <StarIcon style={{ width: 14, height: 14, color: '#8B7EC8', marginRight: 4, flexShrink: 0 }} />}
                    {note.title}
                  </div>
                  <div className="note-card-meta">
                    <span className={`note-card-type ${note.type}`}>
                      {note.type === 'handwriting' ? <PencilIcon style={{ width: 12, height: 12 }} /> : <DocumentTextIcon style={{ width: 12, height: 12 }} />} {note.type}
                    </span>
                    <span>{formatDate(note.updatedAt)}</span>
                    <div className="note-card-menu-container">
                      <button
                        className="note-card-menu-trigger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === note._id ? null : note._id);
                        }}
                      >
                        <EllipsisVerticalIcon style={{ width: 16, height: 16 }} />
                      </button>

                      {openMenuId === note._id && (
                        <div className="note-card-dropdown" onClick={(e) => e.stopPropagation()}>
                          {note.type === 'text' && user?.quickNoteId !== note._id && (
                            <button
                              className="dropdown-item"
                              onClick={(e) => handleSetQuickNote(e, note._id)}
                            >
                              <StarIcon style={{ width: 14, height: 14 }} /> Set as Quick Note
                            </button>
                          )}
                          <button
                            className="dropdown-item danger"
                            onClick={(e) => handleDeleteNote(e, note)}
                          >
                            <TrashIcon style={{ width: 14, height: 14 }} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
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
              <button className="modal-close" onClick={() => setShowNewNoteModal(false)}><XMarkIcon style={{ width: 20, height: 20 }} /></button>
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
                    <DocumentTextIcon style={{ width: 28, height: 28 }} />
                    <div className="note-type-label">Text</div>
                    <div className="note-type-desc">Type your notes</div>
                  </div>
                  <div
                    className={`note-type-option ${newNoteType === 'handwriting' ? 'selected' : ''}`}
                    onClick={() => setNewNoteType('handwriting')}
                  >
                    <PencilIcon style={{ width: 28, height: 28 }} />
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
