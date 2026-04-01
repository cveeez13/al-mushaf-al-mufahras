import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPlan, recalculatePlan, markDayComplete, getPlanProgress,
  getTopicsForPageRange, loadPlan, savePlan, deletePlan,
  loadHistory, archivePlan, todayStr, addDays, diffDays,
  KHATMA_PRESETS, TOTAL_PAGES,
  type KhatmaPlan, type DaySchedule,
} from '@/lib/khatmaPlanner';

beforeEach(() => {
  localStorage.clear();
});

// ─── Constants ──────────────────────────────────────────────

describe('Khatma Constants', () => {
  it('TOTAL_PAGES is 604', () => {
    expect(TOTAL_PAGES).toBe(604);
  });

  it('KHATMA_PRESETS has 4 options', () => {
    expect(KHATMA_PRESETS).toHaveLength(4);
    expect(KHATMA_PRESETS[0].days).toBe(7);
    expect(KHATMA_PRESETS[1].days).toBe(14);
    expect(KHATMA_PRESETS[2].days).toBe(30);
    expect(KHATMA_PRESETS[3].days).toBe(60);
  });

  it('each preset has correct pagesPerDay', () => {
    for (const p of KHATMA_PRESETS) {
      expect(p.pagesPerDay).toBe(Math.ceil(604 / p.days));
    }
  });
});

// ─── Helpers ────────────────────────────────────────────────

