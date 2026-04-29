'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { getVersesByTopicColor } from '@/lib/data';
import { useI18n } from '@/lib/i18n';
import { TOPICS, SURAH_NAMES, TOPIC_HEX_BG, type Verse } from '@/lib/types';
import { useMemorization } from '@/lib/useMemorization';
import VerseBookmarkButton from './VerseBookmarkButton';

interface TopicVersesPanelProps {
  topicColor: string;
  onClose: () => void;
  onGoToPage: (page: number) => void;
  onOpenTafsir?: (surah: number, ayah: number, text: string) => void;
  onOpenAiTafsir?: (surah: number, ayah: number, text: string, topicColor: string, topicId: number) => void;
}

export default function TopicVersesPanel({
  topicColor,
  onClose,
  onGoToPage,
  onOpenTafsir,
  onOpenAiTafsir,
}: TopicVersesPanelProps) {
  const { topicName, lang } = useI18n();
  const { addCard, removeCard, isInDeck } = useMemorization();
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);

  const topic = useMemo(
    () => Object.values(TOPICS).find((item) => item.color === topicColor),
    [topicColor]
  );

  useEffect(() => {
    setLoading(true);
    getVersesByTopicColor(topicColor).then((result) => {
      setVerses(result);
      setLoading(false);
    });
  }, [topicColor]);

  const surahGroups = useMemo(() => {
    const groups: Array<{ surah: number; name: string; verses: Verse[] }> = [];

    for (const verse of verses) {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.surah === verse.surah) {
        lastGroup.verses.push(verse);
      } else {
        groups.push({
          surah: verse.surah,
          name: SURAH_NAMES[verse.surah] || `${verse.surah}`,
          verses: [verse],
        });
      }
    }

    return groups;
  }, [verses]);

  const surahRefs = useRef<Record<number, HTMLDivElement | null>>({});

  if (!topic) return null;

  const bgColor = TOPIC_HEX_BG[topicColor] || '#F5F0E6';
  const verseInkColor = '#24150E';
  const verseMetaColor = '#5A3A22';
  const accentTextColor = `color-mix(in srgb, ${topic.hex} 38%, ${verseInkColor} 62%)`;
  const accentSoftBg = `color-mix(in srgb, ${topic.hex} 16%, #FFF8EF 84%)`;
  const accentBorder = `color-mix(in srgb, ${topic.hex} 34%, #D8C4A8 66%)`;

  return (
    <div
      className="topic-verses-panel"
      style={{ '--topic-bg': bgColor, '--topic-hex': topic.hex } as CSSProperties}
    >
      <div className="topic-verses-header" style={{ backgroundColor: topic.hex }}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="topic-verses-dot" style={{ backgroundColor: '#fff' }} />
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-white">{topicName(topic.id)}</h2>
            <p className="mt-0.5 text-xs text-white/90">
              {loading ? '...' : `${verses.length} ${lang === 'ar' ? 'آية' : 'verses'}`}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="rounded-lg p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
          type="button"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {!loading && surahGroups.length > 1 && (
        <div className="sticky top-0 z-20 flex flex-wrap gap-2 overflow-x-auto border-b border-[var(--color-mushaf-border)]/40 bg-[var(--color-mushaf-paper)] px-3 py-2">
          {surahGroups.map((group) => (
            <button
              key={group.surah}
              className="rounded px-2 py-1 text-xs font-bold transition-colors hover:brightness-95"
              style={{
                backgroundColor: accentSoftBg,
                color: accentTextColor,
                border: `1px solid ${accentBorder}`,
              }}
              onClick={() => surahRefs.current[group.surah]?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              type="button"
            >
              {group.name}
            </button>
          ))}
        </div>
      )}

      <div className="topic-verses-content">
        {loading ? (
          <div className="animate-pulse py-10 text-center text-[var(--color-mushaf-text)]/50">
            {lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </div>
        ) : (
          surahGroups.map((group) => (
            <div
              key={group.surah}
              className="topic-verses-surah-group"
              ref={(element) => {
                surahRefs.current[group.surah] = element;
              }}
            >
              <div className="topic-verses-surah-header" style={{ borderColor: topic.hex }}>
                <span>
                  {lang === 'ar' ? 'سورة' : 'Surah'} {group.name}
                </span>
                <span className="text-xs" style={{ color: accentTextColor, opacity: 0.9 }}>
                  {group.verses.length} {lang === 'ar' ? 'آية' : 'verses'}
                </span>
              </div>

              <div className="topic-verses-list">
                {group.verses.map((verse) => {
                  const inDeck = isInDeck(verse.verse_key);
                  const openTafsir = () => onOpenTafsir?.(verse.surah, verse.ayah, verse.text);
                  const openAiTafsir = () =>
                    onOpenAiTafsir?.(verse.surah, verse.ayah, verse.text, verse.topic.color, verse.topic.id);

                  return (
                    <div
                      key={verse.verse_key}
                      className="topic-verse-item gap-2"
                      style={{
                        backgroundColor: bgColor,
                        border: `1px solid ${accentBorder}`,
                        boxShadow: '0 1px 0 rgba(255,255,255,0.35) inset',
                      }}
                      onClick={() => verse.page && onGoToPage(verse.page)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && verse.page) onGoToPage(verse.page);
                      }}
                    >
                      <button
                        type="button"
                        className="topic-verse-number"
                        style={{ backgroundColor: topic.hex }}
                        title={
                          lang === 'ar'
                            ? 'اضغط لفتح التفسير، أو Shift+Click لفتح شرح AI'
                            : 'Click for Tafsir, or Shift+Click for AI Tafsir'
                        }
                        onClick={(event) => {
                          event.stopPropagation();
                          if (event.shiftKey) {
                            openAiTafsir();
                            return;
                          }
                          openTafsir();
                        }}
                      >
                        {verse.ayah}
                      </button>

                      <span
                        className="topic-verse-text font-[var(--font-arabic)]"
                        dir="rtl"
                        style={{ color: verseInkColor, opacity: 1 }}
                      >
                        {verse.text}
                      </span>

                      {verse.page && (
                        <span className="topic-verse-page" style={{ color: verseMetaColor, opacity: 1 }}>
                          {lang === 'ar' ? 'ص' : 'p'} {verse.page}
                        </span>
                      )}

                      {onOpenTafsir && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openTafsir();
                          }}
                          className="rounded-lg px-2 py-1 text-xs font-semibold transition-colors hover:brightness-95"
                          style={{
                            backgroundColor: '#E8E1D3',
                            color: verseInkColor,
                            border: `1px solid ${accentBorder}`,
                          }}
                        >
                          {lang === 'ar' ? 'تفسير' : 'Tafsir'}
                        </button>
                      )}

                      {onOpenAiTafsir && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openAiTafsir();
                          }}
                          className="rounded-lg px-2 py-1 text-xs font-semibold transition-colors hover:brightness-95"
                          style={{
                            backgroundColor: accentSoftBg,
                            color: accentTextColor,
                            border: `1px solid ${accentBorder}`,
                          }}
                        >
                          {lang === 'ar' ? 'اشرحلي AI' : 'AI Tafsir'}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (inDeck) {
                            removeCard(verse.verse_key);
                          } else {
                            addCard({
                              verse_key: verse.verse_key,
                              surah: verse.surah,
                              ayah: verse.ayah,
                              text: verse.text,
                              topic_color: verse.topic.color,
                            });
                          }
                        }}
                        className="rounded-lg px-2 py-1 text-xs font-semibold transition-colors hover:brightness-95"
                        style={
                          inDeck
                            ? {
                                backgroundColor: 'color-mix(in srgb, var(--color-topic-green) 16%, var(--color-mushaf-paper) 84%)',
                                color: 'color-mix(in srgb, var(--color-topic-green) 78%, #1f3d28 22%)',
                                border: '1px solid color-mix(in srgb, var(--color-topic-green) 30%, var(--color-mushaf-border) 70%)',
                              }
                            : {
                                backgroundColor: accentSoftBg,
                                color: accentTextColor,
                                border: `1px solid ${accentBorder}`,
                              }
                        }
                      >
                        {inDeck ? (lang === 'ar' ? 'في الحفظ' : 'In Deck') : (lang === 'ar' ? 'أضف للحفظ' : 'Add')}
                      </button>

                      <VerseBookmarkButton verse={verse} compact />
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
