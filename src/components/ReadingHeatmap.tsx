'use client';

import { useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import type { ReadingStats } from '@/lib/useReadingStats';

const JUZ_PAGES: [number, number][] = [
  [1, 1], [2, 22], [3, 42], [4, 62], [5, 82], [6, 102], [7, 121], [8, 142], [9, 162], [10, 182],
  [11, 201], [12, 222], [13, 242], [14, 262], [15, 282], [16, 302], [17, 322], [18, 342], [19, 362], [20, 382],
  [21, 400], [22, 422], [23, 442], [24, 462], [25, 482], [26, 502], [27, 522], [28, 542], [29, 564], [30, 582],
];

function getLevel(count: number, maxCount: number): number {
  if (count <= 0 || maxCount <= 0) return 0;
  const ratio = count / maxCount;
  if (ratio <= 0.2) return 1;
  if (ratio <= 0.45) return 2;
  if (ratio <= 0.7) return 3;
  return 4;
}

const LEVEL_COLORS = [
  'var(--heatmap-0, #ebedf0)',
  'var(--heatmap-1, #9be9a8)',
  'var(--heatmap-2, #40c463)',
  'var(--heatmap-3, #30a14e)',
  'var(--heatmap-4, #216e39)',
];

interface ReadingHeatmapProps {
  stats: ReadingStats;
  onPageClick?: (page: number) => void;
}

export default function ReadingHeatmap({ stats, onPageClick }: ReadingHeatmapProps) {
  const { t, lang } = useI18n();
  const [tooltip, setTooltip] = useState<{ page: number; count: number; x: number; y: number } | null>(null);

  const { maxCount, cells } = useMemo(() => {
    const counts = stats.page_visit_counts || {};
    let max = 0;
    const c: { page: number; count: number; isJuzStart: boolean }[] = [];

    for (let p = 1; p <= 604; p++) {
      const count = counts[p] || 0;
      if (count > max) max = count;
      c.push({
        page: p,
        count,
        isJuzStart: JUZ_PAGES.some(([, start]) => start === p),
      });
    }

    return { maxCount: max, cells: c };
  }, [stats.page_visit_counts]);

  const handleMouseEnter = (event: React.MouseEvent, page: number, count: number) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setTooltip({ page, count, x: rect.left + rect.width / 2, y: rect.top });
  };

  const cols = 22;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--color-mushaf-text)]/70">
          {lang === 'ar' ? 'خريطة حرارة الصفحات' : 'Page Heatmap'}
        </h3>
        <div className="flex items-center gap-1 text-[10px] text-[var(--color-mushaf-text)]/50">
          <span>{lang === 'ar' ? 'أقل' : 'Less'}</span>
          {LEVEL_COLORS.map((color, i) => (
            <span key={i} className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: color }} />
          ))}
          <span>{lang === 'ar' ? 'أكثر' : 'More'}</span>
        </div>
      </div>

      <div className="grid gap-[2px] w-full" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {cells.map(({ page, count, isJuzStart }) => {
          const level = getLevel(count, maxCount);

          return (
            <button
              key={page}
              className="aspect-square rounded-[2px] transition-transform hover:scale-150 hover:z-10 relative"
              style={{
                backgroundColor: LEVEL_COLORS[level],
                outline: isJuzStart ? '1px solid var(--color-mushaf-gold)' : 'none',
              }}
              onClick={() => onPageClick?.(page)}
              onMouseEnter={(e) => handleMouseEnter(e, page, count)}
              onMouseLeave={() => setTooltip(null)}
              aria-label={`${t('page')} ${page} - ${count} ${lang === 'ar' ? 'مرة' : 'visits'}`}
            />
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-[9px] text-[var(--color-mushaf-text)]/40 justify-center">
        {[1, 5, 10, 15, 20, 25, 30].map((j) => {
          const startPage = JUZ_PAGES[j - 1][1];
          return (
            <span key={j}>
              {lang === 'ar' ? `جزء ${j}` : `Juz ${j}`}
              <span className="text-[var(--color-mushaf-gold)] mx-0.5">·</span>
              {t('page')} {startPage}
            </span>
          );
        })}
      </div>

      <div className="mt-3 text-center text-xs text-[var(--color-mushaf-text)]/50">
        {stats.total_pages_read} / 604 {t('pagesRead')}
        {maxCount > 0 && <span className="mx-2">·</span>}
        {maxCount > 0 && (
          <span>
            {lang === 'ar' ? `أعلى تكرار قراءة: ${maxCount}` : `Max repeated reads: ${maxCount}`}
          </span>
        )}
      </div>

      {tooltip && (
        <div
          className="fixed z-50 px-2.5 py-1.5 bg-[var(--color-mushaf-text)] text-[var(--color-mushaf-paper)] text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y - 36, transform: 'translateX(-50%)' }}
        >
          {t('page')} {tooltip.page} - {tooltip.count} {lang === 'ar' ? 'مرة' : tooltip.count === 1 ? 'visit' : 'visits'}
        </div>
      )}
    </div>
  );
}
