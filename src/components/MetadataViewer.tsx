import React from 'react';
import { Tag, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import type { ParsedFrontMatter } from '../core/frontMatter';

interface MetadataViewerProps {
  parsed: ParsedFrontMatter;
  showMetadata: boolean;
  onToggleMetadata: () => void;
}

export const MetadataViewer: React.FC<MetadataViewerProps> = ({
  parsed,
  showMetadata,
  onToggleMetadata,
}) => {
  if (!parsed.hasFrontMatter) return null;

  const { attributes, raw } = parsed;
  const title = attributes.title;
  let tags: string[] = [];
  if (Array.isArray(attributes.tags)) {
    tags = attributes.tags;
  } else if (typeof attributes.tags === 'string') {
    tags = attributes.tags.split(',').map((t) => t.trim()).filter(Boolean);
  }

  return (
    <div className="doc-metadata-bar">
      <div className="metadata-summary" onClick={onToggleMetadata}>
        <div className="metadata-left">
          <FileText size={15} className="metadata-icon" />
          {title && <span className="metadata-title-preview">{title}</span>}
          {tags.length > 0 && (
            <div className="metadata-tags-list">
              {tags.map((t, idx) => (
                <span key={idx} className="metadata-tag-badge">
                  <Tag size={11} />
                  <span>{t}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <button className="metadata-toggle-btn" title="Alternar visualización de metadatos YAML">
          <span className="metadata-toggle-label">{showMetadata ? 'Ocultar YAML' : 'Ver YAML'}</span>
          {showMetadata ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {showMetadata && (
        <div className="metadata-yaml-expanded">
          <pre className="yaml-code-block">
            <code>{raw.trim()}</code>
          </pre>
        </div>
      )}
    </div>
  );
};
