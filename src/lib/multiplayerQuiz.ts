/**
 * Multiplayer Quran Quiz Engine — Kahoot-style Real-Time Game
 *
 * Architecture:
 * - BroadcastChannel API for real-time cross-tab communication (same device)
 * - Room codes for joining games
 * - Game state machine: lobby → countdown → question → scoring → results
 * - 4 question types: complete-verse, identify-surah, identify-topic, verse-order
 * - Countdown timers with synchronized scoring (faster = more points)
 * - Weekly leaderboard persisted in localStorage
 *
 * Since this is a static PWA without a backend, multiplayer
 * works via BroadcastChannel (cross-tab on same browser/device).
 * Room codes are 4-digit pins for the lobby experience.
 */

import type { Verse } from './types';
import { TOPICS, SURAH_NAMES } from './types';

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

export type QuestionType = 'complete' | 'surah' | 'topic' | 'order';

export interface QuizQuestion {
  id: number;
  type: QuestionType;
  prompt: string;          // Arabic text shown as question
  options: string[];       // 4 multiple-choice options
  correctIndex: number;    // 0-3
  verseKey: string;        // reference verse
  topicColor: string;      // for auto-classification
  timeLimit: number;       // seconds
}

export interface Player {
  id: string;
  name: string;
  avatar: string;          // emoji avatar
  score: number;
  streak: number;
  answers: PlayerAnswer[];
  isHost: boolean;
  joinedAt: number;
}

export interface PlayerAnswer {
  questionId: number;
  selectedIndex: number;   // -1 = timeout
  correct: boolean;
  timeMs: number;          // time taken in ms
  points: number;
}

export type GamePhase =
  | 'idle'       // no game
  | 'lobby'      // waiting for players
  | 'countdown'  // 3-2-1 before question
  | 'question'   // answering phase
  | 'reveal'     // showing correct answer + scores
  | 'leaderboard'// between-question standings
  | 'results';   // final results

export interface GameState {
  roomCode: string;
  phase: GamePhase;
  hostId: string;
  players: Player[];
  questions: QuizQuestion[];
  currentQuestion: number;
  questionStartTime: number;   // timestamp when question started
  settings: GameSettings;
}

export interface GameSettings {
  questionCount: number;       // 5, 10, 15, 20
  timePerQuestion: number;     // seconds: 10, 15, 20, 30
  questionTypes: QuestionType[]; // which types to include
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface LeaderboardEntry {
  playerName: string;
  score: number;
  questionsCorrect: number;
  questionsTotal: number;
  date: string;
  roomCode: string;
}

// ───────────────────────────────────────────────────────────────
// BroadcastChannel Messages
// ───────────────────────────────────────────────────────────────

export type GameMessage =
  | { type: 'join'; player: Player; roomCode: string }
  | { type: 'leave'; playerId: string; roomCode: string }
  | { type: 'state-sync'; state: GameState }
  | { type: 'start-game'; roomCode: string }
  | { type: 'answer'; playerId: string; questionId: number; selectedIndex: number; timeMs: number; roomCode: string }
  | { type: 'next-question'; roomCode: string }
  | { type: 'end-game'; roomCode: string };

// ───────────────────────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────────────────────

const CHANNEL_NAME = 'mushaf-quiz';
const LEADERBOARD_KEY = 'mushaf-quiz-leaderboard';
const MAX_LEADERBOARD = 50;

export const AVATARS = ['🧑‍🎓', '👨‍🏫', '👩‍🎓', '🧕', '👳', '🕌', '📖', '⭐', '🌙', '🌟', '💎', '🏆'];

export const QUESTION_PRESETS = [
  { count: 5,  label_ar: '٥ أسئلة', label_en: '5 Questions' },
  { count: 10, label_ar: '١٠ أسئلة', label_en: '10 Questions' },
  { count: 15, label_ar: '١٥ سؤال', label_en: '15 Questions' },
  { count: 20, label_ar: '٢٠ سؤال', label_en: '20 Questions' },
] as const;

export const TIME_PRESETS = [
  { seconds: 10, label_ar: '١٠ ثوانٍ', label_en: '10s' },
  { seconds: 15, label_ar: '١٥ ثانية', label_en: '15s' },
  { seconds: 20, label_ar: '٢٠ ثانية', label_en: '20s' },
  { seconds: 30, label_ar: '٣٠ ثانية', label_en: '30s' },
] as const;

export const DEFAULT_SETTINGS: GameSettings = {
  questionCount: 10,
  timePerQuestion: 15,
  questionTypes: ['complete', 'surah', 'topic', 'order'],
  difficulty: 'medium',
};

// ───────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function generateRoomCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[], count: number): T[] {
  return shuffleArray(arr).slice(0, count);
}

