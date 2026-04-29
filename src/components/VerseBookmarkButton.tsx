'use client';

import { Bookmark } from 'lucide-react';
import type { MouseEvent } from 'react';
import { useI18n } from '@/lib/i18n';
import type { Verse } from '@/lib/types';
import { useBookmarks } from '@/lib/useBookmarks';

type BookmarkableVerse = Pick<Verse, 'verse_key' | 'surah' | 'ayah' | 'page' | 'text' | 'topic'>;

interface VerseBookmarkButtonProps {
  verse: BookmarkableVerse;
  className?: string;
  compact?: boolean;
}

export default function VerseBookmarkButton({
  verse,
  className = '',
  compact = false,
}: VerseBookmarkButtonProps) {
  const { t } = useI18n();
  const { addBookmark, removeBookmark, isBookmarked } = useBookmarks();
  const bookmarked = isBookmarked(verse.verse_key);
  const label = bookmarked ? t('removeBookmark') : t('addBookmark');

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (bookmarked) {
      removeBookmark(verse.verse_key);
      return;
    }

    addBookmark({
      verse_key: verse.verse_key,
      surah: verse.surah,
      ayah: verse.ayah,
      page: verse.page,
      topic_color: verse.topic.color,
      text_preview: verse.text.slice(0, 160),
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={bookmarked}
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition-colors hover:brightness-95 ${
        compact ? 'h-8 w-8 px-0' : 'px-2.5 py-1.5'
      } ${
        bookmarked
          ? 'border-[var(--color-mushaf-gold)] bg-[color-mix(in_srgb,var(--color-mushaf-gold)_18%,var(--color-mushaf-paper))] text-[var(--color-mushaf-gold)]'
          : 'border-[var(--color-mushaf-border)] bg-[var(--color-mushaf-paper)] text-[var(--color-mushaf-text)] hover:border-[var(--color-mushaf-gold)] hover:text-[var(--color-mushaf-gold)]'
      } ${className}`}
    >
      <Bookmark
        className="h-4 w-4"
        fill={bookmarked ? 'currentColor' : 'none'}
        strokeWidth={2}
        aria-hidden="true"
      />
      {!compact && <span>{label}</span>}
    </button>
  );
}
