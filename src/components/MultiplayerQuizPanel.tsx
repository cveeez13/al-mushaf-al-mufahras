'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { getTopicsMaster } from '@/lib/data';
import { TOPICS } from '@/lib/types';
import type { Verse } from '@/lib/types';
import {
  type GamePhase, type GameState, type GameSettings, type Player,
  type QuizQuestion, type GameMessage, type QuestionType,
  AVATARS, QUESTION_PRESETS, TIME_PRESETS, DEFAULT_SETTINGS,
  generateRoomCode, generateQuestions, calculatePoints,
  createInitialState, addPlayerToState, removePlayerFromState,
  processAnswer, getPlayerRanking,
  getChannel, broadcastMessage, closeChannel,
  createBot, simulateBotAnswer,
  loadLeaderboard, saveToLeaderboard, clearLeaderboard,
} from '@/lib/multiplayerQuiz';

interface MultiplayerQuizPanelProps {
  onGoToPage?: (page: number) => void;
}

// ───────────────────────────────────────────────────────────────
// Main Component
// ───────────────────────────────────────────────────────────────

export default function MultiplayerQuizPanel({ onGoToPage }: MultiplayerQuizPanelProps) {
  const { lang } = useI18n();
  const ar = lang === 'ar';

  // Core states
  const [screen, setScreen] = useState<'menu' | 'lobby' | 'game' | 'results'>('menu');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myId, setMyId] = useState('');
  const [myName, setMyName] = useState('');
  const [myAvatar, setMyAvatar] = useState(AVATARS[0]);
  const [joinCode, setJoinCode] = useState('');
  const [allVerses, setAllVerses] = useState<Verse[]>([]);
  const [error, setError] = useState('');

  // Game phase timers
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [countdown, setCountdown] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [answerTimeMs, setAnswerTimeMs] = useState(0);

  // Settings (host)
  const [settings, setSettings] = useState<GameSettings>({ ...DEFAULT_SETTINGS });

  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const questionStartRef = useRef(0);
  const botTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Load verses
  useEffect(() => {
    getTopicsMaster().then(d => {
      if (d?.verses) setAllVerses(d.verses);
    });
  }, []);

  // Generate player ID on mount
  useEffect(() => {
    setMyId(Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  }, []);

  // BroadcastChannel listener
  useEffect(() => {
    const ch = getChannel();
    const handler = (e: MessageEvent<GameMessage>) => {
      const msg = e.data;
      if (!gameState) return;
      // Extract roomCode from message (state-sync has it inside state)
      const msgRoom = msg.type === 'state-sync' ? msg.state.roomCode : msg.roomCode;
      if (msgRoom !== gameState.roomCode) return;

      switch (msg.type) {
        case 'join':
          setGameState(prev => prev ? addPlayerToState(prev, msg.player) : prev);
          break;
        case 'leave':
          setGameState(prev => prev ? removePlayerFromState(prev, msg.playerId) : prev);
          break;
        case 'state-sync':
          if (msg.state.roomCode === gameState.roomCode) {
            setGameState(msg.state);
            setPhase(msg.state.phase);
          }
          break;
        case 'answer':
          setGameState(prev => {
            if (!prev) return prev;
            return processAnswer(prev, msg.playerId, msg.questionId, msg.selectedIndex, msg.timeMs);
          });
          break;
        case 'start-game':
          // handled via state-sync
          break;
        case 'end-game':
          setPhase('results');
          setScreen('results');
          break;
      }
    };
    ch.onmessage = handler;
    return () => { ch.onmessage = null; };
  }, [gameState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      closeChannel();
      if (timerRef.current) clearInterval(timerRef.current);
      botTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  // ───── Room helpers ─────

  const createRoom = useCallback(() => {
    if (!myName.trim()) {
      setError(ar ? 'اكتب اسمك أولاً' : 'Enter your name first');
      return;
    }
    const code = generateRoomCode();
    const state = createInitialState(code, myId, myName.trim(), myAvatar);
    setGameState(state);
    setPhase('lobby');
    setScreen('lobby');
    setError('');
  }, [myId, myName, myAvatar, ar]);

  const joinRoom = useCallback(() => {
    if (!myName.trim()) {
      setError(ar ? 'اكتب اسمك أولاً' : 'Enter your name first');
      return;
    }
    if (joinCode.length !== 4) {
      setError(ar ? 'رمز الغرفة يجب أن يكون ٤ أرقام' : 'Room code must be 4 digits');
      return;
    }
    const player: Player = {
      id: myId,
      name: myName.trim(),
      avatar: myAvatar,
      score: 0,
      streak: 0,
      answers: [],
      isHost: false,
      joinedAt: Date.now(),
    };
    broadcastMessage({ type: 'join', player, roomCode: joinCode });
    // Create local state matching the room
    const state = createInitialState(joinCode, 'unknown-host', '', '');
    state.players = [player];
    setGameState(state);
    setPhase('lobby');
    setScreen('lobby');
    setError('');
  }, [myId, myName, myAvatar, joinCode, ar]);

  const addBot = useCallback(() => {
    if (!gameState) return;
    const botIdx = gameState.players.filter(p => p.id.startsWith('bot-')).length;
    if (gameState.players.length >= 8) return;
    const bot = createBot(botIdx);
    setGameState(prev => prev ? addPlayerToState(prev, bot) : prev);
  }, [gameState]);

  // ───── Game flow ─────

  const startGame = useCallback(() => {
    if (!gameState || allVerses.length === 0) return;
    const questions = generateQuestions(allVerses, settings, lang);
    const newState: GameState = {
      ...gameState,
      phase: 'countdown',
      questions,
      currentQuestion: 0,
      settings,
      players: gameState.players.map(p => ({ ...p, score: 0, streak: 0, answers: [] })),
    };
    setGameState(newState);
    setPhase('countdown');
    setScreen('game');
    broadcastMessage({ type: 'state-sync', state: newState });
    startCountdown(newState);
  }, [gameState, allVerses, settings, lang]);

  const startCountdown = useCallback((state: GameState) => {
    setCountdown(3);
    setSelectedAnswer(null);
    setAnswered(false);

    let c = 3;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(timerRef.current!);
        startQuestion(state);
      }
    }, 1000);
  }, []);

  const startQuestion = useCallback((state: GameState) => {
    const q = state.questions[state.currentQuestion];
    if (!q) return;

    setPhase('question');
    setTimeLeft(q.timeLimit);
    setSelectedAnswer(null);
    setAnswered(false);
    questionStartRef.current = Date.now();

    // Question timer
    let t = q.timeLimit;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      t--;
      setTimeLeft(t);
      if (t <= 0) {
        clearInterval(timerRef.current!);
        handleTimeout(state);
      }
    }, 1000);

    // Schedule bot answers
    botTimersRef.current.forEach(clearTimeout);
    botTimersRef.current = [];
    state.players.forEach(p => {
      if (!p.id.startsWith('bot-')) return;
      const { selectedIndex, timeMs } = simulateBotAnswer(q, state.settings.difficulty);
      const timer = setTimeout(() => {
        setGameState(prev => {
          if (!prev) return prev;
          return processAnswer(prev, p.id, state.currentQuestion, selectedIndex, timeMs);
        });
      }, timeMs);
      botTimersRef.current.push(timer);
    });
  }, []);

  const handleAnswer = useCallback((optionIdx: number) => {
    if (answered || !gameState) return;
    const timeMs = Date.now() - questionStartRef.current;
    setSelectedAnswer(optionIdx);
    setAnswered(true);
    setAnswerTimeMs(timeMs);

    const qIdx = gameState.currentQuestion;
    setGameState(prev => {
      if (!prev) return prev;
      return processAnswer(prev, myId, qIdx, optionIdx, timeMs);
    });

    broadcastMessage({
      type: 'answer',
      playerId: myId,
      questionId: qIdx,
      selectedIndex: optionIdx,
      timeMs,
      roomCode: gameState.roomCode,
    });
  }, [answered, gameState, myId]);

  const handleTimeout = useCallback((state: GameState) => {
    if (!answered) {
      // Auto-submit timeout
      const timeMs = state.questions[state.currentQuestion]?.timeLimit * 1000 || 15000;
      setGameState(prev => {
        if (!prev) return prev;
        return processAnswer(prev, myId, state.currentQuestion, -1, timeMs);
      });
    }
    showReveal(state);
  }, [answered, myId]);

  const showReveal = useCallback((state: GameState) => {
    setPhase('reveal');
    if (timerRef.current) clearInterval(timerRef.current);

    // Auto-advance after 3s
    setTimeout(() => {
      showLeaderboard(state);
    }, 3000);
  }, []);

  const showLeaderboard = useCallback((state: GameState) => {
    setPhase('leaderboard');

    // Auto-advance after 4s
    setTimeout(() => {
      nextQuestion(state);
    }, 4000);
  }, []);

  const nextQuestion = useCallback((state: GameState) => {
    const next = state.currentQuestion + 1;
    if (next >= state.questions.length) {
      finishGame(state);
      return;
    }
    setGameState(prev => {
      if (!prev) return prev;
      const updated = { ...prev, currentQuestion: next, phase: 'countdown' as GamePhase };
      broadcastMessage({ type: 'state-sync', state: updated });
      startCountdown(updated);
      return updated;
    });
  }, [startCountdown]);

  const finishGame = useCallback((state: GameState) => {
    setPhase('results');
    setScreen('results');
    if (timerRef.current) clearInterval(timerRef.current);
    botTimersRef.current.forEach(clearTimeout);

    // Save to leaderboard
    if (gameState) {
      gameState.players.forEach(p => {
        saveToLeaderboard({
          playerName: p.name,
          score: p.score,
          questionsCorrect: p.answers.filter(a => a.correct).length,
          questionsTotal: gameState.questions.length,
          date: new Date().toISOString(),
          roomCode: gameState.roomCode,
        });
      });
    }

    broadcastMessage({ type: 'end-game', roomCode: state.roomCode });
  }, [gameState]);

  const resetToMenu = useCallback(() => {
    setScreen('menu');
    setPhase('idle');
    setGameState(null);
    setSelectedAnswer(null);
    setAnswered(false);
    setError('');
    if (timerRef.current) clearInterval(timerRef.current);
    botTimersRef.current.forEach(clearTimeout);
  }, []);

  // ───── Current question helper ─────
  const currentQ: QuizQuestion | null = gameState?.questions[gameState.currentQuestion] ?? null;
  const ranking = gameState ? getPlayerRanking(gameState) : [];
  const me = gameState?.players.find(p => p.id === myId);
  const isHost = gameState?.hostId === myId;

  // ═══════════════════════════════════════════════════════════
  // MENU SCREEN
  // ═══════════════════════════════════════════════════════════
  if (screen === 'menu') {
    const leaderboard = loadLeaderboard();
    return (
      <div className="p-4 max-w-lg mx-auto">
        <h2 className="text-lg font-bold text-[var(--color-mushaf-gold)] mb-1 text-center font-[var(--font-arabic)]">
          {ar ? 'مسابقة جماعية' : 'Multiplayer Quiz'}
        </h2>
        <p className="text-xs text-center text-[var(--color-mushaf-text)]/50 mb-6">
          {ar ? 'تحدّى أصدقاءك في اختبار القرآن الكريم' : 'Challenge friends in a Quran quiz'}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-500 text-sm text-center">
            {error}
          </div>
        )}

        {/* Name & Avatar */}
        <div className="page-frame rounded-xl p-4 mb-4">
          <label className="block text-xs font-medium text-[var(--color-mushaf-text)]/60 mb-1">
            {ar ? 'اسمك' : 'Your Name'}
          </label>
          <input
            type="text"
            value={myName}
            onChange={e => setMyName(e.target.value.slice(0, 20))}
            placeholder={ar ? 'ادخل اسمك...' : 'Enter your name...'}
            className="w-full px-3 py-2 rounded-lg bg-[var(--color-mushaf-border)]/20 border border-[var(--color-mushaf-border)] text-sm font-[var(--font-arabic)] mb-3"
            maxLength={20}
          />
          <label className="block text-xs font-medium text-[var(--color-mushaf-text)]/60 mb-1">
            {ar ? 'الأيقونة' : 'Avatar'}
          </label>
          <div className="flex flex-wrap gap-2">
            {AVATARS.map(a => (
              <button
                key={a}
                onClick={() => setMyAvatar(a)}
                className={`w-11 h-11 rounded-lg text-lg flex items-center justify-center transition-all ${
                  myAvatar === a
                    ? 'bg-[var(--color-mushaf-gold)] scale-110 shadow-lg'
                    : 'bg-[var(--color-mushaf-border)]/20 hover:bg-[var(--color-mushaf-border)]/40'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Create / Join */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={createRoom}
            className="p-4 rounded-xl bg-[var(--color-mushaf-gold)] text-white font-bold text-sm hover:opacity-90 transition-opacity"
          >
            <div className="text-2xl mb-1">🏠</div>
            {ar ? 'إنشاء غرفة' : 'Create Room'}
          </button>
          <div className="page-frame rounded-xl p-4 flex flex-col">
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder={ar ? 'رمز الغرفة' : 'Room Code'}
              className="w-full px-3 py-1.5 rounded-lg bg-[var(--color-mushaf-border)]/20 border border-[var(--color-mushaf-border)] text-sm text-center font-mono mb-2"
              maxLength={4}
            />
            <button
              onClick={joinRoom}
              className="flex-1 rounded-lg bg-[var(--color-topic-blue)]/20 text-[var(--color-topic-blue)] font-bold text-sm py-1.5 hover:bg-[var(--color-topic-blue)]/30 transition-colors"
            >
              {ar ? 'الانضمام' : 'Join'}
            </button>
          </div>
        </div>

        {/* Weekly Leaderboard */}
        {leaderboard.length > 0 && (
          <div className="page-frame rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-[var(--color-mushaf-border)]/20 border-b border-[var(--color-mushaf-border)] flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                {ar ? '🏆 لوحة المتصدرين الأسبوعية' : '🏆 Weekly Leaderboard'}
              </h3>
              <button
                onClick={() => { clearLeaderboard(); setError(''); }}
                className="text-[10px] text-red-400 hover:text-red-500"
              >
                {ar ? 'مسح' : 'Clear'}
              </button>
            </div>
            <div className="divide-y divide-[var(--color-mushaf-border)]/20">
              {leaderboard.slice(0, 10).map((entry, i) => (
                <div key={i} className="px-4 py-2 flex items-center gap-3 text-sm">
                  <span className="w-6 text-center font-bold text-[var(--color-mushaf-gold)]">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                  </span>
                  <span className="flex-1 font-[var(--font-arabic)]">{entry.playerName}</span>
                  <span className="text-xs text-[var(--color-mushaf-text)]/50">
                    {entry.questionsCorrect}/{entry.questionsTotal}
                  </span>
                  <span className="font-bold text-[var(--color-mushaf-gold)]">{entry.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // LOBBY SCREEN
  // ═══════════════════════════════════════════════════════════
  if (screen === 'lobby' && gameState) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <button onClick={resetToMenu} className="text-sm text-[var(--color-mushaf-text)]/50 hover:text-[var(--color-mushaf-text)] mb-4">
          ← {ar ? 'رجوع' : 'Back'}
        </button>

        {/* Room code */}
        <div className="page-frame rounded-xl p-6 text-center mb-4">
          <div className="text-xs text-[var(--color-mushaf-text)]/50 mb-1">
            {ar ? 'رمز الغرفة' : 'Room Code'}
          </div>
          <div className="text-4xl font-mono font-bold text-[var(--color-mushaf-gold)] tracking-[0.3em]">
            {gameState.roomCode}
          </div>
          <div className="text-xs text-[var(--color-mushaf-text)]/40 mt-2">
            {ar ? 'شارك هذا الرمز مع أصدقائك' : 'Share this code with friends'}
          </div>
        </div>

        {/* Players */}
        <div className="page-frame rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">
              {ar ? 'اللاعبون' : 'Players'} ({gameState.players.length}/8)
            </h3>
            {isHost && gameState.players.length < 8 && (
              <button
                onClick={addBot}
                className="text-xs px-3 py-1 rounded-lg bg-[var(--color-topic-blue)]/20 text-[var(--color-topic-blue)] hover:bg-[var(--color-topic-blue)]/30 transition-colors"
              >
                🤖 {ar ? 'إضافة بوت' : 'Add Bot'}
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {gameState.players.map(p => (
              <div
                key={p.id}
                className={`flex items-center gap-2 p-2.5 rounded-lg ${
                  p.id === myId
                    ? 'bg-[var(--color-mushaf-gold)]/10 border border-[var(--color-mushaf-gold)]/30'
                    : 'bg-[var(--color-mushaf-border)]/10'
                }`}
              >
                <span className="text-xl">{p.avatar}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium font-[var(--font-arabic)] truncate">
                    {p.name}
                    {p.isHost && <span className="text-[10px] text-[var(--color-mushaf-gold)] mr-1"> 👑</span>}
                  </div>
                  {p.id.startsWith('bot-') && (
                    <div className="text-[10px] text-[var(--color-mushaf-text)]/40">🤖 Bot</div>
                  )}
                </div>
              </div>
            ))}
            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 2 - gameState.players.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="flex items-center justify-center p-2.5 rounded-lg border-2 border-dashed border-[var(--color-mushaf-border)]/30 text-[var(--color-mushaf-text)]/20 text-xs">
                {ar ? 'فارغ' : 'Empty'}
              </div>
            ))}
          </div>
        </div>

        {/* Settings (host only) */}
        {isHost && (
          <div className="page-frame rounded-xl p-4 mb-4">
            <h3 className="font-semibold text-sm mb-3">
              {ar ? 'إعدادات اللعبة' : 'Game Settings'}
            </h3>

            {/* Question count */}
            <div className="mb-3">
              <label className="text-xs text-[var(--color-mushaf-text)]/60 mb-1 block">
                {ar ? 'عدد الأسئلة' : 'Questions'}
              </label>
              <div className="flex gap-2">
                {QUESTION_PRESETS.map(p => (
                  <button
                    key={p.count}
                    onClick={() => setSettings(s => ({ ...s, questionCount: p.count }))}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      settings.questionCount === p.count
                        ? 'bg-[var(--color-mushaf-gold)] text-white'
                        : 'bg-[var(--color-mushaf-border)]/20 hover:bg-[var(--color-mushaf-border)]/40'
                    }`}
                  >
                    {ar ? p.label_ar : p.label_en}
                  </button>
                ))}
              </div>
            </div>

            {/* Time per question */}
            <div className="mb-3">
              <label className="text-xs text-[var(--color-mushaf-text)]/60 mb-1 block">
                {ar ? 'الوقت لكل سؤال' : 'Time per Question'}
              </label>
              <div className="flex gap-2">
                {TIME_PRESETS.map(t => (
                  <button
                    key={t.seconds}
                    onClick={() => setSettings(s => ({ ...s, timePerQuestion: t.seconds }))}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      settings.timePerQuestion === t.seconds
                        ? 'bg-[var(--color-mushaf-gold)] text-white'
                        : 'bg-[var(--color-mushaf-border)]/20 hover:bg-[var(--color-mushaf-border)]/40'
                    }`}
                  >
                    {ar ? t.label_ar : t.label_en}
                  </button>
                ))}
              </div>
            </div>

            {/* Question types */}
            <div className="mb-3">
              <label className="text-xs text-[var(--color-mushaf-text)]/60 mb-1 block">
                {ar ? 'أنواع الأسئلة' : 'Question Types'}
              </label>
              <div className="flex gap-2 flex-wrap">
                {([
                  { type: 'complete' as QuestionType, icon: '✍️', ar: 'أكمل الآية', en: 'Complete Verse' },
                  { type: 'surah' as QuestionType, icon: '📖', ar: 'حدد السورة', en: 'Identify Surah' },
                  { type: 'topic' as QuestionType, icon: '🏷️', ar: 'حدد الموضوع', en: 'Identify Topic' },
                  { type: 'order' as QuestionType, icon: '🔢', ar: 'ترتيب الآية', en: 'Verse Order' },
                ]).map(qt => {
                  const active = settings.questionTypes.includes(qt.type);
                  return (
                    <button
                      key={qt.type}
                      onClick={() => {
                        setSettings(s => {
                          const types = active
                            ? s.questionTypes.filter(t => t !== qt.type)
                            : [...s.questionTypes, qt.type];
                          return { ...s, questionTypes: types.length > 0 ? types : [qt.type] };
                        });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                        active
                          ? 'bg-[var(--color-mushaf-gold)] text-white'
                          : 'bg-[var(--color-mushaf-border)]/20 hover:bg-[var(--color-mushaf-border)]/40'
                      }`}
                    >
                      {qt.icon} {ar ? qt.ar : qt.en}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="text-xs text-[var(--color-mushaf-text)]/60 mb-1 block">
                {ar ? 'الصعوبة (للبوتات)' : 'Difficulty (Bots)'}
              </label>
              <div className="flex gap-2">
                {([
                  { d: 'easy' as const, ar: 'سهل', en: 'Easy' },
                  { d: 'medium' as const, ar: 'متوسط', en: 'Medium' },
                  { d: 'hard' as const, ar: 'صعب', en: 'Hard' },
                ]).map(lvl => (
                  <button
                    key={lvl.d}
                    onClick={() => setSettings(s => ({ ...s, difficulty: lvl.d }))}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      settings.difficulty === lvl.d
                        ? 'bg-[var(--color-mushaf-gold)] text-white'
                        : 'bg-[var(--color-mushaf-border)]/20 hover:bg-[var(--color-mushaf-border)]/40'
                    }`}
                  >
                    {ar ? lvl.ar : lvl.en}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Start button */}
        {isHost && (
          <button
            onClick={startGame}
            disabled={gameState.players.length < 2 || allVerses.length === 0}
            className="w-full py-3 rounded-xl bg-[var(--color-topic-green)] text-white font-bold text-base hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            {allVerses.length === 0
              ? (ar ? 'جارٍ تحميل الآيات...' : 'Loading verses...')
              : gameState.players.length < 2
                ? (ar ? 'أضف لاعبًا آخر على الأقل' : 'Add at least one more player')
                : (ar ? '🚀 ابدأ المسابقة!' : '🚀 Start Quiz!')}
          </button>
        )}

        {!isHost && (
          <div className="text-center text-sm text-[var(--color-mushaf-text)]/50 py-4">
            {ar ? 'في انتظار بدء المسابقة من المضيف...' : 'Waiting for the host to start...'}
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // GAME SCREEN
  // ═══════════════════════════════════════════════════════════
  if (screen === 'game' && gameState) {
    const qNum = gameState.currentQuestion + 1;
    const totalQ = gameState.questions.length;

    // Countdown overlay
    if (phase === 'countdown') {
      return (
        <div className="p-4 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-sm text-[var(--color-mushaf-text)]/50 mb-2">
            {ar ? `سؤال ${qNum} من ${totalQ}` : `Question ${qNum} of ${totalQ}`}
          </div>
          <div
            className="text-8xl font-bold text-[var(--color-mushaf-gold)] animate-pulse"
            role="timer"
            aria-label={`${countdown}`}
          >
            {countdown}
          </div>
          <div className="text-xs text-[var(--color-mushaf-text)]/40 mt-4">
            {ar ? 'استعد...' : 'Get ready...'}
          </div>
        </div>
      );
    }

    // Question phase
    if ((phase === 'question' || phase === 'reveal') && currentQ) {
      const isReveal = phase === 'reveal';
      const typeLabels: Record<QuestionType, { ar: string; en: string; icon: string }> = {
        complete: { ar: 'أكمل الآية', en: 'Complete the Verse', icon: '✍️' },
        surah: { ar: 'حدد السورة', en: 'Identify the Surah', icon: '📖' },
        topic: { ar: 'حدد الموضوع', en: 'Identify the Topic', icon: '🏷️' },
        order: { ar: 'حدد موضع الآية', en: 'Identify the Verse', icon: '🔢' },
      };
      const typeLabel = typeLabels[currentQ.type];

      // Option colors (Kahoot-style)
      const optionColors = [
        'var(--color-topic-red)',
        'var(--color-topic-blue)',
        'var(--color-topic-orange)',
        'var(--color-topic-green)',
      ];

      const myCurrentAnswer = me?.answers.find(a => a.questionId === gameState.currentQuestion);

      return (
        <div className="p-4 max-w-2xl mx-auto">
          {/* Header: progress + timer */}
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-[var(--color-mushaf-text)]/50">
              {ar ? `${qNum}/${totalQ}` : `${qNum}/${totalQ}`}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-mushaf-text)]/50">
                {typeLabel.icon} {ar ? typeLabel.ar : typeLabel.en}
              </span>
            </div>
            <div className={`text-lg font-bold font-mono ${
              timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-[var(--color-mushaf-gold)]'
            }`}>
              {isReveal ? '✓' : `${timeLeft}s`}
            </div>
          </div>

          {/* Timer bar */}
          {!isReveal && (
            <div className="h-1.5 bg-[var(--color-mushaf-border)]/20 rounded-full mb-4 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-linear"
                style={{
                  width: `${(timeLeft / currentQ.timeLimit) * 100}%`,
                  backgroundColor: timeLeft <= 5 ? 'var(--color-topic-red)' : 'var(--color-mushaf-gold)',
                }}
              />
            </div>
          )}

          {/* Question prompt */}
          <div
            className="page-frame rounded-xl p-5 mb-4 text-center"
            style={{ borderColor: currentQ.topicColor + '40' }}
          >
            <div className="font-[var(--font-arabic)] text-lg leading-loose" dir="rtl">
              {currentQ.prompt}
            </div>
            {currentQ.type === 'topic' && (
              <div className="mt-2 text-xs text-[var(--color-mushaf-text)]/40">
                {ar ? 'ما موضوع هذه الآية؟' : 'What is the topic of this verse?'}
              </div>
            )}
          </div>

          {/* Options grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {currentQ.options.map((opt, i) => {
              const isCorrect = i === currentQ.correctIndex;
              const isSelected = selectedAnswer === i;
              let bg = `${optionColors[i]}22`;
              let border = `${optionColors[i]}44`;
              let textColor = '';

              if (isReveal) {
                if (isCorrect) {
                  bg = 'var(--color-topic-green)';
                  border = 'var(--color-topic-green)';
                  textColor = 'white';
                } else if (isSelected && !isCorrect) {
                  bg = 'var(--color-topic-red)';
                  border = 'var(--color-topic-red)';
                  textColor = 'white';
                } else {
                  bg = 'var(--color-mushaf-border)';
                  border = 'var(--color-mushaf-border)';
                  textColor = 'var(--color-mushaf-text)';
                }
              } else if (isSelected) {
                bg = optionColors[i];
                border = optionColors[i];
                textColor = 'white';
              }

              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={answered || isReveal}
                  className="p-4 rounded-xl font-[var(--font-arabic)] text-sm leading-relaxed text-start transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-default"
                  style={{
                    backgroundColor: bg,
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    borderColor: border,
                    color: textColor || undefined,
                    opacity: isReveal && !isCorrect && !isSelected ? 0.4 : 1,
                  }}
                  dir="rtl"
                >
                  <span className="text-xs opacity-60 mr-1">
                    {String.fromCharCode(0x0623 + i) /* أ ب ت ث */}
                  </span>
                  {' '}{opt}
                  {isReveal && isCorrect && ' ✓'}
                  {isReveal && isSelected && !isCorrect && ' ✗'}
                </button>
              );
            })}
          </div>

          {/* Points earned banner */}
          {isReveal && myCurrentAnswer && (
            <div className={`text-center py-2 rounded-lg text-sm font-bold ${
              myCurrentAnswer.correct
                ? 'bg-[var(--color-topic-green)]/10 text-[var(--color-topic-green)]'
                : 'bg-[var(--color-topic-red)]/10 text-[var(--color-topic-red)]'
            }`}>
              {myCurrentAnswer.correct
                ? (ar ? `🎉 +${myCurrentAnswer.points} نقطة!` : `🎉 +${myCurrentAnswer.points} points!`)
                : (ar ? '😔 لا نقاط' : '😔 No points')}
            </div>
          )}

          {/* Live mini-ranking */}
          <div className="mt-3 flex items-center justify-center gap-4 text-xs text-[var(--color-mushaf-text)]/50">
            {ranking.slice(0, 3).map((p, i) => (
              <span key={p.id} className={p.id === myId ? 'font-bold text-[var(--color-mushaf-gold)]' : ''}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {p.avatar} {p.score}
              </span>
            ))}
          </div>
        </div>
      );
    }

    // Leaderboard phase (between questions)
    if (phase === 'leaderboard') {
      return (
        <div className="p-4 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh]">
          <h3 className="text-lg font-bold text-[var(--color-mushaf-gold)] mb-4">
            {ar ? 'الترتيب الحالي' : 'Current Standings'}
          </h3>
          <div className="w-full page-frame rounded-xl overflow-hidden">
            {ranking.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  i < ranking.length - 1 ? 'border-b border-[var(--color-mushaf-border)]/20' : ''
                } ${p.id === myId ? 'bg-[var(--color-mushaf-gold)]/10' : ''}`}
              >
                <span className="w-8 text-center text-lg">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                </span>
                <span className="text-xl">{p.avatar}</span>
                <span className="flex-1 font-[var(--font-arabic)] text-sm font-medium truncate">
                  {p.name} {p.id === myId ? (ar ? '(أنت)' : '(You)') : ''}
                </span>
                <div className="text-left">
                  <div className="font-bold text-[var(--color-mushaf-gold)]">{p.score}</div>
                  <div className="text-[10px] text-[var(--color-mushaf-text)]/40">
                    {p.streak > 0 && `🔥${p.streak}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-[var(--color-mushaf-text)]/40 animate-pulse">
            {ar ? 'السؤال التالي قادم...' : 'Next question coming up...'}
          </div>
        </div>
      );
    }
  }

  // ═══════════════════════════════════════════════════════════
  // RESULTS SCREEN
  // ═══════════════════════════════════════════════════════════
  if (screen === 'results' && gameState) {
    const winner = ranking[0];
    const myRank = ranking.findIndex(p => p.id === myId) + 1;
    const myCorrect = me?.answers.filter(a => a.correct).length ?? 0;
    const totalQ = gameState.questions.length;
    const pct = totalQ > 0 ? Math.round((myCorrect / totalQ) * 100) : 0;

    return (
      <div className="p-4 max-w-lg mx-auto">
        {/* Winner */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">{winner?.avatar ?? '🏆'}</div>
          <div className="text-2xl font-bold text-[var(--color-mushaf-gold)] font-[var(--font-arabic)]">
            {winner?.name ?? '—'}
          </div>
          <div className="text-sm text-[var(--color-mushaf-text)]/50">
            {ar ? 'الفائز!' : 'Winner!'} — {winner?.score ?? 0} {ar ? 'نقطة' : 'pts'}
          </div>
        </div>

        {/* Full rankings */}
        <div className="page-frame rounded-xl overflow-hidden mb-4">
          {ranking.map((p, i) => {
            const pc = p.answers.filter(a => a.correct).length;
            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  i < ranking.length - 1 ? 'border-b border-[var(--color-mushaf-border)]/20' : ''
                } ${p.id === myId ? 'bg-[var(--color-mushaf-gold)]/10' : ''}`}
              >
                <span className="w-8 text-center text-lg">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                </span>
                <span className="text-xl">{p.avatar}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium font-[var(--font-arabic)] truncate">
                    {p.name} {p.id === myId ? (ar ? '(أنت)' : '(You)') : ''}
                  </div>
                  <div className="text-[10px] text-[var(--color-mushaf-text)]/40">
                    {pc}/{totalQ} {ar ? 'صحيحة' : 'correct'} | 🔥 {ar ? 'أعلى سلسلة' : 'Best streak'}: {Math.max(0, ...p.answers.reduce<number[]>((acc, a) => {
                      if (a.correct) acc.push((acc.at(-1) ?? 0) + 1);
                      else acc.push(0);
                      return acc;
                    }, []))}
                  </div>
                </div>
                <div className="font-bold text-[var(--color-mushaf-gold)]">{p.score}</div>
              </div>
            );
          })}
        </div>

        {/* My stats card */}
        <div className="page-frame rounded-xl p-4 mb-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xl font-bold text-[var(--color-mushaf-gold)]">#{myRank}</div>
              <div className="text-[10px] text-[var(--color-mushaf-text)]/50">{ar ? 'ترتيبك' : 'Your Rank'}</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{
                color: pct >= 80 ? 'var(--color-topic-green)' : pct >= 50 ? 'var(--color-topic-orange)' : 'var(--color-topic-red)'
              }}>
                {pct}%
              </div>
              <div className="text-[10px] text-[var(--color-mushaf-text)]/50">{ar ? 'الدقة' : 'Accuracy'}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[var(--color-mushaf-gold)]">{me?.score ?? 0}</div>
              <div className="text-[10px] text-[var(--color-mushaf-text)]/50">{ar ? 'النقاط' : 'Points'}</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={resetToMenu}
            className="flex-1 py-3 rounded-xl bg-[var(--color-mushaf-gold)] text-white font-bold hover:opacity-90 transition-opacity"
          >
            {ar ? 'القائمة الرئيسية' : 'Main Menu'}
          </button>
          {isHost && (
            <button
              onClick={() => {
                setScreen('lobby');
                setPhase('lobby');
                if (gameState) {
                  setGameState({
                    ...gameState,
                    phase: 'lobby',
                    questions: [],
                    currentQuestion: 0,
                    players: gameState.players.map(p => ({
                      ...p, score: 0, streak: 0, answers: [],
                    })),
                  });
                }
              }}
              className="flex-1 py-3 rounded-xl border-2 border-[var(--color-mushaf-gold)] text-[var(--color-mushaf-gold)] font-bold hover:bg-[var(--color-mushaf-gold)]/10 transition-colors"
            >
              {ar ? 'العب مرة أخرى' : 'Play Again'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}
