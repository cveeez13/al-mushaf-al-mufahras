/**
 * Hijri Calendar — Pure algorithmic Hijri ↔ Gregorian conversion,
 * Islamic occasions detection, and Khatma (ختمة) scheduling.
 *
 * Algorithm: Kuwaiti algorithm (tabular / civil Hijri calendar)
 * — widely used, same base as Umm al-Qura for most dates.
 */

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

export interface HijriDate {
  year: number;
  month: number; // 1-12
  day: number;   // 1-29/30
}

export interface HijriDateInfo extends HijriDate {
  monthName: { ar: string; en: string };
  dayOfWeek: number; // 0=Sun, 6=Sat
  dayName: { ar: string; en: string };
  gregorian: Date;
}

export type OccasionId =
  | 'ramadan'
  | 'laylat_al_qadr'
  | 'eid_al_fitr'
  | 'dhul_hijjah_first10'
  | 'day_of_arafah'
  | 'eid_al_adha'
  | 'ashura'
  | 'tasu_a'
  | 'mawlid'
  | 'isra_miraj'
  | 'shaban_mid'
  | 'muharram_new_year';

export interface IslamicOccasion {
  id: OccasionId;
  name: { ar: string; en: string };
  hijriMonth: number;
  hijriDays: number[];       // day(s) within that month
  priority: number;          // 1 = highest
  color: string;
  icon: string;
  suggestedSurahs: number[]; // Surah numbers
  suggestedPages: number[];  // Page ranges (start pages)
  description: { ar: string; en: string };
}

export interface KhatmaPlan {
  id: string;
  name: { ar: string; en: string };
  totalDays: number;
  pagesPerDay: number;
  startDate: Date;
  endDate: Date;
  startHijri: HijriDate;
  endHijri: HijriDate;
  dailySchedule: KhatmaDay[];
}

export interface KhatmaDay {
  day: number;        // 1-based
  date: Date;
  hijriDate: HijriDate;
  startPage: number;
  endPage: number;
  pagesCount: number;
  isCompleted: boolean;
}

// ───────────────────────────────────────────────────────────────
// Hijri Month Names
// ───────────────────────────────────────────────────────────────

export const HIJRI_MONTHS: { ar: string; en: string }[] = [
  { ar: 'محرم', en: 'Muharram' },
  { ar: 'صفر', en: 'Safar' },
  { ar: 'ربيع الأول', en: "Rabi' al-Awwal" },
  { ar: 'ربيع الثاني', en: "Rabi' al-Thani" },
  { ar: 'جمادى الأولى', en: 'Jumada al-Ula' },
  { ar: 'جمادى الآخرة', en: 'Jumada al-Akhirah' },
  { ar: 'رجب', en: 'Rajab' },
  { ar: 'شعبان', en: "Sha'ban" },
  { ar: 'رمضان', en: 'Ramadan' },
  { ar: 'شوال', en: 'Shawwal' },
  { ar: 'ذو القعدة', en: "Dhul Qi'dah" },
  { ar: 'ذو الحجة', en: 'Dhul Hijjah' },
];

const DAY_NAMES: { ar: string; en: string }[] = [
  { ar: 'الأحد', en: 'Sunday' },
  { ar: 'الاثنين', en: 'Monday' },
  { ar: 'الثلاثاء', en: 'Tuesday' },
  { ar: 'الأربعاء', en: 'Wednesday' },
  { ar: 'الخميس', en: 'Thursday' },
  { ar: 'الجمعة', en: 'Friday' },
  { ar: 'السبت', en: 'Saturday' },
];

// ───────────────────────────────────────────────────────────────
// Gregorian → Hijri (Kuwaiti Algorithm)
// ───────────────────────────────────────────────────────────────

export function gregorianToHijri(date: Date): HijriDate {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  // Convert Gregorian to Julian Day Number
  let gy = d.getFullYear();
  let gm = d.getMonth() + 1;
  const gd = d.getDate();

  if (gm < 3) { gy--; gm += 12; }
  const A = Math.floor(gy / 100);
  const B = 2 - A + Math.floor(A / 4);
  const JD = Math.floor(365.25 * (gy + 4716)) + Math.floor(30.6001 * (gm + 1)) + gd + B - 1524.5;

  // Julian Day to Hijri (Islamic civil calendar / tabular)
  const epochJD = 1948439.5; // JD of 1 Muharram 1 AH (July 16, 622 CE)
  const daysSinceEpoch = JD - epochJD;

  // Each 30-year cycle has 10631 days
  const cycle30 = Math.floor((30 * daysSinceEpoch + 10646) / 10631);
  const yearDays = daysSinceEpoch - Math.floor((10631 * cycle30 - 10617) / 30);
  // Each 12-month cycle: odd months 30, even months 29 → total pair = 59
  const monthVal = Math.min(12, Math.ceil((yearDays + 0.5) / 29.5001));
  const dayVal = yearDays - Math.floor((59 * (monthVal - 1) + 1) / 2) + 1;

  return { year: cycle30, month: Math.max(1, monthVal), day: Math.max(1, Math.round(dayVal)) };
}

