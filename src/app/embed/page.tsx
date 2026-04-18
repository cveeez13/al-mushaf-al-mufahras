'use client';

import { useEffect, useMemo, useState } from 'react';
import { SURAH_NAMES, TOPICS, type Verse } from '@/lib/types';
import {
  emptyRecommendationFeedback,
  getRecommendations,
  type RecommendedVerse,
} from '@/lib/recommendations';
import type { ReadingStats } from '@/lib/useReadingStats';

type EmbedMode = 'daily' | 'recommendations' | 'hybrid';

const EMPTY_STATS: ReadingStats = {
  pages_visited: [],
  total_pages_read: 0,
  last_page: 1,
  last_read_date: '',
  streak_days: 0,
  daily_history: {},
  page_visit_counts: {},
  daily_visit_counts: {},
};

function readConfig(): { mode: EmbedMode; count: number } {
  if (typeof window === 'undefined') return { mode: 'hybrid', count: 4 };
  const params = new URLSearchParams(window.location.search);
  const rawMode = params.get('mode');
  const mode: EmbedMode =
    rawMode === 'daily' || rawMode === 'recommendations' || rawMode === 'hybrid'
      ? rawMode
      : 'hybrid';
  const count = Math.max(1, Math.min(6, Number(params.get('count')) || 4));
  return { mode, count };
}

export default function EmbedPage() {
  const [items, setItems] = useState<RecommendedVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(() => readConfig());

  useEffect(() => {
    setConfig(readConfig());
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/data/topics_master.json');
        const data = await res.json();
        const verses: Verse[] = data.verses;
        const recommendations = getRecommendations(
          EMPTY_STATS,
          verses,
          Math.max(2, config.count + 1),
          undefined,
          emptyRecommendationFeedback()
        );

        if (cancelled) return;
        setItems(recommendations);
      } catch {
        if (!cancelled) setItems([]);
      }

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [config]);

  const visibleItems = useMemo(() => {
    if (config.mode === 'daily') {
      return items.filter((item) => item.reason === 'daily').slice(0, 1);
    }

    if (config.mode === 'recommendations') {
      return items.filter((item) => item.reason !== 'daily').slice(0, config.count);
    }

    return items.slice(0, config.count);
  }, [config, items]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.skeleton, width: '40%', height: 16, marginBottom: 16 }} />
        <div style={{ ...styles.skeleton, width: '100%', height: 24, marginBottom: 8 }} />
        <div style={{ ...styles.skeleton, width: '70%', height: 24 }} />
      </div>
    );
  }

  if (visibleItems.length === 0) {
    return (
      <div style={styles.container}>
        <p style={{ color: '#999', textAlign: 'center' }}>Unable to load recommendations</p>
      </div>
    );
  }

  return (
    <div style={{ ...styles.container, maxWidth: config.mode === 'daily' ? 500 : 620 }}>
      <div style={styles.header}>
        <span style={{ fontSize: 18 }}>{config.mode === 'daily' ? '✦' : '▣'}</span>
        <span style={styles.title}>
          {config.mode === 'daily' ? 'آية اليوم' : 'توصيات قرآنية ذكية'}
        </span>
        <a href="/" target="_blank" rel="noopener noreferrer" style={styles.link}>
          المصحف المفهرس ↗
        </a>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {visibleItems.map((item) => {
          const topic = Object.values(TOPICS).find((entry) => entry.color === item.verse.topic.color);
          return (
            <div
              key={item.verse.verse_key}
              style={{
                ...styles.card,
                background: `linear-gradient(135deg, ${topic?.hex || '#3498DB'}12, ${topic?.hex || '#3498DB'}06)`,
                borderColor: `${topic?.hex || '#3498DB'}35`,
              }}
            >
              <div style={styles.cardHead}>
                <span style={{ ...styles.reason, color: topic?.hex || '#b8860b' }}>
                  {item.reason_ar}
                </span>
                <span style={styles.ref}>
                  {SURAH_NAMES[item.verse.surah]} : {item.verse.ayah}
                </span>
              </div>
              <p style={styles.verseText}>{item.verse.text}</p>
              <div style={styles.footer}>
                <span style={{ ...styles.topicBadge, backgroundColor: topic?.hex || '#3498DB' }}>
                  {topic?.name_ar}
                </span>
                {item.verse.page && <span style={styles.ref}>ص {item.verse.page}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "'Amiri', 'IBM Plex Sans Arabic', serif",
    direction: 'rtl',
    maxWidth: 620,
    margin: '0 auto',
    padding: '20px 24px',
    borderRadius: 16,
    border: '1px solid #e0d5c3',
    backgroundColor: '#fefcf8',
  },
  skeleton: {
    backgroundColor: '#e0d5c3',
    borderRadius: 6,
    animation: 'pulse 1.5s infinite',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontWeight: 700,
    fontSize: 14,
    flex: 1,
  },
  link: {
    fontSize: 11,
    color: '#b8860b',
    textDecoration: 'none',
    opacity: 0.7,
  },
  card: {
    border: '1px solid #e0d5c3',
    borderRadius: 14,
    padding: '14px 16px',
  },
  cardHead: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  reason: {
    fontSize: 11,
    fontWeight: 700,
  },
  verseText: {
    fontSize: 20,
    lineHeight: 2.2,
    color: '#2c1810',
    margin: '0 0 12px 0',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  topicBadge: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 500,
    padding: '3px 10px',
    borderRadius: 8,
  },
  ref: {
    fontSize: 12,
    color: '#999',
  },
};
