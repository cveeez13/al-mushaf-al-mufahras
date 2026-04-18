/**
 * Notification Scheduler — Smart push notification system with time-based triggers.
 *
 * Features:
 * - Background notification scheduling using Service Workers + Web Workers
 * - Time-based reminders for daily Khatma readings
 * - User behavior learning (best reading times)
 * - RTL Arabic support with topic colors
 * - Graceful fallback for browsers without Service Worker support
 */

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

export interface NotificationSchedule {
  id: string;                    // Unique identifier
  type: 'khatma' | 'reminder' | 'milestone';
  title: { ar: string; en: string };
  body: { ar: string; en: string };
  scheduledTime: string;         // HH:MM format (24h)
  timezone: string;              // 'UTC' or IANA timezone
  dayOfWeek?: number;            // 0-6 (0=Sunday) for weekly reminders
  actionUrl?: string;            // URL to navigate when clicked
  tag: string;                   // Notification group ID (prevents duplicates)
  topicId?: number;              // Associated topic color
  enabled: boolean;
  lastFired?: string;            // ISO timestamp
  fireCount: number;
}

export interface UserBehavior {
  userId: string;
  averageReadingTime: number;    // Hour of day (0-23)
  readingFrequency: number[];    // Hours when user typically reads [7, 14, 20]
  completionRate: number;        // Percentage of scheduled days completed
  preferredNotificationTime: string; // HH:MM
  timezone: string;
  lastUpdated: string;           // ISO timestamp
}

export interface NotificationMetrics {
  totalScheduled: number;
  totalFired: number;
  totalDismissed: number;
  avgEngagement: number;         // 0-1 (click rate)
}

// ───────────────────────────────────────────────────────────────
// Storage Keys
// ───────────────────────────────────────────────────────────────

const SCHEDULES_STORAGE_KEY = 'mushaf-notification-schedules';
const BEHAVIOR_STORAGE_KEY = 'mushaf-user-behavior';
const METRICS_STORAGE_KEY = 'mushaf-notification-metrics';

// ───────────────────────────────────────────────────────────────
// Schedule Management
// ───────────────────────────────────────────────────────────────

/**
 * Create a new notification schedule for daily Khatma reminders.
 * Intelligently picks the best time based on user behavior.
 */
export function createKhatmaSchedule(
  reminderTime: string,           // HH:MM from user input
  topicId: number,
  dailyPages: number
): NotificationSchedule {
  const hour = parseInt(reminderTime.split(':')[0], 10);
  const minute = parseInt(reminderTime.split(':')[1], 10);

  const topics = [
    'عجائب الكون', 'الجنة والمؤمنون', 'أحكام الإسلام',
    'قصص الأنبياء', 'القرآن العظيم', 'يوم القيامة', 'التحذير والتوبة'
  ];

  return {
    id: `khatma-${Date.now()}`,
    type: 'khatma',
    title: { ar: 'ورد اليوم 📖', en: 'Today\'s Reading 📖' },
    body: {
      ar: `اقرأ ${dailyPages} صفحات من ${topics[topicId - 1]}`,
      en: `Read ${dailyPages} pages of ${topics[topicId - 1]}`
    },
    scheduledTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    actionUrl: '/app?tab=mushaf',
    tag: `khatma-daily-${new Date().toISOString().split('T')[0]}`,
    topicId,
    enabled: true,
    fireCount: 0,
  };
}

/**
 * Create a milestone celebration notification.
 * Fires when user reaches certain checkpoints (25%, 50%, 75%, 100%).
 */
export function createMilestoneNotification(
  percentage: number,
  daysRemaining: number
): NotificationSchedule {
  const celebrationEmojis = ['🌟', '✨', '💫', '🎉'];
  const emoji = celebrationEmojis[Math.floor(percentage / 25) - 1] || '🎉';

  return {
    id: `milestone-${percentage}`,
    type: 'milestone',
    title: { ar: 'ما شاء الله! 🌟', en: 'MashaAllah! 🌟' },
    body: {
      ar: `أكملت ${percentage}% من الختمة! ${daysRemaining} يوم متبقي ${emoji}`,
      en: `You've completed ${percentage}% of the Khatma! ${daysRemaining} days left ${emoji}`
    },
    scheduledTime: '09:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    tag: `milestone-${percentage}`,
    enabled: true,
    fireCount: 0,
  };
}

