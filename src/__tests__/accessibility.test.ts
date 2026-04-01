import { describe, it, expect } from 'vitest';
import {
  getDefaultA11y,
  loadA11yPreferences,
  saveA11yPreferences,
  applyA11yToDOM,
  announce,
  focusElement,
  handleArrowNavigation,
  HIGH_CONTRAST_TOPIC_HEX,
  getTopicColor,
  FONT_SIZE_MAP,
  LINE_SPACING_MAP,
} from '@/lib/accessibility';

describe('Accessibility Engine', () => {
  // ─── Default Preferences ──────────────────────────────

  it('getDefaultA11y returns sensible defaults', () => {
    const d = getDefaultA11y();
    expect(d.dyslexiaMode).toBe(false);
    expect(d.highContrast).toBe(false);
    expect(d.fontSize).toBe('normal');
    expect(d.lineSpacing).toBe('normal');
    expect(d.reducedMotion).toBe(false);
    expect(d.focusHighlight).toBe(true); // On by default for a11y
    expect(d.screenReaderHints).toBe(false);
  });

  // ─── Persistence ──────────────────────────────────────

  it('loadA11yPreferences returns defaults when localStorage is empty', () => {
    localStorage.clear();
    const prefs = loadA11yPreferences();
    expect(prefs).toEqual(getDefaultA11y());
  });

  it('saveA11yPreferences and loadA11yPreferences round-trip', () => {
    const custom = {
      ...getDefaultA11y(),
      dyslexiaMode: true,
      fontSize: 'large' as const,
      highContrast: true,
    };
    saveA11yPreferences(custom);
    const loaded = loadA11yPreferences();
    expect(loaded.dyslexiaMode).toBe(true);
    expect(loaded.fontSize).toBe('large');
    expect(loaded.highContrast).toBe(true);
  });

  it('loadA11yPreferences handles corrupted localStorage gracefully', () => {
    localStorage.setItem('a11y-preferences', '{invalid json!!!');
    const prefs = loadA11yPreferences();
    expect(prefs).toEqual(getDefaultA11y());
  });

  it('loadA11yPreferences merges partial saved data with defaults', () => {
    localStorage.setItem('a11y-preferences', JSON.stringify({ dyslexiaMode: true }));
    const prefs = loadA11yPreferences();
    expect(prefs.dyslexiaMode).toBe(true);
    expect(prefs.fontSize).toBe('normal'); // default filled in
    expect(prefs.focusHighlight).toBe(true); // default filled in
  });

  // ─── DOM Application ──────────────────────────────────

  it('applyA11yToDOM sets data attributes on document root', () => {
    const prefs = {
      ...getDefaultA11y(),
      dyslexiaMode: true,
      highContrast: true,
      fontSize: 'xlarge' as const,
      lineSpacing: 'wide' as const,
      reducedMotion: true,
      focusHighlight: true,
    };
    applyA11yToDOM(prefs);

    const root = document.documentElement;
    expect(root.getAttribute('data-dyslexia')).toBe('true');
    expect(root.getAttribute('data-high-contrast')).toBe('true');
    expect(root.getAttribute('data-font-size')).toBe('xlarge');
    expect(root.getAttribute('data-line-spacing')).toBe('wide');
    expect(root.getAttribute('data-reduced-motion')).toBe('true');
    expect(root.getAttribute('data-focus-highlight')).toBe('true');
  });

  it('applyA11yToDOM sets false values correctly', () => {
    applyA11yToDOM(getDefaultA11y());
    const root = document.documentElement;
    expect(root.getAttribute('data-dyslexia')).toBe('false');
    expect(root.getAttribute('data-high-contrast')).toBe('false');
  });

  // ─── Screen Reader Announcements ──────────────────────

  it('announce creates a live region in DOM', () => {
    announce('test message');
    const region = document.querySelector('[role="status"][aria-live]');
    expect(region).toBeTruthy();
  });

  it('announce function does not throw', () => {
    expect(() => announce('test', 'polite')).not.toThrow();
    expect(() => announce('urgent', 'assertive')).not.toThrow();
  });

  // ─── Focus Management ─────────────────────────────────

  it('focusElement returns false for non-existent selector', () => {
    expect(focusElement('#non-existent-element-12345')).toBe(false);
  });

  it('focusElement returns true for existing element', () => {
    const el = document.createElement('button');
    el.id = 'test-focus-btn';
    document.body.appendChild(el);
    expect(focusElement('#test-focus-btn')).toBe(true);
    expect(document.activeElement).toBe(el);
    el.remove();
  });

  // ─── Arrow Navigation ─────────────────────────────────

  it('handleArrowNavigation wraps around in RTL horizontal', () => {
    const items = Array.from({ length: 3 }, () => document.createElement('button'));
    items.forEach(el => document.body.appendChild(el));
    items[0].focus();

    const focusSpy: HTMLElement[] = [];
    items.forEach(el => {
      const orig = el.focus.bind(el);
      el.focus = () => { focusSpy.push(el); orig(); };
    });

    // RTL: ArrowLeft = next
    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
    Object.defineProperty(event, 'target', { value: items[0] });
    Object.defineProperty(event, 'preventDefault', { value: () => {} });
    handleArrowNavigation(event as unknown as KeyboardEvent, items, { rtl: true });

    expect(focusSpy[focusSpy.length - 1]).toBe(items[1]);
    items.forEach(el => el.remove());
  });

  // ─── High Contrast Colors ─────────────────────────────

  it('HIGH_CONTRAST_TOPIC_HEX has all 7 topic colors', () => {
    const colors = ['blue', 'green', 'brown', 'yellow', 'purple', 'orange', 'red'];
    for (const c of colors) {
      expect(HIGH_CONTRAST_TOPIC_HEX[c]).toBeTruthy();
    }
  });

  it('getTopicColor returns high contrast color when enabled', () => {
    const result = getTopicColor('blue', true, '#3498DB');
    expect(result).toBe('#0B5394');
  });

  it('getTopicColor returns original when high contrast disabled', () => {
    const result = getTopicColor('blue', false, '#3498DB');
    expect(result).toBe('#3498DB');
  });

  // ─── Font & Spacing Maps ──────────────────────────────

  it('FONT_SIZE_MAP has all 3 sizes', () => {
    expect(FONT_SIZE_MAP.normal.verse).toBe('1.5rem');
    expect(FONT_SIZE_MAP.large.verse).toBe('2rem');
    expect(FONT_SIZE_MAP.xlarge.verse).toBe('2.5rem');
  });

  it('LINE_SPACING_MAP has all 3 spacings', () => {
    expect(LINE_SPACING_MAP.normal.verse).toBe('2.2');
    expect(LINE_SPACING_MAP.wide.verse).toBe('3');
    expect(LINE_SPACING_MAP.xwide.verse).toBe('3.8');
  });
});
