import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { Ribbon } from './components/Ribbon';
import { LibrarySidebar } from './components/LibrarySidebar';
import { Editor } from './components/Editor';
import type { EditorRef } from './components/Editor';
import { LiveReader } from './components/LiveReader';
import { Preview } from './components/Preview';
import type { PreviewRef } from './components/Preview';
import { FindReplaceBar } from './components/FindReplaceBar';
import { ProtectedBlockModal } from './components/ProtectedBlockModal';
import { SettingsModal } from './components/SettingsModal';
import { AboutModal } from './components/AboutModal';
import { StatusBar } from './components/StatusBar';

import type { ViewMode, EditorSettings, ActiveFile, FindReplaceOptions, PaletteColor, LibraryDocument } from './types';
import { openFileFromDevice, saveFileToDevice, exportHtmlToDevice, isElectron } from './services/fileService';
import { exportToPDF } from './services/pdfService';
import { libraryService } from './services/libraryService';
import { DocumentHistory } from './core/history';
import { findMatches, replaceNext, replaceAll } from './core/findReplace';
import { ensureMdjEnvelope } from './core/frontMatter';
import { generateStandaloneHtml } from './core/htmlExport';
import { I18nProvider } from './i18n';

const DEFAULT_SETTINGS: EditorSettings = {
  theme: 'nord-midnight',
  language: 'en',
  fontFamily: 'inter',
  fontSize: 15,
  lineHeight: 1.6,
  maxWidth: 900,
  showLineNumbers: true,
  syncScroll: true,
  autoSave: true,
  showMetadata: false,
  treeDisplay: 'title-filename',
};

