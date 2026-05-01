import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFolderStore } from '../store/folderStore';
import { useNoteStore } from '../store/noteStore';
import Sidebar from '../components/Sidebar';
import { Alert } from '../components/Alert';
import type { NoteType } from '@note-app/shared';
import {
  PlusIcon,
  PencilSquareIcon,
  DocumentTextIcon,
  TrashIcon,
  EllipsisVerticalIcon,
  XMarkIcon,
  PencilIcon,
  SwatchIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';

const CARD_STYLE_COUNT = 9;

export default function DashboardPage() {
  const navigate = useNavigate();
  const { folders, activeFolderId, fetchFolders } = useFolderStore();
  const { notes, isLoading, fetchNotes, deleteNote, updateNote } = useNoteStore();
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteType, setNewNoteType] = useState<NoteType>('text');
  const [newNoteFolderId, setNewNoteFolderId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [stylePickerId, setStylePickerId] = useState<string | null>(null);
  const [moveFolderId, setMoveFolderId] = useState<string | null>(null);

  useEffect(() => {
    fetchFolders();
    fetchNotes(null);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => { setOpenMenuId(null); setStylePickerId(null); setMoveFolderId(null); };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const activeFolder = folders.find((f) => f._id === activeFolderId);
  const contentTitle = activeFolder ? activeFolder.name : 'All Notes';

  const handleCreateNote = () => {
    if (!newNoteTitle.trim()) return;
    const params = new URLSearchParams({
      title: newNoteTitle.trim(),
      type: newNoteType,
      ...(newNoteFolderId ? { folderId: newNoteFolderId } : {}),
    });
    navigate(`/editor/new?${params.toString()}`);
    setShowNewNoteModal(false);
    setNewNoteTitle('');
  };

  const handleOpenNewNoteModal = () => {
    setNewNoteFolderId(activeFolderId);
    setShowNewNoteModal(true);
  };

  const handleDeleteNote = async (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    setOpenMenuId(null);
    const confirmed = await Alert.confirm('Delete this note?', 'This action cannot be undone.', 'Delete');
    if (confirmed) {
      await deleteNote(noteId);
    }
  };

  const handleChangeCardStyle = async (e: React.MouseEvent, noteId: string, style: number) => {
    e.stopPropagation();
    setStylePickerId(null);
    setOpenMenuId(null);
    await updateNote(noteId, { cardStyle: style });
  };

  const handleMoveToFolder = async (e: React.MouseEvent, noteId: string, folderId: string | null) => {
    e.stopPropagation();
    setMoveFolderId(null);
    setOpenMenuId(null);
    await updateNote(noteId, { folderId });
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
            onClick={handleOpenNewNoteModal}
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
                style={{ backgroundImage: `url(/cards/card-${note.cardStyle ?? 0}.png)` }}
                onClick={() => navigate(`/editor/${note._id}`)}
              >
                {/* Settings menu - top right */}
                <div className="note-card-menu-container">
                  <button
                    className="note-card-menu-trigger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStylePickerId(null);
                      setMoveFolderId(null);
                      setOpenMenuId(openMenuId === note._id ? null : note._id);
                    }}
                  >
                    <EllipsisVerticalIcon style={{ width: 16, height: 16 }} />
                  </button>

                  {openMenuId === note._id && (
                    <div className="note-card-dropdown" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="dropdown-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMoveFolderId(null);
                          setStylePickerId(stylePickerId === note._id ? null : note._id);
                        }}
                      >
                        <SwatchIcon style={{ width: 14, height: 14 }} /> Change Style
                      </button>

                      {stylePickerId === note._id && (
                        <div className="card-style-picker" onClick={(e) => e.stopPropagation()}>
                          {Array.from({ length: CARD_STYLE_COUNT }, (_, i) => (
                            <div
                              key={i}
                              className={`card-style-option ${(note.cardStyle ?? 0) === i ? 'selected' : ''}`}
                              onClick={(e) => handleChangeCardStyle(e, note._id, i)}
                            >
                              <img src={`/cards/card-${i}.png`} alt={`Style ${i + 1}`} />
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        className="dropdown-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStylePickerId(null);
                          setMoveFolderId(moveFolderId === note._id ? null : note._id);
                        }}
                      >
                        <FolderIcon style={{ width: 14, height: 14 }} /> Change Folder
                      </button>

                      {moveFolderId === note._id && (
                        <div className="card-folder-picker" onClick={(e) => e.stopPropagation()}>
                          <div 
                            className={`folder-picker-item ${!note.folderId ? 'selected' : ''}`}
                            onClick={(e) => handleMoveToFolder(e, note._id, null)}
                          >
                            All Notes
                          </div>
                          {folders.map(f => (
                            <div 
                              key={f._id}
                              className={`folder-picker-item ${note.folderId === f._id ? 'selected' : ''}`}
                              onClick={(e) => handleMoveToFolder(e, note._id, f._id)}
                            >
                              <div className="folder-dot" style={{ backgroundColor: f.color }} />
                              <span className="folder-name">{f.name}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        className="dropdown-item danger"
                        onClick={(e) => handleDeleteNote(e, note._id)}
                      >
                        <TrashIcon style={{ width: 14, height: 14 }} /> Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Content - centered */}
                <div className="note-card-info">
                  <div className="note-card-title">{note.title}</div>
                  <span className={`note-card-type ${note.type}`}>
                    {note.type === 'handwriting' ? <PencilIcon style={{ width: 12, height: 12 }} /> : <DocumentTextIcon style={{ width: 12, height: 12 }} />} {note.type}
                  </span>
                  <span className="note-card-date">{formatDate(note.updatedAt)}</span>
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
                <label className="form-label">Folder</label>
                <select 
                  className="form-input form-select"
                  value={newNoteFolderId || ''}
                  onChange={(e) => setNewNoteFolderId(e.target.value || null)}
                >
                  <option value="">All Notes</option>
                  {folders.map(f => (
                    <option key={f._id} value={f._id}>{f.name}</option>
                  ))}
                </select>
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
