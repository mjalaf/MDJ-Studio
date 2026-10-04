import React, { useState } from 'react';
import { 
  FolderOpen, 
  Save, 
  Download, 
  Columns, 
  Edit3, 
  Eye, 
  Settings, 
  FilePlus,
  ChevronDown,
  FileCode,
  PanelLeft,
  Sparkles,
  Sun,
  Moon,
  Globe,
  BookOpen,
} from 'lucide-react';
import type { ViewMode, ActiveFile, AppTheme } from '../types';
import { isElectron } from '../services/fileService';
import { useI18n, languages } from '../i18n';

interface HeaderProps {
  activeFile: ActiveFile;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExportPDF: () => void;
  onExportHTML: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  isLibraryOpen: boolean;
  onToggleLibrary: () => void;
  isExportingPDF: boolean;
  currentTheme?: AppTheme;
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeFile,
  viewMode,
  setViewMode,
  onNew,
  onOpen,
  onSave,
  onExportPDF,
  onExportHTML,
  onOpenSettings,
  isLibraryOpen,
  onToggleLibrary,
  isExportingPDF,
  currentTheme,
  onToggleTheme,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const { t, language, setLanguage } = useI18n();

  return (
    <header className="app-header">
      {/* Title / Branding & Library Toggle */}
      <div className="header-left">
        <button
          className={`sidebar-toggle-top-btn ${isLibraryOpen ? 'active' : ''}`}
          onClick={onToggleLibrary}
          title={t.header.toggleSidebar}
        >
          <PanelLeft size={16} />
        </button>

        <div className="app-logo">
          <img src="/icon.png" className="app-brand-icon" alt="MDJ Studio" />
          <span className="logo-text">MDJ Studio</span>
          <span className="app-badge">{isElectron() ? t.header.desktop : t.header.web}</span>
        </div>

        <div className="file-info" title={activeFile.path || activeFile.name}>
          <span className="file-name">
            {activeFile.name}
            {activeFile.isUnsaved && <span className="unsaved-indicator">•</span>}
          </span>
          <span className={`file-type-tag ${activeFile.type}`}>
            {activeFile.type === 'mdj' ? (
              <span className="mdj-badge-text">
                <Sparkles size={11} /> MDJ 1.2
              </span>
            ) : (
              activeFile.type.toUpperCase()
            )}
          </span>
        </div>
      </div>

      {/* Center: View Mode Switcher */}
      <div className="header-center">
        <div className="view-mode-selector">
          <button
            className={`view-btn ${viewMode === 'live' ? 'active' : ''}`}
            onClick={() => setViewMode('live')}
            title={t.header.viewLiveTooltip}
          >
            <BookOpen size={14} />
            <span>{t.header.viewLive}</span>
          </button>

          <button
            className={`view-btn ${viewMode === 'split' ? 'active' : ''}`}
            onClick={() => setViewMode('split')}
            title={t.header.viewSplitTooltip}
          >
            <Columns size={14} />
            <span>{t.header.viewSplit}</span>
          </button>

          <button
            className={`view-btn ${viewMode === 'editor' ? 'active' : ''}`}
            onClick={() => setViewMode('editor')}
            title={t.header.viewEditorTooltip}
          >
            <Edit3 size={14} />
            <span>{t.header.viewEditor}</span>
          </button>

          <button
            className={`view-btn ${viewMode === 'preview' ? 'active' : ''}`}
            onClick={() => setViewMode('preview')}
            title={t.header.viewReaderTooltip}
          >
            <Eye size={14} />
            <span>{t.header.viewReader}</span>
          </button>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="header-right">
        <div className="action-group">
          <button className="icon-btn" onClick={onNew} title={t.header.newTooltip}>
            <FilePlus size={16} />
            <span className="btn-label">{t.header.new}</span>
          </button>

          <button className="icon-btn" onClick={onOpen} title={t.header.openTooltip}>
            <FolderOpen size={16} />
            <span className="btn-label">{t.header.open}</span>
          </button>

          <button className="icon-btn primary-btn" onClick={onSave} title={t.header.saveTooltip}>
            <Save size={16} />
            <span className="btn-label">{t.header.save}</span>
          </button>
        </div>

        <div className="header-divider" />

        {/* Export Dropdown (PDF and HTML) */}
        <div className="export-dropdown-wrapper">
          <button
            className="icon-btn export-btn"
            onClick={() => setShowExportMenu(!showExportMenu)}
            title={t.header.exportTooltip}
          >
            <Download size={16} />
            <span className="btn-label">{t.header.export}</span>
            <ChevronDown size={12} />
          </button>

          {showExportMenu && (
            <div className="export-menu-dropdown">
              <button
                onClick={() => {
                  setShowExportMenu(false);
                  onExportPDF();
                }}
                disabled={isExportingPDF}
              >
                <Download size={14} />
                <span>{isExportingPDF ? t.header.exportingPdf : t.header.exportPdf}</span>
              </button>
              <button
                onClick={() => {
                  setShowExportMenu(false);
                  onExportHTML();
                }}
              >
                <FileCode size={14} />
                <span>{t.header.exportHtml}</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Language Switcher */}
        <div className="export-dropdown-wrapper">
          <button
            className="icon-btn lang-toggle-btn"
            onClick={() => setShowLangMenu(!showLangMenu)}
            title={`Language / Idioma: ${language.toUpperCase()}`}
          >
            <Globe size={15} />
            <span className="lang-code-badge">{language.toUpperCase()}</span>
          </button>

          {showLangMenu && (
            <div className="export-menu-dropdown lang-menu-dropdown">
              {languages.map((l) => (
                <button
                  key={l.id}
                  className={language === l.id ? 'active-lang' : ''}
                  onClick={() => {
                    setLanguage(l.id);
                    setShowLangMenu(false);
                  }}
                >
                  <span className="lang-flag">{l.flag}</span>
                  <span>{l.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme Toggle Button */}
        {onToggleTheme && (
          <button
            className="icon-btn theme-toggle-btn"
            onClick={onToggleTheme}
            title={currentTheme === 'github-light' ? t.header.themeDark : t.header.themeLight}
          >
            {currentTheme === 'github-light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        )}

        <button className="icon-btn settings-btn" onClick={onOpenSettings} title={t.header.settings}>
          <Settings size={17} />
        </button>
      </div>
    </header>
  );
};

