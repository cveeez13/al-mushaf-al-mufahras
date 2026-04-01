import { describe, it, expect, beforeEach } from 'vitest';
import {
  createReflection, updateReflection, deleteReflection,
  toggleLike, addReply, toggleReplyLike,
  loadAllReflections, getReflectionsPaginated, getReflectionStats,
  getReflectionCountForVerse, getAuthor, setAuthorName,
  moderateContent,
  type Reflection, type SortBy, type FilterBy,
} from '@/lib/reflections';

beforeEach(() => {
  localStorage.clear();
});

// ─── Content Moderation ─────────────────────────────────────

describe('moderateContent', () => {
  it('passes valid Arabic text', () => {
    expect(moderateContent('تأمل رائع في هذه الآية').passed).toBe(true);
  });

  it('passes valid English text', () => {
    expect(moderateContent('A beautiful reflection on mercy.').passed).toBe(true);
  });

  it('rejects empty text', () => {
    const result = moderateContent('');
    expect(result.passed).toBe(false);
    expect(result.reason).toBe('empty');
  });

  it('rejects too-short text', () => {
    const result = moderateContent('ab');
    expect(result.passed).toBe(false);
    expect(result.reason).toBe('too_short');
  });

  it('rejects too-long text (>2000)', () => {
    const result = moderateContent('a'.repeat(2001));
    expect(result.passed).toBe(false);
    expect(result.reason).toBe('too_long');
  });

  it('rejects text with inappropriate Arabic words', () => {
    expect(moderateContent('هذا غبي').passed).toBe(false);
  });

  it('rejects text with URLs (spam prevention)', () => {
    expect(moderateContent('Check out https://spam.com').passed).toBe(false);
  });

  it('rejects excessive repeated characters', () => {
    expect(moderateContent('aaaaaaaaaa').passed).toBe(false);
  });
});

// ─── Author Identity ────────────────────────────────────────

describe('Author', () => {
  it('getAuthor creates persistent identity', () => {
    const a1 = getAuthor();
    expect(a1.id).toBeTruthy();
    const a2 = getAuthor();
    expect(a2.id).toBe(a1.id);
  });

  it('setAuthorName updates name', () => {
    setAuthorName('أحمد');
    expect(getAuthor().name).toBe('أحمد');
  });

  it('setAuthorName strips HTML', () => {
    setAuthorName('<script>alert("xss")</script>Test');
    expect(getAuthor().name).toBe('alert("xss")Test');
  });

  it('setAuthorName limits to 50 chars', () => {
    setAuthorName('a'.repeat(100));
    expect(getAuthor().name.length).toBe(50);
  });
});

// ─── CRUD Operations ────────────────────────────────────────

describe('createReflection', () => {
  it('creates a valid reflection', () => {
    setAuthorName('Test User');
    const r = createReflection({
      verseKey: '2:255', surah: 2, ayah: 255, page: 42,
      text: 'آية الكرسي — أعظم آية',
      topicColor: 'blue', topicId: 1,
    });

    expect(r).not.toBeNull();
    expect(r!.verseKey).toBe('2:255');
    expect(r!.topicColor).toBe('blue');
    expect(r!.authorName).toBe('Test User');
    expect(r!.isOwn).toBe(true);
    expect(r!.likes).toEqual([]);
    expect(r!.replies).toEqual([]);
  });

  it('rejects inappropriate content', () => {
    const r = createReflection({
      verseKey: '1:1', surah: 1, ayah: 1, page: 1,
      text: 'غبي', topicColor: 'blue', topicId: 1,
    });
    expect(r).toBeNull();
  });

  it('sanitizes HTML in text', () => {
    const r = createReflection({
      verseKey: '1:1', surah: 1, ayah: 1, page: 1,
      text: '<b>Bold</b> reflection here',
      topicColor: 'blue', topicId: 1,
    });
    expect(r).not.toBeNull();
    expect(r!.text).toBe('Bold reflection here');
  });

  it('persists to localStorage', () => {
    createReflection({
      verseKey: '1:1', surah: 1, ayah: 1, page: 1,
      text: 'Test reflection for persistence',
      topicColor: 'green', topicId: 2,
    });
    const all = loadAllReflections();
    const found = all.find(r => r.text === 'Test reflection for persistence');
    expect(found).toBeTruthy();
  });
});

