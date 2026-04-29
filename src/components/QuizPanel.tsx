'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAllVerses } from '@/lib/data';
import { useI18n } from '@/lib/i18n';
import {
  loadMemorizationReminderPrefs,
  maybeSendMemorizationReminder,
  requestMemorizationNotificationPermission,
  saveMemorizationReminderPrefs,
  type MemorizationReminderPrefs,
} from '@/lib/memorizationReminders';
import type { SM2Card } from '@/lib/sm2';
import { TOPICS, SURAH_NAMES, type Verse } from '@/lib/types';
import { useMemorization } from '@/lib/useMemorization';
import VerseBookmarkButton from './VerseBookmarkButton';

type QuizMode = 'complete' | 'topic' | 'recall';
type QuizState = 'idle' | 'question' | 'answer' | 'finished';

interface QuizPanelProps {
  onGoToPage?: (page: number) => void;
  currentPage?: number;
}

export default function QuizPanel({ onGoToPage, currentPage = 1 }: QuizPanelProps) {
  const { lang, topicName } = useI18n();
  const {
    cards,
    stats,
    addCard,
    addCards,
    getDueCards,
    reviewCard,
    removeCard,
    getAllCardsSorted,
    isInDeck,
  } = useMemorization();

  const [quizState, setQuizState] = useState<QuizState>('idle');
  const [quizMode, setQuizMode] = useState<QuizMode>('complete');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sessionCards, setSessionCards] = useState<SM2Card[]>([]);
  const [sessionScore, setSessionScore] = useState({ correct: 0, total: 0 });
  const [showHint, setShowHint] = useState(false);
  const [allVerses, setAllVerses] = useState<Verse[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTopic, setSearchTopic] = useState<'all' | string>('all');
  const [deckMessage, setDeckMessage] = useState('');
  const [reminderPrefs, setReminderPrefs] = useState<MemorizationReminderPrefs>(
    loadMemorizationReminderPrefs()
  );

  const ar = lang === 'ar';
  const dueCards = useMemo(() => getDueCards(), [getDueCards]);
  const currentCard = sessionCards[currentIdx] || null;

  useEffect(() => {
    let mounted = true;
    setLoadingLibrary(true);
    getAllVerses().then((verses) => {
      if (!mounted) return;
      setAllVerses(verses);
      setLoadingLibrary(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    saveMemorizationReminderPrefs(reminderPrefs);
  }, [reminderPrefs]);

  useEffect(() => {
    void maybeSendMemorizationReminder(dueCards.length);
  }, [dueCards.length, reminderPrefs]);

  useEffect(() => {
    if (!deckMessage) return;
    const timer = window.setTimeout(() => setDeckMessage(''), 2500);
    return () => window.clearTimeout(timer);
  }, [deckMessage]);

  const libraryResults = useMemo(() => {
    const normalizedQuery = searchQuery.trim();

    return allVerses
      .filter((verse) => {
        if (searchTopic !== 'all' && verse.topic.color !== searchTopic) return false;
        if (!normalizedQuery) return true;

        const query = normalizedQuery.toLowerCase();
        const surahName = (SURAH_NAMES[verse.surah] || '').toLowerCase();
        return (
          verse.text.includes(normalizedQuery) ||
          verse.verse_key.includes(query) ||
          surahName.includes(query) ||
          `${verse.surah}` === query ||
          `${verse.page ?? ''}` === query
        );
      })
      .slice(0, 24);
  }, [allVerses, searchQuery, searchTopic]);

  const currentPageVerses = useMemo(
    () => allVerses.filter((verse) => verse.page === currentPage),
    [allVerses, currentPage]
  );

  const accuracyRate = useMemo(() => {
    if (stats.total_reviews === 0) return 0;
    const correctReviews = cards.reduce((sum, card) => sum + card.correct_reviews, 0);
    return Math.round((correctReviews / stats.total_reviews) * 100);
  }, [cards, stats.total_reviews]);

  const memorizationLevel = useMemo(() => {
    const score = stats.mastered * 4 + stats.today_reviews + cards.length;
    return Math.max(1, Math.floor(score / 12) + 1);
  }, [cards.length, stats.mastered, stats.today_reviews]);

  const dailyGoalProgress = Math.min(stats.today_reviews, reminderPrefs.dailyGoal);
  const dailyGoalPct = reminderPrefs.dailyGoal > 0
    ? Math.round((dailyGoalProgress / reminderPrefs.dailyGoal) * 100)
    : 0;

  const startQuiz = useCallback((mode: QuizMode) => {
    const due = getDueCards();
    if (due.length === 0) return;
    setQuizMode(mode);
    setSessionCards(due.slice(0, 20));
    setCurrentIdx(0);
    setSessionScore({ correct: 0, total: 0 });
    setShowHint(false);
    setQuizState('question');
  }, [getDueCards]);

  const getQuestion = useCallback((card: SM2Card, mode: QuizMode) => {
    if (!card) return { prompt: '', hidden: '' };
    const words = card.text.split(' ');

    switch (mode) {
      case 'complete': {
        const showCount = Math.max(2, Math.ceil(words.length * 0.4));
        return {
          prompt: `${words.slice(0, showCount).join(' ')} ...`,
          hidden: words.slice(showCount).join(' '),
        };
      }
      case 'topic': {
        const topic = Object.values(TOPICS).find((item) => item.color === card.topic_color);
        return {
          prompt: topicName(topic?.id || 0),
          hidden: card.text,
        };
      }
      case 'recall':
      default:
        return {
          prompt: `${SURAH_NAMES[card.surah]} - ${ar ? 'آية' : 'Verse'} ${card.ayah}`,
          hidden: card.text,
        };
    }
  }, [topicName, ar]);

  const gradeAnswer = useCallback((quality: number) => {
    if (!currentCard) return;

    reviewCard(currentCard.verse_key, quality);
    setSessionScore((prev) => ({
      correct: quality >= 3 ? prev.correct + 1 : prev.correct,
      total: prev.total + 1,
    }));

    if (currentIdx + 1 < sessionCards.length) {
      setCurrentIdx(currentIdx + 1);
      setShowHint(false);
      setQuizState('question');
      return;
    }

    setQuizState('finished');
  }, [currentCard, currentIdx, reviewCard, sessionCards.length]);

  const handleAddCurrentPage = useCallback(() => {
    const added = addCards(
      currentPageVerses.map((verse) => ({
        verse_key: verse.verse_key,
        surah: verse.surah,
        ayah: verse.ayah,
        text: verse.text,
        topic_color: verse.topic.color,
      }))
    );

    setDeckMessage(
      added > 0
        ? (ar ? `تمت إضافة ${added} آية من الصفحة الحالية` : `Added ${added} verses from this page`)
        : (ar ? 'كل آيات الصفحة موجودة بالفعل في الحفظ' : 'All page verses are already in the deck')
    );
  }, [addCards, ar, currentPageVerses]);

  const handleReminderToggle = useCallback(async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestMemorizationNotificationPermission();
      if (!granted) {
        setDeckMessage(ar ? 'لم يتم منح إذن التنبيهات' : 'Notification permission was not granted');
        return;
      }
    }

    setReminderPrefs((prev) => ({ ...prev, enabled }));
  }, [ar]);

  if (quizState === 'idle') {
    const allCards = getAllCardsSorted();

    return (
      <div className="mx-auto max-w-5xl p-4">
        <h2 className="mb-4 text-center text-lg font-bold text-[var(--color-mushaf-gold)]">
          {ar ? 'الحفظ والمراجعة الذكية' : 'Smart Memorization & Review'}
        </h2>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard value={stats.total_cards} label={ar ? 'إجمالي البطاقات' : 'Total Cards'} color="var(--color-mushaf-gold)" />
          <StatCard value={stats.due_today} label={ar ? 'مطلوب اليوم' : 'Due Today'} color="var(--color-topic-orange)" />
          <StatCard value={stats.mastered} label={ar ? 'متقنة' : 'Mastered'} color="var(--color-topic-green)" />
          <StatCard value={stats.today_reviews} label={ar ? 'مراجعات اليوم' : 'Today Reviews'} color="var(--color-topic-blue)" />
          <StatCard value={stats.streak_days} label={ar ? 'أيام متتالية' : 'Streak'} color="var(--color-topic-purple, #9B8EC4)" />
          <StatCard value={memorizationLevel} label={ar ? 'مستوى الحافظ' : 'Level'} color="var(--color-topic-turquoise, #4DBDB5)" />
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="page-frame rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-[var(--color-mushaf-gold)]">
                  {ar ? 'جاهز للمراجعة اليوم' : 'Ready for Review'}
                </h3>
                <p className="text-xs text-[var(--color-mushaf-text)]/55">
                  {dueCards.length > 0
                    ? (ar ? `${dueCards.length} بطاقات بانتظارك` : `${dueCards.length} cards are waiting`)
                    : (ar ? 'لا توجد بطاقات مستحقة الآن' : 'No cards are due right now')}
                </p>
              </div>
              {dueCards.length > 0 && (
                <button
                  onClick={() => startQuiz(quizMode)}
                  className="rounded-xl bg-[var(--color-mushaf-gold)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  {ar ? 'ابدأ الآن' : 'Start Now'}
                </button>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <QuizModeBtn
                onClick={() => startQuiz('complete')}
                icon="✍️"
                title={ar ? 'أكمل الآية' : 'Complete the Verse'}
                desc={ar ? 'تبدأ الآية ثم تكمل الباقي' : 'See the beginning and recall the rest'}
                disabled={dueCards.length === 0}
              />
              <QuizModeBtn
                onClick={() => startQuiz('topic')}
                icon="🏷️"
                title={ar ? 'من الموضوع' : 'From Topic'}
                desc={ar ? 'يظهر الموضوع وتستحضر الآية' : 'See the topic and recall the verse'}
                disabled={dueCards.length === 0}
              />
              <QuizModeBtn
                onClick={() => startQuiz('recall')}
                icon="🧠"
                title={ar ? 'استذكار كامل' : 'Full Recall'}
                desc={ar ? 'السورة والآية فقط' : 'Surah and ayah only'}
                disabled={dueCards.length === 0}
              />
            </div>
          </section>

          <section className="page-frame rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-[var(--color-mushaf-gold)]">
                {ar ? 'الدافع اليومي' : 'Daily Momentum'}
              </h3>
              <span className="rounded-full bg-[var(--color-mushaf-gold)]/10 px-2 py-1 text-xs text-[var(--color-mushaf-gold)]">
                {accuracyRate}% {ar ? 'دقة' : 'accuracy'}
              </span>
            </div>

            <div className="mb-3">
              <div className="mb-1 flex items-center justify-between text-xs text-[var(--color-mushaf-text)]/60">
                <span>{ar ? 'هدف اليوم' : 'Daily Goal'}</span>
                <span>{dailyGoalProgress}/{reminderPrefs.dailyGoal}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--color-mushaf-border)]/30">
                <div
                  className="h-full rounded-full bg-[var(--color-topic-green)] transition-all"
                  style={{ width: `${dailyGoalPct}%` }}
                />
              </div>
            </div>

            <div className="grid gap-3 text-sm">
              <label className="flex items-center justify-between gap-3">
                <span>{ar ? 'تذكير يومي بالمراجعة' : 'Daily review reminder'}</span>
                <input
                  type="checkbox"
                  checked={reminderPrefs.enabled}
                  onChange={(event) => void handleReminderToggle(event.target.checked)}
                />
              </label>

              <label className="flex items-center justify-between gap-3">
                <span>{ar ? 'وقت التذكير' : 'Reminder time'}</span>
                <input
                  type="time"
                  value={reminderPrefs.reminderTime}
                  onChange={(event) => setReminderPrefs((prev) => ({ ...prev, reminderTime: event.target.value }))}
                  className="rounded-lg border border-[var(--color-mushaf-border)] bg-transparent px-2 py-1"
                />
              </label>

              <label className="flex items-center justify-between gap-3">
                <span>{ar ? 'هدف المراجعات اليومي' : 'Daily reviews goal'}</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={reminderPrefs.dailyGoal}
                  onChange={(event) =>
                    setReminderPrefs((prev) => ({
                      ...prev,
                      dailyGoal: Math.max(1, Math.min(100, Number(event.target.value) || 1)),
                    }))
                  }
                  className="w-20 rounded-lg border border-[var(--color-mushaf-border)] bg-transparent px-2 py-1"
                />
              </label>
            </div>
          </section>
        </div>

        <section className="page-frame mb-6 rounded-2xl p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-[var(--color-mushaf-gold)]">
                {ar ? 'إضافة آيات إلى الحفظ' : 'Build Your Deck'}
              </h3>
              <p className="text-xs text-[var(--color-mushaf-text)]/55">
                {ar ? 'اختر من الصفحة الحالية أو ابحث داخل المصحف' : 'Add from the current page or search the Mushaf'}
              </p>
            </div>

            <button
              onClick={handleAddCurrentPage}
              className="rounded-xl border border-[var(--color-mushaf-gold)] px-4 py-2 text-sm font-medium text-[var(--color-mushaf-gold)] hover:bg-[var(--color-mushaf-gold)]/10"
            >
              {ar ? `إضافة آيات الصفحة ${currentPage}` : `Add page ${currentPage} verses`}
            </button>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={ar ? 'ابحث بنص الآية أو السورة أو 2:255' : 'Search by verse text, surah, or 2:255'}
              className="rounded-xl border border-[var(--color-mushaf-border)] bg-transparent px-4 py-2"
            />

            <select
              value={searchTopic}
              onChange={(event) => setSearchTopic(event.target.value)}
              className="rounded-xl border border-[var(--color-mushaf-border)] bg-transparent px-3 py-2"
            >
              <option value="all">{ar ? 'كل المواضيع' : 'All Topics'}</option>
              {Object.values(TOPICS).map((topic) => (
                <option key={topic.id} value={topic.color}>
                  {topicName(topic.id)}
                </option>
              ))}
            </select>
          </div>

          {deckMessage && (
            <div className="mb-4 rounded-xl bg-[var(--color-topic-green)]/10 px-3 py-2 text-sm text-[var(--color-topic-green)]">
              {deckMessage}
            </div>
          )}

          {loadingLibrary ? (
            <div className="py-8 text-center text-sm text-[var(--color-mushaf-text)]/50">
              {ar ? 'جاري تحميل مكتبة الآيات...' : 'Loading verse library...'}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {libraryResults.map((verse) => {
                const inDeck = isInDeck(verse.verse_key);

                return (
                  <div key={verse.verse_key} className="rounded-2xl border border-[var(--color-mushaf-border)]/40 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs text-[var(--color-mushaf-text)]/50">
                      <button
                        type="button"
                        onClick={() => verse.page && onGoToPage?.(verse.page)}
                        className="hover:text-[var(--color-mushaf-gold)]"
                      >
                        {SURAH_NAMES[verse.surah]} : {verse.ayah}
                        {verse.page ? ` • ${ar ? 'ص' : 'p'} ${verse.page}` : ''}
                      </button>
                      <span
                        className="rounded-full px-2 py-1 text-[10px] text-white"
                        style={{ backgroundColor: verse.topic.hex }}
                      >
                        {topicName(verse.topic.id)}
                      </span>
                    </div>

                    <div className="mb-3 line-clamp-2 font-[var(--font-arabic)] text-sm leading-7">
                      {verse.text}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (inDeck) {
                            removeCard(verse.verse_key);
                            return;
                          }

                          addCard({
                            verse_key: verse.verse_key,
                            surah: verse.surah,
                            ayah: verse.ayah,
                            text: verse.text,
                            topic_color: verse.topic.color,
                          });
                        }}
                        className={`rounded-xl px-3 py-2 text-sm font-medium ${
                          inDeck
                            ? 'bg-[var(--color-topic-green)]/10 text-[var(--color-topic-green)]'
                            : 'bg-[var(--color-mushaf-gold)] text-white'
                        }`}
                      >
                        {inDeck ? (ar ? 'مضافة للحفظ' : 'In Deck') : (ar ? 'أضف للحفظ' : 'Add to Deck')}
                      </button>
                      <VerseBookmarkButton verse={verse} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {allCards.length > 0 && (
          <section className="page-frame rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--color-mushaf-border)]/40 px-4 py-3">
              <h3 className="font-semibold">{ar ? 'البطاقات الحالية' : 'Current Deck'}</h3>
              <span className="text-xs text-[var(--color-mushaf-text)]/50">{allCards.length}</span>
            </div>

            <div className="max-h-[28rem] divide-y divide-[var(--color-mushaf-border)]/30 overflow-y-auto">
              {allCards.map((card) => {
                const due = card.next_review <= new Date().toISOString().split('T')[0];
                const topic = Object.values(TOPICS).find((item) => item.color === card.topic_color);

                return (
                  <div key={card.verse_key} className="flex items-start gap-3 px-4 py-3">
                    <div
                      className="mt-1 h-10 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: topic?.hex || '#999' }}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-mushaf-text)]/50">
                        <span>
                          {SURAH_NAMES[card.surah]} : {card.ayah}
                        </span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] ${
                          due
                            ? 'bg-[var(--color-topic-orange)]/20 text-[var(--color-topic-orange)]'
                            : card.interval >= 21
                              ? 'bg-[var(--color-topic-green)]/20 text-[var(--color-topic-green)]'
                              : 'bg-[var(--color-mushaf-border)]/30'
                        }`}>
                          {due ? (ar ? 'مطلوب' : 'Due') : card.interval >= 21 ? (ar ? 'متقن' : 'Mastered') : `${card.interval}d`}
                        </span>
                        <span className="text-[10px]">E:{card.easiness}</span>
                      </div>

                      <div className="line-clamp-1 font-[var(--font-arabic)] text-sm leading-relaxed">
                        {card.text}
                      </div>
                    </div>

                    <button
                      onClick={() => removeCard(card.verse_key)}
                      className="shrink-0 rounded-lg p-1 text-xs text-red-400 hover:text-red-600"
                      title={ar ? 'حذف' : 'Remove'}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    );
  }

  if (quizState === 'finished') {
    const pct = sessionScore.total > 0 ? Math.round((sessionScore.correct / sessionScore.total) * 100) : 0;

    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center p-4">
        <div className="page-frame w-full rounded-2xl p-8 text-center">
          <div className="mb-4 text-5xl">{pct >= 80 ? '🏆' : pct >= 50 ? '💪' : '📖'}</div>
          <h2 className="mb-2 text-xl font-bold text-[var(--color-mushaf-gold)]">
            {ar ? 'انتهت الجلسة!' : 'Session Complete!'}
          </h2>
          <div
            className="my-4 text-3xl font-bold"
            style={{
              color: pct >= 80
                ? 'var(--color-topic-green)'
                : pct >= 50
                  ? 'var(--color-topic-orange)'
                  : 'var(--color-topic-red)',
            }}
          >
            {pct}%
          </div>
          <div className="mb-6 text-sm text-[var(--color-mushaf-text)]/60">
            {sessionScore.correct} / {sessionScore.total} {ar ? 'إجابة صحيحة' : 'correct'}
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setQuizState('idle')}
              className="rounded-xl bg-[var(--color-mushaf-gold)] px-5 py-2.5 font-medium text-white hover:opacity-90"
            >
              {ar ? 'العودة' : 'Back'}
            </button>
            {getDueCards().length > 0 && (
              <button
                onClick={() => startQuiz(quizMode)}
                className="rounded-xl border border-[var(--color-mushaf-gold)] px-5 py-2.5 font-medium text-[var(--color-mushaf-gold)] hover:bg-[var(--color-mushaf-gold)]/10"
              >
                {ar ? 'جولة أخرى' : 'Another Round'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!currentCard) return null;

  const { prompt, hidden } = getQuestion(currentCard, quizMode);
  const topic = Object.values(TOPICS).find((item) => item.color === currentCard.topic_color);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col p-4">
      <div className="mb-4 flex shrink-0 items-center gap-3">
        <button
          onClick={() => setQuizState('idle')}
          className="text-sm text-[var(--color-mushaf-text)]/50 hover:text-[var(--color-mushaf-text)]"
        >
          ✕
        </button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-mushaf-border)]/30">
          <div
            className="h-full rounded-full bg-[var(--color-mushaf-gold)] transition-all duration-300"
            style={{ width: `${((currentIdx + (quizState === 'answer' ? 1 : 0)) / sessionCards.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-[var(--color-mushaf-text)]/50">
          {currentIdx + 1}/{sessionCards.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="page-frame w-full max-w-lg rounded-2xl p-6 sm:p-8">
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-lg bg-[var(--color-mushaf-border)]/20 px-2 py-1 text-xs">
              {quizMode === 'complete'
                ? (ar ? 'أكمل' : 'Complete')
                : quizMode === 'topic'
                  ? (ar ? 'موضوع' : 'Topic')
                  : (ar ? 'استذكار' : 'Recall')}
            </span>

            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: topic?.hex }} />
              <span className="text-xs text-[var(--color-mushaf-text)]/40">
                {SURAH_NAMES[currentCard.surah]} : {currentCard.ayah}
              </span>
            </div>
          </div>

          <div className="mb-6 text-center font-[var(--font-arabic)] text-xl leading-[2.2]">
            {quizMode === 'topic' ? (
              <div>
                <div
                  className="mb-3 inline-block rounded-xl px-4 py-2 text-base font-bold text-white"
                  style={{ backgroundColor: topic?.hex }}
                >
                  {prompt}
                </div>
                <div className="text-sm text-[var(--color-mushaf-text)]/40">
                  {ar ? 'ما هي الآية؟' : 'What is the verse?'}
                </div>
              </div>
            ) : (
              <div>
                <span className="text-[var(--color-mushaf-text)]">{prompt}</span>
                {quizState === 'question' && (
                  <span className="animate-pulse text-[var(--color-mushaf-gold)]"> ؟</span>
                )}
              </div>
            )}
          </div>

          {quizState === 'question' && !showHint && (
            <button
              onClick={() => setShowHint(true)}
              className="mx-auto mb-4 block text-xs text-[var(--color-mushaf-text)]/40 hover:text-[var(--color-mushaf-gold)]"
            >
              {ar ? 'تلميح' : 'Hint'}
            </button>
          )}

          {showHint && quizState === 'question' && (
            <div className="mb-4 text-center font-[var(--font-arabic)] text-sm text-[var(--color-mushaf-text)]/40">
              {hidden.split(' ').map((word, index) => (
                <span key={`${word}-${index}`}>{index === 0 ? word : ' ___'} </span>
              ))}
            </div>
          )}

          {quizState === 'answer' && (
            <div className="mb-4 rounded-xl border border-[var(--color-topic-green)]/30 bg-[var(--color-topic-green)]/10 p-4 text-center font-[var(--font-arabic)] text-lg leading-[2.2]">
              {currentCard.text}
            </div>
          )}

          {quizState === 'question' && (
            <button
              onClick={() => setQuizState('answer')}
              className="w-full rounded-xl bg-[var(--color-mushaf-gold)] py-3 text-sm font-medium text-white hover:opacity-90"
            >
              {ar ? 'إظهار الإجابة' : 'Show Answer'}
            </button>
          )}

          {quizState === 'answer' && (
            <div className="space-y-2">
              <div className="mb-2 text-center text-xs text-[var(--color-mushaf-text)]/40">
                {ar ? 'كيف كانت إجابتك؟' : 'How did you do?'}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <GradeBtn quality={1} onClick={gradeAnswer} label={ar ? 'نسيت' : 'Forgot'} color="var(--color-topic-red)" />
                <GradeBtn quality={3} onClick={gradeAnswer} label={ar ? 'صعب' : 'Hard'} color="var(--color-topic-orange)" />
                <GradeBtn quality={4} onClick={gradeAnswer} label={ar ? 'جيد' : 'Good'} color="var(--color-topic-blue)" />
                <GradeBtn quality={5} onClick={gradeAnswer} label={ar ? 'سهل' : 'Easy'} color="var(--color-topic-green)" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="page-frame rounded-xl p-3 text-center">
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
      <div className="mt-0.5 text-[10px] text-[var(--color-mushaf-text)]/50">{label}</div>
    </div>
  );
}

function QuizModeBtn({
  onClick,
  icon,
  title,
  desc,
  disabled,
}: {
  onClick: () => void;
  icon: string;
  title: string;
  desc: string;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl border border-[var(--color-mushaf-border)] p-3 text-start transition-all hover:border-[var(--color-mushaf-gold)] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className="mb-1 text-xl">{icon}</div>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-0.5 text-[10px] text-[var(--color-mushaf-text)]/50">{desc}</div>
    </button>
  );
}

function GradeBtn({
  quality,
  onClick,
  label,
  color,
}: {
  quality: number;
  onClick: (quality: number) => void;
  label: string;
  color: string;
}) {
  return (
    <button
      onClick={() => onClick(quality)}
      className="rounded-xl border-2 py-2.5 text-xs font-medium transition-opacity hover:opacity-80"
      style={{ borderColor: color, color }}
    >
      {label}
    </button>
  );
}
