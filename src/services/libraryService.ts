import type { LibraryDocument, LibraryFolder, DocumentType } from '../types';
import { extractDocumentMetadata } from '../core/frontMatter';
import { createFolderOnDevice, renameFolderOnDevice, deleteFolderOnDevice, scanDirectoryOnDevice, joinPaths } from './fileService';
import { storageManager } from './storage';

const STORAGE_KEY_DOCS = 'mark_mermaid_library_docs';
const STORAGE_KEY_FOLDERS = 'mark_mermaid_library_folders';

const DEFAULT_FOLDERS: LibraryFolder[] = [
  { id: 'folder-guias', name: 'Guides & References', isExpanded: true },
  { id: 'folder-proyectos', name: 'Projects & Diagrams', isExpanded: true },
];

const DEFAULT_DOCUMENTS: LibraryDocument[] = [
  {
    id: 'doc-welcome',
    name: 'Welcome.md',
    folderId: 'folder-guias',
    title: 'Welcome to MDJ Studio',
    tags: ['getting-started', 'markdown', 'guide'],
    updatedAt: Date.now() - 1000 * 60 * 60 * 2,
    type: 'markdown',
    content: `---
title: Welcome to MDJ Studio
tags: [getting-started, guide, desktop]
---

# Welcome to MDJ Studio 🚀

**MDJ Studio** (*Markdown Jot Studio*) is your high-performance workspace for writing, visualizing, and organizing **Markdown** documents, **Mermaid** diagrams, and the enriched **MDJ** format.

> *Read. Write. Expand.*

## ✨ Key Features

- **Live Reader Mode (Default):** Fluid read-and-write experience with embedded diagrams.
- **Split Editor:** Side-by-side editing with synchronized dual-pane scrolling.
- **Mermaid Diagrams:** Flowcharts, sequence diagrams, architecture diagrams, Gantt charts, class diagrams, mindmaps, and state diagrams.
- **Enriched MDJ Directives:** Color styling, highlights, collapsible accordions, and encrypted confidential notes.
- **Exporting Options:** Generate publication-ready **PDFs** or standalone **Self-Contained HTML**.
- **Structured Library:** Organize your work with searchable nested folders and tags.

### Sample Flowchart

\`\`\`mermaid
graph TD
    A[Start Writing] --> B{Need Diagrams?}
    B -->|Yes| C[Insert Mermaid Blocks]
    B -->|No| D[Write Standard Markdown]
    C --> E[Instant Live Preview]
    D --> E
    E --> F[Export to PDF or HTML]
\`\`\`

Enjoy a modern, distraction-free markdown journey!
`,
  },
  {
    id: 'doc-mdj',
    name: 'MDJ-Directives.mdj',
    folderId: 'folder-guias',
    title: 'MDJ Directives & Syntax Guide',
    tags: ['mdj', 'directives', 'security', 'colors'],
    updatedAt: Date.now() - 1000 * 60 * 30,
    type: 'mdj',
    content: `---
title: MDJ Directives & Syntax Guide
tags: [mdj, directives, security, colors]
mdj:
  version: "1.2"
  extensions:
    - name: mdj-directives
      required: false
---

# MDJ Directives & Advanced Syntax Guide

The **MDJ** format extends standard Markdown with expressive presentation features while maintaining 100% backward compatibility with conventional Markdown parsers.

## 1. Inline Colors and Highlights

Highlight key ideas using the curated palette tokens:

- Inline colored text: :color[vibrant scarlet text]{color=red} or :color[corporate azure]{blue}.
- Marker-style highlights: :highlight[critical concept in amber]{yellow} or :highlight[verified status in green]{green}.

You can also wrap multi-paragraph blocks:

--color {"color":"purple"}
### Purple Highlight Block
Any Markdown written inside this block adopts the themed palette color, including sub-headings, lists, and quotes.
--end

## 2. Collapsible Sections (Accordions)

Keep your documents clean and digestible by collapsing lengthy technical specifications, logs, or secondary notes:

--collapse "Click to expand technical implementation details"
### Implementation Details
Collapsible sections enable readers to focus on key takeaways without visual clutter:
- Supports tables, nested lists, images, and code snippets.
- Preserves layout state during reading.
--end

## 3. Password-Protected Encrypted Content

Safeguard sensitive credentials, API keys, or confidential thoughts with client-side Web Crypto (AES-256-GCM) encryption. Encrypted blocks are never written to disk or exported in clear text without authentication.
`,
  },
  {
    id: 'doc-diagrams',
    name: 'System-Architecture.mmd',
    folderId: 'folder-proyectos',
    title: 'System Architecture Diagram',
    tags: ['mermaid', 'architecture'],
    updatedAt: Date.now() - 1000 * 60 * 10,
    type: 'mermaid',
    content: `architecture-beta
    group api(cloud)[Cloud & Desktop Services]

    service db(database)[Local Storage / File System] in api
    service engine(server)[Core Engine] in api
    service ui(internet)[React 19 Frontend] in api

    ui:R -- L:engine
    engine:B -- T:db
`,
  },
];

