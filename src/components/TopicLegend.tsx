'use client';

import { TOPICS } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

interface TopicLegendProps {
  compact?: boolean;
  onFilter?: (color: string | null) => void;
  activeFilter?: string | null;
}

export default function TopicLegend({ compact, onFilter, activeFilter }: TopicLegendProps) {
  const { topicName } = useI18n();
  const topics = Object.values(TOPICS);

  if (compact) {
    return (
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-xs">
        {topics.map(t => (
          <button
            key={t.id}
            onClick={() => onFilter?.(activeFilter === t.color ? null : t.color)}
            className={`flex items-center gap-1 py-1.5 px-2 rounded transition-colors ${
              activeFilter === t.color ? 'ring-2 ring-offset-1' : 'hover:bg-black/5'
            }`}
            style={activeFilter === t.color ? { outlineColor: t.hex } : undefined}
          >
            <span className="topic-dot" style={{ backgroundColor: t.hex }} />
            <span>{topicName(t.id)}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      {topics.map(t => (
        <button
          key={t.id}
          onClick={() => onFilter?.(activeFilter === t.color ? null : t.color)}
          className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
            activeFilter === t.color
              ? 'border-current shadow-sm'
              : 'border-transparent hover:bg-black/5'
          }`}
          style={activeFilter === t.color ? { borderColor: t.hex } : undefined}
        >
          <span
            className="w-4 h-4 rounded-full shrink-0"
            style={{ backgroundColor: t.hex }}
          />
          <div className="text-start">
            <div className="text-sm font-medium">{topicName(t.id)}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
