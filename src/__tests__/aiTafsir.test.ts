import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateAiTafsir, streamAiTafsir,
  validateGuardrails,
  getCachedTafsir, cacheTafsir, clearTafsirCache, getCacheStats,
  getSeededVerseKeys, hasSeededTafsir,
  TAFSIR_SOURCES, DISCLAIMER_AR, DISCLAIMER_EN,
  SYSTEM_PROMPT_EGYPTIAN, SYSTEM_PROMPT_MSA,
  type Dialect, type AiTafsirCacheEntry,
} from '@/lib/aiTafsir';

beforeEach(() => {
  localStorage.clear();
});

// ─── Guardrails ──────────────────────────────────────────────

describe('validateGuardrails', () => {
  it('passes valid tafsir text with source attribution', () => {
    const text = 'بسم الله الرحمن الرحيم. قال ابن كثير في تفسيره أن هذه الآية تدل على عظمة الله.';
    expect(validateGuardrails(text).safe).toBe(true);
  });

  it('passes text mentioning السعدي', () => {
    const text = 'ذكر السعدي في تفسيره أن الرحمة الإلهية تشمل الجميع.';
    expect(validateGuardrails(text).safe).toBe(true);
  });

  it('passes text mentioning العلماء', () => {
    const text = 'ذكر العلماء أن هذه الآية تدل على التوحيد.';
    expect(validateGuardrails(text).safe).toBe(true);
  });

  it('rejects empty text', () => {
    const result = validateGuardrails('');
    expect(result.safe).toBe(false);
    expect(result.reason).toBe('empty');
  });

  it('rejects excessively long text (>3000 chars)', () => {
    const longText = 'ذكر ابن كثير ' + 'a'.repeat(3001);
    const result = validateGuardrails(longText);
    expect(result.safe).toBe(false);
    expect(result.reason).toBe('too_long');
  });

  it('rejects text with fatwa issuing', () => {
    const text = 'أفتي بأن هذا الأمر واجب على كل مسلم. ذكره ابن كثير.';
    const result = validateGuardrails(text);
    expect(result.safe).toBe(false);
    expect(result.reason).toBe('forbidden_content');
  });

  it('rejects text without source attribution', () => {
    const text = 'هذه الآية تدل على عظمة الخالق وقدرته. وفيها معانٍ عميقة.';
    const result = validateGuardrails(text);
    expect(result.safe).toBe(false);
    expect(result.reason).toBe('no_source_attribution');
  });

  it('rejects sectarian content', () => {
    const text = 'الروافض ضلوا في تفسير هذه الآية. ذكره ابن كثير.';
    const result = validateGuardrails(text);
    expect(result.safe).toBe(false);
    expect(result.reason).toBe('forbidden_content');
  });

  it('allows hadith with proper attribution (رواه البخاري)', () => {
    const text = 'قال النبي ﷺ كما رواه البخاري في صحيحه. وذكر ابن كثير هذا في تفسيره.';
    expect(validateGuardrails(text).safe).toBe(true);
  });
});

// ─── Cache ───────────────────────────────────────────────────

