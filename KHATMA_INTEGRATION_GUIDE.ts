/**
 * Khatma Planner Enhancement — Integration Quick Start
 *
 * This file shows exactly where and how to integrate the new components.
 */

// ─────────────────────────────────────────────────────────────
// STEP 1: Add Recharts to package.json
// ─────────────────────────────────────────────────────────────
// npm install recharts

// ─────────────────────────────────────────────────────────────
// STEP 2: Update Imports in KhatmaPlannerPanel.tsx
// ─────────────────────────────────────────────────────────────

// ADD THESE IMPORTS:
import {
  createKhatmaSchedule,
  createMilestoneNotification,
  registerSchedulesWithServiceWorker,
  recordReadingCompletion,
  loadUserBehavior,
  requestNotificationPermissionWithReason,
  saveNotificationSchedules,
  loadNotificationSchedules,
} from '@/lib/notificationScheduler';

import KhatamaSmartDashboard from '@/components/KhatamaSmartDashboard';
import {
  DailyProgressChart,
  TopicDistributionChart,
  HeatmapCalendar,
  CumulativeProgressChart,
  ReadingFrequencyChart,
  KhatmaStatsCards,
} from '@/components/KhatmaVisualizations';

// ─────────────────────────────────────────────────────────────
// STEP 3: Enhanced State in KhatmaPlannerPanel
// ─────────────────────────────────────────────────────────────

// Add to useState section:

// Notification management
const [notificationSchedules, setNotificationSchedules] = useState<NotificationSchedule[]>([]);
const [userBehavior, setUserBehavior] = useState<UserBehavior | null>(null);
const [notificationsEnabled, setNotificationsEnabled] = useState(false);
const [reminderTime, setReminderTime] = useState('14:00'); // Default 2 PM

// Add new screens
type Screen = 'home' | 'topic-pick' | 'quiz' | 'result' | 'badges' | 'profile' | 'dashboard';
const [screen, setScreen] = useState<Screen>('home');

// ─────────────────────────────────────────────────────────────
// STEP 4: Initialize Notifications on Plan Creation
// ─────────────────────────────────────────────────────────────

function handleCreatePlan(presetDays: number) {
  // ... existing plan creation logic ...

  if (notificationsEnabled) {
    // Create notification schedule
    const schedule = createKhatmaSchedule(reminderTime, 1, newPlan.pagesPerDay);
    const schedules = [schedule];

    // Save schedules
    setNotificationSchedules(schedules);
    saveNotificationSchedules(schedules);

    // Register with Service Worker
    registerSchedulesWithServiceWorker(schedules);

    // Request permission if needed
    requestNotificationPermissionWithReason();
  }

  // Load user behavior profile
  const behavior = loadUserBehavior();
  setUserBehavior(behavior);
}

// ─────────────────────────────────────────────────────────────
// STEP 5: Track Reading Completion
// ─────────────────────────────────────────────────────────────

// In markDayComplete:
const handleMarkComplete = useCallback((dayIndex: number) => {
  // ... existing logic ...

  if (schedule[dayIndex]) {
    // Record completion for behavior learning
    recordReadingCompletion(schedule[dayIndex].date);

    // Update user behavior
    const updatedBehavior = loadUserBehavior();
    setUserBehavior(updatedBehavior);
  }
}, [schedule]);

// ─────────────────────────────────────────────────────────────
// STEP 6: New Dashboard Screen
// ─────────────────────────────────────────────────────────────

// Add to render logic:
if (screen === 'dashboard' && plan) {
  return (
    <KhatamaSmartDashboard
      plan={plan}
      currentDay={currentDay}
      totalPages={TOTAL_PAGES}
      completedPages={completedPages}
      schedule={schedule}
      onGoToPage={goToPage}
    />
  );
}

// Add button to navigate to dashboard:
<button onClick={() => setScreen('dashboard')} className="...">
  📊 Dashboard
</button>

// ─────────────────────────────────────────────────────────────
// STEP 7: Visualization Area
// ─────────────────────────────────────────────────────────────