export class LibraryService {
  private folders: LibraryFolder[] = [];
  private documents: LibraryDocument[] = [];
  private libraryPath?: string;

  constructor() {
    this.load();
    this.initAsyncStorage().catch(console.warn);
  }

  public async initAsyncStorage(): Promise<void> {
    try {
      await storageManager.init();
      const sqliteFolders = await storageManager.loadFolders();
      const sqliteDocs = await storageManager.loadDocuments();
      if (sqliteFolders.length > 0) {
        this.folders = sqliteFolders;
      } else {
        await storageManager.saveFolders(this.folders);
      }
      if (sqliteDocs.length > 0) {
        this.documents = sqliteDocs;
      } else {
        await storageManager.saveDocuments(this.documents);
      }
    } catch (err) {
      console.warn('[LibraryService] SQLite async storage init fallback:', err);
    }
  }

  public async reloadFromStorage(): Promise<void> {
    const folders = await storageManager.loadFolders();
    const docs = await storageManager.loadDocuments();
    if (folders.length > 0) this.folders = folders;
    if (docs.length > 0) this.documents = docs;
    this.save();
  }

  public setLibraryPath(path?: string): void {
    this.libraryPath = path;
    if (path) {
      this.syncFoldersToDisk().catch((err) => console.warn('Failed to sync folders to disk:', err));
    }
  }

  public getLibraryPath(): string | undefined {
    return this.libraryPath;
  }

  public getDiskPathForFolder(folderId: string): string | undefined {
    if (!this.libraryPath) return undefined;
    const parts: string[] = [];
    let currentId: string | undefined = folderId;
    while (currentId) {
      const folder = this.folders.find((f) => f.id === currentId);
      if (!folder) break;
      parts.unshift(folder.name);
      currentId = folder.parentId;
    }
    if (parts.length === 0) return undefined;
    return joinPaths(this.libraryPath, ...parts);
  }

  public async syncFoldersToDisk(): Promise<void> {
    if (!this.libraryPath) return;
    await createFolderOnDevice(this.libraryPath);
    for (const folder of this.folders) {
      const diskPath = this.getDiskPathForFolder(folder.id);
      if (diskPath) {
        folder.path = diskPath;
        await createFolderOnDevice(diskPath);
      }
    }
    this.save();
  }

