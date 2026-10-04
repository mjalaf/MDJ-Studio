import { useRef, forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { marked } from 'marked';
import { Lock, Unlock, KeyRound, AlertCircle } from 'lucide-react';
import type { EditorSettings, ActiveFile } from '../types';
import { MermaidViewer } from './MermaidViewer';
import { parseFrontMatter } from '../core/frontMatter';
import { parseBlockDirectives, processInlineDirectives } from '../core/mdjDirectives';
import { decryptText } from '../core/cryptoService';
import { MetadataViewer } from './MetadataViewer';

interface PreviewProps {
  activeFile: ActiveFile;
  settings: EditorSettings;
  onScroll?: (scrollTop: number, scrollHeight: number, clientHeight: number) => void;
  showMetadata: boolean;
  onToggleMetadata: () => void;
}

export interface PreviewRef {
  getContainer: () => HTMLElement | null;
  scrollToPercentage: (pct: number) => void;
}

interface DecryptedState {
  [blockId: string]: string; // stores decrypted plain text in memory only
}

export const Preview = forwardRef<PreviewRef, PreviewProps>(({
  activeFile,
  settings,
  onScroll,
  showMetadata,
  onToggleMetadata,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [decryptedBlocks, setDecryptedBlocks] = useState<DecryptedState>({});
  const [passwords, setPasswords] = useState<{ [blockId: string]: string }>({});
  const [errors, setErrors] = useState<{ [blockId: string]: string }>({});

  useImperativeHandle(ref, () => ({
    getContainer: () => containerRef.current,
    scrollToPercentage: (pct: number) => {
      if (!containerRef.current) return;
      const targetScroll = (containerRef.current.scrollHeight - containerRef.current.clientHeight) * pct;
      containerRef.current.scrollTop = targetScroll;
    }
  }));

  // Auto-lock protected blocks after 10 minutes of inactivity (Spec 002 AC-16.6)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDecryptedBlocks({});
    }, 10 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [decryptedBlocks]);

  const handleScroll = () => {
    if (!containerRef.current || !onScroll) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    onScroll(scrollTop, scrollHeight, clientHeight);
  };

  const handleUnlock = async (blockId: string, salt: string, iv: string, ciphertext: string) => {
    const password = passwords[blockId];
    if (!password) {
      setErrors((prev) => ({ ...prev, [blockId]: 'Introduce la contraseña' }));
      return;
    }

    try {
      const plaintext = await decryptText({ salt, iv, ciphertext }, password);
      setDecryptedBlocks((prev) => ({ ...prev, [blockId]: plaintext }));
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[blockId];
        return copy;
      });
      setPasswords((prev) => {
        const copy = { ...prev };
        delete copy[blockId];
        return copy;
      });
    } catch {
      setErrors((prev) => ({ ...prev, [blockId]: 'Contraseña incorrecta o datos alterados' }));
    }
  };

  const handleLock = (blockId: string) => {
    setDecryptedBlocks((prev) => {
      const copy = { ...prev };
      delete copy[blockId];
      return copy;
    });
  };

  // If the active file is a raw standalone .mmd file
  if (activeFile.type === 'mermaid') {
    return (
      <div 
        ref={containerRef}
        className={`preview-container theme-${settings.theme} font-family-${settings.fontFamily}`}
        onScroll={handleScroll}
      >
        <div 
          className="preview-content-wrapper" 
          style={{ maxWidth: settings.maxWidth ? `${settings.maxWidth}px` : '100%' }}
        >
          <MermaidViewer code={activeFile.content} theme={settings.theme} isStandalone={true} />
        </div>
      </div>
    );
  }

  // Parse front matter
  const frontMatter = parseFrontMatter(activeFile.content);
  let contentToRender = frontMatter.body;

  // Process MDJ block directives (--collapse, --color, --highlight, --protect)
  contentToRender = parseBlockDirectives(contentToRender);

  // Process inline directives (:color[...], :highlight[...])
  contentToRender = processInlineDirectives(contentToRender);

  // Parse markdown segments and separate out Mermaid blocks and Protected blocks
  const parseMarkdownSegments = (rawText: string) => {
    // Combined parser
    type Segment =
      | { type: 'html'; content: string; key: string }
      | { type: 'mermaid'; content: string; key: string }
      | { type: 'protect'; blockId: string; label: string; salt: string; iv: string; ciphertext: string; key: string };

    const segments: Segment[] = [];
    let lastIndex = 0;

    // Match both mermaid and protect
    const combinedRegex = /(```mermaid\s*\n[\s\S]*?\n```)|(<div class="mdj-protected-block"[\s\S]*?<\/div>)/g;
    let match: RegExpExecArray | null;

    while ((match = combinedRegex.exec(rawText)) !== null) {
      const textBefore = rawText.substring(lastIndex, match.index);
      if (textBefore.trim()) {
        const rawHtml = marked.parse(textBefore, { gfm: true, breaks: true }) as string;
        segments.push({
          type: 'html',
          content: rawHtml,
          key: `html-${lastIndex}`,
        });
      }

      const matchedString = match[0];
      if (matchedString.startsWith('```mermaid')) {
        const m = matchedString.match(/```mermaid\s*\n([\s\S]*?)\n```/);
        segments.push({
          type: 'mermaid',
          content: m ? m[1] : '',
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
          key: blockId,
        });
      }

      lastIndex = match.index + matchedString.length;
    }

    const remaining = rawText.substring(lastIndex);
    if (remaining.trim() || segments.length === 0) {
      const rawHtml = marked.parse(remaining || rawText, { gfm: true, breaks: true }) as string;
      segments.push({
        type: 'html',
        content: rawHtml,
        key: `html-${lastIndex}`,
      });
    }

    return segments;
  };

  const segments = parseMarkdownSegments(contentToRender);

  return (
    <div 
      ref={containerRef}
      className={`preview-container theme-${settings.theme} font-family-${settings.fontFamily}`}
      onScroll={handleScroll}
    >
      <div 
        className="preview-content-wrapper markdown-body" 
        style={{ maxWidth: settings.maxWidth ? `${settings.maxWidth}px` : '100%' }}
      >
        {/* Front Matter Metadata Viewer (Spec 006) */}
        {frontMatter.hasFrontMatter && (
          <MetadataViewer
            parsed={frontMatter}
            showMetadata={showMetadata}
            onToggleMetadata={onToggleMetadata}
          />
        )}

        {segments.map((seg) => {
          if (seg.type === 'mermaid') {
            return (
              <div key={seg.key} className="preview-mermaid-wrapper">
                <MermaidViewer code={seg.content} theme={settings.theme} />
              </div>
            );
          }

          if (seg.type === 'protect') {
            const isUnlocked = Boolean(decryptedBlocks[seg.blockId]);
            const decryptedContent = decryptedBlocks[seg.blockId];
            const error = errors[seg.blockId];

            return (
              <div key={seg.key} className={`protected-card ${isUnlocked ? 'unlocked' : 'locked'}`}>
                <div className="protected-card-header">
                  <div className="protected-card-title">
                    {isUnlocked ? <Unlock size={17} className="unlock-icon" /> : <Lock size={17} className="lock-icon" />}
                    <span>{seg.label}</span>
                    <span className="protected-badge">
                      {isUnlocked ? 'Desbloqueado (en memoria)' : 'Cifrado AES-256'}
                    </span>
                  </div>

                  {isUnlocked && (
                    <button
                      className="lock-again-btn"
                      onClick={() => handleLock(seg.blockId)}
                      title="Volver a bloquear este contenido"
                    >
                      <Lock size={13} />
                      <span>Bloquear</span>
                    </button>
                  )}
                </div>

                {isUnlocked ? (
                  <div className="protected-decrypted-body">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: marked.parse(decryptedContent, { gfm: true, breaks: true }) as string,
                      }}
                    />
                  </div>
                ) : (
                  <div className="protected-unlock-form">
                    <p className="unlock-hint">
                      Introduce tu contraseña para descifrar y visualizar esta sección.
                    </p>
                    <div className="unlock-controls">
                      <div className="unlock-input-wrap">
                        <KeyRound size={15} className="unlock-key-icon" />
                        <input
                          type="password"
                          placeholder="Contraseña del bloque"
                          className="unlock-input"
                          value={passwords[seg.blockId] || ''}
                          onChange={(e) =>
                            setPasswords((prev) => ({ ...prev, [seg.blockId]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUnlock(seg.blockId, seg.salt, seg.iv, seg.ciphertext);
                            }
                          }}
                        />
                      </div>
                      <button
                        className="unlock-submit-btn"
                        onClick={() => handleUnlock(seg.blockId, seg.salt, seg.iv, seg.ciphertext)}
                      >
                        Desbloquear
                      </button>
                    </div>
                    {error && (
                      <div className="unlock-error-msg">
                        <AlertCircle size={14} />
                        <span>{error}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div
              key={seg.key}
              className="preview-markdown-segment"
              dangerouslySetInnerHTML={{ __html: seg.content }}
            />
          );
        })}
      </div>
    </div>
  );
});
