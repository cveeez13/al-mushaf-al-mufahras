/**
 * Canvas-based Quran verse image generator for social media sharing.
 *
 * Renders Arabic text on HTML Canvas with proper RTL handling,
 * 6 template designs, auto topic-color integration, and PNG export.
 */

import { SURAH_NAMES, TOPICS } from './types';

export interface ShareVerseData {
  surah: number;
  ayah: number;
  text: string;
  topic_color: string;
  topic_id: number;
}

export type TemplateName = 'classic' | 'modern' | 'gradient' | 'minimal' | 'bordered' | 'dark';

export interface TemplateConfig {
  id: TemplateName;
  name_ar: string;
  name_en: string;
  width: number;
  height: number;
}

export const TEMPLATES: TemplateConfig[] = [
  { id: 'classic',  name_ar: 'كلاسيكي',  name_en: 'Classic',  width: 1080, height: 1080 },
  { id: 'modern',   name_ar: 'عصري',      name_en: 'Modern',   width: 1080, height: 1080 },
  { id: 'gradient', name_ar: 'متدرج',     name_en: 'Gradient', width: 1080, height: 1080 },
  { id: 'minimal',  name_ar: 'بسيط',      name_en: 'Minimal',  width: 1080, height: 1080 },
  { id: 'bordered', name_ar: 'مؤطر',      name_en: 'Bordered', width: 1080, height: 1080 },
  { id: 'dark',     name_ar: 'داكن',       name_en: 'Dark',     width: 1080, height: 1080 },
];

function getTopicHex(color: string): string {
  const topic = Object.values(TOPICS).find(t => t.color === color);
  return topic?.hex || '#B8860B';
}

function darken(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xFF) - amount);
  const b = Math.max(0, (num & 0xFF) - amount);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xFF) + amount);
  const b = Math.min(255, (num & 0xFF) + amount);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

/**
 * Wraps Arabic text into lines that fit within maxWidth on the canvas.
 * Uses canvas measureText for accurate width calculation.
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Draw ornamental corner brackets.
 */
function drawCorners(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, size: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;

  // Top-left
  ctx.beginPath();
  ctx.moveTo(x, y + size); ctx.lineTo(x, y); ctx.lineTo(x + size, y);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(x + w - size, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + size);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(x, y + h - size); ctx.lineTo(x, y + h); ctx.lineTo(x + size, y + h);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(x + w - size, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - size);
  ctx.stroke();
}

/**
 * Draw opening/closing Arabic quotation ornaments ﴿ ﴾
 */
function drawQuranBrackets(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  topY: number,
  bottomY: number,
  color: string,
  size: number,
) {
  ctx.fillStyle = color;
  ctx.font = `${size}px "Amiri", serif`;
  ctx.textAlign = 'center';
  ctx.fillText('﴿', centerX, topY);
  ctx.fillText('﴾', centerX, bottomY);
}

/**
 * Calculate optimal font size for the verse text to fit the area.
 */
function calcFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  fontFamily: string,
  minSize = 28,
  maxSize = 72,
): { fontSize: number; lines: string[]; lineHeight: number } {
  let fontSize = maxSize;

  while (fontSize >= minSize) {
    ctx.font = `${fontSize}px ${fontFamily}`;
    const lineHeight = fontSize * 2.0;
    const lines = wrapText(ctx, text, maxWidth);
    const totalHeight = lines.length * lineHeight;
    if (totalHeight <= maxHeight) {
      return { fontSize, lines, lineHeight };
    }
    fontSize -= 2;
  }

  ctx.font = `${minSize}px ${fontFamily}`;
  const lineHeight = minSize * 2.0;
  const lines = wrapText(ctx, text, maxWidth);
  return { fontSize: minSize, lines, lineHeight };
}

/**
 * Render a verse image to a canvas and return it.
 */