  public async syncWithDisk(): Promise<{ addedDocs: number; addedFolders: number }> {
    if (!this.libraryPath) return { addedDocs: 0, addedFolders: 0 };
    const scan = await scanDirectoryOnDevice(this.libraryPath);
    if (!scan.success) return { addedDocs: 0, addedFolders: 0 };

    let addedFolders = 0;
    let addedDocs = 0;

    const relPathToFolderId = new Map<string, string>();
    const sortedFolders = [...scan.folders].sort((a, b) => a.relativePath.localeCompare(b.relativePath));

    for (const f of sortedFolders) {
      const parentId = f.parentRelativePath ? relPathToFolderId.get(f.parentRelativePath) : undefined;
      let existing = this.folders.find((x) => 
        (x.path && x.path.toLowerCase() === f.path.toLowerCase()) ||
        (x.name === f.name && x.parentId === parentId)
      );

      if (!existing) {
        existing = {
          id: 'folder-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
          name: f.name,
          parentId,
          path: f.path,
          isExpanded: true,
        };
        this.folders.push(existing);
        addedFolders++;
      } else {
        existing.path = f.path;
        if (parentId && existing.parentId !== parentId) {
          existing.parentId = parentId;
        }
      }

      relPathToFolderId.set(f.relativePath, existing.id);
    }

    for (const d of scan.documents) {
      const folderId = d.parentRelativePath ? relPathToFolderId.get(d.parentRelativePath) : undefined;
      let docType: DocumentType = 'markdown';
      if (d.name.endsWith('.mmd')) docType = 'mermaid';
      else if (d.name.endsWith('.mdj')) docType = 'mdj';

      const existingDoc = this.documents.find((x) => 
        (x.path && x.path.toLowerCase() === d.path.toLowerCase()) ||
        (x.name === d.name && x.folderId === folderId)
      );

      const { title, tags } = extractDocumentMetadata(d.content, d.name);

      if (existingDoc) {
        existingDoc.path = d.path;
        existingDoc.folderId = folderId;
        if (d.modifiedAt > existingDoc.updatedAt) {
          existingDoc.content = d.content;
          existingDoc.title = title || existingDoc.name;
          existingDoc.tags = tags;
          existingDoc.updatedAt = d.modifiedAt;
        }
      } else {
        const newDoc: LibraryDocument = {
          id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
          name: d.name,
          folderId,
          path: d.path,
          title: title || d.name,
          tags,
          content: d.content,
          updatedAt: d.modifiedAt,
          type: docType,
        };
        this.documents.push(newDoc);
        addedDocs++;
      }
    }

    this.save();
    return { addedDocs, addedFolders };
  }

