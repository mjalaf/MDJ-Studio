import React, { useState, useRef, useEffect } from 'react';
import {
  Undo2,
  Redo2,
  Save,
  Search,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Table as TableIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  GitFork,
  ChevronDown,
  Lock,
  LockKeyhole,
  FolderMinus,
  Sparkles,
  Columns,
  Edit3,
  Eye,
  PanelLeft,
  Tags,
  BookOpen,
} from 'lucide-react';
import { ColorPalettePicker } from './ColorPalettePicker';
import type { ViewMode, PaletteColor, ActiveFile } from '../types';
import { useI18n } from '../i18n';

interface RibbonProps {
  activeFile: ActiveFile;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onOpenFind: () => void;
  onOpenReplace: () => void;
  onInsertText: (before: string, after?: string, defaultText?: string) => void;
  onApplyColor: (color: PaletteColor, isHighlight: boolean, isBlock: boolean) => void;
  onOpenProtectModal: () => void;
  onLockAll: () => void;
  onConvertToMdj: () => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isLibraryOpen: boolean;
  onToggleLibrary: () => void;
  showMetadata: boolean;
  onToggleMetadata: () => void;
  syncScroll: boolean;
  onToggleSyncScroll: () => void;
}

export const Ribbon: React.FC<RibbonProps> = ({
  activeFile,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onOpenFind,
  onOpenReplace,
  onInsertText,
  onApplyColor,
  onOpenProtectModal,
  onLockAll,
  onConvertToMdj,
  viewMode,
  setViewMode,
  isLibraryOpen,
  onToggleLibrary,
  showMetadata,
  onToggleMetadata,
  syncScroll,
  onToggleSyncScroll,
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'view'>('home');
  const [showMermaidMenu, setShowMermaidMenu] = useState(false);
  const mermaidWrapperRef = useRef<HTMLDivElement>(null);
  const [mermaidMenuPos, setMermaidMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Menu is position: fixed so the ribbon's overflow/stacking can't clip it
  useEffect(() => {
    if (!showMermaidMenu) return;
    const rect = mermaidWrapperRef.current?.getBoundingClientRect();
    if (rect) {
      setMermaidMenuPos({
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(rect.right - 220, window.innerWidth - 228)),
      });
    }
    const close = (e: MouseEvent) => {
      if (mermaidWrapperRef.current && !mermaidWrapperRef.current.contains(e.target as Node)) {
        setShowMermaidMenu(false);
      }
    };
    const closeOnResize = () => setShowMermaidMenu(false);
    document.addEventListener('mousedown', close);
    window.addEventListener('resize', closeOnResize);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('resize', closeOnResize);
    };
  }, [showMermaidMenu]);
  const { t } = useI18n();

  const isMdj = activeFile.type === 'mdj';
  const isMermaidOnly = activeFile.type === 'mermaid';

  const insertMermaid = (templateType: string) => {
    setShowMermaidMenu(false);
    let template = '';
    switch (templateType) {
      case 'flowchart':
        template = `\`\`\`mermaid\ngraph TD\n    A[Inicio] --> B{¿Condición?}\n    B -->|Sí| C[Resultado OK]\n    B -->|No| D[Fin]\n\`\`\`\n`;
        break;
      case 'sequence':
        template = `\`\`\`mermaid\nsequenceDiagram\n    autonumber\n    Cliente->>Servidor: Petición HTTPS\n    Servidor-->>Cliente: Respuesta 200 OK\n\`\`\`\n`;
        break;
      case 'gantt':
        template = `\`\`\`mermaid\ngantt\n    title Cronograma\n    dateFormat YYYY-MM-DD\n    section Fase 1\n    Diseño :a1, 2026-10-01, 5d\n    section Fase 2\n    Desarrollo :after a1, 10d\n\`\`\`\n`;
        break;
      case 'class':
        template = `\`\`\`mermaid\nclassDiagram\n    class Documento {\n      +String titulo\n      +guardar()\n    }\n\`\`\`\n`;
        break;
      case 'mindmap':
        template = `\`\`\`mermaid\nmindmap\n  root((Ideas Proyecto))\n    Markdown\n      Tablas\n      Listas\n    Mermaid\n      Flujos\n      Secuencia\n\`\`\`\n`;
        break;
      case 'architecture':
        template = `\`\`\`mermaid\narchitecture-beta\n    group api(cloud)[Cloud Services]\n    service db(database)[DB] in api\n    service ui(internet)[Frontend] in api\n    ui:R -- L:db\n\`\`\`\n`;
        break;
      default:
        template = `\`\`\`mermaid\ngraph LR\n    A --> B\n\`\`\`\n`;
    }
    onInsertText(template, '');
  };

  const insertCollapse = () => {
    onInsertText('--collapse "Section Title"\n', '\n--end\n', 'Collapsible content here');
  };

  return (
    <div className="ribbon-container">
      {/* Top row: Quick Access Toolbar + Ribbon Tab Bar */}
      <div className="ribbon-top-bar">
        {/* Quick Access Toolbar */}
        <div className="quick-access-toolbar">
          <button
            className="qat-btn"
            onClick={onToggleLibrary}
            title={t.header.toggleSidebar}
          >
            <PanelLeft size={14} />
          </button>
          <button
            className="qat-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title={t.ribbon.actions.undo}
          >
            <Undo2 size={14} />
          </button>
          <button
            className="qat-btn"
            onClick={onRedo}
            disabled={!canRedo}
            title={t.ribbon.actions.redo}
          >
            <Redo2 size={14} />
          </button>
          <button className="qat-btn" onClick={onSave} title={t.header.saveTooltip}>
            <Save size={14} />
          </button>
          <button className="qat-btn" onClick={onOpenFind} title={t.ribbon.actions.find}>
            <Search size={14} />
          </button>
        </div>

        {/* Tab Headers */}
        <div className="ribbon-tabs">
          <button
            className={`ribbon-tab ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            {t.ribbon.tabs.home}
          </button>
          <button
            className={`ribbon-tab ${activeTab === 'view' ? 'active' : ''}`}
            onClick={() => setActiveTab('view')}
          >
            {t.ribbon.tabs.view}
          </button>
        </div>
      </div>

      {/* Ribbon Body containing command groups */}
      <div className="ribbon-body">
        {activeTab === 'home' && (
          <div className="ribbon-groups-row">
            {/* History / Undo Group */}
            <div className="ribbon-group">
              <div className="ribbon-group-controls">
                <button
                  className="tool-btn icon-only"
                  onClick={onUndo}
                  disabled={!canUndo}
                  title={t.ribbon.actions.undo}
                >
                  <Undo2 size={15} />
                </button>
                <button
                  className="tool-btn icon-only"
                  onClick={onRedo}
                  disabled={!canRedo}
                  title={t.ribbon.actions.redo}
                >
                  <Redo2 size={15} />
                </button>
              </div>
              <span className="ribbon-group-label">{t.ribbon.groups.history}</span>
            </div>

            <div className="ribbon-divider" />

            {/* Font Style Group */}
            <div className="ribbon-group">
              <div className="ribbon-group-controls">
                <button
                  className="tool-btn icon-only"
                  onClick={() => onInsertText('**', '**', 'bold')}
                  title={t.ribbon.actions.bold}
                >
                  <Bold size={15} />
                </button>
                <button
                  className="tool-btn icon-only"
                  onClick={() => onInsertText('*', '*', 'italic')}
                  title={t.ribbon.actions.italic}
                >
                  <Italic size={15} />
                </button>
                <button
                  className="tool-btn icon-only"
                  onClick={() => onInsertText('~~', '~~', 'strikethrough')}
                  title={t.ribbon.actions.strikethrough}
                >
                  <Strikethrough size={15} />
                </button>
                <button
                  className="tool-btn icon-only"
                  onClick={() => onInsertText('`', '`', 'code')}
                  title={t.ribbon.actions.inlineCode}
                >
                  <Code size={15} />
                </button>
              </div>
              <span className="ribbon-group-label">{t.ribbon.groups.font}</span>
            </div>

            <div className="ribbon-divider" />

            {/* Headings Group */}
            <div className="ribbon-group">
              <div className="ribbon-group-controls">
                <button
                  className="tool-btn icon-only"
                  onClick={() => onInsertText('# ', '', 'Title 1')}
                  title={t.ribbon.actions.h1}
                >
                  <Heading1 size={15} />
                </button>
                <button
                  className="tool-btn icon-only"
                  onClick={() => onInsertText('## ', '', 'Title 2')}
                  title={t.ribbon.actions.h2}
                >
                  <Heading2 size={15} />
                </button>
                <button
                  className="tool-btn icon-only"
                  onClick={() => onInsertText('### ', '', 'Title 3')}
                  title={t.ribbon.actions.h3}
                >
                  <Heading3 size={15} />
                </button>
              </div>
              <span className="ribbon-group-label">{t.ribbon.groups.headings}</span>
            </div>

            <div className="ribbon-divider" />

            {/* Paragraph Group */}
            <div className="ribbon-group">
              <div className="ribbon-group-controls">
                <button
                  className="tool-btn icon-only"
                  onClick={() => onInsertText('- ', '', 'Item')}
                  title={t.ribbon.actions.bulletList}
                >
                  <List size={15} />
                </button>
                <button
                  className="tool-btn icon-only"
                  onClick={() => onInsertText('1. ', '', 'Item')}
                  title={t.ribbon.actions.numberedList}
                >
                  <ListOrdered size={15} />
                </button>
                <button
                  className="tool-btn icon-only"
                  onClick={() => onInsertText('- [ ] ', '', 'Task')}
                  title={t.ribbon.actions.taskList}
                >
                  <CheckSquare size={15} />
                </button>
                <button
                  className="tool-btn icon-only"
                  onClick={() => onInsertText('> ', '', 'Quote')}
                  title={t.ribbon.actions.quote}
                >
                  <Quote size={15} />
                </button>
              </div>
              <span className="ribbon-group-label">{t.ribbon.groups.paragraph}</span>
            </div>

            <div className="ribbon-divider" />

            {/* Insert Elements Group */}
            <div className="ribbon-group">
              <div className="ribbon-group-controls">
                <button
                  className="tool-btn icon-only"
                  onClick={() =>
                    onInsertText(
                      '| Column 1 | Column 2 |\n| :--- | :--- |\n| Data A | Data B |\n'
                    )
                  }
                  title={t.ribbon.actions.table}
                >
                  <TableIcon size={15} />
                </button>
                <button
                  className="tool-btn icon-only"
                  onClick={() => onInsertText('[', '](https://example.com)', 'Link Text')}
                  title={t.ribbon.actions.link}
                >
                  <LinkIcon size={15} />
                </button>
                <button
                  className="tool-btn icon-only"
                  onClick={() =>
                    onInsertText('![', '](https://via.placeholder.com/600x300)', 'Image Description')
                  }
                  title={t.ribbon.actions.image}
                >
                  <ImageIcon size={15} />
                </button>

                {/* Mermaid Dropdown */}
                <div className="mermaid-dropdown-wrapper" ref={mermaidWrapperRef}>
                  <button
                    className="tool-btn ribbon-btn-labeled mermaid-btn"
                    onClick={() => setShowMermaidMenu(!showMermaidMenu)}
                    title={t.ribbon.actions.mermaid}
                  >
                    <GitFork size={15} />
                    <span>Mermaid</span>
                    <ChevronDown size={12} />
                  </button>
                  {showMermaidMenu && (
                    <div
                      className="mermaid-menu-dropdown"
                      style={{ top: mermaidMenuPos.top, left: mermaidMenuPos.left }}
                    >
                      <button onClick={() => insertMermaid('flowchart')}>
                        📊 {t.ribbon.actions.mermaidFlowchart}
                      </button>
                      <button onClick={() => insertMermaid('sequence')}>
                        🔄 {t.ribbon.actions.mermaidSequence}
                      </button>
                      <button onClick={() => insertMermaid('gantt')}>
                        📅 {t.ribbon.actions.mermaidGantt}
                      </button>
                      <button onClick={() => insertMermaid('class')}>
                        🏗️ {t.ribbon.actions.mermaidClass}
                      </button>
                      <button onClick={() => insertMermaid('mindmap')}>
                        🧠 {t.ribbon.actions.mermaidMindmap}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <span className="ribbon-group-label">{t.ribbon.groups.insert}</span>
            </div>

            <div className="ribbon-divider" />

            {/* Colors Group (Spec 004 & Spec 006) */}
            <div className="ribbon-group">
              <div className="ribbon-group-controls">
                <ColorPalettePicker
                  onApplyColor={onApplyColor}
                  disabled={isMermaidOnly}
                />
              </div>
              <span className="ribbon-group-label">{t.ribbon.groups.mdjColors}</span>
            </div>

            <div className="ribbon-divider" />

            {/* MDJ Directives Group (Spec 002) */}
            <div className="ribbon-group">
              <div className="ribbon-group-controls">
                <button
                  className="tool-btn ribbon-btn-labeled"
                  onClick={insertCollapse}
                  disabled={isMermaidOnly}
                  title={t.ribbon.actions.collapseBlock}
                >
                  <FolderMinus size={15} />
                  <span>{t.ribbon.actions.collapseBlock}</span>
                </button>

                <button
                  className="tool-btn ribbon-btn-labeled protect-btn"
                  onClick={onOpenProtectModal}
                  disabled={isMermaidOnly}
                  title={t.ribbon.actions.protectBlock}
                >
                  <Lock size={15} />
                  <span>{t.ribbon.actions.protectBlock}</span>
                </button>

                <button
                  className="tool-btn icon-only"
                  onClick={onLockAll}
                  disabled={isMermaidOnly}
                  title={t.ribbon.actions.lockAll}
                >
                  <LockKeyhole size={15} />
                </button>
              </div>
              <span className="ribbon-group-label">{t.ribbon.groups.mdjDirectives}</span>
            </div>

            <div className="ribbon-divider" />

            {/* Format & Conversion Group */}
            <div className="ribbon-group">
              <div className="ribbon-group-controls">
                <button
                  className={`tool-btn ribbon-btn-labeled convert-btn ${!isMdj && !isMermaidOnly ? 'active' : ''}`}
                  onClick={onConvertToMdj}
                  disabled={isMdj || isMermaidOnly}
                  title={
                    isMdj
                      ? t.ribbon.actions.convertToMdjActive
                      : t.ribbon.actions.convertToMdj
                  }
                >
                  <Sparkles size={15} />
                  <span>{isMdj ? t.ribbon.actions.convertToMdjActive : t.ribbon.actions.convertToMdj}</span>
                </button>
              </div>
              <span className="ribbon-group-label">{t.ribbon.groups.format}</span>
            </div>

            <div className="ribbon-divider" />

            {/* Find & Replace Group (Spec 007) */}
            <div className="ribbon-group">
              <div className="ribbon-group-controls">
                <button
                  className="tool-btn ribbon-btn-labeled"
                  onClick={onOpenFind}
                  title={t.ribbon.actions.find}
                >
                  <Search size={15} />
                  <span>{t.ribbon.actions.find.split(' ')[0]}</span>
                </button>
                <button
                  className="tool-btn ribbon-btn-labeled"
                  onClick={onOpenReplace}
                  title={t.ribbon.actions.replace}
                >
                  <span>{t.ribbon.actions.replace.split(' ')[0]}</span>
                </button>
              </div>
              <span className="ribbon-group-label">{t.ribbon.groups.editing}</span>
            </div>
          </div>
        )}

        {activeTab === 'view' && (
          <div className="ribbon-groups-row">
            {/* Panels & Sidebar Group */}
            <div className="ribbon-group">
              <div className="ribbon-group-controls">
                <button
                  className={`tool-btn ribbon-btn-labeled ${isLibraryOpen ? 'active' : ''}`}
                  onClick={onToggleLibrary}
                  title={t.header.toggleSidebar}
                >
                  <PanelLeft size={16} />
                  <span>{t.ribbon.actions.libraryPanel}</span>
                </button>
                <button
                  className={`tool-btn ribbon-btn-labeled ${showMetadata ? 'active' : ''}`}
                  onClick={onToggleMetadata}
                  title={t.ribbon.actions.metadataPanel}
                >
                  <Tags size={16} />
                  <span>{t.ribbon.actions.metadataPanel}</span>
                </button>
              </div>
              <span className="ribbon-group-label">{t.ribbon.groups.panels}</span>
            </div>

            <div className="ribbon-divider" />

            {/* View Mode Group */}
            <div className="ribbon-group">
              <div className="ribbon-group-controls">
                <button
                  className={`tool-btn ribbon-btn-labeled ${viewMode === 'live' ? 'active' : ''}`}
                  onClick={() => setViewMode('live')}
                  title={t.header.viewLiveTooltip}
                >
                  <BookOpen size={15} />
                  <span>{t.header.viewLive}</span>
                </button>
                <button
                  className={`tool-btn ribbon-btn-labeled ${viewMode === 'split' ? 'active' : ''}`}
                  onClick={() => setViewMode('split')}
                  title={t.header.viewSplitTooltip}
                >
                  <Columns size={15} />
                  <span>{t.header.viewSplit}</span>
                </button>
                <button
                  className={`tool-btn ribbon-btn-labeled ${viewMode === 'editor' ? 'active' : ''}`}
                  onClick={() => setViewMode('editor')}
                  title={t.header.viewEditorTooltip}
                >
                  <Edit3 size={15} />
                  <span>{t.header.viewEditor}</span>
                </button>
                <button
                  className={`tool-btn ribbon-btn-labeled ${viewMode === 'preview' ? 'active' : ''}`}
                  onClick={() => setViewMode('preview')}
                  title={t.header.viewReaderTooltip}
                >
                  <Eye size={15} />
                  <span>{t.header.viewReader}</span>
                </button>
              </div>
              <span className="ribbon-group-label">{t.ribbon.groups.viewMode}</span>
            </div>

            <div className="ribbon-divider" />

            {/* Scrolling Behavior */}
            <div className="ribbon-group">
              <div className="ribbon-group-controls checkbox-control">
                <label className="ribbon-checkbox-label">
                  <input
                    type="checkbox"
                    checked={syncScroll}
                    onChange={onToggleSyncScroll}
                  />
                  <span>{t.ribbon.actions.syncScroll}</span>
                </label>
              </div>
              <span className="ribbon-group-label">{t.ribbon.groups.behavior}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
