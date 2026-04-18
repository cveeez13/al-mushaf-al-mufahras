/**
 * Khatma Planner Enhancement — Complete Export Summary
 *
 * This file documents all new types, interfaces, and functions available
 * for use in the rest of the application.
 */

// ═══════════════════════════════════════════════════════════════════
// FROM: src/lib/notificationScheduler.ts
// ═══════════════════════════════════════════════════════════════════

export interface NotificationSchedule {
  id: string;
  type: 'khatma' | 'reminder' | 'milestone';
  title: { ar: string; en: string };
  body: { ar: string; en: string };
  scheduledTime: string;         // HH:MM
  timezone: string;
  dayOfWeek?: number;
  actionUrl?: string;
  tag: string;
  topicId?: number;
  enabled: boolean;
  lastFired?: string;
  fireCount: number;
}

export interface UserBehavior {
  userId: string;
  averageReadingTime: number;    // 0-23 hours
  readingFrequency: number[];    // [7, 14, 20] hours
  completionRate: number;        // 0-1
  preferredNotificationTime: string;
  timezone: string;
  lastUpdated: string;
}

export interface NotificationMetrics {
  totalScheduled: number;
  totalFired: number;
  totalDismissed: number;
  avgEngagement: number;         // 0-1
}

// ─────────────────────────────────────────────────────────────────
// Notification Scheduler Functions
// ─────────────────────────────────────────────────────────────────

export function createKhatmaSchedule(
  reminderTime: string,
  topicId: number,
  dailyPages: number
): NotificationSchedule;

export function createMilestoneNotification(
  percentage: number,
  daysRemaining: number
): NotificationSchedule;

export function saveNotificationSchedules(schedules: NotificationSchedule[]): void;
export function loadNotificationSchedules(): NotificationSchedule[];

export function getNextFireTime(schedule: NotificationSchedule): number;

export async function registerSchedulesWithServiceWorker(
  schedules: NotificationSchedule[]
): Promise<void>;

export async function fireNotification(schedule: NotificationSchedule): Promise<void>;

// ─────────────────────────────────────────────────────────────────
// User Behavior Functions
// ─────────────────────────────────────────────────────────────────

export function recordReadingCompletion(dayDate: string): void;

export function loadUserBehavior(): UserBehavior;

export function saveUserBehavior(behavior: UserBehavior): void;

export function recordNotificationEngagement(
  scheduleId: string,
  action: 'shown' | 'clicked' | 'dismissed'
): void;

export function loadNotificationMetrics(): NotificationMetrics;

export function saveNotificationMetrics(metrics: NotificationMetrics): void;

export async function requestNotificationPermissionWithReason(): Promise<boolean>;

// ═══════════════════════════════════════════════════════════════════
// FROM: src/components/KhatmaVisualizations.tsx
// ═══════════════════════════════════════════════════════════════════

// Component Imports
export { DailyProgressChart };
export { TopicDistributionChart };
export { HeatmapCalendar };
export { CumulativeProgressChart };
export { ReadingFrequencyChart };
export { KhatmaStatsCards };

interface DailyProgressData {
  day: number;
  completed: number;
  remaining: number;
  date: string;
  topicId?: number;
}

interface TopicDistributionData {
  name: string;
  value: number;
  color: string;
}

interface HeatmapCell {
  date: string;
  day: number;
  week: number;
  completed: boolean;
  pages: number;
  topicId: number;
}

// Component Props Types
export interface DailyProgressChartProps {
  schedule: DaySchedule[];
  currentDay: number;
}

export interface TopicDistributionChartProps {
  schedule: DaySchedule[];
}

export interface HeatmapCalendarProps {
  schedule: DaySchedule[];
}

export interface CumulativeProgressChartProps {
  schedule: DaySchedule[];
  totalPages?: number;
}

export interface ReadingFrequencyChartProps {
  readingHours: number[];
}

export interface KhatmaStatsCardsProps {
  schedule: DaySchedule[];
  currentDay: number;
  totalDays: number;
}

// ═══════════════════════════════════════════════════════════════════
// FROM: src/lib/swMessageHandler.ts
// ═══════════════════════════════════════════════════════════════════

export interface ServiceWorkerMessage {
  type: 'REGISTER_SCHEDULES' | 'FIRE_NOTIFICATION' | 'CANCEL_NOTIFICATION' | 'GET_STATUS';
  schedules?: NotificationSchedule[];
  schedule?: NotificationSchedule;
  scheduleId?: string;
}

