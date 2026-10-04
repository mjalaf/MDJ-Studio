import type { LibraryDocument, LibraryFolder, DocumentType } from '../types';
import { extractDocumentMetadata } from '../core/frontMatter';

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

  constructor() {
    this.load();
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

  public createFolder(name: string, parentId?: string): LibraryFolder {
    const newFolder: LibraryFolder = {
      id: 'folder-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      name: name.trim() || 'Nueva Carpeta',
      parentId,
      isExpanded: true,
    };
    this.folders.push(newFolder);
    this.save();
    return newFolder;
  }

  public renameFolder(id: string, newName: string): boolean {
    const folder = this.folders.find((f) => f.id === id);
    if (!folder) return false;
    folder.name = newName.trim() || folder.name;
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

  public deleteFolder(id: string): { deletedDocs: number; deletedFolders: number } {
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

    const newDoc: LibraryDocument = {
      id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      name: filename,
      folderId,
      title,
      tags,
      content: defaultContent,
      updatedAt: Date.now(),
      type: docType,
    };

    this.documents.push(newDoc);
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
