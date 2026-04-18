# 📚 QuranReflect Social Features — API Reference & Cheat Sheet

Quick reference for all exported functions and how to use them.

---

## 🔄 Real-Time Sync (`reflectionsRealtime.ts`)

### Setup
```typescript
import { initializeRealtimeSync, cleanupRealtimeSync } from '@/lib/reflectionsRealtime';

// In app layout useEffect
useEffect(() => {
  initializeRealtimeSync();
  return () => cleanupRealtimeSync();
}, []);
```

### Subscribe to Updates
```typescript
import { onRealtimeUpdate } from '@/lib/reflectionsRealtime';

const unsubscribe = onRealtimeUpdate((update) => {
  if (update.type === 'like_added') {
    console.log(`Like added to ${update.reflectionId}`);
  }
});

// Later: unsubscribe();
```

### Optimistic Updates
```typescript
import { 
  optimisticLike, 
  optimisticReply, 
  optimisticCreate,
  queueUpdate 
} from '@/lib/reflectionsRealtime';

// Show update immediately, sync later
optimisticLike('reflection-123');
optimisticReply('reflection-123', 'Great insight!');
optimisticCreate('reflection-456', '2:255');

// Custom update
queueUpdate({
  type: 'reflection_updated',
  timestamp: Date.now(),
  reflectionId: 'abc123',
  data: { /* custom data */ },
});
```

### Sync Status
```typescript
import { 
  getSyncStatus, 
  getTimeSinceSync,
  syncPendingUpdates 
} from '@/lib/reflectionsRealtime';

const status = getSyncStatus();
// Returns: 'synced' | 'syncing' | 'offline' | 'pending'

const timeSince = getTimeSinceSync();
// Returns: 'just now', '5m ago', etc.

// Force sync
await syncPendingUpdates();
```

---

## 📤 Sharing (`reflectionsSharing.ts`)

### Deep Linking
```typescript
import { 
  generateDeepLink, 
  generateShareUrl,
  parseDeepLink 
} from '@/lib/reflectionsSharing';

const deepLink = generateDeepLink(reflection);
// Returns: '/app/reflections?verse=2:255&reflection=abc123'

const fullUrl = generateShareUrl(reflection);
// Returns: 'https://example.com/app/reflections?...'

// Parse URL
const parsed = parseDeepLink(currentUrl);
// Returns: { verseKey, surah, ayah, reflectionId }
```

### Social Sharing
```typescript
import { 
  shareToTwitter,
  shareToWhatsApp,
  shareToTelegram,
  shareToFacebook,
  nativeShare,
  copyLinkToClipboard,
  isNativeShareAvailable 
} from '@/lib/reflectionsSharing';

// Pre-filled social posts
shareToTwitter(reflection);   // Opens Twitter share
shareToWhatsApp(reflection);  // Opens WhatsApp
shareToTelegram(reflection);  // Opens Telegram
shareToFacebook(reflection);  // Opens Facebook

// Modern approach (if available)
if (isNativeShareAvailable()) {
  await nativeShare(reflection);
} else {
  await copyLinkToClipboard(reflection);
}
```

### Share Text Generation
```typescript
import { 
  generateShareText,
  generateMarkdown,
  generateEmbedHTML,
  generateCardData 
} from '@/lib/reflectionsSharing';

const text = generateShareText(reflection, 'en');
// "Quranic Reflection on 2:255..."

const markdown = generateMarkdown(reflection);
// "## Reflection on 2:255\n> \"...\""

const html = generateEmbedHTML(reflection);
// HTML snippet for embedding

const cardData = generateCardData(reflection);
// { reflectionId, verseKey, verseName, ... }
```

### QR Codes
```typescript
import { generateQRCodeUrl } from '@/lib/reflectionsSharing';

const qrUrl = generateQRCodeUrl(reflection, 400);
// URL to qr-server.com image

// Display in <img>
<img src={qrUrl} alt="QR Code" />
```

### Share Metrics
```typescript
import { recordShare, getShareMetrics } from '@/lib/reflectionsSharing';

// Record a share
recordShare(reflectionId, 'twitter');
recordShare(reflectionId, 'whatsapp');
recordShare(reflectionId, 'copy');

// Get analytics
const metrics = getShareMetrics(reflectionId);
// {
//   reflectionId, twitterShares, whatsappShares,
//   telegramShares, facebookShares, copyLinks,
//   totalShares, lastSharedAt
// }
```

---

## 👥 Community Features (`reflectionsCommunity.ts`)

### User Profiles
```typescript
import { 
  getUserProfile, 
  updateUserStats 
} from '@/lib/reflectionsCommunity';

// Get or create profile
const profile = getUserProfile('user-123', 'Ahmed');
// { authorId, authorName, reflectionCount, totalLikes, 
//   totalReplies, badges, reputation, joinedAt, ... }

// Update stats
updateUserStats('user-123', {
  reflectionCount: 15,
  totalLikes: 50,
  totalReplies: 8,
});
```

