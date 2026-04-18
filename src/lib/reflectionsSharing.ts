/**
 * QuranReflect Sharing System
 *
 * Features:
 * - Deep linking to reflections (shareable URLs)
 * - Social sharing (Twitter, WhatsApp, etc.)
 * - Share reflection with verse context
 * - Generate shareable verse+reflection cards
 * - QR code generation ready
 */

import { SURAH_NAMES } from '@/lib/types';
import type { Reflection } from '@/lib/reflections';

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

export interface ShareLink {
  url: string;
  shortUrl: string;
  deepLink: string;
  title: string;
  text: string;
}

export interface ShareableCard {
  reflectionId: string;
  verseKey: string;
  verseName: string;
  reflectionText: string;
  authorName: string;
  topicColor: string;
  likes: number;
  imageUrl?: string;
}

// ───────────────────────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────────────────────

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://al-mushaf.example.com';
const SHARE_PATH = '/app/reflections';

// ───────────────────────────────────────────────────────────────
// Deep Linking
// ───────────────────────────────────────────────────────────────

/**
 * Generate deep link to a reflection
 * Format: /app/reflections?verse=2:255&reflection=abc123
 */
export function generateDeepLink(
  reflection: Reflection,
): string {
  const params = new URLSearchParams({
    verse: reflection.verseKey,
    surah: reflection.surah.toString(),
    ayah: reflection.ayah.toString(),
    reflection: reflection.id,
  });

  return `${SHARE_PATH}?${params.toString()}`;
}

/**
 * Generate full shareable URL
 */
export function generateShareUrl(
  reflection: Reflection,
): string {
  const deepLink = generateDeepLink(reflection);
  return `${BASE_URL}${deepLink}`;
}

/**
 * Parse deep link from URL
 */
export function parseDeepLink(
  url: string,
): {
  verseKey: string;
  surah: number;
  ayah: number;
  reflectionId: string;
} | null {
  try {
    const urlObj = new URL(url, BASE_URL);
    const verse = urlObj.searchParams.get('verse');
    const surah = parseInt(urlObj.searchParams.get('surah') || '0');
    const ayah = parseInt(urlObj.searchParams.get('ayah') || '0');
    const reflection = urlObj.searchParams.get('reflection');

    if (!verse || !surah || !ayah || !reflection) return null;

    return { verseKey: verse, surah, ayah, reflectionId: reflection };
  } catch {
    return null;
  }
}

// ───────────────────────────────────────────────────────────────
// Social Sharing
// ───────────────────────────────────────────────────────────────

/**
 * Generate share text for social media
 */
export function generateShareText(
  reflection: Reflection,
  lang: 'ar' | 'en' = 'en',
): string {
  const verse = `${SURAH_NAMES[reflection.surah]} ${reflection.ayah}`;
  const author = reflection.authorName || (lang === 'ar' ? 'مجهول' : 'Anonymous');
  
  if (lang === 'ar') {
    return `📖 تأمل قرآني على ${verse}\n\n"${reflection.text}"\n\n— ${author}\n\n#QuranReflect #القرآن_الكريم`;
  }
  
  return `📖 Quranic Reflection on ${verse}\n\n"${reflection.text}"\n\n— ${author}\n\n#QuranReflect #Quran`;
}

/**
 * Share to Twitter
 */
export function shareToTwitter(reflection: Reflection): void {
  const text = generateShareText(reflection, 'en');
  const url = generateShareUrl(reflection);
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  openShareWindow(twitterUrl);
}

/**
 * Share to WhatsApp
 */
export function shareToWhatsApp(reflection: Reflection): void {
  const text = generateShareText(reflection, 'ar'); // WhatsApp users likely Arabic speakers
  const url = generateShareUrl(reflection);
  const waUrl = `https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`;
  openShareWindow(waUrl);
}

/**
 * Share to Telegram
 */
export function shareToTelegram(reflection: Reflection): void {
  const text = generateShareText(reflection, 'en');
  const url = generateShareUrl(reflection);
  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  openShareWindow(tgUrl);
}

/**
 * Share to Facebook
 */
export function shareToFacebook(reflection: Reflection): void {
  const url = generateShareUrl(reflection);
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  openShareWindow(fbUrl);
}

/**
 * Copy link to clipboard
 */
export async function copyLinkToClipboard(reflection: Reflection): Promise<boolean> {
  try {
    const url = generateShareUrl(reflection);
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    console.error('Failed to copy link:', error);
    return false;
  }
}

/**
 * Use Web Share API if available (modern browsers)
 */
export async function nativeShare(reflection: Reflection): Promise<boolean> {
  if (!navigator.share) return false;

  try {
    await navigator.share({
      title: `Reflection on ${SURAH_NAMES[reflection.surah]} ${reflection.ayah}`,
      text: generateShareText(reflection, 'en'),
      url: generateShareUrl(reflection),
    });
    return true;
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Share failed:', error);
    }
    return false;
  }
}

// ───────────────────────────────────────────────────────────────
// Shareable Cards
// ───────────────────────────────────────────────────────────────

