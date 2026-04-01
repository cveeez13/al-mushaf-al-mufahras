import { describe, it, expect } from 'vitest';
import {
  xpForLevel,
  levelFromXP,
  levelProgress,
  getLevelTitle,
  getDefaultProfile,
  updateStreak,
  checkNewBadges,
  getAllBadgeDefs,
  gradeKidsAnswer,
  generateCompleteQuestion,
  KIDS_TOPICS,
} from '@/lib/kidsMode';
import type { Verse } from '@/lib/types';

// ─── Helper ──────────────────────────────────────────

function makeVerse(overrides: Partial<Verse> = {}): Verse {
  return {
    surah: 1,
    ayah: 1,
    page: 1,
    verse_key: '1:1',
    text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    topic: { id: 1, color: 'blue', hex: '#3498DB', name_ar: 'آيات الله', name_en: 'Signs' },
    ...overrides,
  } as Verse;
}

describe('Kids Mode', () => {
  // ─── XP & Level System ───────────────────────────────

  it('xpForLevel returns 0 for level 1', () => {
    expect(xpForLevel(1)).toBe(0);
  });

  it('xpForLevel increases with level', () => {
    expect(xpForLevel(2)).toBeGreaterThan(xpForLevel(1));
    expect(xpForLevel(3)).toBeGreaterThan(xpForLevel(2));
    expect(xpForLevel(5)).toBeGreaterThan(xpForLevel(4));
  });

  it('levelFromXP returns 1 for 0 XP', () => {
    expect(levelFromXP(0)).toBe(1);
  });

  it('levelFromXP returns correct level for known XP', () => {
    const xp2 = xpForLevel(2);
    expect(levelFromXP(xp2)).toBe(2);
    expect(levelFromXP(xp2 - 1)).toBe(1);
  });

  it('levelProgress returns 0 at start of level', () => {
    expect(levelProgress(0)).toBe(0);
  });

  it('levelProgress returns value between 0 and 1', () => {
    const xp2 = xpForLevel(2);
    const mid = xp2 + Math.floor((xpForLevel(3) - xp2) / 2);
    const prog = levelProgress(mid);
    expect(prog).toBeGreaterThan(0);
    expect(prog).toBeLessThan(1);
  });

  it('getLevelTitle returns a string for all levels', () => {
    for (let i = 1; i <= 10; i++) {
      expect(getLevelTitle(i, 'ar').length).toBeGreaterThan(0);
      expect(getLevelTitle(i, 'en').length).toBeGreaterThan(0);
    }
  });

  it('getLevelTitle caps at level 10', () => {
    expect(getLevelTitle(99, 'en')).toBe(getLevelTitle(10, 'en'));
  });

  // ─── KIDS_TOPICS ─────────────────────────────────────

  it('has 7 kid-friendly topics', () => {
    expect(Object.keys(KIDS_TOPICS)).toHaveLength(7);
  });

  it('each topic has icon, name_ar, name_en, bgGradient', () => {
    for (const t of Object.values(KIDS_TOPICS)) {
      expect(t.icon.length).toBeGreaterThan(0);
      expect(t.name_ar.length).toBeGreaterThan(0);
      expect(t.name_en.length).toBeGreaterThan(0);
      expect(t.bgGradient).toContain('gradient');
    }
  });

  // ─── Profile ─────────────────────────────────────────

  it('getDefaultProfile returns zeroed profile', () => {
    const p = getDefaultProfile();
    expect(p.xp).toBe(0);
    expect(p.level).toBe(1);
    expect(p.stars).toBe(0);
    expect(p.badges).toEqual([]);
    expect(p.versesLearned).toEqual([]);
  });

  // ─── Streak ──────────────────────────────────────────

  it('updateStreak sets streak to 1 on fresh play', () => {
    const p = getDefaultProfile();
    const updated = updateStreak(p);
    expect(updated.streakDays).toBe(1);
    expect(updated.lastPlayedDate).toBe(new Date().toISOString().slice(0, 10));
  });

  it('updateStreak returns same profile if already played today', () => {
    const p = getDefaultProfile();
    p.lastPlayedDate = new Date().toISOString().slice(0, 10);
    p.streakDays = 3;
    const updated = updateStreak(p);
    expect(updated).toBe(p); // same reference
    expect(updated.streakDays).toBe(3);
  });

  it('updateStreak increments if played yesterday', () => {
    const p = getDefaultProfile();
    p.lastPlayedDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    p.streakDays = 5;
    const updated = updateStreak(p);
    expect(updated.streakDays).toBe(6);
  });

  it('updateStreak resets to 1 if gap > 1 day', () => {
    const p = getDefaultProfile();
    p.lastPlayedDate = new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10);
    p.streakDays = 10;
    const updated = updateStreak(p);
    expect(updated.streakDays).toBe(1);
  });

  // ─── Badges ──────────────────────────────────────────

  it('checkNewBadges returns first_quiz badge after 1 quiz', () => {
    const p = getDefaultProfile();
    p.quizzesCompleted = 1;
    const badges = checkNewBadges(p);
    expect(badges.some(b => b.id === 'first_quiz')).toBe(true);
  });

  it('checkNewBadges does not return already earned badges', () => {
    const p = getDefaultProfile();
    p.quizzesCompleted = 5;
    p.badges = [{ id: 'first_quiz', icon: '🎯', name_ar: '', name_en: '', earnedAt: '' }];
    const badges = checkNewBadges(p);
    expect(badges.some(b => b.id === 'first_quiz')).toBe(false);
    expect(badges.some(b => b.id === 'five_quizzes')).toBe(true);
  });

  it('getAllBadgeDefs returns all badge definitions', () => {
    const defs = getAllBadgeDefs();
    expect(defs.length).toBeGreaterThanOrEqual(10);
    for (const d of defs) {
      expect(d.id).toBeTruthy();
      expect(d.icon).toBeTruthy();
    }
  });

  // ─── Quiz Generation ──────────────────────────────────

  it('generateCompleteQuestion splits verse into shown and hidden', () => {
    const verse = makeVerse({ text: 'كلمة واحدة اثنين ثلاثة أربعة' });
    const q = generateCompleteQuestion(verse);
    expect(q.shownWords.length).toBeGreaterThan(0);
    expect(q.hiddenWords.length).toBeGreaterThan(0);
    expect([...q.shownWords, ...q.hiddenWords].join(' ')).toBe(verse.text);
    expect(q.verse_key).toBe(verse.verse_key);
    expect(q.topicId).toBe(verse.topic.id);
  });

  it('generateCompleteQuestion shows ~60% of words', () => {
    const verse = makeVerse({ text: 'واحد اثنان ثلاثة أربعة خمسة ستة سبعة ثمانية تسعة عشرة' });
    const q = generateCompleteQuestion(verse);
    const total = verse.text.split(/\s+/).length;
    const shown = q.shownWords.length;
    expect(shown).toBe(Math.max(1, Math.ceil(total * 0.6)));
  });

  // ─── Grading ──────────────────────────────────────────

  it('gradeKidsAnswer gives more XP for correct answer', () => {
    const p = getDefaultProfile();
    const correct = gradeKidsAnswer(true, p);
    const wrong = gradeKidsAnswer(false, p);
    expect(correct.xpEarned).toBeGreaterThan(wrong.xpEarned);
    expect(correct.starsEarned).toBe(1);
    expect(wrong.starsEarned).toBe(0);
  });

  it('gradeKidsAnswer returns encouragement message', () => {
    const p = getDefaultProfile();
    const result = gradeKidsAnswer(true, p);
    expect(result.encouragement.ar.length).toBeGreaterThan(0);
    expect(result.encouragement.en.length).toBeGreaterThan(0);
  });

  it('gradeKidsAnswer detects level up', () => {
    const p = getDefaultProfile();
    p.xp = xpForLevel(2) - 5; // Just below level 2
    const result = gradeKidsAnswer(true, p); // +10 XP
    expect(result.newLevel).toBe(true);
  });

  it('wrong answer still earns some XP', () => {
    const p = getDefaultProfile();
    const result = gradeKidsAnswer(false, p);
    expect(result.xpEarned).toBeGreaterThan(0);
  });
});