describe('Date Helpers', () => {
  it('todayStr returns YYYY-MM-DD format', () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('addDays adds days correctly', () => {
    expect(addDays('2026-01-01', 5)).toBe('2026-01-06');
    expect(addDays('2026-01-30', 2)).toBe('2026-02-01');
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
  });

  it('diffDays calculates difference between dates', () => {
    expect(diffDays('2026-01-01', '2026-01-10')).toBe(9);
    expect(diffDays('2026-01-10', '2026-01-01')).toBe(-9);
    expect(diffDays('2026-03-01', '2026-03-01')).toBe(0);
  });
});

// ─── Plan Creation ──────────────────────────────────────────

describe('createPlan', () => {
  it('creates a 30-day plan with correct structure', () => {
    const plan = createPlan(30, '2026-04-01');
    expect(plan.targetDays).toBe(30);
    expect(plan.startDate).toBe('2026-04-01');
    expect(plan.status).toBe('active');
    expect(plan.dailySchedule).toHaveLength(30);
    expect(plan.notificationsEnabled).toBe(false);
  });

  it('first day starts at page 1', () => {
    const plan = createPlan(30, '2026-04-01');
    expect(plan.dailySchedule[0].startPage).toBe(1);
    expect(plan.dailySchedule[0].day).toBe(1);
    expect(plan.dailySchedule[0].date).toBe('2026-04-01');
  });

  it('last day ends at page 604', () => {
    const plan = createPlan(30, '2026-04-01');
    const last = plan.dailySchedule[plan.dailySchedule.length - 1];
    expect(last.endPage).toBe(604);
    expect(last.day).toBe(30);
    expect(last.date).toBe('2026-04-30');
  });

  it('total pages across all days sums to 604', () => {
    const plan = createPlan(30, '2026-04-01');
    const total = plan.dailySchedule.reduce((s, d) => s + d.pagesCount, 0);
    expect(total).toBe(604);
  });

  it('all days are marked as not completed', () => {
    const plan = createPlan(7, '2026-04-01');
    for (const d of plan.dailySchedule) {
      expect(d.completed).toBe(false);
      expect(d.completedAt).toBeUndefined();
    }
  });

  it('pages are contiguous with no gaps', () => {
    const plan = createPlan(14, '2026-04-01');
    for (let i = 1; i < plan.dailySchedule.length; i++) {
      expect(plan.dailySchedule[i].startPage).toBe(plan.dailySchedule[i - 1].endPage + 1);
    }
  });

  it('distributes remainder pages to earlier days', () => {
    // 604 / 7 = 86 remainder 2, so first 2 days get 87, rest get 86
    const plan = createPlan(7, '2026-04-01');
    expect(plan.dailySchedule[0].pagesCount).toBe(87);
    expect(plan.dailySchedule[1].pagesCount).toBe(87);
    expect(plan.dailySchedule[2].pagesCount).toBe(86);
    expect(plan.dailySchedule[6].pagesCount).toBe(86);
  });

  it('clamps extreme values', () => {
    const plan = createPlan(1000, '2026-04-01');
    expect(plan.targetDays).toBe(365);
  });

  it('works with 1-day plan', () => {
    const plan = createPlan(1, '2026-04-01');
    expect(plan.dailySchedule).toHaveLength(1);
    expect(plan.dailySchedule[0].startPage).toBe(1);
    expect(plan.dailySchedule[0].endPage).toBe(604);
    expect(plan.dailySchedule[0].pagesCount).toBe(604);
  });
});

// ─── Mark Day Complete ──────────────────────────────────────

describe('markDayComplete', () => {
  it('marks a specific day as completed', () => {
    const plan = createPlan(30, '2026-04-01');
    const updated = markDayComplete(plan, 1);
    expect(updated.dailySchedule[0].completed).toBe(true);
    expect(updated.dailySchedule[0].completedAt).toBeTruthy();
    expect(updated.dailySchedule[1].completed).toBe(false);
  });

  it('sets status to completed when all days are done', () => {
    let plan = createPlan(3, '2026-04-01');
    plan = markDayComplete(plan, 1);
    plan = markDayComplete(plan, 2);
    expect(plan.status).toBe('active');
    plan = markDayComplete(plan, 3);
    expect(plan.status).toBe('completed');
  });

  it('does not mutate the original plan', () => {
    const plan = createPlan(5, '2026-04-01');
    const updated = markDayComplete(plan, 1);
    expect(plan.dailySchedule[0].completed).toBe(false);
    expect(updated.dailySchedule[0].completed).toBe(true);
  });
});

// ─── Plan Progress ──────────────────────────────────────────

describe('getPlanProgress', () => {
  it('returns correct initial progress', () => {
    const plan = createPlan(30, todayStr());
    const p = getPlanProgress(plan);
    expect(p.totalDays).toBe(30);
    expect(p.completedDays).toBe(0);
    expect(p.pagesCompleted).toBe(0);
    expect(p.percentComplete).toBe(0);
    expect(p.todaySchedule).toBeTruthy();
  });

  it('percentComplete calculated correctly', () => {
    let plan = createPlan(30, todayStr());
    plan = markDayComplete(plan, 1);
    const p = getPlanProgress(plan);
    expect(p.completedDays).toBe(1);
    expect(p.pagesCompleted).toBe(plan.dailySchedule[0].pagesCount);
    expect(p.percentComplete).toBeGreaterThan(0);
  });

  it('onTrack when no missed days', () => {
    const plan = createPlan(30, todayStr());
    const p = getPlanProgress(plan);
    expect(p.onTrack).toBe(true);
    expect(p.missedDays).toBe(0);
  });

  it('detects missed days for past plan', () => {
    const plan = createPlan(30, '2025-01-01');
    const p = getPlanProgress(plan);
    expect(p.missedDays).toBe(30); // all days are in the past
  });

  it('adjusts pages per day when behind schedule', () => {
    const plan = createPlan(30, '2025-01-01');
    const p = getPlanProgress(plan);
    // All days missed, remaining = 604, remainingDays could be 0
    expect(p.pagesRemaining).toBe(604);
  });
});

// ─── Adaptive Redistribution ────────────────────────────────

describe('recalculatePlan', () => {
  it('redistributes pages across remaining days', () => {
    const today = todayStr();
    let plan = createPlan(10, addDays(today, -3)); // started 3 days ago
    // Complete day 1 only
    plan = markDayComplete(plan, 1);

    const updated = recalculatePlan(plan);
    // Days 2, 3 are missed (past but uncompleted)
    // Future uncompleted days should cover remaining pages
    const futureUncompleted = updated.dailySchedule.filter(d => !d.completed && d.date >= today);
    const totalFuturePages = futureUncompleted.reduce((s, d) => s + d.pagesCount, 0);
    const remainingPages = TOTAL_PAGES - plan.dailySchedule[0].pagesCount;
    expect(totalFuturePages).toBe(remainingPages);
  });

  it('maintains contiguous pages after redistribution', () => {
    const today = todayStr();
    let plan = createPlan(7, addDays(today, -2));
    plan = markDayComplete(plan, 1);
    const updated = recalculatePlan(plan);

    const futureUncompleted = updated.dailySchedule
      .filter(d => !d.completed && d.date >= today)
      .sort((a, b) => a.day - b.day);

    for (let i = 1; i < futureUncompleted.length; i++) {
      expect(futureUncompleted[i].startPage).toBe(futureUncompleted[i - 1].endPage + 1);
    }
  });

  it('returns same plan if no future days', () => {
    const plan = createPlan(3, '2024-01-01'); // all in the past
    const updated = recalculatePlan(plan);
    expect(updated.dailySchedule).toEqual(plan.dailySchedule);
  });
});

// ─── Topic Analysis ─────────────────────────────────────────

describe('getTopicsForPageRange', () => {
  const mockVerses = [
    { surah: 1, ayah: 1, page: 1, verse_key: '1:1', text: '', topic: { id: 1, color: 'blue', hex: '#3498DB', name_ar: 'موضوع أ', name_en: 'Topic A' }, confidence: '', method: '' },
    { surah: 1, ayah: 2, page: 1, verse_key: '1:2', text: '', topic: { id: 1, color: 'blue', hex: '#3498DB', name_ar: 'موضوع أ', name_en: 'Topic A' }, confidence: '', method: '' },
    { surah: 1, ayah: 3, page: 2, verse_key: '1:3', text: '', topic: { id: 2, color: 'green', hex: '#27AE60', name_ar: 'موضوع ب', name_en: 'Topic B' }, confidence: '', method: '' },
    { surah: 1, ayah: 4, page: 3, verse_key: '1:4', text: '', topic: { id: 3, color: 'brown', hex: '#8E6B3D', name_ar: 'موضوع ج', name_en: 'Topic C' }, confidence: '', method: '' },
  ] as any[];

  it('returns topic breakdown for a page range', () => {
    const result = getTopicsForPageRange(mockVerses, 1, 2);
    expect(result).toHaveLength(2); // blue + green
    expect(result[0].topicId).toBe(1); // most verses
    expect(result[0].verseCount).toBe(2);
    expect(result[0].percentage).toBe(67);
    expect(result[1].topicId).toBe(2);
    expect(result[1].verseCount).toBe(1);
  });

  it('returns empty for out-of-range pages', () => {
    const result = getTopicsForPageRange(mockVerses, 100, 200);
    expect(result).toHaveLength(0);
  });

  it('sorts by verseCount descending', () => {
    const result = getTopicsForPageRange(mockVerses, 1, 3);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].verseCount).toBeLessThanOrEqual(result[i - 1].verseCount);
    }
  });
});

