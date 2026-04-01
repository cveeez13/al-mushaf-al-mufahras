/**
 * Kids Mode — Interactive Quran Learning for Children
 *
 * Gamification system with XP, levels, badges, stars.
 * Simple quiz ("complete the verse"), topic illustrations,
 * and encouraging feedback with sounds & animations.
 */

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

export interface KidsProfile {
  name: string;
  xp: number;
  level: number;
  stars: number;
  badges: Badge[];
  streakDays: number;
  lastPlayedDate: string; // ISO date
  quizzesCompleted: number;
  versesLearned: string[]; // verse_keys
  topicProgress: Record<number, number>; // topicId → verses completed
}

export interface Badge {
  id: string;
  name_ar: string;
  name_en: string;
  icon: string; // emoji
  earnedAt: string; // ISO date
}

export interface KidsQuizQuestion {
  verse_key: string;
  surah: number;
  ayah: number;
  fullText: string;
  /** Words shown as hint */
  shownWords: string[];
  /** Words the child must pick/complete */
  hiddenWords: string[];
  /** Index in the original where hidden starts */
  hiddenStartIndex: number;
  topicId: number;
  topicColor: string;
}

export interface KidsQuizResult {
  correct: boolean;
  xpEarned: number;
  starsEarned: number;
  newBadges: Badge[];
  newLevel: boolean;
  encouragement: { ar: string; en: string };
}

// ───────────────────────────────────────────────────────────────
// Topic Illustrations & kid-friendly names
// ───────────────────────────────────────────────────────────────

export interface TopicKidsInfo {
  id: number;
  color: string;
  hex: string;
  icon: string;       // emoji illustration
  name_ar: string;    // kid-friendly Arabic name
  name_en: string;    // kid-friendly English name
  bgGradient: string; // CSS gradient for card
}

export const KIDS_TOPICS: Record<number, TopicKidsInfo> = {
  1: {
    id: 1, color: 'blue', hex: '#3498DB',
    icon: '🌍',
    name_ar: 'عجائب الكون',
    name_en: 'Wonders of the Universe',
    bgGradient: 'linear-gradient(135deg, #EBF5FB 0%, #D6EAF8 100%)',
  },
  2: {
    id: 2, color: 'green', hex: '#27AE60',
    icon: '🌳',
    name_ar: 'الجنة والمؤمنون',
    name_en: 'Paradise & Believers',
    bgGradient: 'linear-gradient(135deg, #E8F8F0 0%, #D5F5E3 100%)',
  },
  3: {
    id: 3, color: 'brown', hex: '#8E6B3D',
    icon: '📜',
    name_ar: 'أحكام الإسلام',
    name_en: 'Rules of Islam',
    bgGradient: 'linear-gradient(135deg, #F5EDE3 0%, #EDDECC 100%)',
  },
  4: {
    id: 4, color: 'yellow', hex: '#F1C40F',
    icon: '⛺',
    name_ar: 'قصص الأنبياء',
    name_en: 'Stories of Prophets',
    bgGradient: 'linear-gradient(135deg, #FEF9E7 0%, #FCF3CF 100%)',
  },
  5: {
    id: 5, color: 'purple', hex: '#8E44AD',
    icon: '📖',
    name_ar: 'القرآن العظيم',
    name_en: 'The Great Quran',
    bgGradient: 'linear-gradient(135deg, #F4ECF7 0%, #E8DAEF 100%)',
  },
  6: {
    id: 6, color: 'orange', hex: '#E67E22',
    icon: '⚖️',
    name_ar: 'يوم القيامة',
    name_en: 'Day of Judgment',
    bgGradient: 'linear-gradient(135deg, #FDF2E9 0%, #FAE5D3 100%)',
  },
  7: {
    id: 7, color: 'red', hex: '#E74C3C',
    icon: '🛡️',
    name_ar: 'التحذير والتوبة',
    name_en: 'Warning & Repentance',
    bgGradient: 'linear-gradient(135deg, #FDEDEC 0%, #FADBD8 100%)',
  },
};

