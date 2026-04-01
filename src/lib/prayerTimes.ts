/**
 * Prayer time calculation based on astronomical algorithms.
 *
 * Implements the standard formula used by Umm al-Qura, ISNA, MWL, etc.
 * We only need Maghrib (sunset) and Fajr (dawn) to determine night time.
 *
 * References:
 * - https://en.wikipedia.org/wiki/Salat_times
 * - PrayTimes.org algorithms (public domain)
 */

export interface PrayerTimes {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}

export interface GeoCoords {
  latitude: number;
  longitude: number;
}

// Calculation method presets (Fajr angle, Isha angle)
export type CalcMethod = 'mwl' | 'isna' | 'egypt' | 'umm_al_qura';

const METHOD_ANGLES: Record<CalcMethod, { fajr: number; isha: number }> = {
  mwl:         { fajr: 18, isha: 17 },
  isna:        { fajr: 15, isha: 15 },
  egypt:       { fajr: 19.5, isha: 17.5 },
  umm_al_qura: { fajr: 18.5, isha: 90 }, // Isha = 90min after Maghrib for Umm al-Qura
};

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

function sin(d: number) { return Math.sin(d * RAD); }
function cos(d: number) { return Math.cos(d * RAD); }
function tan(d: number) { return Math.tan(d * RAD); }
function asin(x: number) { return Math.asin(x) * DEG; }
function acos(x: number) { return Math.acos(Math.max(-1, Math.min(1, x))) * DEG; }
function atan2(y: number, x: number) { return Math.atan2(y, x) * DEG; }

/** Julian date from a JS Date. */
function julianDate(date: Date): number {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  let jy = y, jm = m;
  if (m <= 2) { jy--; jm += 12; }
  const A = Math.floor(jy / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (jy + 4716)) + Math.floor(30.6001 * (jm + 1)) + d + B - 1524.5;
}

/** Sun position: declination and equation of time. */
function sunPosition(jd: number): { declination: number; eqTime: number } {
  const D = jd - 2451545.0;
  const g = (357.529 + 0.98560028 * D) % 360;
  const q = (280.459 + 0.98564736 * D) % 360;
  const L = (q + 1.915 * sin(g) + 0.020 * sin(2 * g)) % 360;
  const e = 23.439 - 0.00000036 * D;
  const RA = atan2(cos(e) * sin(L), cos(L)) / 15;
  const d = asin(sin(e) * sin(L));
  const EqT = q / 15 - RA;
  return { declination: d, eqTime: EqT };
}

/** Mid-day (Dhuhr) time in hours. */
function midDay(eqTime: number, lng: number, timezone: number): number {
  return 12 - eqTime + (lng / 15 - timezone) * -1;
  // Simplified: 12 + timezone - lng/15 - eqTime
}

/** Hour angle for a given sun angle below horizon. */
function hourAngle(lat: number, decl: number, angle: number): number {
  const cosHA = (sin(-angle) - sin(lat) * sin(decl)) / (cos(lat) * cos(decl));
  return acos(cosHA) / 15;
}

/** Convert decimal hours to a Date object on the given day. */
function hoursToDate(date: Date, hours: number): Date {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = Math.floor(((hours - h) * 60 - m) * 60);
  const d = new Date(date);
  d.setHours(h, m, s, 0);
  return d;
}

/**
 * Calculate prayer times for a given date and location.
 */
export function calculatePrayerTimes(
  date: Date,
  coords: GeoCoords,
  method: CalcMethod = 'mwl',
  timezone?: number,
): PrayerTimes {
  const tz = timezone ?? -(date.getTimezoneOffset() / 60);
  const jd = julianDate(date);
  const { declination, eqTime } = sunPosition(jd);
  const { fajr: fajrAngle, isha: ishaAngle } = METHOD_ANGLES[method];

  const noon = midDay(eqTime, coords.longitude, tz);
  // Correct midDay calculation
  const transit = 12 + tz - coords.longitude / 15 - eqTime;

  const sunriseHA = hourAngle(coords.latitude, declination, 0.833); // Standard refraction
  const fajrHA = hourAngle(coords.latitude, declination, fajrAngle);
  const asrFactor = 1; // Shafi'i (shadow = object + 1)
  const asrAngle = DEG * Math.atan(1 / (asrFactor + tan(Math.abs(coords.latitude - declination))));
  const asrHA = hourAngle(coords.latitude, declination, -asrAngle + 90);

  const fajr = hoursToDate(date, transit - fajrHA);
  const sunrise = hoursToDate(date, transit - sunriseHA);
  const dhuhr = hoursToDate(date, transit + 0.0167); // +1min after transit
  const asr = hoursToDate(date, transit + hourAngle(coords.latitude, declination, 90 - asrAngle));
  const maghrib = hoursToDate(date, transit + sunriseHA);

  let isha: Date;
  if (method === 'umm_al_qura') {
    // Umm al-Qura: Isha = Maghrib + 90 minutes
    isha = new Date(maghrib.getTime() + 90 * 60 * 1000);
  } else {
    const ishaHA = hourAngle(coords.latitude, declination, ishaAngle);
    isha = hoursToDate(date, transit + ishaHA);
  }

  return { fajr, sunrise, dhuhr, asr, maghrib, isha };
}

/**
 * Determine if it's currently "night" for reading purposes.
 * Night = between Maghrib and Fajr (next day).
 */
export function isNightTime(prayerTimes: PrayerTimes, now: Date = new Date()): boolean {
  return now >= prayerTimes.maghrib || now < prayerTimes.fajr;
}

/**
 * Get a night "intensity" factor 0-1 based on how deep into the night we are.
 * 0 = dusk/dawn edge, 1 = deep night (around midnight).
 * Used for gradual color transitions.
 */
export function getNightIntensity(prayerTimes: PrayerTimes, now: Date = new Date()): number {
  if (!isNightTime(prayerTimes, now)) return 0;

  const maghribMs = prayerTimes.maghrib.getTime();
  // Approximate next fajr: fajr time + 24h if we're past maghrib
  const fajrMs = now >= prayerTimes.maghrib
    ? prayerTimes.fajr.getTime() + 24 * 60 * 60 * 1000
    : prayerTimes.fajr.getTime();

  const nightDuration = fajrMs - maghribMs;
  const midNight = maghribMs + nightDuration / 2;
  const elapsed = now.getTime() - (now >= prayerTimes.maghrib ? maghribMs : maghribMs - 24 * 60 * 60 * 1000);
  const halfDuration = nightDuration / 2;

  // Triangular: ramps up to midnight, ramps down to fajr
  if (now.getTime() <= midNight) {
    return Math.min(1, elapsed / halfDuration);
  } else {
    const remaining = fajrMs - now.getTime();
    return Math.min(1, remaining / halfDuration);
  }
}

/**
 * Get user's geolocation via browser API.
 * Returns null if denied/unavailable.
 */
export function getUserLocation(): Promise<GeoCoords | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 3600000 }
    );
  });
}

// Default fallback: Cairo, Egypt
export const DEFAULT_COORDS: GeoCoords = { latitude: 30.0444, longitude: 31.2357 };
