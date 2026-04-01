'use client';

/**
 * IndexedDB storage layer for offline-first architecture.
 * Stores: bookmarks, readingStats, memorization, highlights, tafsirCache, syncQueue, metadata.
 * Each record has _updatedAt for conflict resolution (Last-Write-Wins).
 */

const DB_NAME = 'mushaf-offline';
const DB_VERSION = 2;

// Store names
export const STORES = {
  BOOKMARKS: 'bookmarks',
  READING_STATS: 'readingStats',
  MEMORIZATION: 'memorization',
  HIGHLIGHTS: 'highlights',
  TAFSIR_CACHE: 'tafsirCache',
  AUDIO_CACHE: 'audioCache',
  SYNC_QUEUE: 'syncQueue',
  METADATA: 'metadata',
  TOPIC_OVERRIDES: 'topicOverrides',
  SUB_TOPICS: 'subTopics',
  AUDIT_LOG: 'auditLog',
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Bookmarks: keyed by verse_key
      if (!db.objectStoreNames.contains(STORES.BOOKMARKS)) {
        const store = db.createObjectStore(STORES.BOOKMARKS, { keyPath: 'verse_key' });
        store.createIndex('created_at', 'created_at');
        store.createIndex('_updatedAt', '_updatedAt');
      }

      // Reading stats: single record with key 'stats'
      if (!db.objectStoreNames.contains(STORES.READING_STATS)) {
        db.createObjectStore(STORES.READING_STATS, { keyPath: 'id' });
      }

      // Memorization: keyed by verse_key
      if (!db.objectStoreNames.contains(STORES.MEMORIZATION)) {
        const store = db.createObjectStore(STORES.MEMORIZATION, { keyPath: 'id' });
        store.createIndex('_updatedAt', '_updatedAt');
      }

      // Highlights: keyed by id
      if (!db.objectStoreNames.contains(STORES.HIGHLIGHTS)) {
        const store = db.createObjectStore(STORES.HIGHLIGHTS, { keyPath: 'id' });
        store.createIndex('verse_key', 'verse_key');
        store.createIndex('_updatedAt', '_updatedAt');
      }

      // Tafsir cache: keyed by "tafsirId:verseKey"
      if (!db.objectStoreNames.contains(STORES.TAFSIR_CACHE)) {
        const store = db.createObjectStore(STORES.TAFSIR_CACHE, { keyPath: 'key' });
        store.createIndex('tafsirId', 'tafsirId');
        store.createIndex('cachedAt', 'cachedAt');
      }

      // Audio cache: metadata for cached audio blobs
      if (!db.objectStoreNames.contains(STORES.AUDIO_CACHE)) {
        const store = db.createObjectStore(STORES.AUDIO_CACHE, { keyPath: 'key' });
        store.createIndex('cachedAt', 'cachedAt');
      }

      // Sync queue: pending operations to retry when online
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const store = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('type', 'type');
      }

      // Metadata: app state like last sync time
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
      }

      // ─── Admin stores (v2) ─────────────────────────────────

      // Topic overrides: admin edits to verse classifications
      if (!db.objectStoreNames.contains(STORES.TOPIC_OVERRIDES)) {
        const store = db.createObjectStore(STORES.TOPIC_OVERRIDES, { keyPath: 'verse_key' });
        store.createIndex('new_topic_id', 'new_topic_id');
        store.createIndex('updatedAt', 'updatedAt');
      }

      // Sub-topics: user-created sub-categories under the 7 main topics
      if (!db.objectStoreNames.contains(STORES.SUB_TOPICS)) {
        const store = db.createObjectStore(STORES.SUB_TOPICS, { keyPath: 'id' });
        store.createIndex('parent_topic_id', 'parent_topic_id');
      }

      // Audit log: tracks all admin actions for accountability
      if (!db.objectStoreNames.contains(STORES.AUDIT_LOG)) {
        const store = db.createObjectStore(STORES.AUDIT_LOG, { keyPath: 'id', autoIncrement: true });
        store.createIndex('action', 'action');
        store.createIndex('timestamp', 'timestamp');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

// ─── Generic CRUD operations ────────────────────────────────────

export async function dbGet<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGetAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function dbPut<T>(store: StoreName, value: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function dbPutBatch<T>(store: StoreName, values: T[]): Promise<void> {
  if (values.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const objStore = tx.objectStore(store);
    for (const v of values) objStore.put(v);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function dbDelete(store: StoreName, key: IDBValidKey): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function dbClear(store: StoreName): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function dbCount(store: StoreName): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─── Index-based queries ────────────────────────────────────────

export async function dbGetByIndex<T>(
  store: StoreName,
  indexName: string,
  value: IDBValidKey
): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const idx = tx.objectStore(store).index(indexName);
    const req = idx.getAll(value);
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

// ─── Migration: localStorage → IndexedDB ────────────────────────

export interface MigrationResult {
  bookmarks: number;
  readingStats: boolean;
  memorization: boolean;
  highlights: number;
  tafsirEntries: number;
}

export async function migrateFromLocalStorage(): Promise<MigrationResult> {
  const result: MigrationResult = {
    bookmarks: 0, readingStats: false, memorization: false,
    highlights: 0, tafsirEntries: 0,
  };

  // Check if already migrated
  const meta = await dbGet<{ key: string; value: string }>(STORES.METADATA, 'migrated');
  if (meta) return result;

  try {
    // 1. Bookmarks
    const bmRaw = localStorage.getItem('mushaf-bookmarks');
    if (bmRaw) {
      const bookmarks = JSON.parse(bmRaw) as Array<Record<string, unknown>>;
      const records = bookmarks.map(b => ({
        ...b,
        _updatedAt: (b.created_at as string) || new Date().toISOString(),
        _deleted: false,
      }));
      await dbPutBatch(STORES.BOOKMARKS, records);
      result.bookmarks = records.length;
    }

    // 2. Reading stats
    const statsRaw = localStorage.getItem('mushaf-reading-stats');
    if (statsRaw) {
      const stats = JSON.parse(statsRaw);
      await dbPut(STORES.READING_STATS, {
        id: 'stats',
        ...stats,
        _updatedAt: new Date().toISOString(),
      });
      result.readingStats = true;
    }

    // 3. Memorization
    const memRaw = localStorage.getItem('mushaf-memorization');
    if (memRaw) {
      const data = JSON.parse(memRaw);
      await dbPut(STORES.MEMORIZATION, {
        id: 'data',
        ...data,
        _updatedAt: new Date().toISOString(),
      });
      result.memorization = true;
    }

    // 4. Highlights
    const hlRaw = localStorage.getItem('mushaf-highlights');
    if (hlRaw) {
      const highlights = JSON.parse(hlRaw) as Array<Record<string, unknown>>;
      const records = highlights.map(h => ({
        ...h,
        _updatedAt: (h.created_at as string) || new Date().toISOString(),
        _deleted: false,
      }));
      await dbPutBatch(STORES.HIGHLIGHTS, records);
      result.highlights = records.length;
    }

    // 5. Tafsir cache (from localStorage prefixed keys)
    let tafsirCount = 0;
    const keysToMigrate: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('tafsir-cache-')) keysToMigrate.push(k);
    }
    const tafsirRecords = keysToMigrate.map(k => {
      const cacheKey = k.replace('tafsir-cache-', '');
      const [tafsirId] = cacheKey.split(':');
      return {
        key: cacheKey,
        tafsirId: parseInt(tafsirId),
        text: localStorage.getItem(k) || '',
        cachedAt: new Date().toISOString(),
      };
    });
    if (tafsirRecords.length > 0) {
      await dbPutBatch(STORES.TAFSIR_CACHE, tafsirRecords);
      tafsirCount = tafsirRecords.length;
    }
    result.tafsirEntries = tafsirCount;

    // Mark as migrated
    await dbPut(STORES.METADATA, { key: 'migrated', value: new Date().toISOString() });

  } catch (err) {
    console.error('Migration from localStorage failed:', err);
  }

  return result;
}

// ─── Storage estimation ─────────────────────────────────────────

export interface StorageEstimate {
  usage: number;   // bytes used
  quota: number;   // total quota
  percent: number; // usage percentage
}

export async function getStorageEstimate(): Promise<StorageEstimate> {
  if (navigator?.storage?.estimate) {
    const est = await navigator.storage.estimate();
    const usage = est.usage || 0;
    const quota = est.quota || 0;
    return { usage, quota, percent: quota > 0 ? Math.round((usage / quota) * 100) : 0 };
  }
  return { usage: 0, quota: 0, percent: 0 };
}
