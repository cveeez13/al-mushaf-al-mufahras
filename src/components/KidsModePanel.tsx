'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useI18n } from '@/lib/i18n';
import { SURAH_NAMES } from '@/lib/types';
import {
  type KidsProfile,
  type KidsQuizQuestion,
  type KidsQuizResult,
  type Badge,
  KIDS_TOPICS,
  loadKidsProfile,
  saveKidsProfile,
  updateStreak,
  generateKidsQuiz,
  gradeKidsAnswer,
  levelFromXP,
  levelProgress,
  getLevelTitle,
  checkNewBadges,
  getAllBadgeDefs,
  xpForLevel,
} from '@/lib/kidsMode';

interface KidsModeProps {
  onGoToPage: (page: number) => void;
}

type Screen = 'home' | 'topic-pick' | 'quiz' | 'result' | 'badges' | 'profile';

export default function KidsModePanel({ onGoToPage }: KidsModeProps) {
  const { lang } = useI18n();
  const isAr = lang === 'ar';

  // Profile
  const [profile, setProfile] = useState<KidsProfile>(loadKidsProfile);
  const [screen, setScreen] = useState<Screen>('home');

  // Quiz state
  const [questions, setQuestions] = useState<KidsQuizQuestion[]>([]);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [quizResult, setQuizResult] = useState<KidsQuizResult | null>(null);
  const [sessionScore, setSessionScore] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [pendingBadges, setPendingBadges] = useState<Badge[]>([]);

  // Sound effect refs
  const correctSoundRef = useRef<HTMLAudioElement | null>(null);
  const wrongSoundRef = useRef<HTMLAudioElement | null>(null);
  const levelUpSoundRef = useRef<HTMLAudioElement | null>(null);

  // Update streak on mount
  useEffect(() => {
    const updated = updateStreak(profile);
    if (updated !== profile) {
      setProfile(updated);
      saveKidsProfile(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save profile on change
  useEffect(() => {
    saveKidsProfile(profile);
  }, [profile]);

  const playSound = useCallback((type: 'correct' | 'wrong' | 'levelup') => {
    try {
      // Use Web Audio for simple tones since we don't have audio files
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = 0.15;

      if (type === 'correct') {
        osc.frequency.value = 523; // C5
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
        // Quick second note
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 659; // E5
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc2.start(ctx.currentTime + 0.15);
        osc2.stop(ctx.currentTime + 0.5);
      } else if (type === 'wrong') {
        osc.frequency.value = 200;
        osc.type = 'triangle';
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else {
        // Level up — ascending arpeggio
        [523, 659, 784, 1047].forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.frequency.value = freq;
          o.type = 'sine';
          g.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.12);
          g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.3);
          o.start(ctx.currentTime + i * 0.12);
          o.stop(ctx.currentTime + i * 0.12 + 0.3);
        });
      }
    } catch { /* AudioContext not available */ }
  }, []);

  // ─── Start Quiz ──────────────────────────────────────

  const startQuiz = useCallback(async (topicId?: number) => {
    const qs = await generateKidsQuiz(5, topicId);
    if (qs.length === 0) return;
    setQuestions(qs);
    setQuestionIdx(0);
    setSessionScore(0);
    setSessionTotal(0);
    setQuizResult(null);
    setSelectedWords([]);
    // Generate shuffled word options for first question
    prepareOptions(qs[0]);
    setScreen('quiz');
  }, []);

  const prepareOptions = (q: KidsQuizQuestion) => {
    // Shuffle hidden words + 2 distractor words
    const distractors = ['الله', 'من', 'في', 'على', 'إلى', 'عن', 'أن', 'لا', 'ما', 'هو', 'كل', 'بكل'];
    const extras = distractors
      .filter(d => !q.hiddenWords.includes(d) && !q.shownWords.includes(d))
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(2, Math.max(0, 4 - q.hiddenWords.length)));
    const options = [...q.hiddenWords, ...extras].sort(() => Math.random() - 0.5);
    setShuffledOptions(options);
    setSelectedWords([]);
  };

  // ─── Answer Handling ──────────────────────────────────

  const handleWordSelect = useCallback((word: string) => {
    setSelectedWords(prev => {
      if (prev.includes(word)) return prev;
      return [...prev, word];
    });
  }, []);

  const handleWordRemove = useCallback((idx: number) => {
    setSelectedWords(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const submitAnswer = useCallback(() => {
    const q = questions[questionIdx];
    if (!q) return;

    const isCorrect = q.hiddenWords.every((w, i) => selectedWords[i] === w);
    const result = gradeKidsAnswer(isCorrect, profile);

    // Update profile
    setProfile(prev => {
      const updated = { ...prev };
      updated.xp += result.xpEarned;
      updated.stars += result.starsEarned;
      updated.level = levelFromXP(updated.xp);
      updated.quizzesCompleted += 1;
      if (isCorrect && !updated.versesLearned.includes(q.verse_key)) {
        updated.versesLearned = [...updated.versesLearned, q.verse_key];
      }
      updated.topicProgress = { ...updated.topicProgress };
      updated.topicProgress[q.topicId] = (updated.topicProgress[q.topicId] || 0) + 1;

      // Check badges
      const newBadges = checkNewBadges(updated);
      if (newBadges.length > 0) {
        updated.badges = [...updated.badges, ...newBadges];
        setPendingBadges(newBadges);
      }

      return updated;
    });

    setQuizResult(result);
    setSessionTotal(prev => prev + 1);
    if (isCorrect) {
      setSessionScore(prev => prev + 1);
      playSound('correct');
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 1500);
    } else {
      playSound('wrong');
    }

    if (result.newLevel) {
      setTimeout(() => playSound('levelup'), 600);
    }
  }, [questions, questionIdx, selectedWords, profile, playSound]);

  const nextQuestion = useCallback(() => {
    setQuizResult(null);
    setPendingBadges([]);
    const nextIdx = questionIdx + 1;
    if (nextIdx >= questions.length) {
      setScreen('result');
    } else {
      setQuestionIdx(nextIdx);
      prepareOptions(questions[nextIdx]);
    }
  }, [questionIdx, questions]);

  const currentQ = questions[questionIdx];
  const topicInfo = currentQ ? KIDS_TOPICS[currentQ.topicId] : null;
  const levelProg = levelProgress(profile.xp);

  // ─── RENDER ──────────────────────────────────────────

  // Home Screen
  if (screen === 'home') {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header with level info */}
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold">
            🧒 {isAr ? 'وضع الأطفال' : 'Kids Mode'}
          </h2>
          <p className="text-sm opacity-60">
            {isAr ? 'تعلّم القرآن بطريقة ممتعة!' : 'Learn the Quran in a fun way!'}
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-gradient-to-br from-[var(--color-mushaf-gold)]/10 to-[var(--color-mushaf-gold)]/5 rounded-2xl p-5 border-2 border-[var(--color-mushaf-gold)]/30">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-[var(--color-mushaf-gold)] flex items-center justify-center text-3xl shrink-0">
              {profile.level >= 5 ? '👑' : profile.level >= 3 ? '⭐' : '🌟'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{isAr ? 'المستوى' : 'Level'} {profile.level}</span>
                <span className="text-sm opacity-60">{getLevelTitle(profile.level, lang)}</span>
              </div>
              {/* XP Bar */}
              <div className="mt-2 h-3 bg-[var(--color-mushaf-border)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--color-mushaf-gold)] to-yellow-400 rounded-full transition-all duration-700"
                  style={{ width: `${Math.round(levelProg * 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1 text-xs opacity-50">
                <span>{profile.xp} XP</span>
                <span>{xpForLevel(profile.level + 1)} XP</span>
              </div>
            </div>
          </div>
          {/* Stats row */}
          <div className="flex items-center justify-around mt-4 pt-3 border-t border-[var(--color-mushaf-gold)]/20">
            <StatBubble icon="⭐" value={profile.stars} label={isAr ? 'نجوم' : 'Stars'} />
            <StatBubble icon="🔥" value={profile.streakDays} label={isAr ? 'أيام متتالية' : 'Streak'} />
            <StatBubble icon="📖" value={profile.versesLearned.length} label={isAr ? 'آيات' : 'Verses'} />
            <StatBubble icon="🏅" value={profile.badges.length} label={isAr ? 'أوسمة' : 'Badges'} />
          </div>
        </div>

        {/* Start Quiz Button */}
        <button
          onClick={() => setScreen('topic-pick')}
          className="w-full py-5 rounded-2xl bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xl font-bold shadow-lg shadow-green-500/30 hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          {isAr ? '🎮 ابدأ اللعب!' : '🎮 Start Playing!'}
        </button>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setScreen('badges')}
            className="py-4 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-center hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            <span className="text-2xl">🏅</span>
            <p className="text-sm font-bold mt-1">{isAr ? 'الأوسمة' : 'Badges'}</p>
          </button>
          <button
            onClick={() => startQuiz()}
            className="py-4 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-center hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            <span className="text-2xl">🎲</span>
            <p className="text-sm font-bold mt-1">{isAr ? 'عشوائي' : 'Random'}</p>
          </button>
        </div>

        {/* Topic Cards - the 7 topics as kid-friendly cards */}
        <div>
          <h3 className="font-bold text-lg mb-3">{isAr ? '🌈 المواضيع' : '🌈 Topics'}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.values(KIDS_TOPICS).map(topic => (
              <button
                key={topic.id}
                onClick={() => startQuiz(topic.id)}
                className="rounded-2xl p-4 text-center border-2 hover:scale-[1.03] active:scale-[0.97] transition-transform"
                style={{
                  background: topic.bgGradient,
                  borderColor: topic.hex + '40',
                }}
              >
                <span className="text-4xl block mb-2">{topic.icon}</span>
                <p className="font-bold text-sm" style={{ color: topic.hex }}>
                  {isAr ? topic.name_ar : topic.name_en}
                </p>
                <p className="text-xs opacity-50 mt-1">
                  {profile.topicProgress[topic.id] || 0} {isAr ? 'آية' : 'verses'}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Topic Pick Screen
  if (screen === 'topic-pick') {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setScreen('home')} className="text-2xl hover:scale-110 transition-transform">⬅️</button>
          <h2 className="text-2xl font-bold">{isAr ? 'اختر موضوعاً!' : 'Pick a Topic!'}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* All topics option */}
          <button
            onClick={() => startQuiz()}
            className="rounded-2xl p-5 text-center border-2 border-[var(--color-mushaf-gold)]/40 bg-gradient-to-br from-[var(--color-mushaf-gold)]/10 to-transparent hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            <span className="text-5xl block mb-2">🌈</span>
            <p className="font-bold text-lg">{isAr ? 'كل المواضيع' : 'All Topics'}</p>
            <p className="text-sm opacity-50">{isAr ? 'أسئلة من كل الأنواع' : 'Questions from all types'}</p>
          </button>

          {Object.values(KIDS_TOPICS).map(topic => (
            <button
              key={topic.id}
              onClick={() => startQuiz(topic.id)}
              className="rounded-2xl p-5 text-center border-2 hover:scale-[1.02] active:scale-[0.98] transition-transform"
              style={{ background: topic.bgGradient, borderColor: topic.hex + '40' }}
            >
              <span className="text-5xl block mb-2">{topic.icon}</span>
              <p className="font-bold text-lg" style={{ color: topic.hex }}>
                {isAr ? topic.name_ar : topic.name_en}
              </p>
              <p className="text-sm opacity-50">
                {profile.topicProgress[topic.id] || 0} {isAr ? 'آية تعلمتها' : 'verses learned'}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Quiz Screen
  if (screen === 'quiz' && currentQ && topicInfo) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-5">
        {/* Celebration overlay */}
        {showCelebration && (
          <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
            <div className="text-8xl animate-bounce">🌟</div>
            {/* Confetti-like emojis */}
            {['⭐', '🎉', '✨', '💫', '🌈'].map((e, i) => (
              <span
                key={i}
                className="absolute text-3xl animate-ping"
                style={{
                  top: `${20 + Math.random() * 60}%`,
                  left: `${10 + Math.random() * 80}%`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '1s',
                }}
              >
                {e}
              </span>
            ))}
          </div>
        )}

        {/* Quiz Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => setScreen('home')} className="text-2xl hover:scale-110 transition-transform">⬅️</button>
          <div className="flex items-center gap-2">
            <span className="text-xl">{topicInfo.icon}</span>
            <span className="font-bold text-sm" style={{ color: topicInfo.hex }}>
              {isAr ? topicInfo.name_ar : topicInfo.name_en}
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <span>⭐ {profile.stars}</span>
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-2">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all ${
                i < questionIdx ? 'bg-green-400 scale-100'
                : i === questionIdx ? 'bg-[var(--color-mushaf-gold)] scale-125'
                : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Verse Card */}
        <div
          className="rounded-2xl p-5 border-2"
          style={{ background: topicInfo.bgGradient, borderColor: topicInfo.hex + '40' }}
        >
          <div className="text-center mb-3">
            <span className="text-xs font-medium px-3 py-1 rounded-full text-white" style={{ backgroundColor: topicInfo.hex }}>
              {isAr ? `سورة ${SURAH_NAMES[currentQ.surah]}` : `Surah ${SURAH_NAMES[currentQ.surah]}`} — {isAr ? `آية ${currentQ.ayah}` : `Verse ${currentQ.ayah}`}
            </span>
          </div>

          {/* Shown words + blanks */}
          <p className="text-2xl font-[var(--font-arabic)] leading-[2.5] text-center" dir="rtl">
            {currentQ.shownWords.map((word, i) => (
              <span key={`shown-${i}`} className="inline-block mx-1 text-[var(--color-mushaf-text)]">
                {word}
              </span>
            ))}
            {' '}
            {currentQ.hiddenWords.map((_, i) => {
              const selected = selectedWords[i];
              return (
                <span
                  key={`blank-${i}`}
                  onClick={() => selected && handleWordRemove(i)}
                  className={`inline-block mx-1 px-3 py-1 rounded-lg border-2 border-dashed min-w-[60px] text-center cursor-pointer transition-all ${
                    selected
                      ? 'border-[var(--color-mushaf-gold)] bg-[var(--color-mushaf-gold)]/10'
                      : 'border-gray-400 opacity-50'
                  }`}
                >
                  {selected || '___'}
                </span>
              );
            })}
          </p>
        </div>

        {/* Word Options */}
        {!quizResult && (
          <div className="flex flex-wrap gap-2 justify-center">
            {shuffledOptions.map((word, i) => {
              const isUsed = selectedWords.includes(word);
              return (
                <button
                  key={`opt-${i}`}
                  onClick={() => !isUsed && handleWordSelect(word)}
                  disabled={isUsed}
                  className={`px-5 py-3 rounded-xl text-lg font-[var(--font-arabic)] font-bold border-2 transition-all ${
                    isUsed
                      ? 'opacity-30 scale-90 border-gray-300'
                      : 'border-[var(--color-mushaf-gold)] bg-white dark:bg-[var(--color-mushaf-paper)] hover:scale-105 hover:shadow-md active:scale-95 shadow-sm'
                  }`}
                >
                  {word}
                </button>
              );
            })}
          </div>
        )}

        {/* Submit / Result */}
        {!quizResult && selectedWords.length === currentQ.hiddenWords.length && (
          <button
            onClick={submitAnswer}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-green-400 to-emerald-500 text-white text-lg font-bold shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-transform"
          >
            {isAr ? '✅ تحقق!' : '✅ Check!'}
          </button>
        )}

        {quizResult && (
          <div className={`rounded-2xl p-5 text-center space-y-3 ${
            quizResult.correct
              ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-300'
              : 'bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-300'
          }`}>
            <p className="text-2xl font-bold">
              {isAr ? quizResult.encouragement.ar : quizResult.encouragement.en}
            </p>
            <div className="flex items-center justify-center gap-4 text-sm">
              <span>+{quizResult.xpEarned} XP</span>
              {quizResult.starsEarned > 0 && <span>+{quizResult.starsEarned} ⭐</span>}
            </div>
            {/* Show correct answer if wrong */}
            {!quizResult.correct && (
              <div className="pt-2 border-t border-orange-200 dark:border-orange-700">
                <p className="text-xs opacity-60 mb-1">{isAr ? 'الإجابة الصحيحة:' : 'Correct answer:'}</p>
                <p className="text-lg font-[var(--font-arabic)] leading-[2]" dir="rtl">
                  {currentQ.fullText}
                </p>
              </div>
            )}
            {/* New badges */}
            {pendingBadges.length > 0 && (
              <div className="pt-2 border-t border-green-200 dark:border-green-700 space-y-2">
                <p className="font-bold text-sm">{isAr ? '🏅 وسام جديد!' : '🏅 New Badge!'}</p>
                {pendingBadges.map(b => (
                  <div key={b.id} className="flex items-center justify-center gap-2">
                    <span className="text-2xl">{b.icon}</span>
                    <span className="font-medium">{isAr ? b.name_ar : b.name_en}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Level up */}
            {quizResult.newLevel && (
              <div className="pt-2 border-t border-green-200 dark:border-green-700">
                <p className="text-xl font-bold">🎉 {isAr ? 'ارتقيت للمستوى' : 'Level Up!'} {profile.level}!</p>
                <p className="text-sm">{getLevelTitle(profile.level, lang)}</p>
              </div>
            )}

            <button
              onClick={nextQuestion}
              className="mt-2 px-8 py-3 rounded-xl bg-[var(--color-mushaf-gold)] text-white font-bold hover:scale-105 active:scale-95 transition-transform"
            >
              {questionIdx < questions.length - 1
                ? (isAr ? 'السؤال التالي ➡️' : 'Next ➡️')
                : (isAr ? 'النتيجة 🏆' : 'Results 🏆')}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Result Screen (End of Quiz)
  if (screen === 'result') {
    const percent = sessionTotal > 0 ? Math.round((sessionScore / sessionTotal) * 100) : 0;
    const emoji = percent >= 80 ? '🏆' : percent >= 50 ? '⭐' : '💪';

    return (
      <div className="max-w-md mx-auto p-4 space-y-6 text-center">
        <div className="text-6xl">{emoji}</div>
        <h2 className="text-3xl font-bold">
          {isAr ? 'أحسنت!' : 'Well Done!'}
        </h2>

        <div className="bg-[var(--color-mushaf-paper)] rounded-2xl p-6 space-y-4 border border-[var(--color-mushaf-border)]">
          <div className="text-5xl font-bold text-[var(--color-mushaf-gold)]">
            {sessionScore}/{sessionTotal}
          </div>
          <p className="text-sm opacity-60">
            {isAr ? `أجبت بشكل صحيح على ${percent}% من الأسئلة` : `You answered ${percent}% correctly`}
          </p>

          {/* Stars earned */}
          <div className="flex items-center justify-center gap-1 text-3xl">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={i < sessionScore ? '' : 'opacity-20'}>⭐</span>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setScreen('topic-pick')}
            className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            {isAr ? '🔄 العب مرة أخرى' : '🔄 Play Again'}
          </button>
          <button
            onClick={() => setScreen('home')}
            className="flex-1 py-4 rounded-2xl bg-[var(--color-mushaf-border)]/30 font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            {isAr ? '🏠 الرئيسية' : '🏠 Home'}
          </button>
        </div>
      </div>
    );
  }

  // Badges Screen
  if (screen === 'badges') {
    const allDefs = getAllBadgeDefs();
    const earnedIds = new Set(profile.badges.map(b => b.id));

    return (
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setScreen('home')} className="text-2xl hover:scale-110 transition-transform">⬅️</button>
          <h2 className="text-2xl font-bold">🏅 {isAr ? 'الأوسمة' : 'Badges'}</h2>
          <span className="text-sm opacity-50">{profile.badges.length}/{allDefs.length}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {allDefs.map(def => {
            const earned = earnedIds.has(def.id);
            return (
              <div
                key={def.id}
                className={`rounded-2xl p-4 text-center border-2 transition-all ${
                  earned
                    ? 'border-[var(--color-mushaf-gold)] bg-[var(--color-mushaf-gold)]/5'
                    : 'border-gray-200 dark:border-gray-700 opacity-40 grayscale'
                }`}
              >
                <span className="text-4xl block mb-2">{def.icon}</span>
                <p className="font-bold text-sm">{isAr ? def.name_ar : def.name_en}</p>
                <p className="text-xs opacity-60 mt-1">{isAr ? def.desc_ar : def.desc_en}</p>
                {earned && <p className="text-xs text-green-500 mt-1">✅</p>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}

// ───────────────────────────────────────────────────────────────
// Small helper components
// ───────────────────────────────────────────────────────────────

function StatBubble({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div className="text-center">
      <span className="text-xl">{icon}</span>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] opacity-50">{label}</p>
    </div>
  );
}
