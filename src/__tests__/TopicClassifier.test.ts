import { describe, it, expect } from 'vitest';
import { TopicClassifier } from '@/lib/TopicClassifier';
import { TOPICS } from '@/lib/types';

describe('TopicClassifier static methods', () => {
  it('getTopicInfo should return topic by ID', () => {
    const topic = TopicClassifier.getTopicInfo(1);
    expect(topic).toBeDefined();
    expect(topic!.color).toBe('blue');
    expect(topic!.id).toBe(1);
  });

  it('getTopicInfo should return undefined for invalid ID', () => {
    expect(TopicClassifier.getTopicInfo(0)).toBeUndefined();
    expect(TopicClassifier.getTopicInfo(8)).toBeUndefined();
    expect(TopicClassifier.getTopicInfo(-1)).toBeUndefined();
  });

  it('getAllTopics should return all 7 topics', () => {
    const topics = TopicClassifier.getAllTopics();
    expect(topics).toHaveLength(7);
    expect(topics[0].id).toBe(1);
    expect(topics[6].id).toBe(7);
  });

  it('getSurahName should return Arabic name', () => {
    expect(TopicClassifier.getSurahName(1)).toBe('الفاتحة');
    expect(TopicClassifier.getSurahName(114)).toBe('الناس');
    expect(TopicClassifier.getSurahName(2)).toBe('البقرة');
  });

  it('getSurahName should return empty for invalid surah', () => {
    expect(TopicClassifier.getSurahName(0)).toBe('');
    expect(TopicClassifier.getSurahName(115)).toBe('');
  });
});

describe('TopicClassifier instance (without data)', () => {
  it('should initially not be loaded', () => {
    const tc = new TopicClassifier();
    expect(tc.isLoaded).toBe(false);
    expect(tc.totalVerses).toBe(0);
  });

  it('getTopicByAyah should return null before loading', () => {
    const tc = new TopicClassifier();
    expect(tc.getTopicByAyah(1, 1)).toBeNull();
  });

  it('getVersesForPage should return empty before loading', () => {
    const tc = new TopicClassifier();
    expect(tc.getVersesForPage(1)).toEqual([]);
  });

  it('getVersesForSurah should return empty before loading', () => {
    const tc = new TopicClassifier();
    expect(tc.getVersesForSurah(1)).toEqual([]);
  });

  it('getVersesByTopic should return empty before loading', () => {
    const tc = new TopicClassifier();
    expect(tc.getVersesByTopic(1)).toEqual([]);
  });

  it('searchVerses should return empty before loading', () => {
    const tc = new TopicClassifier();
    expect(tc.searchVerses('الله')).toEqual([]);
  });

  it('getPageTopicDistribution should return empty before loading', () => {
    const tc = new TopicClassifier();
    expect(tc.getPageTopicDistribution(1)).toEqual({});
  });

  it('getPageDominantTopic should return null before loading', () => {
    const tc = new TopicClassifier();
    expect(tc.getPageDominantTopic(1)).toBeNull();
  });
});
