/**
 * Voice Search — "Shazam for Quran"
 *
 * Uses Web Speech API for Arabic speech recognition,
 * with advanced Arabic text normalization and fuzzy matching
 * against the full Quran verse corpus (6,236 verses).
 *
 * Pipeline:
 * 1. Microphone → Web Speech API (Arabic)
 * 2. Transcript → Arabic normalization (strip tashkeel, normalize hamza/alef/taa)
 * 3. Normalized text → Fuzzy matching against all verses (n-gram similarity + LCS)
 * 4. Best matches → Return verse with topic, page, surah info
 */

import { Verse } from '@/lib/types';
import { getTopicsMaster } from '@/lib/data';

// ───────────────────────────────────────────────────────────────
// Arabic Text Normalization
// ───────────────────────────────────────────────────────────────

/** Strip all Arabic diacritical marks (tashkeel). */
export function stripTashkeel(text: string): string {
  // \u064B-\u065F = Fathatan through Sukun
  // \u0670 = Superscript Alef
  // \u06D6-\u06ED = Small marks
  return text.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
}

/** Normalize Arabic characters: alef variants, hamza, taa marbutah, etc. */
export function normalizeArabic(text: string): string {
  let s = stripTashkeel(text);
  // Normalize alef variants → bare alef
  s = s.replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627'); // آ أ إ ٱ → ا
  // Normalize taa marbutah → ha
  s = s.replace(/\u0629/g, '\u0647'); // ة → ه
  // Normalize alef maqsura → ya
  s = s.replace(/\u0649/g, '\u064A'); // ى → ي
  // Normalize hamza variants
  s = s.replace(/[\u0624\u0626]/g, '\u0621'); // ؤ ئ → ء
  // Remove tatweel (kashida)
  s = s.replace(/\u0640/g, '');
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/** Extract words from Arabic text. */
export function arabicWords(text: string): string[] {
  return normalizeArabic(text).split(/\s+/).filter(w => w.length > 0);
}

// ───────────────────────────────────────────────────────────────
// Fuzzy Matching Algorithms
// ───────────────────────────────────────────────────────────────

/** Compute word-level n-grams (bigrams). */
function wordBigrams(words: string[]): Set<string> {
  const grams = new Set<string>();
  for (let i = 0; i < words.length - 1; i++) {
    grams.add(words[i] + ' ' + words[i + 1]);
  }
  // Also add unigrams for short queries
  for (const w of words) grams.add(w);
  return grams;
}

/** Sørensen–Dice coefficient for n-gram similarity. */
function diceSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const gram of a) {
    if (b.has(gram)) intersection++;
  }
  return (2 * intersection) / (a.size + b.size);
}

/** Longest Common Subsequence length (word-level). */
function lcsLength(a: string[], b: string[]): number {
  const m = a.length, n = b.length;
  // Optimization: use single-row DP for memory efficiency
  const prev = new Array(n + 1).fill(0);
  const curr = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1] + 1;
      } else {
        curr[j] = Math.max(prev[j], curr[j - 1]);
      }
    }
    for (let j = 0; j <= n; j++) { prev[j] = curr[j]; curr[j] = 0; }
  }
  return prev[n];
}

/** Combined similarity score: Dice (speed) + LCS ratio (accuracy). */
export function verseSimilarity(queryWords: string[], verseWords: string[]): number {
  if (queryWords.length === 0 || verseWords.length === 0) return 0;

  const dice = diceSimilarity(wordBigrams(queryWords), wordBigrams(verseWords));
  const lcs = lcsLength(queryWords, verseWords);
  const lcsRatio = lcs / Math.min(queryWords.length, verseWords.length);

  // Weighted: LCS is more important for sequential match
  return 0.35 * dice + 0.65 * lcsRatio;
}

/** Check if query words appear as a contiguous substring in verse. */
function containsSubsequence(verseWords: string[], queryWords: string[]): boolean {
  if (queryWords.length === 0) return true;
  if (queryWords.length > verseWords.length) return false;

  outer:
  for (let i = 0; i <= verseWords.length - queryWords.length; i++) {
    for (let j = 0; j < queryWords.length; j++) {
      if (verseWords[i + j] !== queryWords[j]) continue outer;
    }
    return true;
  }
  return false;
}

// ───────────────────────────────────────────────────────────────
// Search Result Type
// ───────────────────────────────────────────────────────────────

export interface VoiceSearchResult {
  verse: Verse;
  score: number;        // 0-1 similarity
  matchType: 'exact' | 'substring' | 'fuzzy';
  normalizedQuery: string;
  normalizedVerse: string;
}

// ───────────────────────────────────────────────────────────────
// Verse Index — Pre-normalized cache for fast searching
// ───────────────────────────────────────────────────────────────

interface IndexedVerse {
  verse: Verse;
  normalized: string;
  words: string[];
}

let verseIndex: IndexedVerse[] | null = null;

