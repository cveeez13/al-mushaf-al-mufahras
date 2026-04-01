/**
 * Reflections & Notes Engine — QuranReflect-style Social Feature
 *
 * Provides:
 * - CRUD operations for reflections (create, read, update, delete)
 * - Auto topic classification from verse topic color
 * - Like/reply system
 * - Content moderation (Arabic & English profanity filter)
 * - Pagination for infinite scroll
 * - Simulated community feed (seeded reflections)
 * - localStorage persistence
 */

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

export interface Reflection {
  id: string;
  verseKey: string;        // "2:255"
  surah: number;
  ayah: number;
  page: number | null;
  text: string;            // user's reflection
  topicColor: string;      // auto-classified from verse topic
  topicId: number;
  authorName: string;
  authorId: string;        // unique per-device
  createdAt: string;       // ISO
  updatedAt: string;       // ISO
  likes: string[];         // array of authorIds who liked
  replies: Reply[];
  isOwn: boolean;          // computed: true if authored by current user
}

export interface Reply {
  id: string;
  authorName: string;
  authorId: string;
  text: string;
  createdAt: string;
  likes: string[];
}

export interface ReflectionInput {
  verseKey: string;
  surah: number;
  ayah: number;
  page: number | null;
  text: string;
  topicColor: string;
  topicId: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ───────────────────────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────────────────────

const REFLECTIONS_KEY = 'mushaf-reflections';
const AUTHOR_KEY = 'mushaf-author';
const PAGE_SIZE = 10;

// ───────────────────────────────────────────────────────────────
// Author Identity (per-device)
// ───────────────────────────────────────────────────────────────

export interface AuthorProfile {
  id: string;
  name: string;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getAuthor(): AuthorProfile {
  if (typeof window === 'undefined') return { id: 'ssr', name: '' };
  try {
    const raw = localStorage.getItem(AUTHOR_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* corrupted */ }
  const author: AuthorProfile = { id: generateId(), name: '' };
  localStorage.setItem(AUTHOR_KEY, JSON.stringify(author));
  return author;
}

export function setAuthorName(name: string): AuthorProfile {
  const author = getAuthor();
  // Sanitize name: strip HTML, limit length
  const clean = name.replace(/<[^>]*>/g, '').trim().slice(0, 50);
  author.name = clean;
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTHOR_KEY, JSON.stringify(author));
  }
  return author;
}

// ───────────────────────────────────────────────────────────────
// Content Moderation
// ───────────────────────────────────────────────────────────────

// Common inappropriate patterns (Arabic + English). Keep minimal but effective.
const BLOCKED_PATTERNS: RegExp[] = [
  // Arabic common slurs / insults (generic patterns, not exhaustive)
  /كلب|حمار|غبي|أحمق|لعنة|سافل|وقح|خنزير/,
  // English common slurs
  /\b(damn|hell|stupid|idiot|fool|shut\s*up|hate)\b/i,
  // URLs (prevent spam)
  /https?:\/\/\S+/i,
  // Excessive repeated chars (spam indicator)
  /(.)\1{6,}/,
];

export interface ModerationResult {
  passed: boolean;
  reason?: string;
}

export function moderateContent(text: string): ModerationResult {
  if (!text.trim()) return { passed: false, reason: 'empty' };
  if (text.trim().length < 3) return { passed: false, reason: 'too_short' };
  if (text.length > 2000) return { passed: false, reason: 'too_long' };

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return { passed: false, reason: 'inappropriate' };
    }
  }

  return { passed: true };
}

// ───────────────────────────────────────────────────────────────
// Seeded Community Reflections (simulated social feed)
// ───────────────────────────────────────────────────────────────

const SEED_AUTHORS = [
  { id: 'seed-ahmad', name: 'أحمد' },
  { id: 'seed-fatima', name: 'فاطمة' },
  { id: 'seed-omar', name: 'عمر' },
  { id: 'seed-aisha', name: 'عائشة' },
  { id: 'seed-khalid', name: 'خالد' },
];

