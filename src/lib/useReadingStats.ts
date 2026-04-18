'use client';

import { useState, useEffect, useCallback } from 'react';
import { dbGet, dbPut, STORES } from './offlineDB';

export interface ReadingStats {
  pages_visited: number[];
  total_pages_read: number;
  last_page: number;
  last_read_date: string;
  streak_days: number;
  daily_history: Record<string, number[]>; // date -> pages visited
  page_visit_counts: Record<number, number>; // page -> total visit count
  daily_visit_counts: Record<string, number>; // date -> total visits
}

const STORAGE_KEY = 'mushaf-reading-stats';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

const DEFAULT_STATS: ReadingStats = {
  pages_visited: [], total_pages_read: 0, last_page: 1,
  last_read_date: '', streak_days: 0, daily_history: {}, page_visit_counts: {}, daily_visit_counts: {},
};

function normalizeStats(raw: Partial<ReadingStats> | null | undefined): ReadingStats {
  if (!raw) return { ...DEFAULT_STATS };
  const pages_visited = Array.isArray(raw.pages_visited) ? raw.pages_visited : [];
  const page_visit_counts = raw.page_visit_counts || {};
  const daily_history = raw.daily_history || {};
  const daily_visit_counts = raw.daily_visit_counts || {};
  return {
    pages_visited,
    total_pages_read: raw.total_pages_read ?? pages_visited.length,
    last_page: raw.last_page ?? 1,
    last_read_date: raw.last_read_date ?? '',
    streak_days: raw.streak_days ?? 0,
    daily_history,
    page_visit_counts,
    daily_visit_counts,
  };
}

function loadStatsFromLocalStorage(): ReadingStats {
  if (typeof window === 'undefined') return { ...DEFAULT_STATS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = normalizeStats(JSON.parse(raw));
      // Backfill page visit counts for legacy data
      if (!Object.keys(parsed.page_visit_counts).length && parsed.pages_visited.length) {
        for (const p of parsed.pages_visited) parsed.page_visit_counts[p] = 1;
      }
      return parsed;
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_STATS };
}

async function saveStats(stats: ReadingStats) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  }
  try {
    await dbPut(STORES.READING_STATS, {
      id: 'stats',
      ...stats,
      _updatedAt: new Date().toISOString(),
    });
  } catch {
    // IndexedDB might be unavailable in private mode; localStorage is enough fallback.
  }
}

export function useReadingStats() {
  const [stats, setStats] = useState<ReadingStats>(loadStatsFromLocalStorage);

  useEffect(() => {
    let mounted = true;
    const localStats = loadStatsFromLocalStorage();
    setStats(localStats);

    (async () => {
      try {
        const persisted = await dbGet<ReadingStats & { id: string }>(STORES.READING_STATS, 'stats');
        if (!mounted || !persisted) return;
        const normalized = normalizeStats(persisted);
        setStats(normalized);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const recordPageVisit = useCallback((page: number) => {
    setStats(prev => {
      const d = today();
      const pages_visited = prev.pages_visited.includes(page) ? prev.pages_visited : [...prev.pages_visited, page];
      const dayPages = prev.daily_history[d] || [];
      const daily_history = {
        ...prev.daily_history,
        [d]: dayPages.includes(page) ? dayPages : [...dayPages, page],
      };

      // Increment visit count for this page
      const page_visit_counts = {
        ...prev.page_visit_counts,
        [page]: (prev.page_visit_counts[page] || 0) + 1,
      };
      const daily_visit_counts = {
        ...prev.daily_visit_counts,
        [d]: (prev.daily_visit_counts[d] || 0) + 1,
      };

      // Calculate streak
      let streak = 1;
      const todayDate = new Date();
      for (let i = 1; i < 365; i++) {
        const checkDate = new Date(todayDate);
        checkDate.setDate(checkDate.getDate() - i);
        const key = checkDate.toISOString().split('T')[0];
        if (daily_history[key]?.length) streak++;
        else break;
      }

      const updated: ReadingStats = {
        pages_visited,
        total_pages_read: pages_visited.length,
        last_page: page,
        last_read_date: d,
        streak_days: streak,
        daily_history,
        page_visit_counts,
        daily_visit_counts,
      };
      void saveStats(updated);
      return updated;
    });
  }, []);

  const todayPages = stats.daily_history[today()]?.length || 0;
  const progressPercent = Math.round((stats.total_pages_read / 604) * 100);

  return { stats, recordPageVisit, todayPages, progressPercent };
}
