/**
 * QuranReflect Notification System
 *
 * Features:
 * - In-app notifications for likes and replies
 * - Notification center/history
 * - Email/push notification hooks
 * - Notification preferences
 */

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

export type NotificationType = 'like' | 'reply' | 'badge' | 'trending' | 'milestone';

export interface ReflectionNotification {
  id: string;
  type: NotificationType;
  recipientId: string;
  senderId: string;
  senderName: string;
  reflectionId: string;
  verseKey: string;
  message: string;
  createdAt: string;
  read: boolean;
  actionUrl?: string;
}

export interface NotificationPreferences {
  userId: string;
  emailOnLike: boolean;
  emailOnReply: boolean;
  emailOnBadge: boolean;
  emailOnTrending: boolean;
  pushEnabled: boolean;
  notificationFrequency: 'instant' | 'daily' | 'weekly' | 'never';
  mutedUsers: string[];
}

// ───────────────────────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────────────────────

const NOTIFICATIONS_KEY = 'mushaf-reflections-notifications';
const PREFERENCES_KEY = 'mushaf-notification-preferences';

// ───────────────────────────────────────────────────────────────
// Notification Creation
// ───────────────────────────────────────────────────────────────

/**
 * Create a new notification
 */
export function createNotification(
  type: NotificationType,
  recipientId: string,
  senderId: string,
  senderName: string,
  reflectionId: string,
  verseKey: string,
  message: string,
  actionUrl?: string,
): ReflectionNotification {
  const notification: ReflectionNotification = {
    id: generateNotificationId(),
    type,
    recipientId,
    senderId,
    senderName,
    reflectionId,
    verseKey,
    message,
    createdAt: new Date().toISOString(),
    read: false,
    actionUrl,
  };

  saveNotification(notification);
  triggerNotificationEvent(notification);

  return notification;
}

/**
 * Create like notification
 */
export function notifyLike(
  reflectionAuthorId: string,
  likerName: string,
  likerId: string,
  reflectionId: string,
  verseKey: string,
): void {
  const message = `${likerName} liked your reflection`;
  const actionUrl = `/app/reflections?reflection=${reflectionId}&verse=${verseKey}`;

  createNotification(
    'like',
    reflectionAuthorId,
    likerId,
    likerName,
    reflectionId,
    verseKey,
    message,
    actionUrl,
  );
}

/**
 * Create reply notification
 */
export function notifyReply(
  reflectionAuthorId: string,
  replierName: string,
  replierId: string,
  reflectionId: string,
  verseKey: string,
  replyPreview: string,
): void {
  const preview = replyPreview.slice(0, 50) + (replyPreview.length > 50 ? '...' : '');
  const message = `${replierName} replied: "${preview}"`;
  const actionUrl = `/app/reflections?reflection=${reflectionId}&verse=${verseKey}`;

  createNotification(
    'reply',
    reflectionAuthorId,
    replierId,
    replierName,
    reflectionId,
    verseKey,
    message,
    actionUrl,
  );
}

/**
 * Create badge notification
 */
export function notifyBadge(
  userId: string,
  badgeName: string,
): void {
  const message = `You earned the "${badgeName}" badge! 🎉`;

  createNotification(
    'badge',
    userId,
    'system',
    'System',
    '',
    '',
    message,
  );
}

/**
 * Create trending notification
 */
export function notifyTrending(
  userId: string,
  reflectionAuthorName: string,
  reflectionId: string,
  verseKey: string,
): void {
  const message = `"${reflectionAuthorName}"'s reflection is trending!`;
  const actionUrl = `/app/reflections?reflection=${reflectionId}&verse=${verseKey}`;

  createNotification(
    'trending',
    userId,
    'system',
    'System',
    reflectionId,
    verseKey,
    message,
    actionUrl,
  );
}

// ───────────────────────────────────────────────────────────────
// Notification Storage & Retrieval
// ───────────────────────────────────────────────────────────────

/**
 * Get all notifications for user
 */