const SEED_REFLECTIONS: Omit<Reflection, 'isOwn'>[] = [
  {
    id: 'seed-1', verseKey: '2:255', surah: 2, ayah: 255, page: 42,
    text: 'آية الكرسي — أعظم آية في القرآن، فيها صفات الله العلي العظيم. كل جملة فيها درس عن التوحيد والربوبية.',
    topicColor: 'blue', topicId: 1,
    authorName: 'أحمد', authorId: 'seed-ahmad',
    createdAt: '2026-03-15T08:30:00Z', updatedAt: '2026-03-15T08:30:00Z',
    likes: ['seed-fatima', 'seed-omar', 'seed-khalid'],
    replies: [
      { id: 'sr-1', authorName: 'فاطمة', authorId: 'seed-fatima', text: 'نعم! وقراءتها قبل النوم حرز من كل سوء.', createdAt: '2026-03-15T09:15:00Z', likes: ['seed-ahmad'] },
    ],
  },
  {
    id: 'seed-2', verseKey: '12:3', surah: 12, ayah: 3, page: 235,
    text: 'بداية أحسن القصص — قصة يوسف عليه السلام. تعلمنا الصبر والتوكل على الله مهما كانت الظروف.',
    topicColor: 'yellow', topicId: 4,
    authorName: 'عائشة', authorId: 'seed-aisha',
    createdAt: '2026-03-20T14:00:00Z', updatedAt: '2026-03-20T14:00:00Z',
    likes: ['seed-ahmad', 'seed-fatima'],
    replies: [],
  },
  {
    id: 'seed-3', verseKey: '55:13', surah: 55, ayah: 13, page: 531,
    text: '"فبأي آلاء ربكما تكذبان" — تتكرر 31 مرة في سورة الرحمن. كل مرة تذكرنا بنعم لا نحصيها.',
    topicColor: 'blue', topicId: 1,
    authorName: 'عمر', authorId: 'seed-omar',
    createdAt: '2026-03-22T06:45:00Z', updatedAt: '2026-03-22T06:45:00Z',
    likes: ['seed-aisha', 'seed-khalid', 'seed-fatima', 'seed-ahmad'],
    replies: [
      { id: 'sr-2', authorName: 'خالد', authorId: 'seed-khalid', text: 'سبحان الله! هذا التكرار يلمس القلب.', createdAt: '2026-03-22T07:30:00Z', likes: [] },
    ],
  },
  {
    id: 'seed-4', verseKey: '3:185', surah: 3, ayah: 185, page: 74,
    text: '"كل نفس ذائقة الموت" — تذكير قوي بأن الدنيا دار عمل لا دار بقاء. اللهم أحسن خاتمتنا.',
    topicColor: 'orange', topicId: 6,
    authorName: 'خالد', authorId: 'seed-khalid',
    createdAt: '2026-03-25T16:20:00Z', updatedAt: '2026-03-25T16:20:00Z',
    likes: ['seed-omar'],
    replies: [],
  },
  {
    id: 'seed-5', verseKey: '2:282', surah: 2, ayah: 282, page: 48,
    text: 'أطول آية في القرآن — آية الدَّين. فيها أحكام الكتابة والشهادة والضمان. شريعة متكاملة في آية واحدة.',
    topicColor: 'brown', topicId: 3,
    authorName: 'فاطمة', authorId: 'seed-fatima',
    createdAt: '2026-03-28T10:00:00Z', updatedAt: '2026-03-28T10:00:00Z',
    likes: ['seed-ahmad', 'seed-aisha', 'seed-omar'],
    replies: [
      { id: 'sr-3', authorName: 'أحمد', authorId: 'seed-ahmad', text: 'الإسلام اهتم بتنظيم المعاملات المالية من أول يوم.', createdAt: '2026-03-28T11:45:00Z', likes: ['seed-fatima'] },
    ],
  },
  {
    id: 'seed-6', verseKey: '36:58', surah: 36, ayah: 58, page: 443,
    text: '"سلام قولاً من رب رحيم" — يا لروعة هذا السلام الذي يأتي من الله مباشرة لأهل الجنة!',
    topicColor: 'green', topicId: 2,
    authorName: 'أحمد', authorId: 'seed-ahmad',
    createdAt: '2026-03-30T19:00:00Z', updatedAt: '2026-03-30T19:00:00Z',
    likes: ['seed-fatima', 'seed-aisha'],
    replies: [],
  },
];

