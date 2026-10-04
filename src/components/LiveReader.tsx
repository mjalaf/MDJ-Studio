import React, { useRef, useImperativeHandle, forwardRef, useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, 
  Edit3, 
  Sparkles, 
  Clock, 
  Type, 
  Lock, 
  Unlock, 
  Columns, 
  KeyRound, 
  AlertCircle,
  Code2
} from 'lucide-react';
import type { EditorSettings, ActiveFile } from '../types';
import type { EditorRef } from './Editor';
import { MermaidViewer } from './MermaidViewer';
import { parseFrontMatter } from '../core/frontMatter';
import { parseBlockDirectives, processInlineDirectives } from '../core/mdjDirectives';
import { decryptText } from '../core/cryptoService';
import { MetadataViewer } from './MetadataViewer';
import { marked } from 'marked';
import { htmlToMarkdown } from '../core/htmlToMarkdown';

interface LiveReaderProps {
  activeFile: ActiveFile;
  settings: EditorSettings;
  onChange: (val: string, isTyping?: boolean) => void;
  onScroll?: (scrollTop: number, scrollHeight: number, clientHeight: number) => void;
  onCursorChange?: (line: number, col: number) => void;
  showMetadata: boolean;
  onToggleMetadata: () => void;
  onSave?: () => void;
}

export type LiveReaderMode = 'reader' | 'writer' | 'hybrid';

/**
 * In-place editable visual segment.
 * Allows the user to type, format, and delete directly on the rendered HTML,
 * automatically converting the DOM state back to Markdown on input.
 */
interface VisualEditableSegmentProps {
  documentId: string;
  initialHtml: string;
  onMarkdownChange: (newMarkdown: string) => void;
  language: string;
  onSave?: () => void;
}

const VisualEditableSegment: React.FC<VisualEditableSegmentProps> = ({
  documentId,
  initialHtml,
  onMarkdownChange,
  language,
  onSave,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isTypingRef = useRef(false);
  const lastMarkdownEmittedRef = useRef<string | null>(null);

  // When documentId changes (switch document) or on initial mount, set innerHTML and reset typing state
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = initialHtml;
    isTypingRef.current = false;
    lastMarkdownEmittedRef.current = null;
  }, [documentId]);

  // When initialHtml changes externally while not typing
  useEffect(() => {
    if (!containerRef.current) return;
    if (!isTypingRef.current && containerRef.current.innerHTML !== initialHtml) {
      containerRef.current.innerHTML = initialHtml;
    }
  }, [initialHtml]);

  const handleInput = () => {
    if (!containerRef.current) return;
    const currentHtml = containerRef.current.innerHTML;
    try {
      const markdown = htmlToMarkdown(currentHtml);
      if (markdown !== lastMarkdownEmittedRef.current) {
        lastMarkdownEmittedRef.current = markdown;
        onMarkdownChange(markdown);
      }
    } catch (err) {
      console.warn('Failed to serialize HTML to Markdown:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleInput();
      onSave?.();
    }
  };

  return (
    <div
      ref={containerRef}
      className="visual-editable-content"
      contentEditable={true}
      suppressContentEditableWarning={true}
      onFocus={() => {
        isTypingRef.current = true;
      }}
      onBlur={() => {
        isTypingRef.current = false;
        handleInput();
      }}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      spellCheck={false}
      data-placeholder={
        language === 'es'
          ? 'Haz clic aquí para escribir directamente sobre el resultado...'
          : 'Click here to write directly on the formatted page...'
      }
    />
  );
};

/**
 * In-place editable Mermaid diagram card with live code editor drawer
 */
interface EditableMermaidCardProps {
  code: string;
  theme: string;
  language: string;
  onCodeChange: (newCode: string) => void;
}

