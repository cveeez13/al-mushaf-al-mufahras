/**
 * QuranReflect Real-Time Sync System
 *
 * Implements real-time updates using:
 * - localStorage change events (StorageEvent)
 * - Periodic polling fallback
 * - Optimistic updates for instant UI feedback
 *
 * No external WebSocket/SSE needed — leverages browser APIs
 */

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

export interface RealtimeUpdate {
  type: 'reflection_created' | 'reflection_updated' | 'reflection_deleted' | 'like_added' | 'reply_added';
  timestamp: number;
  reflectionId: string;
  data: unknown;
}

export interface SyncState {
  lastSync: number;
  pendingUpdates: RealtimeUpdate[];
  isOnline: boolean;
  syncInProgress: boolean;
}

export type RealtimeCallback = (update: RealtimeUpdate) => void;

// ───────────────────────────────────────────────────────────────
// Storage Keys
// ───────────────────────────────────────────────────────────────

const REALTIME_QUEUE_KEY = 'mushaf-reflections-realtime-queue';
const SYNC_STATE_KEY = 'mushaf-reflections-sync-state';
const LAST_SYNC_KEY = 'mushaf-reflections-last-sync';

// ───────────────────────────────────────────────────────────────
// Listeners Management
// ───────────────────────────────────────────────────────────────

const listeners = new Set<RealtimeCallback>();

/**
 * Subscribe to real-time reflection updates
 */
export function onRealtimeUpdate(callback: RealtimeCallback): () => void {
  listeners.add(callback);
  
  // Return unsubscribe function
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Broadcast update to all listeners
 */
function broadcastUpdate(update: RealtimeUpdate): void {
  listeners.forEach(callback => {
    try {
      callback(update);
    } catch (error) {
      console.error('Realtime callback error:', error);
    }
  });
}

// ───────────────────────────────────────────────────────────────
// Storage Events (Cross-Tab Sync)
// ───────────────────────────────────────────────────────────────

/**
 * Initialize storage event listeners for cross-tab sync
 */
export function initializeRealtimeSync(): void {
  if (typeof window === 'undefined') return;

  // Listen for localStorage changes from other tabs
  window.addEventListener('storage', event => {
    if (event.key === 'mushaf-reflections') {
      // Reflections were modified in another tab
      const update: RealtimeUpdate = {
        type: 'reflection_updated',
        timestamp: Date.now(),
        reflectionId: 'batch',
        data: { source: 'external-tab' },
      };
      broadcastUpdate(update);
    }
  });

  // Listen for online/offline events
  window.addEventListener('online', () => {
    setSyncState(state => ({ ...state, isOnline: true }));
    syncPendingUpdates();
  });

  window.addEventListener('offline', () => {
    setSyncState(state => ({ ...state, isOnline: false }));
  });

  // Start periodic sync (fallback)
  startPeriodicSync();
}

// ───────────────────────────────────────────────────────────────
// Update Queue (Optimistic Updates)
// ───────────────────────────────────────────────────────────────

/**
 * Add update to queue for eventual sync
 * Used for optimistic updates — shows change immediately
 */
export function queueUpdate(update: RealtimeUpdate): void {
  try {
    const queue = getUpdateQueue();
    queue.push(update);
    localStorage.setItem(REALTIME_QUEUE_KEY, JSON.stringify(queue));
    broadcastUpdate(update);
  } catch (error) {
    console.error('Failed to queue update:', error);
  }
}

/**
 * Get pending updates from queue
 */
function getUpdateQueue(): RealtimeUpdate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REALTIME_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Clear update queue
 */
function clearUpdateQueue(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(REALTIME_QUEUE_KEY);
}

// ───────────────────────────────────────────────────────────────
// Sync State Management
// ───────────────────────────────────────────────────────────────

export function getSyncState(): SyncState {
  if (typeof window === 'undefined') {
    return {
      lastSync: 0,
      pendingUpdates: [],
      isOnline: true,
      syncInProgress: false,
    };
  }

  try {
    const raw = localStorage.getItem(SYNC_STATE_KEY);
    return raw ? JSON.parse(raw) : getDefaultSyncState();
  } catch {
    return getDefaultSyncState();
  }
}

function getDefaultSyncState(): SyncState {
  return {
    lastSync: Date.now(),
    pendingUpdates: [],
    isOnline: navigator.onLine ?? true,
    syncInProgress: false,
  };
}

function setSyncState(updater: (state: SyncState) => SyncState): void {
  if (typeof window === 'undefined') return;
  const state = getSyncState();
  const newState = updater(state);
  localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(newState));
}

