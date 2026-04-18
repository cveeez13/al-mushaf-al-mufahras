/**
 * Khatma Dashboard — Unified notification & progress dashboard.
 *
 * Features:
 * - Smart notification center
 * - Topic-plan integration
 * - Behavior-based recommendations
 * - Multi-language support
 * - Real-time progress tracking
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import type { DaySchedule, KhatmaPlan } from '@/lib/khatmaPlanner';
import type { NotificationSchedule } from '@/lib/notificationScheduler';
import {
  loadUserBehavior,
  recordReadingCompletion,
  createKhatmaSchedule,
  createMilestoneNotification,
} from '@/lib/notificationScheduler';

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

interface DashboardProps {
  plan: KhatmaPlan | null;
  currentDay: number;
  totalPages: number;
  completedPages: number;
  schedule: DaySchedule[];
  onGoToPage: (page: number) => void;
}

// ───────────────────────────────────────────────────────────────
// Khatma Dashboard Component
// ───────────────────────────────────────────────────────────────

export default function KhatmaDashboard({
  plan,
  currentDay,
  totalPages,
  completedPages,
  schedule,
  onGoToPage,
}: DashboardProps) {
  const { lang } = useI18n();
  const isAr = lang === 'ar';

  // Local state
  const [expandedNotification, setExpandedNotification] = useState<string | null>(null);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());

  // Load user behavior for smart recommendations
  const userBehavior = useMemo(() => loadUserBehavior(), []);

  // Calculate progress percentage
  const progressPercent = Math.round((completedPages / totalPages) * 100);

  // Get today's reading
  const todayReading = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return schedule.find(d => d.date === today);
  }, [schedule]);

  // Generate milestone notifications
  const milestoneNotifications: NotificationSchedule[] = useMemo(() => {
    const milestones = [25, 50, 75, 100];
    return milestones
      .filter(m => progressPercent >= m && !dismissedNotifications.has(`milestone-${m}`))
      .map(m => createMilestoneNotification(m, plan?.totalDays || 0 - currentDay));
  }, [progressPercent, dismissedNotifications, plan?.totalDays, currentDay]);

  // Topic colors
  const topicColors: Record<number, string> = {
    1: '#7C8E3E', 2: '#5BA3CF', 3: '#C9A43E',
    4: '#D4839B', 5: '#9B8EC4', 6: '#4DBDB5',
    7: '#D4854A'
  };

  const topicNames: Record<number, string> = {
    1: 'عجائب الكون',
    2: 'الجنة والمؤمنون',
    3: 'أحكام الإسلام',
    4: 'قصص الأنبياء',
    5: 'القرآن العظيم',
    6: 'يوم القيامة',
    7: 'التحذير والتوبة',
  };

  const handleDismissNotification = useCallback((id: string) => {
    setDismissedNotifications(prev => new Set([...prev, id]));
  }, []);

  const handleMarkComplete = useCallback(() => {
    if (todayReading) {
      recordReadingCompletion(todayReading.date);
    }
  }, [todayReading]);

  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto p-4 text-center">
        <p className="text-slate-500 dark:text-slate-400">
          {isAr ? 'لا توجد خطة فعالة حالياً' : 'No active plan'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* ─── Header ─────────────────────────────────── */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">
          {isAr ? '📊 لوحة التحكم' : '📊 Dashboard'}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {isAr ? 'تتبع تقدمك في الختمة' : 'Track your Khatma progress'}
        </p>
      </div>

      {/* ─── Progress Overview ──────────────────────── */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800/30">
        <div className="space-y-4">
          {/* Overall Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-900 dark:text-white">
                {isAr ? 'التقدم العام' : 'Overall Progress'}
              </span>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {progressPercent}%
              </span>
            </div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-sm text-slate-600 dark:text-slate-400">
              <span>{completedPages} / {totalPages} {isAr ? 'صفحة' : 'pages'}</span>
              <span>{currentDay} / {plan.totalDays} {isAr ? 'يوم' : 'days'}</span>
            </div>
          </div>

          {/* Daily Pace */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 bg-white dark:bg-slate-800 rounded">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {plan.pagesPerDay}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                {isAr ? 'صفحات/يوم' : 'pages/day'}
              </div>
            </div>
            <div className="text-center p-2 bg-white dark:bg-slate-800 rounded">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {schedule.filter(d => d.isCompleted).length}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                {isAr ? 'مكتمل' : 'completed'}
              </div>
            </div>
            <div className="text-center p-2 bg-white dark:bg-slate-800 rounded">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {plan.totalDays - currentDay + 1}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                {isAr ? 'متبقي' : 'remaining'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Today's Reading Card ──────────────────── */}
      {todayReading && (
        <div
          className="rounded-lg p-6 text-white border-2"
          style={{
            backgroundColor: topicColors[todayReading.topicId] + '15',
            borderColor: topicColors[todayReading.topicId],
          }}
        >
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold mb-1">
                {isAr ? "🎯 ورد اليوم" : "🎯 Today's Reading"}
              </h3>
              <p className="text-sm opacity-90">
                {isAr ? 'اليوم ' : 'Day '}{currentDay} {isAr ? 'من' : 'of'} {plan.totalDays}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">📖</span>
                <div>
                  <div className="font-bold text-lg">
                    {todayReading.startPage} - {todayReading.endPage}
                  </div>
                  <div className="text-sm opacity-80">
                    {todayReading.pagesCount} {isAr ? 'صفحة' : 'pages'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span
                  className="px-3 py-1 rounded-full font-medium"
                  style={{ backgroundColor: topicColors[todayReading.topicId], color: 'white' }}
                >
                  {topicNames[todayReading.topicId]}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => onGoToPage(todayReading.startPage)}
                className="flex-1 px-4 py-2 rounded-lg font-semibold bg-white/20 hover:bg-white/30 transition-colors"
              >
                {isAr ? '📖 اقرأ الآن' : '📖 Read Now'}
              </button>
              {!todayReading.isCompleted && (
                <button
                  onClick={handleMarkComplete}
                  className="flex-1 px-4 py-2 rounded-lg font-semibold bg-green-500/30 hover:bg-green-500/50 transition-colors"
                >
                  {isAr ? '✓ مكتمل' : '✓ Completed'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Milestone Notifications ────────────────── */}
      {milestoneNotifications.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-slate-900 dark:text-white">
            {isAr ? '🏆 الإنجازات' : '🏆 Milestones'}
          </h3>
          {milestoneNotifications.map(notif => (
            <div
              key={notif.id}
              className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800/30 relative"
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">🎉</span>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                    {isAr ? notif.title.ar : notif.title.en}
                  </h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {isAr ? notif.body.ar : notif.body.en}
                  </p>
                </div>
                <button
                  onClick={() => handleDismissNotification(notif.id)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Smart Recommendations ──────────────────── */}
      <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
        <h3 className="font-bold text-slate-900 dark:text-white mb-3">
          {isAr ? '💡 التوصيات الذكية' : '💡 Smart Recommendations'}
        </h3>

        <div className="space-y-3 text-sm">
          {/* Optimal Reading Time */}
          <div className="flex gap-2">
            <span>⏰</span>
            <div>
              <strong className="text-slate-900 dark:text-white">
                {isAr ? 'أفضل وقت للقراءة:' : 'Best Reading Time:'}
              </strong>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                {userBehavior.preferredNotificationTime}{' '}
                {isAr ? '(بناءً على نشاطك السابق)' : '(based on your activity)'}
              </p>
            </div>
          </div>

          {/* Completion Status */}
          <div className="flex gap-2">
            <span>📈</span>
            <div>
              <strong className="text-slate-900 dark:text-white">
                {isAr ? 'معدل الإكمال:' : 'Completion Rate:'}
              </strong>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                {Math.round(userBehavior.completionRate * 100)}%{' '}
                {isAr
                  ? userBehavior.completionRate > 0.7
                    ? '✓ ممتاز! استمر'
                    : 'حاول تحسين انتظامك'
                  : userBehavior.completionRate > 0.7
                  ? '✓ Excellent! Keep going'
                  : 'Try to be more consistent'}
              </p>
            </div>
          </div>

          {/* Reading Frequency */}
          <div className="flex gap-2">
            <span>🎯</span>
            <div>
              <strong className="text-slate-900 dark:text-white">
                {isAr ? 'عدد جلسات القراءة:' : 'Reading Sessions:'}
              </strong>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                {userBehavior.readingFrequency.length}{' '}
                {isAr
                  ? 'أوقات في اليوم'
                  : 'times per day'} (
                {userBehavior.readingFrequency
                  .map(h => `${String(h).padStart(2, '0')}:00`)
                  .join(', ')})
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Tips Section ───────────────────────────── */}
      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800/30">
        <h3 className="font-bold text-green-900 dark:text-green-400 mb-3 flex items-center gap-2">
          <span>💚</span>
          {isAr ? 'نصائح للنجاح' : 'Tips for Success'}
        </h3>

        <ul className="space-y-2 text-sm text-green-800 dark:text-green-300">
          <li className="flex gap-2">
            <span>✓</span>
            <span>
              {isAr
                ? 'اقرأ في أوقات منتظمة كل يوم'
                : 'Read at consistent times each day'}
            </span>
          </li>
          <li className="flex gap-2">
            <span>✓</span>
            <span>
              {isAr
                ? 'فعّل التنبيهات للحصول على تذكيرات منتظمة'
                : 'Enable notifications for regular reminders'}
            </span>
          </li>
          <li className="flex gap-2">
            <span>✓</span>
            <span>
              {isAr
                ? 'حافظ على انتظامك لتصل للإنجازات'
                : 'Stay consistent to unlock milestones'}
            </span>
          </li>
          <li className="flex gap-2">
            <span>✓</span>
            <span>
              {isAr
                ? 'استمتع بالتعلم عن مواضيع مختلفة'
                : 'Enjoy learning about diverse topics'}
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
