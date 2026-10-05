import initSqlJs, { type Database } from 'sql.js';
import type { IStorageProvider, DatabaseStats, ConnectionTestResult } from './types';
import type { LibraryDocument, LibraryFolder } from '../../types';
import { loadSqliteBinaryFromIndexedDB, saveSqliteBinaryToIndexedDB } from './indexedDbHelper';

export class SqliteStorageProvider implements IStorageProvider {
  public id = 'sqlite' as const;
  public name = 'SQLite Local (WASM + IndexedDB)';
  public description = 'Base de datos relacional SQLite local con soporte de transacciones e indexación persistente en IndexedDB.';
  public isReady = false;

  private db: Database | null = null;
  private lastSavedAt = Date.now();

  public async init(): Promise<void> {
    if (this.isReady && this.db) return;

    try {
      const SQL = await initSqlJs({
        locateFile: (file) => {
          if (typeof window !== 'undefined') {
            return `${window.location.origin}/${file}`;
          }
          return `./${file}`;
        },
      });

      const existingBinary = await loadSqliteBinaryFromIndexedDB();
      if (existingBinary && existingBinary.byteLength > 0) {
        try {
          this.db = new SQL.Database(existingBinary);
          this.ensureSchema();
          this.isReady = true;
          return;
        } catch (dbErr) {
          console.warn('[SQLite] Existing binary corrupted, initializing clean database', dbErr);
        }
      }

      this.db = new SQL.Database();
      this.ensureSchema();
      this.migrateFromLocalStorage();
      await this.persist();
      this.isReady = true;
    } catch (err) {
      console.error('[SQLite] Failed to initialize SQLite WASM:', err);
      throw err;
    }
  }

  private ensureSchema(): void {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parentId TEXT,
        path TEXT,
        isExpanded INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        folderId TEXT,
        path TEXT,
        title TEXT,
        tags TEXT,
        content TEXT,
        updatedAt INTEGER,
        type TEXT
      );

      CREATE TABLE IF NOT EXISTS app_metadata (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  }

