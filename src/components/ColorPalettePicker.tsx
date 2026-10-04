import React, { useState, useRef, useEffect } from 'react';
import { Palette, Highlighter, ChevronDown } from 'lucide-react';
import { PALETTE_COLORS } from '../core/mdjDirectives';
import type { PaletteColor } from '../types';
import { useI18n } from '../i18n';

interface ColorPalettePickerProps {
  onApplyColor: (color: PaletteColor, isHighlight: boolean, isBlock: boolean) => void;
  disabled?: boolean;
}

export const ColorPalettePicker: React.FC<ColorPalettePickerProps> = ({ onApplyColor, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'highlight'>('highlight');
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const { t } = useI18n();

  useEffect(() => {
    if (!isOpen) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setPos({
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 240)),
      });
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const closeOnResize = () => setIsOpen(false);
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', closeOnResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', closeOnResize);
    };
  }, [isOpen]);

  const colors = Object.keys(PALETTE_COLORS) as PaletteColor[];

  const handleSelectColor = (color: PaletteColor, isBlock = false) => {
    onApplyColor(color, activeTab === 'highlight', isBlock);
    setIsOpen(false);
  };

  return (
    <div className="color-palette-wrapper" ref={containerRef}>
      <button
        className="tool-btn ribbon-btn-labeled color-picker-btn"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        title={t.palette.title}
      >
        {activeTab === 'highlight' ? <Highlighter size={15} /> : <Palette size={15} />}
        <span className="btn-label-sm">{activeTab === 'highlight' ? t.palette.highlight : t.palette.inline}</span>
        <ChevronDown size={11} />
      </button>

      {isOpen && (
        <div className="color-palette-popover" style={{ top: pos.top, left: pos.left }}>
          <div className="color-palette-tabs">
            <button
              className={`palette-tab ${activeTab === 'highlight' ? 'active' : ''}`}
              onClick={() => setActiveTab('highlight')}
            >
              <Highlighter size={13} />
              <span>{t.palette.highlight}</span>
            </button>
            <button
              className={`palette-tab ${activeTab === 'text' ? 'active' : ''}`}
              onClick={() => setActiveTab('text')}
            >
              <Palette size={13} />
              <span>{t.palette.inline}</span>
            </button>
          </div>

          <div className="color-palette-grid">
            {colors.map((colorKey) => {
              const info = PALETTE_COLORS[colorKey];
              const localizedName = t.palette.colors[colorKey] || info.nameEn;
              return (
                <button
                  key={colorKey}
                  className="color-swatch-item"
                  onClick={() => handleSelectColor(colorKey, false)}
                  title={`${localizedName} (Inline)`}
                >
                  <span
                    className="color-circle"
                    style={{
                      backgroundColor: activeTab === 'highlight' ? info.bgLight : info.hexLight,
                      borderColor: info.hexLight,
                    }}
                  />
                  <span className="color-name">{localizedName}</span>
                </button>
              );
            })}
          </div>

          <div className="color-palette-footer">
            <button
              className="palette-block-btn"
              onClick={() => handleSelectColor(activeTab === 'highlight' ? 'yellow' : 'blue', true)}
              title={t.palette.block}
            >
              {t.palette.block}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