// ───────────────────────────────────────────────────────────────
// Hijri → Gregorian
// ───────────────────────────────────────────────────────────────

export function hijriToGregorian(h: HijriDate): Date {
  const { year, month, day } = h;

  // Hijri to Julian Day Number
  const JD = Math.floor((11 * year + 3) / 30) + 354 * year + 30 * month
    - Math.floor((month - 1) / 2) + day + 1948439.5 - 385;

  // Julian Day Number to Gregorian
  const Z = Math.floor(JD + 0.5);
  const A2 = Math.floor((Z - 1867216.25) / 36524.25);
  const A3 = Z + 1 + A2 - Math.floor(A2 / 4);
  const B2 = A3 + 1524;
  const C = Math.floor((B2 - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B2 - D) / 30.6001);

  const gDay = B2 - D - Math.floor(30.6001 * E);
  const gMonth = E < 14 ? E - 1 : E - 13;
  const gYear = gMonth > 2 ? C - 4716 : C - 4715;

  return new Date(gYear, gMonth - 1, gDay);
}

// ───────────────────────────────────────────────────────────────
// Full date info
// ───────────────────────────────────────────────────────────────

export function getHijriDateInfo(date: Date): HijriDateInfo {
  const h = gregorianToHijri(date);
  const dow = date.getDay();
  return {
    ...h,
    monthName: HIJRI_MONTHS[h.month - 1],
    dayOfWeek: dow,
    dayName: DAY_NAMES[dow],
    gregorian: date,
  };
}

export function getTodayHijri(): HijriDateInfo {
  return getHijriDateInfo(new Date());
}

// ───────────────────────────────────────────────────────────────
// Days in Hijri month (tabular calendar: 30/29 alternating + leap)
// ───────────────────────────────────────────────────────────────

function isHijriLeapYear(year: number): boolean {
  return [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29].includes(year % 30);
}

export function daysInHijriMonth(year: number, month: number): number {
  if (month % 2 === 1) return 30; // Odd months: 30 days
  if (month === 12 && isHijriLeapYear(year)) return 30; // Leap year: Dhul Hijjah = 30
  return 29; // Even months: 29 days
}

export function daysInHijriYear(year: number): number {
  return isHijriLeapYear(year) ? 355 : 354;
}

// ───────────────────────────────────────────────────────────────
// Calendar grid for a Hijri month
// ───────────────────────────────────────────────────────────────

export interface CalendarCell {
  hijriDay: number;
  gregorianDate: Date;
  isToday: boolean;
  isCurrentMonth: boolean;
  occasions: OccasionId[];
}

export function getMonthGrid(year: number, month: number): CalendarCell[] {
  const totalDays = daysInHijriMonth(year, month);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells: CalendarCell[] = [];
  for (let d = 1; d <= totalDays; d++) {
    const gDate = hijriToGregorian({ year, month, day: d });
    gDate.setHours(0, 0, 0, 0);
    const occasions = getOccasionsForDate({ year, month, day: d }).map(o => o.id);
    cells.push({
      hijriDay: d,
      gregorianDate: gDate,
      isToday: gDate.getTime() === today.getTime(),
      isCurrentMonth: true,
      occasions,
    });
  }
  return cells;
}

// ───────────────────────────────────────────────────────────────
// Islamic Occasions Database
// ───────────────────────────────────────────────────────────────

