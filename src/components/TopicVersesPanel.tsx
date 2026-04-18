'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { getVersesByTopicColor } from '@/lib/data';
import { useI18n } from '@/lib/i18n';
import { TOPICS, SURAH_NAMES, TOPIC_HEX_BG, type Verse } from '@/lib/types';
import { useMemorization } from '@/lib/useMemorization';

interface TopicVersesPanelProps {
  topicColor: string;
  onClose: () => void;
  onGoToPage: (page: number) => void;
}

export default function TopicVersesPanel({
  topicColor,
  onClose,
  onGoToPage,
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
            <p className="mt-0.5 text-xs text-white/70">
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
              className="rounded bg-[var(--color-mushaf-gold)]/10 px-2 py-1 text-xs font-bold text-[var(--color-mushaf-gold)] hover:bg-[var(--color-mushaf-gold)]/30"
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
                <span className="text-xs opacity-60">
                  {group.verses.length} {lang === 'ar' ? 'آية' : 'verses'}
                </span>
              </div>

              <div className="topic-verses-list">
                {group.verses.map((verse) => {
                  const inDeck = isInDeck(verse.verse_key);

                  return (
                    <div
                      key={verse.verse_key}
                      className="topic-verse-item gap-2"
                      style={{ backgroundColor: bgColor }}
                      onClick={() => verse.page && onGoToPage(verse.page)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && verse.page) onGoToPage(verse.page);
                      }}
                    >
                      <span className="topic-verse-number" style={{ backgroundColor: topic.hex }}>
                        {verse.ayah}
                      </span>

                      <span className="topic-verse-text font-[var(--font-arabic)]" dir="rtl">
                        {verse.text}
                      </span>

                      {verse.page && (
                        <span className="topic-verse-page">
                          {lang === 'ar' ? 'ص' : 'p'} {verse.page}
                        </span>
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
                        className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                          inDeck
                            ? 'bg-[var(--color-topic-green)]/15 text-[var(--color-topic-green)]'
                            : 'bg-[var(--color-mushaf-gold)]/15 text-[var(--color-mushaf-gold)]'
                        }`}
                      >
                        {inDeck ? (lang === 'ar' ? 'في الحفظ' : 'In Deck') : (lang === 'ar' ? 'أضف للحفظ' : 'Add')}
                      </button>
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