export function renderShareImage(
  verse: ShareVerseData,
  template: TemplateName,
): HTMLCanvasElement {
  const config = TEMPLATES.find(t => t.id === template) || TEMPLATES[0];
  const W = config.width;
  const H = config.height;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const topicHex = getTopicHex(verse.topic_color);
  const surahName = SURAH_NAMES[verse.surah] || '';
  const reference = `سورة ${surahName} — آية ${verse.ayah}`;
  const topicObj = Object.values(TOPICS).find(t => t.color === verse.topic_color);
  const topicLabel = topicObj?.name_ar || '';
  const fontFamily = '"Amiri", "Traditional Arabic", serif';

  // Ensure RTL text direction
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';

  switch (template) {
    case 'classic':
      renderClassic(ctx, W, H, verse, topicHex, reference, topicLabel, fontFamily);
      break;
    case 'modern':
      renderModern(ctx, W, H, verse, topicHex, reference, topicLabel, fontFamily);
      break;
    case 'gradient':
      renderGradient(ctx, W, H, verse, topicHex, reference, topicLabel, fontFamily);
      break;
    case 'minimal':
      renderMinimal(ctx, W, H, verse, topicHex, reference, topicLabel, fontFamily);
      break;
    case 'bordered':
      renderBordered(ctx, W, H, verse, topicHex, reference, topicLabel, fontFamily);
      break;
    case 'dark':
      renderDark(ctx, W, H, verse, topicHex, reference, topicLabel, fontFamily);
      break;
  }

  // Watermark
  ctx.globalAlpha = 0.3;
  ctx.font = `18px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = template === 'dark' ? '#fff' : '#333';
  ctx.fillText('المصحف المفهرس', W / 2, H - 20);
  ctx.globalAlpha = 1;

  return canvas;
}

// ─── Template 1: Classic ───────────────────────────────────────
function renderClassic(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  verse: ShareVerseData, topicHex: string, reference: string, topicLabel: string, font: string,
) {
  // Warm parchment background
  ctx.fillStyle = '#FDF8F0';
  ctx.fillRect(0, 0, W, H);

  // Top & bottom gold bars
  ctx.fillStyle = topicHex;
  ctx.fillRect(0, 0, W, 8);
  ctx.fillRect(0, H - 8, W, 8);

  // Ornamental border
  drawCorners(ctx, 40, 40, W - 80, H - 80, 60, topicHex);

  // Bismillah ornament
  ctx.fillStyle = topicHex;
  ctx.font = `36px ${font}`;
  ctx.textAlign = 'center';
  ctx.fillText('❁', W / 2, 100);

  // Verse text
  const pad = 120;
  const { lines, lineHeight } = calcFontSize(ctx, verse.text, W - pad * 2, H - 380, font);
  const startY = (H - lines.length * lineHeight) / 2 + 20;

  ctx.fillStyle = '#2C1810';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], W / 2, startY + i * lineHeight);
  }

  // Separator
  const sepY = startY + lines.length * lineHeight + 30;
  ctx.strokeStyle = topicHex + '60';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 150, sepY);
  ctx.lineTo(W / 2 + 150, sepY);
  ctx.stroke();

  // Reference
  ctx.fillStyle = '#8B7355';
  ctx.font = `28px ${font}`;
  ctx.fillText(reference, W / 2, sepY + 50);

  // Topic badge
  ctx.fillStyle = topicHex + '20';
  const badgeW = ctx.measureText(topicLabel).width + 40;
  ctx.beginPath();
  ctx.roundRect(W / 2 - badgeW / 2, sepY + 70, badgeW, 40, 20);
  ctx.fill();
  ctx.fillStyle = topicHex;
  ctx.font = `22px ${font}`;
  ctx.fillText(topicLabel, W / 2, sepY + 97);
}

// ─── Template 2: Modern ────────────────────────────────────────
function renderModern(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  verse: ShareVerseData, topicHex: string, reference: string, topicLabel: string, font: string,
) {
  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // Colored left strip
  ctx.fillStyle = topicHex;
  ctx.fillRect(0, 0, 12, H);

  // Large faint ayah number in background
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = topicHex;
  ctx.font = `bold 500px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(String(verse.ayah), W / 2 + 100, H / 2 + 150);
  ctx.globalAlpha = 1;

  // Verse text
  const pad = 100;
  const { lines, lineHeight } = calcFontSize(ctx, verse.text, W - pad * 2, H - 350, font);
  const startY = (H - lines.length * lineHeight) / 2;

  ctx.fillStyle = '#1A1A2E';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], W / 2 + 6, startY + i * lineHeight);
  }

  // Bottom section
  const bottomY = H - 140;
  ctx.fillStyle = '#F8F9FA';
  ctx.fillRect(12, bottomY, W - 12, 140);
  ctx.fillStyle = topicHex;
  ctx.fillRect(12, bottomY, W - 12, 3);

  ctx.fillStyle = '#333';
  ctx.font = `30px ${font}`;
  ctx.fillText(reference, W / 2, bottomY + 55);

  ctx.fillStyle = topicHex;
  ctx.font = `22px ${font}`;
  ctx.fillText(topicLabel, W / 2, bottomY + 95);
}

