'use client';

import { useState, useCallback, useMemo } from 'react';
import { SURAH_NAMES, TOPICS } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { useMemorization } from '@/lib/useMemorization';
import type { SM2Card } from '@/lib/sm2';

type QuizMode = 'complete' | 'topic' | 'recall';
type QuizState = 'idle' | 'question' | 'answer' | 'finished';

interface QuizPanelProps {
  onGoToPage?: (page: number) => void;
}

export default function QuizPanel({ onGoToPage }: QuizPanelProps) {
  const { lang, topicName } = useI18n();
  const { cards, stats, getDueCards, reviewCard, removeCard, getAllCardsSorted } = useMemorization();

  const [quizState, setQuizState] = useState<QuizState>('idle');
  const [quizMode, setQuizMode] = useState<QuizMode>('complete');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sessionCards, setSessionCards] = useState<SM2Card[]>([]);
  const [userInput, setUserInput] = useState('');
  const [sessionScore, setSessionScore] = useState({ correct: 0, total: 0 });
  const [showHint, setShowHint] = useState(false);

  const ar = lang === 'ar';
  const dueCards = useMemo(() => getDueCards(), [getDueCards]);
  const currentCard = sessionCards[currentIdx] || null;

  // Start quiz session
  const startQuiz = useCallback((mode: QuizMode) => {
    const due = getDueCards();
    if (due.length === 0) return;
    setQuizMode(mode);
    setSessionCards(due.slice(0, 20)); // Max 20 per session
    setCurrentIdx(0);
    setSessionScore({ correct: 0, total: 0 });
    setUserInput('');
    setShowHint(false);
    setQuizState('question');
  }, [getDueCards]);

  // Get the question text based on mode
  const getQuestion = useCallback((card: SM2Card, mode: QuizMode) => {
    if (!card) return { prompt: '', hidden: '' };
    const words = card.text.split(' ');
    switch (mode) {
      case 'complete': {
        // Show first ~40% of words, hide the rest
        const showCount = Math.max(2, Math.ceil(words.length * 0.4));
        return {
          prompt: words.slice(0, showCount).join(' ') + ' ...',
          hidden: words.slice(showCount).join(' '),
        };
      }
      case 'topic': {
        // Show topic color, ask which verse
        const topic = Object.values(TOPICS).find(t => t.color === card.topic_color);
        return {
          prompt: topicName(topic?.id || 0),
          hidden: card.text,
        };
      }
      case 'recall': {
        // Show surah + ayah number, recall the full verse
        return {
          prompt: `${SURAH_NAMES[card.surah]} — ${ar ? 'آية' : 'Verse'} ${card.ayah}`,
          hidden: card.text,
        };
      }
    }
  }, [topicName, ar]);

  // Grade the answer
  const gradeAnswer = useCallback((quality: number) => {
    if (!currentCard) return;
    reviewCard(currentCard.verse_key, quality);
    setSessionScore(prev => ({
      correct: quality >= 3 ? prev.correct + 1 : prev.correct,
      total: prev.total + 1,
    }));

    // Move to next or finish
    if (currentIdx + 1 < sessionCards.length) {
      setCurrentIdx(currentIdx + 1);
      setUserInput('');
      setShowHint(false);
      setQuizState('question');
    } else {
      setQuizState('finished');
    }
  }, [currentCard, currentIdx, sessionCards.length, reviewCard]);

  const showAnswer = () => setQuizState('answer');

  // Deck management view when idle
  if (quizState === 'idle') {
    const allCards = getAllCardsSorted();
    return (
      <div className="p-4 max-w-3xl mx-auto">
        <h2 className="text-lg font-bold text-[var(--color-mushaf-gold)] mb-4 text-center font-[var(--font-arabic)]">
          {ar ? 'الحفظ والمراجعة' : 'Memorization & Review'}
        </h2>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard value={stats.total_cards} label={ar ? 'إجمالي البطاقات' : 'Total Cards'} color="var(--color-mushaf-gold)" />
          <StatCard value={stats.due_today} label={ar ? 'مطلوب اليوم' : 'Due Today'} color="var(--color-topic-orange)" />
          <StatCard value={stats.mastered} label={ar ? 'تم إتقانها' : 'Mastered'} color="var(--color-topic-green)" />
          <StatCard value={stats.today_reviews} label={ar ? 'مراجعات اليوم' : 'Today\'s Reviews'} color="var(--color-topic-blue)" />
        </div>

        {/* Quiz mode buttons */}
        {dueCards.length > 0 ? (
          <div className="page-frame rounded-xl p-5 mb-6">
            <h3 className="font-semibold text-sm mb-3 text-[var(--color-mushaf-gold)]">
              {ar ? `${dueCards.length} بطاقة جاهزة للمراجعة` : `${dueCards.length} cards ready for review`}
            </h3>
            <div className="grid gap-2 sm:grid-cols-3">
              <QuizModeBtn
                onClick={() => startQuiz('complete')}
                icon="✍️"
                title={ar ? 'أكمل الآية' : 'Complete the Verse'}
                desc={ar ? 'اظهار أول الآية وإكمال الباقي' : 'Show beginning, complete the rest'}
              />
              <QuizModeBtn
                onClick={() => startQuiz('topic')}
                icon="🏷️"
                title={ar ? 'من الموضوع' : 'From Topic'}
                desc={ar ? 'اظهار الموضوع واستذكار الآية' : 'Show topic, recall the verse'}
              />
              <QuizModeBtn
                onClick={() => startQuiz('recall')}
                icon="🧠"
                title={ar ? 'استذكار كامل' : 'Full Recall'}
                desc={ar ? 'اظهار السورة والآية فقط' : 'Show surah & ayah only'}
              />
            </div>
          </div>
        ) : cards.length > 0 ? (
          <div className="page-frame rounded-xl p-6 mb-6 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <div className="font-semibold text-[var(--color-topic-green)]">
              {ar ? 'أحسنت! لا توجد بطاقات مطلوبة اليوم' : 'Great job! No cards due today'}
            </div>
            <div className="text-xs text-[var(--color-mushaf-text)]/50 mt-1">
              {ar ? 'ستظهر البطاقات عند حلول موعد مراجعتها' : 'Cards will appear when their review date arrives'}
            </div>
          </div>
        ) : (
          <div className="page-frame rounded-xl p-6 mb-6 text-center">
            <div className="text-3xl mb-2">📚</div>
            <div className="text-[var(--color-mushaf-text)]/60 text-sm">
              {ar ? 'لم تضف أي آيات بعد. اضغط ★ بجوار أي آية في المصحف لإضافتها' : 'No cards yet. Click ★ next to any verse in the Mushaf to add it'}
            </div>
          </div>
        )}

        {/* Card deck list */}
        {allCards.length > 0 && (
          <div className="page-frame rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-[var(--color-mushaf-border)]/20 border-b border-[var(--color-mushaf-border)] flex items-center justify-between">
              <h3 className="font-semibold text-sm">{ar ? 'البطاقات' : 'Deck'}</h3>
              <span className="text-xs text-[var(--color-mushaf-text)]/50">{allCards.length}</span>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-[var(--color-mushaf-border)]/30">
              {allCards.map(card => {
                const due = card.next_review <= new Date().toISOString().split('T')[0];
                const topic = Object.values(TOPICS).find(t => t.color === card.topic_color);
                return (
                  <div key={card.verse_key} className="px-4 py-3 flex items-start gap-3 hover:bg-[var(--color-mushaf-border)]/10">
                    <div
                      className="w-1.5 self-stretch rounded-full shrink-0"
                      style={{ backgroundColor: topic?.hex || '#999' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-[var(--color-mushaf-text)]/50 mb-0.5">
                        <span>{SURAH_NAMES[card.surah]} : {card.ayah}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          due ? 'bg-[var(--color-topic-orange)]/20 text-[var(--color-topic-orange)]'
                            : card.interval >= 21 ? 'bg-[var(--color-topic-green)]/20 text-[var(--color-topic-green)]'
                            : 'bg-[var(--color-mushaf-border)]/30'
                        }`}>
                          {due ? (ar ? 'مطلوب' : 'Due') : card.interval >= 21 ? (ar ? 'متقن' : 'Mastered') : `${card.interval}d`}
                        </span>
                        <span className="text-[10px]">E:{card.easiness}</span>
                      </div>
                      <div className="font-[var(--font-arabic)] text-sm line-clamp-1 leading-relaxed">
                        {card.text}
                      </div>
                    </div>
                    <button
                      onClick={() => removeCard(card.verse_key)}
                      className="text-xs text-red-400 hover:text-red-600 shrink-0 p-1"
                      title={ar ? 'حذف' : 'Remove'}
                    >✕</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Finished view
  if (quizState === 'finished') {
    const pct = sessionScore.total > 0 ? Math.round((sessionScore.correct / sessionScore.total) * 100) : 0;
    return (
      <div className="p-4 max-w-xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <div className="page-frame rounded-2xl p-8 text-center w-full">
          <div className="text-5xl mb-4">{pct >= 80 ? '🏆' : pct >= 50 ? '💪' : '📖'}</div>
          <h2 className="text-xl font-bold text-[var(--color-mushaf-gold)] mb-2">
            {ar ? 'انتهت الجلسة!' : 'Session Complete!'}
          </h2>
          <div className="text-3xl font-bold my-4" style={{ color: pct >= 80 ? 'var(--color-topic-green)' : pct >= 50 ? 'var(--color-topic-orange)' : 'var(--color-topic-red)' }}>
            {pct}%
          </div>
          <div className="text-sm text-[var(--color-mushaf-text)]/60 mb-6">
            {sessionScore.correct} / {sessionScore.total} {ar ? 'إجابة صحيحة' : 'correct'}
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setQuizState('idle')}
              className="px-5 py-2.5 rounded-xl bg-[var(--color-mushaf-gold)] text-white font-medium hover:opacity-90 transition-opacity"
            >
              {ar ? 'العودة' : 'Back'}
            </button>
            {getDueCards().length > 0 && (
              <button
                onClick={() => startQuiz(quizMode)}
                className="px-5 py-2.5 rounded-xl border border-[var(--color-mushaf-gold)] text-[var(--color-mushaf-gold)] font-medium hover:bg-[var(--color-mushaf-gold)]/10 transition-colors"
              >
                {ar ? 'جلسة أخرى' : 'Another Round'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Quiz question/answer view
  if (!currentCard) return null;
  const { prompt, hidden } = getQuestion(currentCard, quizMode);
  const topic = Object.values(TOPICS).find(t => t.color === currentCard.topic_color);

  return (
    <div className="p-4 max-w-2xl mx-auto flex flex-col min-h-[70vh]">
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <button
          onClick={() => setQuizState('idle')}
          className="text-sm text-[var(--color-mushaf-text)]/50 hover:text-[var(--color-mushaf-text)]"
        >✕</button>
        <div className="flex-1 h-2 bg-[var(--color-mushaf-border)]/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--color-mushaf-gold)] rounded-full transition-all duration-300"
            style={{ width: `${((currentIdx + (quizState === 'answer' ? 1 : 0)) / sessionCards.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-[var(--color-mushaf-text)]/50">
          {currentIdx + 1}/{sessionCards.length}
        </span>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="page-frame rounded-2xl p-6 sm:p-8 w-full max-w-lg">
          {/* Mode badge */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs px-2 py-1 rounded-lg bg-[var(--color-mushaf-border)]/20">
              {quizMode === 'complete' ? (ar ? 'أكمل' : 'Complete')
                : quizMode === 'topic' ? (ar ? 'موضوع' : 'Topic')
                : (ar ? 'استذكار' : 'Recall')}
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: topic?.hex }}
              />
              <span className="text-xs text-[var(--color-mushaf-text)]/40">
                {SURAH_NAMES[currentCard.surah]} : {currentCard.ayah}
              </span>
            </div>
          </div>

          {/* Question prompt */}
          <div className="font-[var(--font-arabic)] text-xl leading-[2.2] text-center mb-6">
            {quizMode === 'topic' ? (
              <div>
                <div
                  className="inline-block px-4 py-2 rounded-xl text-white font-bold text-base mb-3"
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
                  <span className="text-[var(--color-mushaf-gold)] animate-pulse"> ؟</span>
                )}
              </div>
            )}
          </div>

          {/* Hint button */}
          {quizState === 'question' && !showHint && (
            <button
              onClick={() => setShowHint(true)}
              className="text-xs text-[var(--color-mushaf-text)]/40 hover:text-[var(--color-mushaf-gold)] block mx-auto mb-4"
            >
              {ar ? '💡 تلميح' : '💡 Hint'}
            </button>
          )}
          {showHint && quizState === 'question' && (
            <div className="text-center text-sm text-[var(--color-mushaf-text)]/40 mb-4 font-[var(--font-arabic)]">
              {hidden.split(' ').map((w, i) => (
                <span key={i}>{i === 0 ? w : ' ___'} </span>
              ))}
            </div>
          )}

          {/* Answer reveal */}
          {quizState === 'answer' && (
            <div className="font-[var(--font-arabic)] text-lg leading-[2.2] text-center p-4 rounded-xl bg-[var(--color-topic-green)]/10 border border-[var(--color-topic-green)]/30 mb-4">
              {currentCard.text}
            </div>
          )}

          {/* Show answer button */}
          {quizState === 'question' && (
            <button
              onClick={showAnswer}
              className="w-full py-3 rounded-xl bg-[var(--color-mushaf-gold)] text-white font-medium hover:opacity-90 transition-opacity text-sm"
            >
              {ar ? 'اظهار الإجابة' : 'Show Answer'}
            </button>
          )}

          {/* Grading buttons */}
          {quizState === 'answer' && (
            <div className="space-y-2">
              <div className="text-xs text-center text-[var(--color-mushaf-text)]/40 mb-2">
                {ar ? 'كيف كانت إجابتك؟' : 'How did you do?'}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <GradeBtn quality={1} onClick={gradeAnswer} ar={ar}
                  label={ar ? 'لم أعرف' : 'Forgot'} color="var(--color-topic-red)" />
                <GradeBtn quality={3} onClick={gradeAnswer} ar={ar}
                  label={ar ? 'صعب' : 'Hard'} color="var(--color-topic-orange)" />
                <GradeBtn quality={4} onClick={gradeAnswer} ar={ar}
                  label={ar ? 'جيد' : 'Good'} color="var(--color-topic-blue)" />
                <GradeBtn quality={5} onClick={gradeAnswer} ar={ar}
                  label={ar ? 'سهل' : 'Easy'} color="var(--color-topic-green)" />
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
    <div className="page-frame p-3 rounded-xl text-center">
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
      <div className="text-[10px] text-[var(--color-mushaf-text)]/50 mt-0.5">{label}</div>
    </div>
  );
}

function QuizModeBtn({ onClick, icon, title, desc }: { onClick: () => void; icon: string; title: string; desc: string }) {
  return (
    <button
      onClick={onClick}
      className="p-3 rounded-xl border border-[var(--color-mushaf-border)] hover:border-[var(--color-mushaf-gold)] hover:shadow-md transition-all text-start"
    >
      <div className="text-xl mb-1">{icon}</div>
      <div className="font-semibold text-sm">{title}</div>
      <div className="text-[10px] text-[var(--color-mushaf-text)]/50 mt-0.5">{desc}</div>
    </button>
  );
}

function GradeBtn({ quality, onClick, label, color, ar }: {
  quality: number; onClick: (q: number) => void; label: string; color: string; ar: boolean;
}) {
  return (
    <button
      onClick={() => onClick(quality)}
      className="py-2.5 rounded-xl border-2 font-medium text-xs hover:opacity-80 transition-opacity"
      style={{ borderColor: color, color }}
    >
      {label}
    </button>
  );
}
