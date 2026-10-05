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
  Check,
  Database,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { EditorSettings, AppTheme, TreeDisplayMode, AppLanguage } from '../types';
import { isElectron, selectLibraryDirectory, revealPathInExplorer } from '../services/fileService';
import { libraryService } from '../services/libraryService';
import { 
  storageManager, 
  type StorageProviderType, 
  type DatabaseStats, 
  type ConnectionTestResult, 
  type StorageConfig 
} from '../services/storage';
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

  const [storageConfig, setStorageConfig] = React.useState<StorageConfig>(() => storageManager.getConfig());
  const [selectedStorageTab, setSelectedStorageTab] = React.useState<StorageProviderType>(() => storageManager.getConfig().activeProvider);
  const [dbStats, setDbStats] = React.useState<DatabaseStats | null>(null);
  const [testingConnection, setTestingConnection] = React.useState(false);
  const [testResult, setTestResult] = React.useState<ConnectionTestResult | null>(null);
  const [configSaved, setConfigSaved] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    let mounted = true;
    storageManager.getDatabaseStats().then((stats) => {
      if (mounted) setDbStats(stats);
    });
    return () => { mounted = false; };
  }, [isOpen]);

  const refreshStats = async () => {
    const stats = await storageManager.getDatabaseStats();
    setDbStats(stats);
  };

  const handleExportSqlite = async () => {
    try {
      await storageManager.exportSqliteFile();
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const handleImportSqlite = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (window.confirm(t.settings.importConfirm)) {
      try {
        await storageManager.importSqliteFile(file);
        await libraryService.reloadFromStorage();
        await refreshStats();
        alert('Base de datos SQLite importada correctamente.');
      } catch (err: any) {
        alert('Error al importar SQLite: ' + (err.message || String(err)));
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await storageManager.testProviderConnection(selectedStorageTab);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Error de conexión' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveStorageConfig = () => {
    storageManager.saveConfig({
      ...storageConfig,
      activeProvider: selectedStorageTab,
    });
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2500);
  };

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
      libraryService.setLibraryPath(dir);
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

          {/* Section: Storage & Cloud Architecture */}
          <div className="setting-section">
            <div className="section-label">
              <Database size={16} />
              <span>{t.settings.storageSection}</span>
            </div>

            {/* Provider Tabs */}
            <div className="storage-provider-tabs">
              <button 
                type="button"
                className={`storage-tab-btn ${selectedStorageTab === 'sqlite' ? 'active' : ''}`}
                onClick={() => { setSelectedStorageTab('sqlite'); setTestResult(null); }}
              >
                <span>🗄️</span> SQLite (Local WASM)
              </button>
              <button 
                type="button"
                className={`storage-tab-btn ${selectedStorageTab === 'azureblob' ? 'active' : ''}`}
                onClick={() => { setSelectedStorageTab('azureblob'); setTestResult(null); }}
              >
                <span>☁️</span> Azure Blob
              </button>
              <button 
                type="button"
                className={`storage-tab-btn ${selectedStorageTab === 's3' ? 'active' : ''}`}
                onClick={() => { setSelectedStorageTab('s3'); setTestResult(null); }}
              >
                <span>🪣</span> Amazon S3 / R2
              </button>
              <button 
                type="button"
                className={`storage-tab-btn ${selectedStorageTab === 'googledrive' ? 'active' : ''}`}
                onClick={() => { setSelectedStorageTab('googledrive'); setTestResult(null); }}
              >
                <span>📁</span> Google Drive
              </button>
              <button 
                type="button"
                className={`storage-tab-btn ${selectedStorageTab === 'onedrive' ? 'active' : ''}`}
                onClick={() => { setSelectedStorageTab('onedrive'); setTestResult(null); }}
              >
                <span>🏢</span> OneDrive
              </button>
            </div>

            {/* Tab content: SQLite */}
            {selectedStorageTab === 'sqlite' && (
              <div className="storage-panel">
                <div className="sqlite-status-header">
                  <div className="sqlite-badge">
                    <span className="badge-dot" />
                    <span>{t.settings.sqliteConnected}</span>
                  </div>
                  <span className="sqlite-engine-tag">{dbStats?.engine || 'SQLite 3 (WASM)'}</span>
                </div>
                <p className="storage-desc">{t.settings.sqliteDesc}</p>

                {dbStats && (
                  <div className="db-stats-grid">
                    <div className="db-stat-item">
                      <span className="stat-label">Documentos</span>
                      <span className="stat-val">{dbStats.documentCount}</span>
                    </div>
                    <div className="db-stat-item">
                      <span className="stat-label">Carpetas</span>
                      <span className="stat-val">{dbStats.folderCount}</span>
                    </div>
                    <div className="db-stat-item">
                      <span className="stat-label">Tamaño DB</span>
                      <span className="stat-val">{(dbStats.sizeBytes / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                )}

                <div className="storage-actions-row">
                  <button type="button" className="secondary-btn-sm" onClick={handleExportSqlite}>
                    <Download size={14} />
                    <span>{t.settings.exportSqlite}</span>
                  </button>
                  <label className="secondary-btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                    <Upload size={14} />
                    <span>{t.settings.importSqlite}</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".sqlite,.db"
                      style={{ display: 'none' }}
                      onChange={handleImportSqlite}
                    />
                  </label>
                  <button type="button" className="secondary-btn-sm" onClick={refreshStats}>
                    <RefreshCw size={14} />
                    <span>Actualizar</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab content: Azure Blob */}
            {selectedStorageTab === 'azureblob' && (
              <div className="storage-panel">
                <div className="cloud-config-form">
                  <div className="cloud-input-group">
                    <label>{t.settings.azureAccount}</label>
                    <input
                      type="text"
                      placeholder="ej. mistorageaccount"
                      value={storageConfig.azureBlob.accountName}
                      onChange={(e) => setStorageConfig({
                        ...storageConfig,
                        azureBlob: { ...storageConfig.azureBlob, accountName: e.target.value }
                      })}
                      className="setting-input"
                    />
                  </div>
                  <div className="cloud-input-group">
                    <label>{t.settings.azureContainer}</label>
                    <input
                      type="text"
                      placeholder="mdj-documents"
                      value={storageConfig.azureBlob.containerName}
                      onChange={(e) => setStorageConfig({
                        ...storageConfig,
                        azureBlob: { ...storageConfig.azureBlob, containerName: e.target.value }
                      })}
                      className="setting-input"
                    />
                  </div>
                  <div className="cloud-input-group">
                    <label>{t.settings.azureSas}</label>
                    <input
                      type="password"
                      placeholder="sp=r&st=...&sig=..."
                      value={storageConfig.azureBlob.sasToken}
                      onChange={(e) => setStorageConfig({
                        ...storageConfig,
                        azureBlob: { ...storageConfig.azureBlob, sasToken: e.target.value }
                      })}
                      className="setting-input"
                    />
                  </div>
                  <div className="cloud-action-row">
                    <button 
                      type="button" 
                      className="secondary-btn-sm" 
                      onClick={handleTestConnection}
                      disabled={testingConnection}
                    >
                      <span>{testingConnection ? t.settings.testing : t.settings.testConnection}</span>
                    </button>
                    <button 
                      type="button" 
                      className="primary-btn-sm" 
                      onClick={handleSaveStorageConfig}
                    >
                      <span>{configSaved ? '✓ Guardado' : t.settings.saveConfig}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab content: Amazon S3 */}
            {selectedStorageTab === 's3' && (
              <div className="storage-panel">
                <div className="cloud-config-form">
                  <div className="cloud-input-group">
                    <label>{t.settings.s3Endpoint}</label>
                    <input
                      type="text"
                      placeholder="https://<account>.r2.cloudflarestorage.com"
                      value={storageConfig.s3.endpoint}
                      onChange={(e) => setStorageConfig({
                        ...storageConfig,
                        s3: { ...storageConfig.s3, endpoint: e.target.value }
                      })}
                      className="setting-input"
                    />
                  </div>
                  <div className="cloud-input-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                    <div className="cloud-input-group">
                      <label>{t.settings.s3Bucket}</label>
                      <input
                        type="text"
                        placeholder="mi-bucket-mdj"
                        value={storageConfig.s3.bucket}
                        onChange={(e) => setStorageConfig({
                          ...storageConfig,
                          s3: { ...storageConfig.s3, bucket: e.target.value }
                        })}
                        className="setting-input"
                      />
                    </div>
                    <div className="cloud-input-group">
                      <label>{t.settings.s3Region}</label>
                      <input
                        type="text"
                        placeholder="us-east-1"
                        value={storageConfig.s3.region}
                        onChange={(e) => setStorageConfig({
                          ...storageConfig,
                          s3: { ...storageConfig.s3, region: e.target.value }
                        })}
                        className="setting-input"
                      />
                    </div>
                  </div>
                  <div className="cloud-input-group">
                    <label>{t.settings.s3AccessKey}</label>
                    <input
                      type="text"
                      placeholder="AKIAIOSFODNN7EXAMPLE"
                      value={storageConfig.s3.accessKeyId}
                      onChange={(e) => setStorageConfig({
                        ...storageConfig,
                        s3: { ...storageConfig.s3, accessKeyId: e.target.value }
                      })}
                      className="setting-input"
                    />
                  </div>
                  <div className="cloud-input-group">
                    <label>{t.settings.s3SecretKey}</label>
                    <input
                      type="password"
                      placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                      value={storageConfig.s3.secretAccessKey}
                      onChange={(e) => setStorageConfig({
                        ...storageConfig,
                        s3: { ...storageConfig.s3, secretAccessKey: e.target.value }
                      })}
                      className="setting-input"
                    />
                  </div>
                  <div className="cloud-action-row">
                    <button 
                      type="button" 
                      className="secondary-btn-sm" 
                      onClick={handleTestConnection}
                      disabled={testingConnection}
                    >
                      <span>{testingConnection ? t.settings.testing : t.settings.testConnection}</span>
                    </button>
                    <button 
                      type="button" 
                      className="primary-btn-sm" 
                      onClick={handleSaveStorageConfig}
                    >
                      <span>{configSaved ? '✓ Guardado' : t.settings.saveConfig}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab content: Google Drive */}
            {selectedStorageTab === 'googledrive' && (
              <div className="storage-panel">
                <div className="cloud-config-form">
                  <div className="cloud-input-group">
                    <label>{t.settings.googleClientId}</label>
                    <input
                      type="text"
                      placeholder="ej. 123456789-abc.apps.googleusercontent.com"
                      value={storageConfig.googleDrive.clientId}
                      onChange={(e) => setStorageConfig({
                        ...storageConfig,
                        googleDrive: { ...storageConfig.googleDrive, clientId: e.target.value }
                      })}
                      className="setting-input"
                    />
                  </div>
                  <div className="cloud-input-group">
                    <label>{t.settings.googleFolderId}</label>
                    <input
                      type="text"
                      placeholder="ID de carpeta en Google Drive"
                      value={storageConfig.googleDrive.folderId}
                      onChange={(e) => setStorageConfig({
                        ...storageConfig,
                        googleDrive: { ...storageConfig.googleDrive, folderId: e.target.value }
                      })}
                      className="setting-input"
                    />
                  </div>
                  <div className="cloud-action-row">
                    <button 
                      type="button" 
                      className="secondary-btn-sm" 
                      onClick={handleTestConnection}
                      disabled={testingConnection}
                    >
                      <span>{testingConnection ? t.settings.testing : t.settings.testConnection}</span>
                    </button>
                    <button 
                      type="button" 
                      className="primary-btn-sm" 
                      onClick={handleSaveStorageConfig}
                    >
                      <span>{configSaved ? '✓ Guardado' : t.settings.saveConfig}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab content: Microsoft OneDrive */}
            {selectedStorageTab === 'onedrive' && (
              <div className="storage-panel">
                <div className="cloud-config-form">
                  <div className="cloud-input-group">
                    <label>{t.settings.oneDriveClientId}</label>
                    <input
                      type="text"
                      placeholder="ej. 00000000-0000-0000-0000-000000000000"
                      value={storageConfig.oneDrive.clientId}
                      onChange={(e) => setStorageConfig({
                        ...storageConfig,
                        oneDrive: { ...storageConfig.oneDrive, clientId: e.target.value }
                      })}
                      className="setting-input"
                    />
                  </div>
                  <div className="cloud-input-group">
                    <label>{t.settings.oneDriveFolder}</label>
                    <input
                      type="text"
                      placeholder="/MDJ-Studio"
                      value={storageConfig.oneDrive.folderPath}
                      onChange={(e) => setStorageConfig({
                        ...storageConfig,
                        oneDrive: { ...storageConfig.oneDrive, folderPath: e.target.value }
                      })}
                      className="setting-input"
                    />
                  </div>
                  <div className="cloud-action-row">
                    <button 
                      type="button" 
                      className="secondary-btn-sm" 
                      onClick={handleTestConnection}
                      disabled={testingConnection}
                    >
                      <span>{testingConnection ? t.settings.testing : t.settings.testConnection}</span>
                    </button>
                    <button 
                      type="button" 
                      className="primary-btn-sm" 
                      onClick={handleSaveStorageConfig}
                    >
                      <span>{configSaved ? '✓ Guardado' : t.settings.saveConfig}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Connection Test Result Banner */}
            {testResult && (
              <div className={`test-result-banner ${testResult.success ? 'success' : 'error'}`}>
                {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{testResult.message}</span>
              </div>
            )}
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