function truncateText(text: string, maxWords: number): string {
  const words = text.split(' ');
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + ' …';
}

// ───────────────────────────────────────────────────────────────
// Question Generation
// ───────────────────────────────────────────────────────────────

/**
 * Generate a "complete the verse" question.
 * Shows first ~40% of words, 4 options for the continuation.
 */
function generateCompleteQuestion(
  verse: Verse,
  allVerses: Verse[],
  id: number,
  timeLimit: number,
): QuizQuestion {
  const words = verse.text.split(' ');
  const showCount = Math.max(2, Math.ceil(words.length * 0.4));
  const prompt = words.slice(0, showCount).join(' ') + ' …';
  const correctAnswer = truncateText(words.slice(showCount).join(' '), 8);

  // Get 3 wrong answers from other verses
  const otherVerses = allVerses.filter(v => v.verse_key !== verse.verse_key && v.text.split(' ').length >= 4);
  const wrongs = pickRandom(otherVerses, 3).map(v => {
    const w = v.text.split(' ');
    const s = Math.max(2, Math.ceil(w.length * 0.4));
    return truncateText(w.slice(s).join(' '), 8);
  });

  const options = shuffleArray([correctAnswer, ...wrongs]);
  return {
    id, type: 'complete', prompt, options,
    correctIndex: options.indexOf(correctAnswer),
    verseKey: verse.verse_key,
    topicColor: verse.topic.color,
    timeLimit,
  };
}

/**
 * Generate "identify the surah" question.
 * Shows a verse snippet, 4 surah name options.
 */
function generateSurahQuestion(
  verse: Verse,
  allVerses: Verse[],
  id: number,
  timeLimit: number,
): QuizQuestion {
  const prompt = truncateText(verse.text, 10);
  const correctAnswer = SURAH_NAMES[verse.surah] || `${verse.surah}`;

  // Get 3 different surah names
  const otherSurahs = allVerses
    .filter(v => v.surah !== verse.surah)
    .map(v => v.surah);
  const uniqueSurahs = [...new Set(otherSurahs)];
  const wrongSurahs = pickRandom(uniqueSurahs, 3).map(s => SURAH_NAMES[s] || `${s}`);

  const options = shuffleArray([correctAnswer, ...wrongSurahs]);
  return {
    id, type: 'surah', prompt, options,
    correctIndex: options.indexOf(correctAnswer),
    verseKey: verse.verse_key,
    topicColor: verse.topic.color,
    timeLimit,
  };
}

/**
 * Generate "identify the topic" question.
 * Shows a verse, 4 topic color/name options.
 */
function generateTopicQuestion(
  verse: Verse,
  id: number,
  timeLimit: number,
  lang: string,
): QuizQuestion {
  const prompt = truncateText(verse.text, 12);
  const correctTopic = TOPICS[verse.topic.id];
  const correctAnswer = lang === 'ar' ? correctTopic.name_ar : correctTopic.name_en;

  // Get 3 different topics
  const otherTopics = Object.values(TOPICS).filter(t => t.id !== verse.topic.id);
  const wrongTopics = pickRandom(otherTopics, 3).map(
    t => lang === 'ar' ? t.name_ar : t.name_en
  );

  const options = shuffleArray([correctAnswer, ...wrongTopics]);
  return {
    id, type: 'topic', prompt, options,
    correctIndex: options.indexOf(correctAnswer),
    verseKey: verse.verse_key,
    topicColor: verse.topic.color,
    timeLimit,
  };
}

