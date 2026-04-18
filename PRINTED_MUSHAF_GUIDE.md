# Printed Mushaf System — Complete Documentation

## Table of Contents

1. [Overview](#overview)
2. [Mushaf Styles](#mushaf-styles)
3. [Page Flip Animations](#page-flip-animations)
4. [Swipe Navigation](#swipe-navigation)
5. [Color Overlays](#color-overlays)
6. [Image Optimization](#image-optimization)
7. [Component API](#component-api)
8. [Integration Guide](#integration-guide)
9. [Customization](#customization)
10. [Performance](#performance)
11. [Troubleshooting](#troubleshooting)

---

## Overview

The Printed Mushaf System provides a **production-ready, immersive Quran reading experience** that mimics authentic printed Qurans with realistic page-flip animations, multiple typography styles, and intelligent color overlays.

### Key Features

- **17+ Mushaf Styles**: From traditional Ottoman calligraphy to modern minimalist designs
- **Smooth 3D Page Flip**: Hardware-accelerated CSS 3D transforms
- **Swipe Navigation**: Natural touch & mouse gesture support
- **Topic/Place Overlays**: Color-coded verse highlighting (7 topics + geographic regions)
- **Image Optimization**: WebP with fallback, lazy loading, responsive sizing
- **Full RTL/LTR Support**: Arabic and English layouts
- **Dark Mode Compatible**: Automatic theme switching
- **Zero Dependencies**: Uses native APIs only (no GSAP required)

### Architecture

```
MushafsViewer (Main Component)
├── Mushaf Style System (17 types)
├── Page Flip Animation
├── Swipe Detector
├── Color Overlay System
├── Image Optimization
└── Navigation Controls
```

---

## Mushaf Styles

### Supported Types

```typescript
type MushafType =
  | 'madani'      // King Fahd Printing (Saudi Arabia)
  | 'uthmani'     // Ottoman calligraphic
  | 'hafs'        // Most common narration
  | 'warsh'       // North African
  | 'qaloon'      // North African variant
  | 'doori'       // East African
  | 'soosi'       // East African variant
  | 'kisai'       // Historical school
  | 'abu-amr'     // Historical school
  | 'hisham'      // Historical school
  | 'ibn-aamir'   // Levantine school
  | 'asim'        // Major tradition
  | 'nafi'        // Medina school
  | 'colored'     // Rainbow with topic colors
  | 'minimal'     // Clean modern design
  | 'classic'     // Vintage book aesthetic
  | 'digital'     // Contemporary digital
```

### Style Configuration

Each Mushaf style includes:

```typescript
interface MushafStyle {
  id: MushafType;
  name_ar: string;           // Arabic name
  name_en: string;           // English name
  font: string;              // CSS font stack
  fontSize: {
    base: number;            // Body text (px)
    verse: number;           // Verse size (px)
    number: number;          // Verse number (px)
  };
  padding: {
    page: number;            // Page margins
    column: number;          // Column spacing
    line: number;            // Line spacing
  };
  spacing: {
    lineHeight: number;      // Multiplier (1.8-2.4)
    wordSpacing: number;     // Pixels
    letterSpacing: number;   // Pixels
  };
  colors: {
    text: string;            // Hex color
    background: string;
    border: string;
    pageNumber: string;
    verseNumber: string;
  };
  layout: {
    columns: number;         // 1 or 2
    verseNumber: 'above' | 'below' | 'inline' | 'margin';
    frameVerse: boolean;     // Border around number
    separators: boolean;     // Line separators
    watermark: boolean;      // Background watermark
    pageHeader: boolean;     // Surah name at top
    surahName: boolean;      // Include surah
  };
  features: {
    hasPrecision: boolean;   // High detail
    handwritten: boolean;    // Calligraphic feel
    modern: boolean;         // Contemporary
    colored: boolean;        // Multi-color support
    minimalist: boolean;     // Sparse design
  };
  paper: {
    color: string;           // Paper color
    texture: 'smooth' | 'aged' | 'linen';
    shadow: boolean;         // Drop shadow
  };
}
```

### Getting a Style

```typescript
import { getMushafStyle, MushafType } from '@/lib/mushafStyles';

// Get specific style
const madaniStyle = getMushafStyle('madani');
console.log(madaniStyle.name_en); // "Madani Mushaf"
console.log(madaniStyle.fontSize.base); // 24
```

### Getting All Types

```typescript
import { getAllMushafTypes, getMushafTypesByCategory } from '@/lib/mushafStyles';

// All types
const all = getAllMushafTypes();

// By category
const traditional = getMushafTypesByCategory('traditional');
const modern = getMushafTypesByCategory('modern');
```

---

## Page Flip Animations

### Animation Engine

The page flip system uses **CSS 3D transforms** with smooth easing curves for high-performance animations.

```typescript
interface PageFlipConfig {
  enabled: boolean;
  duration: number;              // 300-600ms recommended
  perspective: number;           // 800-1200px
  shadow: {
    enabled: boolean;
    color: string;              // rgba color
    opacity: number;            // 0-1
  };
  curl: {
    enabled: boolean;
    intensity: number;          // 0-1 (0.3 recommended)
  };
  autoFlip: boolean;
  autoFlipDuration: number;      // ms between auto-flips
}

// Default config
const config: PageFlipConfig = {
  enabled: true,
  duration: 400,
  perspective: 1000,
  shadow: { enabled: true, color: 'rgba(0, 0, 0, 0.2)', opacity: 0.5 },
  curl: { enabled: true, intensity: 0.3 },
  autoFlip: false,
  autoFlipDuration: 3000,
};
```

### CSS Injection

```typescript
import { getPageFlipCSS } from '@/lib/pageFlipAnimation';

const css = getPageFlipCSS(config);
const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);
```

### Creating Flip Animation

```typescript
import { createFlipAnimation } from '@/lib/pageFlipAnimation';

const element = document.querySelector('.page-flip-container');
await createFlipAnimation(element, 'forward', config);
```

### HTML Structure

```html
<div class="page-flip-container">
  <div class="page-flip-scene">
    <div class="page-flip-front">
      <!-- Front page content -->
    </div>
    <div class="page-flip-back">
      <!-- Back page content -->
    </div>
  </div>
</div>
```

---

## Swipe Navigation

### SwipeDetector Class

```typescript
import { SwipeDetector, SwipeEvent } from '@/lib/swipeDetector';

const detector = new SwipeDetector(element, {
  threshold: 40,           // Minimum swipe distance (px)
  velocityThreshold: 0.2,  // Minimum velocity (px/ms)
  timeThreshold: 1000,     // Maximum duration (ms)
  preventDefault: true,
  capture: false,
});

detector.on('swipe-left', (event: SwipeEvent) => {
  console.log('Swiped left');
  console.log(event.distance);  // Total distance
  console.log(event.velocity);  // Speed of swipe
  console.log(event.duration);  // Time taken
});

detector.on('swipe-right', (event) => {
  console.log('Swiped right');
});
```

### SwipeEvent Interface

```typescript
interface SwipeEvent {
  type: 'swipe-left' | 'swipe-right' | 'swipe-up' | 'swipe-down';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  distance: number;      // Total pixels moved
  angle: number;         // Direction in degrees
  duration: number;      // Time in milliseconds
  velocity: number;      // Pixels per millisecond
  isTouch: boolean;      // Touch vs mouse
}
```

### React Hook

```typescript
import { useSwipe } from '@/lib/swipeDetector';

export function MyComponent() {
  const ref = useRef<HTMLDivElement>(null);

  useSwipe(ref, {
    onSwipeLeft: (event) => console.log('Left'),
    onSwipeRight: (event) => console.log('Right'),
    onSwipeUp: (event) => console.log('Up'),
    onSwipeDown: (event) => console.log('Down'),
  });

  return <div ref={ref}>Swipeable content</div>;
}
```

---

## Color Overlays

### Topic Colors

7 color-coded topics for Quranic content:

```typescript
import { TOPIC_COLORS, TopicType } from '@/lib/mushafOverlays';

// Available colors
const colors = {
  belief: '#FF6B6B',     // Belief (red)
  law: '#4ECDC4',        // Laws (teal)
  stories: '#45B7D1',    // Stories (blue)
  moral: '#FFA07A',      // Morality (orange)
  history: '#98D8C8',    // History (green)
  science: '#F7DC6F',    // Science (yellow)
  spiritual: '#BB8FCE',  // Spiritual (purple)
};
```

### Overlay Configuration

```typescript
interface OverlayConfig {
  type: 'topic' | 'place' | 'theme' | 'custom' | 'none';
  opacity: number;              // 0-1 (0.25 recommended)
  blendMode: 'multiply' | 'screen' | 'overlay' | 'lighten' | 'darken' | 'color';
  highlightWords: boolean;      // Highlight verse text
  highlightFrames: boolean;     // Frame verse numbers
  fadeNonSelected: boolean;     // Dim non-highlighted
  fadeOpacity: number;          // 0-1 for faded
}
```

### Applying Overlays

```typescript
import {
  applyVerseOverlay,
  removeVerseOverlay,
  getTopicColor,
} from '@/lib/mushafOverlays';

const verseElement = document.querySelector('.verse-1-1');
const config = { opacity: 0.25, blendMode: 'multiply', ... };

// Apply
applyVerseOverlay(verseElement, getTopicColor('belief'), config);

// Remove
removeVerseOverlay(verseElement);

// Toggle
toggleOverlay(verseElement, color, config, enabled);
```

### Color Utilities

```typescript
// Get readable text color
getContrastColor('#FF6B6B'); // Returns '#FFFFFF' or '#000000'

// Lighten/darken colors
lightenColor('#FF6B6B', 20);  // Lighter
darkenColor('#FF6B6B', 20);   // Darker

// RGB ↔ HSL conversion
const hsl = rgbToHsl(255, 107, 107);
const rgb = hslToRgb(0, 100, 71);
```

---

## Image Optimization

### Configuration

```typescript
interface ImageOptimizationConfig {
  enableWebP: boolean;         // WebP if supported
  enableLazyLoading: boolean;  // Lazy load images
  progressiveLoading: boolean; // Async decoding
  quality: 'low' | 'medium' | 'high' | 'ultra';
  format: 'webp' | 'jpeg' | 'png' | 'auto';
  cacheDuration: number;       // Seconds
  preloadCount: number;        // Pages to preload
}

const config = {
  enableWebP: true,
  enableLazyLoading: true,
  progressiveLoading: true,
  quality: 'high',
  format: 'auto',
  cacheDuration: 3600,
  preloadCount: 2,
};
```

### Image URLs

```typescript
import {
  getOptimizedImageUrl,
  getResponsiveImageSrcset,
  supportsWebP,
} from '@/lib/mushafImageOptimization';

// Single optimized URL
const url = getOptimizedImageUrl('/scans/1.jpg', config, 800, 1200);
// Result: /scans/1.jpg?format=webp&quality=85&width=800&height=1200

// Responsive srcset
const srcset = getResponsiveImageSrcset('/scans/1.jpg', config);
// Result: /scans/1.jpg?... 300w, /scans/1.jpg?... 500w, ...

// Check WebP support
if (supportsWebP()) {
  // Use WebP images
}
```

### Lazy Loading

```typescript
import { getLazyLoadingAttrs } from '@/lib/mushafImageOptimization';

const attrs = getLazyLoadingAttrs(config);

<img
  src={url}
  loading={attrs.loading}    // "lazy" or "eager"
  decoding={attrs.decoding}  // "async" or "sync"
/>
```

### Page Preloader

```typescript
import { PagePreloader } from '@/lib/mushafImageOptimization';

const preloader = new PagePreloader('/scans', config);

// Preload pages 1-3
preloader.preload(1, 3);

// Get preloaded image
const img = preloader.getPreloadedImage(2);
```

---

## Component API

### MushafsViewer

Main component for displaying Quran in printed format.

```typescript
import { MushafsViewer } from '@/components/MushafsViewer';

<MushafsViewer
  initialPage={1}
  mushafType="madani"
  enablePageFlip={true}
  enableSwipe={true}
  enableOverlay={true}
  onPageChange={(page) => console.log('Page:', page)}
  onMushafChange={(type) => console.log('Style:', type)}
  pageImageBaseUrl="/scans"
  className="my-mushaf"
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialPage` | number | 1 | Starting page |
| `mushafType` | MushafType | 'madani' | Initial Mushaf style |
| `enablePageFlip` | boolean | true | Enable 3D animations |
| `enableSwipe` | boolean | true | Enable touch/mouse swipe |
| `enableOverlay` | boolean | true | Enable color overlays |
| `onPageChange` | function | undefined | Page change callback |
| `onMushafChange` | function | undefined | Style change callback |
| `pageImageBaseUrl` | string | '/scans' | Image directory |
| `className` | string | '' | CSS class |

### PageFlip

Standalone page-flip component.

```typescript
import { PageFlip } from '@/components/PageFlip';

<PageFlip
  frontContent={<div>Front page</div>}
  backContent={<div>Back page</div>}
  onFlip={(direction) => console.log(direction)}
  flipConfig={{ duration: 400, perspective: 1000 }}
  enableSwipe={true}
  isRTL={false}
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `frontContent` | ReactNode | - | Front side content |
| `backContent` | ReactNode | undefined | Back side content |
| `onFlip` | function | undefined | Flip callback |
| `flipConfig` | object | DEFAULT_FLIP_CONFIG | Animation settings |
| `enableSwipe` | boolean | true | Enable swipe |
| `isRTL` | boolean | false | RTL direction |
| `className` | string | '' | CSS class |

---

## Integration Guide

### 1. Basic Integration

```typescript
import { MushafsViewer } from '@/components/MushafsViewer';

export default function QuranPage() {
  return <MushafsViewer />;
}
```

### 2. With Custom Configuration

```typescript
import { MushafsViewer } from '@/components/MushafsViewer';

export default function QuranPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [style, setStyle] = useState('madani');

  return (
    <div>
      <MushafsViewer
        initialPage={currentPage}
        mushafType={style}
        onPageChange={setCurrentPage}
        onMushafChange={setStyle}
      />
      <p>Page: {currentPage} | Style: {style}</p>
    </div>
  );
}
```

### 3. With Route Integration

```typescript
// app/quran/[page]/page.tsx
import { MushafsViewer } from '@/components/MushafsViewer';

export default function QuranPageRoute({ params }: { params: { page: string } }) {
  const page = parseInt(params.page, 10);

  return <MushafsViewer initialPage={page} />;
}
```

### 4. With Verse Highlighting

```typescript
import { MushafsViewer } from '@/components/MushafsViewer';
import { applyVerseOverlay, getTopicColor } from '@/lib/mushafOverlays';

export default function QuranWithHighlight() {
  const handlePageChange = (page: number) => {
    // Highlight specific verses
    const verseEl = document.querySelector('[data-verse="1:1"]');
    if (verseEl) {
      applyVerseOverlay(verseEl as HTMLElement, getTopicColor('belief'), {
        opacity: 0.3,
        blendMode: 'multiply',
      });
    }
  };

  return <MushafsViewer onPageChange={handlePageChange} />;
}
```

---

## Customization

### Custom Mushaf Style

```typescript
import { MushafStyle } from '@/lib/mushafStyles';

const customStyle: MushafStyle = {
  id: 'custom' as any,
  name_ar: 'مخصص',
  name_en: 'Custom',
  font: '"My Font", serif',
  fontSize: { base: 20, verse: 17, number: 12 },
  padding: { page: 30, column: 20, line: 6 },
  spacing: { lineHeight: 2.0, wordSpacing: 5, letterSpacing: 0 },
  colors: {
    text: '#333333',
    background: '#ffffff',
    border: '#cccccc',
    pageNumber: '#666666',
    verseNumber: '#3333cc',
    watermark: '#f5f5f5',
  },
  layout: {
    columns: 2,
    verseNumber: 'above',
    frameVerse: true,
    separators: true,
    watermark: false,
    pageHeader: true,
    surahName: true,
  },
  features: {
    hasPrecision: true,
    handwritten: false,
    modern: false,
    colored: false,
    minimalist: false,
  },
  paper: { color: '#ffffff', texture: 'smooth', shadow: false },
  pageSize: { width: 300, height: 420, aspectRatio: 0.71 },
};
```

### Custom Colors

```typescript
import { lightenColor, darkenColor } from '@/lib/mushafOverlays';

const baseColor = '#FF6B6B';
const lighter = lightenColor(baseColor, 20);  // 20% lighter
const darker = darkenColor(baseColor, 20);    // 20% darker
```

### Custom Animations

```typescript
const customConfig = {
  duration: 600,        // Slower
  perspective: 1200,    // Wider view
  shadow: {
    enabled: true,
    color: 'rgba(0, 0, 0, 0.3)',
    opacity: 0.7,
  },
  curl: {
    enabled: true,
    intensity: 0.5,     // More prominent curl
  },
};
```

---

## Performance

### Optimization Tips

1. **Preload Pages**
   ```typescript
   const preloader = new PagePreloader(baseUrl, config);
   preloader.preload(currentPage, 3); // Preload 3 pages
   ```

2. **Lazy Load Images**
   ```typescript
   const config = {
     enableLazyLoading: true,
     preloadCount: 1, // Load ahead
   };
   ```

3. **Use WebP**
   ```typescript
   const config = {
     enableWebP: true,
     format: 'auto',
     quality: 'medium', // Balance quality/size
   };
   ```

4. **Cache Management**
   ```typescript
   import { ImageCache } from '@/lib/mushafImageOptimization';
   const cache = new ImageCache(3600); // 1 hour
   cache.set('page-1', imageData);
   ```

### Performance Metrics

- **Page flip animation**: 60 FPS target
- **Image load time**: < 500ms (preloaded)
- **Memory per page**: ~200-500KB (depending on quality)
- **CSS 3D rendering**: Hardware accelerated

### Monitoring

```typescript
// Monitor page load time
performance.mark('page-load-start');
// ... load page ...
performance.mark('page-load-end');
performance.measure('page-load', 'page-load-start', 'page-load-end');

const measure = performance.getEntriesByName('page-load')[0];
console.log(`Load time: ${measure.duration}ms`);
```

---

## Troubleshooting

### Page Flip Not Working

**Problem**: Animation doesn't play

**Solutions**:
- Check `enablePageFlip` is true
- Verify CSS is injected: `document.getElementById('mushaf-flip-styles')`
- Check browser console for errors
- Verify `.page-flip-scene` element exists

```typescript
// Debug animation
const scene = document.querySelector('.page-flip-scene');
console.log('Scene exists:', !!scene);
console.log('Transform:', scene?.style.transform);
```

### Swipe Not Detecting

**Problem**: Swipe gestures not responding

**Solutions**:
- Check `enableSwipe` is true
- Verify `preventDefault` is set correctly
- Check touch event handling on device
- Test with mouse drag first

```typescript
// Debug swipe
const detector = new SwipeDetector(element);
detector.on('swipe-left', (event) => {
  console.log('Swipe detected:', event);
  console.log('Velocity:', event.velocity);
  console.log('Duration:', event.duration);
});
```

### Images Not Loading

**Problem**: Page images blank

**Solutions**:
- Check `pageImageBaseUrl` path is correct
- Verify images exist at expected URLs
- Check image optimization params
- Look for CORS issues in console

```typescript
// Test image URL
const url = getOptimizedImageUrl('/scans/1.jpg', config, 800, 1200);
console.log('Image URL:', url);
fetch(url).then(r => console.log('Status:', r.status));
```

### Overlay Text Unreadable

**Problem**: Text hard to read with overlay

**Solutions**:
- Reduce opacity: `config.opacity = 0.15`
- Change blend mode: `config.blendMode = 'lighten'`
- Use contrast utility: `getContrastColor(overlayColor)`
- Enable fade for non-selected: `config.fadeNonSelected = true`

```typescript
// Improve readability
const color = '#FF6B6B';
const opacity = getOptimalOpacity(color); // Returns optimal value
const textColor = getContrastColor(color);
```

### Performance Issues

**Problem**: Animation stuttering or slow

**Solutions**:
- Reduce animation duration: `config.duration = 300`
- Lower image quality: `quality: 'medium'`
- Enable lazy loading: `enableLazyLoading: true`
- Reduce preload count: `preloadCount: 1`
- Check CPU usage in DevTools

```typescript
// Profile animation
console.time('flip-animation');
await createFlipAnimation(element, 'forward', config);
console.timeEnd('flip-animation');
```

---

## Advanced Usage

### Custom Page Renderer

```typescript
import { MushafStyle } from '@/lib/mushafStyles';

function renderCustomPage(
  verses: Verse[],
  style: MushafStyle,
  canvas: HTMLCanvasElement
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Custom rendering logic
  ctx.fillStyle = style.paper.color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw verses with custom styling
  verses.forEach((verse, index) => {
    const y = style.padding.page + index * 30;
    ctx.font = `${style.fontSize.verse}px ${style.font}`;
    ctx.fillStyle = style.colors.text;
    ctx.fillText(verse.text, style.padding.page, y);
  });
}
```

### Multi-Page Navigation

```typescript
import { MushafsViewer } from '@/components/MushafsViewer';

export function QuranGallery() {
  const [pages, setPages] = useState([1, 2]);

  return (
    <div className="grid grid-cols-2 gap-4">
      {pages.map(page => (
        <MushafsViewer key={page} initialPage={page} />
      ))}
    </div>
  );
}
```

### API Endpoint for Images

```typescript
// pages/api/quran-page/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id, width, height, format, quality } = req.query;

  // Fetch image
  const image = await fetchQuranPageImage(id as string);

  // Optimize based on query params
  const optimized = await optimizeImage(image, {
    width: parseInt(width as string) || 800,
    height: parseInt(height as string) || 1200,
    format: (format as string) || 'jpeg',
    quality: parseInt(quality as string) || 85,
  });

  res.setHeader('Content-Type', 'image/jpeg');
  res.send(optimized);
}
```

---

## Accessibility

### Screen Reader Support

```typescript
<div
  role="doc-pagebreak"
  id={`page-${pageNumber}`}
  aria-label={`Page ${pageNumber} of 604`}
>
  {/* Page content */}
</div>
```

### Keyboard Navigation

```typescript
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') nextPage();
    if (e.key === 'ArrowLeft') previousPage();
  };

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [nextPage, previousPage]);
```

---

## License & Attribution

The Printed Mushaf System is part of **Al-Mushaf Al-Mufahras** project.

- Uses authentic Quran typesetting traditions
- Based on established Islamic calligraphy standards
- Compatible with all Islamic teaching methodologies
- Fully compatible with existing accessibility features

---

## Support & Updates

For issues, feature requests, or contributions:
- Check existing documentation
- Review code examples
- Test in isolation
- Check browser console for errors

Last Updated: 2024
Version: 1.0.0
