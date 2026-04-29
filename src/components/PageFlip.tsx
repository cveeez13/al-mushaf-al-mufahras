// @ts-nocheck
'use client';

import React, { useEffect, useRef, useCallback } from 'react';

// ─── Types ───────────────────────────────────────
export interface PageFlipConfig {
  duration?: number;
  perspective?: number;
  thickness?: number;
  autoFlipDuration?: number;
}

export const DEFAULT_FLIP_CONFIG: PageFlipConfig = {
  duration: 1000,
  perspective: 1000,
  thickness: 4,
  autoFlipDuration: 3000,
};

export interface PageFlipProps {
  frontContent: React.ReactNode;
  backContent?: React.ReactNode;
  onFlip?: (direction: 'forward' | 'backward') => void;
  flipConfig?: Partial<PageFlipConfig>;
  enableSwipe?: boolean;
  enableAutoFlip?: boolean;
  isRTL?: boolean;
  className?: string;
}

// ─── CSS الحركة ───────────────────────────────────
const FLIP_CSS = `
  .pfb-wrapper {
    perspective: var(--flip-perspective, 1000px);
  }

  .pfb-book {
    position: relative;
    display: flex;
    pointer-events: none;
    transform-style: preserve-3d;
    transition: translate var(--flip-dur, 1000ms);
    translate: calc(min(var(--c, 0), 1) * 50%) 0%;
  }

  .pfb-page {
    flex: none;
    display: flex;
    width: 100%;
    pointer-events: all;
    user-select: none;
    transform-style: preserve-3d;
    transform-origin: left center;
    transition:
      transform var(--flip-dur, 1000ms),
      rotate var(--flip-dur, 1000ms) ease-in
        calc((min(var(--i,0),var(--c,0)) - max(var(--i,0),var(--c,0))) * 50ms);
    translate: calc(var(--i,0) * -100%) 0px 0px;
    transform: translateZ(
      calc((var(--c,0) - var(--i,0) - 0.5) * calc(var(--thickness,4) * 1px))
    );
    rotate: 0 1 0 calc(clamp(0, var(--c,0) - var(--i,0), 1) * -180deg);
  }

  .pfb-book.rtl .pfb-page {
    transform-origin: right center;
    rotate: 0 1 0 calc(clamp(0, var(--c,0) - var(--i,0), 1) * 180deg);
  }

  .pfb-front,
  .pfb-back {
    position: relative;
    flex: none;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    overflow: hidden;
    translate: 0px;
  }

  .pfb-back {
    translate: -100% 0;
    rotate: 0 1 0 180deg;
  }

  .pfb-book.rtl .pfb-back {
    rotate: 0 1 0 -180deg;
  }
`;

let cssInjected = false;
function injectCSS() {
  if (cssInjected || typeof document === 'undefined') return;
  const el = document.createElement('style');
  el.id = 'pfb-styles';
  el.textContent = FLIP_CSS;
  document.head.appendChild(el);
  cssInjected = true;
}

// ─── Component ───────────────────────────────────
export const PageFlip: React.FC<PageFlipProps> = ({
  frontContent,
  backContent,
  onFlip,
  flipConfig: customConfig,
  enableSwipe = true,
  isRTL = false,
  className = '',
}) => {
  const config = { ...DEFAULT_FLIP_CONFIG, ...customConfig };
  const bookRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => { injectCSS(); }, []);

  useEffect(() => {
    const book = bookRef.current;
    if (!book) return;
    book.style.setProperty('--flip-dur', `${config.duration}ms`);
    book.style.setProperty('--flip-perspective', `${config.perspective}px`);
    book.style.setProperty('--thickness', `${config.thickness}`);
    book.style.setProperty('--c', '0');
    book.querySelectorAll<HTMLElement>('.pfb-page').forEach((page, idx) => {
      page.style.setProperty('--i', String(idx));
    });
  }, []);

  const setC = useCallback((val: number) => {
    currentRef.current = val;
    bookRef.current?.style.setProperty('--c', String(val));
  }, []);

  // ─── Click على الصفحة ─────────────────────────
  const handlePageClick = useCallback(
    (e: React.MouseEvent, idx: number) => {
      if ((e.target as HTMLElement).closest('a')) return;
      const onBack = (e.target as HTMLElement).closest('.pfb-back');
      const next = onBack ? idx : idx + 1;
      const maxC = backContent ? 2 : 1;
      const clamped = Math.min(Math.max(next, 0), maxC);
      const direction = clamped > currentRef.current ? 'forward' : 'backward';
      setC(clamped);
      onFlip?.(direction);
    },
    [backContent, onFlip, setC]
  );

  // ─── Swipe ────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 50) return;
    const goForward = isRTL ? diff < 0 : diff > 0;
    const maxC = backContent ? 2 : 1;
    if (goForward && currentRef.current < maxC) {
      setC(currentRef.current + 1);
      onFlip?.('forward');
    } else if (!goForward && currentRef.current > 0) {
      setC(currentRef.current - 1);
      onFlip?.('backward');
    }
    touchStartX.current = null;
  };

  return (
    <div
      className={`pfb-wrapper ${className}`}
      style={{ perspective: `${config.perspective}px` }}
      onTouchStart={enableSwipe ? handleTouchStart : undefined}
      onTouchEnd={enableSwipe ? handleTouchEnd : undefined}
    >
      <div
        ref={bookRef}
        className={`pfb-book ${isRTL ? 'rtl' : ''}`}
      >
        {/* الصفحة 0: الأمامية + الخلفية */}
        <div
          className="pfb-page"
          onClick={(e) => handlePageClick(e, 0)}
        >
          <div className="pfb-front">{frontContent}</div>
          {backContent && (
            <div className="pfb-back">{backContent}</div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── DoublePageSpread (لا تحذفه) ─────────────────
export const DoublePageSpread: React.FC<{
  leftPage: React.ReactNode;
  rightPage: React.ReactNode;
  onFlip?: (direction: 'forward' | 'backward') => void;
  flipConfig?: Partial<PageFlipConfig>;
  isRTL?: boolean;
}> = ({ leftPage, rightPage, onFlip, flipConfig, isRTL = false }) => {
  return (
    <div className="flex gap-4 w-full">
      <div className="flex-1">
        <PageFlip
          frontContent={leftPage}
          onFlip={onFlip}
          flipConfig={flipConfig}
          isRTL={isRTL}
        />
      </div>
      <div className="flex-1">
        <PageFlip
          frontContent={rightPage}
          onFlip={onFlip}
          flipConfig={flipConfig}
          isRTL={isRTL}
        />
      </div>
    </div>
  );
};

export default PageFlip;
