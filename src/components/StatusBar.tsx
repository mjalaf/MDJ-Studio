import React from 'react';
import { 
  FileText, 
  MapPin, 
  Sparkles, 
  Clock, 
  Check, 
  CircleDot, 
  Laptop, 
  Globe2, 
  FileCode2, 
  GitFork 
} from 'lucide-react';
import type { ActiveFile } from '../types';
import { isElectron } from '../services/fileService';
import { useI18n } from '../i18n';

interface StatusBarProps {
  activeFile: ActiveFile;
  cursorLine: number;
  cursorCol: number;
  fullPath?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  activeFile,
  cursorLine,
  cursorCol,
  fullPath,
}) => {
  const { t } = useI18n();
  const content = activeFile.content || '';
  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const displayLocation = fullPath || activeFile.path || activeFile.name;

  const getFormatBadge = () => {
    if (activeFile.type === 'mermaid') {
      return (
        <span className="status-format-badge mermaid">
          <GitFork size={13} />
          <span>Mermaid 11</span>
        </span>
      );
    }
    if (activeFile.type === 'mdj') {
      return (
        <span className="status-format-badge mdj">
          <Sparkles size={13} />
          <span>MDJ 1.2</span>
        </span>
      );
    }
    return (
      <span className="status-format-badge md">
        <FileCode2 size={13} />
        <span>CommonMark + GFM</span>
      </span>
    );
  };

  return (
    <footer className="app-statusbar">
      <div className="statusbar-left">
        {/* Save Status Indicator */}
        <span
          className={`status-item save-indicator ${activeFile.isUnsaved ? 'unsaved' : 'saved'}`}
          title={activeFile.isUnsaved ? t.ribbon.actions.undo : t.status.saved}
        >
          {activeFile.isUnsaved ? (
            <>
              <CircleDot size={13} className="unsaved-icon" />
              <span className="status-label">{t.status.unsaved}</span>
            </>
          ) : (
            <>
              <Check size={13} className="saved-icon" />
              <span className="status-label">{t.status.saved}</span>
            </>
          )}
        </span>

        <span className="status-divider">•</span>

        {/* Cursor Position */}
        <span className="status-item">
          <FileText size={13} className="status-icon" />
          <span>{t.status.line} {cursorLine}, {t.status.col} {cursorCol}</span>
        </span>

        <span className="status-divider">•</span>

        {/* Word and Character Count */}
        <span className="status-item">
          <span>{wordCount} {t.status.words}</span>
          <span className="sub-count">({charCount} {t.status.chars})</span>
        </span>

        <span className="status-divider">•</span>

        {/* Reading Time */}
        <span className="status-item">
          <Clock size={13} className="status-icon" />
          <span>~{readingTime} min</span>
        </span>

        <span className="status-divider">•</span>

        {/* Full Path with Hover Tooltip (Spec 003 D4 / US-20) */}
        <span className="status-item location-item" title={displayLocation}>
          <MapPin size={13} className="status-icon" />
          <span className="location-text">{displayLocation}</span>
        </span>
      </div>

      <div className="statusbar-right">
        {/* Format Badge */}
        {getFormatBadge()}

        <span className="status-divider">•</span>

        {/* Engine Badge */}
        <span
          className={`status-badge ${isElectron() ? 'desktop' : 'web'}`}
        >
          {isElectron() ? <Laptop size={13} /> : <Globe2 size={13} />}
          <span>{isElectron() ? 'Electron Native' : 'Web App'}</span>
        </span>
      </div>
    </footer>
  );
};
