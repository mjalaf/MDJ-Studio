import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Replace,
  ChevronUp,
  ChevronDown,
  X,
  CaseSensitive,
  WholeWord,
  FileText,
  FolderSearch,
} from 'lucide-react';
import type { FindReplaceOptions, SearchMatch } from '../types';
import { useI18n, formatText } from '../i18n';

interface FindReplaceBarProps {
  isOpen: boolean;
  onClose: () => void;
  options: FindReplaceOptions;
  onOptionsChange: (newOptions: Partial<FindReplaceOptions>) => void;
  matches: SearchMatch[];
  currentMatchIndex: number;
  onNextMatch: () => void;
  onPrevMatch: () => void;
  onReplaceNext: () => void;
  onReplaceAll: () => void;
  onSelectDocumentMatch?: (docId: string, match: SearchMatch) => void;
}

export const FindReplaceBar: React.FC<FindReplaceBarProps> = ({
  isOpen,
  onClose,
  options,
  onOptionsChange,
  matches,
  currentMatchIndex,
  onNextMatch,
  onPrevMatch,
  onReplaceNext,
  onReplaceAll,
  onSelectDocumentMatch,
}) => {
  const [showReplace, setShowReplace] = useState(false);
  const findInputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    if (isOpen) {
      findInputRef.current?.focus();
      findInputRef.current?.select();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        onPrevMatch();
      } else {
        onNextMatch();
      }
    } else if (e.key === 'F3') {
      e.preventDefault();
      if (e.shiftKey) {
        onPrevMatch();
      } else {
        onNextMatch();
      }
    }
  };

  const matchText =
    options.query.trim().length === 0
      ? ''
      : matches.length === 0
      ? t.find.noMatches
      : formatText(t.find.matchesCount, { current: currentMatchIndex + 1, total: matches.length });

  return (
    <div className="find-replace-container">
      <div className="find-row">
        {/* Toggle Replace Button */}
        <button
          className={`toggle-replace-btn ${showReplace ? 'active' : ''}`}
          onClick={() => setShowReplace(!showReplace)}
          title={t.ribbon.actions.replace}
        >
          <Replace size={15} />
        </button>

        {/* Find Input */}
        <div className="find-input-wrapper">
          <Search size={14} className="input-search-icon" />
          <input
            ref={findInputRef}
            type="text"
            className="find-input"
            value={options.query}
            onChange={(e) => onOptionsChange({ query: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder={t.find.findPlaceholder}
          />
        </div>

        {/* Match Count Indicator */}
        <span className="match-counter">{matchText}</span>

        {/* Match Options: Case & Whole Word */}
        <div className="find-options-group">
          <button
            className={`opt-btn ${options.matchCase ? 'active' : ''}`}
            onClick={() => onOptionsChange({ matchCase: !options.matchCase })}
            title={t.find.matchCase}
          >
            <CaseSensitive size={16} />
          </button>

          <button
            className={`opt-btn ${options.wholeWord ? 'active' : ''}`}
            onClick={() => onOptionsChange({ wholeWord: !options.wholeWord })}
            title={t.find.wholeWord}
          >
            <WholeWord size={16} />
          </button>
        </div>

        {/* Scope Selector: Current Document vs All Library */}
        <div className="find-scope-group">
          <button
            className={`scope-btn ${options.scope === 'current' ? 'active' : ''}`}
            onClick={() => onOptionsChange({ scope: 'current' })}
            title={t.find.scopeDoc}
          >
            <FileText size={14} />
            <span>Doc</span>
          </button>
          <button
            className={`scope-btn ${options.scope === 'all' ? 'active' : ''}`}
            onClick={() => onOptionsChange({ scope: 'all' })}
            title={t.find.scopeLib}
          >
            <FolderSearch size={14} />
            <span>{t.sidebar.title}</span>
          </button>
        </div>

        {/* Navigation: Prev / Next */}
        <div className="find-nav-group">
          <button
            className="nav-btn"
            onClick={onPrevMatch}
            disabled={matches.length === 0}
            title={t.find.previous}
          >
            <ChevronUp size={15} />
          </button>
          <button
            className="nav-btn"
            onClick={onNextMatch}
            disabled={matches.length === 0}
            title={t.find.next}
          >
            <ChevronDown size={15} />
          </button>
        </div>

        {/* Close Button */}
        <button className="find-close-btn" onClick={onClose} title={t.find.close}>
          <X size={15} />
        </button>
      </div>

      {/* Replace Row */}
      {showReplace && (
        <div className="replace-row">
          <div className="replace-input-wrapper">
            <input
              type="text"
              className="replace-input"
              value={options.replacement}
              onChange={(e) => onOptionsChange({ replacement: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onReplaceNext();
                }
              }}
              placeholder={t.find.replacePlaceholder}
            />
          </div>

          <div className="replace-actions">
            <button
              className="replace-btn"
              onClick={onReplaceNext}
              disabled={matches.length === 0 || options.scope === 'all'}
              title={t.find.replace}
            >
              {t.find.replace}
            </button>
            <button
              className="replace-btn replace-all"
              onClick={onReplaceAll}
              disabled={matches.length === 0 || options.scope === 'all'}
              title={t.find.replaceAll}
            >
              {t.find.replaceAll}
            </button>
          </div>
        </div>
      )}

      {/* Library-wide matches popup if scope === 'all' */}
      {options.scope === 'all' && matches.length > 0 && (
        <div className="library-matches-dropdown">
          <div className="library-matches-header">
            {formatText(t.find.resultsInLibrary, { count: matches.length })}
          </div>
          <div className="library-matches-list">
            {matches.map((m, idx) => (
              <div
                key={`${m.documentId}-${idx}`}
                className="library-match-item"
                onClick={() => m.documentId && onSelectDocumentMatch?.(m.documentId, m)}
              >
                <div className="match-doc-name">
                  <FileText size={13} />
                  <span>{m.documentName || 'Document'}</span>
                  <span className="match-line-badge">{t.status.line} {m.line}</span>
                </div>
                <div className="match-snippet">
                  ...{m.contextBefore}
                  <span className="match-highlight">{m.matchText}</span>
                  {m.contextAfter}...
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
