import type { ActiveFile, DocumentType } from '../types';
import { extractDocumentMetadata } from '../core/frontMatter';

export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);
};

export const openFileFromDevice = async (): Promise<ActiveFile | null> => {
  if (isElectron() && window.electronAPI) {
    const res = await window.electronAPI.openFile();
    if (!res) return null;
    let docType: DocumentType = 'markdown';
    if (res.filename.endsWith('.mmd')) docType = 'mermaid';
    else if (res.filename.endsWith('.mdj')) docType = 'mdj';

    const { title, tags } = extractDocumentMetadata(res.content, res.filename);

    return {
      name: res.filename,
      path: res.filePath,
      content: res.content,
      isUnsaved: false,
      type: docType,
      title,
      tags,
    };
  }

  // Web Browser fallback using File input upload
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.mdj,.mmd,.markdown,.txt';

    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      if (!target.files || target.files.length === 0) {
        resolve(null);
        return;
      }

      const file = target.files[0];
      const text = await file.text();
      let docType: DocumentType = 'markdown';
      if (file.name.endsWith('.mmd')) docType = 'mermaid';
      else if (file.name.endsWith('.mdj')) docType = 'mdj';

      const { title, tags } = extractDocumentMetadata(text, file.name);

      resolve({
        name: file.name,
        content: text,
        isUnsaved: false,
        type: docType,
        title,
        tags,
      });
    };

    input.click();
  });
};

export const saveFileToDevice = async (file: ActiveFile, forceSaveAs = false): Promise<ActiveFile | null> => {
  if (isElectron() && window.electronAPI) {
    const res = await window.electronAPI.saveFile({
      filePath: forceSaveAs ? undefined : file.path,
      content: file.content,
    });
    if (!res) return null;
    let docType: DocumentType = 'markdown';
    if (res.filename.endsWith('.mmd')) docType = 'mermaid';
    else if (res.filename.endsWith('.mdj')) docType = 'mdj';

    const { title, tags } = extractDocumentMetadata(file.content, res.filename);

    return {
      ...file,
      name: res.filename,
      path: res.filePath,
      isUnsaved: false,
      type: docType,
      title,
      tags,
    };
  }

  // Web Download fallback
  const blob = new Blob([file.content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name || (file.type === 'mermaid' ? 'diagram.mmd' : file.type === 'mdj' ? 'doc.mdj' : 'documento.md');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return {
    ...file,
    isUnsaved: false,
  };
};

export const selectLibraryDirectory = async (): Promise<string | null> => {
  if (isElectron() && window.electronAPI?.selectDirectory) {
    return await window.electronAPI.selectDirectory();
  }
  return null;
};

export const revealPathInExplorer = async (targetPath: string): Promise<boolean> => {
  if (isElectron() && window.electronAPI?.openPath) {
    return await window.electronAPI.openPath(targetPath);
  }
  return false;
};

export const exportHtmlToDevice = async (filename: string, htmlContent: string): Promise<boolean> => {
  if (isElectron() && window.electronAPI?.exportHTML) {
    return await window.electronAPI.exportHTML({ defaultFilename: filename, htmlContent });
  }

  // Web Download fallback
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
};
