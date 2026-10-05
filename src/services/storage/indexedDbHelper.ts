/**
 * Lightweight IndexedDB helper for persisting SQLite binary database files
 * without relying on external npm dependencies.
 */

const DB_NAME = 'mdj_studio_storage';
const DB_VERSION = 1;
const STORE_NAME = 'sqlite_store';
const KEY_SQLITE_BINARY = 'sqlite_database_bytes';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

export async function saveSqliteBinaryToIndexedDB(data: Uint8Array): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(data, KEY_SQLITE_BINARY);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Failed to save SQLite database to IndexedDB'));
  });
}

export async function loadSqliteBinaryFromIndexedDB(): Promise<Uint8Array | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(KEY_SQLITE_BINARY);

      request.onsuccess = () => {
        const result = request.result;
        if (result && (result instanceof Uint8Array || ArrayBuffer.isView(result))) {
          resolve(new Uint8Array(result.buffer, result.byteOffset, result.byteLength));
        } else if (result instanceof ArrayBuffer) {
          resolve(new Uint8Array(result));
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error || new Error('Failed to load SQLite database from IndexedDB'));
    });
  } catch (err) {
    console.warn('[IndexedDB] Could not open database:', err);
    return null;
  }
}

export async function clearSqliteBinaryFromIndexedDB(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(KEY_SQLITE_BINARY);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Clear error:', err);
  }
}
