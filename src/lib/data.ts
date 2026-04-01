import { TopicsMaster, SurahInfo, Verse } from './types';

let cachedData: TopicsMaster | null = null;
let cachedSurahs: { surahs: SurahInfo[] } | null = null;

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

export async function getVersesForSurah(surahNum: number): Promise<Verse[]> {
  const data = await getTopicsMaster();
  return data.verses.filter(v => v.surah === surahNum);
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