describe('response cache', () => {
  it('starts empty', () => {
    expect(getCachedTafsir('1:1', 'egyptian')).toBeNull();
    expect(getCacheStats()).toEqual({ count: 0, sizeKB: 0 });
  });

  it('caches and retrieves tafsir', () => {
    const entry: AiTafsirCacheEntry = {
      verseKey: '1:1',
      dialect: 'egyptian',
      text: 'تفسير مبسط. ذكره ابن كثير.',
      sources: [TAFSIR_SOURCES[0]],
      generatedAt: new Date().toISOString(),
      ttl: 7 * 24 * 60 * 60 * 1000,
    };
    cacheTafsir(entry);

    const cached = getCachedTafsir('1:1', 'egyptian');
    expect(cached).not.toBeNull();
    expect(cached!.text).toBe(entry.text);
    expect(cached!.sources).toHaveLength(1);
  });

  it('separates cache by dialect', () => {
    cacheTafsir({
      verseKey: '1:1', dialect: 'egyptian',
      text: 'عامية. ذكره ابن كثير.', sources: [],
      generatedAt: new Date().toISOString(), ttl: 86400000,
    });
    cacheTafsir({
      verseKey: '1:1', dialect: 'msa',
      text: 'فصحى. ذكره السعدي.', sources: [],
      generatedAt: new Date().toISOString(), ttl: 86400000,
    });

    expect(getCachedTafsir('1:1', 'egyptian')!.text).toContain('عامية');
    expect(getCachedTafsir('1:1', 'msa')!.text).toContain('فصحى');
  });

  it('clears cache', () => {
    cacheTafsir({
      verseKey: '1:1', dialect: 'egyptian',
      text: 'test. ذكره ابن كثير.', sources: [],
      generatedAt: new Date().toISOString(), ttl: 86400000,
    });
    expect(getCacheStats().count).toBe(1);
    clearTafsirCache();
    expect(getCacheStats().count).toBe(0);
    expect(getCachedTafsir('1:1', 'egyptian')).toBeNull();
  });

  it('reports cache stats', () => {
    cacheTafsir({
      verseKey: '2:255', dialect: 'msa',
      text: 'آية الكرسي. ذكره ابن كثير.', sources: [TAFSIR_SOURCES[0]],
      generatedAt: new Date().toISOString(), ttl: 86400000,
    });
    const stats = getCacheStats();
    expect(stats.count).toBe(1);
    expect(stats.sizeKB).toBeGreaterThanOrEqual(0);
  });
});

// ─── Seeded Database ─────────────────────────────────────────

describe('seeded tafsir database', () => {
  it('has seeded verse keys', () => {
    const keys = getSeededVerseKeys();
    expect(keys.length).toBeGreaterThan(0);
    expect(keys).toContain('1:1');
    expect(keys).toContain('2:255');
    expect(keys).toContain('112:1');
  });

  it('hasSeededTafsir returns true for seeded verses', () => {
    expect(hasSeededTafsir('1:1')).toBe(true);
    expect(hasSeededTafsir('2:255')).toBe(true);
  });

  it('hasSeededTafsir returns false for non-seeded verses', () => {
    expect(hasSeededTafsir('99:99')).toBe(false);
    expect(hasSeededTafsir('50:10')).toBe(false);
  });
});

// ─── AI Tafsir Generation ────────────────────────────────────

describe('generateAiTafsir', () => {
  it('generates tafsir for seeded verse (egyptian)', () => {
    const result = generateAiTafsir(1, 1, 'بسم الله الرحمن الرحيم', 'egyptian');
    expect(result.verseKey).toBe('1:1');
    expect(result.dialect).toBe('egyptian');
    expect(result.text).toContain('بسم الله');
    expect(result.text).toContain('ابن كثير');
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.disclaimer).toBe(DISCLAIMER_AR);
  });

  it('generates tafsir for seeded verse (msa)', () => {
    const result = generateAiTafsir(1, 1, 'بسم الله الرحمن الرحيم', 'msa');
    expect(result.dialect).toBe('msa');
    expect(result.text).toContain('بسم الله');
  });

  it('generates fallback tafsir for non-seeded verse', () => {
    const result = generateAiTafsir(50, 10, 'آية اختبارية', 'egyptian');
    expect(result.verseKey).toBe('50:10');
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.sources.length).toBeGreaterThan(0);
  });

  it('caches after first generation', () => {
    expect(getCachedTafsir('1:2', 'egyptian')).toBeNull();
    generateAiTafsir(1, 2, 'الحمد لله رب العالمين', 'egyptian');
    expect(getCachedTafsir('1:2', 'egyptian')).not.toBeNull();
  });

  it('returns cached=true on second call', () => {
    const first = generateAiTafsir(1, 5, 'إياك نعبد وإياك نستعين', 'egyptian');
    expect(first.cached).toBe(false);
    const second = generateAiTafsir(1, 5, 'إياك نعبد وإياك نستعين', 'egyptian');
    expect(second.cached).toBe(true);
  });

  it('generates different text for different dialects', () => {
    const eg = generateAiTafsir(2, 255, 'الله لا إله إلا هو', 'egyptian');
    clearTafsirCache();
    const msa = generateAiTafsir(2, 255, 'الله لا إله إلا هو', 'msa');
    expect(eg.text).not.toBe(msa.text);
  });

  it('includes disclaimer in every response', () => {
    const result = generateAiTafsir(112, 1, 'قل هو الله أحد', 'egyptian');
    expect(result.disclaimer).toBeTruthy();
    expect(result.disclaimer.length).toBeGreaterThan(10);
  });
});

