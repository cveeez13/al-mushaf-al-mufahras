'use client';

export interface MemorizationReminderPrefs {
  enabled: boolean;
  reminderTime: string;
  dailyGoal: number;
  lastReminderDate: string;
}

const STORAGE_KEY = 'mushaf-memorization-reminders';

function defaultPrefs(): MemorizationReminderPrefs {
  return {
    enabled: false,
    reminderTime: '08:00',
    dailyGoal: 10,
    lastReminderDate: '',
  };
}

export function loadMemorizationReminderPrefs(): MemorizationReminderPrefs {
  if (typeof window === 'undefined') return defaultPrefs();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPrefs();
    return { ...defaultPrefs(), ...JSON.parse(raw) };
  } catch {
    return defaultPrefs();
  }
}

export function saveMemorizationReminderPrefs(prefs: MemorizationReminderPrefs): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export async function requestMemorizationNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function isPastReminderTime(reminderTime: string): boolean {
  const [hours, minutes] = reminderTime.split(':').map((part) => Number(part) || 0);
  const now = new Date();
  const reminder = new Date(now);
  reminder.setHours(hours, minutes, 0, 0);
  return now >= reminder;
}

export async function maybeSendMemorizationReminder(dueCount: number): Promise<boolean> {
  if (typeof window === 'undefined' || dueCount <= 0 || !('Notification' in window)) return false;

  const prefs = loadMemorizationReminderPrefs();
  if (!prefs.enabled || !isPastReminderTime(prefs.reminderTime)) return false;

  const today = new Date().toISOString().split('T')[0];
  if (prefs.lastReminderDate === today) return false;
  if (Notification.permission !== 'granted') return false;

  const title = 'مراجعات الحفظ جاهزة';
  const body =
    dueCount === 1
      ? 'لديك آية واحدة جاهزة للمراجعة اليوم.'
      : `لديك ${dueCount} آيات جاهزة للمراجعة اليوم.`;

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        tag: 'memorization-review',
        lang: 'ar',
        dir: 'rtl',
      });
    } catch {
      new Notification(title, { body, tag: 'memorization-review', lang: 'ar', dir: 'rtl' });
    }
  } else {
    new Notification(title, { body, tag: 'memorization-review', lang: 'ar', dir: 'rtl' });
  }

  saveMemorizationReminderPrefs({ ...prefs, lastReminderDate: today });
  return true;
}
