/**
 * Content-based recommendation engine for Quran verses.
 *
 * Uses reading history plus lightweight user feedback to balance:
 * - discovery of under-read topics
 * - affinity with topics the user gravitates toward
 * - daily deterministic verse rotation
 * - soft avoidance of skipped verses
 */

import type { Verse } from './types';
import { TOPICS } from './types';
import type { ReadingStats } from './useReadingStats';

export interface TopicProfile {
  topic_id: number;
  color: string;
  read_count: number;
  total_count: number;
  coverage: number;
  affinity: number;
  exploration_score: number;
}

export interface RecommendationFeedback {
  liked: string[];
  skipped: string[];
  opened: string[];
  updated_at: string;
}

export interface RecommendedVerse {
  verse: Verse;
  reason: 'discovery' | 'affinity' | 'daily' | 'random' | 'feedback';
  reason_ar: string;
  reason_en: string;
  score: number;
}

export function emptyRecommendationFeedback(): RecommendationFeedback {
  return {
    liked: [],
    skipped: [],
    opened: [],
    updated_at: '',
  };
}

function normalizeFeedback(feedback?: Partial<RecommendationFeedback> | null): RecommendationFeedback {
  return {
    liked: Array.isArray(feedback?.liked) ? feedback!.liked : [],
    skipped: Array.isArray(feedback?.skipped) ? feedback!.skipped : [],
    opened: Array.isArray(feedback?.opened) ? feedback!.opened : [],
    updated_at: feedback?.updated_at || '',
  };
}

function buildFeedbackTopicWeights(
  feedback: RecommendationFeedback,
  allVerses: Verse[]
): Record<number, number> {
  const byKey = new Map(allVerses.map((verse) => [verse.verse_key, verse]));
  const weights: Record<number, number> = {};

  for (const key of feedback.liked) {
    const verse = byKey.get(key);
    if (!verse) continue;
    weights[verse.topic.id] = (weights[verse.topic.id] || 0) + 2;
  }

  for (const key of feedback.opened) {
    const verse = byKey.get(key);
    if (!verse) continue;
    weights[verse.topic.id] = (weights[verse.topic.id] || 0) + 0.4;
  }

  for (const key of feedback.skipped) {
    const verse = byKey.get(key);
    if (!verse) continue;
    weights[verse.topic.id] = (weights[verse.topic.id] || 0) - 1.5;
  }

  return weights;
}

export function buildTopicProfile(
  readingStats: ReadingStats,
  allVerses: Verse[],
  feedback?: Partial<RecommendationFeedback> | null
): TopicProfile[] {
  const safeFeedback = normalizeFeedback(feedback);
  const visitedPages = new Set(readingStats.pages_visited);
  const readByTopic: Record<number, number> = {};
  const totalByTopic: Record<number, number> = {};

  for (const verse of allVerses) {
    const topicId = verse.topic.id;
    totalByTopic[topicId] = (totalByTopic[topicId] || 0) + 1;
    if (verse.page && visitedPages.has(verse.page)) {
      readByTopic[topicId] = (readByTopic[topicId] || 0) + 1;
    }
  }

  const visitCounts = readingStats.page_visit_counts || {};
  const weightedByTopic: Record<number, number> = {};
  for (const verse of allVerses) {
    if (verse.page && visitCounts[verse.page]) {
      const topicId = verse.topic.id;
      weightedByTopic[topicId] = (weightedByTopic[topicId] || 0) + visitCounts[verse.page];
    }
  }

  const feedbackWeights = buildFeedbackTopicWeights(safeFeedback, allVerses);
  for (const [topicId, weight] of Object.entries(feedbackWeights)) {
    weightedByTopic[Number(topicId)] = (weightedByTopic[Number(topicId)] || 0) + weight;
  }

  const totalWeighted = Math.max(
    1,
    Object.values(weightedByTopic).reduce((sum, value) => sum + Math.max(0, value), 0)
  );

  const profiles: TopicProfile[] = [];
  for (const topicId of [1, 2, 3, 4, 5, 6, 7]) {
    const topic = TOPICS[topicId];
    const read = readByTopic[topicId] || 0;
    const total = totalByTopic[topicId] || 1;
    const coverage = read / total;
    const topicWeight = Math.max(0, weightedByTopic[topicId] || 0);
    const affinity = topicWeight / totalWeighted;
    const explorationScore = (1 - coverage) * 0.55 + (1 - affinity) * 0.25 + (coverage < 0.2 ? 0.2 : 0);

    profiles.push({
      topic_id: topicId,
      color: topic.color,
      read_count: read,
      total_count: total,
      coverage,
      affinity,
      exploration_score: explorationScore,
    });
  }

  return profiles.sort((a, b) => b.exploration_score - a.exploration_score);
}

