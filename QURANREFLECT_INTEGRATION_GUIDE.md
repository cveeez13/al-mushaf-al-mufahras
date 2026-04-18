# 🚀 QuranReflect Social Features — Quick Integration Guide

## ⏱️ Time Estimate: 2-3 hours for full integration

---

## Phase 1: Setup (15 minutes)

### ✅ Step 1: Verify all files created

```bash
# Check all new files exist:
src/lib/reflectionsRealtime.ts          ✓
src/lib/reflectionsSharing.ts           ✓
src/lib/reflectionsCommunity.ts         ✓
src/lib/reflectionsNotifications.ts     ✓
src/components/ReflectionsSocialHub.tsx ✓
QURANREFLECT_SOCIAL_FEATURES.md         ✓
```

### ✅ Step 2: Verify TypeScript compilation

```bash
npm run build
# Should compile without errors
```

---

## Phase 2: Initialize Realtime Sync (30 minutes)

### ✅ Step 1: Find your app layout file

Usually: `src/app/layout.tsx` or `src/pages/_app.tsx`

### ✅ Step 2: Add initialization code

```typescript
// src/app/layout.tsx

'use client';

import { useEffect } from 'react';
import { initializeRealtimeSync, cleanupRealtimeSync } from '@/lib/reflectionsRealtime';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize realtime sync system
    initializeRealtimeSync();

    return () => {
      // Cleanup on unmount
      cleanupRealtimeSync();
    };
  }, []);

  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

**What this does**:
- Starts listening for cross-tab storage events
- Monitors online/offline status
- Begins 5-second periodic sync
- Ready to broadcast realtime updates

---

## Phase 3: Update Reflections Core (45 minutes)

### ✅ Step 1: Find your reflections.ts file

`src/lib/reflections.ts`

### ✅ Step 2: Add notification imports

Add at the top of the file:

```typescript
// ⬇️ ADD THIS IMPORT

import {
  notifyLike,
  notifyReply,
  notifyBadge,
  getUserNotifications,
  type ReflectionNotification,
} from '@/lib/reflectionsNotifications';

import {
  updateUserStats,
  awardBadge,
  getUserProfile,
} from '@/lib/reflectionsCommunity';

// ⬇️ Rest of your imports...
```

### ✅ Step 3: Update toggleLike function

Find the `toggleLike` function and update it:

**BEFORE:**
```typescript
export function toggleLike(reflectionId: string): boolean {
  const mod = loadRaw();
  const r = mod.find(x => x.id === reflectionId);
  if (!r) return false;
  
  const author = getAuthor();
  const liked = r.likes.includes(author.id);
  
  if (liked) {
    r.likes = r.likes.filter(id => id !== author.id);
  } else {
    r.likes.push(author.id);
  }
  
  saveRaw(mod);
  return !liked;
}
```

**AFTER:**
```typescript
export function toggleLike(reflectionId: string): boolean {
  const mod = loadRaw();
  const r = mod.find(x => x.id === reflectionId);
  if (!r) return false;
  
  const author = getAuthor();
  const liked = r.likes.includes(author.id);
  
  if (liked) {
    r.likes = r.likes.filter(id => id !== author.id);
  } else {
    r.likes.push(author.id);
    
    // ⬇️ ADD THIS: Notify reflection author
    if (r.authorId !== author.id) {
      try {
        notifyLike(
          r.authorId,
          author.name || 'Anonymous',
          author.id,
          reflectionId,
          r.verseKey,
        );
      } catch (error) {
        console.error('Failed to notify like:', error);
      }
    }
  }
  
  saveRaw(mod);
  return !liked;
}
```

### ✅ Step 4: Update addReply function

Find the `addReply` function and add notifications:

**FIND THIS SECTION:**
```typescript
export function addReply(reflectionId: string, text: string): Reply | null {
  const mod = moderateContent(text);
  if (!mod.passed) return null;
  
  const r = loadRaw().find(x => x.id === reflectionId);
  if (!r) return null;

  const author = getAuthor();
  const reply: Reply = {
    id: generateId(),
    authorName: author.name || (typeof document !== 'undefined' && document.documentElement.lang === 'ar' ? 'مجهول' : 'Anonymous'),
    authorId: author.id,
    text: text.replace(/<[^>]*>/g, '').trim(),
    createdAt: new Date().toISOString(),
    likes: [],
  };

  r.replies.push(reply);
  saveRaw(loadRaw());

  return reply;
}
```

**UPDATE TO:**
```typescript
export function addReply(reflectionId: string, text: string): Reply | null {
  const mod = moderateContent(text);
  if (!mod.passed) return null;
  
  const r = loadRaw().find(x => x.id === reflectionId);
  if (!r) return null;

  const author = getAuthor();
  const reply: Reply = {
    id: generateId(),
    authorName: author.name || (typeof document !== 'undefined' && document.documentElement.lang === 'ar' ? 'مجهول' : 'Anonymous'),
    authorId: author.id,
    text: text.replace(/<[^>]*>/g, '').trim(),
    createdAt: new Date().toISOString(),
    likes: [],
  };

  r.replies.push(reply);
  saveRaw(loadRaw());

  // ⬇️ ADD THIS: Notify reflection author about reply
  if (r.authorId !== author.id) {
    try {
      notifyReply(
        r.authorId,
        author.name || 'Anonymous',
        author.id,
        reflectionId,
        r.verseKey,
        reply.text,
      );
    } catch (error) {
      console.error('Failed to notify reply:', error);
    }
  }

  return reply;
}
```

### ✅ Step 5: Add stats update function at end of file

Add this new function:

```typescript
// ⬇️ ADD THIS NEW FUNCTION