export function App() {
  const [folders, setFolders] = useState(() => libraryService.getFolders());
  const [documents, setDocuments] = useState(() => libraryService.getDocuments());

  // Active document loaded from library or initial file
  const [activeFile, setActiveFile] = useState<ActiveFile>(() => {
    const docs = libraryService.getDocuments();
    const firstDoc = docs[0];
    if (firstDoc) {
      return {
        id: firstDoc.id,
        name: firstDoc.name,
        folderId: firstDoc.folderId,
        content: firstDoc.content,
        isUnsaved: false,
        type: firstDoc.type,
        title: firstDoc.title,
        tags: firstDoc.tags,
      };
    }
    return {
      name: 'Welcome.md',
      content: '# Welcome\n',
      isUnsaved: false,
      type: 'markdown',
    };
  });

  const [viewMode, setViewMode] = useState<ViewMode>('live');
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [settings, setSettings] = useState<EditorSettings>(() => {
    const saved = localStorage.getItem('mark_mermaid_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.theme || parsed.theme === 'dark-glass') {
          parsed.theme = 'nord-midnight';
        }
        return { ...DEFAULT_SETTINGS, ...parsed };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isProtectModalOpen, setIsProtectModalOpen] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  // Document Undo/Redo History (Spec 006)
  const historyRef = useRef<DocumentHistory>(new DocumentHistory(activeFile.content));
  const [, setHistoryTick] = useState(0);

  // Find & Replace State (Spec 007)
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [findOptions, setFindOptions] = useState<FindReplaceOptions>({
    query: '',
    replacement: '',
    matchCase: false,
    wholeWord: false,
    scope: 'current',
  });
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const editorRef = useRef<EditorRef>(null);
  const liveReaderRef = useRef<EditorRef>(null);
  const previewRef = useRef<PreviewRef>(null);
  const isScrollingSync = useRef(false);

  const getActiveEditorRef = () => (viewMode === 'live' ? liveReaderRef.current : editorRef.current);

  // Sync settings to localStorage and notify Electron titleBarOverlay & native menu
  useEffect(() => {
    localStorage.setItem('mark_mermaid_settings', JSON.stringify(settings));
    if (settings.libraryPath) {
      libraryService.setLibraryPath(settings.libraryPath);
    }
    if (isElectron()) {
      if (window.electronAPI?.updateTheme) {
        window.electronAPI.updateTheme(settings.theme);
      }
      if (window.electronAPI?.updateLanguage && settings.language) {
        window.electronAPI.updateLanguage(settings.language);
      }
    }
  }, [settings]);

  // Auto-heal legacy arrow syntax in architecture diagrams
  useEffect(() => {
    if (activeFile.content.includes('ui:R --> engine')) {
      const fixed = activeFile.content
        .replace('ui:R --> engine', 'ui:R -- L:engine')
        .replace('engine:B --> db', 'engine:B -- T:db');
      setActiveFile((prev) => ({ ...prev, content: fixed }));
      if (activeFile.id) {
        libraryService.updateDocument(activeFile.id, { content: fixed });
        setDocuments(libraryService.getDocuments());
      }
    }
  }, [activeFile.content, activeFile.id]);

  // Handle active document switch
  const handleSelectDocument = (doc: LibraryDocument) => {
    if (activeFile.isUnsaved) {
      if (!window.confirm('Tienes cambios sin guardar en el documento actual. ¿Deseas abrir otro?')) {
        return;
      }
    }
    setActiveFile({
      id: doc.id,
      name: doc.name,
      folderId: doc.folderId,
      path: doc.path,
      content: doc.content,
      isUnsaved: false,
      type: doc.type,
      title: doc.title,
      tags: doc.tags,
    });
    historyRef.current.reset(doc.content);
    setHistoryTick((t) => t + 1);
  };

  // Content change handler
  const handleContentChange = (newContent: string, isTyping = false) => {
    historyRef.current.recordChange(newContent, isTyping);
    setHistoryTick((t) => t + 1);

    setActiveFile((prev) => {
      const updated = {
        ...prev,
        content: newContent,
        isUnsaved: true,
      };
      // Auto-save to library if document has an id
      if (prev.id && settings.autoSave) {
        libraryService.updateDocument(prev.id, { content: newContent });
        setDocuments(libraryService.getDocuments());
      }
      return updated;
    });
  };

  // History Undo & Redo
  const handleUndo = useCallback(() => {
    const prev = historyRef.current.undo();
    if (prev !== null) {
      setActiveFile((f) => ({ ...f, content: prev, isUnsaved: true }));
      setHistoryTick((t) => t + 1);
    }
  }, []);

  const handleRedo = useCallback(() => {
    const next = historyRef.current.redo();
    if (next !== null) {
      setActiveFile((f) => ({ ...f, content: next, isUnsaved: true }));
      setHistoryTick((t) => t + 1);
    }
  }, []);

  // Text insertion helper
  const handleInsertText = (before: string, after = '', defaultText = '') => {
    getActiveEditorRef()?.insertText(before, after, defaultText);
  };

  // New Document
  const handleNew = useCallback(() => {
    if (activeFile.isUnsaved) {
      if (!window.confirm('Tienes cambios sin guardar. ¿Deseas crear un nuevo documento?')) {
        return;
      }
    }
    const newDoc = libraryService.createDocument('Nuevo-documento.md', activeFile.folderId);
    setDocuments(libraryService.getDocuments());
    handleSelectDocument(newDoc);
  }, [activeFile]);

  // Open file from device
  const handleOpen = useCallback(async () => {
    const opened = await openFileFromDevice();
    if (opened) {
      // Add or open in library
      const newDoc = libraryService.createDocument(opened.name, undefined, opened.content);
      setDocuments(libraryService.getDocuments());
      handleSelectDocument(newDoc);
    }
  }, []);

  // Save document
  const handleSave = useCallback(async (forceSaveAs = false) => {
    const saved = await saveFileToDevice(activeFile, forceSaveAs);
    if (saved) {
      setActiveFile((prev) => ({
        ...prev,
        name: saved.name,
        path: saved.path,
        isUnsaved: false,
        type: saved.type,
      }));
      if (activeFile.id) {
        libraryService.updateDocument(activeFile.id, {
          name: saved.name,
          content: activeFile.content,
          path: saved.path,
        });
        setDocuments(libraryService.getDocuments());
      }
    }
  }, [activeFile]);

  // Sync Library with local disk
  const handleSyncLibrary = useCallback(async () => {
    if (settings.libraryPath) {
      await libraryService.syncWithDisk();
      setFolders(libraryService.getFolders());
      setDocuments(libraryService.getDocuments());
    }
  }, [settings.libraryPath]);

  // Auto-sync when window regains focus in Electron
  useEffect(() => {
    if (!isElectron()) return;
    const onFocus = () => {
      if (settings.libraryPath) {
        libraryService.syncWithDisk().then(() => {
          setFolders(libraryService.getFolders());
          setDocuments(libraryService.getDocuments());
        }).catch(() => {});
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [settings.libraryPath]);

  // Export to PDF
  const handleExportPDF = useCallback(async () => {
    const previewEl = previewRef.current?.getContainer();
    if (!previewEl) return;
    setIsExportingPDF(true);
    await exportToPDF(previewEl, activeFile.name.replace(/\.[^/.]+$/, ''));
    setIsExportingPDF(false);
  }, [activeFile]);

  // Export to HTML (Spec 001 US-07)
  const handleExportHTML = useCallback(async () => {
    const previewEl = previewRef.current?.getContainer();
    const bodyHtml = previewEl ? previewEl.innerHTML : activeFile.content;
    const standaloneHtml = generateStandaloneHtml({
      title: activeFile.title || activeFile.name,
      bodyHtml,
      metadata: { title: activeFile.title, tags: activeFile.tags },
    });
    const filename = `${activeFile.name.replace(/\.[^/.]+$/, '')}.html`;
    await exportHtmlToDevice(filename, standaloneHtml);
  }, [activeFile]);

  // Convert to MDJ (Spec 001 US-09, Spec 004 FR-011)
  const handleConvertToMdj = useCallback(() => {
    if (activeFile.type === 'mdj') return;
    const newContent = ensureMdjEnvelope(activeFile.content);
    historyRef.current.barrier(newContent);
    setHistoryTick((t) => t + 1);

    const newName = activeFile.name.replace(/\.[^/.]+$/, '') + '.mdj';
    setActiveFile((prev) => ({
      ...prev,
      name: newName,
      type: 'mdj',
      content: newContent,
      isUnsaved: true,
    }));
    if (activeFile.id) {
      libraryService.updateDocument(activeFile.id, {
        name: newName,
        type: 'mdj',
        content: newContent,
      });
      setDocuments(libraryService.getDocuments());
    }
  }, [activeFile]);

  // Apply Palette Color or Highlight (Spec 004)
  const handleApplyColor = (color: PaletteColor, isHighlight: boolean, isBlock: boolean) => {
    const directiveName = isHighlight ? 'highlight' : 'color';

    if (isBlock) {
      const before = `--${directiveName} {"color":"${color}"}\n`;
      const after = `\n--end\n`;
      handleInsertText(before, after, 'Texto dentro del bloque con color');
    } else {
      const selected = getActiveEditorRef()?.getSelectedText() || 'texto destacado';
      const inlineDirective = `:${directiveName}[${selected}]{color=${color}}`;
      getActiveEditorRef()?.insertText(inlineDirective, '', '');
    }
  };

  // Protected block creation callback
  const handleProtectedBlockCreated = (directiveContent: string) => {
    getActiveEditorRef()?.insertText(directiveContent, '', '');
    historyRef.current.barrier(activeFile.content + directiveContent);
    setHistoryTick((t) => t + 1);
  };

  // Lock all protected blocks
  const handleLockAll = () => {
    // Re-mount preview to reset memory decrypted state
    setActiveFile((prev) => ({ ...prev }));
  };

  // Find & Replace match computations
  const matches = useMemo(() => {
    if (!isFindOpen || !findOptions.query) return [];

    if (findOptions.scope === 'all') {
      const allMatches = [];
      for (const doc of documents) {
        const docMatches = findMatches(
          doc.content,
          {
            query: findOptions.query,
            matchCase: findOptions.matchCase,
            wholeWord: findOptions.wholeWord,
          },
          { id: doc.id, name: doc.name }
        );
        allMatches.push(...docMatches);
      }
      return allMatches;
    }

    return findMatches(activeFile.content, {
      query: findOptions.query,
      matchCase: findOptions.matchCase,
      wholeWord: findOptions.wholeWord,
    });
  }, [isFindOpen, findOptions, activeFile.content, documents]);

  // Navigate matches
  const handleNextMatch = useCallback(() => {
    if (matches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIdx);
    const m = matches[nextIdx];
    if (m && findOptions.scope === 'current') {
      getActiveEditorRef()?.selectRange(m.index, m.index + m.length);
    }
  }, [matches, currentMatchIndex, findOptions.scope]);

  const handlePrevMatch = useCallback(() => {
    if (matches.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(prevIdx);
    const m = matches[prevIdx];
    if (m && findOptions.scope === 'current') {
      getActiveEditorRef()?.selectRange(m.index, m.index + m.length);
    }
  }, [matches, currentMatchIndex, findOptions.scope]);

  // Replace Next
  const handleReplaceNext = () => {
    if (matches.length === 0 || findOptions.scope === 'all') return;
    const current = matches[currentMatchIndex] || matches[0];
    if (!current) return;

    const newContent = replaceNext(activeFile.content, current, findOptions.replacement);
    handleContentChange(newContent, false);
  };

  // Replace All
  const handleReplaceAll = () => {
    if (findOptions.scope === 'all') return;
    const { newContent, count } = replaceAll(activeFile.content, {
      query: findOptions.query,
      replacement: findOptions.replacement,
      matchCase: findOptions.matchCase,
      wholeWord: findOptions.wholeWord,
    });

    if (count > 0) {
      handleContentChange(newContent, false);
      alert(`Se reemplazaron ${count} coincidencias en el documento.`);
    }
  };

  const handleSelectDocumentMatch = (docId: string, match: any) => {
    const doc = libraryService.getDocumentById(docId);
    if (doc) {
      handleSelectDocument(doc);
      setTimeout(() => {
        editorRef.current?.selectRange(match.index, match.index + match.length);
      }, 50);
    }
  };

  // Listen to Electron native application menu actions (Spec 005)
  useEffect(() => {
    if (!isElectron() || !window.electronAPI?.onMenuAction) return;

    const removeListener = window.electronAPI.onMenuAction((action: string) => {
      switch (action) {
        case 'new-file':
          handleNew();
          break;
        case 'open-file':
          handleOpen();
          break;
        case 'save-file':
          handleSave(false);
          break;
        case 'save-as-file':
          handleSave(true);
          break;
        case 'open-preferences':
          setIsSettingsOpen(true);
          break;
        case 'undo':
          handleUndo();
          break;
        case 'redo':
          handleRedo();
          break;
        case 'find':
          setIsFindOpen(true);
          break;
        case 'replace':
          setIsFindOpen(true);
          break;
        case 'toggle-library':
          setIsLibraryOpen((prev) => !prev);
          break;
        case 'toggle-metadata':
          setSettings((prev) => ({ ...prev, showMetadata: !prev.showMetadata }));
          break;
        case 'view-live':
          setViewMode('live');
          break;
        case 'view-editor':
          setViewMode('editor');
          break;
        case 'view-split':
          setViewMode('split');
          break;
        case 'view-preview':
          setViewMode('preview');
          break;
        case 'export-pdf':
          handleExportPDF();
          break;
        case 'export-html':
          handleExportHTML();
          break;
        case 'open-about':
          setIsAboutOpen(true);
          break;
      }
    });

    return () => removeListener();
  }, [handleNew, handleOpen, handleSave, handleUndo, handleRedo, handleExportPDF, handleExportHTML]);

  // Global Keyboard Shortcuts (Ctrl+S, Ctrl+O, Ctrl+N, Ctrl+B, Ctrl+F, Ctrl+H, Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;

      if (isMod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave(e.shiftKey);
      } else if (isMod && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleOpen();
      } else if (isMod && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNew();
      } else if (isMod && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsLibraryOpen((prev) => !prev);
      } else if (isMod && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsFindOpen(true);
      } else if (isMod && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setIsFindOpen(true);
      } else if (isMod && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if (isMod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleOpen, handleNew, handleUndo, handleRedo]);

  // Synchronized scrolling
  const handleEditorScroll = (scrollTop: number, scrollHeight: number, clientHeight: number) => {
    if (!settings.syncScroll || isScrollingSync.current || viewMode !== 'split') return;
    isScrollingSync.current = true;

    const scrollPercentage = scrollTop / (scrollHeight - clientHeight || 1);
    previewRef.current?.scrollToPercentage(scrollPercentage);

    setTimeout(() => {
      isScrollingSync.current = false;
    }, 50);
  };

  // Full item path for tooltip and status bar (Spec 003 D4)
  const fullDocumentPath = activeFile.id
    ? libraryService.getItemPath(activeFile.id, 'doc')
    : activeFile.path || activeFile.name;

  return (
    <I18nProvider
      language={settings.language || 'en'}
      onLanguageChange={(newLang) => setSettings((prev) => ({ ...prev, language: newLang }))}
    >
      <div className={`app-root theme-${settings.theme} ${isElectron() ? 'is-electron' : ''}`}>
      {/* Top Header */}
      <Header
        activeFile={activeFile}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={() => handleSave(false)}
        onSaveAs={() => handleSave(true)}
        onExportPDF={handleExportPDF}
        onExportHTML={handleExportHTML}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
        isLibraryOpen={isLibraryOpen}
        onToggleLibrary={() => setIsLibraryOpen(!isLibraryOpen)}
        isExportingPDF={isExportingPDF}
        currentTheme={settings.theme}
        onToggleTheme={() =>
          setSettings((prev) => ({
            ...prev,
            theme: prev.theme === 'github-light' ? 'nord-midnight' : 'github-light',
          }))
        }
      />

      {/* Office-style Contextual Ribbon (Spec 005 & Spec 006) */}
      <Ribbon
        activeFile={activeFile}
        canUndo={historyRef.current.canUndo()}
        canRedo={historyRef.current.canRedo()}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSave={() => handleSave(false)}
        onOpenFind={() => setIsFindOpen(true)}
        onOpenReplace={() => setIsFindOpen(true)}
        onInsertText={handleInsertText}
        onApplyColor={handleApplyColor}
        onOpenProtectModal={() => setIsProtectModalOpen(true)}
        onLockAll={handleLockAll}
        onConvertToMdj={handleConvertToMdj}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isLibraryOpen={isLibraryOpen}
        onToggleLibrary={() => setIsLibraryOpen(!isLibraryOpen)}
        showMetadata={settings.showMetadata}
        onToggleMetadata={() =>
          setSettings((prev) => ({ ...prev, showMetadata: !prev.showMetadata }))
        }
        syncScroll={settings.syncScroll}
        onToggleSyncScroll={() =>
          setSettings((prev) => ({ ...prev, syncScroll: !prev.syncScroll }))
        }
      />

      {/* Find and Replace Bar (Spec 007) */}
      <FindReplaceBar
        isOpen={isFindOpen}
        onClose={() => setIsFindOpen(false)}
        options={findOptions}
        onOptionsChange={(newOpts) => setFindOptions((prev) => ({ ...prev, ...newOpts }))}
        matches={matches}
        currentMatchIndex={currentMatchIndex}
        onNextMatch={handleNextMatch}
        onPrevMatch={handlePrevMatch}
        onReplaceNext={handleReplaceNext}
        onReplaceAll={handleReplaceAll}
        onSelectDocumentMatch={handleSelectDocumentMatch}
      />

      {/* Main Workspace Area with Collapsible Sidebar */}
      <div className="workspace-layout">
        <LibrarySidebar
          isOpen={isLibraryOpen}
          onToggleOpen={() => setIsLibraryOpen(!isLibraryOpen)}
          folders={folders}
          documents={documents}
          activeDocumentId={activeFile.id}
          treeDisplay={settings.treeDisplay}
          onSelectDocument={handleSelectDocument}
          onCreateDocument={(folderId) => {
            const doc = libraryService.createDocument('Nuevo-documento.md', folderId);
            setDocuments(libraryService.getDocuments());
            handleSelectDocument(doc);
          }}
          onCreateFolder={async (parentId) => {
            const newFolder = await libraryService.createFolder('Nueva Carpeta', parentId);
            setFolders(libraryService.getFolders());
            return newFolder.id;
          }}
          onDeleteDocument={(docId) => {
            libraryService.deleteDocument(docId);
            const remaining = libraryService.getDocuments();
            setDocuments(remaining);
            if (activeFile.id === docId && remaining.length > 0) {
              handleSelectDocument(remaining[0]);
            }
          }}
          onDeleteFolder={async (folderId) => {
            await libraryService.deleteFolder(folderId);
            setFolders(libraryService.getFolders());
            const remaining = libraryService.getDocuments();
            setDocuments(remaining);
            if (remaining.length > 0) {
              handleSelectDocument(remaining[0]);
            }
          }}
          onRenameDocument={(docId, newName) => {
            libraryService.updateDocument(docId, { name: newName });
            setDocuments(libraryService.getDocuments());
            if (activeFile.id === docId) {
              setActiveFile((prev) => ({ ...prev, name: newName }));
            }
          }}
          onRenameFolder={async (folderId, newName) => {
            await libraryService.renameFolder(folderId, newName);
            setFolders(libraryService.getFolders());
          }}
          onToggleFolderExpand={(folderId) => {
            libraryService.toggleFolder(folderId);
            setFolders(libraryService.getFolders());
          }}
          onSyncLibrary={handleSyncLibrary}
        />

        <main className="app-workspace">
          {/* Live Reader Mode (Default View Mode) */}
          {viewMode === 'live' && (
            <LiveReader
              ref={liveReaderRef}
              activeFile={activeFile}
              settings={settings}
              onChange={handleContentChange}
              onScroll={handleEditorScroll}
              onCursorChange={(line, col) => setCursorPos({ line, col })}
              showMetadata={settings.showMetadata}
              onToggleMetadata={() =>
                setSettings((prev) => ({ ...prev, showMetadata: !prev.showMetadata }))
              }
              onSave={() => handleSave(false)}
            />
          )}

          {/* Editor Pane in Editor or Split Mode */}
          {(viewMode === 'editor' || viewMode === 'split') && (
            <section className="pane editor-pane">
              <Editor
                ref={editorRef}
                value={activeFile.content}
                onChange={handleContentChange}
                settings={settings}
                onScroll={handleEditorScroll}
                onCursorChange={(line, col) => setCursorPos({ line, col })}
              />
            </section>
          )}

          {/* Divider in Split Mode */}
          {viewMode === 'split' && <div className="split-divider" />}

          {/* Preview / Pure Reader Pane */}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <section className="pane preview-pane">
              <div className="preview-pane-header">
                <span className="pane-title">
                  {viewMode === 'preview'
                    ? (settings.language === 'es' ? '📖 Solo Lectura' : settings.language === 'pt' ? '📖 Apenas Leitor' : '📖 Pure Reader')
                    : (settings.language === 'es' ? '👁️ Vista Previa' : settings.language === 'pt' ? '👁️ Live Preview' : '👁️ Live Preview')}
                </span>
                {activeFile.type === 'mdj' && (
                  <span className="mdj-preview-badge">
                    {settings.language === 'es' ? 'MDJ 1.2 Directivas Activas' : settings.language === 'pt' ? 'MDJ 1.2 Diretivas Ativas' : 'MDJ 1.2 Active Directives'}
                  </span>
                )}
              </div>
              <Preview
                ref={previewRef}
                activeFile={activeFile}
                settings={settings}
                showMetadata={settings.showMetadata}
                onToggleMetadata={() =>
                  setSettings((prev) => ({ ...prev, showMetadata: !prev.showMetadata }))
                }
              />
            </section>
          )}
        </main>
      </div>

      {/* Status Bar Footer */}
      <StatusBar
        activeFile={activeFile}
        cursorLine={cursorPos.line}
        cursorCol={cursorPos.col}
        fullPath={fullDocumentPath}
      />

      {/* Settings Modal (Spec 003) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newSet) => setSettings((prev) => ({ ...prev, ...newSet }))}
        onOpenAbout={() => setIsAboutOpen(true)}
      />

      {/* About Modal (Spec 003 US-21) */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      {/* Password Protection Modal (Spec 002 US-16) */}
      <ProtectedBlockModal
        isOpen={isProtectModalOpen}
        onClose={() => setIsProtectModalOpen(false)}
        selectedText={getActiveEditorRef()?.getSelectedText() || ''}
        onSuccess={handleProtectedBlockCreated}
      />
    </div>
    </I18nProvider>
  );
}

export default App;
