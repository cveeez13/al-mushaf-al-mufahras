'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import { TOPICS, SURAH_NAMES } from '@/lib/types';
import {
  loadAllReflections, createReflection, updateReflection, deleteReflection,
  toggleLike, addReply, toggleReplyLike, getReflectionsPaginated,
  getReflectionStats, getAuthor, setAuthorName, moderateContent,
  type Reflection, type Reply, type SortBy, type FilterBy,
} from '@/lib/reflections';

// ───────────────────────────────────────────────────────────────
// Inline Translations
// ───────────────────────────────────────────────────────────────

const T = {
  title:          { ar: 'تأملات وملاحظات', en: 'Reflections & Notes' },
  writeReflection:{ ar: 'اكتب تأملك...', en: 'Write your reflection...' },
  post:           { ar: 'نشر', en: 'Post' },
  edit:           { ar: 'تعديل', en: 'Edit' },
  delete:         { ar: 'حذف', en: 'Delete' },
  save:           { ar: 'حفظ', en: 'Save' },
  cancel:         { ar: 'إلغاء', en: 'Cancel' },
  reply:          { ar: 'رد', en: 'Reply' },
  replies:        { ar: 'ردود', en: 'replies' },
  like:           { ar: 'إعجاب', en: 'Like' },
  liked:          { ar: 'أعجبني', en: 'Liked' },
  loadMore:       { ar: 'تحميل المزيد', en: 'Load More' },
  noReflections:  { ar: 'لا توجد تأملات بعد. كن أول من يكتب!', en: 'No reflections yet. Be the first to write!' },
  newest:         { ar: 'الأحدث', en: 'Newest' },
  mostLiked:      { ar: 'الأكثر إعجاباً', en: 'Most Liked' },
  mostDiscussed:  { ar: 'الأكثر نقاشاً', en: 'Most Discussed' },
  all:            { ar: 'الكل', en: 'All' },
  mine:           { ar: 'تأملاتي', en: 'My Reflections' },
  total:          { ar: 'تأمل', en: 'reflections' },
  writeReply:     { ar: 'اكتب رداً...', en: 'Write a reply...' },
  send:           { ar: 'إرسال', en: 'Send' },
  inappropriate:  { ar: 'المحتوى غير مناسب', en: 'Content is inappropriate' },
  tooShort:       { ar: 'قصير جداً (3 أحرف على الأقل)', en: 'Too short (min 3 chars)' },
  tooLong:        { ar: 'طويل جداً (2000 حرف كحد أقصى)', en: 'Too long (max 2000 chars)' },
  yourName:       { ar: 'اسمك (اختياري)', en: 'Your name (optional)' },
  topicFilter:    { ar: 'حسب الموضوع', en: 'By Topic' },
  stats:          { ar: 'إحصائيات', en: 'Stats' },
  goToVerse:      { ar: 'انتقل للآية', en: 'Go to verse' },
  confirmDelete:  { ar: 'هل أنت متأكد من الحذف?', en: 'Are you sure you want to delete?' },
  yes:            { ar: 'نعم', en: 'Yes' },
  no:             { ar: 'لا', en: 'No' },
  ago:            { ar: 'مضت', en: 'ago' },
  justNow:        { ar: 'الآن', en: 'Just now' },
  verseLabel:     { ar: 'على الآية', en: 'on verse' },
} as const;

function useTx() {
  const { lang } = useI18n();
  return useCallback((key: keyof typeof T) => T[key][lang], [lang]);
}

// ───────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────

const COLOR_HEX: Record<string, string> = {
  blue: '#3498DB', green: '#27AE60', brown: '#8E6B3D',
  yellow: '#F1C40F', purple: '#8E44AD', orange: '#E67E22', red: '#E74C3C',
};

function timeAgo(dateStr: string, lang: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return lang === 'ar' ? 'الآن' : 'Just now';
  if (mins < 60) return lang === 'ar' ? `منذ ${mins} دقيقة` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return lang === 'ar' ? `منذ ${hrs} ساعة` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return lang === 'ar' ? `منذ ${days} يوم` : `${days}d ago`;
  const months = Math.floor(days / 30);
  return lang === 'ar' ? `منذ ${months} شهر` : `${months}mo ago`;
}

// ───────────────────────────────────────────────────────────────
// Sub-Components
// ───────────────────────────────────────────────────────────────