export const ISLAMIC_OCCASIONS: IslamicOccasion[] = [
  {
    id: 'muharram_new_year',
    name: { ar: 'رأس السنة الهجرية', en: 'Islamic New Year' },
    hijriMonth: 1, hijriDays: [1],
    priority: 3, color: '#4CAF50', icon: '🌙',
    suggestedSurahs: [1, 112, 113, 114],
    suggestedPages: [1],
    description: {
      ar: 'بداية العام الهجري الجديد — يُستحب الدعاء والتفكر',
      en: 'Beginning of the new Hijri year — supplication and reflection recommended',
    },
  },
  {
    id: 'tasu_a',
    name: { ar: 'تاسوعاء', en: "Tasu'a" },
    hijriMonth: 1, hijriDays: [9],
    priority: 4, color: '#FF9800', icon: '📿',
    suggestedSurahs: [2],
    suggestedPages: [2, 3, 4, 5],
    description: {
      ar: 'التاسع من محرم — يُستحب صيامه مع عاشوراء',
      en: '9th Muharram — Fasting recommended with Ashura',
    },
  },
  {
    id: 'ashura',
    name: { ar: 'عاشوراء', en: 'Ashura' },
    hijriMonth: 1, hijriDays: [10],
    priority: 2, color: '#FF5722', icon: '🕌',
    suggestedSurahs: [7, 10, 20, 26],
    suggestedPages: [151, 208, 312, 367],
    description: {
      ar: 'العاشر من محرم — يوم نجّى الله فيه موسى عليه السلام. يُستحب صيامه وقراءة قصص الأنبياء',
      en: '10th Muharram — Day Allah saved Musa (AS). Fasting & reading stories of prophets recommended',
    },
  },
  {
    id: 'mawlid',
    name: { ar: 'المولد النبوي', en: 'Mawlid an-Nabi' },
    hijriMonth: 3, hijriDays: [12],
    priority: 3, color: '#8BC34A', icon: '🌟',
    suggestedSurahs: [33, 48, 21],
    suggestedPages: [418, 511, 322],
    description: {
      ar: 'ذكرى مولد النبي ﷺ — قراءة السيرة النبوية والصلاة على النبي',
      en: 'Birthday of Prophet Muhammad ﷺ — Reading Seerah and sending salawat',
    },
  },
  {
    id: 'isra_miraj',
    name: { ar: 'الإسراء والمعراج', en: "Isra' & Mi'raj" },
    hijriMonth: 7, hijriDays: [27],
    priority: 3, color: '#673AB7', icon: '✨',
    suggestedSurahs: [17, 53],
    suggestedPages: [282, 526],
    description: {
      ar: 'ليلة الإسراء والمعراج — قراءة سورة الإسراء والنجم',
      en: "Night of Isra' & Mi'raj — Reading Surah Al-Isra and An-Najm",
    },
  },
  {
    id: 'shaban_mid',
    name: { ar: 'ليلة النصف من شعبان', en: 'Mid-Shaban Night' },
    hijriMonth: 8, hijriDays: [15],
    priority: 4, color: '#009688', icon: '🌕',
    suggestedSurahs: [36, 44],
    suggestedPages: [440, 496],
    description: {
      ar: 'ليلة النصف من شعبان — يُستحب الدعاء والاستغفار',
      en: 'Night of mid-Shaban — Supplication and seeking forgiveness',
    },
  },
  {
    id: 'ramadan',
    name: { ar: 'رمضان', en: 'Ramadan' },
    hijriMonth: 9, hijriDays: Array.from({ length: 30 }, (_, i) => i + 1),
    priority: 1, color: '#2196F3', icon: '🌙',
    suggestedSurahs: [2, 97, 44],
    suggestedPages: [2, 598, 496],
    description: {
      ar: 'شهر رمضان المبارك — شهر القرآن والصيام والقيام. يُستحب ختم القرآن',
      en: 'Blessed Ramadan — Month of Quran, fasting and prayer. Completing Quran recommended',
    },
  },
  {
    id: 'laylat_al_qadr',
    name: { ar: 'ليلة القدر', en: 'Laylat al-Qadr' },
    hijriMonth: 9, hijriDays: [21, 23, 25, 27, 29],
    priority: 1, color: '#FFD700', icon: '⭐',
    suggestedSurahs: [97, 44, 36, 67, 32],
    suggestedPages: [598, 496, 440, 562, 415],
    description: {
      ar: 'ليلة القدر خير من ألف شهر — العشر الأواخر من رمضان',
      en: 'Laylat al-Qadr is better than a thousand months — Last ten nights of Ramadan',
    },
  },
  {
    id: 'eid_al_fitr',
    name: { ar: 'عيد الفطر', en: 'Eid al-Fitr' },
    hijriMonth: 10, hijriDays: [1, 2, 3],
    priority: 1, color: '#E91E63', icon: '🎉',
    suggestedSurahs: [87, 88],
    suggestedPages: [591, 592],
    description: {
      ar: 'عيد الفطر المبارك — صلاة العيد وقراءة سورة الأعلى والغاشية',
      en: 'Blessed Eid al-Fitr — Eid prayer and reading Al-Ala & Al-Ghashiyah',
    },
  },
  {
    id: 'dhul_hijjah_first10',
    name: { ar: 'عشر ذي الحجة', en: 'First 10 of Dhul Hijjah' },
    hijriMonth: 12, hijriDays: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    priority: 1, color: '#795548', icon: '🕋',
    suggestedSurahs: [22, 2],
    suggestedPages: [332, 2],
    description: {
      ar: 'أفضل أيام الدنيا — يُستحب الذكر والتكبير والصيام والعمل الصالح',
      en: 'Best days of the world — Dhikr, Takbir, fasting and good deeds recommended',
    },
  },
  {
    id: 'day_of_arafah',
    name: { ar: 'يوم عرفة', en: 'Day of Arafah' },
    hijriMonth: 12, hijriDays: [9],
    priority: 1, color: '#FF9800', icon: '🤲',
    suggestedSurahs: [2, 5],
    suggestedPages: [2, 106],
    description: {
      ar: 'يوم عرفة — أفضل يوم طلعت عليه الشمس. صيامه يكفّر سنتين',
      en: 'Day of Arafah — Best day the sun has risen on. Fasting expiates two years of sins',
    },
  },
  {
    id: 'eid_al_adha',
    name: { ar: 'عيد الأضحى', en: 'Eid al-Adha' },
    hijriMonth: 12, hijriDays: [10, 11, 12, 13],
    priority: 1, color: '#F44336', icon: '🐑',
    suggestedSurahs: [37, 22, 108],
    suggestedPages: [446, 332, 602],
    description: {
      ar: 'عيد الأضحى المبارك — أيام التشريق والتكبير',
      en: 'Blessed Eid al-Adha — Days of Tashreeq and Takbir',
    },
  },
];

