'use client';

import { useMemo, useState } from 'react';
import { SURAH_NAMES, TOPICS } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import type { RecommendedVerse } from '@/lib/recommendations';
import { useVerseOfDay } from '@/lib/useVerseOfDay';
import VerseBookmarkButton from './VerseBookmarkButton';

interface VerseOfDayWidgetProps {
  onGoToPage?: (page: number) => void;
  compact?: boolean;
}

export default function VerseOfDayWidget({
  onGoToPage,
  compact = false,
}: VerseOfDayWidgetProps) {
  const { lang } = useI18n();
  const {
    dailyVerse,
    suggestions,
    loading,
    dismissed,
    dismiss,
    likeVerse,
    skipVerse,
    markOpened,
    feedback,
  } = useVerseOfDay();
  const [expanded, setExpanded] = useState(false);

  const ar = lang === 'ar';

  const visibleSuggestions = useMemo(
    () => suggestions.filter((item) => !feedback.skipped.includes(item.verse.verse_key)),
    [feedback.skipped, suggestions]
  );

  if (loading) {
    return (
      <div className="page-frame animate-pulse rounded-2xl p-6">
        <div className="mb-4 h-4 w-1/3 rounded bg-[var(--color-mushaf-border)]/30" />
        <div className="mb-2 h-6 w-full rounded bg-[var(--color-mushaf-border)]/30" />
        <div className="h-6 w-2/3 rounded bg-[var(--color-mushaf-border)]/30" />
      </div>
    );
  }

  if (!dailyVerse) return null;
  if (dismissed && !compact) return null;

  const verse = dailyVerse.verse;
  const topic = Object.values(TOPICS).find((item) => item.color === verse.topic.color);
  const accentColor = topic?.hex ?? '#C9A96E';

  return (
    <div className={compact ? '' : 'mb-4'}>
      <div
        className="overflow-hidden rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${accentColor}18, ${accentColor}0D)`,
          border: `1px solid ${accentColor}40`,
        }}
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">✦</span>
            <h3 className="text-sm font-bold" style={{ color: accentColor }}>
              {ar ? 'آية اليوم' : 'Verse of the Day'}
            </h3>
          </div>

          {!compact && (
            <button
              onClick={dismiss}
              className="text-xs text-[var(--color-mushaf-text)]/30 transition-colors hover:text-[var(--color-mushaf-text)]/60"
              title={ar ? 'إخفاء' : 'Dismiss'}
            >
              ✕
            </button>
          )}
        </div>

        <div className="px-5 pb-3">
          <p className="font-[var(--font-arabic)] text-xl leading-[2.4] text-[var(--color-mushaf-text)]">
            {verse.text}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-4">
          <div className="flex items-center gap-2">
            <span
              className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-white"
              style={{ backgroundColor: accentColor }}
            >
              {ar ? topic?.name_ar : topic?.name_en}
            </span>
            <span className="text-xs text-[var(--color-mushaf-text)]/50">
              {SURAH_NAMES[verse.surah]} : {verse.ayah}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onGoToPage && verse.page && (
              <button
                onClick={() => {
                  markOpened(verse.verse_key);
                  if (verse.page != null) onGoToPage(verse.page);
                }}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition-all hover:brightness-95"
                style={{ backgroundColor: accentColor, color: '#fff' }}
              >
                {ar ? 'اذهب للصفحة' : 'Go to page'} {verse.page}
              </button>
            )}
            <VerseBookmarkButton verse={verse} compact />
          </div>
        </div>
      </div>

      {visibleSuggestions.length > 0 && !compact && (
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <button
              onClick={() => setExpanded((value) => !value)}
              className="flex items-center gap-2 text-xs text-[var(--color-mushaf-text)]/50 transition-colors hover:text-[var(--color-mushaf-gold)]"
            >
              <span>{expanded ? '▾' : '▸'}</span>
              <span>
                {ar
                  ? `${visibleSuggestions.length} توصيات ذكية لك`
                  : `${visibleSuggestions.length} smart recommendations`}
              </span>
            </button>

            <span className="rounded-full border border-[var(--color-mushaf-gold)]/35 bg-[color-mix(in_srgb,var(--color-mushaf-gold)_16%,var(--color-mushaf-paper))] px-2 py-1 text-[10px] font-medium text-[color-mix(in_srgb,var(--color-mushaf-gold)_78%,#4A3120)]">
              {ar ? 'تعلم من قراءتك' : 'Learns from your reading'}
            </span>
          </div>

          {expanded && (
            <div className="space-y-2">
              {visibleSuggestions.map((rec) => (
                <SuggestionCard
                  key={rec.verse.verse_key}
                  rec={rec}
                  ar={ar}
                  onGoToPage={onGoToPage}
                  onLike={() => likeVerse(rec.verse.verse_key)}
                  onSkip={() => skipVerse(rec.verse.verse_key)}
                  onOpen={() => markOpened(rec.verse.verse_key)}
                  isLiked={feedback.liked.includes(rec.verse.verse_key)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SuggestionCard({
  rec,
  ar,
  onGoToPage,
  onLike,
  onSkip,
  onOpen,
  isLiked,
}: {
  rec: RecommendedVerse;
  ar: boolean;
  onGoToPage?: (page: number) => void;
  onLike: () => void;
  onSkip: () => void;
  onOpen: () => void;
  isLiked: boolean;
}) {
  const topic = Object.values(TOPICS).find((item) => item.color === rec.verse.topic.color);
  const accentColor = topic?.hex ?? '#C9A96E';

  return (
    <div className="page-frame rounded-xl p-3">
      <div className="flex items-start gap-3">
        <div
          className="h-full min-h-12 w-1.5 shrink-0 self-stretch rounded-full"
          style={{ backgroundColor: accentColor }}
        />

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="text-[10px] text-[var(--color-mushaf-text)]/45">
              {ar ? rec.reason_ar : rec.reason_en}
            </span>
            <span className="text-[10px] text-[var(--color-mushaf-gold)]">
              score {Math.round(rec.score)}
            </span>
          </div>

          <p className="line-clamp-2 font-[var(--font-arabic)] text-sm leading-relaxed">
            {rec.verse.text}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-[var(--color-mushaf-text)]/40">
              {SURAH_NAMES[rec.verse.surah]} : {rec.verse.ayah}
            </span>

            {onGoToPage && rec.verse.page && (
              <button
                onClick={() => {
                  onOpen();
                  if (rec.verse.page != null) onGoToPage(rec.verse.page);
                }}
                className="rounded-full border px-2 py-1 text-[10px] font-medium hover:brightness-95"
                style={{
                  color: accentColor,
                  borderColor: `${accentColor}50`,
                  backgroundColor: `${accentColor}14`,
                }}
              >
                {ar ? 'صفحة' : 'p.'} {rec.verse.page}
              </button>
            )}

            <VerseBookmarkButton verse={rec.verse} compact />

            <button
              onClick={onLike}
              className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                isLiked
                  ? 'text-white'
                  : 'bg-[var(--color-mushaf-border)]/30 text-[var(--color-mushaf-text)]/75'
              }`}
              style={isLiked ? { backgroundColor: accentColor } : undefined}
            >
              {ar ? 'أعجبني' : 'Like'}
            </button>

            <button
              onClick={onSkip}
              className="rounded-full bg-[var(--color-mushaf-border)]/30 px-2 py-1 text-[10px] font-medium text-[var(--color-mushaf-text)]/75"
            >
              {ar ? 'تخطَّ' : 'Skip'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VerseOfDayEmbed() {
  return (
    <div
      id="mushaf-votd-embed"
      style={{
        fontFamily: "'Amiri', 'IBM Plex Sans Arabic', serif",
        direction: 'rtl',
        maxWidth: '500px',
        margin: '0 auto',
      }}
    />
  );
}