### Badges
```typescript
import { 
  getUserBadges,
  hasBadge,
  awardBadge 
} from '@/lib/reflectionsCommunity';

// Get all badges
const badges = getUserBadges('user-123');
// [{ type: 'first_reflection', displayName: '🌱...', ... }]

// Check badge
if (hasBadge('user-123', 'active_contributor')) {
  console.log('User is active contributor');
}

// Award badge
const earned = awardBadge('user-123', 'community_voice');
```

### Leaderboards
```typescript
import { 
  getReputationLeaderboard,
  getLikesLeaderboard,
  getReflectionsLeaderboard 
} from '@/lib/reflectionsCommunity';

// Reputation-based ranking
const leaders = getReputationLeaderboard(10);
// [{ rank, authorId, authorName, score, badges }]

// Likes-based ranking
const topLiked = getLikesLeaderboard(10);

// Most reflections
const prolific = getReflectionsLeaderboard(10);
```

### Trending Reflections
```typescript
import { getTrendingReflections } from '@/lib/reflectionsCommunity';

const trending = getTrendingReflections(reflections, 20);
// [{ reflectionId, verseKey, text, author, likes, 
//    replies, shares, trendScore, momentum }]

trending.forEach(t => {
  console.log(`${t.verseKey}: Score=${t.trendScore}, ${t.momentum}`);
});
```

### Community Statistics
```typescript
import { 
  getCommunityStats,
  getTopInsights 
} from '@/lib/reflectionsCommunity';

// Overall stats
const stats = getCommunityStats(reflections);
// { totalReflections, totalUsers, totalLikes, totalReplies,
//   avgReflectionLength, mostActiveVerse, mostDiscussedTopic, ... }

// Top topics
const insights = getTopInsights(reflections, 5);
// [{ topic: 'blue', count: 42, percentage: 15 }, ...]
```

---

## 🔔 Notifications (`reflectionsNotifications.ts`)

### Create Notifications
```typescript
import { 
  notifyLike,
  notifyReply,
  notifyBadge,
  notifyTrending 
} from '@/lib/reflectionsNotifications';

// Someone liked your reflection
notifyLike(
  yourUserId,
  likerName,
  likerId,
  reflectionId,
  verseKey,
);

// Someone replied
notifyReply(
  yourUserId,
  replierName,
  replierId,
  reflectionId,
  verseKey,
  'Reply preview text...',
);

// Badge earned
notifyBadge(userId, '🌱 First Reflection');

// Reflection trending
notifyTrending(userId, authorName, reflectionId, verseKey);
```

### Get Notifications
```typescript
import { 
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearUserNotifications 
} from '@/lib/reflectionsNotifications';

// Get all notifications
const notifs = getUserNotifications(userId, 50);

// Count unread
const unread = getUnreadCount(userId);

// Mark as read
markAsRead(notificationId);
markAllAsRead(userId);

// Delete
deleteNotification(notificationId);
clearUserNotifications(userId);
```

### Preferences
```typescript
import { 
  getPreferences,
  updatePreferences,
  shouldNotify,
  muteUser,
  unmuteUser,
  isUserMuted 
} from '@/lib/reflectionsNotifications';

// Get preferences
const prefs = getPreferences(userId);
// { emailOnLike, emailOnReply, emailOnBadge, 
//   pushEnabled, notificationFrequency, mutedUsers }

// Update
updatePreferences(userId, {
  emailOnLike: false,
  notificationFrequency: 'daily',
});

// Check if should notify
if (shouldNotify(userId, 'like')) {
  sendNotification(...);
}

// Mute user
muteUser(userId, userToMuteId);
unmuteUser(userId, userToUnmuteId);
isUserMuted(userId, checkId) // returns boolean
```

### Browser Notifications
```typescript
import { 
  requestNotificationPermission,
  sendBrowserNotification,
  areBrowserNotificationsAvailable 
} from '@/lib/reflectionsNotifications';

// Check if available
if (areBrowserNotificationsAvailable()) {
  // Request permission
  const granted = await requestNotificationPermission();
  
  if (granted) {
    sendBrowserNotification(notification);
  }
}
```

### Listen to New Notifications
```typescript
import { onNotification } from '@/lib/reflectionsNotifications';

const unsubscribe = onNotification((notification) => {
  console.log('New notification:', notification.message);
  // Update UI
});
```

---

## 🎨 Social Hub Component (`ReflectionsSocialHub.tsx`)

### Basic Usage
```typescript
import ReflectionsSocialHub from '@/components/ReflectionsSocialHub';

<ReflectionsSocialHub
  reflections={allReflections}
  onViewReflection={(reflectionId, verseKey) => {
    // Handle navigation
  }}
/>
```

### Props
```typescript
interface ReflectionsSocialHubProps {
  reflections: Reflection[];
  onViewReflection?: (reflectionId: string, verseKey: string) => void;
}
```

### Features (Built-in)
- 4 tabs: Trending, Leaders, Stats, Notifications
- Real-time sync status indicator
- Share modal with Twitter/WhatsApp/Copy
- QR code modal
- Unread notification badge
- Full Arabic/English support

---

## 📋 Type Definitions

