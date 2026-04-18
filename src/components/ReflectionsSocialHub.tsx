/**
 * QuranReflect Social Hub Component
 *
 * Comprehensive dashboard featuring:
 * - Trending reflections
 * - User profiles with badges
 * - Leaderboards
 * - Community statistics
 * - Notification center
 * - Sharing UI
 */

'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import type { Reflection } from '@/lib/reflections';
import {
  getTrendingReflections,
  getReputationLeaderboard,
  getLikesLeaderboard,
  getCommunityStats,
  getTopInsights,
  getUserProfile,
  getUserBadges,
  type TrendingReflection,
  type LeaderboardEntry,
  type CommunityStats,
} from '@/lib/reflectionsCommunity';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  type ReflectionNotification,
} from '@/lib/reflectionsNotifications';
import {
  generateShareUrl,
  shareToTwitter,
  shareToWhatsApp,
  nativeShare,
  copyLinkToClipboard,
  generateQRCodeUrl,
  recordShare,
} from '@/lib/reflectionsSharing';
import {
  onRealtimeUpdate,
  getSyncStatus,
  getTimeSinceSync,
} from '@/lib/reflectionsRealtime';
import { getAuthor } from '@/lib/reflections';
import { SURAH_NAMES } from '@/lib/types';

// ───────────────────────────────────────────────────────────────
// Translations
// ───────────────────────────────────────────────────────────────

const T = {
  title: { ar: 'مركز المجتمع', en: 'Community Hub' },
  trending: { ar: 'الشائعة', en: 'Trending' },
  leaderboard: { ar: 'لوحة المتصدرين', en: 'Leaderboard' },
  community: { ar: 'إحصائيات المجتمع', en: 'Community Stats' },
  notifications: { ar: 'الإخطارات', en: 'Notifications' },
  userProfile: { ar: 'ملفي الشخصي', en: 'My Profile' },
  
  // Tab labels
  trending_tab: { ar: 'الشائعة', en: 'Trending' },
  leaders_tab: { ar: 'الأفضل', en: 'Top Contributors' },
  stats_tab: { ar: 'الإحصائيات', en: 'Statistics' },
  notif_tab: { ar: 'الإخطارات', en: 'Notifications' },
  
  // Stats
  totalReflections: { ar: 'إجمالي التأملات', en: 'Total Reflections' },
  totalUsers: { ar: 'المستخدمون النشطون', en: 'Active Users' },
  totalLikes: { ar: 'الإعجابات', en: 'Total Likes' },
  totalReplies: { ar: 'الردود', en: 'Total Replies' },
  mostActiveVerse: { ar: 'أكثر آية نقاشاً', en: 'Most Discussed Verse' },
  mostDiscussedTopic: { ar: 'أكثر موضوع', en: 'Most Discussed Topic' },
  
  // Leaderboard
  rank: { ar: 'الترتيب', en: 'Rank' },
  contributor: { ar: 'المساهم', en: 'Contributor' },
  score: { ar: 'النقاط', en: 'Score' },
  badges: { ar: 'الشارات', en: 'Badges' },
  
  // Notifications
  noNotifications: { ar: 'لا توجد إخطارات جديدة', en: 'No new notifications' },
  markAllRead: { ar: 'وضع الكل كمقروء', en: 'Mark all as read' },
  clearAll: { ar: 'حذف الكل', en: 'Clear all' },
  
  // Sharing
  share: { ar: 'مشاركة', en: 'Share' },
  copyLink: { ar: 'نسخ الرابط', en: 'Copy Link' },
  twitter: { ar: 'تويتر', en: 'Twitter' },
  whatsapp: { ar: 'واتساب', en: 'WhatsApp' },
  qrCode: { ar: 'رمز QR', en: 'QR Code' },
  
  // Empty states
  noTrending: { ar: 'لا توجد تأملات شائعة حالياً', en: 'No trending reflections yet' },
  noNotifs: { ar: 'أنت على اطلاع!', en: 'You\'re all caught up!' },
  
  // Status
  synced: { ar: 'متزامن', en: 'Synced' },
  syncing: { ar: 'جاري التزامن...', en: 'Syncing...' },
  offline: { ar: 'غير متصل', en: 'Offline' },
  
  rising: { ar: '📈 صاعد', en: '📈 Rising' },
  steady: { ar: '➡️ مستقر', en: '➡️ Steady' },
  declining: { ar: '📉 هابط', en: '📉 Declining' },
};

