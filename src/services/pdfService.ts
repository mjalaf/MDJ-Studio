import html2pdf from 'html2pdf.js';
import { isElectron } from './fileService';

export const exportToPDF = async (previewElement: HTMLElement, documentTitle: string = 'documento'): Promise<boolean> => {
  if (!previewElement) return false;

  // Clone preview element to construct a clean print page with applied styles
  const clonedElement = previewElement.cloneNode(true) as HTMLElement;

  // Ensure all SVG elements (like Mermaid diagrams) have explicit width/height
  const svgs = clonedElement.querySelectorAll('svg');
  svgs.forEach((svg) => {
    const bbox = svg.getBoundingClientRect();
    if (bbox.width > 0 && bbox.height > 0) {
      svg.setAttribute('width', `${bbox.width}px`);
      svg.setAttribute('height', `${bbox.height}px`);
    }
  });

  const fullPrintHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${documentTitle}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap');
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            color: #1e293b;
            background: #ffffff;
            padding: 32px;
            line-height: 1.6;
            margin: 0;
          }
          h1, h2, h3, h4, h5, h6 { color: #0f172a; margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 700; }
          h1 { font-size: 24pt; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
          h2 { font-size: 18pt; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
          h3 { font-size: 14pt; }
          pre, code { font-family: 'Fira Code', monospace; }
          pre { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; overflow-x: auto; font-size: 10pt; }
          code { background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 9.5pt; }
          pre code { background: transparent; padding: 0; }
          blockquote { border-left: 4px solid #6366f1; background: #eef2ff; margin: 1.5em 0; padding: 12px 18px; border-radius: 0 8px 8px 0; font-style: italic; }
          table { width: 100%; border-collapse: collapse; margin: 1.5em 0; }
          th, td { border: 1px solid #cbd5e1; padding: 10px 14px; text-align: left; }
          th { background: #f1f5f9; font-weight: 600; }
          tr:nth-child(even) { background: #f8fafc; }
          .mermaid-container { text-align: center; margin: 2em 0; page-break-inside: avoid; }
          .mermaid-container svg { max-width: 100% !important; height: auto !important; }
          ul, ol { padding-left: 24px; }
          li { margin-bottom: 4px; }
          .task-list-item { list-style: none; margin-left: -20px; }
          a { color: #4f46e5; text-decoration: none; }
          @page { margin: 15mm; size: A4; }
        </style>
      </head>
      <body>
        ${clonedElement.innerHTML}
      </body>
    </html>
  `;

  if (isElectron() && window.electronAPI) {
    return await window.electronAPI.exportPDF(fullPrintHtml);
  }

  // Web html2pdf export options
  const opt = {
    margin: [10, 10, 10, 10] as [number, number, number, number],
    filename: `${documentTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  try {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = clonedElement.innerHTML;
    tempDiv.className = 'pdf-export-container';
    document.body.appendChild(tempDiv);

    await html2pdf().set(opt).from(tempDiv).save();

    document.body.removeChild(tempDiv);
    return true;
  } catch (err) {
    console.error('Error generating PDF:', err);
    return false;
  }
};
