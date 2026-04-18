'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { topicClassifier } from './TopicClassifier';
import { useReadingStats } from './useReadingStats';
import {
  emptyRecommendationFeedback,
  getRecommendations,
  type RecommendedVerse,
  type RecommendationFeedback,
} from './recommendations';

const VOTD_STORAGE_KEY = 'mushaf-votd-dismissed';
const FEEDBACK_STORAGE_KEY = 'mushaf-recommendation-feedback';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function msUntilNextDay(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

function loadFeedback(): RecommendationFeedback {
  if (typeof window === 'undefined') return emptyRecommendationFeedback();

  try {
    const raw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    if (!raw) return emptyRecommendationFeedback();
    return { ...emptyRecommendationFeedback(), ...JSON.parse(raw) };
  } catch {
    return emptyRecommendationFeedback();
  }
}

function saveFeedback(feedback: RecommendationFeedback) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(feedback));
}

function updateFeedbackList(list: string[], verseKey: string, add: boolean): string[] {
  const set = new Set(list);
  if (add) set.add(verseKey);
  else set.delete(verseKey);
  return Array.from(set);
}

export function useVerseOfDay() {
  const { stats } = useReadingStats();
  const [allVerses, setAllVerses] = useState<RecommendedVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [feedback, setFeedback] = useState<RecommendationFeedback>(emptyRecommendationFeedback());
  const [dateKey, setDateKey] = useState(today());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(VOTD_STORAGE_KEY);
    if (stored === today()) setDismissed(true);
    setFeedback(loadFeedback());
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await topicClassifier.load();
      if (cancelled) return;

      const verses = [];
      for (let page = 1; page <= 604; page++) {
        verses.push(...topicClassifier.getVersesForPage(page));
      }

      if (cancelled) return;
      const recommendations = getRecommendations(stats, verses, 6, dateKey, feedback);
      setAllVerses(recommendations);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [stats, feedback, dateKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const timeout = window.setTimeout(() => {
      setDateKey(today());
      setDismissed(false);
    }, msUntilNextDay());

    return () => window.clearTimeout(timeout);
  }, [dateKey]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem(VOTD_STORAGE_KEY, today());
  }, []);

  const mutateFeedback = useCallback((mutator: (current: RecommendationFeedback) => RecommendationFeedback) => {
    setFeedback((current) => {
      const next = mutator(current);
      saveFeedback(next);
      return next;
    });
  }, []);

  const likeVerse = useCallback((verseKey: string) => {
    mutateFeedback((current) => ({
      ...current,
      liked: updateFeedbackList(current.liked, verseKey, true),
      skipped: updateFeedbackList(current.skipped, verseKey, false),
      updated_at: new Date().toISOString(),
    }));
  }, [mutateFeedback]);

  const skipVerse = useCallback((verseKey: string) => {
    mutateFeedback((current) => ({
      ...current,
      skipped: updateFeedbackList(current.skipped, verseKey, true),
      liked: updateFeedbackList(current.liked, verseKey, false),
      updated_at: new Date().toISOString(),
    }));
  }, [mutateFeedback]);

  const markOpened = useCallback((verseKey: string) => {
    mutateFeedback((current) => ({
      ...current,
      opened: updateFeedbackList(current.opened, verseKey, true).slice(-80),
      updated_at: new Date().toISOString(),
    }));
  }, [mutateFeedback]);

  const dailyVerse = useMemo(
    () => allVerses.find((item) => item.reason === 'daily') || null,
    [allVerses]
  );

  const suggestions = useMemo(
    () => allVerses.filter((item) => item.reason !== 'daily'),
    [allVerses]
  );

  return {
    dailyVerse,
    suggestions,
    loading,
    dismissed,
    dismiss,
    likeVerse,
    skipVerse,
    markOpened,
    feedback,
  };
}
