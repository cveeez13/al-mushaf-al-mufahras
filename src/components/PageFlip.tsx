// @ts-nocheck
'use client';

/**
 * Page Flip Component
 *
 * Standalone 3D page flip animation component
 * Can be used for individual pages or double-page spreads
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  createFlipAnimation,
  PageFlipConfig,
  DEFAULT_FLIP_CONFIG,
  getPageFlipCSS,
  getHorizontalFlipCSS,
  cancelFlipAnimation,
} from '@/lib/pageFlipAnimation';
import { SwipeDetector, SwipeEvent } from '@/lib/swipeDetector';

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

export const PageFlip: React.FC<PageFlipProps> = ({
  frontContent,
  backContent,
  onFlip,
  flipConfig: customConfig,
  enableSwipe = true,
  enableAutoFlip = false,
  isRTL = false,
  className = '',
}) => {
  const config: PageFlipConfig = { ...DEFAULT_FLIP_CONFIG, ...customConfig };
  const sceneRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const swipeDetectorRef = useRef<SwipeDetector | null>(null);

  // Inject CSS
  useEffect(() => {
    const styleId = `page-flip-styles-${Math.random()}`;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = isRTL
      ? getHorizontalFlipCSS(config, true)
      : getHorizontalFlipCSS(config, false);
    document.head.appendChild(style);

    return () => {
      document.getElementById(styleId)?.remove();
    };
  }, [config, isRTL]);

  // Setup swipe detector
  useEffect(() => {
    if (!enableSwipe || !containerRef.current) return;

    swipeDetectorRef.current = new SwipeDetector(containerRef.current);

    swipeDetectorRef.current.on('swipe-left', () => {
      if (isRTL) {
        handleFlip('backward');
      } else {
        handleFlip('forward');
      }
    });

    swipeDetectorRef.current.on('swipe-right', () => {
      if (isRTL) {
        handleFlip('forward');
      } else {
        handleFlip('backward');
      }
    });

    return () => {
      if (swipeDetectorRef.current) {
        // Cleanup
      }
    };
  }, [enableSwipe, isRTL]);

  // Auto-flip
  useEffect(() => {
    if (!enableAutoFlip || isAnimating) return;

    const timer = setTimeout(() => {
      handleFlip(isFlipped ? 'backward' : 'forward');
    }, config.autoFlipDuration);

    return () => clearTimeout(timer);
  }, [enableAutoFlip, isAnimating, isFlipped, config.autoFlipDuration]);

  const handleFlip = useCallback(
    async (direction: 'forward' | 'backward') => {
      if (isAnimating || !sceneRef.current) return;

      setIsAnimating(true);

      try {
        await createFlipAnimation(sceneRef.current, direction, config);
        setIsFlipped(direction === 'forward' ? !isFlipped : isFlipped);
        onFlip?.(direction);
      } catch (error) {
        console.error('Flip animation error:', error);
      } finally {
        setIsAnimating(false);
      }
    },
    [isAnimating, config, isFlipped, onFlip]
  );

  const handleClickFlip = () => {
    handleFlip(isFlipped ? 'backward' : 'forward');
  };

  const handleCancelFlip = () => {
    if (sceneRef.current && isAnimating) {
      cancelFlipAnimation(sceneRef.current);
      setIsAnimating(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`page-flip-wrapper cursor-pointer select-none ${className}`}
      onClick={handleClickFlip}
      style={{
        perspective: `${config.perspective}px`,
          perspectiveOrigin: isRTL ? 'right center' : 'left center',
      }}
    >
      <div
        ref={sceneRef}
        className="page-flip-scene"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transition: `transform ${config.duration}ms cubic-bezier(0.645, 0.045, 0.355, 1)`,
        }}
      >
        {/* Front side */}
        <div
          className="page-flip-front"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(0deg)',
            zIndex: 2,
          }}
        >
          {frontContent}
        </div>

        {/* Back side */}
        {backContent && (
          <div
            className="page-flip-back"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: isRTL ? 'rotateY(-180deg)' : 'rotateY(180deg)',
              zIndex: 1,
            }}
          >
            {backContent}
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {isAnimating && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

/**
 * Double-page spread component
 */
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