/**
 * Generate "verse order" question.
 * Shows a verse, asks which ayah number it is (4 options).
 */
function generateOrderQuestion(
  verse: Verse,
  allVerses: Verse[],
  id: number,
  timeLimit: number,
): QuizQuestion {
  const prompt = truncateText(verse.text, 10);
  const correctAnswer = `${SURAH_NAMES[verse.surah]} : ${verse.ayah}`;

  // Get 3 wrong verse references from same surah if possible
  const sameSurah = allVerses.filter(
    v => v.surah === verse.surah && v.ayah !== verse.ayah
  );
  const pool = sameSurah.length >= 3 ? sameSurah : allVerses.filter(v => v.verse_key !== verse.verse_key);
  const wrongs = pickRandom(pool, 3).map(v => `${SURAH_NAMES[v.surah]} : ${v.ayah}`);

  const options = shuffleArray([correctAnswer, ...wrongs]);
  return {
    id, type: 'order', prompt, options,
    correctIndex: options.indexOf(correctAnswer),
    verseKey: verse.verse_key,
    topicColor: verse.topic.color,
    timeLimit,
  };
}

/**
 * Generate a full question set for a game session.
 */
export function generateQuestions(
  allVerses: Verse[],
  settings: GameSettings,
  lang: string = 'ar',
): QuizQuestion[] {
  // Filter verses with enough text (>3 words)
  const eligible = allVerses.filter(v => v.text.split(' ').length >= 4);
  const selected = pickRandom(eligible, settings.questionCount);
  const types = settings.questionTypes;

  return selected.map((verse, i) => {
    const type = types[i % types.length];
    switch (type) {
      case 'complete':
        return generateCompleteQuestion(verse, eligible, i, settings.timePerQuestion);
      case 'surah':
        return generateSurahQuestion(verse, eligible, i, settings.timePerQuestion);
      case 'topic':
        return generateTopicQuestion(verse, i, settings.timePerQuestion, lang);
      case 'order':
        return generateOrderQuestion(verse, eligible, i, settings.timePerQuestion);
      default:
        return generateCompleteQuestion(verse, eligible, i, settings.timePerQuestion);
    }
  });
}

// ───────────────────────────────────────────────────────────────
// Scoring
// ───────────────────────────────────────────────────────────────

/**
 * Calculate points for an answer.
 * Faster correct answers earn more points. Max 1000 per question.
 * Streak bonus: consecutive correct answers multiply score.
 */
export function calculatePoints(
  correct: boolean,
  timeMs: number,
  timeLimitMs: number,
  streak: number,
): number {
  if (!correct) return 0;

  // Base: 500-1000 scaled by speed
  const timeFraction = Math.max(0, 1 - timeMs / timeLimitMs);
  const basePoints = Math.round(500 + 500 * timeFraction);

  // Streak bonus: +10% per consecutive correct, max +50%
  const streakMultiplier = 1 + Math.min(streak, 5) * 0.1;

  return Math.round(basePoints * streakMultiplier);
}

// ───────────────────────────────────────────────────────────────
// Game State Management
// ───────────────────────────────────────────────────────────────

