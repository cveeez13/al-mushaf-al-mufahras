'use client';

/**
 * Sync engine — queues failed operations when offline, replays on reconnect.
 * Conflict resolution strategy: Last-Write-Wins (LWW) based on _updatedAt timestamps.
 *
 * Architecture:
 * - SyncQueue: Stores pending operations in IndexedDB
 * - On reconnect: Flushes queue in FIFO order
 * - Merge: When remote data exists, LWW picks the most recent version
 * - Exports/Imports: For manual backup/restore across devices
 */

import {
  dbGet, dbGetAll, dbPut, dbPutBatch, dbDelete, dbClear,
  STORES,
} from './offlineDB';

// ─── Types ────────────────────────────────────────────────────

export interface SyncQueueEntry {
  id?: number;  // auto-incremented
  type: 'tafsir_fetch' | 'audio_cache' | 'api_call';
  url: string;
  method: string;
  body?: string;
  createdAt: string;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'in_flight' | 'failed';
}

export interface SyncableRecord {
  _updatedAt: string;
  _deleted?: boolean;
}

export interface SyncStatus {
  queueSize: number;
  lastSyncAt: string | null;
  isSyncing: boolean;
  lastError: string | null;
}

export interface ExportData {
  version: number;
  exportedAt: string;
  bookmarks: unknown[];
  readingStats: unknown;
  memorization: unknown;
  highlights: unknown[];
}

// ─── Queue operations ─────────────────────────────────────────

export async function enqueueSync(entry: Omit<SyncQueueEntry, 'id' | 'createdAt' | 'retryCount' | 'status'>): Promise<void> {
  await dbPut(STORES.SYNC_QUEUE, {
    ...entry,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    status: 'pending',
  });
}

export async function getQueueSize(): Promise<number> {
  const all = await dbGetAll<SyncQueueEntry>(STORES.SYNC_QUEUE);
  return all.filter(e => e.status === 'pending').length;
}

