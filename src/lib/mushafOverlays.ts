/**
 * Quran Page Overlays — Color System
 *
 * Applies color overlays based on:
 * - Topics (7 categories with distinct colors)
 * - Places (Geographic regions)
 * - Themes (Story, law, spiritual)
 * - Custom selections
 *
 * Supports blending modes for readable overlays
 */

export type OverlayType = 'topic' | 'place' | 'theme' | 'custom' | 'none';

export interface OverlayConfig {
  type: OverlayType;
  opacity: number; // 0-1
  blendMode: 'multiply' | 'screen' | 'overlay' | 'lighten' | 'darken' | 'color';
  highlightWords: boolean;
  highlightFrames: boolean; // Frame verse numbers
  fadeNonSelected: boolean; // Dim non-highlighted content
  fadeOpacity: number; // 0-1 for faded content
}

export const DEFAULT_OVERLAY_CONFIG: OverlayConfig = {
  type: 'topic',
  opacity: 0.25,
  blendMode: 'multiply',
  highlightWords: true,
  highlightFrames: true,
  fadeNonSelected: false,
  fadeOpacity: 0.3,
};

/**
 * Topic colors (from existing system)
 */
export const TOPIC_COLORS = {
  belief: { ar: 'العقيدة', en: 'Belief', color: '#FF6B6B', hex: '#FF6B6B' },
  law: { ar: 'الأحكام', en: 'Laws', color: '#4ECDC4', hex: '#4ECDC4' },
  stories: { ar: 'القصص', en: 'Stories', color: '#45B7D1', hex: '#45B7D1' },
  moral: { ar: 'الأخلاق', en: 'Morality', color: '#FFA07A', hex: '#FFA07A' },
  history: { ar: 'التاريخ', en: 'History', color: '#98D8C8', hex: '#98D8C8' },
  science: { ar: 'العلوم', en: 'Science', color: '#F7DC6F', hex: '#F7DC6F' },
  spiritual: { ar: 'الروحيات', en: 'Spiritual', color: '#BB8FCE', hex: '#BB8FCE' },
} as const;

export type TopicType = keyof typeof TOPIC_COLORS;

/**
 * Place region colors
 */
export const PLACE_REGION_COLORS: Record<string, string> = {
  'middle-east': '#FF6B6B',
  'north-africa': '#4ECDC4',
  'east-africa': '#45B7D1',
  'south-asia': '#FFA07A',
  'central-asia': '#98D8C8',
  'mediterranean': '#F7DC6F',
  'arabian-peninsula': '#BB8FCE',
};

/**
 * Get color for topic
 */
export function getTopicColor(topic: TopicType): string {
  return TOPIC_COLORS[topic].color;
}

/**
 * Get color for place region
 */
export function getPlaceRegionColor(region: string): string {
  return PLACE_REGION_COLORS[region] || '#999999';
}

/**
 * Calculate readable text color based on background
 */
export function getContrastColor(bgColor: string): string {
  // Convert hex to RGB
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Convert RGB to HSL (for color adjustments)
 */
export function rgbToHsl(
  r: number,
  g: number,
  b: number
): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(h: number, s: number, l: number): string {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(
    b * 255
  )})`;
}

/**
 * Lighten a color
 */
export function lightenColor(hexColor: string, percent: number): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  const hsl = rgbToHsl(r, g, b);
  hsl.l = Math.min(100, hsl.l + percent);

  return hslToRgb(hsl.h, hsl.s, hsl.l);
}

/**
 * Darken a color
 */
export function darkenColor(hexColor: string, percent: number): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  const hsl = rgbToHsl(r, g, b);
  hsl.l = Math.max(0, hsl.l - percent);

  return hslToRgb(hsl.h, hsl.s, hsl.l);
}

/**
 * Get overlay CSS for a color
 */
export function getOverlayCSS(
  baseColor: string,
  config: OverlayConfig
): string {
  const alpha = (config.opacity * 255).toString(16).padStart(2, '0');
  const colorWithAlpha = baseColor + alpha;

  return `
    background-color: ${colorWithAlpha};
    mix-blend-mode: ${config.blendMode};
    position: relative;
  `;
}

/**
 * Get highlight CSS for text
 */
export function getHighlightCSS(
  color: string,
  opacity: number = 0.3
): string {
  return `
    background-color: ${color}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, '0')};
    border-radius: 2px;
    padding: 2px 4px;
  `;
}

/**
 * Get fade CSS for non-selected content
 */
export function getFadeCSS(opacity: number): string {
  return `
    opacity: ${opacity};
    filter: grayscale(${(1 - opacity) * 50}%);
  `;
}

/**
 * Generate gradient overlay CSS
 */
export function getGradientOverlayCSS(
  colors: string[],
  angle: number = 45
): string {
  const colorStop = colors.map((c, i) => `${c} ${(i / (colors.length - 1)) * 100}%`).join(', ');
  return `
    background: linear-gradient(${angle}deg, ${colorStop});
    background-attachment: fixed;
  `;
}

/**
 * Get overlay frame CSS (for verse numbers)
 */
export function getFrameOverlayCSS(
  color: string,
  opacity: number = 0.4
): string {
  return `
    border: 2px solid ${color};
    border-radius: 6px;
    padding: 4px 8px;
    background-color: ${color}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, '0')};
  `;
}

/**
 * Apply overlay to verse spans
 */
export function applyVerseOverlay(
  verseElement: HTMLElement,
  color: string,
  config: OverlayConfig
): void {
  if (config.highlightWords) {
    verseElement.style.backgroundColor = `${color}${Math.round(
      config.opacity * 255
    )
      .toString(16)
      .padStart(2, '0')}`;
    verseElement.style.mixBlendMode = config.blendMode;
  }
}

/**
 * Remove overlay from verse
 */
export function removeVerseOverlay(verseElement: HTMLElement): void {
  verseElement.style.backgroundColor = '';
  verseElement.style.mixBlendMode = 'normal';
  verseElement.style.opacity = '1';
}

/**
 * Toggle overlay on/off
 */
export function toggleOverlay(
  verseElement: HTMLElement,
  color: string,
  config: OverlayConfig,
  enabled: boolean
): void {
  if (enabled) {
    applyVerseOverlay(verseElement, color, config);
  } else {
    removeVerseOverlay(verseElement);
  }
}

/**
 * Calculate optimal opacity based on color brightness
 */
export function getOptimalOpacity(hexColor: string): number {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  // Bright colors need lower opacity to not wash out text
  if (brightness > 200) {
    return 0.15;
  } else if (brightness > 150) {
    return 0.2;
  } else if (brightness > 100) {
    return 0.25;
  }
  return 0.3;
}