// ─── Persistence ────────────────────────────────────────────

describe('Plan Persistence', () => {
  it('loadPlan returns null when empty', () => {
    expect(loadPlan()).toBeNull();
  });

  it('savePlan and loadPlan round-trip', () => {
    const plan = createPlan(30, '2026-04-01');
    savePlan(plan);
    const loaded = loadPlan();
    expect(loaded?.id).toBe(plan.id);
    expect(loaded?.targetDays).toBe(30);
    expect(loaded?.dailySchedule).toHaveLength(30);
  });

  it('deletePlan removes stored plan', () => {
    savePlan(createPlan(30));
    expect(loadPlan()).not.toBeNull();
    deletePlan();
    expect(loadPlan()).toBeNull();
  });
});

// ─── History ────────────────────────────────────────────────

describe('Plan History', () => {
  it('loadHistory returns empty initially', () => {
    expect(loadHistory()).toEqual([]);
  });

  it('archivePlan stores completed plan', () => {
    let plan = createPlan(3, '2026-04-01');
    plan = markDayComplete(plan, 1);
    plan = markDayComplete(plan, 2);
    plan = markDayComplete(plan, 3);
    archivePlan(plan);

    const history = loadHistory();
    expect(history).toHaveLength(1);
    expect(history[0].status).toBe('completed');
    expect(history[0].actualDays).toBe(3);
  });

  it('archivePlan stores abandoned plan', () => {
    const plan = createPlan(10, '2026-04-01');
    archivePlan({ ...plan, status: 'paused' });
    const history = loadHistory();
    expect(history[0].status).toBe('abandoned');
  });

  it('accumulates multiple history entries', () => {
    const p1 = createPlan(7, '2026-01-01');
    const p2 = createPlan(14, '2026-02-01');
    archivePlan({ ...p1, status: 'completed', dailySchedule: p1.dailySchedule.map(d => ({ ...d, completed: true, completedAt: '2026-01-07T12:00:00' })) });
    archivePlan({ ...p2, status: 'paused' });
    expect(loadHistory()).toHaveLength(2);
  });
});
