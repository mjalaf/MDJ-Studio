/**
 * HTML Exporter for Mark & Mermaid Reader.
 * Conforms to Spec 001 US-07: Single self-contained HTML file,
 * embedded styles, light theme for printing/reading, SVG diagrams, no external dependencies.
 */

export function generateStandaloneHtml(options: {
  title: string;
  bodyHtml: string;
  metadata?: { title?: string; tags?: string[] };
}): string {
  const { title, bodyHtml, metadata } = options;

  const tagsHtml = metadata?.tags && metadata.tags.length > 0
    ? `<div class="export-tags">${metadata.tags.map((t) => `<span class="export-tag">#${t}</span>`).join(' ')}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --bg: #ffffff;
      --text: #1f2937;
      --text-muted: #6b7280;
      --border: #e5e7eb;
      --code-bg: #f3f4f6;
      --accent: #4f46e5;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.65;
      color: var(--text);
      background: var(--bg);
      max-width: 860px;
      margin: 40px auto;
      padding: 0 24px;
    }
    h1, h2, h3, h4, h5, h6 {
      color: #111827;
      margin-top: 1.6em;
      margin-bottom: 0.6em;
      line-height: 1.3;
      font-weight: 600;
    }
    h1 { font-size: 2.2em; border-bottom: 2px solid var(--border); padding-bottom: 0.3em; }
    h2 { font-size: 1.6em; border-bottom: 1px solid var(--border); padding-bottom: 0.2em; }
    p, ul, ol, blockquote, table, pre { margin-bottom: 1.2em; }
    a { color: var(--accent); text-decoration: underline; }
    code {
      background: var(--code-bg);
      padding: 0.2em 0.4em;
      border-radius: 4px;
      font-family: "Fira Code", Consolas, Monaco, monospace;
      font-size: 0.9em;
    }
    pre {
      background: #18181b;
      color: #f4f4f5;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
    }
    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }
    blockquote {
      border-left: 4px solid var(--accent);
      padding-left: 16px;
      color: var(--text-muted);
      font-style: italic;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    th, td {
      border: 1px solid var(--border);
      padding: 10px 14px;
      text-align: left;
    }
    th {
      background: var(--code-bg);
      font-weight: 600;
    }
    .export-tags {
      margin-bottom: 24px;
    }
    .export-tag {
      display: inline-block;
      background: #eef2ff;
      color: #4f46e5;
      font-size: 0.8em;
      font-weight: 500;
      padding: 3px 8px;
      border-radius: 9999px;
      margin-right: 6px;
    }
    /* MDJ Directives Styles */
    .mdj-collapse {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
      background: #fafafa;
    }
    .mdj-collapse summary {
      cursor: pointer;
      font-weight: 600;
      color: #374151;
      user-select: none;
    }
    .mdj-collapse-body {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px dashed var(--border);
    }
    /* MDJ Palette */
    .mdl-color-red { color: #dc2626 !important; }
    .mdl-color-orange { color: #ea580c !important; }
    .mdl-color-yellow { color: #ca8a04 !important; }
    .mdl-color-green { color: #16a34a !important; }
    .mdl-color-blue { color: #2563eb !important; }
    .mdl-color-purple { color: #9333ea !important; }
    .mdl-color-gray { color: #4b5563 !important; }

    .mdl-highlight-red { background-color: #fee2e2 !important; padding: 2px 4px; border-radius: 3px; }
    .mdl-highlight-orange { background-color: #ffedd5 !important; padding: 2px 4px; border-radius: 3px; }
    .mdl-highlight-yellow { background-color: #fef9c3 !important; padding: 2px 4px; border-radius: 3px; }
    .mdl-highlight-green { background-color: #dcfce7 !important; padding: 2px 4px; border-radius: 3px; }
    .mdl-highlight-blue { background-color: #dbeafe !important; padding: 2px 4px; border-radius: 3px; }
    .mdl-highlight-purple { background-color: #f3e8ff !important; padding: 2px 4px; border-radius: 3px; }
    .mdl-highlight-gray { background-color: #f3f4f6 !important; padding: 2px 4px; border-radius: 3px; }

    .mermaid-svg-container {
      display: flex;
      justify-content: center;
      margin: 20px 0;
    }
    @media print {
      body { max-width: 100%; margin: 0; padding: 10mm; }
      details { open: true !important; }
    }
  </style>
</head>
<body>
  ${tagsHtml}
  ${bodyHtml}
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
