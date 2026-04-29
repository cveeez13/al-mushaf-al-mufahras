'use client';

import { useMemo } from 'react';
import { TOPICS, Verse } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

interface TopicTabsProps {
  verses: Verse[];
  filterTopic: string | null;
  onFilterTopic?: (color: string | null) => void;
}

/** Short Arabic labels for physical tab display */
const SHORT_NAMES: Record<number, string> = {
  1: 'قدرة الله',
  2: 'السيرة والمؤمنين',
  3: 'الأحكام',
  4: 'قصص الأنبياء',
  5: 'مكانة القرآن',
  6: 'اليوم الآخر',
  7: 'أوصاف النار',
};

/** Pastel fills for book-edge tabs */
const TAB_STYLE: Record<string, { bg: string; border: string }> = {
  olive:     { bg: '#E4EAD0', border: '#C5D4A0' },
  sky:       { bg: '#D4E8F5', border: '#AED6F1' },
  gold:      { bg: '#F0E6C8', border: '#DDD09E' },
  pink:      { bg: '#F2D9E2', border: '#E0B8C8' },
  purple:    { bg: '#E2DBF0', border: '#D2B4DE' },
  turquoise: { bg: '#D0EDEA', border: '#A8D8D3' },
  orange:    { bg: '#F2DFD0', border: '#E0C0A0' },
};

export default function TopicTabs({ verses, filterTopic, onFilterTopic }: TopicTabsProps) {
  const { topicName } = useI18n();

  const distribution = useMemo(() => {
    const dist: Record<number, number> = {};
    for (const v of verses) {
      dist[v.topic.id] = (dist[v.topic.id] || 0) + 1;
    }
    return Object.entries(dist)
      .map(([id, count]) => ({ id: Number(id), count }))
      .sort((a, b) => b.count - a.count);
  }, [verses]);

  // Show all 7 topics, highlight those present on this page
  const allTopics = useMemo(() => {
    const present = new Set(distribution.map(d => d.id));
    const dominantId = distribution[0]?.id;
    return Object.values(TOPICS).map(topic => ({
      ...topic,
      count: distribution.find(d => d.id === topic.id)?.count || 0,
      isPresent: present.has(topic.id),
      isDominant: topic.id === dominantId,
      shortName: SHORT_NAMES[topic.id] || topicName(topic.id),
      style: TAB_STYLE[topic.color] || { bg: '#F5F0E6', border: '#D4C4A8' },
    }));
  }, [distribution, topicName]);

  return (
    <nav className="topic-side-tabs" aria-label="ألسنة المواضيع">
      {allTopics.map((tab, index) => {
        const isActive = filterTopic === tab.color;
        const faded = !tab.isPresent;

        return (
          <button
            key={tab.id}
            className={`topic-side-tab${tab.isDominant ? ' topic-side-tab-dominant' : ''}${isActive ? ' topic-side-tab-active' : ''}${faded ? ' topic-side-tab-faded' : ''}`}
            style={{
              '--tab-bg': tab.style.bg,
              '--tab-border': tab.style.border,
              '--tab-hex': tab.hex,
              animationDelay: `${index * 40}ms`,
            } as React.CSSProperties}
            onClick={() => onFilterTopic?.(isActive ? null : tab.color)}
            aria-label={`${topicName(tab.id)}${tab.count ? ` – ${tab.count} آيات` : ''}`}
            aria-pressed={isActive}
            type="button"
          >
            <span className="topic-side-tab-name">{tab.shortName}</span>
          </button>
        );
      })}
    </nav>
  );
}
