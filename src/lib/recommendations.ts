/**
 * Content-based recommendation engine for Quran verses.
 *
 * Analyzes user reading patterns (pages visited, topic distribution)
 * and recommends verses from under-explored topics, creating a balanced
 * reading experience.
 */

import type { Verse } from './types';
import { TOPICS } from './types';
import type { ReadingStats } from './useReadingStats';

export interface TopicProfile {
  topic_id: number;
  color: string;
  read_count: number;      // verses from this topic the user has seen
  total_count: number;      // total verses in this topic
  coverage: number;         // 0-1 ratio
  affinity: number;         // normalized preference score
  exploration_score: number; // how much to recommend this topic (higher = recommend more)
}

export interface RecommendedVerse {
  verse: Verse;
  reason: 'discovery' | 'affinity' | 'daily' | 'random';
  reason_ar: string;
  reason_en: string;
  score: number;
}

/**
 * Build a topic profile from reading stats and verse data.
 * Determines which topics the user reads most and which they've neglected.
 */
export function buildTopicProfile(
  readingStats: ReadingStats,
  allVerses: Verse[]
): TopicProfile[] {
  // Count how many verses per topic the user has seen (by visited pages)
  const visitedPages = new Set(readingStats.pages_visited);
  const readByTopic: Record<number, number> = {};
  const totalByTopic: Record<number, number> = {};

  for (const v of allVerses) {
    const tid = v.topic.id;
    totalByTopic[tid] = (totalByTopic[tid] || 0) + 1;
    if (v.page && visitedPages.has(v.page)) {
      readByTopic[tid] = (readByTopic[tid] || 0) + 1;
    }
  }

  // Weight by visit frequency — pages visited more often have higher weight
  const visitCounts = readingStats.page_visit_counts || {};
  const weightedByTopic: Record<number, number> = {};
  for (const v of allVerses) {
    if (v.page && visitCounts[v.page]) {
      const tid = v.topic.id;
      weightedByTopic[tid] = (weightedByTopic[tid] || 0) + visitCounts[v.page];
    }
  }

  const totalWeighted = Object.values(weightedByTopic).reduce((s, v) => s + v, 0) || 1;

  const profiles: TopicProfile[] = [];
  for (const tid of [1, 2, 3, 4, 5, 6, 7]) {
    const topic = TOPICS[tid];
    const read = readByTopic[tid] || 0;
    const total = totalByTopic[tid] || 1;
    const coverage = read / total;
    const affinity = (weightedByTopic[tid] || 0) / totalWeighted;

    // Exploration score: boost under-explored topics, slightly boost low-affinity topics
    // Formula: (1 - coverage) * 0.6 + (1 - affinity) * 0.4
    const exploration_score = (1 - coverage) * 0.6 + (1 - affinity) * 0.4;

    profiles.push({
      topic_id: tid,
      color: topic.color,
      read_count: read,
      total_count: total,
      coverage,
      affinity,
      exploration_score,
    });
  }

  return profiles.sort((a, b) => b.exploration_score - a.exploration_score);
}

/**
 * Deterministic "verse of the day" based on date.
 * Uses a seeded hash so the same date always produces the same verse,
 * but each day is different.
 */
export function getDailyVerseIndex(date: string, totalVerses: number): number {
  // Simple string hash (djb2)
  let hash = 5381;
  for (let i = 0; i < date.length; i++) {
    hash = ((hash << 5) + hash + date.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % totalVerses;
}

/**
 * Generate smart recommendations.
 * Returns a prioritized list of recommended verses.
 */
export function getRecommendations(
  readingStats: ReadingStats,
  allVerses: Verse[],
  count: number = 5,
  dateStr?: string
): RecommendedVerse[] {
  if (allVerses.length === 0) return [];

  const date = dateStr || new Date().toISOString().split('T')[0];
  const profiles = buildTopicProfile(readingStats, allVerses);
  const visitedPages = new Set(readingStats.pages_visited);
  const results: RecommendedVerse[] = [];

  // 1) Daily verse — deterministic per date
  const dailyIdx = getDailyVerseIndex(date, allVerses.length);
  const dailyVerse = allVerses[dailyIdx];
  results.push({
    verse: dailyVerse,
    reason: 'daily',
    reason_ar: '🌟 آية اليوم',
    reason_en: '🌟 Verse of the Day',
    score: 100,
  });

  // 2) Discovery — verses from under-explored topics on unvisited pages
  const seenKeys = new Set(results.map(r => r.verse.verse_key));
  const underExplored = profiles.filter(p => p.coverage < 0.5);
  for (const profile of underExplored) {
    if (results.length >= count) break;
    const candidates = allVerses.filter(v =>
      v.topic.id === profile.topic_id &&
      v.page != null &&
      !visitedPages.has(v.page) &&
      !seenKeys.has(v.verse_key)
    );
    if (candidates.length > 0) {
      // Pick deterministically based on date + topic
      const idx = getDailyVerseIndex(date + profile.topic_id, candidates.length);
      const verse = candidates[idx];
      seenKeys.add(verse.verse_key);
      results.push({
        verse,
        reason: 'discovery',
        reason_ar: '🔍 اكتشف موضوعاً جديداً',
        reason_en: '🔍 Discover a new topic',
        score: 80 + profile.exploration_score * 10,
      });
    }
  }

  // 3) Affinity — more from topics the user likes, but different verses
  const topAffinity = [...profiles].sort((a, b) => b.affinity - a.affinity);
  for (const profile of topAffinity) {
    if (results.length >= count) break;
    if (profile.affinity < 0.05) continue; // Skip topics with negligible affinity
    const candidates = allVerses.filter(v =>
      v.topic.id === profile.topic_id &&
      v.page != null &&
      !visitedPages.has(v.page) &&
      !seenKeys.has(v.verse_key)
    );
    if (candidates.length > 0) {
      const idx = getDailyVerseIndex(date + 'aff' + profile.topic_id, candidates.length);
      const verse = candidates[idx];
      seenKeys.add(verse.verse_key);
      results.push({
        verse,
        reason: 'affinity',
        reason_ar: '❤️ من مواضيعك المفضلة',
        reason_en: '❤️ From your favorite topics',
        score: 60 + profile.affinity * 20,
      });
    }
  }

  // 4) Fill remaining with random (deterministic) picks
  while (results.length < count) {
    const seed = date + 'rnd' + results.length;
    const idx = getDailyVerseIndex(seed, allVerses.length);
    const verse = allVerses[idx];
    if (seenKeys.has(verse.verse_key)) {
      // Try next
      const idx2 = (idx + 1) % allVerses.length;
      const verse2 = allVerses[idx2];
      if (seenKeys.has(verse2.verse_key)) break; // avoid infinite
      seenKeys.add(verse2.verse_key);
      results.push({
        verse: verse2,
        reason: 'random',
        reason_ar: '📖 آية مقترحة',
        reason_en: '📖 Suggested verse',
        score: 40,
      });
    } else {
      seenKeys.add(verse.verse_key);
      results.push({
        verse,
        reason: 'random',
        reason_ar: '📖 آية مقترحة',
        reason_en: '📖 Suggested verse',
        score: 40,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