// In the quiz/progress screen, add:
<div className="space-y-6">
  {/* Statistics Cards */}
  <KhatmaStatsCards
    schedule={schedule}
    currentDay={currentDay}
    totalDays={plan.totalDays}
  />

  {/* Progress Charts */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <DailyProgressChart schedule={schedule} currentDay={currentDay} />
    <TopicDistributionChart schedule={schedule} />
  </div>

  {/* Calendar View */}
  <HeatmapCalendar schedule={schedule} />

  {/* Cumulative Progress */}
  <CumulativeProgressChart schedule={schedule} totalPages={TOTAL_PAGES} />

  {/* Reading Frequency (if user behavior available) */}
  {userBehavior && (
    <ReadingFrequencyChart readingHours={userBehavior.readingFrequency} />
  )}
</div>

// ─────────────────────────────────────────────────────────────
// STEP 8: Enhanced Setup Screen with Notifications
// ─────────────────────────────────────────────────────────────

// In the setup/create plan form:
<div className="space-y-4">
  {/* ... existing fields ... */}

  {/* Notification Settings */}
  <div className="border-t pt-4">
    <label className="flex items-center gap-3 mb-3">
      <input
        type="checkbox"
        checked={notificationsEnabled}
        onChange={(e) => {
          setNotificationsEnabled(e.target.checked);
          if (e.target.checked) {
            requestNotificationPermissionWithReason();
          }
        }}
        className="w-4 h-4"
      />
      <span className="font-semibold">
        {isAr ? '🔔 تفعيل التنبيهات' : '🔔 Enable Notifications'}
      </span>
    </label>

    {notificationsEnabled && (
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 space-y-3">
        <label className="block">
          <span className="text-sm font-medium">
            {isAr ? 'وقت التذكير' : 'Reminder Time'}
          </span>
          <input
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
          />
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {isAr
              ? 'ستتلقى تذكيراً يومياً في هذا الوقت'
              : 'You will receive a daily reminder at this time'}
          </p>
        </label>

        <div className="bg-blue-100 dark:bg-blue-900/30 rounded p-2 text-sm text-blue-800 dark:text-blue-300">
          {isAr
            ? '💡 سيتم ضبط الوقت بناءً على نشاطك على الجهاز'
            : '💡 The time will be adjusted based on your reading patterns'}
        </div>
      </div>
    )}
  </div>
</div>

// ─────────────────────────────────────────────────────────────
// STEP 9: Update Service Worker (public/sw.js)
// ─────────────────────────────────────────────────────────────

// Add at the top of public/sw.js:
/*
import { 
  handleNotificationMessage, 
  handleNotificationClick 
} from '@/lib/swMessageHandler';

// Listen for messages from client
self.addEventListener('message', (event) => {
  console.log('SW received message:', event.data);
  handleNotificationMessage(event.data);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked');
  event.preventDefault();
  handleNotificationClick(event);
});

// Handle notification closes
self.addEventListener('notificationclose', (event) => {
  const scheduleId = event.notification.data?.scheduleId;
  console.log('Notification closed:', scheduleId);
});

// Optional: Periodic background sync (every 24 hours)
// Requires "periodic_sync" permission in manifest.json
self.addEventListener('sync', (event) => {
  if (event.tag === 'khatma-daily-reminder') {
    event.waitUntil(
      (async () => {
        // Load plan from localStorage
        // Check if notification should fire
        // Fire if conditions met
        console.log('Periodic sync: checking daily reminder');
      })()
    );
  }
});
*/

// ─────────────────────────────────────────────────────────────
// STEP 10: Add to manifest.json (public/manifest.json)
// ─────────────────────────────────────────────────────────────

/*
{
  "name": "Al-Mushaf Al-Mufahras",
  ...existing fields...,
  "permissions": [
    "notifications"
  ],
  "periodic_sync": {
    "fireEvent": "background_sync",
    "minInterval": 86400000  // 24 hours in milliseconds
  },
  "shortcuts": [
    {
      "name": "Start Reading",
      "short_name": "Read",
      "description": "Start your daily Quran reading",
      "url": "/app?tab=khatma",
      "icons": [{ "src": "/logo.png", "sizes": "96x96" }]
    }
  ]
}
*/

// ─────────────────────────────────────────────────────────────
// STEP 11: Usage Examples
// ─────────────────────────────────────────────────────────────

// EXAMPLE 1: Create and register a notification schedule
async function setupDailyReminder() {
  const schedule = createKhatmaSchedule('14:00', 2, 10);
  saveNotificationSchedules([schedule]);
  await registerSchedulesWithServiceWorker([schedule]);

  // User will be notified every day at 14:00
  // Subject: "ورد اليوم 📖"
  // Body: "اقرأ 10 صفحات من الجنة والمؤمنون"
}

// EXAMPLE 2: Track reading behavior
function handleReadingComplete() {
  recordReadingCompletion(new Date().toISOString().split('T')[0]);

  // System now records that user read at current hour
  // Next login: optimal time adjusted automatically
}

// EXAMPLE 3: Show recommendations
function showSmartRecommendations() {
  const behavior = loadUserBehavior();

  console.log(`You typically read at: ${behavior.readingFrequency}`);
  console.log(`Recommended notification time: ${behavior.preferredNotificationTime}`);
  console.log(`Your completion rate: ${(behavior.completionRate * 100).toFixed(0)}%`);
}

// EXAMPLE 4: Display charts
function showVisualization() {
  return (
    <>
      {/* Daily progress for last 30 days */}
      <DailyProgressChart schedule={schedule} currentDay={15} />

      {/* How many pages from each topic */}
      <TopicDistributionChart schedule={schedule} />

      {/* Heatmap of completed days */}
      <HeatmapCalendar schedule={schedule} />

      {/* Cumulative pages over time */}
      <CumulativeProgressChart schedule={schedule} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// STEP 12: Testing Notifications Locally
// ─────────────────────────────────────────────────────────────

/*
1. Open Chrome DevTools (F12)
2. Go to Application → Service Workers
3. Check "Update on reload" and "Bypass for network"
4. Go to Application → Manifest
5. Check "periodic_sync" shows in manifest

To manually test notification firing:

const schedule = createKhatmaSchedule('14:00', 1, 10);
fireNotification(schedule);  // Fires immediately

To test background sync:

const registration = await navigator.serviceWorker.ready;
await registration.periodicSync.register('khatma-daily-reminder', {
  minInterval: 60 * 1000,  // 1 minute for testing
});

// Then mark offline in DevTools and wait for notification
*/

// ─────────────────────────────────────────────────────────────
// STEP 13: Troubleshooting
// ─────────────────────────────────────────────────────────────

// 1. Notifications not showing?
//    - Check: Notification.permission === 'granted'
//    - Request permission: requestNotificationPermissionWithReason()
//    - Check browser console for errors

// 2. Service Worker not receiving messages?
//    - Ensure Service Worker is registered
//    - Check DevTools → Application → Service Workers → active
//    - Verify navigator.serviceWorker.controller exists

// 3. Offline notifications not working?
//    - Enable periodic sync in manifest.json
//    - Set minInterval to small value for testing
//    - Check DevTools → Application → Periodic Sync

// 4. localStorage full?
//    - Implement data cleanup: old schedules > 90 days
//    - Archive completed plans to separate storage

// ─────────────────────────────────────────────────────────────
// STEP 14: Production Deployment
// ─────────────────────────────────────────────────────────────

// 1. Build and test locally:
// npm run build
// npm run start

// 2. Deploy to production
// 3. Enable HTTPS (required for Notifications API)
// 4. Test on real devices (iOS needs 13+, Android any version)
// 5. Monitor notification engagement in analytics
// 6. A/B test different notification times
// 7. Collect user feedback and iterate

// ─────────────────────────────────────────────────────────────
// Done! 🎉
// ─────────────────────────────────────────────────────────────

export {};
