import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useFolderStore } from '../store/folderStore';
import { useNoteStore } from '../store/noteStore';

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
    if (confirm('Delete this folder and all its notes?')) {
      await deleteFolder(folderId);
      fetchNotes(null);
    }
  };

  return (
    <div className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">📝</div>
        <span className="sidebar-brand">TNote</span>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
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
        <span className="all-notes-icon">📋</span>
        <span>All Notes</span>
      </div>

      {/* Folders Header */}
      <div className="sidebar-section-title">
        <span>Folders</span>
        <button onClick={() => setShowNewFolder(true)} title="New folder">+</button>
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
              ✕
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
          <span className="user-name">{user?.displayName || 'User'}</span>
          <button className="logout-btn" onClick={logout} title="Logout">
            ↪
          </button>
        </div>
      </div>
    </div>
  );
}
