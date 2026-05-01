import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useFolderStore } from '../store/folderStore';
import { useNoteStore } from '../store/noteStore';
import { Alert } from './Alert';
import {
  MagnifyingGlassIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  XMarkIcon,
  ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/24/outline';

const FOLDER_COLORS = [
  '#D4763A', '#8B7EC8', '#4A90D9', '#3BAF7A',
  '#E85D5D', '#F5B731', '#E07BAD', '#3ABFB4',
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { folders, activeFolderId, setActiveFolderId, createFolder, deleteFolder } = useFolderStore();
  const { searchQuery, setSearchQuery, fetchNotes } = useNoteStore();
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    fetchNotes(activeFolderId);
  };

  const handleFolderClick = (folderId: string | null) => {
    setActiveFolderId(folderId);
    fetchNotes(folderId);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName.trim(), newFolderColor);
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const handleDeleteFolder = async (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    const confirmed = await Alert.confirm(
      'Delete this folder?',
      'All notes in this folder will also be deleted. This action cannot be undone.',
      'Delete',
    );
    if (confirmed) {
      await deleteFolder(folderId);
      fetchNotes(null);
    }
  };

  return (
    <div className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <img src="/tnote.png" alt="TNote" className="sidebar-logo" />
        <span className="sidebar-brand">TNote</span>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <div className="search-wrapper">
          <MagnifyingGlassIcon className="search-icon" style={{ width: 16, height: 16 }} />
          <input
            className="search-input"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            id="search-input"
          />
        </div>
      </div>

      {/* All Notes */}
      <div
        className={`all-notes-item ${activeFolderId === null ? 'active' : ''}`}
        onClick={() => handleFolderClick(null)}
      >
        <ClipboardDocumentListIcon style={{ width: 18, height: 18, flexShrink: 0 }} />
        <span>All Notes</span>
      </div>

      {/* Folders Header */}
      <div className="sidebar-section-title">
        <span>Folders</span>
        <button onClick={() => setShowNewFolder(true)} title="New folder"><PlusIcon style={{ width: 16, height: 16 }} /></button>
      </div>

      {/* New folder input */}
      {showNewFolder && (
        <div style={{ padding: '0 8px 8px' }}>
          <input
            className="form-input"
            placeholder="Folder name..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            autoFocus
            style={{ marginBottom: 8, fontSize: 13 }}
          />
          <div className="color-picker" style={{ marginBottom: 8 }}>
            {FOLDER_COLORS.map((c) => (
              <div
                key={c}
                className={`color-dot ${newFolderColor === c ? 'selected' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setNewFolderColor(c)}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-primary" onClick={handleCreateFolder} style={{ flex: 1, padding: '6px 12px', fontSize: 12 }}>
              Create
            </button>
            <button className="btn-secondary" onClick={() => setShowNewFolder(false)} style={{ padding: '6px 12px', fontSize: 12 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Folder List */}
      <div className="folder-list">
        {folders.map((folder) => (
          <div
            key={folder._id}
            className={`folder-item ${activeFolderId === folder._id ? 'active' : ''}`}
            onClick={() => handleFolderClick(folder._id)}
          >
            <div className="folder-dot" style={{ backgroundColor: folder.color }} />
            <span className="folder-name">{folder.name}</span>
            <button
              className="note-card-delete"
              onClick={(e) => handleDeleteFolder(e, folder._id)}
              style={{ opacity: 1, padding: '2px 6px', fontSize: 11 }}
              title="Delete folder"
            >
              <XMarkIcon style={{ width: 14, height: 14 }} />
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="user-profile">
          {user?.avatar ? (
            <img className="user-avatar" src={user.avatar} alt={user.displayName} />
          ) : (
            <div className="user-avatar-placeholder">
              {user?.displayName?.[0] || '?'}
            </div>
          )}
          <div className="user-info" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <span className="user-name" style={{ lineHeight: '1.2' }}>{user?.displayName || 'User'}</span>
            <span className="user-email" style={{ fontSize: 11, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || ''}</span>
          </div>
          <button className="logout-btn" onClick={logout} title="Logout">
            <ArrowRightStartOnRectangleIcon style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
