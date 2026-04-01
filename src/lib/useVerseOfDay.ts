'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { topicClassifier } from './TopicClassifier';
import { useReadingStats } from './useReadingStats';
import { getRecommendations, type RecommendedVerse } from './recommendations';

const VOTD_STORAGE_KEY = 'mushaf-votd-dismissed';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function useVerseOfDay() {
  const { stats } = useReadingStats();
  const [verses, setVerses] = useState<RecommendedVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  // Check if dismissed today
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(VOTD_STORAGE_KEY);
    if (stored === today()) setDismissed(true);
  }, []);

  // Load data and compute recommendations
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await topicClassifier.load();
      if (cancelled) return;
      // Access all verses via page iteration (1-604)
      const allVerses = [];
      for (let p = 1; p <= 604; p++) {
        allVerses.push(...topicClassifier.getVersesForPage(p));
      }
      if (cancelled) return;
      const recs = getRecommendations(stats, allVerses, 5);
      setVerses(recs);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [stats]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem(VOTD_STORAGE_KEY, today());
  }, []);

  const dailyVerse = useMemo(() => verses.find(v => v.reason === 'daily') || null, [verses]);
  const suggestions = useMemo(() => verses.filter(v => v.reason !== 'daily'), [verses]);

  return { dailyVerse, suggestions, loading, dismissed, dismiss };
}