/** Author name setup prompt */
function NamePrompt({ onDone }: { onDone: (name: string) => void }) {
  const { lang } = useI18n();
  const tx = useTx();
  const [name, setName] = useState('');

  return (
    <div className="page-frame p-4 rounded-xl mb-4">
      <label className="text-sm font-medium text-[var(--color-mushaf-text)]/70 block mb-2">
        {tx('yourName')}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={50}
          placeholder={lang === 'ar' ? 'أدخل اسمك...' : 'Enter your name...'}
          className="flex-1 bg-transparent border border-[var(--color-mushaf-border)] rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={() => onDone(name)}
          className="px-4 py-2 rounded-lg bg-[var(--color-mushaf-gold)] text-white text-sm font-medium hover:brightness-110 transition-all"
        >
          {tx('save')}
        </button>
      </div>
    </div>
  );
}

/** Compose box for new reflection */
function ComposeBox({
  verseContext,
  onPost,
}: {
  verseContext?: { verseKey: string; surah: number; ayah: number; page: number | null; topicColor: string; topicId: number };
  onPost: () => void;
}) {
  const { lang } = useI18n();
  const tx = useTx();
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const handlePost = () => {
    if (!verseContext) return;
    const mod = moderateContent(text);
    if (!mod.passed) {
      if (mod.reason === 'too_short') setError(tx('tooShort'));
      else if (mod.reason === 'too_long') setError(tx('tooLong'));
      else setError(tx('inappropriate'));
      return;
    }

    const result = createReflection({
      verseKey: verseContext.verseKey,
      surah: verseContext.surah,
      ayah: verseContext.ayah,
      page: verseContext.page,
      text,
      topicColor: verseContext.topicColor,
      topicId: verseContext.topicId,
    });

    if (result) {
      setText('');
      setError('');
      onPost();
    }
  };

  if (!verseContext) return null;

  const topic = TOPICS[verseContext.topicId];

  return (
    <div className="page-frame p-4 rounded-xl mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span
          className="w-3 h-3 rounded-full inline-block"
          style={{ backgroundColor: COLOR_HEX[verseContext.topicColor] || '#888' }}
        />
        <span className="text-xs text-[var(--color-mushaf-text)]/60">
          {tx('verseLabel')} {SURAH_NAMES[verseContext.surah]} {verseContext.ayah}
          {topic && (
            <span className="mr-2 text-[var(--color-mushaf-text)]/40">
              · {lang === 'ar' ? topic.name_ar : topic.name_en}
            </span>
          )}
        </span>
      </div>
      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setError(''); }}
        placeholder={tx('writeReflection')}
        rows={3}
        maxLength={2000}
        className="w-full bg-transparent border border-[var(--color-mushaf-border)] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[var(--color-mushaf-gold)]"
        dir="auto"
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-[var(--color-mushaf-text)]/30">
          {text.length}/2000
        </span>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-[var(--color-topic-red)]">{error}</span>}
          <button
            onClick={handlePost}
            disabled={text.trim().length < 3}
            className="px-4 py-1.5 rounded-lg bg-[var(--color-mushaf-gold)] text-white text-sm font-medium hover:brightness-110 transition-all disabled:opacity-40"
          >
            {tx('post')}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Single reply card */
