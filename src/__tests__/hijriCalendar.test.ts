import { describe, it, expect } from 'vitest';
import {
  gregorianToHijri,
  hijriToGregorian,
  getHijriDateInfo,
  daysInHijriMonth,
  daysInHijriYear,
  getOccasionsForDate,
  getUpcomingOccasions,
  generateKhatmaPlan,
  getMonthGrid,
  generateICSForKhatma,
  generateICSForOccasions,
  HIJRI_MONTHS,
  ISLAMIC_OCCASIONS,
} from '@/lib/hijriCalendar';

describe('Hijri Calendar', () => {
  // ─── Conversion Tests ──────────────────────────────────────

  it('should convert known Gregorian date to Hijri', () => {
    // 2024-03-11 ≈ 1 Ramadan 1445
    const h = gregorianToHijri(new Date(2024, 2, 11));
    expect(h.year).toBe(1445);
    expect(h.month).toBe(9); // Ramadan
    expect(h.day).toBeGreaterThanOrEqual(1);
    expect(h.day).toBeLessThanOrEqual(2); // Tabular may differ by ±1
  });

  it('should convert Hijri to Gregorian and back (round-trip)', () => {
    const original = { year: 1446, month: 1, day: 1 };
    const greg = hijriToGregorian(original);
    const back = gregorianToHijri(greg);
    expect(back.year).toBe(original.year);
    expect(back.month).toBe(original.month);
    // Allow ±1 day difference due to tabular algorithm
    expect(Math.abs(back.day - original.day)).toBeLessThanOrEqual(1);
  });

  it('should convert multiple known dates', () => {
    // 2025-01-01 should be in Jumada al-Akhirah or Rajab 1446
    const h = gregorianToHijri(new Date(2025, 0, 1));
    expect(h.year).toBe(1446);
    expect(h.month).toBeGreaterThanOrEqual(6);
    expect(h.month).toBeLessThanOrEqual(7);
  });

  // ─── Date Info ─────────────────────────────────────────────

  it('getHijriDateInfo should return full info', () => {
    const info = getHijriDateInfo(new Date(2024, 0, 15));
    expect(info.year).toBeGreaterThan(1400);
    expect(info.monthName.ar).toBeTruthy();
    expect(info.monthName.en).toBeTruthy();
    expect(info.dayName.ar).toBeTruthy();
    expect(info.dayName.en).toBeTruthy();
    expect(info.dayOfWeek).toBeGreaterThanOrEqual(0);
    expect(info.dayOfWeek).toBeLessThanOrEqual(6);
    expect(info.gregorian).toBeInstanceOf(Date);
  });

  // ─── Month calculations ───────────────────────────────────

  it('should have 12 month names', () => {
    expect(HIJRI_MONTHS).toHaveLength(12);
    expect(HIJRI_MONTHS[0].ar).toBe('محرم');
    expect(HIJRI_MONTHS[8].en).toBe('Ramadan');
  });

  it('odd months should have 30 days', () => {
    expect(daysInHijriMonth(1445, 1)).toBe(30); // Muharram
    expect(daysInHijriMonth(1445, 3)).toBe(30); // Rabi al-Awwal
    expect(daysInHijriMonth(1445, 9)).toBe(30); // Ramadan
  });

  it('even non-leap months should have 29 days', () => {
    expect(daysInHijriMonth(1445, 2)).toBe(29); // Safar
    expect(daysInHijriMonth(1445, 4)).toBe(29); // Rabi al-Thani
  });

  it('Hijri year should be 354 or 355 days', () => {
    const y = daysInHijriYear(1445);
    expect([354, 355]).toContain(y);
  });

  // ─── Calendar Grid ────────────────────────────────────────

  it('getMonthGrid should return correct number of cells', () => {
    const grid = getMonthGrid(1445, 9); // Ramadan 1445
    expect(grid.length).toBe(30); // Ramadan always 30 (odd month)
    expect(grid[0].hijriDay).toBe(1);
    expect(grid[29].hijriDay).toBe(30);
    expect(grid[0].isCurrentMonth).toBe(true);
  });

  // ─── Occasions ────────────────────────────────────────────

  it('should have at least 10 occasions defined', () => {
    expect(ISLAMIC_OCCASIONS.length).toBeGreaterThanOrEqual(10);
  });

  it('all occasions should have required fields', () => {
    for (const occ of ISLAMIC_OCCASIONS) {
      expect(occ.id).toBeTruthy();
      expect(occ.name.ar).toBeTruthy();
      expect(occ.name.en).toBeTruthy();
      expect(occ.hijriMonth).toBeGreaterThanOrEqual(1);
      expect(occ.hijriMonth).toBeLessThanOrEqual(12);
      expect(occ.hijriDays.length).toBeGreaterThan(0);
      expect(occ.suggestedSurahs.length).toBeGreaterThan(0);
      expect(occ.suggestedPages.length).toBeGreaterThan(0);
      expect(occ.icon).toBeTruthy();
      expect(occ.color).toMatch(/^#/);
      expect(occ.description.ar).toBeTruthy();
      expect(occ.description.en).toBeTruthy();
    }
  });

  it('should detect Ashura on 10 Muharram', () => {
    const occasions = getOccasionsForDate({ year: 1446, month: 1, day: 10 });
    const ashura = occasions.find(o => o.id === 'ashura');
    expect(ashura).toBeDefined();
    expect(ashura!.name.ar).toBe('عاشوراء');
  });

  it('should detect Ramadan', () => {
    const occasions = getOccasionsForDate({ year: 1446, month: 9, day: 15 });
    const ramadan = occasions.find(o => o.id === 'ramadan');
    expect(ramadan).toBeDefined();
  });

  it('should detect Eid al-Fitr on 1 Shawwal', () => {
    const occasions = getOccasionsForDate({ year: 1446, month: 10, day: 1 });
    const eid = occasions.find(o => o.id === 'eid_al_fitr');
    expect(eid).toBeDefined();
  });

  it('should detect Day of Arafah on 9 Dhul Hijjah', () => {
    const occasions = getOccasionsForDate({ year: 1446, month: 12, day: 9 });
    const arafah = occasions.find(o => o.id === 'day_of_arafah');
    expect(arafah).toBeDefined();
  });

  it('getUpcomingOccasions should return sorted results', () => {
    const upcoming = getUpcomingOccasions(365);
    expect(upcoming.length).toBeGreaterThan(0);
    // Should be sorted by daysUntil
    for (let i = 1; i < upcoming.length; i++) {
      expect(upcoming[i].daysUntil).toBeGreaterThanOrEqual(upcoming[i - 1].daysUntil);
    }
  });

  // ─── Khatma Planner ──────────────────────────────────────

  it('should generate a 30-day Khatma plan', () => {
    const plan = generateKhatmaPlan({ preset: 'ramadan_30' });
    expect(plan.totalDays).toBe(30);
    expect(plan.pagesPerDay).toBe(Math.ceil(604 / 30));
    expect(plan.dailySchedule.length).toBe(30);
    expect(plan.dailySchedule[0].startPage).toBe(1);
    expect(plan.name.ar).toContain('رمضان');
    expect(plan.name.en).toContain('Ramadan');
  });

  it('should generate a weekly Khatma plan', () => {
    const plan = generateKhatmaPlan({ preset: 'weekly' });
    expect(plan.totalDays).toBe(7);
    expect(plan.pagesPerDay).toBe(Math.ceil(604 / 7));
  });

  it('should generate a custom Khatma plan', () => {
    const plan = generateKhatmaPlan({ preset: 'custom', customDays: 60 });
    expect(plan.totalDays).toBe(60);
    expect(plan.pagesPerDay).toBe(Math.ceil(604 / 60));
  });

  it('Khatma daily schedule should cover all 604 pages', () => {
    const plan = generateKhatmaPlan({ preset: 'ramadan_30' });
    const activeDays = plan.dailySchedule.filter(d => d.pagesCount > 0);
    const lastActiveDay = activeDays[activeDays.length - 1];
    expect(lastActiveDay.endPage).toBe(604);
  });

  it('Khatma pages should not overlap', () => {
    const plan = generateKhatmaPlan({ preset: 'monthly' });
    const activeDays = plan.dailySchedule.filter(d => d.pagesCount > 0);
    for (let i = 1; i < activeDays.length; i++) {
      expect(activeDays[i].startPage).toBe(activeDays[i - 1].endPage + 1);
    }
  });

  it('Khatma Hijri dates should be populated', () => {
    const plan = generateKhatmaPlan({ preset: 'ramadan_30' });
    expect(plan.startHijri.year).toBeGreaterThan(1400);
    expect(plan.endHijri.year).toBeGreaterThan(1400);
    for (const day of plan.dailySchedule) {
      expect(day.hijriDate.year).toBeGreaterThan(1400);
    }
  });

  // ─── ICS Export ───────────────────────────────────────────

  it('should generate valid ICS for Khatma', () => {
    const plan = generateKhatmaPlan({ preset: 'weekly' });
    const ics = generateICSForKhatma(plan, 'en');
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('Khatma');
  });

  it('should generate valid ICS for occasions', () => {
    const upcoming = getUpcomingOccasions(365);
    const ics = generateICSForOccasions(
      upcoming.map(o => ({ occasion: o.occasion, gregorianDate: o.gregorianDate })),
      'ar'
    );
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('المناسبات الإسلامية');
  });

  it('ICS should have correct format for dates', () => {
    const plan = generateKhatmaPlan({
      preset: 'custom',
      customDays: 3,
      startDate: new Date(2025, 0, 15),
    });
    const ics = generateICSForKhatma(plan, 'en');
    expect(ics).toContain('DTSTART;VALUE=DATE:20250115');
  });
});