// ───────────────────────────────────────────────────────────────
// Level & XP System
// ───────────────────────────────────────────────────────────────

/** XP needed to reach a given level (cumulative). Level 1 = 0 XP. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  // Each level needs progressively more: 50, 120, 210, 320, ...
  return Math.floor(50 * (level - 1) + 10 * Math.pow(level - 1, 2));
}

/** Calculate level from total XP. */
export function levelFromXP(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

/** XP progress within current level (0..1). */
export function levelProgress(xp: number): number {
  const level = levelFromXP(xp);
  const currentLevelXP = xpForLevel(level);
  const nextLevelXP = xpForLevel(level + 1);
  const range = nextLevelXP - currentLevelXP;
  if (range === 0) return 1;
  return (xp - currentLevelXP) / range;
}

export const LEVEL_TITLES: Record<number, { ar: string; en: string }> = {
  1:  { ar: 'مبتدئ صغير ⭐', en: 'Little Beginner ⭐' },
  2:  { ar: 'قارئ نشيط ⭐⭐', en: 'Active Reader ⭐⭐' },
  3:  { ar: 'حافظ مجتهد ⭐⭐⭐', en: 'Diligent Learner ⭐⭐⭐' },
  4:  { ar: 'نجم القرآن 🌟', en: 'Quran Star 🌟' },
  5:  { ar: 'بطل الحفظ 🏆', en: 'Memory Champion 🏆' },
  6:  { ar: 'عالم صغير 🎓', en: 'Young Scholar 🎓' },
  7:  { ar: 'حافظ القرآن 👑', en: 'Quran Guardian 👑' },
  8:  { ar: 'سفير القرآن 🌙', en: 'Quran Ambassador 🌙' },
  9:  { ar: 'فارس القرآن ⚔️', en: 'Quran Knight ⚔️' },
  10: { ar: 'إمام المستقبل 💎', en: 'Future Imam 💎' },
};

export function getLevelTitle(level: number, lang: 'ar' | 'en'): string {
  const capped = Math.min(level, 10);
  return LEVEL_TITLES[capped]?.[lang] || LEVEL_TITLES[1][lang];
}

// ───────────────────────────────────────────────────────────────
// Badge Definitions
// ───────────────────────────────────────────────────────────────

interface BadgeDef {
  id: string;
  icon: string;
  name_ar: string;
  name_en: string;
  desc_ar: string;
  desc_en: string;
  check: (profile: KidsProfile) => boolean;
}

const BADGE_DEFS: BadgeDef[] = [
  {
    id: 'first_quiz', icon: '🎯',
    name_ar: 'أول اختبار', name_en: 'First Quiz',
    desc_ar: 'أكملت أول اختبار!', desc_en: 'Completed your first quiz!',
    check: p => p.quizzesCompleted >= 1,
  },
  {
    id: 'five_quizzes', icon: '🔥',
    name_ar: 'مثابر', name_en: 'Persistent',
    desc_ar: 'أكملت 5 اختبارات', desc_en: 'Completed 5 quizzes',
    check: p => p.quizzesCompleted >= 5,
  },
  {
    id: 'twenty_quizzes', icon: '💪',
    name_ar: 'قوي الإرادة', name_en: 'Strong Willed',
    desc_ar: 'أكملت 20 اختبار', desc_en: 'Completed 20 quizzes',
    check: p => p.quizzesCompleted >= 20,
  },
  {
    id: 'ten_verses', icon: '📗',
    name_ar: 'قارئ ماهر', name_en: 'Skilled Reader',
    desc_ar: 'تعلمت 10 آيات', desc_en: 'Learned 10 verses',
    check: p => p.versesLearned.length >= 10,
  },
  {
    id: 'fifty_verses', icon: '📚',
    name_ar: 'مكتبة متنقلة', name_en: 'Walking Library',
    desc_ar: 'تعلمت 50 آية', desc_en: 'Learned 50 verses',
    check: p => p.versesLearned.length >= 50,
  },
  {
    id: 'three_streak', icon: '🔥',
    name_ar: '3 أيام متتالية', name_en: '3 Day Streak',
    desc_ar: 'لعبت 3 أيام متتالية!', desc_en: 'Played 3 days in a row!',
    check: p => p.streakDays >= 3,
  },
  {
    id: 'seven_streak', icon: '⭐',
    name_ar: 'أسبوع كامل', name_en: 'Full Week',
    desc_ar: 'لعبت 7 أيام متتالية!', desc_en: 'Played a full week!',
    check: p => p.streakDays >= 7,
  },
  {
    id: 'all_topics', icon: '🌈',
    name_ar: 'مستكشف المواضيع', name_en: 'Topic Explorer',
    desc_ar: 'تعلمت من كل المواضيع السبعة', desc_en: 'Learned from all 7 topics',
    check: p => Object.keys(p.topicProgress).length >= 7,
  },
  {
    id: 'level_five', icon: '🏆',
    name_ar: 'بطل المستوى 5', name_en: 'Level 5 Hero',
    desc_ar: 'وصلت للمستوى الخامس!', desc_en: 'Reached level 5!',
    check: p => p.level >= 5,
  },
  {
    id: 'hundred_stars', icon: '💫',
    name_ar: 'جامع النجوم', name_en: 'Star Collector',
    desc_ar: 'جمعت 100 نجمة', desc_en: 'Collected 100 stars',
    check: p => p.stars >= 100,
  },
];

/** Check for newly earned badges. */
export function checkNewBadges(profile: KidsProfile): Badge[] {
  const earnedIds = new Set(profile.badges.map(b => b.id));
  const newBadges: Badge[] = [];
  const now = new Date().toISOString();

  for (const def of BADGE_DEFS) {
    if (!earnedIds.has(def.id) && def.check(profile)) {
      newBadges.push({
        id: def.id,
        icon: def.icon,
        name_ar: def.name_ar,
        name_en: def.name_en,
        earnedAt: now,
      });
    }
  }
  return newBadges;
}

/** Get all badge definitions for display. */
export function getAllBadgeDefs(): { id: string; icon: string; name_ar: string; name_en: string; desc_ar: string; desc_en: string }[] {
  return BADGE_DEFS.map(d => ({ id: d.id, icon: d.icon, name_ar: d.name_ar, name_en: d.name_en, desc_ar: d.desc_ar, desc_en: d.desc_en }));
}

// ───────────────────────────────────────────────────────────────
// Quiz Generation
// ───────────────────────────────────────────────────────────────

import { Verse } from '@/lib/types';
import { getTopicsMaster } from '@/lib/data';

let cachedVerses: Verse[] | null = null;

async function getVerses(): Promise<Verse[]> {
  if (cachedVerses) return cachedVerses;
  const data = await getTopicsMaster();
  cachedVerses = data.verses;
  return cachedVerses;
}

/** Pick random short verses suitable for kids (≤15 words). */
async function pickKidsVerses(count: number, topicId?: number): Promise<Verse[]> {
  const all = await getVerses();
  let pool = all.filter(v => {
    const wordCount = v.text.split(/\s+/).length;
    return wordCount >= 3 && wordCount <= 15;
  });

  if (topicId) {
    pool = pool.filter(v => v.topic.id === topicId);
  }

  // Shuffle and pick
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/** Generate a "complete the verse" question. Shows first ~60% of words. */
export function generateCompleteQuestion(verse: Verse): KidsQuizQuestion {
  const words = verse.text.split(/\s+/);
  const showCount = Math.max(1, Math.ceil(words.length * 0.6));
  const hideStart = showCount;

  return {
    verse_key: verse.verse_key,
    surah: verse.surah,
    ayah: verse.ayah,
    fullText: verse.text,
    shownWords: words.slice(0, showCount),
    hiddenWords: words.slice(hideStart),
    hiddenStartIndex: hideStart,
    topicId: verse.topic.id,
    topicColor: verse.topic.color,
  };
}

/** Generate a quiz session with N questions. */
export async function generateKidsQuiz(count: number = 5, topicId?: number): Promise<KidsQuizQuestion[]> {
  const verses = await pickKidsVerses(count, topicId);
  return verses.map(generateCompleteQuestion);
}

// ───────────────────────────────────────────────────────────────
// Grading & Rewards
// ───────────────────────────────────────────────────────────────

/** Encouraging messages — picked randomly. */
const ENCOURAGEMENTS: { ar: string; en: string }[] = [
  { ar: 'أحسنت! ما شاء الله! 🌟', en: 'Great job! MashaAllah! 🌟' },
  { ar: 'بارك الله فيك! 💫', en: 'Barak Allahu feek! 💫' },
  { ar: 'رائع جداً! ⭐', en: 'Amazing! ⭐' },
  { ar: 'ممتاز! أنت نجم! 🌙', en: 'Excellent! You are a star! 🌙' },
  { ar: 'تبارك الله! 🎉', en: 'Tabarak Allah! 🎉' },
];

const WRONG_ENCOURAGEMENTS: { ar: string; en: string }[] = [
  { ar: 'لا بأس! حاول مرة أخرى! 💪', en: 'No worries! Try again! 💪' },
  { ar: 'أنت قريب! جرّب مرة تانية! 🌱', en: 'You are close! Try again! 🌱' },
  { ar: 'المحاولة تعني التعلم! 📖', en: 'Trying means learning! 📖' },
];

/** Grade a kids quiz answer. Returns XP, stars, badges earned. */
export function gradeKidsAnswer(
  correct: boolean,
  profile: KidsProfile
): KidsQuizResult {
  const xpEarned = correct ? 10 : 2; // Even wrong attempts earn a little XP
  const starsEarned = correct ? 1 : 0;

  const updatedProfile = { ...profile };
  updatedProfile.xp += xpEarned;
  updatedProfile.stars += starsEarned;
  updatedProfile.level = levelFromXP(updatedProfile.xp);

  const newBadges = checkNewBadges(updatedProfile);
  const newLevel = updatedProfile.level > profile.level;

  const pool = correct ? ENCOURAGEMENTS : WRONG_ENCOURAGEMENTS;
  const encouragement = pool[Math.floor(Math.random() * pool.length)];

  return {
    correct,
    xpEarned,
    starsEarned,
    newBadges,
    newLevel,
    encouragement,
  };
}

// ───────────────────────────────────────────────────────────────
// Profile Persistence (localStorage)
// ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'kids-mode-profile';

export function getDefaultProfile(): KidsProfile {
  return {
    name: '',
    xp: 0,
    level: 1,
    stars: 0,
    badges: [],
    streakDays: 0,
    lastPlayedDate: '',
    quizzesCompleted: 0,
    versesLearned: [],
    topicProgress: {},
  };
}

export function loadKidsProfile(): KidsProfile {
  if (typeof window === 'undefined') return getDefaultProfile();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultProfile();
    return JSON.parse(raw) as KidsProfile;
  } catch {
    return getDefaultProfile();
  }
}

export function saveKidsProfile(profile: KidsProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch { /* quota exceeded — ignore */ }
}

/** Update streak and last played date. */
export function updateStreak(profile: KidsProfile): KidsProfile {
  const today = new Date().toISOString().slice(0, 10);
  if (profile.lastPlayedDate === today) return profile;

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const newStreak = profile.lastPlayedDate === yesterday ? profile.streakDays + 1 : 1;

  return {
    ...profile,
    streakDays: newStreak,
    lastPlayedDate: today,
  };
}