// ─── Template 3: Gradient ──────────────────────────────────────
function renderGradient(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  verse: ShareVerseData, topicHex: string, reference: string, topicLabel: string, font: string,
) {
  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, darken(topicHex, 120));
  grad.addColorStop(0.5, darken(topicHex, 80));
  grad.addColorStop(1, darken(topicHex, 140));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle pattern overlay
  ctx.globalAlpha = 0.03;
  for (let i = 0; i < W; i += 40) {
    for (let j = 0; j < H; j += 40) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(i, j, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // Quran brackets
  drawQuranBrackets(ctx, W / 2, 130, H - 180, topicHex + '80', 60);

  // Verse text
  const pad = 120;
  const { lines, lineHeight } = calcFontSize(ctx, verse.text, W - pad * 2, H - 400, font);
  const startY = (H - lines.length * lineHeight) / 2;

  ctx.fillStyle = '#FFFFFF';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], W / 2, startY + i * lineHeight);
  }

  // Reference
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `28px ${font}`;
  ctx.fillText(reference, W / 2, H - 110);

  // Topic
  ctx.fillStyle = topicHex;
  ctx.font = `22px ${font}`;
  ctx.fillText(topicLabel, W / 2, H - 70);
}

// ─── Template 4: Minimal ──────────────────────────────────────
function renderMinimal(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  verse: ShareVerseData, topicHex: string, reference: string, _topicLabel: string, font: string,
) {
  // Pure white
  ctx.fillStyle = '#FAFAFA';
  ctx.fillRect(0, 0, W, H);

  // Thin colored line at center top
  ctx.fillStyle = topicHex;
  ctx.fillRect(W / 2 - 40, 80, 80, 3);

  // Verse text — larger, centered
  const pad = 100;
  const { lines, lineHeight } = calcFontSize(ctx, verse.text, W - pad * 2, H - 300, font, 32, 80);
  const startY = (H - lines.length * lineHeight) / 2 - 20;

  ctx.fillStyle = '#222';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], W / 2, startY + i * lineHeight);
  }

  // Small reference at bottom
  ctx.fillStyle = '#999';
  ctx.font = `24px ${font}`;
  ctx.fillText(reference, W / 2, H - 80);

  // Bottom line
  ctx.fillStyle = topicHex;
  ctx.fillRect(W / 2 - 40, H - 50, 80, 3);
}