// ───────────────────────────────────────────────────────────────
// Occasion detection
// ───────────────────────────────────────────────────────────────

export function getOccasionsForDate(h: HijriDate): IslamicOccasion[] {
  return ISLAMIC_OCCASIONS.filter(
    o => o.hijriMonth === h.month && o.hijriDays.includes(h.day)
  ).sort((a, b) => a.priority - b.priority);
}

export function getTodayOccasions(): IslamicOccasion[] {
  return getOccasionsForDate(gregorianToHijri(new Date()));
}

export function getUpcomingOccasions(daysAhead: number = 90): { occasion: IslamicOccasion; hijriDate: HijriDate; gregorianDate: Date; daysUntil: number }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const results: { occasion: IslamicOccasion; hijriDate: HijriDate; gregorianDate: Date; daysUntil: number }[] = [];

  for (let i = 0; i <= daysAhead; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const h = gregorianToHijri(d);
    const occasions = getOccasionsForDate(h);
    for (const occ of occasions) {
      // Avoid duplicates (multi-day occasions: only add first day)
      if (!results.find(r => r.occasion.id === occ.id)) {
        results.push({ occasion: occ, hijriDate: h, gregorianDate: d, daysUntil: i });
      }
    }
  }

  return results.sort((a, b) => a.daysUntil - b.daysUntil);
}

// ───────────────────────────────────────────────────────────────
// Khatma Planner — Customized Quran completion plans
// ───────────────────────────────────────────────────────────────

const TOTAL_PAGES = 604;

export type KhatmaPreset = 'ramadan_30' | 'ramadan_15' | 'weekly' | 'monthly' | 'custom';

export interface KhatmaConfig {
  preset: KhatmaPreset;
  customDays?: number;
  startDate?: Date; // defaults to today
}

const PRESET_DAYS: Record<Exclude<KhatmaPreset, 'custom'>, number> = {
  ramadan_30: 30,
  ramadan_15: 15,
  weekly: 7,
  monthly: 30,
};

