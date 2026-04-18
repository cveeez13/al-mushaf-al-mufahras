/**
 * Service Worker Message Handler — Background notification management.
 *
 * This file contains the logic for handling messages from the client
 * regarding notification scheduling and firing in the background.
 *
 * Note: In a real implementation, this would be imported into the SW file.
 * For now, it's a utility module that clients can use to communicate with SW.
 */

import type { NotificationSchedule } from '@/lib/notificationScheduler';

// ───────────────────────────────────────────────────────────────
// Service Worker Message Types
// ───────────────────────────────────────────────────────────────

export interface ServiceWorkerMessage {
  type: 'REGISTER_SCHEDULES' | 'FIRE_NOTIFICATION' | 'CANCEL_NOTIFICATION' | 'GET_STATUS';
  schedules?: NotificationSchedule[];
  schedule?: NotificationSchedule;
  scheduleId?: string;
}

// ───────────────────────────────────────────────────────────────
// Client-Side: Send Messages to Service Worker
// ───────────────────────────────────────────────────────────────

/**
 * Send a message to the active Service Worker.
 */
export async function postToServiceWorker(message: ServiceWorkerMessage): Promise<void> {
  if (!navigator.serviceWorker?.controller) {
    console.warn('No active Service Worker to receive message');
    return;
  }

  try {
    navigator.serviceWorker.controller.postMessage(message);
  } catch (e) {
    console.error('Failed to post message to Service Worker:', e);
  }
}

/**
 * Register notification schedules with the Service Worker for background firing.
 */
export async function registerSchedulesWithSW(
  schedules: NotificationSchedule[]
): Promise<void> {
  await postToServiceWorker({
    type: 'REGISTER_SCHEDULES',
    schedules,
  });
}

/**
 * Fire a notification through the Service Worker immediately.
 */
export async function fireNotificationSW(schedule: NotificationSchedule): Promise<void> {
  await postToServiceWorker({
    type: 'FIRE_NOTIFICATION',
    schedule,
  });
}

/**
 * Cancel a scheduled notification.
 */
export async function cancelNotificationSW(scheduleId: string): Promise<void> {
  await postToServiceWorker({
    type: 'CANCEL_NOTIFICATION',
    scheduleId,
  });
}

// ───────────────────────────────────────────────────────────────
// Service Worker Handler (To be used in sw.js)
// ───────────────────────────────────────────────────────────────

/**
 * Service Worker: Message handler for notification scheduling.
 *
 * Add this to your Service Worker file (public/sw.js):
 *
 * ```javascript
 * import { handleNotificationMessage } from '@/lib/swMessageHandler';
 *
 * self.addEventListener('message', (event) => {
 *   handleNotificationMessage(event.data);
 * });
 * ```
 */
export async function handleNotificationMessage(message: ServiceWorkerMessage): Promise<void> {
  switch (message.type) {
    case 'REGISTER_SCHEDULES':
      if (message.schedules) {
        await registerSchedulesInSW(message.schedules);
      }
      break;

    case 'FIRE_NOTIFICATION':
      if (message.schedule) {
        await fireNotificationInSW(message.schedule);
      }
      break;

    case 'CANCEL_NOTIFICATION':
      if (message.scheduleId) {
        await cancelNotificationInSW(message.scheduleId);
      }
      break;

    case 'GET_STATUS':
      // Return current status (would need to implement persistence in SW)
      break;

    default:
      console.warn('Unknown message type:', (message as any).type);
  }
}

/**
 * Internal: Register schedules within Service Worker.
 * Sets up timers/alarms for each schedule.
 */
async function registerSchedulesInSW(schedules: NotificationSchedule[]): Promise<void> {
  // In a real Service Worker, this would set up background timers or
  // use the Periodic Background Sync API if available.

  for (const schedule of schedules) {
    if (!schedule.enabled) continue;

    // Calculate next fire time
    const [hours, minutes] = schedule.scheduledTime.split(':').map(Number);
    const now = new Date();
    const next = new Date();

    next.setHours(hours, minutes, 0, 0);

    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    const delayMs = next.getTime() - now.getTime();

    // Set up timeout for firing (simplified approach)
    // For production, use Periodic Background Sync API instead
    setTimeout(() => {
      fireNotificationInSW(schedule);
      // Recursively re-register for next day
      registerSchedulesInSW([schedule]);
    }, delayMs);
  }
}