/**
 * Update user stats (call when reflections change)
 */
export function updateCurrentUserStats(): void {
  try {
    const author = getAuthor();
    const allReflections = loadAllReflections();
    
    // Get this user's reflections
    const userReflections = allReflections.filter(r => r.authorId === author.id);
    
    // Calculate totals
    const totalLikes = userReflections.reduce((sum, r) => sum + r.likes.length, 0);
    const totalReplies = userReflections.reduce((sum, r) => sum + r.replies.length, 0);
    
    // Update profile
    updateUserStats(author.id, {
      reflectionCount: userReflections.length,
      totalLikes,
      totalReplies,
    });
    
    // Check for badges
    const profile = getUserProfile(author.id);
    
    // Award badges based on milestones
    if (profile.reflectionCount === 1 && !awardBadge(author.id, 'first_reflection')) {
      // Already has badge
    }
    if (profile.reflectionCount === 10) {
      awardBadge(author.id, 'active_contributor');
    }
    if (profile.totalLikes >= 50) {
      awardBadge(author.id, 'community_voice');
    }
    if (profile.totalReplies >= 20) {
      awardBadge(author.id, 'thoughtful_commenter');
    }
  } catch (error) {
    console.error('Failed to update user stats:', error);
  }
}
```

### ✅ Step 6: Verify exports

Make sure these are exported from reflections.ts:

```typescript
export function createReflection(input: ReflectionInput): Reflection | null
export function updateCurrentUserStats(): void  // NEW
// ... rest of existing exports
```

---

## Phase 4: Update ReflectionsPanel (45 minutes)

### ✅ Step 1: Find ReflectionsPanel.tsx

`src/components/ReflectionsPanel.tsx`

### ✅ Step 2: Add imports

Add at top:

```typescript
// ⬇️ ADD THESE IMPORTS

import { updateCurrentUserStats } from '@/lib/reflections';
import {
  onRealtimeUpdate,
  getSyncStatus,
  getTimeSinceSync,
} from '@/lib/reflectionsRealtime';

// ... rest of existing imports
```

### ✅ Step 3: Add effect to update stats

In the `ReflectionsPanel` component, add this effect:

```typescript
export default function ReflectionsPanel({ onGoToPage, verseContext }: ReflectionsPanelProps) {
  // ... existing state ...

  // ⬇️ ADD THIS EFFECT (after other useEffect hooks)
  
  // Update user stats whenever reflections change
  useEffect(() => {
    updateCurrentUserStats();
  }, [reflections.length]); // Update when reflection count changes

  // Listen to realtime updates
  useEffect(() => {
    const unsubscribe = onRealtimeUpdate(() => {
      // Refresh when other tabs make changes
      refresh();
    });

    return unsubscribe;
  }, [refresh]);

  // ... rest of component
}
```

---

## Phase 5: Add Social Hub Tab (45 minutes)

### ✅ Step 1: Add state and import

In `ReflectionsPanel` component, add:

```typescript
// ⬇️ ADD THIS IMPORT

import ReflectionsSocialHub from '@/components/ReflectionsSocialHub';

// ⬇️ IN COMPONENT - Add state

const [showSocialHub, setShowSocialHub] = useState(false);
```

### ✅ Step 2: Add tab button

Find where the panel shows different screens (Setup, Dashboard, etc.) and add:

```typescript
{/* ⬇️ ADD THIS BUTTON before the existing screens */}

<button
  onClick={() => setShowSocialHub(!showSocialHub)}
  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
>
  👥 Community
  {getUnreadCount && getUnreadCount(getAuthor().id) > 0 && (
    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs">
      {getUnreadCount(getAuthor().id)}
    </span>
  )}