/**
 * Generate data for shareable card image
 * Can be used with social media image generators or server-side rendering
 */
export function generateCardData(reflection: Reflection): ShareableCard {
  return {
    reflectionId: reflection.id,
    verseKey: reflection.verseKey,
    verseName: `${SURAH_NAMES[reflection.surah]} ${reflection.ayah}`,
    reflectionText: reflection.text,
    authorName: reflection.authorName || 'Anonymous',
    topicColor: reflection.topicColor,
    likes: reflection.likes.length,
  };
}

/**
 * Generate markdown for sharing
 */
export function generateMarkdown(reflection: Reflection): string {
  const verse = `${SURAH_NAMES[reflection.surah]}:${reflection.ayah}`;
  const url = generateShareUrl(reflection);

  return `
## Reflection on ${verse}

> "${reflection.text}"

**— ${reflection.authorName || 'Anonymous'}**

❤️ ${reflection.likes.length} likes | 💬 ${reflection.replies.length} replies

[View on QuranReflect](${url})
  `.trim();
}

/**
 * Generate HTML card for embedding
 */
export function generateEmbedHTML(reflection: Reflection): string {
  const verse = `${SURAH_NAMES[reflection.surah]} ${reflection.ayah}`;
  const url = generateShareUrl(reflection);

  return `
<div class="quran-reflect-embed" style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; max-width: 400px; font-family: serif;">
  <div style="font-size: 12px; color: #666; margin-bottom: 8px;">📖 ${verse}</div>
  <blockquote style="margin: 0; padding-left: 12px; border-left: 3px solid #4a90e2; font-style: italic;">
    "${reflection.text}"
  </blockquote>
  <div style="margin-top: 12px; font-size: 12px; color: #999;">
    — ${reflection.authorName || 'Anonymous'} | ❤️ ${reflection.likes.length}
  </div>
  <a href="${url}" style="display: block; margin-top: 12px; color: #4a90e2; text-decoration: none; font-size: 12px;">
    View on QuranReflect →
  </a>
</div>
  `.trim();
}

// ───────────────────────────────────────────────────────────────
// QR Code
// ───────────────────────────────────────────────────────────────

/**
 * Generate QR code URL for reflection
 * Uses QR code API service
 */
export function generateQRCodeUrl(
  reflection: Reflection,
  size: number = 300,
): string {
  const url = generateShareUrl(reflection);
  const encodedUrl = encodeURIComponent(url);
  
  // Using qr-server.com (free, no auth required)
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedUrl}`;
}

// ───────────────────────────────────────────────────────────────
// Sharing Analytics
// ───────────────────────────────────────────────────────────────

export interface ShareMetrics {
  reflectionId: string;
  twitterShares: number;
  whatsappShares: number;
  telegramShares: number;
  facebookShares: number;
  copyLinks: number;
  totalShares: number;
  lastSharedAt?: string;
}

const SHARE_METRICS_KEY = 'mushaf-reflection-share-metrics';

/**
 * Record a share event
 */
export function recordShare(
  reflectionId: string,
  platform: 'twitter' | 'whatsapp' | 'telegram' | 'facebook' | 'copy' | 'native',
): void {
  try {
    const metrics = getShareMetrics(reflectionId);
    
    switch (platform) {
      case 'twitter':
        metrics.twitterShares++;
        break;
      case 'whatsapp':
        metrics.whatsappShares++;
        break;
      case 'telegram':
        metrics.telegramShares++;
        break;
      case 'facebook':
        metrics.facebookShares++;
        break;
      case 'copy':
      case 'native':
        metrics.copyLinks++;
        break;
    }

    metrics.totalShares++;
    metrics.lastSharedAt = new Date().toISOString();

    saveShareMetrics(reflectionId, metrics);
  } catch (error) {
    console.error('Failed to record share:', error);
  }
}

/**
 * Get share metrics for a reflection
 */
export function getShareMetrics(reflectionId: string): ShareMetrics {
  try {
    const key = `${SHARE_METRICS_KEY}:${reflectionId}`;
    const raw = localStorage.getItem(key);
    
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // corrupted
  }

  return {
    reflectionId,
    twitterShares: 0,
    whatsappShares: 0,
    telegramShares: 0,
    facebookShares: 0,
    copyLinks: 0,
    totalShares: 0,
  };
}

/**
 * Save share metrics
 */
function saveShareMetrics(reflectionId: string, metrics: ShareMetrics): void {
  try {
    const key = `${SHARE_METRICS_KEY}:${reflectionId}`;
    localStorage.setItem(key, JSON.stringify(metrics));
  } catch (error) {
    console.error('Failed to save share metrics:', error);
  }
}

// ───────────────────────────────────────────────────────────────
// Utilities
// ───────────────────────────────────────────────────────────────

function openShareWindow(url: string): void {
  const width = 600;
  const height = 400;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  window.open(url, 'share', `width=${width},height=${height},left=${left},top=${top}`);
}

/**
 * Check if Web Share API is available
 */
export function isNativeShareAvailable(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.share;
}