export function generateKhatmaPlan(config: KhatmaConfig): KhatmaPlan {
  const startDate = config.startDate ?? new Date();
  startDate.setHours(0, 0, 0, 0);

  const totalDays = config.preset === 'custom'
    ? Math.max(1, config.customDays ?? 30)
    : PRESET_DAYS[config.preset];

  const pagesPerDay = Math.ceil(TOTAL_PAGES / totalDays);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + totalDays - 1);

  const dailySchedule: KhatmaDay[] = [];
  let pageOffset = 0;

  for (let i = 0; i < totalDays; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const startPage = pageOffset + 1;
    const endPage = Math.min(pageOffset + pagesPerDay, TOTAL_PAGES);

    dailySchedule.push({
      day: i + 1,
      date,
      hijriDate: gregorianToHijri(date),
      startPage,
      endPage,
      pagesCount: endPage - startPage + 1,
      isCompleted: false,
    });

    pageOffset = endPage;
    if (pageOffset >= TOTAL_PAGES) {
      // Fill remaining days with 0 pages
      for (let j = i + 1; j < totalDays; j++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + j);
        dailySchedule.push({
          day: j + 1,
          date: d,
          hijriDate: gregorianToHijri(d),
          startPage: TOTAL_PAGES,
          endPage: TOTAL_PAGES,
          pagesCount: 0,
          isCompleted: false,
        });
      }
      break;
    }
  }

  const nameMap: Record<KhatmaPreset, { ar: string; en: string }> = {
    ramadan_30: { ar: 'ختمة رمضان (30 يوم)', en: 'Ramadan Khatma (30 days)' },
    ramadan_15: { ar: 'ختمة نصف رمضان (15 يوم)', en: 'Half-Ramadan Khatma (15 days)' },
    weekly: { ar: 'ختمة أسبوعية', en: 'Weekly Khatma' },
    monthly: { ar: 'ختمة شهرية (30 يوم)', en: 'Monthly Khatma (30 days)' },
    custom: { ar: `ختمة مخصصة (${totalDays} يوم)`, en: `Custom Khatma (${totalDays} days)` },
  };

  return {
    id: `khatma_${Date.now()}`,
    name: nameMap[config.preset],
    totalDays,
    pagesPerDay,
    startDate,
    endDate,
    startHijri: gregorianToHijri(startDate),
    endHijri: gregorianToHijri(endDate),
    dailySchedule,
  };
}

// ───────────────────────────────────────────────────────────────
// Auto Khatma for Ramadan — detects if we're in Ramadan
// ───────────────────────────────────────────────────────────────

export function getRamadanKhatmaSuggestion(): KhatmaPlan | null {
  const today = gregorianToHijri(new Date());
  if (today.month !== 9) return null; // Not Ramadan

  const daysLeft = daysInHijriMonth(today.year, 9) - today.day + 1;
  if (daysLeft < 1) return null;

  return generateKhatmaPlan({
    preset: 'custom',
    customDays: daysLeft,
    startDate: new Date(),
  });
}

// ───────────────────────────────────────────────────────────────
// Google Calendar ICS export (no API key needed)
// ───────────────────────────────────────────────────────────────

function formatICSDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function escapeICS(s: string): string {
  return s.replace(/[,;\\]/g, c => '\\' + c).replace(/\n/g, '\\n');
}

export function generateICSForKhatma(plan: KhatmaPlan, lang: 'ar' | 'en'): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Al-Mushaf Al-Mufahras//Khatma//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICS(lang === 'ar' ? plan.name.ar : plan.name.en)}`,
  ];

  for (const day of plan.dailySchedule) {
    if (day.pagesCount === 0) continue;
    const summary = lang === 'ar'
      ? `📖 ختمة: صفحة ${day.startPage}-${day.endPage}`
      : `📖 Khatma: Pages ${day.startPage}-${day.endPage}`;
    const desc = lang === 'ar'
      ? `اليوم ${day.day} من ${plan.totalDays} — ${day.pagesCount} صفحات`
      : `Day ${day.day} of ${plan.totalDays} — ${day.pagesCount} pages`;

    lines.push(
      'BEGIN:VEVENT',
      `DTSTART;VALUE=DATE:${formatICSDate(day.date)}`,
      `DTEND;VALUE=DATE:${formatICSDate(day.date)}`,
      `SUMMARY:${escapeICS(summary)}`,
      `DESCRIPTION:${escapeICS(desc)}`,
      `UID:khatma-${plan.id}-day${day.day}@mushaf`,
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function generateICSForOccasions(
  occasions: { occasion: IslamicOccasion; gregorianDate: Date }[],
  lang: 'ar' | 'en'
): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Al-Mushaf Al-Mufahras//Occasions//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${lang === 'ar' ? 'المناسبات الإسلامية' : 'Islamic Occasions'}`,
  ];

  for (const { occasion, gregorianDate } of occasions) {
    const name = lang === 'ar' ? occasion.name.ar : occasion.name.en;
    const desc = lang === 'ar' ? occasion.description.ar : occasion.description.en;
    lines.push(
      'BEGIN:VEVENT',
      `DTSTART;VALUE=DATE:${formatICSDate(gregorianDate)}`,
      `DTEND;VALUE=DATE:${formatICSDate(gregorianDate)}`,
      `SUMMARY:${escapeICS(occasion.icon + ' ' + name)}`,
      `DESCRIPTION:${escapeICS(desc)}`,
      `UID:occasion-${occasion.id}-${formatICSDate(gregorianDate)}@mushaf`,
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadICSFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