export function getUserNotifications(
  userId: string,
  limit: number = 50,
): ReflectionNotification[] {
  const notifications = loadNotifications();

  return notifications
    .filter(n => n.recipientId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

/**
 * Get unread notification count
 */
export function getUnreadCount(userId: string): number {
  const notifications = loadNotifications();
  return notifications.filter(n => n.recipientId === userId && !n.read).length;
}

/**
 * Mark notification as read
 */
export function markAsRead(notificationId: string): void {
  const notifications = loadNotifications();
  const notification = notifications.find(n => n.id === notificationId);

  if (notification) {
    notification.read = true;
    saveAllNotifications(notifications);
  }
}

/**
 * Mark all notifications as read
 */
export function markAllAsRead(userId: string): void {
  const notifications = loadNotifications();

  notifications.forEach(n => {
    if (n.recipientId === userId) {
      n.read = true;
    }
  });

  saveAllNotifications(notifications);
}

/**
 * Delete notification
 */
export function deleteNotification(notificationId: string): void {
  const notifications = loadNotifications();
  const filtered = notifications.filter(n => n.id !== notificationId);
  saveAllNotifications(filtered);
}

/**
 * Clear all notifications for user
 */
export function clearUserNotifications(userId: string): void {
  const notifications = loadNotifications();
  const filtered = notifications.filter(n => n.recipientId !== userId);
  saveAllNotifications(filtered);
}

// ───────────────────────────────────────────────────────────────
// Notification Preferences
// ───────────────────────────────────────────────────────────────

/**
 * Get notification preferences for user
 */
export function getPreferences(userId: string): NotificationPreferences {
  if (typeof window === 'undefined') {
    return getDefaultPreferences(userId);
  }

  try {
    const key = `${PREFERENCES_KEY}:${userId}`;
    const raw = localStorage.getItem(key);

    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // corrupted
  }

  return getDefaultPreferences(userId);
}

/**
 * Update notification preferences
 */
export function updatePreferences(
  userId: string,
  updates: Partial<NotificationPreferences>,
): NotificationPreferences {
  const prefs = getPreferences(userId);
  const updated = { ...prefs, ...updates };

  if (typeof window !== 'undefined') {
    try {
      const key = `${PREFERENCES_KEY}:${userId}`;
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }

  return updated;
}

/**
 * Check if notification should be sent based on preferences
 */
export function shouldNotify(
  userId: string,
  type: NotificationType,
): boolean {
  const prefs = getPreferences(userId);

  if (prefs.notificationFrequency === 'never') return false;

  switch (type) {
    case 'like':
      return prefs.emailOnLike;
    case 'reply':
      return prefs.emailOnReply;
    case 'badge':
      return prefs.emailOnBadge;
    case 'trending':
      return prefs.emailOnTrending;
    case 'milestone':
      return true; // Always notify on milestones
    default:
      return false;
  }
}

/**
 * Mute notifications from a user
 */
export function muteUser(userId: string, mutedUserId: string): void {
  const prefs = getPreferences(userId);

  if (!prefs.mutedUsers.includes(mutedUserId)) {
    prefs.mutedUsers.push(mutedUserId);
    updatePreferences(userId, prefs);
  }
}

/**
 * Unmute notifications from a user
 */
export function unmuteUser(userId: string, mutedUserId: string): void {
  const prefs = getPreferences(userId);
  prefs.mutedUsers = prefs.mutedUsers.filter(id => id !== mutedUserId);
  updatePreferences(userId, prefs);
}

/**
 * Check if user is muted
 */
export function isUserMuted(userId: string, senderId: string): boolean {
  const prefs = getPreferences(userId);
  return prefs.mutedUsers.includes(senderId);
}

// ───────────────────────────────────────────────────────────────
// Helper Functions
// ───────────────────────────────────────────────────────────────

function generateNotificationId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getDefaultPreferences(userId: string): NotificationPreferences {
  return {
    userId,
    emailOnLike: true,
    emailOnReply: true,
    emailOnBadge: true,
    emailOnTrending: false,
    pushEnabled: true,
    notificationFrequency: 'instant',
    mutedUsers: [],
  };
}

function loadNotifications(): ReflectionNotification[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotification(notification: ReflectionNotification): void {
  const notifications = loadNotifications();
  notifications.push(notification);

  // Keep only last 500 notifications
  if (notifications.length > 500) {
    notifications.splice(0, notifications.length - 500);
  }

  saveAllNotifications(notifications);
}

function saveAllNotifications(notifications: ReflectionNotification[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  } catch (error) {
    console.error('Failed to save notifications:', error);
  }
}

// ───────────────────────────────────────────────────────────────
// Events & Listeners
// ───────────────────────────────────────────────────────────────

const notificationListeners = new Set<(notification: ReflectionNotification) => void>();

/**
 * Listen to new notifications
 */
export function onNotification(callback: (notification: ReflectionNotification) => void): () => void {
  notificationListeners.add(callback);
  return () => notificationListeners.delete(callback);
}

function triggerNotificationEvent(notification: ReflectionNotification): void {
  notificationListeners.forEach(callback => {
    try {
      callback(notification);
    } catch (error) {
      console.error('Notification listener error:', error);
    }
  });
}

// ───────────────────────────────────────────────────────────────
// Browser Notifications
// ───────────────────────────────────────────────────────────────

/**
 * Request permission for browser notifications
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;

  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Send browser notification
 */
export function sendBrowserNotification(
  notification: ReflectionNotification,
): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return;
  }

  try {
    new Notification(`QuranReflect: ${notification.senderName}`, {
      body: notification.message,
      icon: '/mushaf-icon.png',
      tag: notification.id,
      data: {
        url: notification.actionUrl,
      },
    });
  } catch (error) {
    console.error('Failed to send browser notification:', error);
  }
}

/**
 * Check if browser notifications are available
 */
export function areBrowserNotificationsAvailable(): boolean {
  return typeof Notification !== 'undefined';
}