// ─── Streaming ───────────────────────────────────────────────

describe('streamAiTafsir', () => {
  it('streams text progressively for non-cached verse', async () => {
    const chunks: { text: string; done: boolean }[] = [];
    for await (const chunk of streamAiTafsir(1, 1, 'بسم الله الرحمن الرحيم', 'egyptian')) {
      chunks.push({ text: chunk.text, done: chunk.done });
    }
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[chunks.length - 1].done).toBe(true);
    // Text should grow progressively
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].text.length).toBeGreaterThanOrEqual(chunks[i - 1].text.length);
    }
  });

  it('returns sources in final chunk', async () => {
    let lastChunk: { text: string; done: boolean; sources?: unknown[] } | null = null;
    for await (const chunk of streamAiTafsir(2, 255, 'الله لا إله إلا هو', 'msa')) {
      lastChunk = chunk;
    }
    expect(lastChunk).not.toBeNull();
    expect(lastChunk!.done).toBe(true);
    expect(lastChunk!.sources).toBeDefined();
    expect(lastChunk!.sources!.length).toBeGreaterThan(0);
  });

  it('yields single chunk for cached verse (instant)', async () => {
    // First call caches it
    generateAiTafsir(112, 1, 'قل هو الله أحد', 'egyptian');
    // Second call should be instant (single chunk)
    const chunks: unknown[] = [];
    for await (const chunk of streamAiTafsir(112, 1, 'قل هو الله أحد', 'egyptian')) {
      chunks.push(chunk);
    }
    expect(chunks).toHaveLength(1);
  });
});

// ─── Constants & Prompt Engineering ──────────────────────────

describe('constants', () => {
  it('has 5 tafsir sources', () => {
    expect(TAFSIR_SOURCES).toHaveLength(5);
  });

  it('each source has required fields', () => {
    for (const src of TAFSIR_SOURCES) {
      expect(src.id).toBeTruthy();
      expect(src.name_ar).toBeTruthy();
      expect(src.name_en).toBeTruthy();
      expect(src.author_ar).toBeTruthy();
      expect(src.author_en).toBeTruthy();
    }
  });

  it('disclaimers are non-empty', () => {
    expect(DISCLAIMER_AR.length).toBeGreaterThan(20);
    expect(DISCLAIMER_EN.length).toBeGreaterThan(20);
    expect(DISCLAIMER_AR).toContain('⚠️');
    expect(DISCLAIMER_EN).toContain('⚠️');
  });

  it('system prompts contain guardrail rules', () => {
    expect(SYSTEM_PROMPT_EGYPTIAN).toContain('ابن كثير');
    expect(SYSTEM_PROMPT_EGYPTIAN).toContain('لا تخترع');
    expect(SYSTEM_PROMPT_EGYPTIAN).toContain('لا تُصدر فتاوى');
    expect(SYSTEM_PROMPT_MSA).toContain('ابن كثير');
    expect(SYSTEM_PROMPT_MSA).toContain('لا تخترع');
  });

  it('Egyptian prompt uses colloquial markers', () => {
    expect(SYSTEM_PROMPT_EGYPTIAN).toContain('عامية مصرية');
  });

  it('MSA prompt uses formal markers', () => {
    expect(SYSTEM_PROMPT_MSA).toContain('فصحى مبسطة');
  });
});
