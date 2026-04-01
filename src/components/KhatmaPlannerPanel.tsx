'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { getTopicsMaster } from '@/lib/data';
import { TOPICS } from '@/lib/types';
import type { Verse } from '@/lib/types';
import {
  createPlan, recalculatePlan, markDayComplete, getPlanProgress,
  getTopicsForPageRange, loadPlan, savePlan, deletePlan,
  archivePlan, loadHistory, requestNotificationPermission,
  checkDailyReminder, todayStr, addDays, diffDays,
  KHATMA_PRESETS, TOTAL_PAGES,
  type KhatmaPlan, type DaySchedule, type PlanProgress, type TopicBreakdown,
} from '@/lib/khatmaPlanner';

// ───────────────────────────────────────────────────────────────
// Inline Translations
// ───────────────────────────────────────────────────────────────

const T = {
  title:         { ar: 'خطة ختم القرآن', en: 'Quran Completion Plan' },
  createPlan:    { ar: 'أنشئ خطتك', en: 'Create Your Plan' },
  chooseDuration:{ ar: 'اختر مدة الختمة', en: 'Choose Duration' },
  pagesDay:      { ar: 'صفحة/يوم', en: 'pages/day' },
  customDays:    { ar: 'أو اختر عدد أيام مخصص', en: 'Or choose custom days' },
  days:          { ar: 'يوم', en: 'days' },
  startDate:     { ar: 'تاريخ البدء', en: 'Start Date' },
  reminderTime:  { ar: 'وقت التذكير', en: 'Reminder Time' },
  notifications: { ar: 'تفعيل التنبيهات', en: 'Enable Notifications' },
  start:         { ar: 'ابدأ الختمة', en: 'Start Khatma' },
  todayReading:  { ar: 'ورد اليوم', en: "Today's Reading" },
  pages:         { ar: 'الصفحات', en: 'Pages' },
  markComplete:  { ar: 'أكملت ✓', en: 'Mark Complete ✓' },
  completed:     { ar: 'مكتملة', en: 'Completed' },
  missed:        { ar: 'فائتة', en: 'Missed' },
  remaining:     { ar: 'متبقية', en: 'Remaining' },
  onTrack:       { ar: 'على المسار ✓', en: 'On Track ✓' },
  offTrack:      { ar: 'متأخر ⚠', en: 'Behind Schedule ⚠' },
  recalculate:   { ar: 'أعد توزيع الصفحات', en: 'Redistribute Pages' },
  topicsToday:   { ar: 'مواضيع اليوم', en: "Today's Topics" },
  schedule:      { ar: 'الجدول اليومي', en: 'Daily Schedule' },
  abandon:       { ar: 'إلغاء الخطة', en: 'Abandon Plan' },
  newPlan:       { ar: 'خطة جديدة', en: 'New Plan' },
  celebration:   { ar: 'مبارك! أتممت ختمة القرآن الكريم 🎉', en: 'Congratulations! You completed the Quran 🎉' },
  history:       { ar: 'السجلّ', en: 'History' },
  noHistory:     { ar: 'لا يوجد سجل بعد', en: 'No history yet' },
  day:           { ar: 'يوم', en: 'Day' },
  page:          { ar: 'صفحة', en: 'page' },
  progress:      { ar: 'التقدم', en: 'Progress' },
  adjusted:      { ar: 'المعدّل', en: 'Adjusted' },
  doneInDays:    { ar: 'يوماً',  en: 'days' },
  calendarView:  { ar: 'التقويم', en: 'Calendar' },
  goToPage:      { ar: 'انتقل للصفحة', en: 'Go to page' },
  verse:         { ar: 'آية', en: 'verses' },
} as const;

function useTx() {
  const { lang } = useI18n();
  return useCallback((key: keyof typeof T) => T[key][lang], [lang]);
}

// ───────────────────────────────────────────────────────────────
// Topic Color Hex Map (from types.ts)
// ───────────────────────────────────────────────────────────────