const EditableMermaidCard: React.FC<EditableMermaidCardProps> = ({
  code,
  theme,
  language,
  onCodeChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentCode, setCurrentCode] = useState(code);

  useEffect(() => {
    setCurrentCode(code);
  }, [code]);

  return (
    <div className="live-diagram-wrapper live-diagram-interactive" contentEditable={false}>
      <div className="mermaid-edit-bar">
        <span className="mermaid-edit-badge">
          <Sparkles size={13} />
          <span>Mermaid Live</span>
        </span>
        <button
          type="button"
          className={`mermaid-edit-toggle ${isEditing ? 'active' : ''}`}
          onClick={() => setIsEditing(!isEditing)}
        >
          <Code2 size={13} />
          <span>
            {isEditing
              ? language === 'es'
                ? 'Ocultar Código'
                : 'Hide Code'
              : language === 'es'
              ? 'Editar Diagrama'
              : 'Edit Diagram'}
          </span>
        </button>
      </div>

      {isEditing && (
        <div className="mermaid-code-drawer">
          <textarea
            className="mermaid-code-textarea"
            value={currentCode}
            rows={5}
            onChange={(e) => {
              setCurrentCode(e.target.value);
              onCodeChange(e.target.value);
            }}
            placeholder="graph TD..."
            spellCheck={false}
          />
        </div>
      )}

      <MermaidViewer code={currentCode} theme={theme} />
    </div>
  );
};

