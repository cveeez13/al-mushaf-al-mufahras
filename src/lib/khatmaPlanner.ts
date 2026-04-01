/**
 * Khatma Planner Engine — Smart Quran Completion Scheduler
 *
 * Features:
 * - Scheduling: Divides 604 pages across N days evenly
 * - Adaptive redistribution: Missed days → remaining pages redistributed
 * - Topic analysis: Shows which topics appear in each day's reading
 * - Persistence: localStorage for plan + history
 * - Notifications: Notification API + Service Worker
 * - Presets: 7, 14, 30, 60-day plans
 */

import type { Verse } from './types';

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

export interface KhatmaPlan {
  id: string;
  createdAt: string;
  targetDays: number;
  startDate: string;           // YYYY-MM-DD
  dailySchedule: DaySchedule[];
  status: 'active' | 'completed' | 'paused';
  notificationsEnabled: boolean;
  reminderTime: string;        // HH:MM
}

export interface DaySchedule {
  day: number;                 // 1-based
  date: string;                // YYYY-MM-DD
  startPage: number;
  endPage: number;
  pagesCount: number;
  completed: boolean;
  completedAt?: string;
}

export interface TopicBreakdown {
  topicId: number;
  color: string;
  name_ar: string;
  name_en: string;
  verseCount: number;
  percentage: number;
}

export interface PlanProgress {
  totalDays: number;
  completedDays: number;
  missedDays: number;
  remainingDays: number;
  pagesCompleted: number;
  pagesRemaining: number;
  pagesPerDayOriginal: number;
  pagesPerDayAdjusted: number;
  onTrack: boolean;
  percentComplete: number;
  currentDay: number;
  todaySchedule: DaySchedule | null;
}

export interface KhatmaHistoryEntry {
  id: string;
  targetDays: number;
  actualDays: number;
  startDate: string;
  endDate: string;
  status: 'completed' | 'abandoned';
}

// ───────────────────────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────────────────────

export const TOTAL_PAGES = 604;
const PLAN_KEY = 'khatma-plan';
const HISTORY_KEY = 'khatma-history';

export const KHATMA_PRESETS = [
  { days: 7,  ar: 'ختمة أسبوعية',    en: 'Weekly Khatma',    pagesPerDay: Math.ceil(TOTAL_PAGES / 7) },
  { days: 14, ar: 'ختمة نصف شهرية',  en: 'Bi-weekly Khatma', pagesPerDay: Math.ceil(TOTAL_PAGES / 14) },
  { days: 30, ar: 'ختمة شهرية',      en: 'Monthly Khatma',   pagesPerDay: Math.ceil(TOTAL_PAGES / 30) },
  { days: 60, ar: 'ختمة في شهرين',   en: '2-Month Khatma',   pagesPerDay: Math.ceil(TOTAL_PAGES / 60) },
] as const;

// ───────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

