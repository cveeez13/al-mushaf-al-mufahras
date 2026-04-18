import { TopicsMaster, SurahInfo, Verse } from './types';

let cachedData: TopicsMaster | null = null;
let cachedSurahs: { surahs: SurahInfo[] } | null = null;

// Supports both legacy topic colors in dataset and current UI colors.
const TOPIC_COLOR_TO_ID: Record<string, number> = {
  olive: 1,
  sky: 2,
  gold: 3,
  pink: 4,
  purple: 5,
  turquoise: 6,
  orange: 7,
  blue: 1,
  green: 2,
  brown: 3,
  yellow: 4,
  red: 7,
};

export async function getTopicsMaster(): Promise<TopicsMaster> {
  if (cachedData) return cachedData;
  const res = await fetch('/data/topics_master.json');
  cachedData = await res.json();
  return cachedData!;
}

export async function getSurahsData(): Promise<SurahInfo[]> {
  if (cachedSurahs) return cachedSurahs.surahs;
  const res = await fetch('/data/topics_by_surah.json');
  cachedSurahs = await res.json();
  return cachedSurahs!.surahs;
}

export async function getVersesForPage(page: number): Promise<Verse[]> {
  const data = await getTopicsMaster();
  return data.verses.filter(v => v.page === page);
}

export async function getAllVerses(): Promise<Verse[]> {
  const data = await getTopicsMaster();
  return data.verses;
}

export async function getVersesForSurah(surahNum: number): Promise<Verse[]> {
  const data = await getTopicsMaster();
  return data.verses.filter(v => v.surah === surahNum);
}

export async function getVersesByTopicColor(color: string): Promise<Verse[]> {
  const data = await getTopicsMaster();
  const topicId = TOPIC_COLOR_TO_ID[color];
  if (topicId) {
    return data.verses.filter(v => v.topic.id === topicId);
  }
  return data.verses.filter(v => v.topic.color === color);
}

export async function searchVerses(query: string): Promise<Verse[]> {
  const data = await getTopicsMaster();
  const normalized = query.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '');
  return data.verses.filter(v => {
    const vText = v.text.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '');
    return vText.includes(normalized);
  });
}

export function getPageRange(): { min: number; max: number } {
  return { min: 1, max: 604 };
}