export const LiveReader = forwardRef<EditorRef, LiveReaderProps>(({
  activeFile,
  settings,
  onChange,
  onScroll,
  onCursorChange,
  showMetadata,
  onToggleMetadata,
  onSave,
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Sub-mode inside Live Reader: default is 'reader' (Visual In-Place Editing on Result)
  const [liveMode, setLiveMode] = useState<LiveReaderMode>('reader');

  // Decrypted protected blocks state
  const [decryptedBlocks, setDecryptedBlocks] = useState<{ [blockId: string]: string }>({});
  const [passwords, setPasswords] = useState<{ [blockId: string]: string }>({});
  const [errors, setErrors] = useState<{ [blockId: string]: string }>({});

  // Auto-lock protected blocks after 10 min
  useEffect(() => {
    const timer = setTimeout(() => {
      setDecryptedBlocks({});
    }, 10 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [decryptedBlocks]);

  // Auto-fit textarea height in writer mode
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || liveMode !== 'writer') return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(260, textarea.scrollHeight)}px`;
  }, [activeFile.content, liveMode]);

  // Imperative Handle matching EditorRef
  useImperativeHandle(ref, () => ({
    insertText: (before: string, after: string = '', defaultText: string = '') => {
      if (liveMode === 'reader') {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
          if (before === '**') {
            document.execCommand('bold');
            return;
          }
          if (before === '*') {
            document.execCommand('italic');
            return;
          }
          if (before === '~~') {
            document.execCommand('strikeThrough');
            return;
          }
          if (before.startsWith('#')) {
            const level = Math.min(6, before.trim().length);
            document.execCommand('formatBlock', false, `<h${level}>`);
            return;
          }
          if (before === '- ') {
            document.execCommand('insertUnorderedList');
            return;
          }
          if (before === '1. ') {
            document.execCommand('insertOrderedList');
            return;
          }
          if (before === '> ') {
            document.execCommand('formatBlock', false, '<blockquote>');
            return;
          }
        }
      }

      // If in writer mode or inserting complex block, handle in textarea
      const textarea = textareaRef.current;
      if (!textarea) {
        setLiveMode('writer');
        setTimeout(() => {
          const ta = textareaRef.current;
          if (!ta) return;
          const start = ta.selectionStart;
          const end = ta.selectionEnd;
          const selectedText = activeFile.content.substring(start, end) || defaultText;
          const newValue =
            activeFile.content.substring(0, start) + before + selectedText + after + activeFile.content.substring(end);
          onChange(newValue, false);
        }, 50);
        return;
      }

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = activeFile.content.substring(start, end) || defaultText;
      const newValue =
        activeFile.content.substring(0, start) + before + selectedText + after + activeFile.content.substring(end);
      onChange(newValue, false);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + before.length,
          start + before.length + selectedText.length
        );
      }, 0);
    },
    focus: () => {
      if (liveMode === 'writer') {
        textareaRef.current?.focus();
      } else {
        const firstEditable = containerRef.current?.querySelector('.visual-editable-content') as HTMLElement;
        firstEditable?.focus();
      }
    },
    selectRange: (start: number, end: number) => {
      if (liveMode === 'reader') setLiveMode('writer');
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.focus();
        textarea.setSelectionRange(start, end);
        const linesBefore = activeFile.content.substring(0, start).split('\n').length;
        const lineHeightPx = settings.fontSize * settings.lineHeight;
        textarea.scrollTop = Math.max(0, (linesBefore - 5) * lineHeightPx);
      }, 50);
    },
    getSelectedText: () => {
      if (liveMode === 'reader') {
        return window.getSelection()?.toString() || '';
      }
      const textarea = textareaRef.current;
      if (!textarea) return '';
      return activeFile.content.substring(textarea.selectionStart, textarea.selectionEnd);
    },
  }));

  // Cursor updates
  const updateCursorPos = () => {
    if (!textareaRef.current || !onCursorChange) return;
    const pos = textareaRef.current.selectionStart;
    const lines = activeFile.content.substring(0, pos).split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    onCursorChange(line, col);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = activeFile.content.substring(0, start) + '  ' + activeFile.content.substring(end);
      onChange(newValue, false);
      setTimeout(() => {
        textarea.setSelectionRange(start + 2, start + 2);
      }, 0);
    }
  };

  // Password decryption
  const handleUnlock = async (blockId: string, salt: string, iv: string, ciphertext: string) => {
    const password = passwords[blockId];
    if (!password) {
      setErrors((prev) => ({
        ...prev,
        [blockId]: settings.language === 'es' ? 'Ingresa una contraseña' : 'Enter password',
      }));
      return;
    }

    try {
      const plaintext = await decryptText({ salt, iv, ciphertext }, password);
      setDecryptedBlocks((prev) => ({ ...prev, [blockId]: plaintext }));
      setErrors((prev) => ({ ...prev, [blockId]: '' }));
    } catch {
      setErrors((prev) => ({
        ...prev,
        [blockId]: settings.language === 'es' ? 'Contraseña incorrecta' : 'Incorrect password',
      }));
    }
  };

  const handleLock = (blockId: string) => {
    setDecryptedBlocks((prev) => {
      const copy = { ...prev };
      delete copy[blockId];
      return copy;
    });
    setPasswords((prev) => ({ ...prev, [blockId]: '' }));
  };

  // Document statistics
  const stats = useMemo(() => {
    const text = activeFile.content.trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const chars = text.length;
    const readingTimeMin = Math.max(1, Math.ceil(words / 200));
    return { words, chars, readingTimeMin };
  }, [activeFile.content]);

  // Extract Mermaid blocks to render live while in writer mode
  const embeddedMermaidBlocks = useMemo(() => {
    const regex = /```mermaid\s*\n([\s\S]*?)\n```/g;
    const blocks: { code: string; index: number }[] = [];
    let match;
    while ((match = regex.exec(activeFile.content)) !== null) {
      blocks.push({ code: match[1], index: match.index });
    }
    return blocks;
  }, [activeFile.content]);

  // Front matter parsing
  const frontMatter = useMemo(() => {
    return parseFrontMatter(activeFile.content);
  }, [activeFile.content]);

  // Rendered segments for reader / hybrid mode
  const renderedSegments = useMemo(() => {
    let contentToRender = frontMatter.body;
    contentToRender = parseBlockDirectives(contentToRender);
    contentToRender = processInlineDirectives(contentToRender);

    type Segment =
      | { type: 'html'; content: string; rawMarkdown: string; key: string }
      | { type: 'mermaid'; content: string; rawMarkdown: string; key: string }
      | { type: 'protect'; blockId: string; label: string; salt: string; iv: string; ciphertext: string; rawMarkdown: string; key: string };

    const segments: Segment[] = [];
    let lastIndex = 0;
    const combinedRegex = /(```mermaid\s*\n[\s\S]*?\n```)|(<div class="mdj-protected-block"[\s\S]*?<\/div>)/g;
    let match: RegExpExecArray | null;

    while ((match = combinedRegex.exec(contentToRender)) !== null) {
      const textBefore = contentToRender.substring(lastIndex, match.index);
      if (textBefore.trim()) {
        const rawHtml = marked.parse(textBefore, { gfm: true, breaks: true }) as string;
        segments.push({ 
          type: 'html', 
          content: rawHtml, 
          rawMarkdown: textBefore.trim(), 
          key: `html-${lastIndex}` 
        });
      }
      const matchedString = match[0];
      if (matchedString.startsWith('```mermaid')) {
        const m = matchedString.match(/```mermaid\s*\n([\s\S]*?)\n```/);
        segments.push({
          type: 'mermaid',
          content: m ? m[1] : '',
          rawMarkdown: matchedString,
          key: `mermaid-${match.index}`,
        });
      } else {
        const labelMatch = matchedString.match(/data-label="([^"]*)"/);
        const saltMatch = matchedString.match(/data-salt="([^"]*)"/);
        const ivMatch = matchedString.match(/data-iv="([^"]*)"/);
        const cipherMatch = matchedString.match(/data-ciphertext="([^"]*)"/);
        const blockId = `protect-${match.index}`;
        segments.push({
          type: 'protect',
          blockId,
          label: labelMatch ? decodeURIComponent(labelMatch[1]) : 'Contenido Protegido',
          salt: saltMatch ? saltMatch[1] : '',
          iv: ivMatch ? ivMatch[1] : '',
          ciphertext: cipherMatch ? cipherMatch[1] : '',
          rawMarkdown: matchedString,
          key: blockId,
        });
      }
      lastIndex = match.index + matchedString.length;
    }

    const remaining = contentToRender.substring(lastIndex);
    if (remaining.trim() || segments.length === 0) {
      const rawHtml = marked.parse(remaining || contentToRender, { gfm: true, breaks: true }) as string;
      segments.push({ 
        type: 'html', 
        content: rawHtml, 
        rawMarkdown: (remaining || contentToRender).trim(), 
        key: `html-${lastIndex}` 
      });
    }

    return segments;
  }, [frontMatter.body]);

  // Update a specific segment's markdown content and sync the entire document
  const handleUpdateSegmentMarkdown = (segmentIndex: number, newSegmentMarkdown: string) => {
    const newBodyPieces = renderedSegments.map((seg, idx) => {
      if (idx === segmentIndex) {
        return newSegmentMarkdown;
      }
      if (seg.type === 'mermaid') {
        return `\`\`\`mermaid\n${seg.content.trim()}\n\`\`\``;
      }
      if (seg.type === 'protect') {
        return `<div class="mdj-protected-block" data-label="${encodeURIComponent(seg.label)}" data-salt="${seg.salt}" data-iv="${seg.iv}" data-ciphertext="${seg.ciphertext}"></div>`;
      }
      return seg.rawMarkdown;
    });

    const newBody = newBodyPieces.filter(Boolean).join('\n\n');
    const newFullContent = frontMatter.hasFrontMatter
      ? `${frontMatter.raw.trim()}\n\n${newBody.trim()}`
      : newBody;

    onChange(newFullContent, true);
  };

  // Update a Mermaid diagram code in-place
  const handleUpdateMermaidCode = (segmentIndex: number, newCode: string) => {
    const formattedBlock = `\`\`\`mermaid\n${newCode.trim()}\n\`\`\``;
    handleUpdateSegmentMarkdown(segmentIndex, formattedBlock);
  };

  // Labels based on language
  const l10n = {
    liveReaderBadge: settings.language === 'es' ? 'Lector Interactivo' : settings.language === 'pt' ? 'Leitor Interativo' : 'Live Reader',
    resultMode: settings.language === 'es' ? 'Visual (En Vivo)' : settings.language === 'pt' ? 'Visual (Ao Vivo)' : 'Visual (Live)',
    writeMode: settings.language === 'es' ? 'Markdown' : settings.language === 'pt' ? 'Markdown' : 'Markdown',
    hybridMode: settings.language === 'es' ? 'Híbrido' : settings.language === 'pt' ? 'Híbrido' : 'Hybrid',
    words: settings.language === 'es' ? 'palabras' : settings.language === 'pt' ? 'palavras' : 'words',
    readTime: settings.language === 'es' ? 'min lectura' : settings.language === 'pt' ? 'min leitura' : 'min read',
    mermaidLiveTitle: settings.language === 'es' ? 'Diagramas Mermaid en Vivo' : settings.language === 'pt' ? 'Diagramas Mermaid ao Vivo' : 'Live Mermaid Diagrams',
    placeholder: settings.language === 'es' 
      ? 'Escribe tu documento aquí con formato de lectura natural...' 
      : settings.language === 'pt'
      ? 'Escreva seu documento aqui com formato de leitura natural...'
      : 'Write your document here with natural reader formatting...',
  };

  // Render individual segments (HTML, Mermaid, Protected blocks)
  const renderSegmentItem = (seg: (typeof renderedSegments)[number], index: number) => {
    if (seg.type === 'mermaid') {
      return (
        <EditableMermaidCard
          key={`${activeFile.id || activeFile.name}-${seg.key}`}
          code={seg.content}
          theme={settings.theme}
          language={settings.language}
          onCodeChange={(newCode) => handleUpdateMermaidCode(index, newCode)}
        />
      );
    }

    if (seg.type === 'protect') {
      const isUnlocked = Boolean(decryptedBlocks[seg.blockId]);
      const decryptedContent = decryptedBlocks[seg.blockId];
      const error = errors[seg.blockId];

      return (
        <div key={`${activeFile.id || activeFile.name}-${seg.key}`} className={`protected-card ${isUnlocked ? 'unlocked' : 'locked'}`} contentEditable={false}>
          <div className="protected-card-header">
            <div className="protected-card-title">
              {isUnlocked ? <Unlock size={17} className="unlock-icon" /> : <Lock size={17} className="lock-icon" />}
              <span>{seg.label}</span>
              <span className="protected-badge">
                {isUnlocked 
                  ? (settings.language === 'es' ? 'Desbloqueado' : settings.language === 'pt' ? 'Desbloqueado' : 'Unlocked') 
                  : 'AES-256'}
              </span>
            </div>

            {isUnlocked && (
              <button
                className="lock-again-btn"
                onClick={() => handleLock(seg.blockId)}
              >
                <Lock size={13} />
                <span>{settings.language === 'es' ? 'Bloquear' : settings.language === 'pt' ? 'Bloquear' : 'Lock'}</span>
              </button>
            )}
          </div>

          {isUnlocked ? (
            <div 
              className="protected-card-body decrypted"
              dangerouslySetInnerHTML={{
                __html: marked.parse(decryptedContent || '', { gfm: true, breaks: true }) as string,
              }}
            />
          ) : (
            <div className="protected-card-body locked-state">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUnlock(seg.blockId, seg.salt, seg.iv, seg.ciphertext);
                }}
                className="unlock-form"
              >
                <div className="unlock-input-group">
                  <KeyRound size={16} className="key-icon" />
                  <input
                    type="password"
                    placeholder={settings.language === 'es' ? 'Contraseña para descifrar...' : 'Password to unlock...'}
                    value={passwords[seg.blockId] || ''}
                    onChange={(e) =>
                      setPasswords((prev) => ({ ...prev, [seg.blockId]: e.target.value }))
                    }
                    className="unlock-input"
                  />
                  <button type="submit" className="unlock-btn">
                    {settings.language === 'es' ? 'Desbloquear' : 'Unlock'}
                  </button>
                </div>
                {error && (
                  <div className="unlock-error">
                    <AlertCircle size={14} />
                    <span>{error}</span>
                  </div>
                )}
              </form>
            </div>
          )}
        </div>
      );
    }

    // Editable Visual HTML segment
    return (
      <VisualEditableSegment
        key={`${activeFile.id || activeFile.name}-${seg.key}`}
        documentId={activeFile.id || activeFile.name}
        initialHtml={seg.content}
        language={settings.language}
        onMarkdownChange={(newMarkdown) => handleUpdateSegmentMarkdown(index, newMarkdown)}
        onSave={onSave}
      />
    );
  };

  return (
    <div 
      ref={containerRef}
      className={`live-reader-container theme-${settings.theme} font-family-${settings.fontFamily}`}
      onScroll={() => {
        if (!containerRef.current || !onScroll) return;
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        onScroll(scrollTop, scrollHeight, clientHeight);
      }}
    >
      <div 
        className="live-reader-sheet"
        style={{ maxWidth: settings.maxWidth ? `${Math.max(settings.maxWidth, 940)}px` : '960px' }}
      >
        {/* Reader Top Sheet Header */}
        <div className="live-reader-header-bar">
          <div className="live-reader-meta-group">
            <span className="live-reader-badge">
              <BookOpen size={14} className="reader-badge-icon" />
              <span>{l10n.liveReaderBadge}</span>
            </span>
            <span className="live-reader-stats">
              <Clock size={13} />
              <span>{stats.readingTimeMin} {l10n.readTime}</span>
              <span className="stat-separator">•</span>
              <Type size={13} />
              <span>{stats.words} {l10n.words}</span>
            </span>
          </div>

          {/* Quick Sub-mode Toggle (Visual WYSIWYG default, Markdown, Hybrid) */}
          <div className="live-reader-mode-pills">
            <button
              className={`pill-btn ${liveMode === 'reader' ? 'active' : ''}`}
              onClick={() => setLiveMode('reader')}
              title={settings.language === 'es' ? 'Edita directamente sobre el resultado formateado (WYSIWYG)' : 'Edit directly on formatted result (WYSIWYG)'}
            >
              <Sparkles size={13} />
              <span>{l10n.resultMode}</span>
            </button>
            <button
              className={`pill-btn ${liveMode === 'writer' ? 'active' : ''}`}
              onClick={() => {
                setLiveMode('writer');
                setTimeout(() => textareaRef.current?.focus(), 50);
              }}
              title={settings.language === 'es' ? 'Modo de código Markdown en lienzo' : 'Markdown code mode'}
            >
              <Edit3 size={13} />
              <span>{l10n.writeMode}</span>
            </button>
            <button
              className={`pill-btn ${liveMode === 'hybrid' ? 'active' : ''}`}
              onClick={() => setLiveMode('hybrid')}
              title={settings.language === 'es' ? 'Vista dual interactiva' : 'Side-by-side interactive sheet'}
            >
              <Columns size={13} />
              <span>{l10n.hybridMode}</span>
            </button>
          </div>
        </div>

        {/* Front Matter Metadata Viewer */}
        {frontMatter.hasFrontMatter && (
          <MetadataViewer
            parsed={frontMatter}
            showMetadata={showMetadata}
            onToggleMetadata={onToggleMetadata}
          />
        )}

        {/* Content Body Based on Sub-Mode */}
        {liveMode === 'writer' && (
          <div className="live-reader-writer-canvas">
            <textarea
              ref={textareaRef}
              className="live-reader-textarea"
              value={activeFile.content}
              onChange={(e) => {
                onChange(e.target.value, true);
                updateCursorPos();
              }}
              onKeyDown={handleKeyDown}
              onClick={updateCursorPos}
              onKeyUp={updateCursorPos}
              placeholder={l10n.placeholder}
              style={{
                fontSize: `${settings.fontSize}px`,
                lineHeight: settings.lineHeight,
              }}
              spellCheck={false}
              autoFocus
            />

            {/* If diagrams exist, show embedded live cards seamlessly below */}
            {embeddedMermaidBlocks.length > 0 && (
              <div className="live-reader-diagrams-section">
                <div className="live-diagrams-heading">
                  <Sparkles size={14} />
                  <span>{l10n.mermaidLiveTitle} ({embeddedMermaidBlocks.length})</span>
                </div>
                <div className="live-diagrams-list">
                  {embeddedMermaidBlocks.map((block, idx) => (
                    <div key={`diag-${block.index}-${idx}`} className="live-diagram-wrapper">
                      <MermaidViewer code={block.code} theme={settings.theme} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {liveMode === 'hybrid' && (
          <div className="live-reader-hybrid-grid">
            <div className="hybrid-col hybrid-writer">
              <textarea
                ref={textareaRef}
                className="live-reader-textarea hybrid-textarea"
                value={activeFile.content}
                onChange={(e) => {
                  onChange(e.target.value, true);
                  updateCursorPos();
                }}
                onKeyDown={handleKeyDown}
                onClick={updateCursorPos}
                onKeyUp={updateCursorPos}
                placeholder={l10n.placeholder}
                style={{
                  fontSize: `${settings.fontSize}px`,
                  lineHeight: settings.lineHeight,
                }}
                spellCheck={false}
              />
            </div>
            <div className="hybrid-col hybrid-preview markdown-body">
              {renderedSegments.map((seg, idx) => renderSegmentItem(seg, idx))}
            </div>
          </div>
        )}

        {liveMode === 'reader' && (
          <div className="live-reader-result-wrapper">
            <div 
              ref={previewRef} 
              className="live-reader-formatted markdown-body live-visual-interactive"
            >
              {renderedSegments.map((seg, idx) => renderSegmentItem(seg, idx))}
            </div>

            <div className="live-reader-footer-actions">
              <div className="live-reader-status-tag">
                <Sparkles size={13} className="sparkle-icon" />
                <span>
                  {settings.language === 'es'
                    ? 'Edición directa sobre el resultado activa: Haz clic en cualquier texto para editar'
                    : settings.language === 'pt'
                    ? 'Edição direta sobre o resultado ativa: Clique em qualquer texto para editar'
                    : 'Direct in-place editing active: Click any text to type'}
                </span>
              </div>
              <button
                type="button"
                className="live-reader-switch-writer-btn"
                onClick={() => {
                  setLiveMode('writer');
                  setTimeout(() => textareaRef.current?.focus(), 50);
                }}
              >
                <Edit3 size={13} />
                <span>
                  {settings.language === 'es' ? 'Ver Código Markdown' : settings.language === 'pt' ? 'Ver Código Markdown' : 'View Raw Markdown'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