describe('updateReflection', () => {
  it('updates own reflection text', () => {
    const r = createReflection({
      verseKey: '1:1', surah: 1, ayah: 1, page: 1,
      text: 'Original text here', topicColor: 'blue', topicId: 1,
    });
    expect(r).not.toBeNull();

    const success = updateReflection(r!.id, 'Updated text here');
    expect(success).toBe(true);

    const all = loadAllReflections();
    const updated = all.find(rr => rr.id === r!.id);
    expect(updated?.text).toBe('Updated text here');
  });

  it('rejects update with moderated content', () => {
    const r = createReflection({
      verseKey: '1:1', surah: 1, ayah: 1, page: 1,
      text: 'Good reflection', topicColor: 'blue', topicId: 1,
    });
    const success = updateReflection(r!.id, 'غبي');
    expect(success).toBe(false);
  });

  it('cannot update another author reflection', () => {
    const r = createReflection({
      verseKey: '1:1', surah: 1, ayah: 1, page: 1,
      text: 'My reflection', topicColor: 'blue', topicId: 1,
    });
    // Simulate different author
    localStorage.removeItem('mushaf-author');
    const success = updateReflection(r!.id, 'Hacked text');
    expect(success).toBe(false);
  });
});

describe('deleteReflection', () => {
  it('deletes own reflection', () => {
    const r = createReflection({
      verseKey: '1:1', surah: 1, ayah: 1, page: 1,
      text: 'To be deleted', topicColor: 'blue', topicId: 1,
    });
    expect(deleteReflection(r!.id)).toBe(true);

    const all = loadAllReflections();
    expect(all.find(rr => rr.id === r!.id)).toBeUndefined();
  });

  it('cannot delete another author reflection', () => {
    const r = createReflection({
      verseKey: '1:1', surah: 1, ayah: 1, page: 1,
      text: 'Not your reflection', topicColor: 'blue', topicId: 1,
    });
    localStorage.removeItem('mushaf-author');
    expect(deleteReflection(r!.id)).toBe(false);
  });
});

// ─── Social: Likes ──────────────────────────────────────────

describe('toggleLike', () => {
  it('likes and unlikes a reflection', () => {
    const r = createReflection({
      verseKey: '1:1', surah: 1, ayah: 1, page: 1,
      text: 'Likeable reflection', topicColor: 'blue', topicId: 1,
    });

    // Like
    const liked = toggleLike(r!.id);
    expect(liked).toBe(true);
    let all = loadAllReflections();
    expect(all.find(rr => rr.id === r!.id)!.likes).toContain(getAuthor().id);

    // Unlike
    const unliked = toggleLike(r!.id);
    expect(unliked).toBe(false);
    all = loadAllReflections();
    expect(all.find(rr => rr.id === r!.id)!.likes).not.toContain(getAuthor().id);
  });

  it('can like seeded reflections', () => {
    const liked = toggleLike('seed-1');
    expect(liked).toBe(true);

    const all = loadAllReflections();
    const r = all.find(rr => rr.id === 'seed-1');
    expect(r!.likes).toContain(getAuthor().id);
  });
});

// ─── Social: Replies ────────────────────────────────────────

describe('addReply', () => {
  it('adds a reply to a reflection', () => {
    const r = createReflection({
      verseKey: '1:1', surah: 1, ayah: 1, page: 1,
      text: 'Reflection with replies', topicColor: 'blue', topicId: 1,
    });
    setAuthorName('Replier');
    const reply = addReply(r!.id, 'Great insight!');
    expect(reply).not.toBeNull();
    expect(reply!.text).toBe('Great insight!');

    const all = loadAllReflections();
    const found = all.find(rr => rr.id === r!.id);
    expect(found!.replies).toHaveLength(1);
  });

  it('rejects inappropriate reply', () => {
    const r = createReflection({
      verseKey: '1:1', surah: 1, ayah: 1, page: 1,
      text: 'Clean reflection', topicColor: 'blue', topicId: 1,
    });
    const reply = addReply(r!.id, 'غبي');
    expect(reply).toBeNull();
  });

  it('can reply to seeded reflections', () => {
    const reply = addReply('seed-2', 'Beautiful story indeed!');
    expect(reply).not.toBeNull();

    const all = loadAllReflections();
    const r = all.find(rr => rr.id === 'seed-2');
    expect(r!.replies.some(rp => rp.text === 'Beautiful story indeed!')).toBe(true);
  });
});

