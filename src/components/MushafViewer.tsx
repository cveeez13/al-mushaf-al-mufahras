'use client';

import { useEffect, useState, useRef } from 'react';
import { Verse, SURAH_NAMES, TOPIC_HEX_BG } from '@/lib/types';
import { getVersesForPage } from '@/lib/data';
import { useI18n } from '@/lib/i18n';
import { useBookmarks } from '@/lib/useBookmarks';
import { useReadingStats } from '@/lib/useReadingStats';
import TopicLegend from './TopicLegend';
import TopicSummaryBar from './TopicSummaryBar';
import { useAudioPlayer } from '@/lib/useAudioPlayer';
import { useSmartNightMode } from '@/lib/useSmartNightMode';

interface MushafViewerProps {
  currentPage: number;
  onPageChange: (page: number) => void;
  filterTopic: string | null;
  onFilterTopic?: (color: string | null) => void;
  onVerseClick?: (surah: number, ayah: number, text: string) => void;
  onShareVerse?: (surah: number, ayah: number, text: string, topicColor: string, topicId: number) => void;
  onReflect?: (surah: number, ayah: number, text: string, topicColor: string, topicId: number, page: number | null) => void;
  onAiTafsir?: (surah: number, ayah: number, text: string, topicColor: string, topicId: number) => void;
}

