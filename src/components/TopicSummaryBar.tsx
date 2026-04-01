'use client';

import { Verse, TOPICS } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

interface TopicSummaryBarProps {
  verses: Verse[];
}

export default function TopicSummaryBar({ verses }: TopicSummaryBarProps) {
  const { t, topicName } = useI18n();

  if (verses.length === 0) return null;

  // Calculate topic distribution
  const dist: Record<string, number> = {};
  for (const v of verses) {
    dist[v.topic.color] = (dist[v.topic.color] || 0) + 1;
  }

  const total = verses.length;
  const sorted = Object.entries(dist).sort((a, b) => b[1] - a[1]);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="text-xs text-[var(--color-mushaf-text)]/50 mb-1.5 text-center">{t('topicSummary')}</div>
      {/* Color bar */}
      <div className="flex h-2 rounded-full overflow-hidden mb-2">
        {sorted.map(([color, count]) => {
          const topic = Object.values(TOPICS).find(t => t.color === color);
          return (
            <div
              key={color}
              style={{ width: `${(count / total) * 100}%`, backgroundColor: topic?.hex || '#999' }}
              title={`${topicName(topic?.id || 0)}: ${count}/${total}`}
            />
          );
        })}
      </div>
      {/* Labels */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[10px] text-[var(--color-mushaf-text)]/60">
        {sorted.map(([color, count]) => {
          const topic = Object.values(TOPICS).find(t => t.color === color);
          const pct = Math.round((count / total) * 100);
          return (
            <span key={color} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: topic?.hex }} />
              {topicName(topic?.id || 0)} ({pct}%)
            </span>
          );
        })}
      </div>
    </div>
  );
}
