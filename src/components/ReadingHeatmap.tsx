'use client';

import { useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import type { ReadingStats } from '@/lib/useReadingStats';

// Juz start pages (standard Madina Mushaf)
const JUZ_PAGES: [number, number][] = [
  [1,1],[2,22],[3,42],[4,62],[5,82],[6,102],[7,121],[8,142],[9,162],[10,182],
  [11,201],[12,222],[13,242],[14,262],[15,282],[16,302],[17,322],[18,342],[19,362],[20,382],
  [21,400],[22,422],[23,442],[24,462],[25,482],[26,502],[27,522],[28,542],[29,564],[30,582],
];

function getJuzForPage(page: number): number {
  for (let i = JUZ_PAGES.length - 1; i >= 0; i--) {
    if (page >= JUZ_PAGES[i][1]) return JUZ_PAGES[i][0];
  }
  return 1;
}

// 5 intensity levels like GitHub
function getLevel(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 7) return 3;
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
    const c: { page: number; count: number; juz: number }[] = [];
    for (let p = 1; p <= 604; p++) {
      const count = counts[p] || 0;
      if (count > max) max = count;
      c.push({ page: p, count, juz: getJuzForPage(p) });
    }
    return { maxCount: max, cells: c };
  }, [stats.page_visit_counts]);

  const handleMouseEnter = (e: React.MouseEvent, page: number, count: number) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltip({ page, count, x: rect.left + rect.width / 2, y: rect.top });
  };

  const COLS = 22;

  return (
    <div className="w-full">
      {/* Legend */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--color-mushaf-text)]/70">
          {lang === 'ar' ? 'خريطة القراءة' : 'Reading Heatmap'}
        </h3>
        <div className="flex items-center gap-1 text-[10px] text-[var(--color-mushaf-text)]/50">
          <span>{lang === 'ar' ? 'أقل' : 'Less'}</span>
          {LEVEL_COLORS.map((color, i) => (
            <span
              key={i}
              className="w-2.5 h-2.5 rounded-sm inline-block"
              style={{ backgroundColor: color }}
            />
          ))}
          <span>{lang === 'ar' ? 'أكثر' : 'More'}</span>
        </div>
      </div>

      {/* Grid */}
      <div
        className="grid gap-[2px] w-full"
        style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
      >
        {cells.map(({ page, count, juz }) => {
          const level = getLevel(count);
          // Show juz boundary with a subtle left border
          const isJuzStart = JUZ_PAGES.some(([, start]) => start === page);

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

      {/* Juz markers */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-[9px] text-[var(--color-mushaf-text)]/40 justify-center">
        {[1, 5, 10, 15, 20, 25, 30].map(j => {
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

      {/* Stats summary below heatmap */}
      <div className="mt-3 text-center text-xs text-[var(--color-mushaf-text)]/50">
        {stats.total_pages_read} / 604 {t('pagesRead')}
        {maxCount > 0 && (
          <span className="mx-2">·</span>
        )}
        {maxCount > 0 && (
          <span>{lang === 'ar' ? `أكثر صفحة: ${maxCount} مرة` : `Max visits: ${maxCount}`}</span>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-2.5 py-1.5 bg-[var(--color-mushaf-text)] text-[var(--color-mushaf-paper)] text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap"
          style={{
            left: tooltip.x,
            top: tooltip.y - 36,
            transform: 'translateX(-50%)',
          }}
        >
          {t('page')} {tooltip.page} — {tooltip.count} {lang === 'ar' ? 'مرة' : tooltip.count === 1 ? 'visit' : 'visits'}
        </div>
      )}
    </div>
  );
}
