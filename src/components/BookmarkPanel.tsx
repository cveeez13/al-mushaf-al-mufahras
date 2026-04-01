'use client';

import { useI18n } from '@/lib/i18n';
import { useBookmarks, Bookmark } from '@/lib/useBookmarks';
import { TOPICS, SURAH_NAMES } from '@/lib/types';

interface BookmarkPanelProps {
  onGoToPage: (page: number) => void;
}

export default function BookmarkPanel({ onGoToPage }: BookmarkPanelProps) {
  const { t, topicName } = useI18n();
  const { bookmarks, removeBookmark, clearBookmarks } = useBookmarks();

  if (bookmarks.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-4xl mb-3">🔖</div>
        <div className="text-[var(--color-mushaf-text)]/50 text-sm">{t('noBookmarks')}</div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[var(--color-mushaf-gold)]">{t('bookmarks')}</h2>
        <button
          onClick={clearBookmarks}
          className="text-xs text-red-500 hover:underline py-2 px-3"
        >
          {t('clearBookmarks')}
        </button>
      </div>

      <div className="space-y-2">
        {bookmarks.map(bm => {
          const topic = Object.values(TOPICS).find(t => t.color === bm.topic_color);
          return (
            <div
              key={bm.verse_key}
              className="page-frame p-3 rounded-lg flex items-start gap-3 hover:shadow-md transition-shadow"
            >
              <div
                className="w-1 self-stretch rounded-full shrink-0"
                style={{ backgroundColor: topic?.hex || '#999' }}
              />
              <button
                className="flex-1 text-start min-w-0"
                onClick={() => bm.page && onGoToPage(bm.page)}
              >
                <div className="flex items-center gap-2 text-xs text-[var(--color-mushaf-text)]/60 mb-1">
                  <span>{SURAH_NAMES[bm.surah]} : {bm.ayah}</span>
                  <span>·</span>
                  <span>{topicName(topic?.id || 0)}</span>
                </div>
                <div className="text-sm font-[var(--font-arabic)] line-clamp-2 leading-relaxed">
                  {bm.text_preview}
                </div>
              </button>
              <button
                onClick={() => removeBookmark(bm.verse_key)}
                className="text-sm text-red-400 hover:text-red-600 shrink-0 p-2.5"
                title={t('removeBookmark')}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
