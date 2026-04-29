'use client';

import { useEffect, useState } from 'react';
import { SURAH_NAMES, TOPICS } from '@/lib/types';
import { getSurahsData, searchVerses, getVersesForSurah } from '@/lib/data';
import type { SurahInfo, Verse } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import TopicLegend from './TopicLegend';
import VerseBookmarkButton from './VerseBookmarkButton';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onGoToPage: (page: number) => void;
  filterTopic: string | null;
  onFilterTopic: (topic: string | null) => void;
}

export default function Sidebar({
  open, onClose, onGoToPage, filterTopic, onFilterTopic
}: SidebarProps) {
  const { t, lang } = useI18n();
  const [surahs, setSurahs] = useState<SurahInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Verse[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchTopicFilter, setSearchTopicFilter] = useState<string>('all');

  useEffect(() => {
    getSurahsData().then(setSurahs);
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    let results = await searchVerses(searchQuery.trim());
    if (searchTopicFilter !== 'all') {
      results = results.filter(v => v.topic.color === searchTopicFilter);
    }
    setSearchResults(results.slice(0, 100));
    setSearching(false);
  };

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal={open ? true : undefined}
        aria-label={t('menu')}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        className={`fixed lg:static top-0 right-0 h-full w-[85vw] max-w-80 bg-[var(--color-mushaf-paper)] border-l border-[var(--color-mushaf-border)] z-50 transition-transform duration-300 flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0 lg:w-0 lg:border-0 lg:overflow-hidden'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--color-mushaf-border)] flex items-center justify-between shrink-0">
          <h2 className="font-bold text-[var(--color-mushaf-gold)]">{t('menu')}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-black/5 lg:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Topic Filter */}
          <div className="p-4 border-b border-[var(--color-mushaf-border)]">
            <h3 className="text-sm font-semibold mb-3">{t('filterByTopic')}</h3>
            <TopicLegend
              onFilter={onFilterTopic}
              activeFilter={filterTopic}
            />
            {filterTopic && (
              <button
                onClick={() => onFilterTopic(null)}
                className="mt-2 text-xs text-[var(--color-mushaf-gold)] hover:underline w-full text-center"
              >
                {t('removeFilter')}
              </button>
            )}
          </div>

          {/* Surah Index */}
          <div className="p-4 border-b border-[var(--color-mushaf-border)]">
            <h3 className="text-sm font-semibold mb-3">{t('surahIndex')}</h3>
            <div className="space-y-0.5 max-h-80 overflow-y-auto">
              {surahs.map(s => (
                <button
                  key={s.surah}
                  onClick={async () => {
                    const verses = await getVersesForSurah(s.surah);
                    const firstPage = verses[0]?.page;
                    if (firstPage) onGoToPage(firstPage);
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--color-mushaf-border)]/30 text-sm transition-colors"
                >
                  <span className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-mushaf-border)]/30 text-xs font-medium" dir="ltr">
                    {s.surah}
                  </span>
                  <span className="flex-1 text-start">{s.name_ar}</span>
                  <span
                    className="topic-dot"
                    style={{ backgroundColor: Object.values(TOPICS).find(t => t.color === s.dominant_topic)?.hex || '#999' }}
                  />
                  <span className="text-xs text-[var(--color-mushaf-text)]/40">{s.verse_count} {t('ayah')}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="p-4">
            <h3 className="text-sm font-semibold mb-3">{t('searchQuran')}</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder={t('searchPlaceholder')}
                className="flex-1 px-3 py-2 text-sm bg-transparent border border-[var(--color-mushaf-border)] rounded-lg focus:outline-none focus:border-[var(--color-mushaf-gold)]"
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="px-3 py-2 text-sm bg-[var(--color-mushaf-gold)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {searching ? '...' : t('searchBtn')}
              </button>
            </div>

            {/* Topic filter for search */}
            <div className="mt-2">
              <select
                value={searchTopicFilter}
                onChange={e => setSearchTopicFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-transparent border border-[var(--color-mushaf-border)] rounded-lg focus:outline-none focus:border-[var(--color-mushaf-gold)]"
              >
                <option value="all">{t('allTopics')}</option>
                {Object.values(TOPICS).map(topic => (
                  <option key={topic.id} value={topic.color}>
                    {lang === 'ar' ? topic.name_ar : topic.name_en}
                  </option>
                ))}
              </select>
            </div>

            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map(v => {
                  const openResult = () => {
                    if (v.page) onGoToPage(v.page);
                    onClose();
                  };

                  return (
                    <div
                      key={v.verse_key}
                      role="button"
                      tabIndex={0}
                      onClick={openResult}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openResult();
                        }
                      }}
                      className="w-full cursor-pointer rounded-lg p-2 text-start transition-colors hover:bg-[var(--color-mushaf-border)]/30"
                    >
                      <div className="mb-1 flex items-center gap-2 text-xs text-[var(--color-mushaf-text)]/60">
                        <span
                          className="topic-dot"
                          style={{ backgroundColor: v.topic.hex }}
                        />
                        <span className="flex-1">{SURAH_NAMES[v.surah]} : {v.ayah}</span>
                        <VerseBookmarkButton verse={v} compact />
                      </div>
                      <div className="line-clamp-2 font-[var(--font-arabic)] text-sm leading-relaxed">
                        {v.text}
                      </div>
                    </div>
                  );
                })}
                {searchResults.length >= 100 && (
                  <div className="text-xs text-center text-[var(--color-mushaf-text)]/40 py-1">
                    {t('first100')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