export default function MushafViewer({ currentPage, onPageChange, filterTopic, onFilterTopic, onVerseClick, onShareVerse, onReflect, onAiTafsir }: MushafViewerProps) {
  const { t, topicName, lang } = useI18n();
  const { addBookmark, removeBookmark, isBookmarked } = useBookmarks();
  const { recordPageVisit } = useReadingStats();
  const { playVerse, playPage, isCurrentVerse, isPlaying } = useAudioPlayer();
  const { isNight, NIGHT_TOPIC_COLORS, NIGHT_TOPIC_BG } = useSmartNightMode();
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeVerse, setActiveVerse] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    getVersesForPage(currentPage).then(v => {
      setVerses(v);
      setLoading(false);
    });
  }, [currentPage]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // RTL: ArrowRight = previous (lower page), ArrowLeft = next (higher page)
      if (e.key === 'ArrowRight' && currentPage > 1) onPageChange(currentPage - 1);
      if (e.key === 'ArrowLeft' && currentPage < 604) onPageChange(currentPage + 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentPage, onPageChange]);

  // Record page visit for reading stats
  useEffect(() => {
    if (!loading && verses.length > 0) {
      recordPageVisit(currentPage);
    }
  }, [currentPage, loading, verses.length, recordPageVisit]);

  // Close popover on page change
  useEffect(() => { setActiveVerse(null); }, [currentPage]);

  // Close popover on click outside
  useEffect(() => {
    if (!activeVerse) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActiveVerse(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [activeVerse]);

  // Touch swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const threshold = 60;
    // RTL: swipe left = next page, swipe right = previous page
    if (dx < -threshold && currentPage < 604) onPageChange(currentPage + 1);
    if (dx > threshold && currentPage > 1) onPageChange(currentPage - 1);
    touchStartX.current = null;
  };

  // Group verses by surah
  const surahGroups: { surah: number; verses: Verse[] }[] = [];
  for (const v of verses) {
    const last = surahGroups[surahGroups.length - 1];
    if (last && last.surah === v.surah) {
      last.verses.push(v);
    } else {
      surahGroups.push({ surah: v.surah, verses: [v] });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-[var(--color-mushaf-gold)] text-xl font-[var(--font-arabic)]">
          {t('loading')}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center gap-4 p-2 sm:p-4 pb-8"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Topic Legend */}
      <TopicLegend compact onFilter={onFilterTopic} activeFilter={filterTopic} />

      {/* Page Frame */}
      <div className="page-frame w-full max-w-3xl p-4 sm:p-8 md:p-12 min-h-[60vh] relative">
        {/* Corner ornaments */}
        <div className="page-corner top-start" />
        <div className="page-corner top-end" />
        <div className="page-corner bottom-start" />
        <div className="page-corner bottom-end" />

        {/* Decorative page number */}
        <div className="page-number-ornament">
          ﴿ {currentPage} ﴾
        </div>

        {surahGroups.map((group, gi) => (
          <div key={`${group.surah}-${gi}`}>
            {/* Show surah header if this is ayah 1 */}
            {group.verses[0].ayah === 1 && (
              <>
                <div className="surah-header">
                  {t('surah')} {SURAH_NAMES[group.surah]}
                </div>
                {group.surah !== 1 && group.surah !== 9 && (
                  <div className="bismillah">
                    بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                  </div>
                )}
              </>
            )}

            {/* Verses - flowing inline */}
            <div className="verse-text text-justify leading-[2.4]">
              {group.verses.map(v => {
                const dimmed = filterTopic && v.topic.color !== filterTopic;
                const bgColor = isNight ? (NIGHT_TOPIC_BG[v.topic.color] || 'transparent') : (TOPIC_HEX_BG[v.topic.color] || 'transparent');
                const bookmarked = isBookmarked(v.verse_key);

                return (
                  <span
                    key={v.verse_key}
                    className={`relative inline verse-transition ${
                      dimmed ? 'opacity-20' : ''
                    }`}
                    style={{
                      backgroundColor: dimmed ? 'transparent' : bgColor,
                      borderRadius: '4px',
                      padding: '2px 0',
                    }}
                    title={`${topicName(v.topic.id)} (${v.verse_key})`}
                  >
                    {v.text}
                    <span
                      className={`verse-number cursor-pointer hover:bg-[var(--color-mushaf-gold)] hover:text-white`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveVerse(prev => prev === v.verse_key ? null : v.verse_key);
                      }}
                      title={lang === 'ar' ? 'اضغط للأوامر' : 'Click for actions'}
                    >{v.ayah}</span>
                    {activeVerse === v.verse_key && (
                      <span ref={popoverRef} className="verse-popover" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { playVerse({ surah: v.surah, ayah: v.ayah, verse_key: v.verse_key, text: v.text }); setActiveVerse(null); }}
                          className={`verse-popover-btn ${isCurrentVerse(v.verse_key) && isPlaying ? 'active' : ''}`}
                          aria-label={`${lang === 'ar' ? 'تشغيل' : 'Play'} ${v.verse_key}`}
                        >
                          <span aria-hidden="true">{isCurrentVerse(v.verse_key) && isPlaying ? '🔊' : '🔈'}</span>
                        </button>
                        <button
                          onClick={() => {
                            if (bookmarked) { removeBookmark(v.verse_key); } else {
                              addBookmark({ verse_key: v.verse_key, surah: v.surah, ayah: v.ayah, page: v.page, topic_color: v.topic.color, text_preview: v.text.slice(0, 60) });
                            }
                            setActiveVerse(null);
                          }}
                          className={`verse-popover-btn ${bookmarked ? 'active' : ''}`}
                          aria-label={`${bookmarked ? (lang === 'ar' ? 'إزالة من المفضلة' : 'Remove bookmark') : (lang === 'ar' ? 'إضافة للمفضلة' : 'Bookmark')} ${v.verse_key}`}
                        >
                          <span aria-hidden="true">{bookmarked ? '★' : '☆'}</span>
                        </button>
                        {onShareVerse && (
                          <button
                            onClick={() => { onShareVerse(v.surah, v.ayah, v.text, v.topic.color, v.topic.id); setActiveVerse(null); }}
                            className="verse-popover-btn"
                            aria-label={`${lang === 'ar' ? 'مشاركة كصورة' : 'Share as image'} ${v.verse_key}`}
                          >
                            <span aria-hidden="true">📷</span>
                          </button>
                        )}
                        {onReflect && (
                          <button
                            onClick={() => { onReflect(v.surah, v.ayah, v.text, v.topic.color, v.topic.id, v.page); setActiveVerse(null); }}
                            className="verse-popover-btn"
                            aria-label={`${lang === 'ar' ? 'تأمل' : 'Reflect'} ${v.verse_key}`}
                          >
                            <span aria-hidden="true">✏️</span>
                          </button>
                        )}
                        {onAiTafsir && (
                          <button
                            onClick={() => { onAiTafsir(v.surah, v.ayah, v.text, v.topic.color, v.topic.id); setActiveVerse(null); }}
                            className="verse-popover-btn"
                            aria-label={`${lang === 'ar' ? 'اشرحلي' : 'Explain'} ${v.verse_key}`}
                          >
                            <span aria-hidden="true">🤖</span>
                          </button>
                        )}
                        {onVerseClick && (
                          <button
                            onClick={() => { onVerseClick(v.surah, v.ayah, v.text); setActiveVerse(null); }}
                            className="verse-popover-btn"
                            aria-label={`${lang === 'ar' ? 'تفسير' : 'Tafsir'} ${v.verse_key}`}
                          >
                            <span aria-hidden="true">📖</span>
                          </button>
                        )}
                      </span>
                    )}
                    {' '}
                  </span>
                );
              })}
            </div>
          </div>
        ))}

        {verses.length === 0 && (
          <div className="text-center text-[var(--color-mushaf-text)]/40 py-20 font-[var(--font-arabic)] text-lg">
            {t('noVerses')}
          </div>
        )}

        {/* Bottom page ornament */}
        {verses.length > 0 && (
          <div className="page-bottom-ornament">
            ❊ ❊ ❊
          </div>
        )}
      </div>

      {/* Play page button */}
      {verses.length > 0 && (
        <button
          onClick={() => playPage(verses.map(v => ({ surah: v.surah, ayah: v.ayah, verse_key: v.verse_key, text: v.text })))}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--color-mushaf-gold)]/40 text-[var(--color-mushaf-gold)] hover:bg-[var(--color-mushaf-gold)]/10 transition-colors text-sm"
        >
          <span>▶</span> {t('playPage')}
        </button>
      )}

      {/* Topic Summary Bar */}
      <TopicSummaryBar verses={verses} />

      {/* Page navigation (bottom) */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="px-4 py-2 rounded-lg bg-[var(--color-mushaf-paper)] border border-[var(--color-mushaf-border)] hover:border-[var(--color-mushaf-gold)] disabled:opacity-30 transition-colors text-sm"
        >
          {t('prevPage')}
        </button>
        <span className="text-sm text-[var(--color-mushaf-text)]/60">{currentPage} / 604</span>
        <button
          onClick={() => onPageChange(Math.min(604, currentPage + 1))}
          disabled={currentPage >= 604}
          className="px-4 py-2 rounded-lg bg-[var(--color-mushaf-paper)] border border-[var(--color-mushaf-border)] hover:border-[var(--color-mushaf-gold)] disabled:opacity-30 transition-colors text-sm"
        >
          {t('nextPage')}
        </button>
      </div>
    </div>
  );
}