</button>
```

### ✅ Step 3: Add Social Hub component

Where you show the different screens, add:

```typescript
{showSocialHub && (
  <ReflectionsSocialHub
    reflections={reflections}
    onViewReflection={(reflectionId, verseKey) => {
      // Navigate to this reflection/verse
      const surah = parseInt(verseKey.split(':')[0]);
      onGoToPage?.(verseContext?.page || 1);
    }}
  />
)}
```

---

## Phase 6: Testing (30 minutes)

### ✅ Test 1: Basic functionality

```
1. Open the app
2. Write a new reflection
3. Check:
   - ✓ Reflection appears immediately
   - ✓ No console errors
```

### ✅ Test 2: Realtime sync

```
1. Open app in 2 tabs
2. Write reflection in Tab 1
3. Check Tab 2:
   - ✓ Reflection appears automatically (within 5 seconds)
   - ✓ No page refresh needed
```

### ✅ Test 3: Notifications

```
1. Write a reflection as "User A"
2. Switch to "User B" (logout, change author name)
3. Like the reflection
4. Switch back to "User A"
5. Check:
   - ✓ See notification in "Notifications" tab
   - ✓ Notification shows "User B liked your reflection"
```

### ✅ Test 4: Social Hub

```
1. Open the app
2. Write 3-4 reflections
3. Like some reflections
4. Click "Community" tab
5. Check all 4 tabs work:
   - ✓ Trending: Shows reflections in order of trend score
   - ✓ Leaders: Shows your name on leaderboard
   - ✓ Stats: Shows community statistics
   - ✓ Notifications: Shows likes and replies
```

### ✅ Test 5: Sharing

```
1. Click trending reflection
2. Click "Share" button
3. Check:
   - ✓ Twitter button opens share dialog
   - ✓ WhatsApp button opens WhatsApp
   - ✓ Copy button copies to clipboard
   - ✓ QR code displays correctly
```

### ✅ Test 6: Badges

```
1. Write your first reflection
2. Check Social Hub > Leaders
3. Check:
   - ✓ See "🌱 First Reflection" badge
   - ✓ Notification about badge earned
```

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'reflectionsRealtime'"

**Solution**: Check all 5 new files are in `src/lib/` and `src/components/`

### Issue: "getUnreadCount is not exported"

**Solution**: Import from correct module:
```typescript
import { getUnreadCount } from '@/lib/reflectionsNotifications';
```

### Issue: Real-time sync not working

**Solution**: 
1. Check `initializeRealtimeSync()` is called in layout
2. Open DevTools → Application → Local Storage
3. Verify `mushaf-reflections-sync-state` exists

### Issue: Notifications not showing

**Solution**:
1. Check `notifyLike` is imported
2. Check both authors are different (author.id !== reflection.authorId)
3. Open DevTools → Application → Local Storage
4. Search for `mushaf-reflections-notifications` key

### Issue: Community Hub tab not showing

**Solution**:
1. Import `ReflectionsSocialHub` in ReflectionsPanel
2. Make sure `reflections` array is passed
3. Check for console errors

---

## 📊 What Each File Does

| File | Purpose | Key Export |
|------|---------|------------|
| reflectionsRealtime.ts | Cross-tab sync, realtime updates | onRealtimeUpdate() |
| reflectionsSharing.ts | Social sharing, deep links | shareToTwitter() |
| reflectionsCommunity.ts | Badges, leaderboards, trending | getTrendingReflections() |
| reflectionsNotifications.ts | Notifications, preferences | notifyLike(), getUserNotifications() |
| ReflectionsSocialHub.tsx | Social dashboard component | <ReflectionsSocialHub> |

---

## ✅ Final Checklist

- [ ] All 5 new files created and in correct locations
- [ ] reflectionsRealtime imported and initialized in layout
- [ ] reflections.ts updated with notification calls
- [ ] ReflectionsPanel updated with stats tracking
- [ ] ReflectionsSocialHub integrated as tab
- [ ] Tests pass (all 6 test scenarios)
- [ ] No console errors
- [ ] Dark mode works
- [ ] Arabic/English UI works
- [ ] Mobile responsive

---

## 🎉 You're Done!

Your QuranReflect now has:

✅ Real-time sync across tabs  
✅ Social sharing (Twitter, WhatsApp, QR codes)  
✅ Trending reflections algorithm  
✅ User badges and achievements  
✅ Leaderboards  
✅ Notifications  
✅ Community statistics  
✅ Beautiful social hub dashboard  

**Time taken**: 2-3 hours  
**Result**: Production-ready social platform 🚀
