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
  onCreateFolder: (parentId?: string) => void;
  onDeleteDocument: (docId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameDocument: (docId: string, newName: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onToggleFolderExpand: (folderId: string) => void;
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
}) => {
  const [filterText, setFilterText] = useState('');
  const { t } = useI18n();

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
      return <span className="doc-primary-title">{doc.title || doc.name}</span>;
    }
    if (treeDisplay === 'filename') {
      return <span className="doc-primary-title">{doc.name}</span>;
    }
    // 'title-filename'
    return (
      <div className="doc-title-group">
        <span className="doc-primary-title">{doc.title || doc.name}</span>
        {doc.title && doc.title !== doc.name && <span className="doc-sub-filename">{doc.name}</span>}
      </div>
    );
  };

  const handlePromptRenameFolder = (folder: LibraryFolder, e: React.MouseEvent) => {
    e.stopPropagation();
    const newName = window.prompt(t.sidebar.promptRename, folder.name);
    if (newName && newName.trim() && newName !== folder.name) {
      onRenameFolder(folder.id, newName.trim());
    }
  };

  const handlePromptRenameDoc = (doc: LibraryDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    const newName = window.prompt(t.sidebar.promptRename, doc.name);
    if (newName && newName.trim() && newName !== doc.name) {
      onRenameDocument(doc.id, newName.trim());
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
                <span className="folder-name">{folder.name}</span>

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
                    onClick={(e) => handlePromptRenameFolder(folder, e)}
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
              {renderDocLabel(doc)}

              <div className="item-actions">
                <button
                  className="item-action-btn"
                  onClick={(e) => handlePromptRenameDoc(doc, e)}
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
          <button
            className="icon-btn-xs"
            onClick={() => onCreateDocument()}
            title={t.sidebar.newDoc}
          >
            <Plus size={15} />
          </button>
          <button
            className="icon-btn-xs"
            onClick={() => onCreateFolder()}
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