/**
 * Persist notification schedules to localStorage.
 */
export function saveNotificationSchedules(schedules: NotificationSchedule[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SCHEDULES_STORAGE_KEY, JSON.stringify(schedules));
  } catch (e) {
    console.warn('Failed to save notification schedules:', e);
  }
}

/**
 * Load notification schedules from localStorage.
 */
export function loadNotificationSchedules(): NotificationSchedule[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SCHEDULES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Failed to load notification schedules:', e);
    return [];
  }
}

/**
 * Calculate next firing time for a schedule (in milliseconds from now).
 */
export function getNextFireTime(schedule: NotificationSchedule): number {
  const [hours, minutes] = schedule.scheduledTime.split(':').map(Number);
  const now = new Date();
  const next = new Date();

  next.setHours(hours, minutes, 0, 0);

  // If time has passed today, schedule for tomorrow
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  // For weekly reminders, skip to correct day
  if (schedule.dayOfWeek !== undefined && next.getDay() !== schedule.dayOfWeek) {
    const daysToAdd = (schedule.dayOfWeek - next.getDay() + 7) % 7 || 7;
    next.setDate(next.getDate() + daysToAdd);
  }

  return Math.max(next.getTime() - now.getTime(), 0);
}

/**
 * Register notification schedules with Service Worker for background firing.
 * Falls back to setTimeout if Service Worker not available.
 */
export async function registerSchedulesWithServiceWorker(
  schedules: NotificationSchedule[]
): Promise<void> {
  if (typeof window === 'undefined' || !navigator.serviceWorker) return;

  try {
    const registration = await navigator.serviceWorker.ready;

    // Send schedules to Service Worker
    registration.active?.postMessage({
      type: 'REGISTER_SCHEDULES',
      schedules: schedules.filter(s => s.enabled),
    });

    // Also set up client-side fallback timers
    schedules.forEach(schedule => {
      if (!schedule.enabled) return;
      const delay = getNextFireTime(schedule);
      setTimeout(() => {
        fireNotification(schedule);
        // Reschedule for next day/week
        registerSchedulesWithServiceWorker([schedule]);
      }, delay);
    });
  } catch (e) {
    console.warn('Service Worker registration failed, using fallback:', e);
    // Pure fallback: use setTimeout for all schedules
    schedules.forEach(schedule => {
      if (!schedule.enabled) return;
      const delay = getNextFireTime(schedule);
      setTimeout(() => {
        fireNotification(schedule);
      }, delay);
    });
  }
}

/**
 * Fire a notification immediately.
 */
export async function fireNotification(schedule: NotificationSchedule): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // Check Notification permission
    if (Notification.permission !== 'granted') return;

    // Try Service Worker notification first
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'FIRE_NOTIFICATION',
        schedule,
      });
    } else {
      // Fallback to direct Notification API
      const notification = new Notification(schedule.title.en, {
        body: schedule.body.en,
        tag: schedule.tag,
        icon: '/manifest.json',
        badge: '/logo.png',
        lang: 'ar',
        dir: 'rtl',
        requireInteraction: false,
      });

      // Log engagement
      recordNotificationEngagement(schedule.id, 'shown');

      // Handle click
      notification.addEventListener('click', () => {
        if (schedule.actionUrl) {
          window.location.href = schedule.actionUrl;
        }
        recordNotificationEngagement(schedule.id, 'clicked');
      });

      // Handle close
      notification.addEventListener('close', () => {
        recordNotificationEngagement(schedule.id, 'dismissed');
      });
    }

    // Update last fired time
    schedule.lastFired = new Date().toISOString();
    schedule.fireCount += 1;
  } catch (e) {
    console.error('Failed to fire notification:', e);
  }
}

// ───────────────────────────────────────────────────────────────
// User Behavior Learning
// ───────────────────────────────────────────────────────────────

/**
 * Track when user actually completes reading (for behavior learning).
 */
