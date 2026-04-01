'use client';

/**
 * Tafsir service — fetches tafsir text from quran.com API v4
 * with 3-tier cache: memory → IndexedDB → localStorage (legacy) → API.
 * Offline-first: queues failed fetches for retry when online.
 */

export interface TafsirInfo {
  id: number;
  name_ar: string;
  name_en: string;
  author_ar: string;
  author_en: string;
}

export const TAFSIRS: TafsirInfo[] = [
  { id: 14, name_ar: 'تفسير ابن كثير', name_en: 'Tafsir Ibn Kathir', author_ar: 'ابن كثير', author_en: 'Ibn Kathir' },
  { id: 91, name_ar: 'تفسير السعدي', name_en: 'Tafsir Al-Sa\'di', author_ar: 'عبد الرحمن السعدي', author_en: 'Al-Sa\'di' },
  { id: 16, name_ar: 'التفسير الميسر', name_en: 'Al-Muyassar', author_ar: 'مجمع الملك فهد', author_en: 'King Fahd Complex' },
];

import { dbGet, dbPut, STORES } from './offlineDB';
import { enqueueSync } from './syncEngine';

const API_BASE = 'https://api.quran.com/api/v4';
const CACHE_PREFIX = 'tafsir-cache-';

// In-memory cache (tier 1)
const memCache = new Map<string, string>();

function cacheKey(tafsirId: number, verseKey: string): string {
  return `${tafsirId}:${verseKey}`;
}

// IndexedDB cache (tier 2)
async function getFromIDB(key: string): Promise<string | null> {
  try {
    const rec = await dbGet<{ key: string; text: string }>(STORES.TAFSIR_CACHE, key);
    return rec?.text ?? null;
  } catch {
    return null;
  }
}

async function saveToIDB(key: string, tafsirId: number, text: string): Promise<void> {
  try {
    await dbPut(STORES.TAFSIR_CACHE, {
      key,
      tafsirId,
      text,
      cachedAt: new Date().toISOString(),
    });
  } catch { /* IndexedDB full or unavailable */ }
}

// localStorage fallback (tier 3 — legacy)
function getFromStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(CACHE_PREFIX + key);
  } catch {
    return null;
  }
}

function saveToStorage(key: string, text: string) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, text);
  } catch {
    clearOldCache();
    try { localStorage.setItem(CACHE_PREFIX + key, text); } catch { /* give up */ }
  }
}

function clearOldCache() {
  if (typeof window === 'undefined') return;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(CACHE_PREFIX)) keys.push(k);
  }
  keys.slice(0, Math.floor(keys.length / 2)).forEach(k => localStorage.removeItem(k));
}

/**
 * Fetch tafsir text for a single ayah.
 * Uses 4-tier cache: memory → IndexedDB → localStorage (legacy) → API.
 * When offline, queues the fetch for retry later.
 */
export async function fetchTafsir(tafsirId: number, surah: number, ayah: number): Promise<string> {
  const verseKey = `${surah}:${ayah}`;
  const key = cacheKey(tafsirId, verseKey);

  // 1. Memory cache
  const mem = memCache.get(key);
  if (mem) return mem;

  // 2. IndexedDB cache (skip empty strings from stale entries)
  const idbText = await getFromIDB(key);
  if (idbText) {
    memCache.set(key, idbText);
    return idbText;
  }

  // 3. localStorage cache (legacy, skip empty)
  const stored = getFromStorage(key);
  if (stored) {
    memCache.set(key, stored);
    // Migrate to IDB in background
    saveToIDB(key, tafsirId, stored);
    return stored;
  }

  // 4. Fetch from API
  try {
    const url = `${API_BASE}/tafsirs/${tafsirId}/by_ayah/${verseKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();

    let text = '';
    if (data.tafsir?.text) {
      text = data.tafsir.text.replace(/<[^>]*>/g, '') || '';
    }

    memCache.set(key, text);
    // Save to both IDB (primary) and localStorage (fallback)
    await saveToIDB(key, tafsirId, text);
    saveToStorage(key, text);
    return text;
  } catch (err) {
    // Offline — queue for sync
    if (!navigator.onLine) {
      const url = `${API_BASE}/tafsirs/${tafsirId}/by_ayah/${verseKey}`;
      enqueueSync({ type: 'tafsir_fetch', url, method: 'GET', maxRetries: 5 });
    }
    console.error(`Failed to fetch tafsir ${tafsirId} for ${verseKey}:`, err);
    return '';
  }
}

/**
 * Fetch tafsir for all ayahs of a page in one batch.
 * Returns a map of verse_key → text.
 */
export async function fetchTafsirBatch(
  tafsirId: number,
  verses: { surah: number; ayah: number; verse_key: string }[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // Fetch in parallel with concurrency limit
  const BATCH_SIZE = 5;
  for (let i = 0; i < verses.length; i += BATCH_SIZE) {
    const batch = verses.slice(i, i + BATCH_SIZE);
    const texts = await Promise.all(
      batch.map(v => fetchTafsir(tafsirId, v.surah, v.ayah))
    );
    batch.forEach((v, j) => results.set(v.verse_key, texts[j]));
  }

  return results;
}

export function getTafsirInfo(id: number): TafsirInfo | undefined {
  return TAFSIRS.find(t => t.id === id);
}
