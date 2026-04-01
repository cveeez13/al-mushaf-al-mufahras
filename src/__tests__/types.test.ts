import { describe, it, expect } from 'vitest';
import { TOPICS, TOPIC_BG, TOPIC_HEX_BG, SURAH_NAMES } from '@/lib/types';
import type { Topic, Verse } from '@/lib/types';

describe('TOPICS constant', () => {
  it('should have exactly 7 topics', () => {
    expect(Object.keys(TOPICS)).toHaveLength(7);
  });

  it('should have sequential IDs 1-7', () => {
    for (let i = 1; i <= 7; i++) {
      expect(TOPICS[i]).toBeDefined();
      expect(TOPICS[i].id).toBe(i);
    }
  });

  it('each topic should have all required fields', () => {
    for (const t of Object.values(TOPICS)) {
      expect(t.id).toBeGreaterThanOrEqual(1);
      expect(t.id).toBeLessThanOrEqual(7);
      expect(t.color).toBeTruthy();
      expect(t.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(t.name_ar).toBeTruthy();
      expect(t.name_en).toBeTruthy();
    }
  });

  it('should have unique colors', () => {
    const colors = Object.values(TOPICS).map(t => t.color);
    expect(new Set(colors).size).toBe(7);
  });

  it('should have unique hex values', () => {
    const hexes = Object.values(TOPICS).map(t => t.hex);
    expect(new Set(hexes).size).toBe(7);
  });

  it('should include all expected color names', () => {
    const colors = Object.values(TOPICS).map(t => t.color);
    expect(colors).toEqual(expect.arrayContaining(['blue', 'green', 'brown', 'yellow', 'purple', 'orange', 'red']));
  });

  it('topic 1 should be blue (Signs of Allah)', () => {
    expect(TOPICS[1].color).toBe('blue');
    expect(TOPICS[1].hex).toBe('#3498DB');
  });

  it('topic 2 should be green (Believers/Paradise)', () => {
    expect(TOPICS[2].color).toBe('green');
  });

  it('topic 3 should be brown (Fiqh)', () => {
    expect(TOPICS[3].color).toBe('brown');
  });

  it('topic 4 should be yellow (Stories)', () => {
    expect(TOPICS[4].color).toBe('yellow');
  });

  it('topic 5 should be purple (Quran status)', () => {
    expect(TOPICS[5].color).toBe('purple');
  });

  it('topic 6 should be orange (Afterlife)', () => {
    expect(TOPICS[6].color).toBe('orange');
  });

  it('topic 7 should be red (Hellfire)', () => {
    expect(TOPICS[7].color).toBe('red');
  });
});

describe('TOPIC_BG', () => {
  it('should have a Tailwind class for each color', () => {
    for (const t of Object.values(TOPICS)) {
      expect(TOPIC_BG[t.color]).toBeDefined();
      expect(TOPIC_BG[t.color]).toMatch(/^bg-topic-/);
    }
  });
});

describe('TOPIC_HEX_BG', () => {
  it('should have a hex background for each color', () => {
    for (const t of Object.values(TOPICS)) {
      expect(TOPIC_HEX_BG[t.color]).toBeDefined();
      expect(TOPIC_HEX_BG[t.color]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('background hex should differ from topic hex', () => {
    for (const t of Object.values(TOPICS)) {
      expect(TOPIC_HEX_BG[t.color]).not.toBe(t.hex);
    }
  });
});

describe('SURAH_NAMES', () => {
  it('should have exactly 114 surahs', () => {
    expect(Object.keys(SURAH_NAMES)).toHaveLength(114);
  });

  it('should have sequential keys 1-114', () => {
    for (let i = 1; i <= 114; i++) {
      expect(SURAH_NAMES[i]).toBeDefined();
      expect(SURAH_NAMES[i].length).toBeGreaterThan(0);
    }
  });

  it('first surah should be Al-Fatiha', () => {
    expect(SURAH_NAMES[1]).toBe('الفاتحة');
  });

  it('last surah should be An-Nas', () => {
    expect(SURAH_NAMES[114]).toBe('الناس');
  });

  it('Surah Al-Baqarah should be correct', () => {
    expect(SURAH_NAMES[2]).toBe('البقرة');
  });

  it('Surah Yusuf should be correct', () => {
    expect(SURAH_NAMES[12]).toBe('يوسف');
  });

  it('all names should be non-empty Arabic strings', () => {
    for (const name of Object.values(SURAH_NAMES)) {
      expect(name.length).toBeGreaterThan(0);
      // Arabic Unicode range
      expect(name).toMatch(/[\u0600-\u06FF]/);
    }
  });
});

describe('Topic interface', () => {
  it('should accept valid topic objects', () => {
    const topic: Topic = {
      id: 1,
      color: 'blue',
      hex: '#3498DB',
      name_ar: 'دلائل قدرة الله وعظمته',
      name_en: "Signs of Allah's Power & Greatness",
    };
    expect(topic.id).toBe(1);
    expect(topic.color).toBe('blue');
  });
});

describe('Verse interface', () => {
  it('should accept valid verse objects', () => {
    const verse: Verse = {
      surah: 1,
      ayah: 1,
      page: 1,
      verse_key: '1:1',
      text: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
      topic: TOPICS[1],
      confidence: 'high',
      method: 'keyword_good',
    };
    expect(verse.surah).toBe(1);
    expect(verse.verse_key).toBe('1:1');
    expect(verse.topic.id).toBe(1);
  });
});
