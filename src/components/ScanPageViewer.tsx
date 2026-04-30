'use client';

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { getVersesForPage } from '@/lib/data';
import type { Verse } from '@/lib/types';
import TopicTabLabels from './TopicTabLabels';
import TopicVersesPanel from './TopicVersesPanel';

interface ScanPageViewerProps {
  currentPage: number;
  onPageChange: (page: number) => void;
  filterTopic: string | null;
  onFilterTopic?: (color: string | null) => void;
  onVerseClick?: (surah: number, ayah: number, text: string) => void;
  onAiTafsir?: (surah: number, ayah: number, text: string, topicColor: string, topicId: number) => void;
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return (
    document.documentElement.dataset.reducedMotion === 'true' ||
    (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  );
}

const SCAN_VIEW_MODE_KEY = 'mushaf-scan-view-mode';
const SCAN_FLIP_EFFECT_KEY = 'mushaf-scan-flip-effect';
const FLIP_DURATION_MS = 620;
type FlipDirection = 'next' | 'prev';

const SCAN_FLIP_CSS = `
  .scan-flip-book {
    position: relative;
    display: flex;
    pointer-events: none;
    transform-style: preserve-3d;
    transition: translate 700ms cubic-bezier(0.645,0.045,0.355,1);
    translate: calc(min(var(--c,0),1) * 50%) 0%;
  }
  .scan-flip-page {
    flex: none;
    display: flex;
    width: 100%;
    pointer-events: all;
    transform-style: preserve-3d;
    transform-origin: left center;
    translate: calc(var(--i,0) * -100%) 0px 0px;
    transform: translateZ(
      calc((var(--c,0) - var(--i,0) - 0.5) * 2px)
    );
    rotate: 0 1 0 calc(clamp(0, var(--c,0) - var(--i,0), 1) * -180deg);
    transition:
      transform 700ms cubic-bezier(0.645,0.045,0.355,1),
      rotate 700ms cubic-bezier(0.645,0.045,0.355,1)
        calc((min(var(--i,0),var(--c,0)) - max(var(--i,0),var(--c,0))) * 50ms);
  }
  .scan-flip-front,
  .scan-flip-back {
    position: relative;
    flex: none;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    overflow: hidden;
    translate: 0px;
  }
  .scan-flip-back {
    translate: -100% 0;
    rotate: 0 1 0 180deg;
  }
  .scan-flip-front img,
  .scan-flip-back img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    draggable: false;
  }
`;

let scanFlipCSSInjected = false;
function injectScanFlipCSS() {
  if (scanFlipCSSInjected || typeof document === 'undefined') return;
  const el = document.createElement('style');
  el.id = 'scan-flip-css';
  el.textContent = SCAN_FLIP_CSS;
  document.head.appendChild(el);
  scanFlipCSSInjected = true;
}

export default function ScanPageViewer({
  currentPage,
  onPageChange,
  filterTopic,
  onFilterTopic,
  onVerseClick,
  onAiTafsir,
}: ScanPageViewerProps) {
  const [flipping, setFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<FlipDirection>('next');
  const [flipEffectEnabled, setFlipEffectEnabled] = useState(true);
  const [spreadMode, setSpreadMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(filterTopic);
  const [versesByPage, setVersesByPage] = useState<Record<number, Verse[]>>({});

  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const readingLayoutRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const flipTimeoutRef = useRef<number | null>(null);
  const flipBookRef = useRef<HTMLDivElement>(null);
  const flipCRef = useRef(0);
  const [readingLayoutHeight, setReadingLayoutHeight] = useState(0);

  useEffect(() => {
    try {
      setSpreadMode(localStorage.getItem(SCAN_VIEW_MODE_KEY) === 'spread');
      setFlipEffectEnabled(localStorage.getItem(SCAN_FLIP_EFFECT_KEY) !== 'off');
    } catch {}
  }, []);

  useEffect(() => { injectScanFlipCSS(); }, []);

  useEffect(() => {
    return () => {
      if (flipTimeoutRef.current != null) {
        window.clearTimeout(flipTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setSelectedTopic(filterTopic);
  }, [filterTopic]);

  const rightPage = spreadMode ? (currentPage % 2 === 1 ? currentPage : currentPage - 1) : currentPage;
  const leftPage = spreadMode ? rightPage + 1 : null;
  const safeRight = clamp(rightPage, 1, 604);
  const safeLeft = leftPage ? clamp(leftPage, 1, 604) : null;

  useLayoutEffect(() => {
    const element = readingLayoutRef.current;
    if (!element) return;

    const updateHeight = () => setReadingLayoutHeight(element.offsetHeight);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    window.addEventListener('resize', updateHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, [spreadMode, safeLeft, safeRight]);

  useEffect(() => {
    const pages = [safeRight, safeLeft].filter((p): p is number => typeof p === 'number');
    if (pages.length === 0) return;

    let cancelled = false;
    Promise.all(pages.map(async (page) => ({ page, verses: await getVersesForPage(page) })))
      .then((results) => {
        if (cancelled) return;
        setVersesByPage((prev) => {
          const next = { ...prev };
          for (const item of results) {
            next[item.page] = item.verses;
          }
          return next;
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [safeRight, safeLeft]);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  const setViewMode = useCallback((nextSpreadMode: boolean) => {
    setSpreadMode(nextSpreadMode);
    resetZoom();

    try {
      localStorage.setItem(SCAN_VIEW_MODE_KEY, nextSpreadMode ? 'spread' : 'single');
    } catch {}
  }, [resetZoom]);

  const toggleFlipEffect = useCallback(() => {
    setFlipEffectEnabled((current) => {
      const next = !current;
      try {
        localStorage.setItem(SCAN_FLIP_EFFECT_KEY, next ? 'on' : 'off');
      } catch {}
      return next;
    });
  }, []);

  const turnPage = useCallback((direction: FlipDirection) => {
    if (flipping) return;
    const step = spreadMode ? 2 : 1;
    const target = clamp(
      currentPage + (direction === 'next' ? step : -step),
      1,
      604
    );
    if (target === currentPage) return;

    const book = flipBookRef.current;
    if (!book) {
      onPageChange(target);
      return;
    }

    setFlipping(true);
    setFlipDirection(direction);

    // تحديث --i على كل صفحة
    book.querySelectorAll<HTMLElement>('.scan-flip-page')
      .forEach((page, idx) => {
        page.style.setProperty('--i', String(idx));
      });

    // تشغيل الحركة
    const newC = flipCRef.current + 1;
    flipCRef.current = newC;
    book.style.setProperty('--c', String(newC));

    // بعد انتهاء الحركة غيّر الصفحة
    if (flipTimeoutRef.current != null) {
      window.clearTimeout(flipTimeoutRef.current);
    }
    flipTimeoutRef.current = window.setTimeout(() => {
      onPageChange(target);
      flipCRef.current = 0;
      book.style.setProperty('--c', '0');
      setFlipping(false);
      flipTimeoutRef.current = null;
    }, 750);
  }, [currentPage, flipping, onPageChange, spreadMode]);

  const goNext = useCallback(() => {
    turnPage('next');
  }, [turnPage]);

  const goPrev = useCallback(() => {
    turnPage('prev');
  }, [turnPage]);

  const handleTopicSelect = useCallback((color: string | null) => {
    setSelectedTopic(color);
    onFilterTopic?.(color);
  }, [onFilterTopic]);

  const closeTopicPanel = useCallback(() => {
    setSelectedTopic(null);
    onFilterTopic?.(null);
  }, [onFilterTopic]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(3, z + 0.25));
      if (e.key === '-') setZoom(z => Math.max(0.5, z - 0.25));
      if (e.key === '0') resetZoom();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [resetZoom]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom(z => clamp(z - e.deltaY * 0.002, 0.5, 3));
    }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [zoom, dragOffset]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    setDragOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (zoom > 1) return;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -60) goNext();
    if (dx > 60) goPrev();
    touchStartX.current = null;
  };

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const handleScanClick = useCallback(
    (page: number, event: React.MouseEvent<HTMLImageElement>) => {
      const verses = versesByPage[page] || [];
      if (verses.length === 0) return;
      if (!onVerseClick && !onAiTafsir) return;
      if (zoom > 1 || isDragging) return;

      const rect = event.currentTarget.getBoundingClientRect();
      if (rect.height <= 0) return;

      // Map click vertically to nearest verse on page.
      const yNorm = clamp((event.clientY - rect.top) / rect.height, 0, 1);
      const yTextBand = clamp((yNorm - 0.08) / 0.84, 0, 1);
      const verseIndex = Math.round(yTextBand * (verses.length - 1));
      const verse = verses[verseIndex];
      if (!verse) return;

      if (event.shiftKey) {
        onAiTafsir?.(verse.surah, verse.ayah, verse.text, verse.topic.color, verse.topic.id);
        return;
      }
      onVerseClick?.(verse.surah, verse.ayah, verse.text);
    },
    [isDragging, onAiTafsir, onVerseClick, versesByPage, zoom]
  );

  const renderPage = (
    page: number,
    nextPage: number | null,
    side: 'left' | 'right' | 'single'
  ) => (
    <div
      ref={side === 'right' || side === 'single' ? flipBookRef : undefined}
      className="scan-flip-book"
      style={{ perspective: '1000px', width: '100%', height: '100%' }}
      key={page}
    >
      <div className="scan-flip-page" style={{ '--i': '0' } as React.CSSProperties}>
        {/* الوجه الأمامي: الصفحة الحالية */}
        <div className="scan-flip-front">
          <img
            src={`/scans/${page - 1}.jpg`}
            alt={`صفحة ${page}`}
            draggable={false}
            onClick={(event) => handleScanClick(page, event)}
            title="اضغط على رقم الآية لفتح التفسير - Shift+Click لشرح AI"
          />
        </div>
        {/* الوجه الخلفي: الصفحة التالية */}
        {nextPage && (
          <div className="scan-flip-back">
            <img
              src={`/scans/${nextPage - 1}.jpg`}
              alt={`صفحة ${nextPage}`}
              draggable={false}
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="scan-viewer">
      <div className="scan-controls">
        <div className="scan-controls-group">
          <button
            className={`scan-ctrl-btn ${!spreadMode ? 'active' : ''}`}
            onClick={() => setViewMode(false)}
            aria-label="صفحة واحدة"
            title="صفحة واحدة"
            type="button"
          >📄</button>
          <button
            className={`scan-ctrl-btn ${spreadMode ? 'active' : ''}`}
            onClick={() => setViewMode(true)}
            aria-label="صفحتين"
            title="صفحتين"
            type="button"
          >📖</button>
        </div>

        <div className="scan-controls-group">
          <button
            className="scan-ctrl-btn"
            onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
            aria-label="تصغير"
            type="button"
          >−</button>
          <span className="scan-zoom-label">{Math.round(zoom * 100)}%</span>
          <button
            className="scan-ctrl-btn"
            onClick={() => setZoom(z => Math.min(3, z + 0.25))}
            aria-label="تكبير"
            type="button"
          >+</button>
          {zoom > 1 && (
            <button
              className="scan-ctrl-btn"
              onClick={resetZoom}
              aria-label="إعادة التعيين"
              type="button"
            >↻</button>
          )}
        </div>

        <button
          className="scan-ctrl-btn"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'خروج من ملء الشاشة' : 'ملء الشاشة'}
          type="button"
        >{isFullscreen ? '⊠' : '⊞'}</button>

        <button
          className={`scan-ctrl-btn ${flipEffectEnabled ? 'active' : ''}`}
          onClick={toggleFlipEffect}
          aria-pressed={flipEffectEnabled}
          aria-label="تقليب فليب"
          title="تقليب فليب"
          type="button"
        >↷</button>
      </div>

      <div
        className={`scan-area ${spreadMode ? 'scan-area-spread' : 'scan-area-single'}`}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        <div
          ref={readingLayoutRef}
          className={`scan-reading-layout ${spreadMode ? 'scan-reading-layout-spread' : 'scan-reading-layout-single'}`}
          style={{
            transform: `scale(${zoom}) translate(${dragOffset.x / zoom}px, ${dragOffset.y / zoom}px)`,
            transformOrigin: 'top center',
            marginBottom: readingLayoutHeight ? `${readingLayoutHeight * (zoom - 1)}px` : undefined,
          }}
        >
          <aside className="scan-tabs-column" aria-label="فهرس المواضيع">
            <TopicTabLabels
              side="left"
              showAllTopics
              activeTopic={selectedTopic}
              onFilterTopic={handleTopicSelect}
              className={spreadMode ? 'topic-tabs-inline topic-tabs-spread' : 'topic-tabs-inline topic-tabs-single'}
            />
          </aside>

          <div className={`scan-pages ${spreadMode ? 'scan-spread' : 'scan-single'} ${selectedTopic ? 'mushaf-page-dimmed' : ''} ${flipEffectEnabled && flipping ? `scan-flip-active scan-flip-${flipDirection}` : ''}`}>
            {spreadMode && safeLeft && safeLeft <= 604 ? (
              <>
                {renderPage(safeLeft, safeLeft + 1, 'left')}
                <div className="scan-spine" aria-hidden="true" />
                {renderPage(safeRight, safeRight + 1, 'right')}
              </>
            ) : (
              renderPage(
                safeRight,
                safeRight + 1 <= 604 ? safeRight + 1 : null,
                'single'
              )
            )}
          </div>
        </div>

      </div>

      <div className="scan-nav">
        <button
          className="scan-side-nav-btn scan-side-nav-btn-prev"
          onClick={goPrev}
          disabled={currentPage <= 1 || flipping}
          aria-label="Previous page"
          type="button"
        >{'\u2192'}</button>
        <span className="scan-page-indicator">صفحة {currentPage} من 604</span>
        <button
          className="scan-side-nav-btn scan-side-nav-btn-next"
          onClick={goNext}
          disabled={currentPage >= 604 || flipping}
          aria-label="Next page"
          type="button"
        >{'\u2190'}</button>
      </div>

      {selectedTopic && (
        <TopicVersesPanel
          topicColor={selectedTopic}
          onClose={closeTopicPanel}
          onGoToPage={onPageChange}
          onOpenTafsir={onVerseClick}
          onOpenAiTafsir={onAiTafsir}
        />
      )}
    </div>
  );
}
