import TurndownService from 'turndown';

export const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  hr: '---',
  bulletListMarker: '-',
  emDelimiter: '_',
  strongDelimiter: '**',
});

// Mermaid diagram widgets preserved in markdown
turndownService.addRule('mermaidWidget', {
  filter: (node) => {
    return (
      node.nodeName === 'DIV' &&
      (node.classList.contains('mermaid-widget') ||
        node.classList.contains('live-diagram-wrapper') ||
        node.hasAttribute('data-mermaid-code'))
    );
  },
  replacement: (_content, node) => {
    const code = (node as HTMLElement).getAttribute('data-mermaid-code') || '';
    return `\n\n\`\`\`mermaid\n${code.trim()}\n\`\`\`\n\n`;
  },
});

// MDJ Color Text rule
turndownService.addRule('mdjColorText', {
  filter: (node) => {
    return (
      node.nodeName === 'SPAN' &&
      (node.classList.contains('mdl-color') ||
        node.classList.contains('mdj-color') ||
        node.classList.contains('mdj-color-text') ||
        node.hasAttribute('data-mdj-color'))
    );
  },
  replacement: (content, node) => {
    const el = node as HTMLElement;
    let color = el.getAttribute('data-mdj-color') || el.getAttribute('data-color') || '';
    if (!color) {
      const match = el.className.match(/md[lj]-color-([a-z]+)/);
      if (match) color = match[1];
    }
    if (color) {
      return `:color[${content}]{${color}}`;
    }
    return content;
  },
});

// MDJ Highlight rule
turndownService.addRule('mdjHighlight', {
  filter: (node) => {
    return (
      (node.nodeName === 'MARK' || node.nodeName === 'SPAN') &&
      (node.classList.contains('mdl-highlight') ||
        node.classList.contains('mdj-highlight') ||
        node.hasAttribute('data-highlight-color'))
    );
  },
  replacement: (content, node) => {
    const el = node as HTMLElement;
    let color = el.getAttribute('data-highlight-color') || el.getAttribute('data-color') || '';
    if (!color) {
      const match = el.className.match(/md[lj]-highlight-([a-z]+)/);
      if (match) color = match[1];
      else color = 'yellow';
    }
    return `:highlight[${content}]{${color}}`;
  },
});

// MDJ Color Block rule
turndownService.addRule('mdjColorBlock', {
  filter: (node) => {
    return (
      node.nodeName === 'DIV' &&
      (node.classList.contains('mdl-color-block') || node.classList.contains('mdj-color-block'))
    );
  },
  replacement: (content, node) => {
    const el = node as HTMLElement;
    const match = el.className.match(/(?:md[lj]-color-)(red|orange|yellow|green|blue|purple|gray)/);
    const color = match ? match[1] : 'blue';
    return `\n\n--color {"color":"${color}"}\n${content.trim()}\n--end\n\n`;
  },
});

// MDJ Highlight Block rule
turndownService.addRule('mdjHighlightBlock', {
  filter: (node) => {
    return (
      node.nodeName === 'DIV' &&
      (node.classList.contains('mdl-highlight-block') || node.classList.contains('mdj-highlight-block'))
    );
  },
  replacement: (content, node) => {
    const el = node as HTMLElement;
    const match = el.className.match(/(?:md[lj]-highlight-)(red|orange|yellow|green|blue|purple|gray)/);
    const color = match ? match[1] : 'yellow';
    return `\n\n--highlight {"color":"${color}"}\n${content.trim()}\n--end\n\n`;
  },
});

// MDJ Collapsible Summary rule (ignore summary since parent details outputs the title)
turndownService.addRule('mdjCollapseSummary', {
  filter: (node) => {
    return (
      node.nodeName === 'SUMMARY' &&
      (node.classList.contains('mdj-collapse-summary') ||
        node.parentElement?.classList.contains('mdj-collapse') ||
        false)
    );
  },
  replacement: () => '',
});

// MDJ Collapsible rule
turndownService.addRule('mdjCollapse', {
  filter: (node) => {
    return (
      node.nodeName === 'DETAILS' &&
      (node.classList.contains('mdj-collapse') || node.classList.contains('mdj-collapse-block'))
    );
  },
  replacement: (content, node) => {
    const titleEl = node.querySelector('.mdj-collapse-title') || node.querySelector('summary');
    const summary = titleEl ? titleEl.textContent?.replace(/^[▶▼]\s*/, '').trim() : 'Details';
    return `\n\n--collapse "${summary}"\n${content.trim()}\n--end\n\n`;
  },
});

// MDJ Protected Block rule
turndownService.addRule('mdjProtected', {
  filter: (node) => {
    return (
      node.nodeName === 'DIV' &&
      (node.classList.contains('mdj-protected-block') ||
        node.classList.contains('protected-card') ||
        node.hasAttribute('data-ciphertext'))
    );
  },
  replacement: (_content, node) => {
    const label = (node as HTMLElement).getAttribute('data-label') || 'Contenido Protegido';
    const salt = (node as HTMLElement).getAttribute('data-salt') || '';
    const iv = (node as HTMLElement).getAttribute('data-iv') || '';
    const ciphertext = (node as HTMLElement).getAttribute('data-ciphertext') || '';
    return `\n\n<div class="mdj-protected-block" data-label="${label}" data-salt="${salt}" data-iv="${iv}" data-ciphertext="${ciphertext}"></div>\n\n`;
  },
});

/**
 * Converts formatted HTML back into clean Markdown
 */
export function htmlToMarkdown(html: string): string {
  if (!html || !html.trim()) return '';
  return turndownService.turndown(html);
}
