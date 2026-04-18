'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import TopicTabLabels from './TopicTabLabels';
import TopicVersesPanel from './TopicVersesPanel';

interface ScanPageViewerProps {
  currentPage: number;
  onPageChange: (page: number) => void;
  filterTopic: string | null;
  onFilterTopic?: (color: string | null) => void;
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export default function ScanPageViewer({
  currentPage,
  onPageChange,
  filterTopic,
  onFilterTopic,
}: ScanPageViewerProps) {
  const [flipping, setFlipping] = useState(false);
  const [spreadMode, setSpreadMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(filterTopic);

  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setSelectedTopic(filterTopic);
  }, [filterTopic]);

  const rightPage = spreadMode ? (currentPage % 2 === 1 ? currentPage : currentPage - 1) : currentPage;
  const leftPage = spreadMode ? rightPage + 1 : null;
  const safeRight = clamp(rightPage, 1, 604);
  const safeLeft = leftPage ? clamp(leftPage, 1, 604) : null;

  const resetZoom = useCallback(() => {
    setZoom(1);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  const goNext = useCallback(() => {
    setFlipping(true);
    setTimeout(() => {
      const step = spreadMode ? 2 : 1;
      const next = clamp(currentPage + step, 1, 604);
      if (next !== currentPage) onPageChange(next);
      resetZoom();
      setFlipping(false);
    }, 700);
  }, [currentPage, onPageChange, spreadMode, resetZoom]);

  const goPrev = useCallback(() => {
    setFlipping(true);
    setTimeout(() => {
      const step = spreadMode ? 2 : 1;
      const prev = clamp(currentPage - step, 1, 604);
      if (prev !== currentPage) onPageChange(prev);
      resetZoom();
      setFlipping(false);
    }, 700);
  }, [currentPage, onPageChange, spreadMode, resetZoom]);

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
    if (zoom > 1) return;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
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

  const renderPage = (page: number, side: 'left' | 'right' | 'single') => (
    <div className={`scan-page-wrapper scan-page-${side} ${flipping ? 'flipping' : ''}`} key={page}>
      <img
        src={`/scans/${page - 1}.jpg`}
        alt={`صفحة ${page}`}
        className="scan-page-img"
        draggable={false}
      />
    </div>
  );

  return (
    <div ref={containerRef} className="scan-viewer">
      <div className="scan-controls">
        <div className="scan-controls-group">
          <button
            className={`scan-ctrl-btn ${!spreadMode ? 'active' : ''}`}
            onClick={() => { setSpreadMode(false); resetZoom(); }}
            aria-label="صفحة واحدة"
            title="صفحة واحدة"
            type="button"
          >📄</button>
          <button
            className={`scan-ctrl-btn ${spreadMode ? 'active' : ''}`}
            onClick={() => { setSpreadMode(true); resetZoom(); }}
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
      </div>

      <div
        className="scan-area"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        <TopicTabLabels
          side="left"
          showAllTopics
          activeTopic={selectedTopic}
          onFilterTopic={handleTopicSelect}
          className={spreadMode ? 'topic-tabs-in-page topic-tabs-icon-only topic-tabs-spread' : 'topic-tabs-in-page topic-tabs-icon-only'}
        />

        <button
          className="scan-side-nav-btn scan-side-nav-btn-prev"
          onClick={goPrev}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          type="button"
        >{'\u2192'}</button>

        <div
          className={`scan-pages ${spreadMode ? 'scan-spread' : 'scan-single'} ${selectedTopic ? 'mushaf-page-dimmed' : ''}`}
          style={{
            transform: `scale(${zoom}) translate(${dragOffset.x / zoom}px, ${dragOffset.y / zoom}px)`,
            transformOrigin: 'center center',
          }}
        >
          {spreadMode && safeLeft && safeLeft <= 604 ? (
            <>
              {renderPage(safeLeft, 'left')}
              <div className="scan-spine" aria-hidden="true" />
              {renderPage(safeRight, 'right')}
            </>
          ) : (
            renderPage(safeRight, 'single')
          )}
        </div>

        <button
          className="scan-side-nav-btn scan-side-nav-btn-next"
          onClick={goNext}
          disabled={currentPage >= 604}
          aria-label="Next page"
          type="button"
        >{'\u2190'}</button>
      </div>

      <div className="scan-nav">
        <span className="scan-page-indicator">صفحة {currentPage} من 604</span>
      </div>

      {selectedTopic && (
        <TopicVersesPanel
          topicColor={selectedTopic}
          onClose={closeTopicPanel}
          onGoToPage={onPageChange}
        />
      )}
    </div>
  );
}
