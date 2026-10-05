import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  GitFork,
  FileCode2,
  Plus,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  Trash2,
  Edit2,
  Search,
  PanelLeftClose,
  PanelLeft,
  RefreshCw,
} from 'lucide-react';
import type { LibraryDocument, LibraryFolder, TreeDisplayMode } from '../types';
import { libraryService } from '../services/libraryService';
import { useI18n } from '../i18n';

interface LibrarySidebarProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  folders: LibraryFolder[];
  documents: LibraryDocument[];
  activeDocumentId?: string;
  treeDisplay: TreeDisplayMode;
  onSelectDocument: (doc: LibraryDocument) => void;
  onCreateDocument: (folderId?: string) => void;
  onCreateFolder: (parentId?: string) => Promise<string | void> | void;
  onDeleteDocument: (docId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameDocument: (docId: string, newName: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onToggleFolderExpand: (folderId: string) => void;
  onSyncLibrary?: () => Promise<void> | void;
}

export const LibrarySidebar: React.FC<LibrarySidebarProps> = ({
  isOpen,
  onToggleOpen,
  folders,
  documents,
  activeDocumentId,
  treeDisplay,
  onSelectDocument,
  onCreateDocument,
  onCreateFolder,
  onDeleteDocument,
  onDeleteFolder,
  onRenameDocument,
  onRenameFolder,
  onToggleFolderExpand,
  onSyncLibrary,
}) => {
  const [filterText, setFilterText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const { t } = useI18n();

  const handleSync = async () => {
    if (!onSyncLibrary || isSyncing) return;
    setIsSyncing(true);
    try {
      await onSyncLibrary();
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  if (!isOpen) {
    return (
      <aside className="sidebar-rail" title={t.sidebar.expand}>
        <button className="rail-toggle-btn" onClick={onToggleOpen}>
          <PanelLeft size={18} />
          <span className="rail-vertical-text">{t.sidebar.title}</span>
        </button>
      </aside>
    );
  }

  const getDocIcon = (doc: LibraryDocument) => {
    if (doc.type === 'mermaid') return <GitFork size={14} className="tree-icon mermaid-color" />;
    if (doc.type === 'mdj') return <FileCode2 size={14} className="tree-icon mdj-color" />;
    return <FileText size={14} className="tree-icon md-color" />;
  };

  const renderDocLabel = (doc: LibraryDocument) => {
    if (treeDisplay === 'title') {
      return <span className="doc-primary-title" onDoubleClick={(e) => startRenameDoc(doc, e)}>{doc.title || doc.name}</span>;
    }
    if (treeDisplay === 'filename') {
      return <span className="doc-primary-title" onDoubleClick={(e) => startRenameDoc(doc, e)}>{doc.name}</span>;
    }
    // 'title-filename'
    return (
      <div className="doc-title-group" onDoubleClick={(e) => startRenameDoc(doc, e)}>
        <span className="doc-primary-title">{doc.title || doc.name}</span>
        {doc.title && doc.title !== doc.name && <span className="doc-sub-filename">{doc.name}</span>}
      </div>
    );
  };

  const startRenameFolder = (folder: LibraryFolder, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingId(folder.id);
    setEditingName(folder.name);
  };

  const commitRenameFolder = (folderId: string) => {
    const trimmed = editingName.trim();
    const currentFolder = folders.find((f) => f.id === folderId);
    if (trimmed && currentFolder && trimmed !== currentFolder.name) {
      onRenameFolder(folderId, trimmed);
    }
    setEditingId(null);
  };

  const startRenameDoc = (doc: LibraryDocument, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingId(doc.id);
    setEditingName(doc.name);
  };

  const commitRenameDoc = (docId: string) => {
    const trimmed = editingName.trim();
    const currentDoc = documents.find((d) => d.id === docId);
    if (trimmed && currentDoc && trimmed !== currentDoc.name) {
      onRenameDocument(docId, trimmed);
    }
    setEditingId(null);
  };

  const handleCreateFolder = async (parentId?: string) => {
    const newId = await onCreateFolder(parentId);
    if (typeof newId === 'string') {
      setEditingId(newId);
      setEditingName('Nueva Carpeta');
    }
  };

  const handleConfirmDeleteFolder = (folder: LibraryFolder, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      window.confirm(
        t.sidebar.confirmDeleteFolder
      )
    ) {
      onDeleteFolder(folder.id);
    }
  };

  const handleConfirmDeleteDoc = (doc: LibraryDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t.sidebar.confirmDeleteDoc)) {
      onDeleteDocument(doc.id);
    }
  };

  // Filter documents if search text provided
  const filteredDocs = filterText.trim()
    ? documents.filter(
        (d) =>
          d.name.toLowerCase().includes(filterText.toLowerCase()) ||
          d.title.toLowerCase().includes(filterText.toLowerCase()) ||
          d.tags.some((tItem) => tItem.toLowerCase().includes(filterText.toLowerCase()))
      )
    : documents;

  // Render tree node recursive
  const renderFolderContents = (folderId?: string, level = 0) => {
    const subFolders = folders.filter((f) => f.parentId === folderId);
    const folderDocs = filteredDocs.filter((d) => d.folderId === folderId);

    return (
      <div className="tree-level" style={{ paddingLeft: level > 0 ? '12px' : '0' }}>
        {/* Subfolders */}
        {subFolders.map((folder) => {
          const pathTooltip = libraryService.getItemPath(folder.id, 'folder');
          const isExpanded = Boolean(folder.isExpanded);

          return (
            <div key={folder.id} className="folder-node-wrapper">
              <div
                className="tree-item folder-item"
                title={pathTooltip}
                onClick={() => onToggleFolderExpand(folder.id)}
              >
                <span className="chevron-toggle">
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
                {isExpanded ? (
                  <FolderOpen size={16} className="folder-icon open" />
                ) : (
                  <Folder size={16} className="folder-icon" />
                )}
                {editingId === folder.id ? (
                  <input
                    type="text"
                    className="inline-rename-input"
                    value={editingName}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitRenameFolder(folder.id);
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        setEditingId(null);
                      }
                    }}
                    onBlur={() => commitRenameFolder(folder.id)}
                  />
                ) : (
                  <span
                    className="folder-name"
                    onDoubleClick={(e) => startRenameFolder(folder, e)}
                  >
                    {folder.name}
                  </span>
                )}

                <div className="item-actions">
                  <button
                    className="item-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateDocument(folder.id);
                    }}
                    title={t.sidebar.newDoc}
                  >
                    <Plus size={13} />
                  </button>
                  <button
                    className="item-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateFolder(folder.id);
                    }}
                    title="Nueva subcarpeta"
                  >
                    <FolderPlus size={13} />
                  </button>
                  <button
                    className="item-action-btn"
                    onClick={(e) => startRenameFolder(folder, e)}
                    title={t.sidebar.rename}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    className="item-action-btn delete-btn"
                    onClick={(e) => handleConfirmDeleteFolder(folder, e)}
                    title={t.sidebar.delete}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {isExpanded && renderFolderContents(folder.id, level + 1)}
            </div>
          );
        })}

        {/* Documents in this folder */}
        {folderDocs.map((doc) => {
          const isActive = doc.id === activeDocumentId;
          const pathTooltip = libraryService.getItemPath(doc.id, 'doc');

          return (
            <div
              key={doc.id}
              className={`tree-item doc-item ${isActive ? 'active' : ''}`}
              title={pathTooltip}
              onClick={() => onSelectDocument(doc)}
            >
              {getDocIcon(doc)}
              {editingId === doc.id ? (
                <input
                  type="text"
                  className="inline-rename-input"
                  value={editingName}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitRenameDoc(doc.id);
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setEditingId(null);
                    }
                  }}
                  onBlur={() => commitRenameDoc(doc.id)}
                />
              ) : (
                renderDocLabel(doc)
              )}

              <div className="item-actions">
                <button
                  className="item-action-btn"
                  onClick={(e) => startRenameDoc(doc, e)}
                  title={t.sidebar.rename}
                >
                  <Edit2 size={13} />
                </button>
                <button
                  className="item-action-btn delete-btn"
                  onClick={(e) => handleConfirmDeleteDoc(doc, e)}
                  title={t.sidebar.delete}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <aside className="app-sidebar">
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-title">
          <Folder size={16} className="sidebar-header-icon" />
          <span>{t.sidebar.title}</span>
        </div>
        <div className="sidebar-header-actions">
          {onSyncLibrary && (
            <button
              className={`icon-btn-xs ${isSyncing ? 'spinning' : ''}`}
              onClick={handleSync}
              title="Sincronizar con disco"
              disabled={isSyncing}
            >
              <RefreshCw size={14} className={isSyncing ? 'spin-animation' : ''} />
            </button>
          )}
          <button
            className="icon-btn-xs"
            onClick={() => onCreateDocument()}
            title={t.sidebar.newDoc}
          >
            <Plus size={15} />
          </button>
          <button
            className="icon-btn-xs"
            onClick={() => handleCreateFolder()}
            title={t.sidebar.newFolder}
          >
            <FolderPlus size={15} />
          </button>
          <button
            className="icon-btn-xs"
            onClick={onToggleOpen}
            title={t.sidebar.collapse}
          >
            <PanelLeftClose size={15} />
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="sidebar-search-box">
        <Search size={13} className="search-icon" />
        <input
          type="text"
          placeholder={t.sidebar.filterPlaceholder}
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="sidebar-search-input"
        />
      </div>

      {/* Tree View */}
      <div className="sidebar-tree-container">
        {renderFolderContents(undefined, 0)}
      </div>
    </aside>
  );
};