// ───────────────────────────────────────────────────────────────
// Storage
// ───────────────────────────────────────────────────────────────

function loadRaw(): Omit<Reflection, 'isOwn'>[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REFLECTIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveRaw(items: Omit<Reflection, 'isOwn'>[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REFLECTIONS_KEY, JSON.stringify(items));
  } catch { /* quota exceeded */ }
}

function withOwn(items: Omit<Reflection, 'isOwn'>[]): Reflection[] {
  const myId = getAuthor().id;
  return items.map(r => ({ ...r, isOwn: r.authorId === myId }));
}

/**
 * Load all reflections (user + seeded), merged and sorted by date desc.
 */
export function loadAllReflections(): Reflection[] {
  const user = loadRaw();
  const userIds = new Set(user.map(r => r.id));
  // Merge: user items take precedence over seeds with same id
  const seeds = SEED_REFLECTIONS.filter(s => !userIds.has(s.id));
  const all = [...user, ...seeds].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return withOwn(all);
}

// ───────────────────────────────────────────────────────────────
// CRUD Operations
// ───────────────────────────────────────────────────────────────

export function createReflection(input: ReflectionInput): Reflection | null {
  const mod = moderateContent(input.text);
  if (!mod.passed) return null;

  const author = getAuthor();
  const now = new Date().toISOString();
  const sanitizedText = input.text.replace(/<[^>]*>/g, '').trim();

  const reflection: Omit<Reflection, 'isOwn'> = {
    id: generateId(),
    verseKey: input.verseKey,
    surah: input.surah,
    ayah: input.ayah,
    page: input.page,
    text: sanitizedText,
    topicColor: input.topicColor,
    topicId: input.topicId,
    authorName: author.name || (typeof document !== 'undefined' && document.documentElement.lang === 'ar' ? 'مجهول' : 'Anonymous'),
    authorId: author.id,
    createdAt: now,
    updatedAt: now,
    likes: [],
    replies: [],
  };

  const all = loadRaw();
  all.push(reflection);
  saveRaw(all);

  return { ...reflection, isOwn: true };
}

export function updateReflection(id: string, newText: string): boolean {
  const mod = moderateContent(newText);
  if (!mod.passed) return false;

  const author = getAuthor();
  const all = loadRaw();
  const idx = all.findIndex(r => r.id === id && r.authorId === author.id);
  if (idx === -1) return false;

  all[idx] = {
    ...all[idx],
    text: newText.replace(/<[^>]*>/g, '').trim(),
    updatedAt: new Date().toISOString(),
  };
  saveRaw(all);
  return true;
}

export function deleteReflection(id: string): boolean {
  const author = getAuthor();
  const all = loadRaw();
  const idx = all.findIndex(r => r.id === id && r.authorId === author.id);
  if (idx === -1) return false;

  all.splice(idx, 1);
  saveRaw(all);
  return true;
}

// ───────────────────────────────────────────────────────────────
// Social: Likes
// ───────────────────────────────────────────────────────────────

export function toggleLike(reflectionId: string): boolean {
  const author = getAuthor();
  const all = loadRaw();
  const seeds = [...SEED_REFLECTIONS]; // might need to persist seeded likes

  // Check user reflections first
  const idx = all.findIndex(r => r.id === reflectionId);
  if (idx !== -1) {
    const likeIdx = all[idx].likes.indexOf(author.id);
    if (likeIdx === -1) all[idx].likes.push(author.id);
    else all[idx].likes.splice(likeIdx, 1);
    saveRaw(all);
    return likeIdx === -1; // true = liked, false = unliked
  }

  // If it's a seeded reflection, copy to user storage so we can persist the like
  const seedIdx = seeds.findIndex(r => r.id === reflectionId);
  if (seedIdx !== -1) {
    const copy = { ...seeds[seedIdx], likes: [...seeds[seedIdx].likes] };
    const likeIdx = copy.likes.indexOf(author.id);
    if (likeIdx === -1) copy.likes.push(author.id);
    else copy.likes.splice(likeIdx, 1);
    all.push(copy);
    saveRaw(all);
    return likeIdx === -1;
  }

  return false;
}

