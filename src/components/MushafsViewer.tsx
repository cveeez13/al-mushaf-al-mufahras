'use client';

/**
 * Mushaf Viewer Component
 *
 * Complete printed Quran reading experience with:
 * - 17 different Mushaf styles
 * - Page-flip animations
 * - Swipe navigation
 * - Topic/Place color overlays
 * - Image optimization
 * - Full RTL/LTR support
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import {
  getMushafStyle,
  getAllMushafTypes,
  getMushafTypesByCategory,
  MushafType,
  MushafStyle,
} from '@/lib/mushafStyles';
import {
  DEFAULT_FLIP_CONFIG,
  getPageFlipCSS,
  createFlipAnimation,
  PageFlipConfig,
} from '@/lib/pageFlipAnimation';
import {
  SwipeDetector,
  SwipeEvent,
  DEFAULT_SWIPE_CONFIG,
} from '@/lib/swipeDetector';
import {
  DEFAULT_OVERLAY_CONFIG,
  OverlayConfig,
  getTopicColor,
  TopicType,
} from '@/lib/mushafOverlays';
import {
  DEFAULT_IMAGE_CONFIG,
  getOptimizedImageUrl,
  getResponsiveImageSrcset,
  getLazyLoadingAttrs,
  PagePreloader,
} from '@/lib/mushafImageOptimization';
import { QURAN_VERSES } from '@/lib/quranData';

export interface MushafsViewerProps {
  initialPage?: number;
  mushafType?: MushafType;
  enablePageFlip?: boolean;
  enableSwipe?: boolean;
  enableOverlay?: boolean;
  onPageChange?: (page: number) => void;
  onMushafChange?: (type: MushafType) => void;
  pageImageBaseUrl?: string;
  className?: string;
}

export const MushafsViewer: React.FC<MushafsViewerProps> = ({
  initialPage = 1,
  mushafType = 'madani',
  enablePageFlip = true,
  enableSwipe = true,
  enableOverlay = true,
  onPageChange,
  onMushafChange,
  pageImageBaseUrl = '/scans',
  className = '',
}) => {
  const { t, isRTL } = useI18n();
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [selectedMushaf, setSelectedMushaf] = useState<MushafType>(mushafType);
  const [mushafStyle, setMushafStyle] = useState<MushafStyle>(
    getMushafStyle(selectedMushaf)
  );
  const [selectedTopic, setSelectedTopic] = useState<TopicType | null>(null);
  const [overlayConfig, setOverlayConfig] = useState<OverlayConfig>(
    DEFAULT_OVERLAY_CONFIG
  );
  const [flipConfig, setFlipConfig] = useState<PageFlipConfig>(
    DEFAULT_FLIP_CONFIG
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const [showMushafSelector, setShowMushafSelector] = useState(false);

  const viewerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageFlipRef = useRef<HTMLDivElement>(null);
  const swipeDetectorRef = useRef<SwipeDetector | null>(null);
  const preloaderRef = useRef<PagePreloader>(new PagePreloader(pageImageBaseUrl, DEFAULT_IMAGE_CONFIG));

  // Initialize swipe detector
  useEffect(() => {
    if (!enableSwipe || !containerRef.current) return;

    swipeDetectorRef.current = new SwipeDetector(
      containerRef.current,
      DEFAULT_SWIPE_CONFIG
    );

    swipeDetectorRef.current.on('swipe-left', () => nextPage());
    swipeDetectorRef.current.on('swipe-right', () => previousPage());

    return () => {
      if (swipeDetectorRef.current) {
        // Cleanup handled by SwipeDetector
      }
    };
  }, [enableSwipe]);

  // Preload pages
  useEffect(() => {
    preloaderRef.current.preload(currentPage, 2);
  }, [currentPage]);

  // Update mushaf style
  useEffect(() => {
    const newStyle = getMushafStyle(selectedMushaf);
    setMushafStyle(newStyle);
    onMushafChange?.(selectedMushaf);
  }, [selectedMushaf, onMushafChange]);

  // Inject flip animation CSS
  useEffect(() => {
    const styleId = 'mushaf-flip-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = getPageFlipCSS(flipConfig);
    document.head.appendChild(style);

    return () => {
      document.getElementById(styleId)?.remove();
    };
  }, [flipConfig]);

  const handleNextPage = useCallback(async () => {
    if (isAnimating || currentPage >= 604) return;

    setIsAnimating(true);

    if (enablePageFlip && pageFlipRef.current) {
      await createFlipAnimation(
        pageFlipRef.current,
        'forward',
        flipConfig
      );
    }

    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    onPageChange?.(nextPage);
    setIsAnimating(false);
  }, [currentPage, enablePageFlip, flipConfig, isAnimating, onPageChange]);

  const handlePreviousPage = useCallback(async () => {
    if (isAnimating || currentPage <= 1) return;

    setIsAnimating(true);

    if (enablePageFlip && pageFlipRef.current) {
      await createFlipAnimation(
        pageFlipRef.current,
        'backward',
        flipConfig
      );
    }

    const prevPage = currentPage - 1;
    setCurrentPage(prevPage);
    onPageChange?.(prevPage);
    setIsAnimating(false);
  }, [currentPage, enablePageFlip, flipConfig, isAnimating, onPageChange]);

  const nextPage = handleNextPage;
  const previousPage = handlePreviousPage;

  // Get page information
  const pageVerses = QURAN_VERSES.filter(v => v.pageNumber === currentPage);
  const surahsOnPage = [...new Set(pageVerses.map(v => v.surahNumber))];

  return (
    <div
      ref={containerRef}
      className={`mushaf-viewer min-h-screen flex flex-col ${isRTL ? 'rtl' : 'ltr'} ${className}`}
    >
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Mushaf Selector */}
          <div className="relative">
            <button
              onClick={() => setShowMushafSelector(!showMushafSelector)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              title={t('chooseMushaf')}
            >
              {mushafStyle.name_en}
            </button>

            {showMushafSelector && (
              <div className="absolute top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-10 max-h-96 overflow-y-auto">
                {/* Traditional */}
                <div className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-50 sticky top-0">
                  Traditional
                </div>
                {getMushafTypesByCategory('traditional').map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedMushaf(type);
                      setShowMushafSelector(false);
                    }}
                    className={`block w-full text-left px-4 py-2 hover:bg-blue-50 transition ${
                      selectedMushaf === type ? 'bg-blue-100' : ''
                    }`}
                  >
                    {getMushafStyle(type).name_en}
                  </button>
                ))}

                {/* Regional */}
                <div className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-50 sticky top-0">
                  Regional
                </div>
                {getMushafTypesByCategory('regional').map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedMushaf(type);
                      setShowMushafSelector(false);
                    }}
                    className={`block w-full text-left px-4 py-2 hover:bg-blue-50 transition ${
                      selectedMushaf === type ? 'bg-blue-100' : ''
                    }`}
                  >
                    {getMushafStyle(type).name_en}
                  </button>
                ))}

                {/* Historical */}
                <div className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-50 sticky top-0">
                  Historical
                </div>
                {getMushafTypesByCategory('historical').map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedMushaf(type);
                      setShowMushafSelector(false);
                    }}
                    className={`block w-full text-left px-4 py-2 hover:bg-blue-50 transition ${
                      selectedMushaf === type ? 'bg-blue-100' : ''
                    }`}
                  >
                    {getMushafStyle(type).name_en}
                  </button>
                ))}

                {/* Modern */}
                <div className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-50 sticky top-0">
                  Modern
                </div>
                {getMushafTypesByCategory('modern').map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedMushaf(type);
                      setShowMushafSelector(false);
                    }}
                    className={`block w-full text-left px-4 py-2 hover:bg-blue-50 transition ${
                      selectedMushaf === type ? 'bg-blue-100' : ''
                    }`}
                  >
                    {getMushafStyle(type).name_en}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Page indicator */}
          <span className="text-gray-600 font-medium">
            {t('page')} {currentPage} / 604
          </span>
        </div>

        {/* Topic overlay selector */}
        {enableOverlay && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">{t('overlay')}:</label>
            <select
              value={selectedTopic || 'none'}
              onChange={(e) => setSelectedTopic(e.target.value === 'none' ? null : (e.target.value as TopicType))}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="none">{t('none')}</option>
              <option value="belief">Belief</option>
              <option value="law">Laws</option>
              <option value="stories">Stories</option>
              <option value="moral">Morality</option>
              <option value="history">History</option>
              <option value="science">Science</option>
              <option value="spiritual">Spiritual</option>
            </select>
          </div>
        )}
      </div>

      {/* Main viewer */}
      <div
        ref={viewerRef}
        className="flex-1 flex items-center justify-center bg-gray-100 p-4 overflow-hidden"
        style={{
          perspective: `${flipConfig.perspective}px`,
        }}
      >
        {/* Page flip container */}
        <div
          ref={pageFlipRef}
          className="page-flip-container w-full max-w-2xl aspect-[7/10] bg-white rounded-lg shadow-2xl overflow-hidden"
          style={{
            backgroundColor: mushafStyle.paper.color,
            fontFamily: mushafStyle.font,
          }}
        >
          <div className="page-flip-scene w-full h-full flex flex-col">
            {/* Page content */}
            <div className="flex-1 overflow-y-auto p-8" style={{
              padding: `${mushafStyle.padding.page}px`,
              fontSize: `${mushafStyle.fontSize.base}px`,
              lineHeight: mushafStyle.spacing.lineHeight,
              color: mushafStyle.colors.text,
              columns: mushafStyle.layout.columns,
              columnGap: `${mushafStyle.padding.column}px`,
            }}>
              {/* Page header */}
              {mushafStyle.layout.pageHeader && (
                <div className="text-center mb-4 text-sm text-gray-400">
                  {surahsOnPage.length > 0 && (
                    <span>
                      {surahsOnPage
                        .map(surahNum => QURAN_VERSES.find(v => v.surahNumber === surahNum)?.surahName)
                        .join(' / ')}
                    </span>
                  )}
                </div>
              )}

              {/* Verses */}
              {pageVerses.map(verse => (
                <div
                  key={`${verse.surahNumber}:${verse.verseNumber}`}
                  className="mb-4 leading-relaxed"
                  dir="rtl"
                  style={{
                    backgroundColor: selectedTopic 
                      ? `${getTopicColor(selectedTopic)}${Math.round(overlayConfig.opacity * 255)
                          .toString(16)
                          .padStart(2, '0')}` 
                      : 'transparent',
                    borderRadius: mushafStyle.layout.frameVerse ? '4px' : '0',
                    padding: mushafStyle.layout.frameVerse ? '4px 8px' : '0',
                  }}
                >
                  {/* Verse number */}
                  {mushafStyle.layout.verseNumber !== 'inline' && (
                    <span
                      className="inline-block font-bold"
                      style={{
                        fontSize: `${mushafStyle.fontSize.number}px`,
                        color: mushafStyle.colors.verseNumber,
                        marginLeft: mushafStyle.layout.verseNumber === 'margin' ? '8px' : '0',
                        border:
                          mushafStyle.layout.frameVerse
                            ? `2px solid ${mushafStyle.colors.verseNumber}`
                            : 'none',
                        borderRadius: '4px',
                        padding: mushafStyle.layout.frameVerse ? '2px 6px' : '0',
                      }}
                    >
                      ﴾{verse.verseNumber}﴿
                    </span>
                  )}

                  {/* Verse text */}
                  <span
                    dir="rtl"
                    style={{
                      fontSize: `${mushafStyle.fontSize.verse}px`,
                      wordSpacing: `${mushafStyle.spacing.wordSpacing}px`,
                      letterSpacing: `${mushafStyle.spacing.letterSpacing}px`,
                    }}
                  >
                    {verse.text}
                  </span>

                  {/* Inline verse number */}
                  {mushafStyle.layout.verseNumber === 'inline' && (
                    <span
                      className="inline-block font-bold"
                      style={{
                        fontSize: `${mushafStyle.fontSize.number}px`,
                        color: mushafStyle.colors.verseNumber,
                        marginRight: '4px',
                      }}
                    >
                      ﴾{verse.verseNumber}﴿
                    </span>
                  )}
                </div>
              ))}

              {/* Watermark */}
              {mushafStyle.layout.watermark && (
                <div className="fixed opacity-5 pointer-events-none text-2xl font-bold">
                  {mushafStyle.name_en}
                </div>
              )}
            </div>

            {/* Page number */}
            <div className="text-center py-4 text-sm" style={{
              color: mushafStyle.colors.pageNumber,
            }}>
              {currentPage}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-t border-gray-200 p-4 flex items-center justify-between">
        <button
          onClick={previousPage}
          disabled={currentPage <= 1 || isAnimating}
          className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 disabled:opacity-50 transition"
          title={t('previous')}
        >
          ← {t('previous')}
        </button>

        <input
          type="number"
          min="1"
          max="604"
          value={currentPage}
          onChange={(e) => {
            const page = parseInt(e.target.value, 10);
            if (page >= 1 && page <= 604) {
              setCurrentPage(page);
              onPageChange?.(page);
            }
          }}
          className="w-20 px-3 py-2 border border-gray-300 rounded text-center"
        />

        <button
          onClick={nextPage}
          disabled={currentPage >= 604 || isAnimating}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          title={t('next')}
        >
          {t('next')} →
        </button>
      </div>
    </div>
  );
};

export default MushafsViewer;
