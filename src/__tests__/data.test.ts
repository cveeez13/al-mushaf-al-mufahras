import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPageRange } from '@/lib/data';

describe('getPageRange', () => {
  it('should return min=1 and max=604', () => {
    const range = getPageRange();
    expect(range.min).toBe(1);
    expect(range.max).toBe(604);
  });
});

describe('data module exports', () => {
  it('should export getTopicsMaster function', async () => {
    const mod = await import('@/lib/data');
    expect(typeof mod.getTopicsMaster).toBe('function');
  });

  it('should export getSurahsData function', async () => {
    const mod = await import('@/lib/data');
    expect(typeof mod.getSurahsData).toBe('function');
  });

  it('should export getVersesForPage function', async () => {
    const mod = await import('@/lib/data');
    expect(typeof mod.getVersesForPage).toBe('function');
  });

  it('should export getVersesForSurah function', async () => {
    const mod = await import('@/lib/data');
    expect(typeof mod.getVersesForSurah).toBe('function');
  });

  it('should export searchVerses function', async () => {
    const mod = await import('@/lib/data');
    expect(typeof mod.searchVerses).toBe('function');
  });
});
