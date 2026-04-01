'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ReadingStats {
  pages_visited: number[];
  total_pages_read: number;
  last_page: number;
  last_read_date: string;
  streak_days: number;
  daily_history: Record<string, number[]>; // date -> pages visited
  page_visit_counts: Record<number, number>; // page -> total visit count
}

const STORAGE_KEY = 'mushaf-reading-stats';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

const DEFAULT_STATS: ReadingStats = {
  pages_visited: [], total_pages_read: 0, last_page: 1,
  last_read_date: '', streak_days: 0, daily_history: {}, page_visit_counts: {},
};

function loadStats(): ReadingStats {
  if (typeof window === 'undefined') return { ...DEFAULT_STATS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate old data without page_visit_counts
      if (!parsed.page_visit_counts) {
        parsed.page_visit_counts = {};
        for (const p of parsed.pages_visited || []) parsed.page_visit_counts[p] = 1;
      }
      return parsed;
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_STATS };
}

function saveStats(stats: ReadingStats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

export function useReadingStats() {
  const [stats, setStats] = useState<ReadingStats>(loadStats);

  useEffect(() => {
    setStats(loadStats());
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
      };
      saveStats(updated);
      return updated;
    });
  }, []);

  const todayPages = stats.daily_history[today()]?.length || 0;
  const progressPercent = Math.round((stats.total_pages_read / 604) * 100);

  return { stats, recordPageVisit, todayPages, progressPercent };
}