export function getDailyVerseIndex(date: string, totalVerses: number): number {
  let hash = 5381;
  for (let i = 0; i < date.length; i++) {
    hash = ((hash << 5) + hash + date.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % totalVerses;
}

function scoreCandidateVerse(params: {
  verse: Verse;
  profile: TopicProfile | undefined;
  visitedPages: Set<number>;
  feedback: RecommendationFeedback;
  feedbackTopicWeights: Record<number, number>;
}): number {
  const { verse, profile, visitedPages, feedback, feedbackTopicWeights } = params;
  let score = 0;

  if (verse.page && !visitedPages.has(verse.page)) score += 12;
  if (profile) score += profile.exploration_score * 14 + profile.affinity * 10;

  if (feedback.liked.includes(verse.verse_key)) score -= 18;
  if (feedback.skipped.includes(verse.verse_key)) score -= 50;
  if (feedback.opened.includes(verse.verse_key)) score -= 6;

  score += (feedbackTopicWeights[verse.topic.id] || 0) * 3;
  return score;
}

function pickBestCandidate(
  candidates: Verse[],
  params: {
    profile?: TopicProfile;
    visitedPages: Set<number>;
    feedback: RecommendationFeedback;
    feedbackTopicWeights: Record<number, number>;
    dateSeed: string;
  }
): Verse | null {
  if (candidates.length === 0) return null;

  const withScores = candidates.map((verse, index) => ({
    verse,
    score:
      scoreCandidateVerse({
        verse,
        profile: params.profile,
        visitedPages: params.visitedPages,
        feedback: params.feedback,
        feedbackTopicWeights: params.feedbackTopicWeights,
      }) + getDailyVerseIndex(`${params.dateSeed}:${verse.verse_key}:${index}`, 11),
  }));

  withScores.sort((a, b) => b.score - a.score);
  return withScores[0]?.verse || null;
}

export function getRecommendations(
  readingStats: ReadingStats,
  allVerses: Verse[],
  count: number = 5,
  dateStr?: string,
  feedback?: Partial<RecommendationFeedback> | null
): RecommendedVerse[] {
  if (allVerses.length === 0) return [];

  const date = dateStr || new Date().toISOString().split('T')[0];
  const safeFeedback = normalizeFeedback(feedback);
  const feedbackTopicWeights = buildFeedbackTopicWeights(safeFeedback, allVerses);
  const profiles = buildTopicProfile(readingStats, allVerses, safeFeedback);
  const visitedPages = new Set(readingStats.pages_visited);
  const skippedKeys = new Set(safeFeedback.skipped);
  const results: RecommendedVerse[] = [];

  const dailyIdx = getDailyVerseIndex(date, allVerses.length);
  const dailyVerse = allVerses[dailyIdx];
  results.push({
    verse: dailyVerse,
    reason: 'daily',
    reason_ar: 'آية اليوم',
    reason_en: 'Verse of the Day',
    score: 100,
  });

  const seenKeys = new Set(results.map((item) => item.verse.verse_key));

  const favoredTopics = Object.entries(feedbackTopicWeights)
    .filter(([, weight]) => weight > 1)
    .map(([topicId]) => Number(topicId));

  for (const topicId of favoredTopics) {
    if (results.length >= count) break;
    const profile = profiles.find((item) => item.topic_id === topicId);
    const candidates = allVerses.filter((verse) =>
      verse.topic.id === topicId &&
      !seenKeys.has(verse.verse_key) &&
      !skippedKeys.has(verse.verse_key)
    );

    const picked = pickBestCandidate(candidates, {
      profile,
      visitedPages,
      feedback: safeFeedback,
      feedbackTopicWeights,
      dateSeed: `${date}:feedback:${topicId}`,
    });

    if (!picked) continue;
    seenKeys.add(picked.verse_key);
    results.push({
      verse: picked,
      reason: 'feedback',
      reason_ar: 'مبنية على تفاعلك السابق',
      reason_en: 'Based on your previous feedback',
      score: 88,
    });
  }

  const underExplored = profiles.filter((profile) => profile.coverage < 0.5);
  for (const profile of underExplored) {
    if (results.length >= count) break;
    const candidates = allVerses.filter((verse) =>
      verse.topic.id === profile.topic_id &&
      !seenKeys.has(verse.verse_key) &&
      !skippedKeys.has(verse.verse_key)
    );

    const picked = pickBestCandidate(candidates, {
      profile,
      visitedPages,
      feedback: safeFeedback,
      feedbackTopicWeights,
      dateSeed: `${date}:discovery:${profile.topic_id}`,
    });

    if (!picked) continue;
    seenKeys.add(picked.verse_key);
    results.push({
      verse: picked,
      reason: 'discovery',
      reason_ar: 'اكتشف موضوعًا جديدًا',
      reason_en: 'Discover a new topic',
      score: 76 + profile.exploration_score * 10,
    });
  }

  const topAffinity = [...profiles].sort((a, b) => b.affinity - a.affinity);
  for (const profile of topAffinity) {
    if (results.length >= count) break;
    if (profile.affinity < 0.03) continue;

    const candidates = allVerses.filter((verse) =>
      verse.topic.id === profile.topic_id &&
      !seenKeys.has(verse.verse_key) &&
      !skippedKeys.has(verse.verse_key)
    );

    const picked = pickBestCandidate(candidates, {
      profile,
      visitedPages,
      feedback: safeFeedback,
      feedbackTopicWeights,
      dateSeed: `${date}:affinity:${profile.topic_id}`,
    });

    if (!picked) continue;
    seenKeys.add(picked.verse_key);
    results.push({
      verse: picked,
      reason: 'affinity',
      reason_ar: 'من المواضيع التي تميل إليها',
      reason_en: 'From topics you often enjoy',
      score: 60 + profile.affinity * 22,
    });
  }

  while (results.length < count) {
    const idx = getDailyVerseIndex(`${date}:random:${results.length}`, allVerses.length);
    const verse = allVerses[idx];
    if (seenKeys.has(verse.verse_key) || skippedKeys.has(verse.verse_key)) {
      const fallback = allVerses.find((item) => !seenKeys.has(item.verse_key) && !skippedKeys.has(item.verse_key));
      if (!fallback) break;
      seenKeys.add(fallback.verse_key);
      results.push({
        verse: fallback,
        reason: 'random',
        reason_ar: 'اقتراح متوازن',
        reason_en: 'Balanced suggestion',
        score: 40,
      });
      continue;
    }

    seenKeys.add(verse.verse_key);
    results.push({
      verse,
      reason: 'random',
      reason_ar: 'اقتراح متوازن',
      reason_en: 'Balanced suggestion',
      score: 40,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}
