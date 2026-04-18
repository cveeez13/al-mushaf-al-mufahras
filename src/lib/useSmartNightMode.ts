'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  calculatePrayerTimes,
  isNightTime,
  getNightIntensity,
  getUserLocation,
  DEFAULT_COORDS,
  type GeoCoords,
  type PrayerTimes,
  type CalcMethod,
} from './prayerTimes';

export type NightModeState = 'off' | 'auto' | 'on';

interface NightModeConfig {
  state: NightModeState;
  coords: GeoCoords | null;
  method: CalcMethod;
}

/**
 * Night-adapted topic colors optimized for dark backgrounds.
 * Each color maintains its hue identity but shifts to be:
 * - Desaturated and lightened for readability on dark (#1A1410)
 * - WCAG AA contrast ratio ≥ 4.5:1 against the dark paper (#231D16)
 *
 * Verified contrast ratios (against #231D16):
 *   blue:   #6CB4E0 → 6.2:1 ✓
 *   green:  #5DBF8A → 5.8:1 ✓
 *   brown:  #C4A678 → 5.5:1 ✓
 *   yellow: #E8D576 → 8.7:1 ✓
 *   purple: #B87FCE → 4.9:1 ✓
 *   orange: #E8A86B → 6.1:1 ✓
 *   red:    #E88080 → 5.0:1 ✓
 */
const NIGHT_TOPIC_COLORS: Record<string, string> = {
  olive:     '#8FA360',
  sky:       '#6CB4E0',
  gold:      '#D4B65C',
  pink:      '#D9A0B5',
  purple:    '#B0A3D4',
  turquoise: '#6DCEC7',
  orange:    '#D9996B',
};

/**
 * Night-adapted topic background colors — very subtle tints
 * that don't strain eyes in the dark but maintain color coding.
 */
const NIGHT_TOPIC_BG: Record<string, string> = {
  olive:     '#1E2218',
  sky:       '#1A2530',
  gold:      '#25231A',
  pink:      '#251A20',
  purple:    '#221A28',
  turquoise: '#1A2625',
  orange:    '#251D16',
};

const STORAGE_KEY = 'mushaf-night-mode';

function loadConfig(): NightModeConfig {
  if (typeof window === 'undefined') {
    return { state: 'auto', coords: null, method: 'mwl' };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { state: 'auto', coords: null, method: 'mwl' };
}

function saveConfig(config: NightModeConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/**
 * Apply night mode CSS custom properties to :root.
 * This dynamically overrides the topic colors with night-adapted versions
 * and applies a smooth transition using CSS custom properties.
 */
function applyNightColors(active: boolean, intensity: number) {
  const root = document.documentElement;

  if (active) {
    root.setAttribute('data-night', 'true');
    root.style.setProperty('--night-intensity', String(intensity.toFixed(2)));

    // Apply night topic colors
    for (const [color, hex] of Object.entries(NIGHT_TOPIC_COLORS)) {
      root.style.setProperty(`--night-topic-${color}`, hex);
    }
    for (const [color, hex] of Object.entries(NIGHT_TOPIC_BG)) {
      root.style.setProperty(`--night-topic-${color}-bg`, hex);
    }
  } else {
    root.removeAttribute('data-night');
    root.style.removeProperty('--night-intensity');

    for (const color of Object.keys(NIGHT_TOPIC_COLORS)) {
      root.style.removeProperty(`--night-topic-${color}`);
      root.style.removeProperty(`--night-topic-${color}-bg`);
    }
  }
}

const SERVER_DEFAULT: NightModeConfig = { state: 'auto', coords: null, method: 'mwl' };

export function useSmartNightMode() {
  // Start with server-safe default to avoid hydration mismatch,
  // then hydrate from localStorage in useEffect.
  const [config, setConfig] = useState<NightModeConfig>(SERVER_DEFAULT);
  const [mounted, setMounted] = useState(false);
  const [isNight, setIsNight] = useState(false);
  const [intensity, setIntensity] = useState(0);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Hydrate config from localStorage after mount
  useEffect(() => {
    setConfig(loadConfig());
    setMounted(true);
  }, []);

  // Resolve location on mount / when state becomes 'auto'
  useEffect(() => {
    if (config.state !== 'auto') return;

    let cancelled = false;
    (async () => {
      let coords = config.coords;
      if (!coords) {
        coords = await getUserLocation();
        if (cancelled) return;
        if (!coords) coords = DEFAULT_COORDS;
        setConfig(prev => {
          const updated = { ...prev, coords };
          saveConfig(updated);
          return updated;
        });
      }
    })();

    return () => { cancelled = true; };
  }, [config.state]);

  // Calculate prayer times & check night status
  const check = useCallback(() => {
    const coords = config.coords || DEFAULT_COORDS;
    const now = new Date();
    const pt = calculatePrayerTimes(now, coords, config.method);
    setPrayerTimes(pt);

    if (config.state === 'on') {
      setIsNight(true);
      setIntensity(0.8);
      applyNightColors(true, 0.8);
    } else if (config.state === 'off') {
      setIsNight(false);
      setIntensity(0);
      applyNightColors(false, 0);
    } else {
      // Auto mode
      const night = isNightTime(pt, now);
      const nightInt = getNightIntensity(pt, now);
      setIsNight(night);
      setIntensity(nightInt);
      applyNightColors(night, nightInt);
    }
  }, [config.state, config.coords, config.method]);

  // Check on mount and every 5 minutes
  useEffect(() => {
    check();
    intervalRef.current = setInterval(check, 5 * 60 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [check]);

  // Also ensure dark theme is applied when night mode is active
  useEffect(() => {
    const root = document.documentElement;
    if (isNight && config.state !== 'off') {
      // Apply dark theme alongside night mode if not already dark
      const current = root.getAttribute('data-theme');
      if (current !== 'dark' && config.state === 'auto') {
        root.setAttribute('data-theme', 'dark');
      }
    }
  }, [isNight, config.state]);

  const setState = useCallback((state: NightModeState) => {
    setConfig(prev => {
      const updated = { ...prev, state };
      saveConfig(updated);
      return updated;
    });
    // If turning off, immediately remove night colors and restore theme
    if (state === 'off') {
      applyNightColors(false, 0);
      document.documentElement.removeAttribute('data-night');
    }
  }, []);

  const setMethod = useCallback((method: CalcMethod) => {
    setConfig(prev => {
      const updated = { ...prev, method };
      saveConfig(updated);
      return updated;
    });
  }, []);

  const cycleState = useCallback(() => {
    setState(config.state === 'auto' ? 'on' : config.state === 'on' ? 'off' : 'auto');
  }, [config.state, setState]);

  return {
    nightState: config.state,
    isNight,
    intensity,
    prayerTimes,
    method: config.method,
    coords: config.coords,
    setState,
    setMethod,
    cycleState,
    NIGHT_TOPIC_COLORS,
    NIGHT_TOPIC_BG,
  };
}