  private load(): void {
    try {
      const savedFolders = localStorage.getItem(STORAGE_KEY_FOLDERS);
      const savedDocs = localStorage.getItem(STORAGE_KEY_DOCS);

      this.folders = savedFolders ? JSON.parse(savedFolders) : DEFAULT_FOLDERS;
      this.documents = savedDocs ? JSON.parse(savedDocs) : DEFAULT_DOCUMENTS;

      // Migrate default folders to English if matching previous Spanish names
      const guiasFolder = this.folders.find((f) => f.id === 'folder-guias');
      if (guiasFolder && (guiasFolder.name === 'Guías y Referencias' || guiasFolder.name === 'Guías')) {
        guiasFolder.name = 'Guides & References';
      }
      const proyectosFolder = this.folders.find((f) => f.id === 'folder-proyectos');
      if (proyectosFolder && proyectosFolder.name === 'Proyectos y Diagramas') {
        proyectosFolder.name = 'Projects & Diagrams';
      }

      // Migrate default documents to English if matching previous Spanish names
      const welcomeDoc = this.documents.find((d) => d.id === 'doc-welcome');
      if (welcomeDoc && (welcomeDoc.name === 'Bienvenida.md' || welcomeDoc.title?.includes('Bienvenido'))) {
        welcomeDoc.name = 'Welcome.md';
        welcomeDoc.title = 'Welcome to MDJ Studio';
        welcomeDoc.tags = ['getting-started', 'markdown', 'guide'];
        welcomeDoc.content = DEFAULT_DOCUMENTS[0].content;
      }

      const mdjDoc = this.documents.find((d) => d.id === 'doc-mdj');
      if (mdjDoc && (mdjDoc.name === 'Directivas-MDJ.mdj' || mdjDoc.title?.includes('Directivas'))) {
        mdjDoc.name = 'MDJ-Directives.mdj';
        mdjDoc.title = 'MDJ Directives & Syntax Guide';
        mdjDoc.tags = ['mdj', 'directives', 'security', 'colors'];
        mdjDoc.content = DEFAULT_DOCUMENTS[1].content;
      }

      const diagDoc = this.documents.find((d) => d.id === 'doc-diagrams');
      if (diagDoc && (diagDoc.name === 'Arquitectura-Sistema.mmd' || diagDoc.title?.includes('Arquitectura'))) {
        diagDoc.name = 'System-Architecture.mmd';
        diagDoc.title = 'System Architecture Diagram';
        diagDoc.tags = ['mermaid', 'architecture'];
        diagDoc.content = DEFAULT_DOCUMENTS[2].content;
      }

      // Heal any legacy broken architecture arrow in doc-diagrams
      if (diagDoc && diagDoc.content.includes('ui:R --> engine')) {
        diagDoc.content = diagDoc.content
          .replace('ui:R --> engine', 'ui:R -- L:engine')
          .replace('engine:B --> db', 'engine:B -- T:db');
      }

      this.save();
    } catch {
      this.folders = DEFAULT_FOLDERS;
      this.documents = DEFAULT_DOCUMENTS;
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(this.folders));
      localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(this.documents));
      storageManager.saveFolders(this.folders).catch(console.warn);
      storageManager.saveDocuments(this.documents).catch(console.warn);
    } catch (e) {
      console.error('Error saving library data:', e);
    }
  }

  public getFolders(): LibraryFolder[] {
    return [...this.folders];
  }

  public getDocuments(): LibraryDocument[] {
    return [...this.documents];
  }

  public getDocumentById(id: string): LibraryDocument | undefined {
    return this.documents.find((d) => d.id === id);
  }

  public async createFolder(name: string, parentId?: string): Promise<LibraryFolder> {
    const trimmed = name.trim() || 'Nueva Carpeta';
    const newFolder: LibraryFolder = {
      id: 'folder-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      name: trimmed,
      parentId,
      isExpanded: true,
    };

    if (parentId) {
      const parent = this.folders.find((f) => f.id === parentId);
      if (parent) {
        parent.isExpanded = true;
      }
    }

    if (this.libraryPath) {
      let diskPath: string;
      if (parentId) {
        const parentDiskPath = this.getDiskPathForFolder(parentId) || this.libraryPath;
        diskPath = joinPaths(parentDiskPath, trimmed);
      } else {
        diskPath = joinPaths(this.libraryPath, trimmed);
      }
      newFolder.path = diskPath;
      await createFolderOnDevice(diskPath);
    }

    this.folders.push(newFolder);
    this.save();
    return newFolder;
  }

  public async renameFolder(id: string, newName: string): Promise<boolean> {
    const folder = this.folders.find((f) => f.id === id);
    if (!folder) return false;
    const trimmed = newName.trim();
    if (!trimmed || trimmed === folder.name) return false;

    const oldDiskPath = this.getDiskPathForFolder(id);
    folder.name = trimmed;

    if (this.libraryPath && oldDiskPath) {
      const newDiskPath = this.getDiskPathForFolder(id);
      if (newDiskPath) {
        await renameFolderOnDevice(oldDiskPath, newDiskPath);
        folder.path = newDiskPath;
      }
    }

    this.save();
    return true;
  }

  public toggleFolder(id: string): void {
    const folder = this.folders.find((f) => f.id === id);
    if (folder) {
      folder.isExpanded = !folder.isExpanded;
      this.save();
    }
  }

  public async deleteFolder(id: string): Promise<{ deletedDocs: number; deletedFolders: number }> {
    const diskPath = this.getDiskPathForFolder(id);
    if (this.libraryPath && diskPath) {
      await deleteFolderOnDevice(diskPath);
    }

    // Collect all subfolder IDs recursively
    const folderIdsToDelete = new Set<string>([id]);
    let added = true;
    while (added) {
      added = false;
      for (const f of this.folders) {
        if (f.parentId && folderIdsToDelete.has(f.parentId) && !folderIdsToDelete.has(f.id)) {
          folderIdsToDelete.add(f.id);
          added = true;
        }
      }
    }

    const docCountBefore = this.documents.length;
    this.documents = this.documents.filter((d) => !d.folderId || !folderIdsToDelete.has(d.folderId));
    const deletedDocs = docCountBefore - this.documents.length;

    const folderCountBefore = this.folders.length;
    this.folders = this.folders.filter((f) => !folderIdsToDelete.has(f.id));
    const deletedFolders = folderCountBefore - this.folders.length;

    this.save();
    return { deletedDocs, deletedFolders };
  }

  public createDocument(name: string, folderId?: string, content?: string): LibraryDocument {
    const filename = name.trim() || 'Nuevo-documento.md';
    let docType: DocumentType = 'markdown';
    if (filename.endsWith('.mmd')) docType = 'mermaid';
    else if (filename.endsWith('.mdj')) docType = 'mdj';

    const defaultContent =
      content ??
      `---\ntitle: ${filename.replace(/\.[^/.]+$/, '')}\ntags: []\n---\n\n# ${filename.replace(/\.[^/.]+$/, '')}\n\nEscribe aquí tu contenido...\n`;

    const { title, tags } = extractDocumentMetadata(defaultContent, filename);

    let docDiskPath: string | undefined;
    if (this.libraryPath) {
      if (folderId) {
        const folderDisk = this.getDiskPathForFolder(folderId);
        if (folderDisk) docDiskPath = joinPaths(folderDisk, filename);
      } else {
        docDiskPath = joinPaths(this.libraryPath, filename);
      }
    }

    const newDoc: LibraryDocument = {
      id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      name: filename,
      folderId,
      path: docDiskPath,
      title: title || filename,
      tags,
      content: defaultContent,
      updatedAt: Date.now(),
      type: docType,
    };

    this.documents.unshift(newDoc);
    this.save();
    return newDoc;
  }

  public updateDocument(id: string, updates: Partial<LibraryDocument>): boolean {
    const doc = this.documents.find((d) => d.id === id);
    if (!doc) return false;

    if (updates.content !== undefined) {
      doc.content = updates.content;
      const { title, tags } = extractDocumentMetadata(updates.content, doc.name);
      doc.title = title;
      doc.tags = tags;
    }
    if (updates.name !== undefined) {
      doc.name = updates.name;
      if (doc.name.endsWith('.mmd')) doc.type = 'mermaid';
      else if (doc.name.endsWith('.mdj')) doc.type = 'mdj';
      else doc.type = 'markdown';
    }
    if (updates.folderId !== undefined) {
      doc.folderId = updates.folderId;
    }
    doc.updatedAt = Date.now();

    this.save();
    return true;
  }

  public deleteDocument(id: string): boolean {
    const prevLen = this.documents.length;
    this.documents = this.documents.filter((d) => d.id !== id);
    if (this.documents.length !== prevLen) {
      this.save();
      return true;
    }
    return false;
  }

  public getItemPath(itemId: string, itemType: 'doc' | 'folder', libraryRoot = 'Biblioteca'): string {
    const parts: string[] = [];

    if (itemType === 'doc') {
      const doc = this.documents.find((d) => d.id === itemId);
      if (!doc) return '';
      parts.unshift(doc.name);
      let currentFolderId = doc.folderId;
      while (currentFolderId) {
        const folder = this.folders.find((f) => f.id === currentFolderId);
        if (!folder) break;
        parts.unshift(folder.name);
        currentFolderId = folder.parentId;
      }
    } else {
      let currentFolderId: string | undefined = itemId;
      while (currentFolderId) {
        const folder = this.folders.find((f) => f.id === currentFolderId);
        if (!folder) break;
        parts.unshift(folder.name);
        currentFolderId = folder.parentId;
      }
    }

    parts.unshift(libraryRoot);
    return parts.join(' / ');
  }
}

export const libraryService = new LibraryService();