export function createInitialState(
  roomCode: string,
  hostId: string,
  hostName: string,
  hostAvatar: string,
): GameState {
  return {
    roomCode,
    phase: 'lobby',
    hostId,
    players: [{
      id: hostId,
      name: hostName,
      avatar: hostAvatar,
      score: 0,
      streak: 0,
      answers: [],
      isHost: true,
      joinedAt: Date.now(),
    }],
    questions: [],
    currentQuestion: 0,
    questionStartTime: 0,
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function addPlayerToState(state: GameState, player: Player): GameState {
  if (state.players.find(p => p.id === player.id)) return state;
  if (state.players.length >= 8) return state; // max 8 players
  return { ...state, players: [...state.players, player] };
}

export function removePlayerFromState(state: GameState, playerId: string): GameState {
  return { ...state, players: state.players.filter(p => p.id !== playerId) };
}

export function processAnswer(
  state: GameState,
  playerId: string,
  questionId: number,
  selectedIndex: number,
  timeMs: number,
): GameState {
  const question = state.questions[questionId];
  if (!question) return state;

  const correct = selectedIndex === question.correctIndex;
  const players = state.players.map(p => {
    if (p.id !== playerId) return p;

    // Check for duplicates
    if (p.answers.find(a => a.questionId === questionId)) return p;

    const newStreak = correct ? p.streak + 1 : 0;
    const points = calculatePoints(correct, timeMs, question.timeLimit * 1000, p.streak);

    return {
      ...p,
      score: p.score + points,
      streak: newStreak,
      answers: [...p.answers, { questionId, selectedIndex, correct, timeMs, points }],
    };
  });

  return { ...state, players };
}

export function getPlayerRanking(state: GameState): Player[] {
  return [...state.players].sort((a, b) => b.score - a.score);
}

// ───────────────────────────────────────────────────────────────
// BroadcastChannel Manager
// ───────────────────────────────────────────────────────────────

let channel: BroadcastChannel | null = null;

export function getChannel(): BroadcastChannel {
  if (typeof window === 'undefined') return {} as BroadcastChannel;
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

export function broadcastMessage(msg: GameMessage): void {
  try {
    getChannel().postMessage(msg);
  } catch { /* channel closed */ }
}

export function closeChannel(): void {
  if (channel) {
    channel.close();
    channel = null;
  }
}

// ───────────────────────────────────────────────────────────────
// AI Bot Players (for solo practice)
// ───────────────────────────────────────────────────────────────

const BOT_NAMES = [
  { name: 'حافظ', avatar: '🤖' },
  { name: 'عائشة', avatar: '🧕' },
  { name: 'أسامة', avatar: '👳' },
  { name: 'مريم', avatar: '🌙' },
  { name: 'يوسف', avatar: '⭐' },
];

export function createBot(index: number): Player {
  const bot = BOT_NAMES[index % BOT_NAMES.length];
  return {
    id: `bot-${index}-${generateId()}`,
    name: bot.name,
    avatar: bot.avatar,
    score: 0,
    streak: 0,
    answers: [],
    isHost: false,
    joinedAt: Date.now(),
  };
}

/**
 * Simulate a bot answer for a question.
 * Difficulty affects accuracy and speed.
 */
export function simulateBotAnswer(
  question: QuizQuestion,
  difficulty: 'easy' | 'medium' | 'hard',
): { selectedIndex: number; timeMs: number } {
  const accuracyMap = { easy: 0.5, medium: 0.7, hard: 0.85 };
  const speedMap = { easy: [4000, 10000], medium: [2000, 7000], hard: [1000, 4000] };

  const correct = Math.random() < accuracyMap[difficulty];
  const [minMs, maxMs] = speedMap[difficulty];
  const timeMs = Math.floor(minMs + Math.random() * (maxMs - minMs));

  if (correct) {
    return { selectedIndex: question.correctIndex, timeMs };
  } else {
    const wrongIndices = [0, 1, 2, 3].filter(i => i !== question.correctIndex);
    return {
      selectedIndex: wrongIndices[Math.floor(Math.random() * wrongIndices.length)],
      timeMs,
    };
  }
}

// ───────────────────────────────────────────────────────────────
// Leaderboard (Weekly)
// ───────────────────────────────────────────────────────────────

function getWeekKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const week = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function loadLeaderboard(): LeaderboardEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return [];
    const all: (LeaderboardEntry & { week?: string })[] = JSON.parse(raw);
    // Keep only current week
    const currentWeek = getWeekKey();
    return all.filter(e => e.week === currentWeek).sort((a, b) => b.score - a.score);
  } catch {
    return [];
  }
}

export function saveToLeaderboard(entry: LeaderboardEntry): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    const all: (LeaderboardEntry & { week: string })[] = raw ? JSON.parse(raw) : [];
    const week = getWeekKey();
    all.push({ ...entry, week });
    // Keep last MAX_LEADERBOARD entries
    const trimmed = all.slice(-MAX_LEADERBOARD);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(trimmed));
  } catch { /* quota exceeded */ }
}

export function clearLeaderboard(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LEADERBOARD_KEY);
}