async function getVerseIndex(): Promise<IndexedVerse[]> {
  if (verseIndex) return verseIndex;

  const data = await getTopicsMaster();
  verseIndex = data.verses.map(v => {
    const normalized = normalizeArabic(v.text);
    return {
      verse: v,
      normalized,
      words: normalized.split(/\s+/).filter(w => w.length > 0),
    };
  });
  return verseIndex;
}

// ───────────────────────────────────────────────────────────────
// Main Search Function
// ───────────────────────────────────────────────────────────────

export async function searchByVoiceText(
  transcript: string,
  maxResults: number = 10
): Promise<VoiceSearchResult[]> {
  const normalizedQuery = normalizeArabic(transcript);
  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 0);

  if (queryWords.length === 0) return [];

  const index = await getVerseIndex();

  // Phase 1: Exact match
  const exactMatches: VoiceSearchResult[] = [];
  for (const iv of index) {
    if (iv.normalized === normalizedQuery) {
      exactMatches.push({
        verse: iv.verse,
        score: 1.0,
        matchType: 'exact',
        normalizedQuery,
        normalizedVerse: iv.normalized,
      });
    }
  }
  if (exactMatches.length > 0) return exactMatches.slice(0, maxResults);

  // Phase 2: Substring match (query appears contiguously in verse)
  const substringMatches: VoiceSearchResult[] = [];
  for (const iv of index) {
    if (containsSubsequence(iv.words, queryWords)) {
      const score = queryWords.length / iv.words.length;
      substringMatches.push({
        verse: iv.verse,
        score: Math.min(0.99, 0.8 + score * 0.2), // 0.8–0.99 range
        matchType: 'substring',
        normalizedQuery,
        normalizedVerse: iv.normalized,
      });
    }
  }
  if (substringMatches.length > 0) {
    substringMatches.sort((a, b) => b.score - a.score);
    return substringMatches.slice(0, maxResults);
  }

  // Phase 3: Fuzzy match (Dice + LCS)
  const scored: VoiceSearchResult[] = [];
  for (const iv of index) {
    const score = verseSimilarity(queryWords, iv.words);
    if (score >= 0.25) { // Minimum threshold
      scored.push({
        verse: iv.verse,
        score,
        matchType: 'fuzzy',
        normalizedQuery,
        normalizedVerse: iv.normalized,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults);
}

// ───────────────────────────────────────────────────────────────
// Web Speech API — Arabic Speech Recognition
// ───────────────────────────────────────────────────────────────

export type RecognitionStatus = 'idle' | 'listening' | 'processing' | 'error' | 'unsupported';

export interface SpeechRecognitionOptions {
  onTranscript: (text: string, isFinal: boolean) => void;
  onStatusChange: (status: RecognitionStatus) => void;
  onError: (error: string) => void;
  continuous?: boolean;
  lang?: string;
}

interface SpeechRecognitionInstance {
  start: () => void;
  stop: () => void;
  abort: () => void;
}

// Feature detection
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    (window as unknown as Record<string, unknown>).SpeechRecognition ||
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  );
}

export function createSpeechRecognition(options: SpeechRecognitionOptions): SpeechRecognitionInstance | null {
  if (typeof window === 'undefined') return null;

  const SpeechRecognitionClass = (window as unknown as Record<string, unknown>).SpeechRecognition ||
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    options.onStatusChange('unsupported');
    options.onError('Speech recognition is not supported in this browser');
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognition = new (SpeechRecognitionClass as any)();
  recognition.lang = options.lang || 'ar-SA';
  recognition.continuous = options.continuous ?? true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 3;

  recognition.onstart = () => {
    options.onStatusChange('listening');
  };

  recognition.onresult = (event: { results: { length: number; [key: number]: { isFinal: boolean; [key: number]: { transcript: string } } } }) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalTranscript += result[0].transcript;
      } else {
        interimTranscript += result[0].transcript;
      }
    }

    if (finalTranscript) {
      options.onTranscript(finalTranscript, true);
    } else if (interimTranscript) {
      options.onTranscript(interimTranscript, false);
    }
  };

  recognition.onerror = (event: { error: string }) => {
    const errorMessages: Record<string, string> = {
      'not-allowed': 'Microphone access denied',
      'no-speech': 'No speech detected',
      'network': 'Network error',
      'audio-capture': 'No microphone found',
      'service-not-allowed': 'Speech service not allowed',
      'language-not-supported': 'Language not supported',
      'aborted': 'Recognition aborted',
    };
    options.onError(errorMessages[event.error] || event.error);
    options.onStatusChange('error');
  };

  recognition.onend = () => {
    options.onStatusChange('idle');
  };

  return {
    start: () => {
      try {
        recognition.start();
      } catch {
        options.onError('Failed to start recognition');
        options.onStatusChange('error');
      }
    },
    stop: () => recognition.stop(),
    abort: () => recognition.abort(),
  };
}
