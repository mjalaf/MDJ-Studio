import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { ZoomIn, ZoomOut, RotateCcw, Download, Image as ImageIcon, AlertTriangle, Code2 } from 'lucide-react';
import { useI18n } from '../i18n';

interface MermaidViewerProps {
  code: string;
  theme?: string;
  isStandalone?: boolean;
}

let mermaidIdCounter = 0;

export const MermaidViewer: React.FC<MermaidViewerProps> = ({ code, theme = 'dark', isStandalone = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [showSource, setShowSource] = useState<boolean>(true);
  const { t } = useI18n();

  const containerId = useRef(`mermaid-svg-${++mermaidIdCounter}`);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'github-light' || theme === 'sepia' ? 'default' : 'dark',
      securityLevel: 'strict',
      fontFamily: 'Inter, sans-serif',
      suppressErrorRendering: true,
    });
  }, [theme]);

  // Strip wrapping markdown code fences and auto-normalize common architecture syntax mismatches
  const normalizeMermaidCode = (raw: string): string => {
    let text = raw
      .replace(/^```(?:mermaid)?\s*\r?\n?/i, '')
      .replace(/\r?\n?```\s*$/i, '')
      .trim();

    // Auto-normalize architecture-beta arrows across all syntax variations:
    // Mermaid architecture-beta strictly requires `<node1>:<DIR1> (--|-->|<--) <DIR2>:<node2>`
    if (text.includes('architecture')) {
      const opposites: Record<string, string> = { R: 'L', L: 'R', T: 'B', B: 'T' };

      const lines = text.split('\n').map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('group') || trimmed.startsWith('service') || trimmed.startsWith('architecture')) {
          return line;
        }

        // Pattern 1: node1:D1 (--|-->|<--) node2:D2 => node1:D1 arrow D2:node2
        if (/^([a-zA-Z0-9_]+):([RLTB])\s*(--|-->|<--)\s*([a-zA-Z0-9_]+):([RLTB])$/i.test(trimmed)) {
          return trimmed.replace(
            /^([a-zA-Z0-9_]+):([RLTB])\s*(--|-->|<--)\s*([a-zA-Z0-9_]+):([RLTB])$/i,
            (_, n1, d1, arrow, n2, d2) => `    ${n1}:${d1.toUpperCase()} ${arrow} ${d2.toUpperCase()}:${n2}`
          );
        }

        // Pattern 2: node1:D1 (--|-->|<--) node2 => node1:D1 arrow OPPOSITE:node2
        if (/^([a-zA-Z0-9_]+):([RLTB])\s*(--|-->|<--)\s*([a-zA-Z0-9_]+)$/i.test(trimmed)) {
          return trimmed.replace(
            /^([a-zA-Z0-9_]+):([RLTB])\s*(--|-->|<--)\s*([a-zA-Z0-9_]+)$/i,
            (_, n1, d1, arrow, n2) => {
              const opp = opposites[d1.toUpperCase()] || 'L';
              return `    ${n1}:${d1.toUpperCase()} ${arrow} ${opp}:${n2}`;
            }
          );
        }

        // Pattern 3: node1 (--|-->|<--) node2:D2 => node1:OPPOSITE arrow D2:node2
        if (/^([a-zA-Z0-9_]+)\s*(--|-->|<--)\s*([a-zA-Z0-9_]+):([RLTB])$/i.test(trimmed)) {
          return trimmed.replace(
            /^([a-zA-Z0-9_]+)\s*(--|-->|<--)\s*([a-zA-Z0-9_]+):([RLTB])$/i,
            (_, n1, arrow, n2, d2) => {
              const opp = opposites[d2.toUpperCase()] || 'R';
              return `    ${n1}:${opp} ${arrow} ${d2.toUpperCase()}:${n2}`;
            }
          );
        }

        // Pattern 4: node1 (--|-->|<--) node2 => node1:R arrow L:node2
        if (/^([a-zA-Z0-9_]+)\s*(--|-->|<--)\s*([a-zA-Z0-9_]+)$/i.test(trimmed)) {
          return trimmed.replace(
            /^([a-zA-Z0-9_]+)\s*(--|-->|<--)\s*([a-zA-Z0-9_]+)$/i,
            (_, n1, arrow, n2) => `    ${n1}:R ${arrow} L:${n2}`
          );
        }

        return line;
      });

      text = lines.join('\n');
    }

    return text;
  };

  const cleanCode = normalizeMermaidCode(code);

  useEffect(() => {
    let isMounted = true;
    setError(null);

    const renderDiagram = async () => {
      if (!cleanCode) {
        setSvgContent('');
        setError(null);
        return;
      }

      const uniqueId = `mermaid-render-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      try {
        // Validate diagram first
        await mermaid.parse(cleanCode);

        // Render diagram
        const { svg } = await mermaid.render(uniqueId, cleanCode);
        if (isMounted) {
          setSvgContent(svg);
          setError(null);
        }
      } catch (err: any) {
        // Clean up any leftover error DOM nodes created by mermaid in document.body
        const errEl = document.getElementById(`d${uniqueId}`) || document.getElementById(uniqueId);
        if (errEl) {
          errEl.remove();
        }

        if (isMounted) {
          let msg = err?.message || 'Error de sintaxis en el diagrama Mermaid.';
          // Simplify jison parser messages
          if (msg.includes('Parse error on line')) {
            const lines = msg.split('\n');
            const relevant = lines.filter((l: string) => !l.includes('at ') && !l.includes('node_modules'));
            msg = relevant.slice(0, 3).join('\n');
          }
          setError(msg);
        }
      }
    };

    const timer = setTimeout(renderDiagram, 150);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [cleanCode, theme]);

  const exportSVG = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagrama-mermaid.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPNG = () => {
    if (!containerRef.current) return;
    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = img.width || 800;
      canvas.height = img.height || 600;
      if (ctx) {
        ctx.fillStyle = theme === 'github-light' || theme === 'sepia' ? '#ffffff' : '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = 'diagrama-mermaid.png';
      a.click();
      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  return (
    <div className={`mermaid-card ${isStandalone ? 'standalone-mermaid' : ''}`}>
      <div className="mermaid-card-header">
        <span className="mermaid-badge">🧜‍♂️ {t.mermaid.badge}</span>

        {!error && (
          <div className="mermaid-controls">
            <button className="mermaid-icon-btn" onClick={() => setZoom(z => Math.min(z + 0.2, 3))} title={t.mermaid.zoomIn}>
              <ZoomIn size={14} />
            </button>
            <button className="mermaid-icon-btn" onClick={() => setZoom(z => Math.max(z - 0.2, 0.4))} title={t.mermaid.zoomOut}>
              <ZoomOut size={14} />
            </button>
            <button className="mermaid-icon-btn" onClick={() => setZoom(1)} title={t.mermaid.resetZoom}>
              <RotateCcw size={14} />
            </button>
            <div className="control-divider" />
            <button className="mermaid-icon-btn" onClick={exportSVG} title={t.mermaid.exportSvg}>
              <Download size={14} />
              <span>SVG</span>
            </button>
            <button className="mermaid-icon-btn" onClick={exportPNG} title={t.mermaid.exportPng}>
              <ImageIcon size={14} />
              <span>PNG</span>
            </button>
          </div>
        )}
      </div>

      <div className="mermaid-canvas-wrapper">
        {error ? (
          <div className="mermaid-error-box">
            <div className="mermaid-error-header">
              <AlertTriangle size={18} className="error-triangle-icon" />
              <div className="error-header-text">
                <strong>{t.mermaid.syntaxError}</strong>
                <span className="error-hint">{t.mermaid.syntaxErrorDesc}</span>
              </div>
            </div>

            <pre className="error-message-code">{error}</pre>

            <div className="error-source-container">
              <div className="error-source-header" onClick={() => setShowSource(!showSource)}>
                <Code2 size={14} />
                <span>{t.mermaid.diagramSource}</span>
                <span className="toggle-hint">({showSource ? t.mermaid.hideSource : t.mermaid.showSource})</span>
              </div>
              {showSource && (
                <pre className="error-source-pre">
                  <code>{cleanCode}</code>
                </pre>
              )}
            </div>
          </div>
        ) : (
          <div
            ref={containerRef}
            id={containerId.current}
            className="mermaid-svg-container"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}
      </div>
    </div>
  );
};