// ─── Template 5: Bordered ─────────────────────────────────────
function renderBordered(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  verse: ShareVerseData, topicHex: string, reference: string, topicLabel: string, font: string,
) {
  // Background
  ctx.fillStyle = '#FFFEF5';
  ctx.fillRect(0, 0, W, H);

  // Thick colored border
  const bw = 16;
  ctx.strokeStyle = topicHex;
  ctx.lineWidth = bw;
  ctx.strokeRect(bw / 2, bw / 2, W - bw, H - bw);

  // Inner thin border
  ctx.strokeStyle = topicHex + '40';
  ctx.lineWidth = 1;
  ctx.strokeRect(bw + 16, bw + 16, W - (bw + 16) * 2, H - (bw + 16) * 2);

  // Ornamental corners
  drawCorners(ctx, bw + 16, bw + 16, W - (bw + 16) * 2, H - (bw + 16) * 2, 40, topicHex);

  // Topic badge at top
  ctx.fillStyle = topicHex;
  const badgeW = 260;
  ctx.beginPath();
  ctx.roundRect(W / 2 - badgeW / 2, 50, badgeW, 50, 25);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `24px ${font}`;
  ctx.fillText(topicLabel, W / 2, 83);

  // Verse text
  const pad = 100;
  const { lines, lineHeight } = calcFontSize(ctx, verse.text, W - pad * 2, H - 380, font);
  const startY = (H - lines.length * lineHeight) / 2 + 30;

  ctx.fillStyle = '#2C1810';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], W / 2, startY + i * lineHeight);
  }

  // Reference
  ctx.fillStyle = '#8B7355';
  ctx.font = `28px ${font}`;
  ctx.fillText(reference, W / 2, H - 70);
}

// ─── Template 6: Dark ─────────────────────────────────────────
function renderDark(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  verse: ShareVerseData, topicHex: string, reference: string, topicLabel: string, font: string,
) {
  // Deep dark background
  ctx.fillStyle = '#0D0D0D';
  ctx.fillRect(0, 0, W, H);

  // Subtle radial glow from topic color
  const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
  grad.addColorStop(0, topicHex + '18');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Top accent line
  ctx.fillStyle = topicHex;
  ctx.fillRect(W / 2 - 60, 60, 120, 3);

  // Star ornament
  ctx.fillStyle = topicHex;
  ctx.font = `40px ${font}`;
  ctx.textAlign = 'center';
  ctx.fillText('✦', W / 2, 120);

  // Verse text
  const pad = 110;
  const { lines, lineHeight } = calcFontSize(ctx, verse.text, W - pad * 2, H - 380, font);
  const startY = (H - lines.length * lineHeight) / 2;

  ctx.fillStyle = '#E8E0D4';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], W / 2, startY + i * lineHeight);
  }

  // Separator glow
  const sepY = startY + lines.length * lineHeight + 40;
  const sepGrad = ctx.createLinearGradient(W / 2 - 120, 0, W / 2 + 120, 0);
  sepGrad.addColorStop(0, 'transparent');
  sepGrad.addColorStop(0.5, topicHex + '80');
  sepGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = sepGrad;
  ctx.fillRect(W / 2 - 120, sepY, 240, 2);

  // Reference
  ctx.fillStyle = '#888';
  ctx.font = `28px ${font}`;
  ctx.fillText(reference, W / 2, sepY + 50);

  // Topic
  ctx.fillStyle = topicHex;
  ctx.font = `22px ${font}`;
  ctx.fillText(topicLabel, W / 2, sepY + 90);
}

/**
 * Export canvas to PNG blob.
 */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Canvas export failed')),
      'image/png',
      1.0,
    );
  });
}

/**
 * Download canvas as PNG file.
 */
export async function downloadShareImage(canvas: HTMLCanvasElement, filename: string) {
  const blob = await canvasToBlob(canvas);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Share via Web Share API (mobile).
 */
export async function shareImage(canvas: HTMLCanvasElement, verse: ShareVerseData): Promise<boolean> {
  if (!navigator.share || !navigator.canShare) return false;

  try {
    const blob = await canvasToBlob(canvas);
    const file = new File([blob], `quran-${verse.surah}-${verse.ayah}.png`, { type: 'image/png' });

    if (!navigator.canShare({ files: [file] })) return false;

    await navigator.share({
      title: `سورة ${SURAH_NAMES[verse.surah]} — آية ${verse.ayah}`,
      text: verse.text.slice(0, 200),
      files: [file],
    });
    return true;
  } catch {
    return false;
  }
}