/**
 * Internal: Fire a notification from within the Service Worker.
 */
async function fireNotificationInSW(schedule: NotificationSchedule): Promise<void> {
  // Note: 'self' is the Service Worker global scope
  // This function would be called within a Service Worker context

  try {
    // In a real SW context, use self.registration.showNotification()
    // For now, this is a placeholder that would be used in actual SW

    const notificationOptions: NotificationOptions = {
      body: schedule.body.en, // In production, choose language based on user pref
      tag: schedule.tag,
      icon: '/manifest.json',
      badge: '/logo.png',
      lang: 'ar',
      dir: 'rtl',
      requireInteraction: false,
      actions: [
        {
          action: 'open',
          title: 'Open',
          icon: '/logo.png',
        },
      ],
      data: {
        scheduleId: schedule.id,
        actionUrl: schedule.actionUrl,
        topicId: schedule.topicId,
      },
    };

    // In actual SW, would do:
    // await self.registration.showNotification(schedule.title.en, notificationOptions);

    console.log('Notification fired:', schedule.id);
  } catch (e) {
    console.error('Failed to fire notification in SW:', e);
  }
}

/**
 * Internal: Cancel a scheduled notification.
 */
async function cancelNotificationInSW(scheduleId: string): Promise<void> {
  // In a real SW, would need to track timers and clear them
  console.log('Notification cancelled:', scheduleId);
}

// ───────────────────────────────────────────────────────────────
// Service Worker Event Handler for Notification Clicks
// ───────────────────────────────────────────────────────────────

/**
 * Service Worker: Notification click handler.
 *
 * Add this to your Service Worker file:
 *
 * ```javascript
 * self.addEventListener('notificationclick', (event) => {
 *   handleNotificationClick(event);
 * });
 * ```
 */
export async function handleNotificationClick(
  event: NotificationEvent
): Promise<void> {
  event.notification.close();

  const actionUrl = (event.notification.data as any)?.actionUrl || '/app';

  // Find a window that matches the action URL, otherwise open a new one
  const clients = await (self as any).clients.matchAll({ type: 'window' });

  for (const client of clients) {
    if (client.url === actionUrl && 'focus' in client) {
      return (client as any).focus();
    }
  }

  if ((self as any).clients.openWindow) {
    await (self as any).clients.openWindow(actionUrl);
  }
}

/**
 * Service Worker: Notification close handler for metrics.
 *
 * Add this to your Service Worker file:
 *
 * ```javascript
 * self.addEventListener('notificationclose', (event) => {
 *   handleNotificationClose(event);
 * });
 * ```
 */
export async function handleNotificationClose(event: NotificationEvent): Promise<void> {
  const scheduleId = (event.notification.data as any)?.scheduleId;

  // Log to server or local storage for metrics
  if (scheduleId) {
    // Record dismissal for engagement tracking
    console.log('Notification dismissed:', scheduleId);
  }
}

// ───────────────────────────────────────────────────────────────
// Periodic Background Sync (Advanced Feature)
// ───────────────────────────────────────────────────────────────

/**
 * Register for periodic background sync (fires every 24 hours in background).
 * Requires manifest.json with "periodic_sync" permission.
 *
 * Usage in client:
 * ```typescript
 * if ('periodicSync' in ServiceWorkerRegistration.prototype) {
 *   const reg = await navigator.serviceWorker.ready;
 *   await reg.periodicSync.register('khatma-daily-reminder', { minInterval: 24 * 60 * 60 * 1000 });
 * }
 * ```
 */
export async function handlePeriodicSync(tag: string): Promise<void> {
  if (tag === 'khatma-daily-reminder') {
    // Load active khatma plan
    // Check if today's reading has a scheduled notification
    // Fire if notification time has passed
    console.log('Periodic sync fired for khatma daily reminder');
  }
}

/**
 * Request periodic background sync permission.
 */
export async function requestPeriodicSyncPermission(): Promise<boolean> {
  if (!navigator.serviceWorker || !('periodicSync' in ServiceWorkerRegistration.prototype)) {
    return false;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    if ('periodicSync' in reg) {
      await (reg.periodicSync as any).register('khatma-daily-reminder', {
        minInterval: 24 * 60 * 60 * 1000, // 24 hours
      });
      return true;
    }
  } catch (e) {
    console.warn('Periodic sync registration failed:', e);
    return false;
  }

  return false;
}
