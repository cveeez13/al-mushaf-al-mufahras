import { describe, it, expect } from 'vitest';
import {
  stripTashkeel,
  normalizeArabic,
  arabicWords,
  verseSimilarity,
} from '@/lib/voiceSearch';

describe('Voice Search', () => {
  // ─── Strip Tashkeel ──────────────────────────────────────

  it('should strip basic tashkeel marks', () => {
    // بِسْمِ اللَّهِ → بسم الله
    const input = '\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u0647\u0650';
    const result = stripTashkeel(input);
    expect(result).toBe('بسم الله');
  });

  it('should return unchanged text without tashkeel', () => {
    expect(stripTashkeel('بسم الله')).toBe('بسم الله');
  });

  it('should handle empty string', () => {
    expect(stripTashkeel('')).toBe('');
  });

  // ─── Normalize Arabic ──────────────────────────────────────

  it('should normalize alef variants', () => {
    // آ أ إ ٱ → ا
    expect(normalizeArabic('\u0622')).toBe('\u0627'); // آ → ا
    expect(normalizeArabic('\u0623')).toBe('\u0627'); // أ → ا
    expect(normalizeArabic('\u0625')).toBe('\u0627'); // إ → ا
    expect(normalizeArabic('\u0671')).toBe('\u0627'); // ٱ → ا
  });

  it('should normalize taa marbutah to ha', () => {
    // رحمة → رحمه
    expect(normalizeArabic('رحمة')).toBe('رحمه');
  });

  it('should normalize alef maqsura to ya', () => {
    // هدى → هدي
    expect(normalizeArabic('هدى')).toBe('هدي');
  });

  it('should normalize hamza variants', () => {
    // ؤ ئ → ء
    expect(normalizeArabic('مؤمن')).toBe('مءمن');
    expect(normalizeArabic('سئل')).toBe('سءل');
  });

  it('should remove tatweel', () => {
    expect(normalizeArabic('اللــه')).toBe('الله');
  });

  it('should collapse multiple spaces', () => {
    expect(normalizeArabic('بسم   الله   الرحمن')).toBe('بسم الله الرحمن');
  });

  it('should handle combined normalization', () => {
    // Full pipeline: strip tashkeel + normalize variants + collapse spaces
    const input = 'إِنَّ  الَّذِينَ  آمَنُوا';
    const result = normalizeArabic(input);
    // إ→ا, tashkeel stripped, آ→ا, spaces collapsed
    expect(result).toBe('ان الذين امنوا');
  });

  // ─── Arabic Words ──────────────────────────────────────

  it('should split text into normalized words', () => {
    const words = arabicWords('بسم الله الرحمن');
    expect(words).toEqual(['بسم', 'الله', 'الرحمن']);
  });

  it('should handle text with extra spaces', () => {
    const words = arabicWords('  بسم   الله  ');
    expect(words).toEqual(['بسم', 'الله']);
  });

  it('should return empty array for empty string', () => {
    expect(arabicWords('')).toEqual([]);
    expect(arabicWords('   ')).toEqual([]);
  });

  // ─── Verse Similarity ──────────────────────────────────────

  it('should return 1 for identical word arrays', () => {
    const words = ['بسم', 'الله', 'الرحمن', 'الرحيم'];
    expect(verseSimilarity(words, words)).toBeCloseTo(1, 1);
  });

  it('should return 0 for empty arrays', () => {
    expect(verseSimilarity([], ['بسم'])).toBe(0);
    expect(verseSimilarity(['بسم'], [])).toBe(0);
  });

  it('should return higher score for similar word arrays', () => {
    const query = ['بسم', 'الله'];
    const verse1 = ['بسم', 'الله', 'الرحمن', 'الرحيم']; // Contains query
    const verse2 = ['ان', 'الله', 'على', 'كل', 'شيء', 'قدير']; // Partially
    const verse3 = ['والعصر', 'ان', 'الانسان', 'لفي', 'خسر']; // Very different

    const score1 = verseSimilarity(query, verse1);
    const score2 = verseSimilarity(query, verse2);
    const score3 = verseSimilarity(query, verse3);

    expect(score1).toBeGreaterThan(score2);
    expect(score2).toBeGreaterThan(score3);
  });

  it('should handle single-word queries', () => {
    const query = ['الله'];
    const verse = ['بسم', 'الله', 'الرحمن', 'الرحيم'];
    const score = verseSimilarity(query, verse);
    expect(score).toBeGreaterThan(0);
  });

  // ─── Speech Recognition Feature Detection ────────────────

  it('should export isSpeechRecognitionSupported function', async () => {
    const { isSpeechRecognitionSupported } = await import('@/lib/voiceSearch');
    // In Node/Vitest environment, there's no window.SpeechRecognition
    expect(typeof isSpeechRecognitionSupported).toBe('function');
  });

  it('should export createSpeechRecognition function', async () => {
    const { createSpeechRecognition } = await import('@/lib/voiceSearch');
    expect(typeof createSpeechRecognition).toBe('function');
  });

  // ─── searchByVoiceText ────────────────────────────────────

  it('should export searchByVoiceText function', async () => {
    const { searchByVoiceText } = await import('@/lib/voiceSearch');
    expect(typeof searchByVoiceText).toBe('function');
  });

  it('should return empty array for empty transcript', async () => {
    const { searchByVoiceText } = await import('@/lib/voiceSearch');
    const results = await searchByVoiceText('');
    expect(results).toEqual([]);
  });
});