  private migrateFromLocalStorage(): void {
    if (!this.db || typeof window === 'undefined') return;

    try {
      const rawFolders = window.localStorage.getItem('mark_mermaid_library_folders');
      const rawDocs = window.localStorage.getItem('mark_mermaid_library_docs');

      if (rawFolders) {
        const folders: LibraryFolder[] = JSON.parse(rawFolders);
        for (const f of folders) {
          this.db.run(
            `INSERT OR REPLACE INTO folders (id, name, parentId, path, isExpanded) VALUES (?, ?, ?, ?, ?)`,
            [f.id, f.name, f.parentId || null, f.path || null, f.isExpanded ? 1 : 0]
          );
        }
      }

      if (rawDocs) {
        const docs: LibraryDocument[] = JSON.parse(rawDocs);
        for (const d of docs) {
          this.db.run(
            `INSERT OR REPLACE INTO documents (id, name, folderId, path, title, tags, content, updatedAt, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              d.id,
              d.name,
              d.folderId || null,
              d.path || null,
              d.title || d.name,
              JSON.stringify(d.tags || []),
              d.content || '',
              d.updatedAt || Date.now(),
              d.type || 'markdown',
            ]
          );
        }
      }
    } catch (err) {
      console.warn('[SQLite] LocalStorage migration warning:', err);
    }
  }

  private async persist(): Promise<void> {
    if (!this.db) return;
    try {
      const binary = this.db.export();
      await saveSqliteBinaryToIndexedDB(binary);
      this.lastSavedAt = Date.now();
    } catch (err) {
      console.error('[SQLite] Error persisting database to IndexedDB:', err);
    }
  }

  public async loadFolders(): Promise<LibraryFolder[]> {
    if (!this.db) await this.init();
    if (!this.db) return [];

    try {
      const stmt = this.db.prepare('SELECT id, name, parentId, path, isExpanded FROM folders ORDER BY name ASC');
      const folders: LibraryFolder[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        folders.push({
          id: String(row.id),
          name: String(row.name),
          parentId: row.parentId ? String(row.parentId) : undefined,
          path: row.path ? String(row.path) : undefined,
          isExpanded: Boolean(row.isExpanded),
        });
      }
      stmt.free();
      return folders;
    } catch (err) {
      console.error('[SQLite] loadFolders error:', err);
      return [];
    }
  }

  public async saveFolders(folders: LibraryFolder[]): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    try {
      this.db.run('BEGIN TRANSACTION;');
      this.db.run('DELETE FROM folders;');
      for (const f of folders) {
        this.db.run(
          `INSERT INTO folders (id, name, parentId, path, isExpanded) VALUES (?, ?, ?, ?, ?)`,
          [f.id, f.name, f.parentId || null, f.path || null, f.isExpanded ? 1 : 0]
        );
      }
      this.db.run('COMMIT;');
      await this.persist();
    } catch (err) {
      this.db.run('ROLLBACK;');
      console.error('[SQLite] saveFolders error:', err);
      throw err;
    }
  }

  public async loadDocuments(): Promise<LibraryDocument[]> {
    if (!this.db) await this.init();
    if (!this.db) return [];

    try {
      const stmt = this.db.prepare('SELECT id, name, folderId, path, title, tags, content, updatedAt, type FROM documents ORDER BY updatedAt DESC');
      const docs: LibraryDocument[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        let tags: string[] = [];
        if (row.tags) {
          try {
            tags = JSON.parse(String(row.tags));
          } catch {
            tags = [];
          }
        }

        docs.push({
          id: String(row.id),
          name: String(row.name),
          folderId: row.folderId ? String(row.folderId) : undefined,
          path: row.path ? String(row.path) : undefined,
          title: String(row.title || row.name),
          tags,
          content: String(row.content || ''),
          updatedAt: Number(row.updatedAt || Date.now()),
          type: (row.type as any) || 'markdown',
        });
      }
      stmt.free();
      return docs;
    } catch (err) {
      console.error('[SQLite] loadDocuments error:', err);
      return [];
    }
  }

  public async saveDocuments(docs: LibraryDocument[]): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    try {
      this.db.run('BEGIN TRANSACTION;');
      this.db.run('DELETE FROM documents;');
      for (const d of docs) {
        this.db.run(
          `INSERT INTO documents (id, name, folderId, path, title, tags, content, updatedAt, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            d.id,
            d.name,
            d.folderId || null,
            d.path || null,
            d.title || d.name,
            JSON.stringify(d.tags || []),
            d.content || '',
            d.updatedAt || Date.now(),
            d.type || 'markdown',
          ]
        );
      }
      this.db.run('COMMIT;');
      await this.persist();
    } catch (err) {
      this.db.run('ROLLBACK;');
      console.error('[SQLite] saveDocuments error:', err);
      throw err;
    }
  }

  public async exportDatabase(): Promise<Uint8Array> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');
    return this.db.export();
  }

  public async importDatabase(data: Uint8Array): Promise<void> {
    const SQL = await initSqlJs({
      locateFile: (file) => (typeof window !== 'undefined' ? `${window.location.origin}/${file}` : `./${file}`),
    });

    const newDb = new SQL.Database(data);
    this.db = newDb;
    this.ensureSchema();
    await this.persist();
  }

  public async getStats(): Promise<DatabaseStats> {
    if (!this.db) await this.init();
    let docCount = 0;
    let folderCount = 0;
    let sizeBytes = 0;

    if (this.db) {
      try {
        const docRes = this.db.exec('SELECT COUNT(*) as count FROM documents;');
        if (docRes.length && docRes[0].values.length) {
          docCount = Number(docRes[0].values[0][0]);
        }
        const folderRes = this.db.exec('SELECT COUNT(*) as count FROM folders;');
        if (folderRes.length && folderRes[0].values.length) {
          folderCount = Number(folderRes[0].values[0][0]);
        }
        const exported = this.db.export();
        sizeBytes = exported.byteLength;
      } catch (err) {
        console.warn('[SQLite] getStats error:', err);
      }
    }

    return {
      documentCount: docCount,
      folderCount,
      sizeBytes,
      lastSavedAt: this.lastSavedAt,
      engine: 'SQLite 3 (WASM + IndexedDB)',
    };
  }

  public async testConnection(): Promise<ConnectionTestResult> {
    try {
      await this.init();
      const stats = await this.getStats();
      return {
        success: true,
        message: `SQLite operativo. ${stats.documentCount} documentos y ${stats.folderCount} carpetas indexadas (${(stats.sizeBytes / 1024).toFixed(1)} KB).`,
        timestamp: Date.now(),
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Error al inicializar motor SQLite: ${err.message || String(err)}`,
        timestamp: Date.now(),
      };
    }
  }
}