const COLOR_HEX: Record<string, string> = {
  blue: '#3498DB', green: '#27AE60', brown: '#8E6B3D',
  yellow: '#F1C40F', purple: '#8E44AD', orange: '#E67E22', red: '#E74C3C',
};

// ───────────────────────────────────────────────────────────────
// Sub-Components
// ───────────────────────────────────────────────────────────────

/** SVG Donut Chart */
function ProgressDonut({ percent, size = 120 }: { percent: number; size?: number }) {
  const r = (size - 12) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="block mx-auto">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="var(--color-mushaf-border)" strokeWidth="8" opacity="0.3" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="var(--color-mushaf-gold)" strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-700" />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        className="text-2xl font-bold" fill="var(--color-mushaf-gold)">
        {percent}%
      </text>
    </svg>
  );
}

/** SVG Bar Chart for daily schedule */
function DailyBarChart({
  schedule, lang, onDayClick,
}: {
  schedule: DaySchedule[];
  lang: string;
  onDayClick: (day: DaySchedule) => void;
}) {
  const today = todayStr();
  const maxPages = Math.max(...schedule.map(d => d.pagesCount), 1);
  const barW = Math.max(16, Math.min(32, 600 / schedule.length));
  const chartH = 120;
  const svgW = schedule.length * (barW + 3) + 4;

  return (
    <div className="overflow-x-auto scrollbar-none">
      <svg width={svgW} height={chartH + 24} className="block">
        {schedule.map((d, i) => {
          const h = (d.pagesCount / maxPages) * chartH;
          const x = i * (barW + 3) + 2;
          const y = chartH - h;

          let fill: string;
          if (d.completed) fill = 'var(--color-topic-green)';
          else if (d.date === today) fill = 'var(--color-mushaf-gold)';
          else if (d.date < today) fill = 'var(--color-topic-red)';
          else fill = 'var(--color-mushaf-border)';

          return (
            <g key={d.day} onClick={() => onDayClick(d)} className="cursor-pointer">
              <rect x={x} y={y} width={barW} height={h}
                rx={3} fill={fill} opacity={0.8}
                className="hover:opacity-100 transition-opacity" />
              <text x={x + barW / 2} y={chartH + 14}
                textAnchor="middle" fontSize="9"
                fill="var(--color-mushaf-text)" opacity="0.5">
                {d.day}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Mini Calendar Grid */
function MiniCalendar({
  schedule, lang,
}: {
  schedule: DaySchedule[];
  lang: string;
}) {
  const today = todayStr();

  // Build a map from date -> day status
  const dateMap = useMemo(() => {
    const m: Record<string, 'completed' | 'today' | 'missed' | 'future'> = {};
    for (const d of schedule) {
      if (d.completed) m[d.date] = 'completed';
      else if (d.date === today) m[d.date] = 'today';
      else if (d.date < today) m[d.date] = 'missed';
      else m[d.date] = 'future';
    }
    return m;
  }, [schedule, today]);

  // Get unique months in the plan
  const months = useMemo(() => {
    const set = new Set<string>();
    for (const d of schedule) set.add(d.date.slice(0, 7)); // YYYY-MM
    return Array.from(set).sort();
  }, [schedule]);

  const dayNames = lang === 'ar'
    ? ['أح', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب']
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const statusColor: Record<string, string> = {
    completed: 'bg-[var(--color-topic-green)] text-white',
    today: 'bg-[var(--color-mushaf-gold)] text-white ring-2 ring-[var(--color-mushaf-gold)]/50',
    missed: 'bg-[var(--color-topic-red)]/80 text-white',
    future: 'bg-[var(--color-mushaf-border)]/30',
  };

  return (
    <div className="space-y-4">
      {months.map(month => {
        const [y, m] = month.split('-').map(Number);
        const firstDay = new Date(y, m - 1, 1).getDay();
        const daysInMonth = new Date(y, m, 0).getDate();
        const monthName = new Date(y, m - 1).toLocaleDateString(
          lang === 'ar' ? 'ar-SA' : 'en-US',
          { month: 'long', year: 'numeric' }
        );

        return (
          <div key={month}>
            <div className="text-xs font-semibold text-[var(--color-mushaf-text)]/60 mb-2 text-center">
              {monthName}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
              {dayNames.map(d => (
                <div key={d} className="text-[var(--color-mushaf-text)]/40 font-medium">{d}</div>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dd = `${month}-${String(i + 1).padStart(2, '0')}`;
                const status = dateMap[dd];
                return (
                  <div
                    key={dd}
                    className={`w-6 h-6 flex items-center justify-center rounded-full mx-auto text-[10px] ${
                      status ? statusColor[status] : ''
                    }`}
                  >
                    {i + 1}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Topic Breakdown Bar */
function TopicBar({
  topics, lang,
}: {
  topics: TopicBreakdown[];
  lang: string;
}) {
  if (topics.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Stacked bar */}
      <div className="h-4 rounded-full overflow-hidden flex">
        {topics.map(t => (
          <div
            key={t.topicId}
            style={{ width: `${t.percentage}%`, backgroundColor: COLOR_HEX[t.color] || '#888' }}
            className="transition-all duration-500"
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {topics.map(t => (
          <div key={t.topicId} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
              style={{ backgroundColor: COLOR_HEX[t.color] || '#888' }}
            />
            <span className="text-[var(--color-mushaf-text)]/70">
              {lang === 'ar' ? t.name_ar : t.name_en}
            </span>
            <span className="text-[var(--color-mushaf-text)]/40">
              {t.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Main Component
// ───────────────────────────────────────────────────────────────

interface KhatmaPlannerPanelProps {
  onGoToPage?: (page: number) => void;
}

type Screen = 'setup' | 'dashboard' | 'celebration' | 'day-detail';

export default function KhatmaPlannerPanel({ onGoToPage }: KhatmaPlannerPanelProps) {
  const { lang } = useI18n();
  const tx = useTx();

  // ─── State ───────────────────────────────────────────
  const [plan, setPlan] = useState<KhatmaPlan | null>(null);
  const [screen, setScreen] = useState<Screen>('setup');
  const [verses, setVerses] = useState<Verse[]>([]);
  const [selectedDay, setSelectedDay] = useState<DaySchedule | null>(null);

  // Setup form
  const [setupDays, setSetupDays] = useState(30);
  const [setupDate, setSetupDate] = useState(todayStr());
  const [setupTime, setSetupTime] = useState('08:00');
  const [setupNotify, setSetupNotify] = useState(false);

  // ─── Load on mount ───────────────────────────────────
  useEffect(() => {
    const saved = loadPlan();
    if (saved) {
      setPlan(saved);
      setScreen(saved.status === 'completed' ? 'celebration' : 'dashboard');
    }
    // Load verse data for topic analysis
    getTopicsMaster().then(d => setVerses(d.verses)).catch(() => {});
  }, []);

  // Fire notification reminder on mount
  useEffect(() => {
    if (plan?.status === 'active') checkDailyReminder(plan);
  }, [plan]);

  // ─── Derived ─────────────────────────────────────────
  const progress = useMemo<PlanProgress | null>(
    () => plan ? getPlanProgress(plan) : null,
    [plan]
  );

  const todayTopics = useMemo<TopicBreakdown[]>(() => {
    if (!progress?.todaySchedule || verses.length === 0) return [];
    return getTopicsForPageRange(
      verses,
      progress.todaySchedule.startPage,
      progress.todaySchedule.endPage
    );
  }, [progress, verses]);

  const selectedDayTopics = useMemo<TopicBreakdown[]>(() => {
    if (!selectedDay || verses.length === 0) return [];
    return getTopicsForPageRange(verses, selectedDay.startPage, selectedDay.endPage);
  }, [selectedDay, verses]);

  const history = useMemo(() => loadHistory(), [plan]);

  // ─── Actions ─────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    if (setupNotify) await requestNotificationPermission();
    const newPlan = createPlan(setupDays, setupDate, setupTime);
    newPlan.notificationsEnabled = setupNotify;
    savePlan(newPlan);
    setPlan(newPlan);
    setScreen('dashboard');
  }, [setupDays, setupDate, setupTime, setupNotify]);

  const handleMarkComplete = useCallback((dayNum: number) => {
    if (!plan) return;
    let updated = markDayComplete(plan, dayNum);
    if (updated.status === 'completed') {
      archivePlan(updated);
    }
    savePlan(updated);
    setPlan(updated);
    if (updated.status === 'completed') setScreen('celebration');
  }, [plan]);

  const handleRecalculate = useCallback(() => {
    if (!plan) return;
    const updated = recalculatePlan(plan);
    savePlan(updated);
    setPlan(updated);
  }, [plan]);

  const handleAbandon = useCallback(() => {
    if (!plan) return;
    archivePlan({ ...plan, status: 'paused' });
    deletePlan();
    setPlan(null);
    setScreen('setup');
  }, [plan]);

  const handleNewPlan = useCallback(() => {
    deletePlan();
    setPlan(null);
    setScreen('setup');
  }, []);

  const handleDayClick = useCallback((day: DaySchedule) => {
    setSelectedDay(day);
    setScreen('day-detail');
  }, []);

  // ─── Render ──────────────────────────────────────────
  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-lg font-bold text-[var(--color-mushaf-gold)] mb-6 text-center">
        {tx('title')}
      </h2>

      {/* ════ SETUP SCREEN ════ */}
      {screen === 'setup' && (
        <div className="space-y-6">
          {/* Presets */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-mushaf-text)]/70 mb-3">
              {tx('chooseDuration')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {KHATMA_PRESETS.map(preset => (
                <button
                  key={preset.days}
                  onClick={() => setSetupDays(preset.days)}
                  className={`page-frame p-4 rounded-xl text-center transition-all ${
                    setupDays === preset.days
                      ? 'ring-2 ring-[var(--color-mushaf-gold)] bg-[var(--color-mushaf-gold)]/10'
                      : 'hover:bg-[var(--color-mushaf-border)]/20'
                  }`}
                >
                  <div className="text-2xl font-bold text-[var(--color-mushaf-gold)]">
                    {preset.days}
                  </div>
                  <div className="text-[10px] text-[var(--color-mushaf-text)]/50 mt-1">
                    {lang === 'ar' ? preset.ar : preset.en}
                  </div>
                  <div className="text-xs text-[var(--color-mushaf-text)]/40 mt-0.5">
                    {preset.pagesPerDay} {tx('pagesDay')}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom days */}
          <div className="page-frame p-4 rounded-xl">
            <label className="text-xs text-[var(--color-mushaf-text)]/60 block mb-2">
              {tx('customDays')}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range" min={1} max={365} value={setupDays}
                onChange={e => setSetupDays(Number(e.target.value))}
                className="flex-1 accent-[var(--color-mushaf-gold)]"
              />
              <div className="text-center min-w-[4rem]">
                <span className="text-xl font-bold text-[var(--color-mushaf-gold)]">{setupDays}</span>
                <span className="text-xs text-[var(--color-mushaf-text)]/50 mr-1"> {tx('days')}</span>
              </div>
            </div>
            <div className="text-xs text-[var(--color-mushaf-text)]/40 mt-1 text-center">
              ≈ {Math.ceil(TOTAL_PAGES / setupDays)} {tx('pagesDay')}
            </div>
          </div>

          {/* Start date + Reminder */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="page-frame p-4 rounded-xl">
              <label className="text-xs text-[var(--color-mushaf-text)]/60 block mb-2">
                {tx('startDate')}
              </label>
              <input
                type="date"
                value={setupDate}
                onChange={e => setSetupDate(e.target.value)}
                className="w-full bg-transparent border border-[var(--color-mushaf-border)] rounded-lg px-3 py-2 text-sm"
                dir="ltr"
              />
            </div>
            <div className="page-frame p-4 rounded-xl">
              <label className="text-xs text-[var(--color-mushaf-text)]/60 block mb-2">
                {tx('reminderTime')}
              </label>
              <input
                type="time"
                value={setupTime}
                onChange={e => setSetupTime(e.target.value)}
                className="w-full bg-transparent border border-[var(--color-mushaf-border)] rounded-lg px-3 py-2 text-sm"
                dir="ltr"
              />
            </div>
          </div>

          {/* Notifications */}
          <div className="page-frame p-4 rounded-xl flex items-center justify-between">
            <span className="text-sm">{tx('notifications')}</span>
            <button
              onClick={() => setSetupNotify(!setupNotify)}
              role="switch"
              aria-checked={setupNotify}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                setupNotify ? 'bg-[var(--color-mushaf-gold)]' : 'bg-[var(--color-mushaf-border)]/50'
              }`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                setupNotify ? 'right-0.5' : 'right-[calc(100%-1.375rem)]'
              }`} />
            </button>
          </div>

          {/* Start button */}
          <button
            onClick={handleCreate}
            className="w-full py-3 rounded-xl bg-[var(--color-mushaf-gold)] text-white font-bold text-lg hover:brightness-110 transition-all"
          >
            {tx('start')} 📖
          </button>

          {/* History */}
          {history.length > 0 && (
            <div className="page-frame p-4 rounded-xl">
              <h3 className="text-sm font-semibold text-[var(--color-mushaf-text)]/70 mb-3">
                {tx('history')}
              </h3>
              <div className="space-y-2">
                {history.map(h => (
                  <div key={h.id} className="flex items-center justify-between text-xs text-[var(--color-mushaf-text)]/60">
                    <span>{h.startDate} → {h.endDate}</span>
                    <span className={h.status === 'completed' ? 'text-[var(--color-topic-green)]' : 'text-[var(--color-topic-red)]'}>
                      {h.status === 'completed' ? '✓' : '✗'} {h.actualDays}/{h.targetDays} {tx('days')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════ DASHBOARD SCREEN ════ */}
      {screen === 'dashboard' && plan && progress && (
        <div className="space-y-5">

          {/* Off-track banner */}
          {!progress.onTrack && progress.missedDays > 0 && (
            <div className="page-frame p-4 rounded-xl border-2 border-[var(--color-topic-red)]/40 bg-[var(--color-topic-red)]/5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-[var(--color-topic-red)]">
                    {tx('offTrack')}
                  </div>
                  <div className="text-xs text-[var(--color-mushaf-text)]/50 mt-1">
                    {progress.missedDays} {tx('missed')} · {tx('adjusted')}: {progress.pagesPerDayAdjusted} {tx('pagesDay')}
                  </div>
                </div>
                <button
                  onClick={handleRecalculate}
                  className="px-4 py-2 rounded-lg bg-[var(--color-topic-red)] text-white text-sm font-medium hover:brightness-110 transition-all"
                >
                  {tx('recalculate')}
                </button>
              </div>
            </div>
          )}

          {/* Progress donut + stats row */}
          <div className="page-frame p-5 rounded-xl">
            <ProgressDonut percent={progress.percentComplete} />
            <div className="grid grid-cols-3 gap-3 mt-4 text-center">
              <div>
                <div className="text-xl font-bold text-[var(--color-topic-green)]">{progress.completedDays}</div>
                <div className="text-[10px] text-[var(--color-mushaf-text)]/50">{tx('completed')}</div>
              </div>
              <div>
                <div className="text-xl font-bold text-[var(--color-topic-red)]">{progress.missedDays}</div>
                <div className="text-[10px] text-[var(--color-mushaf-text)]/50">{tx('missed')}</div>
              </div>
              <div>
                <div className="text-xl font-bold text-[var(--color-mushaf-gold)]">{progress.remainingDays}</div>
                <div className="text-[10px] text-[var(--color-mushaf-text)]/50">{tx('remaining')}</div>
              </div>
            </div>
          </div>

          {/* Today's reading card */}
          {progress.todaySchedule && (
            <div className={`page-frame p-5 rounded-xl ${
              progress.todaySchedule.completed
                ? 'border-2 border-[var(--color-topic-green)]/40 bg-[var(--color-topic-green)]/5'
                : 'border-2 border-[var(--color-mushaf-gold)]/40'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--color-mushaf-gold)]">
                  📖 {tx('todayReading')}
                </h3>
                {progress.todaySchedule.completed && (
                  <span className="text-xs font-bold text-[var(--color-topic-green)]">✓ {tx('completed')}</span>
                )}
              </div>

              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm text-[var(--color-mushaf-text)]/70">
                    {tx('day')} {progress.todaySchedule.day} — {tx('pages')}: {progress.todaySchedule.startPage}–{progress.todaySchedule.endPage}
                  </div>
                  <div className="text-xs text-[var(--color-mushaf-text)]/40 mt-1">
                    {progress.todaySchedule.pagesCount} {tx('page')}
                  </div>
                </div>
                {onGoToPage && (
                  <button
                    onClick={() => onGoToPage(progress.todaySchedule!.startPage)}
                    className="px-3 py-1.5 rounded-lg bg-[var(--color-mushaf-border)]/20 text-xs hover:bg-[var(--color-mushaf-border)]/40 transition-colors"
                  >
                    {tx('goToPage')} →
                  </button>
                )}
              </div>

              {/* Topic breakdown for today */}
              {todayTopics.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[var(--color-mushaf-border)]/20">
                  <div className="text-xs font-medium text-[var(--color-mushaf-text)]/50 mb-2">
                    {tx('topicsToday')}
                  </div>
                  <TopicBar topics={todayTopics} lang={lang} />
                </div>
              )}

              {/* Mark complete button */}
              {!progress.todaySchedule.completed && (
                <button
                  onClick={() => handleMarkComplete(progress.todaySchedule!.day)}
                  className="w-full mt-4 py-2.5 rounded-xl bg-[var(--color-mushaf-gold)] text-white font-bold hover:brightness-110 transition-all"
                >
                  {tx('markComplete')}
                </button>
              )}
            </div>
          )}

          {/* Daily bar chart */}
          <div className="page-frame p-4 rounded-xl">
            <h3 className="text-sm font-semibold text-[var(--color-mushaf-text)]/70 mb-3">
              {tx('schedule')}
            </h3>
            <DailyBarChart schedule={plan.dailySchedule} lang={lang} onDayClick={handleDayClick} />
            {/* Legend */}
            <div className="flex gap-4 mt-3 text-[10px] text-[var(--color-mushaf-text)]/50 justify-center">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-topic-green)] inline-block" /> {tx('completed')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-mushaf-gold)] inline-block" /> {lang === 'ar' ? 'اليوم' : 'Today'}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-topic-red)]/80 inline-block" /> {tx('missed')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-mushaf-border)]/30 inline-block" /> {tx('remaining')}
              </span>
            </div>
          </div>

          {/* Mini Calendar */}
          <div className="page-frame p-4 rounded-xl">
            <h3 className="text-sm font-semibold text-[var(--color-mushaf-text)]/70 mb-3">
              {tx('calendarView')}
            </h3>
            <MiniCalendar schedule={plan.dailySchedule} lang={lang} />
          </div>

          {/* On track badge */}
          {progress.onTrack && (
            <div className="text-center py-2">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[var(--color-topic-green)]/10 text-[var(--color-topic-green)] text-sm font-semibold">
                {tx('onTrack')}
              </span>
            </div>
          )}

          {/* Abandon */}
          <div className="text-center pt-2">
            <button
              onClick={handleAbandon}
              className="text-xs text-[var(--color-mushaf-text)]/30 hover:text-[var(--color-topic-red)] transition-colors"
            >
              {tx('abandon')}
            </button>
          </div>
        </div>
      )}

      {/* ════ DAY DETAIL SCREEN ════ */}
      {screen === 'day-detail' && selectedDay && (
        <div className="space-y-5">
          <button
            onClick={() => setScreen('dashboard')}
            className="text-sm text-[var(--color-mushaf-gold)] hover:underline"
          >
            ← {tx('progress')}
          </button>

          <div className="page-frame p-5 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--color-mushaf-gold)]">
                {tx('day')} {selectedDay.day}
              </h3>
              <span className={`text-xs font-bold ${
                selectedDay.completed ? 'text-[var(--color-topic-green)]' : 'text-[var(--color-mushaf-text)]/40'
              }`}>
                {selectedDay.completed ? `✓ ${tx('completed')}` : selectedDay.date}
              </span>
            </div>

            <div className="text-sm text-[var(--color-mushaf-text)]/70 mb-2">
              {tx('pages')}: {selectedDay.startPage} – {selectedDay.endPage}
              <span className="text-[var(--color-mushaf-text)]/40 mr-2"> ({selectedDay.pagesCount} {tx('page')})</span>
            </div>

            {onGoToPage && (
              <button
                onClick={() => onGoToPage(selectedDay.startPage)}
                className="px-4 py-2 rounded-lg bg-[var(--color-mushaf-gold)]/10 text-[var(--color-mushaf-gold)] text-sm font-medium hover:bg-[var(--color-mushaf-gold)]/20 transition-colors mb-4"
              >
                {tx('goToPage')} {selectedDay.startPage} →
              </button>
            )}

            {/* Topics for this day */}
            {selectedDayTopics.length > 0 && (
              <div className="pt-3 border-t border-[var(--color-mushaf-border)]/20">
                <div className="text-xs font-medium text-[var(--color-mushaf-text)]/50 mb-3">
                  {tx('topicsToday')}
                </div>
                <TopicBar topics={selectedDayTopics} lang={lang} />
                <div className="mt-3 space-y-1.5">
                  {selectedDayTopics.map(t => (
                    <div key={t.topicId} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: COLOR_HEX[t.color] || '#888' }} />
                        {lang === 'ar' ? t.name_ar : t.name_en}
                      </span>
                      <span className="text-[var(--color-mushaf-text)]/40">
                        {t.verseCount} {tx('verse')} ({t.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mark complete if not done */}
            {!selectedDay.completed && (
              <button
                onClick={() => {
                  handleMarkComplete(selectedDay.day);
                  setScreen('dashboard');
                }}
                className="w-full mt-4 py-2.5 rounded-xl bg-[var(--color-mushaf-gold)] text-white font-bold hover:brightness-110 transition-all"
              >
                {tx('markComplete')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ════ CELEBRATION SCREEN ════ */}
      {screen === 'celebration' && (
        <div className="text-center space-y-6 py-8">
          <div className="text-6xl">🎉</div>
          <div className="text-xl font-bold text-[var(--color-mushaf-gold)]">
            {tx('celebration')}
          </div>
          {plan && (
            <div className="text-sm text-[var(--color-mushaf-text)]/60">
              {plan.dailySchedule.filter(d => d.completed).length} {tx('doneInDays')}
            </div>
          )}
          <button
            onClick={handleNewPlan}
            className="px-6 py-3 rounded-xl bg-[var(--color-mushaf-gold)] text-white font-bold hover:brightness-110 transition-all"
          >
            {tx('newPlan')} 📖
          </button>
        </div>
      )}
    </div>
  );
}
