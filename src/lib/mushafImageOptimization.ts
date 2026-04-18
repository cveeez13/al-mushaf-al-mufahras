/**
 * Quran Page Image Optimization
 *
 * Features:
 * - WebP conversion with fallback
 * - Lazy loading configuration
 * - Progressive image loading
 * - Responsive image sizing
 * - Cache management
 * - Image quality settings
 */

export interface ImageOptimizationConfig {
  enableWebP: boolean;
  enableLazyLoading: boolean;
  progressiveLoading: boolean;
  quality: 'low' | 'medium' | 'high' | 'ultra'; // JPEG quality
  format: 'webp' | 'jpeg' | 'png' | 'auto';
  cacheDuration: number; // seconds
  preloadCount: number; // pages to preload
}

export const DEFAULT_IMAGE_CONFIG: ImageOptimizationConfig = {
  enableWebP: true,
  enableLazyLoading: true,
  progressiveLoading: true,
  quality: 'high',
  format: 'auto',
  cacheDuration: 3600, // 1 hour
  preloadCount: 2, // Preload 2 pages ahead
};

/**
 * Quality settings (as JPEG quality percentage)
 */
export const QUALITY_SETTINGS: Record<string, number> = {
  low: 60,
  medium: 75,
  high: 85,
  ultra: 95,
};

/**
 * Image size presets (breakpoints)
 */
export const IMAGE_SIZES = {
  mobile: { width: 300, height: 450 },
  tablet: { width: 500, height: 750 },
  desktop: { width: 800, height: 1200 },
  print: { width: 1200, height: 1800 },
} as const;

/**
 * Check if browser supports WebP
 */
export function supportsWebP(): boolean {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) return false;

  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('webp') === 5;
}

/**
 * Get optimal format based on browser support
 */
export function getOptimalImageFormat(
  preferredFormat: ImageOptimizationConfig['format']
): 'webp' | 'jpeg' | 'png' {
  if (preferredFormat === 'auto') {
    return supportsWebP() ? 'webp' : 'jpeg';
  }

  if (preferredFormat === 'webp' && !supportsWebP()) {
    return 'jpeg';
  }

  return preferredFormat as 'jpeg' | 'png';
}

/**
 * Generate image URL with optimization parameters
 */
export function getOptimizedImageUrl(
  baseUrl: string,
  config: ImageOptimizationConfig,
  width?: number,
  height?: number
): string {
  const format = getOptimalImageFormat(config.format);
  const quality = QUALITY_SETTINGS[config.quality];
  const params = new URLSearchParams();

  params.set('format', format);
  params.set('quality', quality.toString());

  if (width) params.set('width', width.toString());
  if (height) params.set('height', height.toString());

  // Return URL with query params
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${params.toString()}`;
}

/**
 * Get responsive image srcset
 */
export function getResponsiveImageSrcset(
  baseUrl: string,
  config: ImageOptimizationConfig
): string {
  const format = getOptimalImageFormat(config.format);
  const quality = QUALITY_SETTINGS[config.quality];

  const sizes = [
    { width: IMAGE_SIZES.mobile.width, breakpoint: '320px' },
    { width: IMAGE_SIZES.tablet.width, breakpoint: '768px' },
    { width: IMAGE_SIZES.desktop.width, breakpoint: '1024px' },
  ];

  return sizes
    .map(size => {
      const params = new URLSearchParams();
      params.set('format', format);
      params.set('quality', quality.toString());
      params.set('width', size.width.toString());

      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}${params.toString()} ${size.width}w`;
    })
    .join(', ');
}

/**
 * Get lazy loading attributes
 */
export function getLazyLoadingAttrs(
  config: ImageOptimizationConfig
): { loading: 'lazy' | 'eager'; decoding: 'async' | 'sync' } {
  return {
    loading: config.enableLazyLoading ? 'lazy' : 'eager',
    decoding: config.progressiveLoading ? 'async' : 'sync',
  };
}

/**
 * Image cache manager
 */