### reflectionsRealtime.ts
```typescript
interface RealtimeUpdate {
  type: 'reflection_created' | 'reflection_updated' | 
        'reflection_deleted' | 'like_added' | 'reply_added';
  timestamp: number;
  reflectionId: string;
  data: unknown;
}

interface SyncState {
  lastSync: number;
  pendingUpdates: RealtimeUpdate[];
  isOnline: boolean;
  syncInProgress: boolean;
}
```

### reflectionsSharing.ts
```typescript
interface ShareLink {
  url: string;
  shortUrl: string;
  deepLink: string;
  title: string;
  text: string;
}

interface ShareableCard {
  reflectionId: string;
  verseKey: string;
  verseName: string;
  reflectionText: string;
  authorName: string;
  topicColor: string;
  likes: number;
}

interface ShareMetrics {
  reflectionId: string;
  twitterShares: number;
  whatsappShares: number;
  telegramShares: number;
  facebookShares: number;
  copyLinks: number;
  totalShares: number;
  lastSharedAt?: string;
}
```

### reflectionsCommunity.ts
```typescript
type BadgeType = 'first_reflection' | 'helpful_100' | 
  'active_contributor' | 'community_voice' | 
  'thoughtful_commenter' | 'consensus_builder' | 
  'scholar_minded' | 'engagement_streak' | 
  'wisdom_seeker' | 'founder';

interface UserProfile {
  authorId: string;
  authorName: string;
  reflectionCount: number;
  totalLikes: number;
  totalReplies: number;
  badges: UserBadge[];
  reputation: number;
  joinedAt: string;
  lastActive: string;
}

interface TrendingReflection {
  reflectionId: string;
  verseKey: string;
  text: string;
  author: string;
  likes: number;
  replies: number;
  shares: number;
  trendScore: number;
  momentum: 'rising' | 'steady' | 'declining';
}

interface LeaderboardEntry {
  rank: number;
  authorId: string;
  authorName: string;
  score: number;
  metric: 'reputation' | 'likes' | 'reflections' | 'engagement';
  badges: number;
}

interface CommunityStats {
  totalReflections: number;
  totalUsers: number;
  totalLikes: number;
  totalReplies: number;
  avgReflectionLength: number;
  mostActiveVerse: string;
  mostDiscussedTopic: string;
  dailyActiveUsers: number;
}
```

### reflectionsNotifications.ts
```typescript
type NotificationType = 'like' | 'reply' | 'badge' | 
  'trending' | 'milestone';

interface ReflectionNotification {
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

interface NotificationPreferences {
  userId: string;
  emailOnLike: boolean;
  emailOnReply: boolean;
  emailOnBadge: boolean;
  emailOnTrending: boolean;
  pushEnabled: boolean;
  notificationFrequency: 'instant' | 'daily' | 'weekly' | 'never';
  mutedUsers: string[];
}
```

---

## 🔑 Common Patterns

### Update on reflection change
```typescript
useEffect(() => {
  updateCurrentUserStats();
}, [reflections.length]);
```

### Listen to realtime updates
```typescript
useEffect(() => {
  const unsub = onRealtimeUpdate(() => {
    // Refresh data
  });
  return unsub;
}, []);
```

### Share with tracking
```typescript
const handleShare = async (reflection, platform) => {
  recordShare(reflection.id, platform);
  
  switch (platform) {
    case 'twitter': shareToTwitter(reflection); break;
    case 'whatsapp': shareToWhatsApp(reflection); break;
    case 'copy': await copyLinkToClipboard(reflection); break;
  }
};
```

### Check user achievements
```typescript
const profile = getUserProfile(userId);

if (profile.badges.some(b => b.type === 'active_contributor')) {
  // Show special badge
}

if (profile.reputation > 500) {
  // Show "trusted contributor" status
}
```

---

## 🚨 Common Mistakes to Avoid

❌ **Don't forget to initialize realtime sync**
```typescript
// ❌ Forgetting this
// initializeRealtimeSync();

// ✅ Do this in app layout
useEffect(() => {
  initializeRealtimeSync();
  return () => cleanupRealtimeSync();
}, []);
```

❌ **Don't hardcode author checks**
```typescript
// ❌ Bad
if (userId === 'user-123') { }

// ✅ Good
const author = getAuthor();
if (reflection.authorId !== author.id) { }
```

❌ **Don't ignore notification preferences**
```typescript
// ❌ Bad - send notification regardless
notifyLike(userId, likerName, likerId, reflectionId, verseKey);

// ✅ Good - respect preferences
if (shouldNotify(userId, 'like')) {
  notifyLike(userId, likerName, likerId, reflectionId, verseKey);
}
```

❌ **Don't forget error handling**
```typescript
// ❌ Bad
const profile = getUserProfile(userId);
profile.reputation += 10;

// ✅ Good
try {
  const profile = getUserProfile(userId);
  updateUserStats(userId, {
    /* ... */
  });
} catch (error) {
  console.error('Failed:', error);
}
```

---

**Ready to integrate? Start with QURANREFLECT_INTEGRATION_GUIDE.md! 🚀**