function ReplyCard({
  reply, reflectionId, lang, onLikeReply, onRefresh,
}: {
  reply: Reply;
  reflectionId: string;
  lang: string;
  onLikeReply: (rId: string, rpId: string) => void;
  onRefresh: () => void;
}) {
  const tx = useTx();
  const myId = getAuthor().id;
  const isLiked = reply.likes.includes(myId);

  return (
    <div className="flex gap-2 py-2">
      <div className="w-6 h-6 rounded-full bg-[var(--color-mushaf-border)]/30 flex items-center justify-center text-[10px] font-bold shrink-0">
        {reply.authorName.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-[10px] text-[var(--color-mushaf-text)]/50">
          <span className="font-medium">{reply.authorName}</span>
          <span>·</span>
          <span>{timeAgo(reply.createdAt, lang)}</span>
        </div>
        <div className="text-sm mt-0.5" dir="auto">{reply.text}</div>
        <button
          onClick={() => onLikeReply(reflectionId, reply.id)}
          className={`text-[10px] mt-1 transition-colors ${
            isLiked ? 'text-[var(--color-topic-red)]' : 'text-[var(--color-mushaf-text)]/30 hover:text-[var(--color-topic-red)]'
          }`}
        >
          {isLiked ? '❤️' : '🤍'} {reply.likes.length > 0 ? reply.likes.length : ''}
        </button>
      </div>
    </div>
  );
}

/** Single reflection card */
function ReflectionCard({
  reflection, lang, onGoToPage, onRefresh,
}: {
  reflection: Reflection;
  lang: string;
  onGoToPage?: (page: number) => void;
  onRefresh: () => void;
}) {
  const tx = useTx();
  const myId = getAuthor().id;
  const isLiked = reflection.likes.includes(myId);
  const topic = TOPICS[reflection.topicId];

  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(reflection.text);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleLike = () => {
    toggleLike(reflection.id);
    onRefresh();
  };

  const handleReply = () => {
    const mod = moderateContent(replyText);
    if (!mod.passed) {
      if (mod.reason === 'too_short') setReplyError(tx('tooShort'));
      else if (mod.reason === 'too_long') setReplyError(tx('tooLong'));
      else setReplyError(tx('inappropriate'));
      return;
    }
    addReply(reflection.id, replyText);
    setReplyText('');
    setReplyError('');
    onRefresh();
  };

  const handleLikeReply = (rId: string, rpId: string) => {
    toggleReplyLike(rId, rpId);
    onRefresh();
  };

  const handleEdit = () => {
    if (updateReflection(reflection.id, editText)) {
      setEditing(false);
      onRefresh();
    }
  };

  const handleDelete = () => {
    deleteReflection(reflection.id);
    setConfirmingDelete(false);
    onRefresh();
  };

  return (
    <div className="page-frame p-4 rounded-xl">
      {/* Header: author + verse context + topic color */}
      <div className="flex items-start gap-3">
        {/* Topic color bar */}
        <div
          className="w-1 self-stretch rounded-full shrink-0"
          style={{ backgroundColor: COLOR_HEX[reflection.topicColor] || '#888' }}
        />

        <div className="flex-1 min-w-0">
          {/* Author line */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[var(--color-mushaf-gold)]/20 flex items-center justify-center text-xs font-bold text-[var(--color-mushaf-gold)]">
                {reflection.authorName.charAt(0)}
              </div>
              <div>
                <div className="text-sm font-medium">{reflection.authorName}</div>
                <div className="text-[10px] text-[var(--color-mushaf-text)]/40">
                  {timeAgo(reflection.createdAt, lang)}
                  {reflection.updatedAt !== reflection.createdAt && (
                    <span className="mr-1">({lang === 'ar' ? 'معدّل' : 'edited'})</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions for own reflections */}
            {reflection.isOwn && !editing && !confirmingDelete && (
              <div className="flex gap-1">
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs px-3 py-1.5 rounded text-[var(--color-mushaf-text)]/40 hover:text-[var(--color-mushaf-gold)] transition-colors"
                >
                  {tx('edit')}
                </button>
                <button
                  onClick={() => setConfirmingDelete(true)}
                  className="text-xs px-3 py-1.5 rounded text-[var(--color-mushaf-text)]/40 hover:text-[var(--color-topic-red)] transition-colors"
                >
                  {tx('delete')}
                </button>
              </div>
            )}
          </div>

          {/* Verse context badge */}
          <button
            onClick={() => reflection.page && onGoToPage?.(reflection.page)}
            className="inline-flex items-center gap-1.5 mt-2 px-2 py-1 rounded-md bg-[var(--color-mushaf-border)]/15 text-[10px] text-[var(--color-mushaf-text)]/60 hover:bg-[var(--color-mushaf-border)]/30 transition-colors"
          >
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: COLOR_HEX[reflection.topicColor] || '#888' }}
            />
            {SURAH_NAMES[reflection.surah]} : {reflection.ayah}
            {topic && (
              <span className="text-[var(--color-mushaf-text)]/30">
                · {lang === 'ar' ? topic.name_ar : topic.name_en}
              </span>
            )}
          </button>

          {/* Delete confirmation */}
          {confirmingDelete && (
            <div className="mt-3 p-3 rounded-lg bg-[var(--color-topic-red)]/5 border border-[var(--color-topic-red)]/20">
              <div className="text-xs text-[var(--color-topic-red)] mb-2">{tx('confirmDelete')}</div>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  className="px-3 py-1 rounded bg-[var(--color-topic-red)] text-white text-xs"
                >{tx('yes')}</button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="px-3 py-1 rounded bg-[var(--color-mushaf-border)]/20 text-xs"
                >{tx('no')}</button>
              </div>
            </div>
          )}

          {/* Reflection text or edit mode */}
          {editing ? (
            <div className="mt-3">
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                rows={3}
                maxLength={2000}
                className="w-full bg-transparent border border-[var(--color-mushaf-gold)] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none"
                dir="auto"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleEdit}
                  className="px-3 py-1 rounded-lg bg-[var(--color-mushaf-gold)] text-white text-xs"
                >{tx('save')}</button>
                <button
                  onClick={() => { setEditing(false); setEditText(reflection.text); }}
                  className="px-3 py-1 rounded-lg bg-[var(--color-mushaf-border)]/20 text-xs"
                >{tx('cancel')}</button>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-sm leading-relaxed whitespace-pre-wrap" dir="auto">
              {reflection.text}
            </div>
          )}

          {/* Like + Reply bar */}
          <div className="flex items-center gap-4 mt-3 pt-2 border-t border-[var(--color-mushaf-border)]/10">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 text-xs transition-colors ${
                isLiked ? 'text-[var(--color-topic-red)]' : 'text-[var(--color-mushaf-text)]/40 hover:text-[var(--color-topic-red)]'
              }`}
            >
              {isLiked ? '❤️' : '🤍'}
              <span>{reflection.likes.length > 0 ? reflection.likes.length : ''}</span>
              <span className="text-[10px]">{isLiked ? tx('liked') : tx('like')}</span>
            </button>
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-1 text-xs text-[var(--color-mushaf-text)]/40 hover:text-[var(--color-mushaf-gold)] transition-colors"
            >
              💬
              <span>{reflection.replies.length > 0 ? reflection.replies.length : ''}</span>
              <span className="text-[10px]">{tx('reply')}</span>
            </button>
          </div>

          {/* Replies section */}
          {showReplies && (
            <div className="mt-3 pr-2 border-r-2 border-[var(--color-mushaf-border)]/15">
              {reflection.replies.map(rp => (
                <ReplyCard
                  key={rp.id}
                  reply={rp}
                  reflectionId={reflection.id}
                  lang={lang}
                  onLikeReply={handleLikeReply}
                  onRefresh={onRefresh}
                />
              ))}

              {/* Reply compose */}
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={e => { setReplyText(e.target.value); setReplyError(''); }}
                  placeholder={tx('writeReply')}
                  maxLength={500}
                  className="flex-1 bg-transparent border border-[var(--color-mushaf-border)] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[var(--color-mushaf-gold)]"
                  dir="auto"
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); }}}
                />
                <button
                  onClick={handleReply}
                  disabled={replyText.trim().length < 3}
                  className="px-3 py-1.5 rounded-lg bg-[var(--color-mushaf-gold)] text-white text-xs font-medium hover:brightness-110 transition-all disabled:opacity-40"
                >
                  {tx('send')}
                </button>
              </div>
              {replyError && <span className="text-[10px] text-[var(--color-topic-red)] mt-1">{replyError}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Main Component
// ───────────────────────────────────────────────────────────────

interface ReflectionsPanelProps {
  onGoToPage?: (page: number) => void;
  verseContext?: {
    surah: number;
    ayah: number;
    text: string;
    topicColor: string;
    topicId: number;
    page: number | null;
  };
}

export default function ReflectionsPanel({ onGoToPage, verseContext }: ReflectionsPanelProps) {
  const { lang } = useI18n();
  const tx = useTx();

  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [filterBy, setFilterBy] = useState<FilterBy>('all');
  const [pageNum, setPageNum] = useState(1);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [needsName, setNeedsName] = useState(false);
  const [version, setVersion] = useState(0); // trigger re-render on data change
  const observerRef = useRef<HTMLDivElement>(null);

  // Check if user has set their name
  useEffect(() => {
    const author = getAuthor();
    if (!author.name) setNeedsName(true);
  }, []);

  // Load reflections
  const loadPage = useCallback((page: number, append: boolean = false) => {
    const verseKey = verseContext ? `${verseContext.surah}:${verseContext.ayah}` : undefined;
    const result = getReflectionsPaginated(page, sortBy, filterBy, verseKey);
    setReflections(prev => append ? [...prev, ...result.items] : result.items);
    setHasMore(result.hasMore);
    setTotal(result.total);
    setPageNum(page);
  }, [sortBy, filterBy, verseContext, version]);

  useEffect(() => {
    loadPage(1, false);
  }, [loadPage]);

  // Infinite scroll observer
  useEffect(() => {
    if (!observerRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadPage(pageNum + 1, true); },
      { threshold: 0.5 }
    );
    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, pageNum, loadPage]);

  const refresh = useCallback(() => {
    setVersion(v => v + 1);
  }, []);

  const handleNameDone = (name: string) => {
    if (name.trim()) setAuthorName(name);
    setNeedsName(false);
  };

  const composeContext = verseContext ? {
    verseKey: `${verseContext.surah}:${verseContext.ayah}`,
    surah: verseContext.surah,
    ayah: verseContext.ayah,
    page: verseContext.page,
    topicColor: verseContext.topicColor,
    topicId: verseContext.topicId,
  } : undefined;

  // Stats
  const stats = useMemo(() => getReflectionStats(), [version]);

  // Sort options
  const sortOptions: { key: SortBy; label: string }[] = [
    { key: 'newest', label: tx('newest') },
    { key: 'most_liked', label: tx('mostLiked') },
    { key: 'most_discussed', label: tx('mostDiscussed') },
  ];

  // Filter options
  const filterOptions: { key: FilterBy; label: string; color?: string }[] = [
    { key: 'all', label: tx('all') },
    { key: 'mine', label: tx('mine') },
    ...Object.values(TOPICS).map(t => ({
      key: t.color as FilterBy,
      label: lang === 'ar' ? t.name_ar : t.name_en,
      color: t.hex,
    })),
  ];

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-lg font-bold text-[var(--color-mushaf-gold)] mb-4 text-center">
        {tx('title')}
      </h2>

      {/* Name prompt */}
      {needsName && <NamePrompt onDone={handleNameDone} />}

      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-4 text-xs text-[var(--color-mushaf-text)]/50">
        <span className="font-medium">
          {stats.total} {tx('total')}
        </span>
        <div className="flex gap-1 flex-1">
          {Object.entries(stats.topicCounts).map(([color, count]) => (
            <div
              key={color}
              style={{
                backgroundColor: COLOR_HEX[color] || '#888',
                width: `${Math.max(4, (count / Math.max(stats.total, 1)) * 100)}%`,
              }}
              className="h-1.5 rounded-full transition-all"
              title={`${color}: ${count}`}
            />
          ))}
        </div>
      </div>

      {/* Compose box (only when verse context provided) */}
      {composeContext && (
        <ComposeBox verseContext={composeContext} onPost={refresh} />
      )}

      {/* Sort + Filter toolbar */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Sort tabs */}
        <div className="flex gap-1 bg-[var(--color-mushaf-border)]/10 rounded-lg p-0.5">
          {sortOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`px-3 py-1 rounded-md text-xs transition-colors ${
                sortBy === opt.key
                  ? 'bg-[var(--color-mushaf-gold)] text-white'
                  : 'text-[var(--color-mushaf-text)]/50 hover:text-[var(--color-mushaf-text)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Filter dropdown */}
        <div className="relative group">
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--color-mushaf-border)] text-xs hover:border-[var(--color-mushaf-gold)] transition-colors">
            {filterBy !== 'all' && filterBy !== 'mine' && (
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: COLOR_HEX[filterBy] || '#888' }}
              />
            )}
            {filterOptions.find(f => f.key === filterBy)?.label || tx('all')}
            <span className="text-[var(--color-mushaf-text)]/30">▾</span>
          </button>
          <div className="absolute top-full right-0 mt-1 bg-[var(--color-mushaf-paper)] border border-[var(--color-mushaf-border)] rounded-lg shadow-lg py-1 min-w-[200px] z-50 hidden group-hover:block group-focus-within:block">
            {filterOptions.map(opt => (
              <button
                key={opt.key}
                onClick={() => setFilterBy(opt.key)}
                className={`w-full text-right px-3 py-1.5 text-xs hover:bg-[var(--color-mushaf-border)]/20 flex items-center gap-2 transition-colors ${
                  filterBy === opt.key ? 'text-[var(--color-mushaf-gold)] font-medium' : ''
                }`}
              >
                {opt.color && (
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                    style={{ backgroundColor: opt.color }}
                  />
                )}
                <span className="flex-1 text-right">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reflections feed */}
      <div className="space-y-3">
        {reflections.map(r => (
          <ReflectionCard
            key={r.id}
            reflection={r}
            lang={lang}
            onGoToPage={onGoToPage}
            onRefresh={refresh}
          />
        ))}

        {reflections.length === 0 && (
          <div className="text-center text-[var(--color-mushaf-text)]/40 py-12 text-sm">
            {tx('noReflections')}
          </div>
        )}

        {/* Infinite scroll sentinel */}
        {hasMore && (
          <div ref={observerRef} className="text-center py-4">
            <button
              onClick={() => loadPage(pageNum + 1, true)}
              className="px-4 py-2 rounded-lg border border-[var(--color-mushaf-border)] text-xs text-[var(--color-mushaf-text)]/50 hover:border-[var(--color-mushaf-gold)] transition-colors"
            >
              {tx('loadMore')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
