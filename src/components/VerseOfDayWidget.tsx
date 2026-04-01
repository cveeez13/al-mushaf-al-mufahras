'use client';

import { useState } from 'react';
import { SURAH_NAMES, TOPICS } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { useVerseOfDay } from '@/lib/useVerseOfDay';
import type { RecommendedVerse } from '@/lib/recommendations';

interface VerseOfDayWidgetProps {
  onGoToPage?: (page: number) => void;
  compact?: boolean; // For embed mode
}

export default function VerseOfDayWidget({ onGoToPage, compact = false }: VerseOfDayWidgetProps) {
  const { lang } = useI18n();
  const { dailyVerse, suggestions, loading, dismissed, dismiss } = useVerseOfDay();
  const [expanded, setExpanded] = useState(false);
  const ar = lang === 'ar';

  if (loading) {
    return (
      <div className="page-frame rounded-2xl p-6 animate-pulse">
        <div className="h-4 bg-[var(--color-mushaf-border)]/30 rounded w-1/3 mb-4" />
        <div className="h-6 bg-[var(--color-mushaf-border)]/30 rounded w-full mb-2" />
        <div className="h-6 bg-[var(--color-mushaf-border)]/30 rounded w-2/3" />
      </div>
    );
  }

  if (!dailyVerse) return null;
  if (dismissed && !compact) return null;

  const verse = dailyVerse.verse;
  const topic = Object.values(TOPICS).find(t => t.color === verse.topic.color);

  return (
    <div className={compact ? '' : 'mb-4'}>
      {/* Featured Daily Verse */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${topic?.hex || '#3498DB'}15, ${topic?.hex || '#3498DB'}08)`,
          border: `1px solid ${topic?.hex || '#3498DB'}30`,
        }}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌟</span>
            <h3 className="text-sm font-bold" style={{ color: topic?.hex }}>
              {ar ? 'آية اليوم' : 'Verse of the Day'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {!compact && (
              <button
                onClick={dismiss}
                className="text-xs text-[var(--color-mushaf-text)]/30 hover:text-[var(--color-mushaf-text)]/60 transition-colors"
                title={ar ? 'إخفاء' : 'Dismiss'}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Verse text */}
        <div className="px-5 pb-3">
          <p className="font-[var(--font-arabic)] text-xl leading-[2.4] text-[var(--color-mushaf-text)]">
            {verse.text}
          </p>
        </div>

        {/* Verse info bar */}
        <div className="px-5 pb-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span
              className="px-2.5 py-1 rounded-lg text-white text-[11px] font-medium"
              style={{ backgroundColor: topic?.hex }}
            >
              {ar ? topic?.name_ar : topic?.name_en}
            </span>
            <span className="text-xs text-[var(--color-mushaf-text)]/50">
              {SURAH_NAMES[verse.surah]} : {verse.ayah}
            </span>
          </div>
          {onGoToPage && verse.page && (
            <button
              onClick={() => onGoToPage(verse.page!)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors hover:opacity-80"
              style={{ backgroundColor: topic?.hex, color: '#fff' }}
            >
              {ar ? 'اذهب للصفحة' : 'Go to page'} {verse.page}
            </button>
          )}
        </div>
      </div>

      {/* Suggestions - expandable */}
      {suggestions.length > 0 && !compact && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-xs text-[var(--color-mushaf-text)]/50 hover:text-[var(--color-mushaf-gold)] transition-colors w-full"
          >
            <span>{expanded ? '▾' : '▸'}</span>
            <span>{ar ? `${suggestions.length} آيات مقترحة لك` : `${suggestions.length} suggested verses for you`}</span>
          </button>

          {expanded && (
            <div className="mt-2 space-y-2">
              {suggestions.map((rec) => (
                <SuggestionCard
                  key={rec.verse.verse_key}
                  rec={rec}
                  ar={ar}
                  onGoToPage={onGoToPage}
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
}: {
  rec: RecommendedVerse;
  ar: boolean;
  onGoToPage?: (page: number) => void;
}) {
  const topic = Object.values(TOPICS).find(t => t.color === rec.verse.topic.color);

  return (
    <div className="page-frame rounded-xl p-3 flex items-start gap-3">
      <div
        className="w-1.5 self-stretch rounded-full shrink-0"
        style={{ backgroundColor: topic?.hex || '#999' }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] text-[var(--color-mushaf-text)]/40">
            {ar ? rec.reason_ar : rec.reason_en}
          </span>
        </div>
        <p className="font-[var(--font-arabic)] text-sm leading-relaxed line-clamp-2">
          {rec.verse.text}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] text-[var(--color-mushaf-text)]/40">
            {SURAH_NAMES[rec.verse.surah]} : {rec.verse.ayah}
          </span>
          {onGoToPage && rec.verse.page && (
            <button
              onClick={() => onGoToPage(rec.verse.page!)}
              className="text-[10px] text-[var(--color-mushaf-gold)] hover:underline"
            >
              {ar ? 'صفحة' : 'p.'} {rec.verse.page}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Standalone embeddable version (no hooks, self-contained).
 * Fetches data directly and renders without app context.
 */
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
    >
      {/* Rendered by the embed page with inline data */}
    </div>
  );
}
