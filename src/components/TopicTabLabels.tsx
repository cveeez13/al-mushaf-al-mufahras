'use client';

import { useMemo } from 'react';
import { TOPICS } from '@/lib/types';

interface TopicTabLabelsProps {
  topicDistribution?: Record<string, number>;
  dominantTopic?: string;
  side: 'left' | 'right';
  onFilterTopic?: (color: string | null) => void;
  showAllTopics?: boolean;
  activeTopic?: string | null;
  className?: string;
}

const SHORT_NAMES: Record<number, string> = {
  1: 'قدرة الله',
  2: 'السيرة والمؤمنين',
  3: 'الأحكام والفقه',
  4: 'قصص الأنبياء',
  5: 'مكانة القرآن',
  6: 'اليوم الآخر',
  7: 'أوصاف النار',
};

const COLOR_MAP: Record<string, { id: number; shortName: string; hex: string }> = {};
for (const [id, topic] of Object.entries(TOPICS)) {
  const n = Number(id);
  COLOR_MAP[topic.color] = { id: n, shortName: SHORT_NAMES[n] || topic.name_ar, hex: topic.hex };
}

const TAB_FILLS: Record<string, { bg: string; border: string }> = {
  olive: { bg: '#E4EAD0', border: '#C5D4A0' },
  sky: { bg: '#D4E8F5', border: '#AED6F1' },
  gold: { bg: '#F0E6C8', border: '#DDD09E' },
  pink: { bg: '#F2D9E2', border: '#E0B8C8' },
  purple: { bg: '#E2DBF0', border: '#D2B4DE' },
  turquoise: { bg: '#D0EDEA', border: '#A8D8D3' },
  orange: { bg: '#F2DFD0', border: '#E0C0A0' },
};

export default function TopicTabLabels({
  topicDistribution = {},
  dominantTopic,
  side,
  onFilterTopic,
  showAllTopics = false,
  activeTopic = null,
  className,
}: TopicTabLabelsProps) {
  const tabs = useMemo(() => {
    if (showAllTopics) {
      return Object.values(TOPICS).map(topic => {
        const fills = TAB_FILLS[topic.color] || { bg: '#F5F0E6', border: '#D4C4A8' };
        return {
          color: topic.color,
          count: 0,
          shortName: SHORT_NAMES[topic.id] || topic.name_ar,
          hex: topic.hex,
          isDominant: activeTopic === topic.color,
          bg: fills.bg,
          border: fills.border,
        };
      });
    }

    return Object.entries(topicDistribution)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 7)
      .map(([color, count]) => {
        const meta = COLOR_MAP[color];
        const fills = TAB_FILLS[color] || { bg: '#F5F0E6', border: '#D4C4A8' };
        return {
          color,
          count,
          shortName: meta?.shortName || color,
          hex: meta?.hex || '#999',
          isDominant: color === dominantTopic,
          bg: fills.bg,
          border: fills.border,
        };
      });
  }, [showAllTopics, topicDistribution, dominantTopic, activeTopic]);

  if (tabs.length === 0) return null;

  return (
    <nav className={`topic-tabs-stack topic-tabs-${side}${className ? ` ${className}` : ''}`} aria-label="فهرس المواضيع">
      {tabs.map(tab => (
        <button
          key={tab.color}
          className={`topic-tab-pill${tab.isDominant ? ' topic-tab-dominant' : ''}`}
          style={
            {
              '--ttl-bg': tab.bg,
              '--ttl-border': tab.border,
              '--ttl-hex': tab.hex,
            } as React.CSSProperties
          }
          aria-label={showAllTopics ? tab.shortName : `${tab.shortName} – ${tab.count} آيات`}
          onClick={() => onFilterTopic?.(tab.color)}
          type="button"
        >
          <span className="topic-tab-dot" aria-hidden="true" />
          <span className="topic-tab-name">{tab.shortName}</span>
          {!showAllTopics && tab.isDominant && tab.count > 1 && (
            <span className="topic-tab-badge">{tab.count}</span>
          )}
        </button>
      ))}
    </nav>
  );
}
