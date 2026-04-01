/**
 * qiraat.ts — Qira'at (variant readings) data layer and Arabic text diff engine.
 *
 * Supports:
 * - Loading the curated Qira'at dataset
 * - Word-level Arabic text diffing with Unicode normalization
 * - Identifying diff positions for highlight rendering
 */

// ─── Types ────────────────────────────────────────────────────

export type ReaderId = 'hafs' | 'warsh' | 'qalun' | 'shuBah' | 'duri' | 'kisai' | 'ibnKathir';

export interface ReaderInfo {
  id: ReaderId;
  name_ar: string;
  name_en: string;
  region: string;
  region_en: string;
}

export type DiffType = 'word_form' | 'word_change' | 'vowel' | 'addition' | 'hamza' | 'haa_sakt' | 'imala' | 'identical';

export interface DiffTypeInfo {
  label_ar: string;
  label_en: string;
  color: string;
}

export interface QiraatVariant {
  verse_key: string;
  surah: number;
  ayah: number;
  readings: Record<ReaderId, string>;
  diff_type: DiffType;
  notes_ar: string;
  notes_en: string;
}

export interface QiraatData {
  metadata: { version: string; description: string; readers: string[]; total_entries: number; source: string };
  readers: Record<ReaderId, ReaderInfo>;
  variants: QiraatVariant[];
  diff_types: Record<DiffType, DiffTypeInfo>;
}

// ─── Word Diff Engine ─────────────────────────────────────────

/** Strip Arabic diacritics for base-letter comparison. */
function stripDiacritics(text: string): string {
  // Remove tashkeel: fathah, dammah, kasrah, sukoon, shadda, tanween, etc.
  return text.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u08D3-\u08E1\u08E3-\u08FF\uFE70-\uFE7F]/g, '');
}

/** Normalize Arabic text for consistent comparison. */
function normalizeArabic(text: string): string {
  return text
    .replace(/\u0622/g, '\u0627')  // Alef with madda → alef
    .replace(/\u0623/g, '\u0627')  // Alef with hamza above → alef
    .replace(/\u0625/g, '\u0627')  // Alef with hamza below → alef
    .replace(/\u0671/g, '\u0627')  // Alef wasla → alef
    .replace(/\u0649/g, '\u064A')  // Alef maksura → ya
    .replace(/\u0629/g, '\u0647')  // Ta marbuta → ha
    .trim();
}

export interface DiffWord {
  text: string;
  status: 'equal' | 'changed' | 'added' | 'removed';
}

/**
 * Word-level diff between two Arabic texts.
 * Uses LCS (Longest Common Subsequence) on stripped base letters,
 * then marks words that differ at the diacritic or letter level.
 */
export function diffArabicTexts(base: string, target: string): { baseWords: DiffWord[]; targetWords: DiffWord[] } {
  const bWords = base.split(/\s+/).filter(Boolean);
  const tWords = target.split(/\s+/).filter(Boolean);

  const bStripped = bWords.map(w => normalizeArabic(stripDiacritics(w)));
  const tStripped = tWords.map(w => normalizeArabic(stripDiacritics(w)));

  // Build LCS table
  const m = bStripped.length;
  const n = tStripped.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (bStripped[i - 1] === tStripped[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find alignment
  const baseResult: DiffWord[] = [];
  const targetResult: DiffWord[] = [];
  let i = m, j = n;

  const bTemp: DiffWord[] = [];
  const tTemp: DiffWord[] = [];

  while (i > 0 && j > 0) {
    if (bStripped[i - 1] === tStripped[j - 1]) {
      // Base letters match — check if full text (with diacritics) differs
      const fullMatch = bWords[i - 1] === tWords[j - 1];
      bTemp.push({ text: bWords[i - 1], status: fullMatch ? 'equal' : 'changed' });
      tTemp.push({ text: tWords[j - 1], status: fullMatch ? 'equal' : 'changed' });
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      bTemp.push({ text: bWords[i - 1], status: 'removed' });
      i--;
    } else {
      tTemp.push({ text: tWords[j - 1], status: 'added' });
      j--;
    }
  }
  while (i > 0) {
    bTemp.push({ text: bWords[i - 1], status: 'removed' });
    i--;
  }
  while (j > 0) {
    tTemp.push({ text: tWords[j - 1], status: 'added' });
    j--;
  }

  // Reverse since we built from end
  bTemp.reverse().forEach(w => baseResult.push(w));
  tTemp.reverse().forEach(w => targetResult.push(w));

  return { baseWords: baseResult, targetWords: targetResult };
}

// ─── Data Loading ─────────────────────────────────────────────

let cachedQiraat: QiraatData | null = null;

export async function getQiraatData(): Promise<QiraatData> {
  if (cachedQiraat) return cachedQiraat;
  const res = await fetch('/data/qiraat_data.json');
  cachedQiraat = await res.json();
  return cachedQiraat!;
}

/** Get variant data for a specific verse. */
export async function getVariantForVerse(verseKey: string): Promise<QiraatVariant | null> {
  const data = await getQiraatData();
  return data.variants.find(v => v.verse_key === verseKey) || null;
}

/** Get all verses that have variants (non-identical). */
export async function getVariantVerseKeys(): Promise<string[]> {
  const data = await getQiraatData();
  return data.variants.filter(v => v.diff_type !== 'identical').map(v => v.verse_key);
}

/** Search variants by surah number. */
export async function getVariantsForSurah(surah: number): Promise<QiraatVariant[]> {
  const data = await getQiraatData();
  return data.variants.filter(v => v.surah === surah);
}

/** Get reader info. */
export async function getReaders(): Promise<Record<ReaderId, ReaderInfo>> {
  const data = await getQiraatData();
  return data.readers;
}

/** Get diff type metadata. */
export async function getDiffTypes(): Promise<Record<DiffType, DiffTypeInfo>> {
  const data = await getQiraatData();
  return data.diff_types;
}

/** All reader IDs in display order. */
export const READER_IDS: ReaderId[] = ['hafs', 'warsh', 'qalun', 'shuBah', 'duri', 'kisai', 'ibnKathir'];

/** Colors for reader distinction in the UI. */
export const READER_COLORS: Record<ReaderId, string> = {
  hafs:      '#3498DB',
  warsh:     '#27AE60',
  qalun:     '#E67E22',
  shuBah:    '#8E44AD',
  duri:      '#E74C3C',
  kisai:     '#F1C40F',
  ibnKathir: '#8E6B3D',
};
