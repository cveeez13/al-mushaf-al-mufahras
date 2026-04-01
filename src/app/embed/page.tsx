'use client';

import { useState, useEffect } from 'react';
import { SURAH_NAMES, TOPICS } from '@/lib/types';
import type { Verse } from '@/lib/types';
import { getDailyVerseIndex } from '@/lib/recommendations';

/**
 * Standalone embeddable Verse-of-the-Day page.
 * Works without app context — fetches data directly.
 * Embed via: <iframe src="/embed" width="100%" height="280" frameborder="0"></iframe>
 */
export default function EmbedPage() {
  const [verse, setVerse] = useState<Verse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/data/topics_master.json');
        const data = await res.json();
        const verses: Verse[] = data.verses;
        const date = new Date().toISOString().split('T')[0];
        const idx = getDailyVerseIndex(date, verses.length);
        setVerse(verses[idx]);
      } catch {
        // Silently fail
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.skeleton, width: '40%', height: 16, marginBottom: 16 }} />
        <div style={{ ...styles.skeleton, width: '100%', height: 24, marginBottom: 8 }} />
        <div style={{ ...styles.skeleton, width: '70%', height: 24 }} />
      </div>
    );
  }

  if (!verse) {
    return (
      <div style={styles.container}>
        <p style={{ color: '#999', textAlign: 'center' }}>Unable to load verse</p>
      </div>
    );
  }

  const topic = Object.values(TOPICS).find(t => t.color === verse.topic.color);

  return (
    <div
      style={{
        ...styles.container,
        background: `linear-gradient(135deg, ${topic?.hex || '#3498DB'}12, ${topic?.hex || '#3498DB'}06)`,
        borderColor: `${topic?.hex || '#3498DB'}40`,
      }}
    >
      {/* Header */}
      <div style={styles.header}>
        <span style={{ fontSize: 18 }}>🌟</span>
        <span style={{ ...styles.title, color: topic?.hex }}>آية اليوم</span>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          style={styles.link}
        >
          المصحف المفهرس ↗
        </a>
      </div>

      {/* Verse text */}
      <p style={styles.verseText}>{verse.text}</p>

      {/* Footer */}
      <div style={styles.footer}>
        <span
          style={{
            ...styles.topicBadge,
            backgroundColor: topic?.hex,
          }}
        >
          {topic?.name_ar}
        </span>
        <span style={styles.ref}>
          {SURAH_NAMES[verse.surah]} : {verse.ayah}
        </span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "'Amiri', 'IBM Plex Sans Arabic', serif",
    direction: 'rtl',
    maxWidth: 500,
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
  verseText: {
    fontSize: 20,
    lineHeight: 2.4,
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