export function diffDays(a: string, b: string): number {
  const da = new Date(a + 'T12:00:00Z');
  const db = new Date(b + 'T12:00:00Z');
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

// ───────────────────────────────────────────────────────────────
// Scheduling Algorithm
// ───────────────────────────────────────────────────────────────

/**
 * Distributes pages evenly across days.
 * Remainder pages go to earlier days so later days aren't heavier.
 */
function distributePagesOverDays(
  startPage: number,
  endPage: number,
  days: number,
  startDate: string
): DaySchedule[] {
  const totalPages = endPage - startPage + 1;
  const base = Math.floor(totalPages / days);
  const extra = totalPages % days;

  const schedule: DaySchedule[] = [];
  let current = startPage;

  for (let i = 0; i < days; i++) {
    const count = base + (i < extra ? 1 : 0);
    schedule.push({
      day: i + 1,
      date: addDays(startDate, i),
      startPage: current,
      endPage: current + count - 1,
      pagesCount: count,
      completed: false,
    });
    current += count;
  }

  return schedule;
}

// ───────────────────────────────────────────────────────────────
// Plan Creation
// ───────────────────────────────────────────────────────────────

export function createPlan(
  targetDays: number,
  startDate: string = todayStr(),
  reminderTime: string = '08:00'
): KhatmaPlan {
  const clamped = Math.max(1, Math.min(365, targetDays));
  return {
    id: generateId(),
    createdAt: new Date().toISOString(),
    targetDays: clamped,
    startDate,
    dailySchedule: distributePagesOverDays(1, TOTAL_PAGES, clamped, startDate),
    status: 'active',
    notificationsEnabled: false,
    reminderTime,
  };
}

// ───────────────────────────────────────────────────────────────
// Adaptive Redistribution
// ───────────────────────────────────────────────────────────────

/**
 * Redistributes remaining pages across future uncompleted days.
 * Called when user has missed days and needs an updated schedule.
 */
export function recalculatePlan(plan: KhatmaPlan): KhatmaPlan {
  const today = todayStr();
  const schedule = [...plan.dailySchedule];

  // Find last completed page
  let lastCompletedPage = 0;
  for (const d of schedule) {
    if (d.completed) lastCompletedPage = d.endPage;
  }

  // Collect future uncompleted day indices
  const futureIndices = schedule
    .map((d, i) => (!d.completed && d.date >= today ? i : -1))
    .filter(i => i !== -1);

  if (futureIndices.length === 0) return plan;

  const remaining = TOTAL_PAGES - lastCompletedPage;
  if (remaining <= 0) return plan;

  const base = Math.floor(remaining / futureIndices.length);
  const extra = remaining % futureIndices.length;

  let current = lastCompletedPage + 1;

  futureIndices.forEach((idx, fi) => {
    const count = base + (fi < extra ? 1 : 0);
    schedule[idx] = {
      ...schedule[idx],
      startPage: current,
      endPage: current + count - 1,
      pagesCount: count,
    };
    current += count;
  });

  return { ...plan, dailySchedule: schedule };
}

// ───────────────────────────────────────────────────────────────
// Mark Day Complete
// ───────────────────────────────────────────────────────────────

export function markDayComplete(plan: KhatmaPlan, dayNumber: number): KhatmaPlan {
  const updated = plan.dailySchedule.map(d =>
    d.day === dayNumber
      ? { ...d, completed: true, completedAt: new Date().toISOString() }
      : d
  );

  const allDone = updated.every(d => d.completed);

  return {
    ...plan,
    dailySchedule: updated,
    status: allDone ? 'completed' : plan.status,
  };
}

// ───────────────────────────────────────────────────────────────
// Progress Calculation
// ───────────────────────────────────────────────────────────────

export function getPlanProgress(plan: KhatmaPlan): PlanProgress {
  const today = todayStr();
  const { dailySchedule, targetDays } = plan;

  const completedDays = dailySchedule.filter(d => d.completed).length;
  const pagesCompleted = dailySchedule
    .filter(d => d.completed)
    .reduce((sum, d) => sum + d.pagesCount, 0);

  const daysSinceStart = diffDays(plan.startDate, today);
  const currentDay = Math.max(1, Math.min(daysSinceStart + 1, targetDays));

  const missedDays = dailySchedule.filter(
    d => d.date < today && !d.completed
  ).length;

  const remainingDays = Math.max(0, targetDays - completedDays);
  const pagesRemaining = TOTAL_PAGES - pagesCompleted;
  const todaySchedule = dailySchedule.find(d => d.date === today) || null;

  return {
    totalDays: targetDays,
    completedDays,
    missedDays,
    remainingDays,
    pagesCompleted,
    pagesRemaining,
    pagesPerDayOriginal: Math.ceil(TOTAL_PAGES / targetDays),
    pagesPerDayAdjusted: remainingDays > 0 ? Math.ceil(pagesRemaining / remainingDays) : 0,
    onTrack: missedDays === 0,
    percentComplete: Math.round((pagesCompleted / TOTAL_PAGES) * 100),
    currentDay,
    todaySchedule,
  };
}

// ───────────────────────────────────────────────────────────────
// Topic Analysis
// ───────────────────────────────────────────────────────────────

/**
 * Computes topic breakdown for a page range using verse data.
 * The caller provides verses (loaded async from data.ts).
 */
export function getTopicsForPageRange(
  verses: Verse[],
  startPage: number,
  endPage: number
): TopicBreakdown[] {
  const pageVerses = verses.filter(
    v => v.page !== null && v.page >= startPage && v.page <= endPage
  );

  const counts: Record<number, { count: number; color: string; name_ar: string; name_en: string }> = {};

  for (const v of pageVerses) {
    const tid = v.topic.id;
    if (!counts[tid]) {
      counts[tid] = { count: 0, color: v.topic.color, name_ar: v.topic.name_ar, name_en: v.topic.name_en };
    }
    counts[tid].count++;
  }

  const total = pageVerses.length || 1;

  return Object.entries(counts)
    .map(([id, data]) => ({
      topicId: Number(id),
      color: data.color,
      name_ar: data.name_ar,
      name_en: data.name_en,
      verseCount: data.count,
      percentage: Math.round((data.count / total) * 100),
    }))
    .sort((a, b) => b.verseCount - a.verseCount);
}

// ───────────────────────────────────────────────────────────────
// Persistence
// ───────────────────────────────────────────────────────────────

export function loadPlan(): KhatmaPlan | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function savePlan(plan: KhatmaPlan): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  } catch { /* quota exceeded */ }
}

export function deletePlan(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PLAN_KEY);
}

// ───────────────────────────────────────────────────────────────
// History
// ───────────────────────────────────────────────────────────────

export function loadHistory(): KhatmaHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function archivePlan(plan: KhatmaPlan): void {
  const history = loadHistory();
  const lastDay = plan.dailySchedule.filter(d => d.completed).pop();
  history.push({
    id: plan.id,
    targetDays: plan.targetDays,
    actualDays: plan.dailySchedule.filter(d => d.completed).length,
    startDate: plan.startDate,
    endDate: lastDay?.completedAt?.split('T')[0] || todayStr(),
    status: plan.status === 'completed' ? 'completed' : 'abandoned',
  });
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch { /* quota exceeded */ }
  }
}

// ───────────────────────────────────────────────────────────────
// Notification Support
// ───────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function scheduleNotification(title: string, body: string, tag: string = 'khatma'): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag,
        dir: 'rtl',
        lang: 'ar',
      });
    });
  } else {
    new Notification(title, { body, tag, dir: 'rtl', lang: 'ar' });
  }
}

/**
 * Check on load if user should be reminded to read today.
 * Fires once per app-open if today's reading is pending.
 */
export function checkDailyReminder(plan: KhatmaPlan): void {
  if (!plan.notificationsEnabled || plan.status !== 'active') return;

  const today = todayStr();
  const todayDay = plan.dailySchedule.find(d => d.date === today);
  if (!todayDay || todayDay.completed) return;

  // Only fire once per session
  const reminderKey = `khatma-reminded-${today}`;
  if (typeof window !== 'undefined' && sessionStorage.getItem(reminderKey)) return;
  if (typeof window !== 'undefined') sessionStorage.setItem(reminderKey, '1');

  scheduleNotification(
    'ورد اليوم 📖',
    `صفحات ${todayDay.startPage} – ${todayDay.endPage} (${todayDay.pagesCount} صفحة)`,
    'khatma-daily'
  );
}
