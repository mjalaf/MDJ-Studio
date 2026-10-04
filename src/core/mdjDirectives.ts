import type { PaletteColor } from '../types';

export const PALETTE_COLORS: Record<PaletteColor, { nameEs: string; nameEn: string; hexLight: string; hexDark: string; bgLight: string; bgDark: string }> = {
  red: {
    nameEs: 'Rojo',
    nameEn: 'Red',
    hexLight: '#dc2626',
    hexDark: '#f87171',
    bgLight: '#fee2e2',
    bgDark: '#450a0a',
  },
  orange: {
    nameEs: 'Naranja',
    nameEn: 'Orange',
    hexLight: '#ea580c',
    hexDark: '#fb923c',
    bgLight: '#ffedd5',
    bgDark: '#431407',
  },
  yellow: {
    nameEs: 'Amarillo',
    nameEn: 'Yellow',
    hexLight: '#ca8a04',
    hexDark: '#facc15',
    bgLight: '#fef9c3',
    bgDark: '#422006',
  },
  green: {
    nameEs: 'Verde',
    nameEn: 'Green',
    hexLight: '#16a34a',
    hexDark: '#4ade80',
    bgLight: '#dcfce7',
    bgDark: '#052e16',
  },
  blue: {
    nameEs: 'Azul',
    nameEn: 'Blue',
    hexLight: '#2563eb',
    hexDark: '#60a5fa',
    bgLight: '#dbeafe',
    bgDark: '#172554',
  },
  purple: {
    nameEs: 'Morado',
    nameEn: 'Purple',
    hexLight: '#9333ea',
    hexDark: '#c084fc',
    bgLight: '#f3e8ff',
    bgDark: '#3b0764',
  },
  gray: {
    nameEs: 'Gris',
    nameEn: 'Gray',
    hexLight: '#4b5563',
    hexDark: '#9ca3af',
    bgLight: '#f3f4f6',
    bgDark: '#1f2937',
  },
};

export function isValidPaletteColor(color: string): color is PaletteColor {
  return color in PALETTE_COLORS;
}

/**
 * Preprocess MDJ Inline Directives:
 * :color[content]{color} or :color[content]{color=token}
 * :highlight[content]{color} or :highlight[content]{color=token}
 */
export function processInlineDirectives(text: string): string {
  // Regex matches :name[content]{attrs}
  const inlineRegex = /:(color|highlight)\[([^\]]+)\](?:\{([^}]+)\})?/g;

  return text.replace(inlineRegex, (_match, name, content, rawAttrs) => {
    let colorToken = name === 'highlight' ? 'yellow' : 'blue';

    if (rawAttrs) {
      const trimmed = rawAttrs.trim();
      const colorMatch = trimmed.match(/(?:color\s*=\s*['"]?([a-z]+)['"]?)|([a-z]+)/i);
      if (colorMatch) {
        const found = (colorMatch[1] || colorMatch[2] || '').toLowerCase();
        if (isValidPaletteColor(found)) {
          colorToken = found;
        }
      }
    }

    if (name === 'color') {
      return `<span class="mdl-color mdl-color-${colorToken}">${content}</span>`;
    } else {
      return `<span class="mdl-highlight mdl-highlight-${colorToken}">${content}</span>`;
    }
  });
}

/**
 * Parses block directives:
 * --collapse "Title" ... --end
 * --color {"color":"..."} ... --end
 * --highlight {"color":"..."} ... --end
 * --protect {"label":"...", "salt":"...", "iv":"..."} ... --end
 */
export interface BlockDirective {
  type: 'collapse' | 'color' | 'highlight' | 'protect';
  title?: string;
  isOpen?: boolean;
  color?: PaletteColor;
  label?: string;
  salt?: string;
  iv?: string;
  ciphertext?: string;
  content: string;
}

export function parseBlockDirectives(text: string): string {
  // 1. Process --collapse
  const collapseRegex = /--collapse(?:\s+(?:"([^"]+)"|'([^']+)'|(\{[\s\S]*?\})))?\r?\n([\s\S]*?)\r?\n--end(?:\s+collapse)?/g;
  text = text.replace(collapseRegex, (_match, q1, q2, jsonAttrs, innerContent) => {
    let title = q1 || q2 || 'Sección Plegable';
    let isOpen = false;

    if (jsonAttrs) {
      try {
        const parsed = JSON.parse(jsonAttrs);
        if (parsed.title) title = parsed.title;
        if (parsed.open) isOpen = Boolean(parsed.open);
      } catch {
        // treat as string if parse fails
        title = jsonAttrs;
      }
    }

    return `\n<details class="mdj-collapse"${isOpen ? ' open' : ''}>\n<summary class="mdj-collapse-summary"><span class="mdj-collapse-chevron">▶</span> <span class="mdj-collapse-title">${title}</span></summary>\n<div class="mdj-collapse-body">\n\n${innerContent}\n\n</div>\n</details>\n`;
  });

  // 2. Process --color
  const colorRegex = /--color(?:\s+(\{[\s\S]*?\}|[a-z]+))?\r?\n([\s\S]*?)\r?\n--end(?:\s+color)?/g;
  text = text.replace(colorRegex, (_match, attrs, innerContent) => {
    let color: PaletteColor = 'blue';
    if (attrs) {
      try {
        const parsed = JSON.parse(attrs);
        if (parsed.color && isValidPaletteColor(parsed.color.toLowerCase())) {
          color = parsed.color.toLowerCase() as PaletteColor;
        }
      } catch {
        if (isValidPaletteColor(attrs.trim().toLowerCase())) {
          color = attrs.trim().toLowerCase() as PaletteColor;
        }
      }
    }
    return `\n<div class="mdl-color-block mdl-color-${color}">\n\n${innerContent}\n\n</div>\n`;
  });

  // 3. Process --highlight
  const highlightRegex = /--highlight(?:\s+(\{[\s\S]*?\}|[a-z]+))?\r?\n([\s\S]*?)\r?\n--end(?:\s+highlight)?/g;
  text = text.replace(highlightRegex, (_match, attrs, innerContent) => {
    let color: PaletteColor = 'yellow';
    if (attrs) {
      try {
        const parsed = JSON.parse(attrs);
        if (parsed.color && isValidPaletteColor(parsed.color.toLowerCase())) {
          color = parsed.color.toLowerCase() as PaletteColor;
        }
      } catch {
        if (isValidPaletteColor(attrs.trim().toLowerCase())) {
          color = attrs.trim().toLowerCase() as PaletteColor;
        }
      }
    }
    return `\n<div class="mdl-highlight-block mdl-highlight-${color}">\n\n${innerContent}\n\n</div>\n`;
  });

  // 4. Process --protect
  const protectRegex = /--protect\s+(\{[\s\S]*?\})\r?\n([\s\S]*?)\r?\n--end(?:\s+protect)?/g;
  text = text.replace(protectRegex, (_match, jsonMeta, cipherBody) => {
    let label = 'Contenido Protegido';
    let salt = '';
    let iv = '';
    try {
      const meta = JSON.parse(jsonMeta);
      label = meta.label || label;
      salt = meta.salt || '';
      iv = meta.iv || '';
    } catch {
      // ignore
    }

    const ciphertext = cipherBody.trim();
    // Render encrypted card with data attributes for in-memory decryption
    return `\n<div class="mdj-protected-block" data-label="${encodeURIComponent(label)}" data-salt="${salt}" data-iv="${iv}" data-ciphertext="${ciphertext}"></div>\n`;
  });

  return text;
}
