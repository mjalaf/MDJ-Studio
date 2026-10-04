export type ViewMode = 'live' | 'split' | 'editor' | 'preview';

export type AppLanguage = 'en' | 'es' | 'pt';

export type AppTheme = 'system' | 'dark-glass' | 'github-light' | 'cyberpunk' | 'sepia' | 'nord-midnight';

export type DocumentType = 'markdown' | 'mermaid' | 'mdj';

export type TreeDisplayMode = 'title-filename' | 'title' | 'filename';

export type PaletteColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'gray';

export interface EditorSettings {
  theme: AppTheme;
  language: AppLanguage;
  fontFamily: 'inter' | 'fira-code' | 'serif' | 'system';
  fontSize: number; // in px
  lineHeight: number; // e.g. 1.6
  maxWidth: number; // in px
  showLineNumbers: boolean;
  syncScroll: boolean;
  autoSave: boolean;
  showMetadata: boolean;
  treeDisplay: TreeDisplayMode;
  libraryPath?: string;
}

export interface ActiveFile {
  id?: string;
  name: string;
  path?: string;
  folderId?: string;
  content: string;
  isUnsaved: boolean;
  type: DocumentType;
  title?: string;
  tags?: string[];
  isReadOnly?: boolean;
}

export interface LibraryFolder {
  id: string;
  name: string;
  parentId?: string;
  isExpanded?: boolean;
}

export interface LibraryDocument {
  id: string;
  name: string;
  folderId?: string;
  path?: string;
  title: string;
  tags: string[];
  content: string;
  updatedAt: number;
  type: DocumentType;
}

export interface FindReplaceOptions {
  query: string;
  replacement: string;
  matchCase: boolean;
  wholeWord: boolean;
  scope: 'current' | 'all';
}

export interface SearchMatch {
  index: number;
  length: number;
  line: number;
  text: string;
  documentId?: string;
  documentName?: string;
  contextBefore?: string;
  matchText?: string;
  contextAfter?: string;
}

export interface ElectronAPI {
  isElectron?: boolean;
  openFile: () => Promise<{ filePath: string; filename: string; content: string } | null>;
  saveFile: (data: { filePath?: string; content: string }) => Promise<{ filePath: string; filename: string } | null>;
  exportPDF: (htmlContent: string) => Promise<boolean>;
  exportHTML: (data: { defaultFilename?: string; htmlContent: string }) => Promise<boolean>;
  selectDirectory: () => Promise<string | null>;
  openPath: (targetPath: string) => Promise<boolean>;
  onMenuAction: (callback: (action: string) => void) => () => void;
  updateTheme?: (theme: string) => Promise<boolean>;
  updateLanguage?: (language: AppLanguage) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