// ───────────────────────────────────────────────────────────────
// Periodic Sync (Fallback)
// ───────────────────────────────────────────────────────────────

let syncInterval: NodeJS.Timeout | null = null;
const SYNC_INTERVAL = 5000; // 5 seconds

function startPeriodicSync(): void {
  if (syncInterval) return;
  
  syncInterval = setInterval(() => {
    syncPendingUpdates();
  }, SYNC_INTERVAL);
}

function stopPeriodicSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

/**
 * Sync all pending updates
 */
export async function syncPendingUpdates(): Promise<void> {
  setSyncState(state => {
    if (state.syncInProgress) return state;
    return { ...state, syncInProgress: true };
  });

  try {
    const queue = getUpdateQueue();
    
    if (queue.length === 0) {
      setSyncState(state => ({
        ...state,
        syncInProgress: false,
        lastSync: Date.now(),
      }));
      return;
    }

    // Simulate sync delay (in real app, this would be HTTP request)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Emit each update to listeners
    queue.forEach(update => broadcastUpdate(update));

    // Clear queue after successful sync
    clearUpdateQueue();

    setSyncState(state => ({
      ...state,
      syncInProgress: false,
      lastSync: Date.now(),
      pendingUpdates: [],
    }));
  } catch (error) {
    console.error('Sync failed:', error);
    setSyncState(state => ({
      ...state,
      syncInProgress: false,
    }));
  }
}

// ───────────────────────────────────────────────────────────────
// Optimistic Updates
// ───────────────────────────────────────────────────────────────

/**
 * Record a reflection like with optimistic update
 */
export function optimisticLike(reflectionId: string): void {
  const update: RealtimeUpdate = {
    type: 'like_added',
    timestamp: Date.now(),
    reflectionId,
    data: { liked: true },
  };
  queueUpdate(update);
}

/**
 * Record a reply with optimistic update
 */
export function optimisticReply(reflectionId: string, replyText: string): void {
  const update: RealtimeUpdate = {
    type: 'reply_added',
    timestamp: Date.now(),
    reflectionId,
    data: { replyText },
  };
  queueUpdate(update);
}

/**
 * Record reflection creation with optimistic update
 */
export function optimisticCreate(reflectionId: string, verseKey: string): void {
  const update: RealtimeUpdate = {
    type: 'reflection_created',
    timestamp: Date.now(),
    reflectionId,
    data: { verseKey },
  };
  queueUpdate(update);
}

// ───────────────────────────────────────────────────────────────
// Conflict Resolution
// ───────────────────────────────────────────────────────────────

/**
 * Check if local version conflicts with remote
 * Last-write-wins strategy
 */
export function hasConflict(
  localTimestamp: number,
  remoteTimestamp: number,
): boolean {
  return Math.abs(localTimestamp - remoteTimestamp) < 1000; // Same second
}

/**
 * Resolve conflict by keeping latest version
 */
export function resolveConflict(
  local: { timestamp: number; data: unknown },
  remote: { timestamp: number; data: unknown },
): unknown {
  return local.timestamp >= remote.timestamp ? local.data : remote.data;
}

// ───────────────────────────────────────────────────────────────
// Session State
// ───────────────────────────────────────────────────────────────

/**
 * Get last successful sync timestamp
 */
export function getLastSyncTime(): number {
  return getSyncState().lastSync;
}

/**
 * Get sync status for UI display
 */
export function getSyncStatus(): 'synced' | 'syncing' | 'offline' | 'pending' {
  const state = getSyncState();
  
  if (!state.isOnline) return 'offline';
  if (state.syncInProgress) return 'syncing';
  if (state.pendingUpdates.length > 0) return 'pending';
  
  return 'synced';
}

/**
 * Get time since last sync
 */
export function getTimeSinceSync(): string {
  const lastSync = getLastSyncTime();
  const elapsed = Date.now() - lastSync;
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  
  return 'long time ago';
}

// ───────────────────────────────────────────────────────────────
// Cleanup
// ───────────────────────────────────────────────────────────────

/**
 * Stop all realtime sync and cleanup listeners
 */
export function cleanupRealtimeSync(): void {
  stopPeriodicSync();
  listeners.clear();
}

/**
 * Reset all sync state (for testing or user logout)
 */
export function resetSyncState(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SYNC_STATE_KEY);
  localStorage.removeItem(REALTIME_QUEUE_KEY);
}
