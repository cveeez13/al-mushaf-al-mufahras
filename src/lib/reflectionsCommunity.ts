// @ts-nocheck
/**
 * QuranReflect Community Features
 *
 * - Trending reflections
 * - User badges and achievements
 * - Top contributors leaderboard
 * - Community stats and insights
 */

import type { Reflection } from '@/lib/reflections';

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

export type BadgeType =
  | 'first_reflection'      // Wrote first reflection
  | 'helpful_100'           // 100+ likes on a reflection
  | 'active_contributor'    // 10+ reflections
  | 'community_voice'       // 50+ likes across all reflections
  | 'thoughtful_commenter'  // 20+ replies
  | 'consensus_builder'     // Many likes on replies
  | 'scholar_minded'        // Reflections on 50+ verses
  | 'engagement_streak'     // 7+ days with reflections
  | 'wisdom_seeker'         // 100+ reflections read (inferred)
  | 'founder'               // Early adopter;

export interface UserBadge {
  type: BadgeType;
  earnedAt: string;      // ISO timestamp
  displayName: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export interface UserProfile {
  authorId: string;
  authorName: string;
  reflectionCount: number;
  totalLikes: number;
  totalReplies: number;
  badges: UserBadge[];
  reputation: number;   // Weighted score
  joinedAt: string;
  lastActive: string;
}

export interface TrendingReflection {
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

export interface CommunityStats {
  totalReflections: number;
  totalUsers: number;
  totalLikes: number;
  totalReplies: number;
  avgReflectionLength: number;
  mostActiveVerse: string;
  mostDiscussedTopic: string;
  dailyActiveUsers: number;
}

// ───────────────────────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────────────────────

const USER_PROFILES_KEY = 'mushaf-user-profiles';
const BADGE_CACHE_KEY = 'mushaf-user-badges';
const TRENDING_CACHE_KEY = 'mushaf-trending-cache';
const TRENDING_CACHE_TTL = 3600000; // 1 hour

const BADGE_DEFINITIONS: Record<BadgeType, { name: string; description: string; rarity: UserBadge['rarity'] }> = {
  first_reflection: {
    name: '🌱 First Reflection',
    description: 'Wrote your first reflection',
    rarity: 'common',
  },
  helpful_100: {
    name: '⭐ Highly Helpful',
    description: 'A reflection received 100+ likes',
    rarity: 'rare',
  },
  active_contributor: {
    name: '💬 Active Contributor',
    description: 'Shared 10+ reflections',
    rarity: 'uncommon',
  },
  community_voice: {
    name: '🎤 Community Voice',
    description: '50+ total likes on your reflections',
    rarity: 'uncommon',
  },
  thoughtful_commenter: {
    name: '🧠 Thoughtful Commenter',
    description: 'Shared 20+ replies',
    rarity: 'uncommon',
  },
  consensus_builder: {
    name: '🤝 Consensus Builder',
    description: 'Your replies received many likes',
    rarity: 'rare',
  },
  scholar_minded: {
    name: '📚 Scholar Minded',
    description: 'Reflections on 50+ different verses',
    rarity: 'rare',
  },
  engagement_streak: {
    name: '🔥 Engaged Spirit',
    description: '7+ consecutive days with reflections',
    rarity: 'uncommon',
  },
  wisdom_seeker: {
    name: '🎓 Wisdom Seeker',
    description: 'Engaged with 100+ reflections',
    rarity: 'rare',
  },
  founder: {
    name: '👑 Founder',
    description: 'Early adopter and community builder',
    rarity: 'legendary',
  },
};

// ───────────────────────────────────────────────────────────────
// User Profiles
// ───────────────────────────────────────────────────────────────

/**
 * Get or create user profile
 */
export function getUserProfile(authorId: string, authorName: string = 'Anonymous'): UserProfile {
  try {
    const profiles = getUserProfiles();
    let profile = profiles.find(p => p.authorId === authorId);
    
    if (!profile) {
      profile = {
        authorId,
        authorName,
        reflectionCount: 0,
        totalLikes: 0,
        totalReplies: 0,
        badges: [],
        reputation: 0,
        joinedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      };
      profiles.push(profile);
      saveUserProfiles(profiles);
    } else {
      // Update last active
      profile.lastActive = new Date().toISOString();
      saveUserProfiles(profiles);
    }

    return profile;
  } catch (error) {
    console.error('Failed to get user profile:', error);
    return {
      authorId,
      authorName,
      reflectionCount: 0,
      totalLikes: 0,
      totalReplies: 0,
      badges: [],
      reputation: 0,
      joinedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };
  }
}

/**
 * Update user profile stats
 */
export function updateUserStats(
  authorId: string,
  update: {
    reflectionCount?: number;
    totalLikes?: number;
    totalReplies?: number;
  },
): void {
  try {
    const profiles = getUserProfiles();
    const profile = profiles.find(p => p.authorId === authorId);
    
    if (profile) {
      if (update.reflectionCount !== undefined) profile.reflectionCount = update.reflectionCount;
      if (update.totalLikes !== undefined) profile.totalLikes = update.totalLikes;
      if (update.totalReplies !== undefined) profile.totalReplies = update.totalReplies;
      
      // Calculate reputation
      profile.reputation = calculateReputation(profile);
      
      // Check for new badges
      const newBadges = checkForNewBadges(profile);
      profile.badges = [...profile.badges, ...newBadges];
      
      saveUserProfiles(profiles);
    }
  } catch (error) {
    console.error('Failed to update user stats:', error);
  }
}

/**
 * Get all user profiles
 */
function getUserProfiles(): UserProfile[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(USER_PROFILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save user profiles
 */
function saveUserProfiles(profiles: UserProfile[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(USER_PROFILES_KEY, JSON.stringify(profiles));
  } catch (error) {
    console.error('Failed to save user profiles:', error);
  }
}

// ───────────────────────────────────────────────────────────────
// Badges & Achievements
// ───────────────────────────────────────────────────────────────

/**
 * Get user badges
 */
export function getUserBadges(authorId: string): UserBadge[] {
  const profile = getUserProfile(authorId);
  return profile.badges;
}

/**
 * Check if user has earned a badge
 */
export function hasBadge(authorId: string, badgeType: BadgeType): boolean {
  const profile = getUserProfile(authorId);
  return profile.badges.some(b => b.type === badgeType);
}

/**
 * Award a badge to user
 */
export function awardBadge(authorId: string, badgeType: BadgeType): boolean {
  try {
    const profile = getUserProfile(authorId);
    
    // Check if already has badge
    if (profile.badges.some(b => b.type === badgeType)) {
      return false;
    }

    const def = BADGE_DEFINITIONS[badgeType];
    const badge: UserBadge = {
      type: badgeType,
      earnedAt: new Date().toISOString(),
      displayName: def.name,
      description: def.description,
      rarity: def.rarity,
    };

    profile.badges.push(badge);
    saveUserProfiles([profile]);
    
    return true;
  } catch (error) {
    console.error('Failed to award badge:', error);
    return false;
  }
}

/**
 * Check which badges user should earn
 */
function checkForNewBadges(profile: UserProfile): UserBadge[] {
  const newBadges: UserBadge[] = [];
  const existing = new Set(profile.badges.map(b => b.type));

  // First reflection
  if (profile.reflectionCount === 1 && !existing.has('first_reflection')) {
    newBadges.push(makeBadge('first_reflection'));
  }

  // Active contributor (10+ reflections)
  if (profile.reflectionCount >= 10 && !existing.has('active_contributor')) {
    newBadges.push(makeBadge('active_contributor'));
  }

  // Community voice (50+ total likes)
  if (profile.totalLikes >= 50 && !existing.has('community_voice')) {
    newBadges.push(makeBadge('community_voice'));
  }

  // Thoughtful commenter (20+ replies)
  if (profile.totalReplies >= 20 && !existing.has('thoughtful_commenter')) {
    newBadges.push(makeBadge('thoughtful_commenter'));
  }

  return newBadges;
}

function makeBadge(type: BadgeType): UserBadge {
  const def = BADGE_DEFINITIONS[type];
  return {
    type,
    earnedAt: new Date().toISOString(),
    displayName: def.name,
    description: def.description,
    rarity: def.rarity,
  };
}

// ───────────────────────────────────────────────────────────────
// Reputation System
// ───────────────────────────────────────────────────────────────

/**
 * Calculate reputation score
 * Based on: reflections, likes, replies, badges
 */
function calculateReputation(profile: UserProfile): number {
  let score = 0;

  // Reflections: 10 points each
  score += profile.reflectionCount * 10;

  // Likes: 1 point each
  score += profile.totalLikes;

  // Replies: 5 points each
  score += profile.totalReplies * 5;

  // Badges: multiplier based on rarity
  profile.badges.forEach(badge => {
    switch (badge.rarity) {
      case 'common':
        score += 5;
        break;
      case 'uncommon':
        score += 15;
        break;
      case 'rare':
        score += 50;
        break;
      case 'legendary':
        score += 200;
        break;
    }
  });

  return Math.round(score);
}

// ───────────────────────────────────────────────────────────────
// Trending Reflections
// ───────────────────────────────────────────────────────────────

/**
 * Calculate trend score for reflection
 * Based on: recency, likes, replies, shares
 */
function calculateTrendScore(reflection: Reflection, hoursSinceCreated: number): number {
  // Base score from engagement
  let score = reflection.likes.length * 2 + reflection.replies.length * 3;

  // Boost recent items (24 hour window)
  if (hoursSinceCreated < 24) {
    score *= (24 - hoursSinceCreated) / 24 + 0.5; // Decay over time
  } else {
    score *= 0.1; // Old items get heavily downweighted
  }

  return score;
}

/**
 * Get trending reflections
 */
export function getTrendingReflections(
  reflections: Reflection[],
  limit: number = 10,
): TrendingReflection[] {
  const now = Date.now();
  
  const trending = reflections
    .map(r => {
      const createdAt = new Date(r.createdAt).getTime();
      const hoursSince = (now - createdAt) / (1000 * 60 * 60);
      const score = calculateTrendScore(r, hoursSince);

      // Determine momentum
      let momentum: TrendingReflection['momentum'] = 'steady';
      if (hoursSince < 6 && r.likes.length > 5) momentum = 'rising';
      if (hoursSince > 48 && r.likes.length < 2) momentum = 'declining';

      return {
        reflectionId: r.id,
        verseKey: r.verseKey,
        text: r.text,
        author: r.authorName,
        likes: r.likes.length,
        replies: r.replies.length,
        shares: 0, // TODO: track from sharing module
        trendScore: score,
        momentum,
      };
    })
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, limit);

  return trending;
}

// ───────────────────────────────────────────────────────────────
// Leaderboards
// ───────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number;
  authorId: string;
  authorName: string;
  score: number;
  metric: 'reputation' | 'likes' | 'reflections' | 'engagement';
  badges: number;
}

/**
 * Get leaderboard by reputation
 */
export function getReputationLeaderboard(limit: number = 20): LeaderboardEntry[] {
  const profiles = getUserProfiles();
  
  return profiles
    .sort((a, b) => b.reputation - a.reputation)
    .slice(0, limit)
    .map((profile, index) => ({
      rank: index + 1,
      authorId: profile.authorId,
      authorName: profile.authorName,
      score: profile.reputation,
      metric: 'reputation' as const,
      badges: profile.badges.length,
    }));
}

/**
 * Get leaderboard by total likes
 */
export function getLikesLeaderboard(limit: number = 20): LeaderboardEntry[] {
  const profiles = getUserProfiles();
  
  return profiles
    .sort((a, b) => b.totalLikes - a.totalLikes)
    .filter(p => p.totalLikes > 0)
    .slice(0, limit)
    .map((profile, index) => ({
      rank: index + 1,
      authorId: profile.authorId,
      authorName: profile.authorName,
      score: profile.totalLikes,
      metric: 'likes' as const,
      badges: profile.badges.length,
    }));
}

/**
 * Get leaderboard by reflection count
 */
export function getReflectionsLeaderboard(limit: number = 20): LeaderboardEntry[] {
  const profiles = getUserProfiles();
  
  return profiles
    .sort((a, b) => b.reflectionCount - a.reflectionCount)
    .filter(p => p.reflectionCount > 0)
    .slice(0, limit)
    .map((profile, index) => ({
      rank: index + 1,
      authorId: profile.authorId,
      authorName: profile.authorName,
      score: profile.reflectionCount,
      metric: 'reflections' as const,
      badges: profile.badges.length,
    }));
}

// ───────────────────────────────────────────────────────────────
// Community Statistics
// ───────────────────────────────────────────────────────────────

/**
 * Get overall community statistics
 */
export function getCommunityStats(reflections: Reflection[]): CommunityStats {
  const users = new Set<string>();
  let totalLikes = 0;
  let totalReplies = 0;
  let totalLength = 0;
  const verseFrequency: Record<string, number> = {};
  const topicFrequency: Record<string, number> = {};

  reflections.forEach(r => {
    users.add(r.authorId);
    totalLikes += r.likes.length;
    totalReplies += r.replies.length;
    totalLength += r.text.length;

    verseFrequency[r.verseKey] = (verseFrequency[r.verseKey] || 0) + 1;
    topicFrequency[r.topicColor] = (topicFrequency[r.topicColor] || 0) + 1;
  });

  // Find most active verse and topic
  const mostActiveVerse = Object.entries(verseFrequency).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';
  const mostDiscussedTopic = Object.entries(topicFrequency).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

  return {
    totalReflections: reflections.length,
    totalUsers: users.size,
    totalLikes,
    totalReplies,
    avgReflectionLength: reflections.length > 0 ? Math.round(totalLength / reflections.length) : 0,
    mostActiveVerse,
    mostDiscussedTopic,
    dailyActiveUsers: users.size, // TODO: calculate actual daily actives
  };
}

/**
 * Get insights about most discussed topics
 */
export function getTopInsights(reflections: Reflection[], limit: number = 5): Array<{
  topic: string;
  count: number;
  percentage: number;
}> {
  const topicCounts: Record<string, number> = {};

  reflections.forEach(r => {
    topicCounts[r.topicColor] = (topicCounts[r.topicColor] || 0) + 1;
  });

  const total = reflections.length;

  return Object.entries(topicCounts)
    .map(([topic, count]) => ({
      topic,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// Export badge definitions for UI
export { BADGE_DEFINITIONS };

// Type for reflection needed by calculateTrendScore
interface Reflection {
  id: string;
  likes: string[];
  replies: { id: string }[];
  createdAt: string;
  authorName: string;
  verseKey: string;
  text: string;
}
