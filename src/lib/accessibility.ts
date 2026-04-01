/**
 * Accessibility Engine — WCAG 2.1 AA Compliance
 *
 * Provides:
 * - Dyslexia-friendly mode (large font, wide spacing, OpenDyslexic-style)
 * - High contrast mode (WCAG AAA contrast ratios)
 * - Keyboard navigation helpers
 * - Screen reader announcements (live region)
 * - Focus management utilities
 * - Preferences persistence (localStorage)
 */

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

export interface A11yPreferences {
  dyslexiaMode: boolean;
  highContrast: boolean;
  fontSize: 'normal' | 'large' | 'xlarge';
  lineSpacing: 'normal' | 'wide' | 'xwide';
  reducedMotion: boolean;
  focusHighlight: boolean;
  screenReaderHints: boolean;
}

// ───────────────────────────────────────────────────────────────
// Defaults
// ───────────────────────────────────────────────────────────────

export function getDefaultA11y(): A11yPreferences {
  return {
    dyslexiaMode: false,
    highContrast: false,
    fontSize: 'normal',
    lineSpacing: 'normal',
    reducedMotion: false,
    focusHighlight: true,
    screenReaderHints: false,
  };
}

// ───────────────────────────────────────────────────────────────
// Persistence
// ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'a11y-preferences';

export function loadA11yPreferences(): A11yPreferences {
  if (typeof window === 'undefined') return getDefaultA11y();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultA11y();
    return { ...getDefaultA11y(), ...JSON.parse(raw) };
  } catch {
    return getDefaultA11y();
  }
}

export function saveA11yPreferences(prefs: A11yPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch { /* quota exceeded */ }
}

// ───────────────────────────────────────────────────────────────
// Apply preferences to DOM
// ───────────────────────────────────────────────────────────────

export function applyA11yToDOM(prefs: A11yPreferences): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Dyslexia mode
  root.setAttribute('data-dyslexia', prefs.dyslexiaMode ? 'true' : 'false');

  // High contrast
  root.setAttribute('data-high-contrast', prefs.highContrast ? 'true' : 'false');

  // Font size
  root.setAttribute('data-font-size', prefs.fontSize);

  // Line spacing
  root.setAttribute('data-line-spacing', prefs.lineSpacing);

  // Reduced motion
  root.setAttribute('data-reduced-motion', prefs.reducedMotion ? 'true' : 'false');

  // Focus highlight
  root.setAttribute('data-focus-highlight', prefs.focusHighlight ? 'true' : 'false');
}

// ───────────────────────────────────────────────────────────────
// Screen Reader Announcements (ARIA Live Region)
// ───────────────────────────────────────────────────────────────

let liveRegion: HTMLElement | null = null;

function ensureLiveRegion(): HTMLElement {
  if (typeof document === 'undefined') {
    return {} as HTMLElement;
  }
  if (liveRegion && document.body.contains(liveRegion)) return liveRegion;

  liveRegion = document.createElement('div');
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.className = 'sr-only';
  // Position off-screen but still in DOM for screen readers
  liveRegion.style.cssText =
    'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
  document.body.appendChild(liveRegion);
  return liveRegion;
}

/** Announce a message to screen readers via ARIA live region. */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const region = ensureLiveRegion();
  region.setAttribute('aria-live', priority);
  // Clear and re-set to trigger announcement
  region.textContent = '';
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}

// ───────────────────────────────────────────────────────────────
// Focus Management
// ───────────────────────────────────────────────────────────────

/** Move focus to an element by selector. Returns true if focused. */
export function focusElement(selector: string): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.querySelector<HTMLElement>(selector);
  if (el) {
    el.focus();
    return true;
  }
  return false;
}

/** Trap focus within a container (for modals/dialogs). */
export function createFocusTrap(container: HTMLElement): { activate: () => void; deactivate: () => void } {
  const focusableSelector =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  let previousFocus: HTMLElement | null = null;

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;

    const focusable = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector));
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  return {
    activate() {
      previousFocus = document.activeElement as HTMLElement;
      container.addEventListener('keydown', handleKeyDown);
      // Focus first focusable element
      const first = container.querySelector<HTMLElement>(focusableSelector);
      if (first) first.focus();
    },
    deactivate() {
      container.removeEventListener('keydown', handleKeyDown);
      if (previousFocus) previousFocus.focus();
    },
  };
}

// ───────────────────────────────────────────────────────────────
// Keyboard Navigation Helpers
// ───────────────────────────────────────────────────────────────

/**
 * Handle arrow key navigation within a group of elements (tabs, toolbars).
 * Wraps around at edges. Works for both LTR and RTL.
 */
export function handleArrowNavigation(
  e: KeyboardEvent,
  items: HTMLElement[],
  options: { orientation?: 'horizontal' | 'vertical'; rtl?: boolean } = {}
): void {
  const { orientation = 'horizontal', rtl = true } = options;
  const currentIndex = items.indexOf(e.target as HTMLElement);
  if (currentIndex === -1) return;

  let nextIndex = -1;

  if (orientation === 'horizontal') {
    // In RTL, ArrowRight goes backward, ArrowLeft goes forward
    if (e.key === 'ArrowRight') {
      nextIndex = rtl
        ? (currentIndex - 1 + items.length) % items.length
        : (currentIndex + 1) % items.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = rtl
        ? (currentIndex + 1) % items.length
        : (currentIndex - 1 + items.length) % items.length;
    }
  } else {
    if (e.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % items.length;
    } else if (e.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + items.length) % items.length;
    }
  }

  if (e.key === 'Home') nextIndex = 0;
  if (e.key === 'End') nextIndex = items.length - 1;

  if (nextIndex !== -1) {
    e.preventDefault();
    items[nextIndex].focus();
  }
}

// ───────────────────────────────────────────────────────────────
// High Contrast Color Helpers
// ───────────────────────────────────────────────────────────────

/** High contrast topic colors for WCAG AAA (≥7:1 contrast on white). */
export const HIGH_CONTRAST_TOPIC_HEX: Record<string, string> = {
  blue: '#0B5394',
  green: '#0B6623',
  brown: '#5C3317',
  yellow: '#7A6200',
  purple: '#4A0082',
  orange: '#8B4000',
  red: '#8B0000',
};

/** Get topic color respecting high contrast preference. */
export function getTopicColor(color: string, highContrast: boolean, original: string): string {
  if (highContrast) return HIGH_CONTRAST_TOPIC_HEX[color] || original;
  return original;
}

// ───────────────────────────────────────────────────────────────
// Dyslexia Font Metrics
// ───────────────────────────────────────────────────────────────

export const FONT_SIZE_MAP = {
  normal: { verse: '1.5rem', ui: '1rem' },
  large: { verse: '2rem', ui: '1.15rem' },
  xlarge: { verse: '2.5rem', ui: '1.3rem' },
};

export const LINE_SPACING_MAP = {
  normal: { verse: '2.2', ui: '1.5' },
  wide: { verse: '3', ui: '2' },
  xwide: { verse: '3.8', ui: '2.5' },
};