// ───────────────────────────────────────────────────────────────
// Social: Replies
// ───────────────────────────────────────────────────────────────

export function addReply(reflectionId: string, text: string): Reply | null {
  const mod = moderateContent(text);
  if (!mod.passed) return null;

  const author = getAuthor();
  const reply: Reply = {
    id: generateId(),
    authorName: author.name || (typeof document !== 'undefined' && document.documentElement.lang === 'ar' ? 'مجهول' : 'Anonymous'),
    authorId: author.id,
    text: text.replace(/<[^>]*>/g, '').trim(),
    createdAt: new Date().toISOString(),
    likes: [],
  };

  const all = loadRaw();
  let idx = all.findIndex(r => r.id === reflectionId);

  // If seeded, copy to user storage
  if (idx === -1) {
    const seed = SEED_REFLECTIONS.find(r => r.id === reflectionId);
    if (seed) {
      all.push({ ...seed, replies: [...seed.replies] });
      idx = all.length - 1;
    } else return null;
  }

  all[idx].replies.push(reply);
  saveRaw(all);
  return reply;
}

export function toggleReplyLike(reflectionId: string, replyId: string): boolean {
  const author = getAuthor();
  const all = loadRaw();

  let rIdx = all.findIndex(r => r.id === reflectionId);
  if (rIdx === -1) {
    // Copy seed
    const seed = SEED_REFLECTIONS.find(r => r.id === reflectionId);
    if (seed) {
      all.push({ ...seed, replies: seed.replies.map(r => ({ ...r, likes: [...r.likes] })) });
      rIdx = all.length - 1;
    } else return false;
  }

  const rpIdx = all[rIdx].replies.findIndex(rp => rp.id === replyId);
  if (rpIdx === -1) return false;

  const likeIdx = all[rIdx].replies[rpIdx].likes.indexOf(author.id);
  if (likeIdx === -1) all[rIdx].replies[rpIdx].likes.push(author.id);
  else all[rIdx].replies[rpIdx].likes.splice(likeIdx, 1);

  saveRaw(all);
  return likeIdx === -1;
}

// ───────────────────────────────────────────────────────────────
// Pagination & Filtering
// ───────────────────────────────────────────────────────────────

export type SortBy = 'newest' | 'most_liked' | 'most_discussed';
export type FilterBy = 'all' | 'mine' | string; // string = topic color

export function getReflectionsPaginated(
  page: number = 1,
  sortBy: SortBy = 'newest',
  filterBy: FilterBy = 'all',
  verseKey?: string,
): PaginatedResult<Reflection> {
  let all = loadAllReflections();

  // Filter
  if (filterBy === 'mine') {
    all = all.filter(r => r.isOwn);
  } else if (filterBy !== 'all') {
    all = all.filter(r => r.topicColor === filterBy);
  }

  if (verseKey) {
    all = all.filter(r => r.verseKey === verseKey);
  }

  // Sort
  if (sortBy === 'most_liked') {
    all.sort((a, b) => b.likes.length - a.likes.length);
  } else if (sortBy === 'most_discussed') {
    all.sort((a, b) => b.replies.length - a.replies.length);
  }
  // 'newest' is already default

  const total = all.length;
  const start = (page - 1) * PAGE_SIZE;
  const items = all.slice(start, start + PAGE_SIZE);

  return {
    items,
    total,
    page,
    pageSize: PAGE_SIZE,
    hasMore: start + PAGE_SIZE < total,
  };
}

/**
 * Get count of reflections for a specific verse (for badge display).
 */
export function getReflectionCountForVerse(verseKey: string): number {
  return loadAllReflections().filter(r => r.verseKey === verseKey).length;
}

/**
 * Get total stats for the reflections feed.
 */
export function getReflectionStats(): {
  total: number;
  mine: number;
  topicCounts: Record<string, number>;
} {
  const all = loadAllReflections();
  const mine = all.filter(r => r.isOwn).length;
  const topicCounts: Record<string, number> = {};
  for (const r of all) {
    topicCounts[r.topicColor] = (topicCounts[r.topicColor] || 0) + 1;
  }
  return { total: all.length, mine, topicCounts };
}
