/**
 * TopicClassifier — Service class for Quran verse topic classification.
 *
 * Provides methods to query topic data by ayah, surah, page, juz,
 * and to filter/search across the full 6,236 verse dataset.
 */

import { Topic, Verse, TOPICS, SURAH_NAMES } from './types';

// Strip Arabic diacritics for search normalization
function stripDiacritics(text: string): string {
  return text.replace(
    /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g,
    ''
  );
}

export class TopicClassifier {
  private verses: Verse[] = [];
  private byPage: Map<number, Verse[]> = new Map();
  private bySurah: Map<number, Verse[]> = new Map();
  private byTopic: Map<number, Verse[]> = new Map();
  private loaded = false;

  /** Load and index all verse data. Call once before using other methods. */
  async load(): Promise<void> {
    if (this.loaded) return;

    const res = await fetch('/data/topics_master.json');
    const data = await res.json();
    this.verses = data.verses;

    // Build indexes
    for (const v of this.verses) {
      // Page index
      if (v.page) {
        const arr = this.byPage.get(v.page) || [];
        arr.push(v);
        this.byPage.set(v.page, arr);
      }
      // Surah index
      const sArr = this.bySurah.get(v.surah) || [];
      sArr.push(v);
      this.bySurah.set(v.surah, sArr);
      // Topic index
      const tArr = this.byTopic.get(v.topic.id) || [];
      tArr.push(v);
      this.byTopic.set(v.topic.id, tArr);
    }

    this.loaded = true;
  }

  /** Get topic classification for a specific verse. */
  getTopicByAyah(surah: number, ayah: number): { topic: Topic; verse: Verse } | null {
    const verse = this.verses.find(v => v.surah === surah && v.ayah === ayah);
    if (!verse) return null;
    return { topic: verse.topic, verse };
  }

  /** Get all verses and their topics for a Mushaf page (1–604). */
  getVersesForPage(page: number): Verse[] {
    return this.byPage.get(page) || [];
  }

  /** Get all verses for a surah. */
  getVersesForSurah(surah: number): Verse[] {
    return this.bySurah.get(surah) || [];
  }

  /** Get all verses classified under a specific topic (1–7). */
  getVersesByTopic(topicId: number): Verse[] {
    return this.byTopic.get(topicId) || [];
  }

  /** Get topic metadata by ID. */
  static getTopicInfo(topicId: number): Topic | undefined {
    return TOPICS[topicId];
  }

  /** Get all 7 topic definitions. */
  static getAllTopics(): Topic[] {
    return Object.values(TOPICS);
  }

  /** Get surah name in Arabic. */
  static getSurahName(surah: number): string {
    return SURAH_NAMES[surah] || '';
  }

  /** Get topic distribution for a page. */
  getPageTopicDistribution(page: number): Record<string, number> {
    const verses = this.getVersesForPage(page);
    const dist: Record<string, number> = {};
    for (const v of verses) {
      dist[v.topic.color] = (dist[v.topic.color] || 0) + 1;
    }
    return dist;
  }

  /** Get dominant topic color for a page. */
  getPageDominantTopic(page: number): string | null {
    const dist = this.getPageTopicDistribution(page);
    let max = 0;
    let dominant: string | null = null;
    for (const [color, count] of Object.entries(dist)) {
      if (count > max) { max = count; dominant = color; }
    }
    return dominant;
  }

  /** Search verses by text (diacritics-stripped). */
  searchVerses(query: string, limit = 100): Verse[] {
    const normalized = stripDiacritics(query);
    const results: Verse[] = [];
    for (const v of this.verses) {
      if (results.length >= limit) break;
      const vText = stripDiacritics(v.text);
      if (vText.includes(normalized)) results.push(v);
    }
    return results;
  }

  /** Get total verse count. */
  get totalVerses(): number {
    return this.verses.length;
  }

  /** Check if data is loaded. */
  get isLoaded(): boolean {
    return this.loaded;
  }
}

// Singleton instance for app-wide use
export const topicClassifier = new TopicClassifier();