// ─────────────────────────────────────────────────────────────────
// Service Worker Communication Functions
// ─────────────────────────────────────────────────────────────────

export async function postToServiceWorker(message: ServiceWorkerMessage): Promise<void>;

export async function registerSchedulesWithSW(
  schedules: NotificationSchedule[]
): Promise<void>;

export async function fireNotificationSW(schedule: NotificationSchedule): Promise<void>;

export async function cancelNotificationSW(scheduleId: string): Promise<void>;

// ─────────────────────────────────────────────────────────────────
// Service Worker Event Handlers (Use in public/sw.js)
// ─────────────────────────────────────────────────────────────────

export async function handleNotificationMessage(message: ServiceWorkerMessage): Promise<void>;

export async function handleNotificationClick(event: NotificationEvent): Promise<void>;

export async function handleNotificationClose(event: NotificationEvent): Promise<void>;

export async function handlePeriodicSync(tag: string): Promise<void>;

export async function requestPeriodicSyncPermission(): Promise<boolean>;

// ═══════════════════════════════════════════════════════════════════
// FROM: src/components/KhatamaSmartDashboard.tsx
// ═══════════════════════════════════════════════════════════════════

export interface KhatamaSmartDashboardProps {
  plan: KhatmaPlan | null;
  currentDay: number;
  totalPages: number;
  completedPages: number;
  schedule: DaySchedule[];
  onGoToPage: (page: number) => void;
}

export { KhatamaSmartDashboard };

// ═══════════════════════════════════════════════════════════════════
// USAGE EXAMPLES
// ═══════════════════════════════════════════════════════════════════

/**
 * Example 1: Setup Daily Notification on Plan Creation
 */
async function exampleSetupNotifications() {
  // User creates khatma plan for 30 days
  const plan = createPlan(30, new Date(), '14:00');

  // Create notification schedule
  const schedule = createKhatmaSchedule('14:00', 2, 10); // 10 pages at 2 PM

  // Save and register
  saveNotificationSchedules([schedule]);
  await registerSchedulesWithServiceWorker([schedule]);

  // Request permission
  await requestNotificationPermissionWithReason();

  console.log('Daily notifications enabled for 14:00');
}

/**
 * Example 2: Record Reading and Update Behavior
 */
function exampleRecordReading() {
  // User marks today's reading as complete
  const today = new Date().toISOString().split('T')[0];
  recordReadingCompletion(today);

  // System now knows user reads at current hour
  const behavior = loadUserBehavior();
  console.log(`User typically reads at: ${behavior.readingFrequency}`);
  console.log(`Recommended reminder time: ${behavior.preferredNotificationTime}`);

  // Dashboard can show:
  // "Best Reading Time: 13:00 (based on your patterns)"
}

/**
 * Example 3: Display Full Dashboard with Visualizations
 */
function exampleRenderDashboard() {
  return (
    <>
      {/* Smart dashboard with recommendations */}
      <KhatamaSmartDashboard
        plan={plan}
        currentDay={currentDay}
        totalPages={604}
        completedPages={completedPages}
        schedule={schedule}
        onGoToPage={goToPage}
      />

      {/* Stats overview */}
      <KhatmaStatsCards
        schedule={schedule}
        currentDay={currentDay}
        totalDays={plan.totalDays}
      />

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DailyProgressChart schedule={schedule} currentDay={currentDay} />
        <TopicDistributionChart schedule={schedule} />
      </div>

      {/* Calendar and cumulative */}
      <HeatmapCalendar schedule={schedule} />
      <CumulativeProgressChart schedule={schedule} />

      {/* Reading patterns */}
      <ReadingFrequencyChart readingHours={userBehavior.readingFrequency} />
    </>
  );
}

/**
 * Example 4: Respond to Milestone Achievements
 */
function exampleMilestoneReached() {
  const progressPercent = 50; // User at 50%

  if (progressPercent === 50) {
    // Create milestone notification
    const milestone = createMilestoneNotification(50, 15); // 15 days remaining

    // Fire immediately
    fireNotification(milestone);

    // Record engagement
    recordNotificationEngagement(milestone.id, 'shown');

    console.log('50% milestone notification sent!');
  }
}

/**
 * Example 5: Send Message to Service Worker
 */