export async function flushSyncQueue(): Promise<{ success: number; failed: number }> {
  const entries = await dbGetAll<SyncQueueEntry>(STORES.SYNC_QUEUE);
  const pending = entries
    .filter(e => e.status === 'pending')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  let success = 0;
  let failed = 0;

  for (const entry of pending) {
    try {
      // Mark as in-flight
      await dbPut(STORES.SYNC_QUEUE, { ...entry, status: 'in_flight' });

      const response = await fetch(entry.url, {
        method: entry.method,
        body: entry.body,
        headers: entry.body ? { 'Content-Type': 'application/json' } : undefined,
      });

      if (response.ok) {
        // Cache the response if it's a tafsir fetch
        if (entry.type === 'tafsir_fetch') {
          const data = await response.json();
          if (data.tafsir?.text) {
            const text = data.tafsir.text.replace(/<[^>]*>/g, '');
            const urlObj = new URL(entry.url);
            // URL: /tafsirs/{tafsirId}/by_ayah/{verseKey}
            const parts = urlObj.pathname.split('/');
            const byAyahIdx = parts.indexOf('by_ayah');
            const tafsirId = byAyahIdx > 1 ? parts[byAyahIdx - 1] : null;
            const verseKey = byAyahIdx >= 0 ? parts[byAyahIdx + 1] : null;
            if (tafsirId && verseKey) {
              await dbPut(STORES.TAFSIR_CACHE, {
                key: `${tafsirId}:${verseKey}`,
                tafsirId: parseInt(tafsirId),
                text,
                cachedAt: new Date().toISOString(),
              });
            }
          }
        }

        // Remove from queue
        if (entry.id) await dbDelete(STORES.SYNC_QUEUE, entry.id);
        success++;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch {
      failed++;
      const retryCount = entry.retryCount + 1;
      if (retryCount >= entry.maxRetries) {
        // Max retries reached — mark as failed
        if (entry.id) await dbPut(STORES.SYNC_QUEUE, { ...entry, status: 'failed', retryCount });
      } else {
        // Reset to pending for next flush
        if (entry.id) await dbPut(STORES.SYNC_QUEUE, { ...entry, status: 'pending', retryCount });
      }
    }
  }

  // Update last sync time
  await dbPut(STORES.METADATA, {
    key: 'lastSyncAt',
    value: new Date().toISOString(),
  });

  return { success, failed };
}

// ─── Conflict resolution: Last-Write-Wins merge ──────────────

/**
 * Merge two arrays of syncable records by key field.
 * Uses Last-Write-Wins: newer _updatedAt wins.
 * Handles soft deletes (_deleted flag).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mergeRecords<T extends SyncableRecord>(
  local: T[],
  remote: T[],
  keyField: string
): T[] {
  const map = new Map<unknown, T>();

  // Add all local records
  for (const rec of local) {
    map.set((rec as any)[keyField], rec);
  }

  // Merge remote: LWW — newer timestamp wins
  for (const rec of remote) {
    const key = (rec as any)[keyField];
    const existing = map.get(key);

    if (!existing) {
      map.set(key, rec);
    } else {
      const localTime = new Date(existing._updatedAt).getTime();
      const remoteTime = new Date(rec._updatedAt).getTime();
      if (remoteTime > localTime) {
        map.set(key, rec);
      }
      // If timestamps equal, local wins (tie-break: local priority)
    }
  }

  // Filter out soft-deleted records
  return Array.from(map.values()).filter(r => !r._deleted);
}

// ─── Export / Import user data ────────────────────────────────

export async function exportUserData(): Promise<ExportData> {
  const bookmarks = await dbGetAll(STORES.BOOKMARKS);
  const readingStats = await dbGet(STORES.READING_STATS, 'stats');
  const memorization = await dbGet(STORES.MEMORIZATION, 'data');
  const highlights = await dbGetAll(STORES.HIGHLIGHTS);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    bookmarks,
    readingStats: readingStats || null,
    memorization: memorization || null,
    highlights,
  };
}

export async function importUserData(data: ExportData): Promise<{ merged: boolean }> {
  if (!data || data.version !== 1) {
    throw new Error('Invalid export format');
  }

  // Merge bookmarks using LWW
  const localBookmarks = await dbGetAll<SyncableRecord & { verse_key: string }>(STORES.BOOKMARKS);
  const merged = mergeRecords(
    localBookmarks,
    data.bookmarks as Array<SyncableRecord & { verse_key: string }>,
    'verse_key'
  );
  await dbClear(STORES.BOOKMARKS);
  await dbPutBatch(STORES.BOOKMARKS, merged);

  // Merge highlights using LWW
  const localHighlights = await dbGetAll<SyncableRecord & { id: string }>(STORES.HIGHLIGHTS);
  const mergedHL = mergeRecords(
    localHighlights,
    data.highlights as Array<SyncableRecord & { id: string }>,
    'id'
  );
  await dbClear(STORES.HIGHLIGHTS);
  await dbPutBatch(STORES.HIGHLIGHTS, mergedHL);

  // Reading stats: LWW on the single record
  if (data.readingStats) {
    const local = await dbGet<SyncableRecord>(STORES.READING_STATS, 'stats');
    const remote = data.readingStats as SyncableRecord;
    if (!local || new Date(remote._updatedAt) > new Date(local._updatedAt)) {
      await dbPut(STORES.READING_STATS, { id: 'stats', ...remote });
    }
  }

  // Memorization: LWW on the single record
  if (data.memorization) {
    const local = await dbGet<SyncableRecord>(STORES.MEMORIZATION, 'data');
    const remote = data.memorization as SyncableRecord;
    if (!local || new Date(remote._updatedAt) > new Date(local._updatedAt)) {
      await dbPut(STORES.MEMORIZATION, { id: 'data', ...remote });
    }
  }

  return { merged: true };
}

// ─── Sync status ──────────────────────────────────────────────

export async function getSyncStatus(): Promise<SyncStatus> {
  const queueSize = await getQueueSize();
  const lastSyncMeta = await dbGet<{ key: string; value: string }>(STORES.METADATA, 'lastSyncAt');
  return {
    queueSize,
    lastSyncAt: lastSyncMeta?.value || null,
    isSyncing: false,
    lastError: null,
  };
}
