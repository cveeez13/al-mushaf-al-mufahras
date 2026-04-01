'use client';

/**
 * useOffline — Manages offline state, Service Worker lifecycle, sync queue, and cache status.
 *
 * Provides:
 * - isOnline: Current connectivity state (navigator.onLine + periodic check)
 * - swStatus: 'unsupported' | 'installing' | 'waiting' | 'active' | 'error'
 * - syncStatus: Queue size, last sync time, syncing flag
 * - cacheReady: Whether critical data is precached
 * - registerSW(): Registers Service Worker
 * - triggerSync(): Flushes sync queue
 * - exportData() / importData(): Manual backup/restore
 * - cacheTafsirBatch(): Pre-cache tafsir for a surah
 * - precacheAudio(): Pre-cache audio for verses
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { migrateFromLocalStorage, getStorageEstimate, dbGet, dbPut, STORES } from './offlineDB';
import { flushSyncQueue, getSyncStatus, exportUserData, importUserData, type SyncStatus, type ExportData } from './syncEngine';

export type SWStatus = 'unsupported' | 'installing' | 'waiting' | 'active' | 'error';

export interface OfflineState {
  isOnline: boolean;
  swStatus: SWStatus;
  syncStatus: SyncStatus;
  cacheReady: boolean;
  storageUsage: number;
  storagePercent: number;
  migrated: boolean;
}

const DEFAULT_SYNC: SyncStatus = {
  queueSize: 0, lastSyncAt: null, isSyncing: false, lastError: null,
};

export function useOffline() {
  const [isOnline, setIsOnline] = useState(true);
  const [swStatus, setSwStatus] = useState<SWStatus>('unsupported');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(DEFAULT_SYNC);
  const [cacheReady, setCacheReady] = useState(false);
  const [storageUsage, setStorageUsage] = useState(0);
  const [storagePercent, setStoragePercent] = useState(0);
  const [migrated, setMigrated] = useState(false);
  const syncingRef = useRef(false);

  // ─── Online/Offline detection ────────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateOnline = () => setIsOnline(navigator.onLine);
    setIsOnline(navigator.onLine);

    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);

    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  // ─── Auto-sync when coming back online ───────────────────────

  useEffect(() => {
    if (isOnline && syncStatus.queueSize > 0) {
      triggerSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // ─── Service Worker registration ─────────────────────────────

  const registerSW = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      setSwStatus('unsupported');
      return;
    }

    try {
      setSwStatus('installing');
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

      // Track SW lifecycle
      const trackState = (sw: ServiceWorker) => {
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed') setSwStatus('waiting');
          else if (sw.state === 'activated') {
            setSwStatus('active');
            setCacheReady(true);
          }
        });
      };

      if (reg.installing) {
        trackState(reg.installing);
      } else if (reg.waiting) {
        setSwStatus('waiting');
        // Auto-activate waiting SW
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else if (reg.active) {
        setSwStatus('active');
        setCacheReady(true);
      }

      reg.addEventListener('updatefound', () => {
        if (reg.installing) trackState(reg.installing);
      });

      // Listen for messages from SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type } = event.data || {};
        if (type === 'SYNC_TRIGGERED' || type === 'PERIODIC_SYNC') {
          triggerSync();
        }
      });

    } catch (err) {
      console.error('[useOffline] SW registration failed:', err);
      setSwStatus('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── IndexedDB migration on mount ───────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined') return;

    (async () => {
      try {
        // Run migration (idempotent — checks if already migrated)
        const result = await migrateFromLocalStorage();
        const didMigrate = result.bookmarks > 0 || result.readingStats || result.memorization || result.highlights > 0;
        setMigrated(didMigrate);

        // Register SW
        await registerSW();

        // Load sync status
        const status = await getSyncStatus();
        setSyncStatus(status);

        // Storage estimate
        const est = await getStorageEstimate();
        setStorageUsage(est.usage);
        setStoragePercent(est.percent);

      } catch (err) {
        console.error('[useOffline] Init error:', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Sync queue flush ────────────────────────────────────────

  const triggerSync = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setSyncStatus(prev => ({ ...prev, isSyncing: true }));

    try {
      const result = await flushSyncQueue();
      const status = await getSyncStatus();
      setSyncStatus({ ...status, isSyncing: false });
      console.log(`[Sync] Flushed: ${result.success} succeeded, ${result.failed} failed`);
    } catch (err) {
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastError: err instanceof Error ? err.message : 'Sync failed',
      }));
    } finally {
      syncingRef.current = false;
    }
  }, []);

  // ─── Data export ─────────────────────────────────────────────

  const exportData = useCallback(async (): Promise<string> => {
    const data = await exportUserData();
    return JSON.stringify(data, null, 2);
  }, []);

  // ─── Data import ─────────────────────────────────────────────

  const importData = useCallback(async (jsonString: string): Promise<boolean> => {
    try {
      const data: ExportData = JSON.parse(jsonString);
      await importUserData(data);
      return true;
    } catch (err) {
      console.error('[Import] Failed:', err);
      return false;
    }
  }, []);

  // ─── Pre-cache tafsir for a surah ────────────────────────────

  const cacheTafsirForSurah = useCallback(async (
    surah: number,
    ayahCount: number,
    tafsirIds: number[]
  ): Promise<number> => {
    if (!navigator.onLine) return 0;

    let cached = 0;
    for (const tafsirId of tafsirIds) {
      for (let ayah = 1; ayah <= ayahCount; ayah++) {
        const key = `${tafsirId}:${surah}:${ayah}`;
        const existing = await dbGet(STORES.TAFSIR_CACHE, key);
        if (existing) continue;

        try {
          const url = `https://api.quran.com/api/v4/tafsirs/${tafsirId}/by_ayah/${surah}:${ayah}`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            const text = data.tafsir?.text?.replace(/<[^>]*>/g, '') || '';
            await dbPut(STORES.TAFSIR_CACHE, {
              key,
              tafsirId,
              text,
              cachedAt: new Date().toISOString(),
            });
            cached++;
          }
          // Small delay to avoid rate limiting
          await new Promise(r => setTimeout(r, 100));
        } catch {
          // Skip and continue
        }
      }
    }
    return cached;
  }, []);

  // ─── Pre-cache audio for a page ──────────────────────────────

  const precacheAudio = useCallback(async (urls: string[]): Promise<void> => {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;

    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_AUDIO',
      payload: { urls },
    });
  }, []);

  // ─── Refresh storage stats ────────────────────────────────────

  const refreshStorageStats = useCallback(async () => {
    const est = await getStorageEstimate();
    setStorageUsage(est.usage);
    setStoragePercent(est.percent);
  }, []);

  return {
    isOnline,
    swStatus,
    syncStatus,
    cacheReady,
    storageUsage,
    storagePercent,
    migrated,
    triggerSync,
    exportData,
    importData,
    cacheTafsirForSurah,
    precacheAudio,
    refreshStorageStats,
    registerSW,
  };
}
