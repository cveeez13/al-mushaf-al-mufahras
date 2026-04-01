'use client';

import { useI18n } from '@/lib/i18n';
import { useReadingStats } from '@/lib/useReadingStats';
import ReadingHeatmap from './ReadingHeatmap';

interface StatsPanelProps {
  onGoToPage?: (page: number) => void;
}

export default function StatsPanel({ onGoToPage }: StatsPanelProps) {
  const { t } = useI18n();
  const { stats, todayPages, progressPercent } = useReadingStats();

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-lg font-bold text-[var(--color-mushaf-gold)] mb-6 text-center">{t('readingStats')}</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {/* Pages read */}
        <div className="page-frame p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-[var(--color-mushaf-gold)]">{stats.total_pages_read}</div>
          <div className="text-xs text-[var(--color-mushaf-text)]/50 mt-1">{t('pagesRead')}</div>
        </div>

        {/* Today */}
        <div className="page-frame p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-[var(--color-topic-green)]">{todayPages}</div>
          <div className="text-xs text-[var(--color-mushaf-text)]/50 mt-1">{t('todayReading')}</div>
        </div>

        {/* Streak */}
        <div className="page-frame p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-[var(--color-topic-orange)]">{stats.streak_days}</div>
          <div className="text-xs text-[var(--color-mushaf-text)]/50 mt-1">{t('streak')}</div>
        </div>

        {/* Progress */}
        <div className="page-frame p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-[var(--color-topic-blue)]">{progressPercent}%</div>
          <div className="text-xs text-[var(--color-mushaf-text)]/50 mt-1">{t('progress')}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="page-frame p-4 rounded-xl mb-6">
        <div className="flex items-center justify-between text-xs text-[var(--color-mushaf-text)]/60 mb-2">
          <span>{t('progress')}</span>
          <span>{stats.total_pages_read} / 604</span>
        </div>
        <div className="h-3 bg-[var(--color-mushaf-border)]/30 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 bg-gradient-to-l from-[var(--color-mushaf-gold)] to-[var(--color-topic-green)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Reading Heatmap */}
      <div className="page-frame p-4 rounded-xl">
        <ReadingHeatmap stats={stats} onPageClick={onGoToPage} />
      </div>
    </div>
  );
}