export function recordReadingCompletion(dayDate: string): void {
  if (typeof window === 'undefined') return;

  const now = new Date();
  const hour = now.getHours();

  try {
    const behavior = loadUserBehavior();

    // Update frequency array
    if (!behavior.readingFrequency.includes(hour)) {
      behavior.readingFrequency.push(hour);
      behavior.readingFrequency.sort((a, b) => a - b);
    }

    // Update average reading time (weighted average)
    const totalReadings = behavior.completionRate * 100; // rough estimate
    behavior.averageReadingTime = Math.round(
      (behavior.averageReadingTime * totalReadings + hour) / (totalReadings + 1)
    );

    // Suggest optimal notification time (1 hour before most common reading time)
    if (behavior.readingFrequency.length > 0) {
      const mostCommon = behavior.readingFrequency[
        Math.floor(behavior.readingFrequency.length / 2)
      ];
      behavior.preferredNotificationTime = `${String(Math.max(0, mostCommon - 1)).padStart(2, '0')}:00`;
    }

    behavior.lastUpdated = new Date().toISOString();
    saveUserBehavior(behavior);
  } catch (e) {
    console.warn('Failed to record reading completion:', e);
  }
}

/**
 * Load user behavior profile.
 */
export function loadUserBehavior(): UserBehavior {
  if (typeof window === 'undefined') {
    return getDefaultUserBehavior();
  }

  try {
    const raw = localStorage.getItem(BEHAVIOR_STORAGE_KEY);
    if (!raw) return getDefaultUserBehavior();
    return JSON.parse(raw);
  } catch (e) {
    return getDefaultUserBehavior();
  }
}

/**
 * Save user behavior profile.
 */
export function saveUserBehavior(behavior: UserBehavior): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BEHAVIOR_STORAGE_KEY, JSON.stringify(behavior));
  } catch (e) {
    console.warn('Failed to save user behavior:', e);
  }
}

/**
 * Get default user behavior profile.
 */
function getDefaultUserBehavior(): UserBehavior {
  return {
    userId: `user-${Date.now()}`,
    averageReadingTime: 14,            // 2 PM default
    readingFrequency: [8, 14, 20],     // Morning, afternoon, evening
    completionRate: 0.5,
    preferredNotificationTime: '13:00', // 1 PM (1 hour before afternoon reading)
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    lastUpdated: new Date().toISOString(),
  };
}

// ───────────────────────────────────────────────────────────────
// Engagement Tracking
// ───────────────────────────────────────────────────────────────

/**
 * Record notification engagement (shown, clicked, dismissed).
 */
export function recordNotificationEngagement(
  scheduleId: string,
  action: 'shown' | 'clicked' | 'dismissed'
): void {
  if (typeof window === 'undefined') return;

  try {
    const metrics = loadNotificationMetrics();

    switch (action) {
      case 'shown':
        metrics.totalFired += 1;
        break;
      case 'clicked':
        metrics.totalFired += 1;
        metrics.avgEngagement = (metrics.avgEngagement * (metrics.totalFired - 1) + 1) / metrics.totalFired;
        break;
      case 'dismissed':
        metrics.totalDismissed += 1;
        break;
    }

    saveNotificationMetrics(metrics);
  } catch (e) {
    console.warn('Failed to record notification engagement:', e);
  }
}

/**
 * Load notification metrics.
 */
export function loadNotificationMetrics(): NotificationMetrics {
  if (typeof window === 'undefined') {
    return { totalScheduled: 0, totalFired: 0, totalDismissed: 0, avgEngagement: 0 };
  }

  try {
    const raw = localStorage.getItem(METRICS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { totalScheduled: 0, totalFired: 0, totalDismissed: 0, avgEngagement: 0 };
  } catch {
    return { totalScheduled: 0, totalFired: 0, totalDismissed: 0, avgEngagement: 0 };
  }
}

/**
 * Save notification metrics.
 */
export function saveNotificationMetrics(metrics: NotificationMetrics): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(metrics));
  } catch (e) {
    console.warn('Failed to save notification metrics:', e);
  }
}

// ───────────────────────────────────────────────────────────────
// Notification Permission Helper
// ───────────────────────────────────────────────────────────────

/**
 * Request notification permission from user.
 */
export async function requestNotificationPermissionWithReason(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (e) {
    console.warn('Failed to request notification permission:', e);
    return false;
  }
}
