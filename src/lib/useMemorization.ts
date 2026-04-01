'use client';

import { useState, useEffect, useCallback } from 'react';
import { SM2Card, sm2, isDue, sortByPriority, createCard } from './sm2';

const STORAGE_KEY = 'mushaf-memorization';

interface MemorizationStats {
  total_cards: number;
  due_today: number;
  mastered: number;       // interval >= 21 days
  learning: number;       // interval < 21 days
  streak_days: number;
  total_reviews: number;
  today_reviews: number;
  last_review_date: string;
  daily_reviews: Record<string, number>; // date → review count
}

interface MemorizationData {
  cards: SM2Card[];
  stats: MemorizationStats;
}

function defaultStats(): MemorizationStats {
  return {
    total_cards: 0,
    due_today: 0,
    mastered: 0,
    learning: 0,
    streak_days: 0,
    total_reviews: 0,
    today_reviews: 0,
    last_review_date: '',
    daily_reviews: {},
  };
}

function loadData(): MemorizationData {
  if (typeof window === 'undefined') return { cards: [], stats: defaultStats() };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { cards: parsed.cards || [], stats: parsed.stats || defaultStats() };
    }
  } catch { /* ignore */ }
  return { cards: [], stats: defaultStats() };
}

function saveData(data: MemorizationData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function computeStats(cards: SM2Card[], dailyReviews: Record<string, number>): MemorizationStats {
  const today = new Date().toISOString().split('T')[0];
  const dueCount = cards.filter(c => isDue(c)).length;
  const mastered = cards.filter(c => c.interval >= 21).length;
  const totalReviews = cards.reduce((sum, c) => sum + c.total_reviews, 0);

  // Streak calculation
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const key = d.toISOString().split('T')[0];
    if (dailyReviews[key] && dailyReviews[key] > 0) streak++;
    else if (i > 0) break; // today might not have reviews yet (i=0)
    else break;
    d.setDate(d.getDate() - 1);
  }

  return {
    total_cards: cards.length,
    due_today: dueCount,
    mastered,
    learning: cards.length - mastered,
    streak_days: streak,
    total_reviews: totalReviews,
    today_reviews: dailyReviews[today] || 0,
    last_review_date: today,
    daily_reviews: dailyReviews,
  };
}

export function useMemorization() {
  const [cards, setCards] = useState<SM2Card[]>([]);
  const [stats, setStats] = useState<MemorizationStats>(defaultStats());
  const [dailyReviews, setDailyReviews] = useState<Record<string, number>>({});

  // Load on mount
  useEffect(() => {
    const data = loadData();
    setCards(data.cards);
    setDailyReviews(data.stats.daily_reviews || {});
    setStats(computeStats(data.cards, data.stats.daily_reviews || {}));
  }, []);

  // Persist whenever cards change
  const persist = useCallback((newCards: SM2Card[], newDaily: Record<string, number>) => {
    const newStats = computeStats(newCards, newDaily);
    setStats(newStats);
    saveData({ cards: newCards, stats: newStats });
  }, []);

  const addCard = useCallback((verse: {
    verse_key: string; surah: number; ayah: number; text: string; topic_color: string;
  }) => {
    setCards(prev => {
      if (prev.some(c => c.verse_key === verse.verse_key)) return prev;
      const updated = [...prev, createCard(verse)];
      persist(updated, dailyReviews);
      return updated;
    });
  }, [persist, dailyReviews]);

  const removeCard = useCallback((verseKey: string) => {
    setCards(prev => {
      const updated = prev.filter(c => c.verse_key !== verseKey);
      persist(updated, dailyReviews);
      return updated;
    });
  }, [persist, dailyReviews]);

  const isInDeck = useCallback((verseKey: string): boolean => {
    return cards.some(c => c.verse_key === verseKey);
  }, [cards]);

  const reviewCard = useCallback((verseKey: string, quality: number) => {
    const today = new Date().toISOString().split('T')[0];
    setCards(prev => {
      const updated = prev.map(c => {
        if (c.verse_key !== verseKey) return c;
        const result = sm2(c, quality);
        return {
          ...c,
          easiness: result.easiness,
          interval: result.interval,
          repetitions: result.repetitions,
          next_review: result.next_review,
          last_review: today,
          total_reviews: c.total_reviews + 1,
          correct_reviews: quality >= 3 ? c.correct_reviews + 1 : c.correct_reviews,
        };
      });
      const newDaily = { ...dailyReviews, [today]: (dailyReviews[today] || 0) + 1 };
      setDailyReviews(newDaily);
      persist(updated, newDaily);
      return updated;
    });
  }, [persist, dailyReviews]);

  const getDueCards = useCallback((): SM2Card[] => {
    return sortByPriority(cards.filter(c => isDue(c)));
  }, [cards]);

  const getAllCardsSorted = useCallback((): SM2Card[] => {
    return sortByPriority(cards);
  }, [cards]);

  const clearAll = useCallback(() => {
    setCards([]);
    setDailyReviews({});
    persist([], {});
  }, [persist]);

  return {
    cards,
    stats,
    addCard,
    removeCard,
    isInDeck,
    reviewCard,
    getDueCards,
    getAllCardsSorted,
    clearAll,
  };
}