describe('toggleReplyLike', () => {
  it('likes and unlikes a reply', () => {
    const r = createReflection({
      verseKey: '1:1', surah: 1, ayah: 1, page: 1,
      text: 'Parent reflection', topicColor: 'blue', topicId: 1,
    });
    const reply = addReply(r!.id, 'Nice point!');

    const liked = toggleReplyLike(r!.id, reply!.id);
    expect(liked).toBe(true);
  });
});

// ─── Pagination & Filtering ─────────────────────────────────

describe('getReflectionsPaginated', () => {
  it('returns seed reflections on empty localStorage', () => {
    const result = getReflectionsPaginated(1, 'newest', 'all');
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
    expect(result.page).toBe(1);
  });

  it('filters by topic color', () => {
    const result = getReflectionsPaginated(1, 'newest', 'blue');
    for (const r of result.items) {
      expect(r.topicColor).toBe('blue');
    }
  });

  it('filters by "mine"', () => {
    createReflection({
      verseKey: '1:1', surah: 1, ayah: 1, page: 1,
      text: 'My own thought here', topicColor: 'green', topicId: 2,
    });
    const result = getReflectionsPaginated(1, 'newest', 'mine');
    expect(result.items.length).toBe(1);
    expect(result.items[0].isOwn).toBe(true);
  });

  it('filters by verseKey', () => {
    const result = getReflectionsPaginated(1, 'newest', 'all', '2:255');
    for (const r of result.items) {
      expect(r.verseKey).toBe('2:255');
    }
  });

  it('sorts by most_liked', () => {
    const result = getReflectionsPaginated(1, 'most_liked', 'all');
    for (let i = 1; i < result.items.length; i++) {
      expect(result.items[i].likes.length).toBeLessThanOrEqual(result.items[i - 1].likes.length);
    }
  });

  it('sorts by most_discussed', () => {
    const result = getReflectionsPaginated(1, 'most_discussed', 'all');
    for (let i = 1; i < result.items.length; i++) {
      expect(result.items[i].replies.length).toBeLessThanOrEqual(result.items[i - 1].replies.length);
    }
  });
});

// ─── Stats & Counts ─────────────────────────────────────────

describe('getReflectionStats', () => {
  it('returns aggregate stats', () => {
    const stats = getReflectionStats();
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.mine).toBe(0); // no user reflections yet
    expect(Object.keys(stats.topicCounts).length).toBeGreaterThan(0);
  });
});

describe('getReflectionCountForVerse', () => {
  it('counts reflections for a verse', () => {
    const count = getReflectionCountForVerse('2:255');
    expect(count).toBeGreaterThanOrEqual(1); // at least seed-1
  });

  it('returns 0 for verse with no reflections', () => {
    expect(getReflectionCountForVerse('114:6')).toBe(0);
  });
});

// ─── Seed Data ──────────────────────────────────────────────

describe('Seed Reflections', () => {
  it('loads seeded reflections when localStorage is empty', () => {
    const all = loadAllReflections();
    expect(all.length).toBe(6); // 6 seeds
  });

  it('seeded reflections marked as not own', () => {
    const all = loadAllReflections();
    for (const r of all) {
      expect(r.isOwn).toBe(false);
    }
  });

  it('user reflections merged with seeds', () => {
    createReflection({
      verseKey: '1:1', surah: 1, ayah: 1, page: 1,
      text: 'My personal reflection', topicColor: 'blue', topicId: 1,
    });
    const all = loadAllReflections();
    expect(all.length).toBe(7); // 6 seeds + 1 user
    expect(all.filter(r => r.isOwn)).toHaveLength(1);
  });

  it('seeds have proper structure', () => {
    const all = loadAllReflections();
    for (const r of all) {
      expect(r.id).toBeTruthy();
      expect(r.verseKey).toMatch(/^\d+:\d+$/);
      expect(r.text.length).toBeGreaterThan(10);
      expect(r.topicColor).toBeTruthy();
      expect(r.authorName).toBeTruthy();
    }
  });
});