// ───────────────────────────────────────────────────────────────
// Main Component
// ───────────────────────────────────────────────────────────────

interface ReflectionsSocialHubProps {
  reflections: Reflection[];
  onViewReflection?: (reflectionId: string, verseKey: string) => void;
}

export default function ReflectionsSocialHub({
  reflections,
  onViewReflection,
}: ReflectionsSocialHubProps) {
  const { lang } = useI18n();
  const tx = (key: keyof typeof T) => T[key][lang];

  const [activeTab, setActiveTab] = useState<'trending' | 'leaders' | 'stats' | 'notif'>('trending');
  const [notifications, setNotifications] = useState<ReflectionNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'pending'>('synced');
  const [showShareModal, setShowShareModal] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState<string | null>(null);

  const author = getAuthor();
  const trending = useMemo(() => getTrendingReflections(reflections, 20), [reflections]);
  const stats = useMemo(() => getCommunityStats(reflections), [reflections]);
  const leaders = useMemo(() => getReputationLeaderboard(10), []);
  const topInsights = useMemo(() => getTopInsights(reflections, 5), [reflections]);

  // Load notifications
  useEffect(() => {
    const notifs = getUserNotifications(author.id, 20);
    setNotifications(notifs);
    setUnreadCount(getUnreadCount(author.id));
  }, [author.id]);

  // Listen for realtime updates
  useEffect(() => {
    const unsubscribe = onRealtimeUpdate(() => {
      const notifs = getUserNotifications(author.id, 20);
      setNotifications(notifs);
      setUnreadCount(getUnreadCount(author.id));
      setSyncStatus(getSyncStatus());
    });

    return unsubscribe;
  }, [author.id]);

  // Update sync status
  useEffect(() => {
    const interval = setInterval(() => {
      setSyncStatus(getSyncStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = (notifId: string) => {
    markAsRead(notifId);
    const notifs = getUserNotifications(author.id, 20);
    setNotifications(notifs);
    setUnreadCount(getUnreadCount(author.id));
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead(author.id);
    const notifs = getUserNotifications(author.id, 20);
    setNotifications(notifs);
    setUnreadCount(getUnreadCount(author.id));
  };

  const handleShare = async (reflection: Reflection, platform: string) => {
    recordShare(reflection.id, platform as any);

    switch (platform) {
      case 'twitter':
        shareToTwitter(reflection);
        break;
      case 'whatsapp':
        shareToWhatsApp(reflection);
        break;
      case 'copy':
        await copyLinkToClipboard(reflection);
        break;
      case 'native':
        await nativeShare(reflection);
        break;
    }
  };

  return (
    <div className="w-full bg-[var(--color-mushaf-bg)] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[var(--color-mushaf-gold)]/10 to-[var(--color-mushaf-gold)]/5 border-b border-[var(--color-mushaf-border)] p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[var(--color-mushaf-text)]">
            {tx('title')}
          </h2>
          
          {/* Sync Status */}
          <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-[var(--color-mushaf-border)]/20">
            <div
              className={`w-2 h-2 rounded-full ${
                syncStatus === 'synced'
                  ? 'bg-green-500'
                  : syncStatus === 'offline'
                    ? 'bg-red-500'
                    : 'bg-yellow-500'
              }`}
            />
            <span className="text-[var(--color-mushaf-text)]/60 capitalize">
              {tx(syncStatus as keyof typeof T)}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto">
          {(['trending', 'leaders', 'stats', 'notif'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'bg-[var(--color-mushaf-gold)] text-white'
                  : 'bg-[var(--color-mushaf-border)]/10 text-[var(--color-mushaf-text)]/60 hover:bg-[var(--color-mushaf-border)]/20'
              }`}
            >
              {tab === 'notif' && unreadCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  {tx('notif_tab')}
                  <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                </span>
              )}
              {tab !== 'notif' && tx(`${tab}_tab`)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Trending Tab */}
        {activeTab === 'trending' && (
          <div className="space-y-3">
            {trending.length > 0 ? (
              trending.map(tr => (
                <TrendingCard
                  key={tr.reflectionId}
                  trending={tr}
                  lang={lang}
                  onShare={handleShare}
                  onViewReflection={onViewReflection}
                  onShowShare={() => setShowShareModal(tr.reflectionId)}
                  onShowQR={() => setShowQRModal(tr.reflectionId)}
                />
              ))
            ) : (
              <div className="text-center text-[var(--color-mushaf-text)]/40 py-8">
                {tx('noTrending')}
              </div>
            )}
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaders' && (
          <div className="space-y-4">
            <LeaderboardSection
              title={T.leaderboard[lang]}
              entries={leaders}
              lang={lang}
            />
            <TopicsSection
              insights={topInsights}
              lang={lang}
            />
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <CommunityStatsSection stats={stats} lang={lang} />
        )}

        {/* Notifications Tab */}
        {activeTab === 'notif' && (
          <div className="space-y-3">
            {notifications.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs px-3 py-1 rounded-lg bg-[var(--color-mushaf-gold)]/20 text-[var(--color-mushaf-gold)] hover:bg-[var(--color-mushaf-gold)]/30 transition-colors"
                >
                  {tx('markAllRead')}
                </button>
              </div>
            )}

            {notifications.length > 0 ? (
              notifications.map(notif => (
                <NotificationCard
                  key={notif.id}
                  notification={notif}
                  lang={lang}
                  onRead={() => handleMarkAsRead(notif.id)}
                  onView={onViewReflection}
                />
              ))
            ) : (
              <div className="text-center text-[var(--color-mushaf-text)]/40 py-8">
                {tx('noNotifs')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          reflectionId={showShareModal}
          reflections={reflections}
          lang={lang}
          onShare={handleShare}
          onClose={() => setShowShareModal(null)}
        />
      )}

      {/* QR Code Modal */}
      {showQRModal && (
        <QRCodeModal
          reflectionId={showQRModal}
          reflections={reflections}
          lang={lang}
          onClose={() => setShowQRModal(null)}
        />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Sub-Components
// ───────────────────────────────────────────────────────────────

interface TrendingCardProps {
  trending: TrendingReflection;
  lang: string;
  onShare: (reflection: Reflection, platform: string) => void;
  onViewReflection?: (reflectionId: string, verseKey: string) => void;
  onShowShare: () => void;
  onShowQR: () => void;
}

function TrendingCard({
  trending,
  lang,
  onShare,
  onViewReflection,
  onShowShare,
  onShowQR,
}: TrendingCardProps) {
  const momentum = {
    rising: T.rising[lang],
    steady: T.steady[lang],
    declining: T.declining[lang],
  }[trending.momentum];

  return (
    <div className="p-4 rounded-lg bg-[var(--color-mushaf-border)]/10 hover:bg-[var(--color-mushaf-border)]/15 transition-colors border border-[var(--color-mushaf-border)]/20 cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div
          onClick={() => onViewReflection?.(trending.reflectionId, trending.verseKey)}
          className="flex-1"
        >
          <h4 className="font-medium text-[var(--color-mushaf-text)] mb-1">
            {SURAH_NAMES[parseInt(trending.verseKey.split(':')[0])]} {trending.verseKey.split(':')[1]}
          </h4>
          <p className="text-sm text-[var(--color-mushaf-text)]/70 line-clamp-2">
            "{trending.text}"
          </p>
        </div>
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-[var(--color-mushaf-gold)]/20 text-[var(--color-mushaf-gold)] whitespace-nowrap ml-2">
          {momentum}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--color-mushaf-text)]/60">
        <span>
          — {trending.author}
        </span>
        <div className="flex gap-3">
          <span>❤️ {trending.likes}</span>
          <span>💬 {trending.replies}</span>
        </div>
      </div>

      <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--color-mushaf-border)]/10">
        <button
          onClick={onShowShare}
          className="flex-1 text-xs py-1.5 rounded-md bg-[var(--color-mushaf-gold)]/10 text-[var(--color-mushaf-gold)] hover:bg-[var(--color-mushaf-gold)]/20 transition-colors"
        >
          {T.share[lang]}
        </button>
        <button
          onClick={onShowQR}
          className="flex-1 text-xs py-1.5 rounded-md bg-[var(--color-mushaf-border)]/20 text-[var(--color-mushaf-text)]/70 hover:bg-[var(--color-mushaf-border)]/30 transition-colors"
        >
          {T.qrCode[lang]}
        </button>
      </div>
    </div>
  );
}

interface LeaderboardSectionProps {
  title: string;
  entries: LeaderboardEntry[];
  lang: string;
}

function LeaderboardSection({ title, entries, lang }: LeaderboardSectionProps) {
  return (
    <div>
      <h3 className="font-bold text-[var(--color-mushaf-text)] mb-3">{title}</h3>
      <div className="space-y-2">
        {entries.map(entry => (
          <div
            key={entry.authorId}
            className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-mushaf-border)]/10"
          >
            <div className="flex items-center gap-3 flex-1">
              <span className="font-bold text-[var(--color-mushaf-gold)] w-6">
                {entry.rank}
              </span>
              <div>
                <div className="font-medium text-[var(--color-mushaf-text)] text-sm">
                  {entry.authorName}
                </div>
                {entry.badges > 0 && (
                  <div className="text-xs text-[var(--color-mushaf-text)]/60">
                    🏆 {entry.badges} badges
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-[var(--color-mushaf-gold)]">
                {entry.score}
              </div>
              <div className="text-xs text-[var(--color-mushaf-text)]/60">
                {lang === 'ar' ? 'نقاط' : 'pts'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TopicsSectionProps {
  insights: Array<{ topic: string; count: number; percentage: number }>;
  lang: string;
}

function TopicsSection({ insights, lang }: TopicsSectionProps) {
  return (
    <div>
      <h3 className="font-bold text-[var(--color-mushaf-text)] mb-3">
        {lang === 'ar' ? 'أكثر المواضيع نقاشاً' : 'Most Discussed Topics'}
      </h3>
      <div className="space-y-2">
        {insights.map(insight => (
          <div
            key={insight.topic}
            className="p-3 rounded-lg bg-[var(--color-mushaf-border)]/10"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--color-mushaf-text)]">
                {insight.topic}
              </span>
              <span className="text-xs font-bold text-[var(--color-mushaf-gold)]">
                {insight.percentage}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-[var(--color-mushaf-border)]/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-mushaf-gold)] rounded-full transition-all"
                style={{ width: `${insight.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CommunityStatsSectionProps {
  stats: CommunityStats;
  lang: string;
}

function CommunityStatsSection({ stats, lang }: CommunityStatsSectionProps) {
  const T_local = {
    totalReflections: { ar: 'إجمالي التأملات', en: 'Total Reflections' },
    totalUsers: { ar: 'المستخدمون النشطون', en: 'Active Users' },
    totalLikes: { ar: 'الإعجابات', en: 'Total Likes' },
    totalReplies: { ar: 'الردود', en: 'Total Replies' },
    avgReflectionLength: { ar: 'متوسط طول التأمل', en: 'Avg Reflection Length' },
  };

  const statItems = [
    { label: T_local.totalReflections[lang], value: stats.totalReflections },
    { label: T_local.totalUsers[lang], value: stats.totalUsers },
    { label: T_local.totalLikes[lang], value: stats.totalLikes },
    { label: T_local.totalReplies[lang], value: stats.totalReplies },
    { label: T_local.avgReflectionLength[lang], value: `${stats.avgReflectionLength} ${lang === 'ar' ? 'حرف' : 'chars'}` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {statItems.map((item, i) => (
          <div
            key={i}
            className="p-4 rounded-lg bg-[var(--color-mushaf-border)]/10 text-center"
          >
            <div className="text-2xl font-bold text-[var(--color-mushaf-gold)] mb-1">
              {item.value}
            </div>
            <div className="text-xs text-[var(--color-mushaf-text)]/60">
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface NotificationCardProps {
  notification: ReflectionNotification;
  lang: string;
  onRead: () => void;
  onView?: (reflectionId: string, verseKey: string) => void;
}

function NotificationCard({
  notification,
  lang,
  onRead,
  onView,
}: NotificationCardProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'like':
        return '❤️';
      case 'reply':
        return '💬';
      case 'badge':
        return '🏆';
      case 'trending':
        return '📈';
      default:
        return '📬';
    }
  };

  return (
    <div
      className={`p-3 rounded-lg border transition-colors cursor-pointer ${
        notification.read
          ? 'bg-[var(--color-mushaf-border)]/5 border-[var(--color-mushaf-border)]/20'
          : 'bg-[var(--color-mushaf-gold)]/5 border-[var(--color-mushaf-gold)]/30'
      }`}
      onClick={() => {
        onRead();
        if (notification.actionUrl && onView) {
          const match = notification.actionUrl.match(/reflection=([^&]+)/);
          if (match) onView(match[1], notification.verseKey);
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div className="text-xl flex-shrink-0">{getIcon(notification.type)}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--color-mushaf-text)]">
            {notification.message}
          </p>
          <p className="text-xs text-[var(--color-mushaf-text)]/40 mt-1">
            {new Date(notification.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
          </p>
        </div>
        {!notification.read && (
          <div className="w-2 h-2 rounded-full bg-[var(--color-mushaf-gold)] flex-shrink-0 mt-1" />
        )}
      </div>
    </div>
  );
}

interface ShareModalProps {
  reflectionId: string;
  reflections: Reflection[];
  lang: string;
  onShare: (reflection: Reflection, platform: string) => void;
  onClose: () => void;
}

function ShareModal({
  reflectionId,
  reflections,
  lang,
  onShare,
  onClose,
}: ShareModalProps) {
  const reflection = reflections.find(r => r.id === reflectionId);
  if (!reflection) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-mushaf-bg)] rounded-lg max-w-sm w-full p-6 space-y-4">
        <h3 className="font-bold text-lg text-[var(--color-mushaf-text)]">
          {T.share[lang]}
        </h3>

        <div className="space-y-2">
          {[
            { id: 'twitter', label: T.twitter[lang] },
            { id: 'whatsapp', label: T.whatsapp[lang] },
            { id: 'copy', label: T.copyLink[lang] },
          ].map(option => (
            <button
              key={option.id}
              onClick={() => {
                onShare(reflection, option.id);
                onClose();
              }}
              className="w-full p-3 rounded-lg bg-[var(--color-mushaf-border)]/20 text-[var(--color-mushaf-text)] hover:bg-[var(--color-mushaf-border)]/30 transition-colors text-left"
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full p-3 rounded-lg bg-[var(--color-mushaf-gold)]/20 text-[var(--color-mushaf-gold)] hover:bg-[var(--color-mushaf-gold)]/30 transition-colors"
        >
          {lang === 'ar' ? 'إغلاق' : 'Close'}
        </button>
      </div>
    </div>
  );
}

interface QRCodeModalProps {
  reflectionId: string;
  reflections: Reflection[];
  lang: string;
  onClose: () => void;
}

function QRCodeModal({
  reflectionId,
  reflections,
  lang,
  onClose,
}: QRCodeModalProps) {
  const reflection = reflections.find(r => r.id === reflectionId);
  if (!reflection) return null;

  const qrUrl = generateQRCodeUrl(reflection, 400);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-mushaf-bg)] rounded-lg max-w-sm w-full p-6 space-y-4">
        <h3 className="font-bold text-lg text-[var(--color-mushaf-text)]">
          {T.qrCode[lang]}
        </h3>

        <div className="bg-white p-4 rounded-lg flex justify-center">
          <img src={qrUrl} alt="QR Code" className="w-64 h-64" />
        </div>

        <button
          onClick={onClose}
          className="w-full p-3 rounded-lg bg-[var(--color-mushaf-gold)]/20 text-[var(--color-mushaf-gold)] hover:bg-[var(--color-mushaf-gold)]/30 transition-colors"
        >
          {lang === 'ar' ? 'إغلاق' : 'Close'}
        </button>
      </div>
    </div>
  );
}