async function exampleSendToSW() {
  // Register schedules with SW
  const schedules = loadNotificationSchedules();
  await registerSchedulesWithSW(schedules);

  // Fire a notification immediately
  const schedule = schedules[0];
  await fireNotificationSW(schedule);

  // Cancel if needed
  await cancelNotificationSW(schedule.id);
}

/**
 * Example 6: Periodic Background Sync
 */
async function examplePeriodicSync() {
  // Request permission for periodic background sync
  const granted = await requestPeriodicSyncPermission();

  if (granted) {
    console.log('Periodic sync enabled for daily reminders');
    // Service Worker will now check every 24 hours
    // and fire notifications even if app is closed
  }
}

/**
 * Example 7: Track Engagement
 */
function exampleTrackEngagement() {
  const scheduleId = 'khatma-2026-04-18';

  // User sees notification
  recordNotificationEngagement(scheduleId, 'shown');

  // User clicks notification
  recordNotificationEngagement(scheduleId, 'clicked');

  // Check metrics
  const metrics = loadNotificationMetrics();
  console.log(`Engagement rate: ${(metrics.avgEngagement * 100).toFixed(1)}%`);
  console.log(`Total fired: ${metrics.totalFired}`);
  console.log(`Total dismissed: ${metrics.totalDismissed}`);
}

// ═══════════════════════════════════════════════════════════════════
// STORAGE KEYS (Internal Use)
// ═══════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  schedules: 'mushaf-notification-schedules',
  behavior: 'mushaf-user-behavior',
  metrics: 'mushaf-notification-metrics',
  plan: 'khatma-plan',
  history: 'khatma-history',
} as const;

// ═══════════════════════════════════════════════════════════════════
// MIGRATION GUIDE: From Old to New System
// ═══════════════════════════════════════════════════════════════════

/**
 * If upgrading from old KhatmaPlannerPanel:
 *
 * OLD:
 * - Simple one-time notification on app load
 * - No behavior tracking
 * - Basic progress display
 *
 * NEW:
 * - Time-based notifications in background
 * - User behavior learning
 * - Smart recommendations
 * - Rich visualizations
 * - Offline support
 *
 * MIGRATION:
 * 1. Install Recharts: npm install recharts
 * 2. Import new components
 * 3. Add notification setup on plan creation
 * 4. Replace progress display with visualizations
 * 5. Update Service Worker (public/sw.js)
 * 6. Test notifications locally
 * 7. Deploy and monitor engagement
 */

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS & DEFAULTS
// ═══════════════════════════════════════════════════════════════════

const TOPIC_COLORS = {
  1: '#7C8E3E',   // Olive
  2: '#5BA3CF',   // Sky
  3: '#C9A43E',   // Gold
  4: '#D4839B',   // Pink
  5: '#9B8EC4',   // Purple
  6: '#4DBDB5',   // Turquoise
  7: '#D4854A',   // Orange
} as const;

const TOPIC_NAMES = {
  1: { ar: 'عجائب الكون', en: 'Wonders of the Universe' },
  2: { ar: 'الجنة والمؤمنون', en: 'Paradise & Believers' },
  3: { ar: 'أحكام الإسلام', en: 'Rules of Islam' },
  4: { ar: 'قصص الأنبياء', en: 'Stories of Prophets' },
  5: { ar: 'القرآن العظيم', en: 'The Great Quran' },
  6: { ar: 'يوم القيامة', en: 'Day of Judgment' },
  7: { ar: 'التحذير والتوبة', en: 'Warning & Repentance' },
} as const;

// Default times (in 24h format)
const DEFAULT_REMINDER_TIMES = [
  '07:00', // Early morning
  '12:00', // Noon
  '14:00', // Afternoon (most common)
  '20:00', // Evening
] as const;

// ═══════════════════════════════════════════════════════════════════
// TypeScript Type Utilities
// ═══════════════════════════════════════════════════════════════════

type ScheduleType = NotificationSchedule['type'];
type EngagementAction = 'shown' | 'clicked' | 'dismissed';
type TopicId = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

interface NotificationStats {
  totalScheduled: number;
  totalFired: number;
  avgTimeTo Click: number; // milliseconds
  engagementRate: number;  // 0-1
}

// ═══════════════════════════════════════════════════════════════════
// READY TO USE! 🎉
// ═══════════════════════════════════════════════════════════════════

export {};