export class ImageCache {
  private cache: Map<string, { data: string; timestamp: number }> = new Map();
  private cacheDuration: number; // seconds

  constructor(duration: number = 3600) {
    this.cacheDuration = duration;
  }

  set(key: string, data: string): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get(key: string): string | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = (Date.now() - cached.timestamp) / 1000;
    if (age > this.cacheDuration) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  clearExpired(): void {
    const now = Date.now();
    for (const [key, { timestamp }] of this.cache.entries()) {
      const age = (now - timestamp) / 1000;
      if (age > this.cacheDuration) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Page preloader
 */
export class PagePreloader {
  private preloadedPages: Map<number, HTMLImageElement> = new Map();
  private config: ImageOptimizationConfig;
  private baseUrl: string;

  constructor(baseUrl: string, config: ImageOptimizationConfig) {
    this.baseUrl = baseUrl;
    this.config = config;
  }

  preload(pageNumber: number, count: number = 2): void {
    for (let i = pageNumber; i < pageNumber + count; i++) {
      if (!this.preloadedPages.has(i)) {
        const img = new Image();
        const url = this.buildPageUrl(i);
        img.src = url;
        this.preloadedPages.set(i, img);
      }
    }
  }

  private buildPageUrl(pageNumber: number): string {
    return getOptimizedImageUrl(
      `${this.baseUrl}/${pageNumber}.jpg`,
      this.config,
      IMAGE_SIZES.desktop.width,
      IMAGE_SIZES.desktop.height
    );
  }

  getPreloadedImage(pageNumber: number): HTMLImageElement | undefined {
    return this.preloadedPages.get(pageNumber);
  }

  clear(): void {
    this.preloadedPages.clear();
  }
}

/**
 * Generate blur-up placeholder (low-quality image placeholder)
 */
export function generateBlurUpPlaceholder(
  baseUrl: string,
  width: number = 10,
  height: number = 15
): string {
  const params = new URLSearchParams();
  params.set('width', width.toString());
  params.set('height', height.toString());
  params.set('quality', '10');
  params.set('format', 'jpeg');

  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${params.toString()}`;
}

/**
 * Image loading state tracker
 */
export class ImageLoadingState {
  private loadingStates: Map<string, 'pending' | 'loaded' | 'error'> = new Map();

  isLoading(key: string): boolean {
    return this.loadingStates.get(key) === 'pending';
  }

  isLoaded(key: string): boolean {
    return this.loadingStates.get(key) === 'loaded';
  }

  hasError(key: string): boolean {
    return this.loadingStates.get(key) === 'error';
  }

  setLoading(key: string): void {
    this.loadingStates.set(key, 'pending');
  }

  setLoaded(key: string): void {
    this.loadingStates.set(key, 'loaded');
  }

  setError(key: string): void {
    this.loadingStates.set(key, 'error');
  }

  reset(key: string): void {
    this.loadingStates.delete(key);
  }
}

/**
 * Estimate image file size
 */
export function estimateImageFileSize(
  width: number,
  height: number,
  quality: 'low' | 'medium' | 'high' | 'ultra'
): number {
  const pixels = width * height;
  const baseSize = pixels / 1000; // Very rough approximation

  const qualityMultiplier = {
    low: 0.3,
    medium: 0.5,
    high: 0.8,
    ultra: 1.2,
  };

  return Math.round(baseSize * qualityMultiplier[quality]);
}

/**
 * Calculate optimal image dimensions for device
 */
export function getOptimalDimensions(
  screenWidth: number,
  screenHeight: number
): { width: number; height: number } {
  if (screenWidth < 480) {
    return IMAGE_SIZES.mobile;
  } else if (screenWidth < 1024) {
    return IMAGE_SIZES.tablet;
  }
  return IMAGE_SIZES.desktop;
}

/**
 * Check if image needs to be reloaded (stale cache check)
 */
export function isImageStale(timestamp: number, maxAge: number = 3600): boolean {
  return (Date.now() - timestamp) / 1000 > maxAge;
}
