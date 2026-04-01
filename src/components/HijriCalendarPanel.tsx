'use client';

import { useState, useMemo, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import {
  getTodayHijri,
  getMonthGrid,
  getUpcomingOccasions,
  getTodayOccasions,
  generateKhatmaPlan,
  getRamadanKhatmaSuggestion,
  generateICSForKhatma,
  generateICSForOccasions,
  downloadICSFile,
  HIJRI_MONTHS,
  ISLAMIC_OCCASIONS,
  daysInHijriMonth,
  gregorianToHijri,
  hijriToGregorian,
  type HijriDate,
  type KhatmaPlan,
  type KhatmaPreset,
  type IslamicOccasion,
  type CalendarCell,
} from '@/lib/hijriCalendar';

interface HijriCalendarPanelProps {
  onGoToPage: (page: number) => void;
}

type SubTab = 'calendar' | 'occasions' | 'khatma';

export default function HijriCalendarPanel({ onGoToPage }: HijriCalendarPanelProps) {
  const { lang } = useI18n();
  const isAr = lang === 'ar';

  const todayHijri = useMemo(() => getTodayHijri(), []);
  const [viewYear, setViewYear] = useState(todayHijri.year);
  const [viewMonth, setViewMonth] = useState(todayHijri.month);
  const [subTab, setSubTab] = useState<SubTab>('calendar');
  const [selectedOccasion, setSelectedOccasion] = useState<IslamicOccasion | null>(null);

  // Khatma state
  const [khatmaPreset, setKhatmaPreset] = useState<KhatmaPreset>('ramadan_30');
  const [customDays, setCustomDays] = useState(30);
  const [activePlan, setActivePlan] = useState<KhatmaPlan | null>(null);

  const ramadanSuggestion = useMemo(() => getRamadanKhatmaSuggestion(), []);

  const upcomingOccasions = useMemo(() => getUpcomingOccasions(120), []);
  const todayOccasions = useMemo(() => getTodayOccasions(), []);

  const grid = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const navigateMonth = useCallback((delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setViewMonth(m);
    setViewYear(y);
  }, [viewMonth, viewYear]);

  const goToToday = useCallback(() => {
    setViewYear(todayHijri.year);
    setViewMonth(todayHijri.month);
  }, [todayHijri]);

  const createKhatma = useCallback(() => {
    const plan = generateKhatmaPlan({
      preset: khatmaPreset,
      customDays: khatmaPreset === 'custom' ? customDays : undefined,
    });
    setActivePlan(plan);
  }, [khatmaPreset, customDays]);

  const exportKhatmaICS = useCallback(() => {
    if (!activePlan) return;
    const ics = generateICSForKhatma(activePlan, lang);
    downloadICSFile(ics, `khatma-${activePlan.totalDays}days.ics`);
  }, [activePlan, lang]);

  const exportOccasionsICS = useCallback(() => {
    const ics = generateICSForOccasions(
      upcomingOccasions.map(o => ({ occasion: o.occasion, gregorianDate: o.gregorianDate })),
      lang
    );
    downloadICSFile(ics, 'islamic-occasions.ics');
  }, [upcomingOccasions, lang]);

  const toggleDayComplete = useCallback((dayIndex: number) => {
    if (!activePlan) return;
    setActivePlan(prev => {
      if (!prev) return null;
      const updated = { ...prev, dailySchedule: [...prev.dailySchedule] };
      updated.dailySchedule[dayIndex] = {
        ...updated.dailySchedule[dayIndex],
        isCompleted: !updated.dailySchedule[dayIndex].isCompleted,
      };
      return updated;
    });
  }, [activePlan]);

  // ─── Sub-tab buttons ──────────────────────────────────────────

  const subTabs: { key: SubTab; ar: string; en: string; icon: string }[] = [
    { key: 'calendar', ar: 'التقويم', en: 'Calendar', icon: '📅' },
    { key: 'occasions', ar: 'المناسبات', en: 'Occasions', icon: '🌙' },
    { key: 'khatma', ar: 'الختمة', en: 'Khatma', icon: '📖' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      {/* Header — Today's Hijri Date */}
      <div className="bg-gradient-to-r from-[var(--color-mushaf-gold)]/20 to-transparent rounded-xl p-4 border border-[var(--color-mushaf-gold)]/30">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-sm opacity-70">{isAr ? 'التاريخ الهجري اليوم' : "Today's Hijri Date"}</p>
            <p className="text-2xl font-bold text-[var(--color-mushaf-gold)]">
              {todayHijri.day} {isAr ? todayHijri.monthName.ar : todayHijri.monthName.en} {todayHijri.year}
            </p>
            <p className="text-sm opacity-60">
              {isAr ? todayHijri.dayName.ar : todayHijri.dayName.en} — {todayHijri.gregorian.toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          {todayOccasions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {todayOccasions.map(o => (
                <span key={o.id} className="px-3 py-1 rounded-full text-sm font-medium text-white" style={{ backgroundColor: o.color }}>
                  {o.icon} {isAr ? o.name.ar : o.name.en}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ramadan Auto-Suggestion Banner */}
      {ramadanSuggestion && subTab !== 'khatma' && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg p-3 flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="font-medium text-blue-800 dark:text-blue-200">
              🌙 {isAr ? 'رمضان مبارك! هل تريد إنشاء خطة ختمة؟' : 'Ramadan Mubarak! Would you like to create a Khatma plan?'}
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-300">
              {isAr
                ? `${ramadanSuggestion.totalDays} يوم متبقي — ${ramadanSuggestion.pagesPerDay} صفحة/يوم`
                : `${ramadanSuggestion.totalDays} days left — ${ramadanSuggestion.pagesPerDay} pages/day`}
            </p>
          </div>
          <button
            onClick={() => { setActivePlan(ramadanSuggestion); setSubTab('khatma'); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {isAr ? 'إنشاء الخطة' : 'Create Plan'}
          </button>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-[var(--color-mushaf-border)] pb-2">
        {subTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              subTab === tab.key
                ? 'bg-[var(--color-mushaf-gold)] text-white'
                : 'hover:bg-[var(--color-mushaf-border)]/30'
            }`}
          >
            {tab.icon} {isAr ? tab.ar : tab.en}
          </button>
        ))}
      </div>

      {/* ═══ Calendar Tab ═══ */}
      {subTab === 'calendar' && (
        <CalendarView
          grid={grid}
          viewYear={viewYear}
          viewMonth={viewMonth}
          todayHijri={todayHijri}
          isAr={isAr}
          onNavigateMonth={navigateMonth}
          onGoToToday={goToToday}
          onSelectOccasion={occ => { setSelectedOccasion(occ); setSubTab('occasions'); }}
        />
      )}

      {/* ═══ Occasions Tab ═══ */}
      {subTab === 'occasions' && (
        <OccasionsView
          upcomingOccasions={upcomingOccasions}
          selectedOccasion={selectedOccasion}
          isAr={isAr}
          onGoToPage={onGoToPage}
          onSelectOccasion={setSelectedOccasion}
          onExportICS={exportOccasionsICS}
        />
      )}

      {/* ═══ Khatma Tab ═══ */}
      {subTab === 'khatma' && (
        <KhatmaView
          activePlan={activePlan}
          khatmaPreset={khatmaPreset}
          customDays={customDays}
          isAr={isAr}
          onPresetChange={setKhatmaPreset}
          onCustomDaysChange={setCustomDays}
          onCreateKhatma={createKhatma}
          onToggleDayComplete={toggleDayComplete}
          onGoToPage={onGoToPage}
          onExportICS={exportKhatmaICS}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Calendar View
// ═══════════════════════════════════════════════════════════════

function CalendarView({ grid, viewYear, viewMonth, todayHijri, isAr, onNavigateMonth, onGoToToday, onSelectOccasion }: {
  grid: CalendarCell[];
  viewYear: number;
  viewMonth: number;
  todayHijri: { year: number; month: number; day: number };
  isAr: boolean;
  onNavigateMonth: (d: number) => void;
  onGoToToday: () => void;
  onSelectOccasion: (o: IslamicOccasion) => void;
}) {
  const monthName = isAr ? HIJRI_MONTHS[viewMonth - 1].ar : HIJRI_MONTHS[viewMonth - 1].en;
  const dayHeaders = isAr
    ? ['أحد', 'اثن', 'ثلا', 'أرب', 'خمس', 'جمع', 'سبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Which day of week does day 1 fall on?
  const firstDayDow = grid.length > 0 ? grid[0].gregorianDate.getDay() : 0;

  return (
    <div className="space-y-3">
      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <button onClick={() => onNavigateMonth(-1)} className="p-2 rounded-lg hover:bg-[var(--color-mushaf-border)]/30 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isAr ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} />
          </svg>
        </button>
        <div className="text-center">
          <h3 className="text-xl font-bold">{monthName} {viewYear}</h3>
          {(viewYear !== todayHijri.year || viewMonth !== todayHijri.month) && (
            <button onClick={onGoToToday} className="text-xs text-[var(--color-mushaf-gold)] hover:underline">
              {isAr ? 'العودة لليوم' : 'Go to Today'}
            </button>
          )}
        </div>
        <button onClick={() => onNavigateMonth(1)} className="p-2 rounded-lg hover:bg-[var(--color-mushaf-border)]/30 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isAr ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {dayHeaders.map(d => (
          <div key={d} className="text-center text-xs font-medium opacity-60 py-1">{d}</div>
        ))}

        {/* Empty cells before first day */}
        {Array.from({ length: firstDayDow }).map((_, i) => (
          <div key={`empty-${i}`} className="h-16" />
        ))}

        {/* Calendar cells */}
        {grid.map(cell => {
          const hasOccasion = cell.occasions.length > 0;
          const occasionData = hasOccasion
            ? ISLAMIC_OCCASIONS.find(o => o.id === cell.occasions[0])
            : null;

          return (
            <button
              key={cell.hijriDay}
              onClick={() => {
                if (occasionData) onSelectOccasion(occasionData);
              }}
              className={`h-16 rounded-lg border text-center flex flex-col items-center justify-center gap-0.5 transition-colors ${
                cell.isToday
                  ? 'border-[var(--color-mushaf-gold)] bg-[var(--color-mushaf-gold)]/20 font-bold'
                  : hasOccasion
                    ? 'border-current/20 hover:bg-[var(--color-mushaf-border)]/20'
                    : 'border-transparent hover:bg-[var(--color-mushaf-border)]/10'
              }`}
              style={hasOccasion ? { color: occasionData?.color } : undefined}
            >
              <span className={`text-sm ${cell.isToday ? 'text-[var(--color-mushaf-gold)]' : ''}`}>
                {cell.hijriDay}
              </span>
              <span className="text-[10px] opacity-50">
                {cell.gregorianDate.getDate()}/{cell.gregorianDate.getMonth() + 1}
              </span>
              {hasOccasion && <span className="text-xs">{occasionData?.icon}</span>}
            </button>
          );
        })}
      </div>

      {/* Occasion legend for this month */}
      {grid.some(c => c.occasions.length > 0) && (
        <div className="mt-3 space-y-1">
          <p className="text-xs font-medium opacity-60">{isAr ? 'مناسبات هذا الشهر:' : 'This month\'s occasions:'}</p>
          <div className="flex flex-wrap gap-2">
            {[...new Set(grid.flatMap(c => c.occasions))].map(occId => {
              const occ = ISLAMIC_OCCASIONS.find(o => o.id === occId)!;
              return (
                <button
                  key={occId}
                  onClick={() => onSelectOccasion(occ)}
                  className="px-2 py-1 rounded-full text-xs text-white hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: occ.color }}
                >
                  {occ.icon} {isAr ? occ.name.ar : occ.name.en}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Occasions View
// ═══════════════════════════════════════════════════════════════

function OccasionsView({ upcomingOccasions, selectedOccasion, isAr, onGoToPage, onSelectOccasion, onExportICS }: {
  upcomingOccasions: { occasion: IslamicOccasion; hijriDate: HijriDate; gregorianDate: Date; daysUntil: number }[];
  selectedOccasion: IslamicOccasion | null;
  isAr: boolean;
  onGoToPage: (p: number) => void;
  onSelectOccasion: (o: IslamicOccasion | null) => void;
  onExportICS: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Export button */}
      <div className="flex justify-between items-center">
        <h3 className="font-bold">{isAr ? 'المناسبات القادمة' : 'Upcoming Occasions'}</h3>
        <button
          onClick={onExportICS}
          className="px-3 py-1.5 rounded-lg text-xs border border-[var(--color-mushaf-gold)] text-[var(--color-mushaf-gold)] hover:bg-[var(--color-mushaf-gold)]/10 transition-colors"
        >
          📅 {isAr ? 'تصدير للتقويم (.ics)' : 'Export to Calendar (.ics)'}
        </button>
      </div>

      {/* Selected Occasion Detail */}
      {selectedOccasion && (
        <div className="rounded-xl border-2 p-4 space-y-3" style={{ borderColor: selectedOccasion.color }}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-2xl">{selectedOccasion.icon}</p>
              <h3 className="text-lg font-bold" style={{ color: selectedOccasion.color }}>
                {isAr ? selectedOccasion.name.ar : selectedOccasion.name.en}
              </h3>
              <p className="text-sm opacity-70">
                {isAr ? selectedOccasion.description.ar : selectedOccasion.description.en}
              </p>
            </div>
            <button onClick={() => onSelectOccasion(null)} className="text-sm opacity-50 hover:opacity-100">✕</button>
          </div>

          {/* Suggested readings */}
          <div>
            <p className="text-sm font-medium mb-2">{isAr ? 'قراءات مقترحة:' : 'Suggested Readings:'}</p>
            <div className="flex flex-wrap gap-2">
              {selectedOccasion.suggestedPages.map((page, i) => (
                <button
                  key={i}
                  onClick={() => onGoToPage(page)}
                  className="px-3 py-1.5 rounded-lg text-xs border hover:bg-[var(--color-mushaf-gold)]/10 transition-colors"
                  style={{ borderColor: selectedOccasion.color, color: selectedOccasion.color }}
                >
                  {isAr ? `سورة ${selectedOccasion.suggestedSurahs[i]} — ص${page}` : `Surah ${selectedOccasion.suggestedSurahs[i]} — p.${page}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upcoming list */}
      <div className="space-y-2">
        {upcomingOccasions.map(({ occasion, hijriDate, gregorianDate, daysUntil }) => (
          <button
            key={`${occasion.id}-${daysUntil}`}
            onClick={() => onSelectOccasion(occasion)}
            className={`w-full text-start flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-[var(--color-mushaf-border)]/10 ${
              selectedOccasion?.id === occasion.id ? 'border-current/40' : 'border-[var(--color-mushaf-border)]'
            }`}
          >
            <span className="text-2xl">{occasion.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate" style={{ color: occasion.color }}>
                {isAr ? occasion.name.ar : occasion.name.en}
              </p>
              <p className="text-xs opacity-60">
                {hijriDate.day} {isAr ? HIJRI_MONTHS[hijriDate.month - 1].ar : HIJRI_MONTHS[hijriDate.month - 1].en} — {gregorianDate.toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
            <div className="text-end shrink-0">
              {daysUntil === 0 ? (
                <span className="px-2 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: occasion.color }}>
                  {isAr ? 'اليوم!' : 'Today!'}
                </span>
              ) : (
                <span className="text-sm opacity-60">
                  {isAr ? `بعد ${daysUntil} يوم` : `in ${daysUntil} days`}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Khatma Planner View
// ═══════════════════════════════════════════════════════════════

function KhatmaView({ activePlan, khatmaPreset, customDays, isAr, onPresetChange, onCustomDaysChange, onCreateKhatma, onToggleDayComplete, onGoToPage, onExportICS }: {
  activePlan: KhatmaPlan | null;
  khatmaPreset: KhatmaPreset;
  customDays: number;
  isAr: boolean;
  onPresetChange: (p: KhatmaPreset) => void;
  onCustomDaysChange: (d: number) => void;
  onCreateKhatma: () => void;
  onToggleDayComplete: (i: number) => void;
  onGoToPage: (p: number) => void;
  onExportICS: () => void;
}) {
  const presets: { key: KhatmaPreset; ar: string; en: string; desc: { ar: string; en: string } }[] = [
    { key: 'ramadan_30', ar: 'ختمة رمضان', en: 'Ramadan (30d)', desc: { ar: '~20 صفحة/يوم', en: '~20 pages/day' } },
    { key: 'ramadan_15', ar: 'نصف رمضان', en: 'Half Ramadan (15d)', desc: { ar: '~41 صفحة/يوم', en: '~41 pages/day' } },
    { key: 'monthly', ar: 'شهرية', en: 'Monthly (30d)', desc: { ar: '~20 صفحة/يوم', en: '~20 pages/day' } },
    { key: 'weekly', ar: 'أسبوعية', en: 'Weekly (7d)', desc: { ar: '~87 صفحة/يوم', en: '~87 pages/day' } },
    { key: 'custom', ar: 'مخصصة', en: 'Custom', desc: { ar: 'حدد عدد الأيام', en: 'Set number of days' } },
  ];

  const completedDays = activePlan?.dailySchedule.filter(d => d.isCompleted).length ?? 0;
  const totalDays = activePlan?.totalDays ?? 0;
  const progressPercent = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Create Plan */}
      {!activePlan && (
        <div className="space-y-4">
          <h3 className="font-bold">{isAr ? 'إنشاء خطة ختمة' : 'Create Khatma Plan'}</h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {presets.map(p => (
              <button
                key={p.key}
                onClick={() => onPresetChange(p.key)}
                className={`p-3 rounded-lg border text-start transition-colors ${
                  khatmaPreset === p.key
                    ? 'border-[var(--color-mushaf-gold)] bg-[var(--color-mushaf-gold)]/10'
                    : 'border-[var(--color-mushaf-border)] hover:border-[var(--color-mushaf-gold)]/50'
                }`}
              >
                <p className="font-medium text-sm">{isAr ? p.ar : p.en}</p>
                <p className="text-xs opacity-60">{isAr ? p.desc.ar : p.desc.en}</p>
              </button>
            ))}
          </div>

          {khatmaPreset === 'custom' && (
            <div className="flex items-center gap-2">
              <label className="text-sm">{isAr ? 'عدد الأيام:' : 'Number of days:'}</label>
              <input
                type="number"
                min={1}
                max={365}
                value={customDays}
                onChange={e => onCustomDaysChange(Math.max(1, Math.min(365, parseInt(e.target.value) || 30)))}
                className="w-20 px-2 py-1 rounded border border-[var(--color-mushaf-border)] bg-transparent text-center"
              />
              <span className="text-xs opacity-60">
                ({Math.ceil(604 / customDays)} {isAr ? 'صفحة/يوم' : 'pages/day'})
              </span>
            </div>
          )}

          <button
            onClick={onCreateKhatma}
            className="w-full py-3 rounded-lg bg-[var(--color-mushaf-gold)] text-white font-medium hover:opacity-90 transition-opacity"
          >
            📖 {isAr ? 'إنشاء الخطة' : 'Create Plan'}
          </button>
        </div>
      )}

      {/* Active Plan */}
      {activePlan && (
        <div className="space-y-4">
          {/* Plan header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold">{isAr ? activePlan.name.ar : activePlan.name.en}</h3>
              <p className="text-xs opacity-60">
                {isAr ? `${activePlan.pagesPerDay} صفحة/يوم` : `${activePlan.pagesPerDay} pages/day`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onExportICS}
                className="px-3 py-1.5 rounded-lg text-xs border border-[var(--color-mushaf-gold)] text-[var(--color-mushaf-gold)] hover:bg-[var(--color-mushaf-gold)]/10 transition-colors"
              >
                📅 {isAr ? 'تصدير' : 'Export'}
              </button>
              <button
                onClick={() => {/* reset handled by parent */}}
                className="px-3 py-1.5 rounded-lg text-xs border border-red-400 text-red-400 hover:bg-red-400/10 transition-colors"
              >
                {isAr ? 'خطة جديدة' : 'New Plan'}
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>{isAr ? `${completedDays} من ${totalDays} يوم` : `${completedDays} of ${totalDays} days`}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-3 rounded-full bg-[var(--color-mushaf-border)]/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--color-mushaf-gold)] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Daily schedule */}
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {activePlan.dailySchedule.map((day, i) => {
              if (day.pagesCount === 0) return null;
              const isToday = isSameDay(day.date, new Date());
              return (
                <div
                  key={day.day}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    isToday ? 'bg-[var(--color-mushaf-gold)]/10 border border-[var(--color-mushaf-gold)]/30' : ''
                  } ${day.isCompleted ? 'opacity-60' : ''}`}
                >
                  <button
                    onClick={() => onToggleDayComplete(i)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      day.isCompleted
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-[var(--color-mushaf-border)] hover:border-[var(--color-mushaf-gold)]'
                    }`}
                  >
                    {day.isCompleted && '✓'}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {isAr ? `يوم ${day.day}` : `Day ${day.day}`}
                      </span>
                      {isToday && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--color-mushaf-gold)] text-white">
                          {isAr ? 'اليوم' : 'TODAY'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs opacity-60">
                      {isAr ? `صفحة ${day.startPage}–${day.endPage}` : `Pages ${day.startPage}–${day.endPage}`}
                      {' · '}
                      {day.date.toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>

                  <button
                    onClick={() => onGoToPage(day.startPage)}
                    className="px-2 py-1 rounded text-xs border border-[var(--color-mushaf-gold)] text-[var(--color-mushaf-gold)] hover:bg-[var(--color-mushaf-gold)]/10 transition-colors shrink-0"
                  >
                    {isAr ? 'اقرأ' : 'Read'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
