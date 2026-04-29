'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { Verse, SURAH_NAMES, TOPIC_HEX_BG } from '@/lib/types';
import { getVersesForPage } from '@/lib/data';
import { useI18n } from '@/lib/i18n';
import { useBookmarks } from '@/lib/useBookmarks';
import { useReadingStats } from '@/lib/useReadingStats';
import TopicSummaryBar from './TopicSummaryBar';
import TopicTabs from './TopicTabs';
import TafsirCorner from './TafsirCorner';
import QiraatCorner from './QiraatCorner';
import SearchBar from './SearchBar';
import TopicVersesPanel from './TopicVersesPanel';
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


import ScanPageViewer from './ScanPageViewer';

export default function MushafViewer({ currentPage, onPageChange, filterTopic, onFilterTopic, onVerseClick, onShareVerse, onReflect, onAiTafsir }: MushafViewerProps) {
  const { t, topicName, lang } = useI18n();
  const { addBookmark, removeBookmark, isBookmarked } = useBookmarks();
  const { recordPageVisit } = useReadingStats();
  const { playVerse, playPage, isCurrentVerse, isPlaying } = useAudioPlayer();
  const { isNight, NIGHT_TOPIC_COLORS, NIGHT_TOPIC_BG } = useSmartNightMode();
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  // لا يوجد وضع نص مفهرس، فقط المصحف المصور
  const touchStartX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeVerse, setActiveVerse] = useState<string | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
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

  // Close popover on page change, set default selected verse
  useEffect(() => {
    setActiveVerse(null);
    if (verses.length > 0) setSelectedVerse(verses[0]);
  }, [currentPage, verses]);

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
    if (dx < -threshold && currentPage < 604) onPageChange(currentPage + 1);
    if (dx > threshold && currentPage > 1) onPageChange(currentPage - 1);
    touchStartX.current = null;
  };

  // Group verses by surah
  const surahGroups = useMemo(() => {
    const groups: { surah: number; verses: Verse[] }[] = [];
    for (const v of verses) {
      const last = groups[groups.length - 1];
      if (last && last.surah === v.surah) last.verses.push(v);
      else groups.push({ surah: v.surah, verses: [v] });
    }
    return groups;
  }, [verses]);

  return (
    <div
      ref={containerRef}
      className="mushaf-viewer-root"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >

      {/* شريط البحث */}
      <div className="mushaf-top-bar">
        <SearchBar onGoToPage={onPageChange} onFilterTopic={onFilterTopic} />
      </div>

      {/* عرض المصحف المصور فقط */}
      <div className="mushaf-page-container">
        <ScanPageViewer
          currentPage={currentPage}
          onPageChange={onPageChange}
          filterTopic={filterTopic}
          onFilterTopic={onFilterTopic}
          onVerseClick={onVerseClick}
          onAiTafsir={onAiTafsir}
        />
      </div>
      {/* تمت إزالة كل الشروط والتكرار، يبقى عرض واحد فقط */}
    </div>
  );
}
