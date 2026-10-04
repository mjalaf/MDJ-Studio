import React from 'react';
import { 
  X, 
  Palette, 
  Type, 
  Layout, 
  Sliders, 
  Folder, 
  FolderOpen, 
  ExternalLink, 
  Info,
  Globe,
  Check
} from 'lucide-react';
import type { EditorSettings, AppTheme, TreeDisplayMode, AppLanguage } from '../types';
import { isElectron, selectLibraryDirectory, revealPathInExplorer } from '../services/fileService';
import { useI18n, languages } from '../i18n';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: EditorSettings;
  onUpdateSettings: (newSettings: Partial<EditorSettings>) => void;
  onOpenAbout: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onOpenAbout,
}) => {
  if (!isOpen) return null;

  const { t, language, setLanguage } = useI18n();

  const themes: Array<{ id: AppTheme; name: string; icon: string; previewColor: string }> = [
    { id: 'dark-glass', name: 'Dark Fintech (Obsidian)', icon: '🔮', previewColor: '#6c5ce7' },
    { id: 'github-light', name: 'White Modern (Clean)', icon: '☀️', previewColor: '#5e50ee' },
    { id: 'system', name: 'System (Auto)', icon: '💻', previewColor: '#6366f1' },
    { id: 'nord-midnight', name: 'Nord Midnight', icon: '❄️', previewColor: '#3b82f6' },
    { id: 'sepia', name: 'Sepia Editorial', icon: '📜', previewColor: '#b45309' },
    { id: 'cyberpunk', name: 'Cyberpunk Neon', icon: '🌆', previewColor: '#ec4899' },
  ];

  const handleSelectFolder = async () => {
    const dir = await selectLibraryDirectory();
    if (dir) {
      onUpdateSettings({ libraryPath: dir });
    }
  };

  const handleOpenExplorer = async () => {
    if (settings.libraryPath) {
      await revealPathInExplorer(settings.libraryPath);
    }
  };

  const handleLanguageChange = (langId: AppLanguage) => {
    setLanguage(langId);
    onUpdateSettings({ language: langId });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Sliders size={20} />
            <h2>{t.settings.title}</h2>
          </div>
          <button className="close-btn" onClick={onClose} title={t.find.close}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Section: Language Selection (English Principal / Español / Português) */}
          <div className="setting-section">
            <div className="section-label">
              <Globe size={16} />
              <span>{t.settings.languageSection}</span>
            </div>
            <div className="theme-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {languages.map((lang) => {
                const isSelected = (settings.language || language) === lang.id;
                return (
                  <button
                    key={lang.id}
                    className={`theme-card ${isSelected ? 'active' : ''}`}
                    onClick={() => handleLanguageChange(lang.id)}
                    style={{ position: 'relative' }}
                  >
                    <span className="theme-icon" style={{ fontSize: '20px' }}>{lang.flag}</span>
                    <span className="theme-name" style={{ fontWeight: 600 }}>{lang.name}</span>
                    {isSelected && (
                      <Check size={14} style={{ position: 'absolute', top: '8px', right: '8px', color: 'var(--accent)' }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Themes (Spec 003 US-17) */}
          <div className="setting-section">
            <div className="section-label">
              <Palette size={16} />
              <span>{t.settings.themeSection}</span>
            </div>
            <div className="theme-grid">
              {themes.map((tItem) => (
                <button
                  key={tItem.id}
                  className={`theme-card ${settings.theme === tItem.id ? 'active' : ''}`}
                  onClick={() => onUpdateSettings({ theme: tItem.id })}
                >
                  <span className="theme-icon">{tItem.icon}</span>
                  <span className="theme-name">{tItem.name}</span>
                  <div className="theme-indicator" style={{ background: tItem.previewColor }} />
                </button>
              ))}
            </div>
          </div>

          {/* Section: Library Storage & Folder Location (Spec 003 US-18) */}
          <div className="setting-section">
            <div className="section-label">
              <Folder size={16} />
              <span>{t.settings.librarySection}</span>
            </div>

            {isElectron() ? (
              <div className="library-path-card">
                <div className="path-display-row">
                  <span className="path-label">{t.settings.rootFolder}</span>
                  <span className="path-value">
                    {settings.libraryPath || 'c:\\Google-Code\\MU01\\library'}
                  </span>
                </div>
                <div className="path-actions">
                  <button className="secondary-btn-sm" onClick={handleSelectFolder}>
                    <FolderOpen size={14} />
                    <span>{t.settings.changeFolder}</span>
                  </button>
                  <button
                    className="secondary-btn-sm"
                    onClick={handleOpenExplorer}
                    disabled={!settings.libraryPath}
                  >
                    <ExternalLink size={14} />
                    <span>{t.settings.openExplorer}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="web-storage-notice">
                <p>
                  {t.settings.webNotice}
                </p>
              </div>
            )}

            {/* Tree display format (Spec 003 D3 / US-19) */}
            <div className="setting-row" style={{ marginTop: '14px' }}>
              <label>{t.settings.treeDisplayFormat}</label>
              <select
                value={settings.treeDisplay}
                onChange={(e) =>
                  onUpdateSettings({ treeDisplay: e.target.value as TreeDisplayMode })
                }
                className="setting-select"
              >
                <option value="title-filename">{t.settings.treeTitleFilename}</option>
                <option value="title">{t.settings.treeTitleOnly}</option>
                <option value="filename">{t.settings.treeFilenameOnly}</option>
              </select>
            </div>
          </div>

          {/* Section: Typography */}
          <div className="setting-section">
            <div className="section-label">
              <Type size={16} />
              <span>{t.settings.typographySection}</span>
            </div>

            <div className="setting-row">
              <label>{t.settings.fontFamily}</label>
              <select
                value={settings.fontFamily}
                onChange={(e) => onUpdateSettings({ fontFamily: e.target.value as any })}
                className="setting-select"
              >
                <option value="inter">Inter (Modern Sans-Serif)</option>
                <option value="fira-code">Fira Code (Monospace Technical)</option>
                <option value="serif">Merriweather (Serif Editorial)</option>
                <option value="system">System Default</option>
              </select>
            </div>

            <div className="setting-row">
              <label>{t.settings.fontSize} ({settings.fontSize}px)</label>
              <input
                type="range"
                min="12"
                max="24"
                value={settings.fontSize}
                onChange={(e) => onUpdateSettings({ fontSize: Number(e.target.value) })}
                className="setting-slider"
              />
            </div>

            <div className="setting-row">
              <label>{t.settings.lineHeight} ({settings.lineHeight})</label>
              <input
                type="range"
                min="1.2"
                max="2.2"
                step="0.1"
                value={settings.lineHeight}
                onChange={(e) => onUpdateSettings({ lineHeight: Number(e.target.value) })}
                className="setting-slider"
              />
            </div>
          </div>

          {/* Section: Layout & Behavior */}
          <div className="setting-section">
            <div className="section-label">
              <Layout size={16} />
              <span>{t.settings.editorOptions}</span>
            </div>

            <div className="setting-row">
              <label>{t.settings.maxWidth} ({settings.maxWidth}px)</label>
              <input
                type="range"
                min="600"
                max="1400"
                step="50"
                value={settings.maxWidth}
                onChange={(e) => onUpdateSettings({ maxWidth: Number(e.target.value) })}
                className="setting-slider"
              />
            </div>

            <div className="setting-row checkbox-row">
              <label htmlFor="showLineNumbers">{t.settings.showLineNumbers}</label>
              <input
                id="showLineNumbers"
                type="checkbox"
                checked={settings.showLineNumbers}
                onChange={(e) => onUpdateSettings({ showLineNumbers: e.target.checked })}
              />
            </div>

            <div className="setting-row checkbox-row">
              <label htmlFor="syncScroll">{t.ribbon.actions.syncScroll}</label>
              <input
                id="syncScroll"
                type="checkbox"
                checked={settings.syncScroll}
                onChange={(e) => onUpdateSettings({ syncScroll: e.target.checked })}
              />
            </div>

            <div className="setting-row checkbox-row">
              <label htmlFor="showMetadata">{t.settings.showMetadata}</label>
              <input
                id="showMetadata"
                type="checkbox"
                checked={settings.showMetadata}
                onChange={(e) => onUpdateSettings({ showMetadata: e.target.checked })}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer settings-modal-footer">
          <button
            className="secondary-btn-about"
            onClick={() => {
              onClose();
              onOpenAbout();
            }}
          >
            <Info size={15} />
            <span>{t.settings.aboutButton}</span>
          </button>

          <button className="primary-btn-lg" onClick={onClose}>
            {t.header.save}
          </button>
        </div>
      </div>
    </div>
  );
};
