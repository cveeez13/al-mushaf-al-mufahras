import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateRoomCode, generateQuestions, calculatePoints,
  createInitialState, addPlayerToState, removePlayerFromState,
  processAnswer, getPlayerRanking,
  createBot, simulateBotAnswer,
  saveToLeaderboard, loadLeaderboard, clearLeaderboard,
  DEFAULT_SETTINGS, AVATARS, QUESTION_PRESETS, TIME_PRESETS,
  type GameState, type GameSettings, type Player, type QuizQuestion,
} from '@/lib/multiplayerQuiz';
import type { Verse } from '@/lib/types';

// ─── Mock Verses ─────────────────────────────────────────────

function makeMockVerses(count: number = 30): Verse[] {
  const topics = [
    { id: 1, color: 'red', hex: '#E74C3C', name_ar: 'أحكام', name_en: 'Rulings' },
    { id: 2, color: 'green', hex: '#27AE60', name_ar: 'قصص', name_en: 'Stories' },
    { id: 3, color: 'blue', hex: '#3498DB', name_ar: 'عقيدة', name_en: 'Creed' },
    { id: 4, color: 'orange', hex: '#E67E22', name_ar: 'آخرة', name_en: 'Hereafter' },
  ];
  return Array.from({ length: count }, (_, i) => ({
    surah: (i % 10) + 1,
    ayah: i + 1,
    page: Math.ceil((i + 1) / 15),
    verse_key: `${(i % 10) + 1}:${i + 1}`,
    text: `بسم الله الرحمن الرحيم هذا نص آية اختبارية رقم ${i + 1} في هذه المجموعة التجريبية`,
    topic: topics[i % topics.length],
    confidence: '0.9',
    method: 'test',
  }));
}

const MOCK_VERSES = makeMockVerses(30);

beforeEach(() => {
  localStorage.clear();
});

// ─── Room Code Generation ────────────────────────────────────

describe('generateRoomCode', () => {
  it('generates 4-digit string', () => {
    const code = generateRoomCode();
    expect(code).toMatch(/^\d{4}$/);
  });

  it('generates different codes on successive calls', () => {
    const codes = new Set(Array.from({ length: 20 }, generateRoomCode));
    expect(codes.size).toBeGreaterThan(1);
  });
});

// ─── Question Generation ─────────────────────────────────────

describe('generateQuestions', () => {
  it('generates correct number of questions', () => {
    const questions = generateQuestions(MOCK_VERSES, { ...DEFAULT_SETTINGS, questionCount: 5 });
    expect(questions).toHaveLength(5);
  });

  it('generates 10 questions by default', () => {
    const questions = generateQuestions(MOCK_VERSES, DEFAULT_SETTINGS);
    expect(questions).toHaveLength(10);
  });

  it('each question has 4 options', () => {
    const questions = generateQuestions(MOCK_VERSES, { ...DEFAULT_SETTINGS, questionCount: 5 });
    for (const q of questions) {
      expect(q.options).toHaveLength(4);
    }
  });

  it('correctIndex is within bounds', () => {
    const questions = generateQuestions(MOCK_VERSES, DEFAULT_SETTINGS);
    for (const q of questions) {
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(4);
    }
  });

  it('each question has a valid type field', () => {
    const questions = generateQuestions(MOCK_VERSES, DEFAULT_SETTINGS);
    const validTypes = ['complete', 'surah', 'topic', 'order'];
    for (const q of questions) {
      expect(validTypes).toContain(q.type);
    }
  });

  it('respects questionTypes filter', () => {
    const settings: GameSettings = { ...DEFAULT_SETTINGS, questionTypes: ['topic'], questionCount: 5 };
    const questions = generateQuestions(MOCK_VERSES, settings);
    for (const q of questions) {
      expect(q.type).toBe('topic');
    }
  });

  it('respects timePerQuestion setting', () => {
    const settings: GameSettings = { ...DEFAULT_SETTINGS, timePerQuestion: 30, questionCount: 3 };
    const questions = generateQuestions(MOCK_VERSES, settings);
    for (const q of questions) {
      expect(q.timeLimit).toBe(30);
    }
  });

  it('generates questions with verseKey reference', () => {
    const questions = generateQuestions(MOCK_VERSES, { ...DEFAULT_SETTINGS, questionCount: 3 });
    for (const q of questions) {
      expect(q.verseKey).toBeTruthy();
      expect(q.verseKey).toContain(':');
    }
  });
});

// ─── Scoring ─────────────────────────────────────────────────

describe('calculatePoints', () => {
  it('returns 0 for incorrect answer', () => {
    expect(calculatePoints(false, 5000, 15000, 0)).toBe(0);
  });

  it('returns max ~1000 for instant correct answer', () => {
    const points = calculatePoints(true, 0, 15000, 0);
    expect(points).toBe(1000);
  });

  it('returns ~500 for slow correct answer', () => {
    const points = calculatePoints(true, 15000, 15000, 0);
    expect(points).toBe(500);
  });

  it('gives more points for faster answers', () => {
    const fast = calculatePoints(true, 2000, 15000, 0);
    const slow = calculatePoints(true, 12000, 15000, 0);
    expect(fast).toBeGreaterThan(slow);
  });

  it('applies streak bonus', () => {
    const noStreak = calculatePoints(true, 5000, 15000, 0);
    const streak3 = calculatePoints(true, 5000, 15000, 3);
    expect(streak3).toBeGreaterThan(noStreak);
  });

  it('caps streak bonus at 5', () => {
    const streak5 = calculatePoints(true, 5000, 15000, 5);
    const streak10 = calculatePoints(true, 5000, 15000, 10);
    expect(streak5).toBe(streak10);
  });
});

// ─── Game State Management ───────────────────────────────────

describe('createInitialState', () => {
  it('creates state with lobby phase', () => {
    const state = createInitialState('1234', 'host-1', 'Ahmed', '🧕');
    expect(state.phase).toBe('lobby');
    expect(state.roomCode).toBe('1234');
    expect(state.hostId).toBe('host-1');
    expect(state.players).toHaveLength(1);
    expect(state.players[0].isHost).toBe(true);
  });

  it('host has zero score initially', () => {
    const state = createInitialState('1234', 'host-1', 'Ahmed', '🧕');
    expect(state.players[0].score).toBe(0);
    expect(state.players[0].streak).toBe(0);
    expect(state.players[0].answers).toEqual([]);
  });
});

describe('addPlayerToState', () => {
  it('adds a new player', () => {
    const state = createInitialState('1234', 'host-1', 'Ahmed', '🧕');
    const player: Player = {
      id: 'p2', name: 'Maryam', avatar: '🌙', score: 0,
      streak: 0, answers: [], isHost: false, joinedAt: Date.now(),
    };
    const updated = addPlayerToState(state, player);
    expect(updated.players).toHaveLength(2);
  });

  it('skips duplicate player ids', () => {
    const state = createInitialState('1234', 'host-1', 'Ahmed', '🧕');
    const dup: Player = {
      id: 'host-1', name: 'Ahmed Copy', avatar: '⭐', score: 0,
      streak: 0, answers: [], isHost: false, joinedAt: Date.now(),
    };
    const updated = addPlayerToState(state, dup);
    expect(updated.players).toHaveLength(1);
  });

  it('caps at 8 players', () => {
    let state = createInitialState('1234', 'host-1', 'Ahmed', '🧕');
    for (let i = 2; i <= 9; i++) {
      state = addPlayerToState(state, {
        id: `p${i}`, name: `P${i}`, avatar: '⭐', score: 0,
        streak: 0, answers: [], isHost: false, joinedAt: Date.now(),
      });
    }
    expect(state.players).toHaveLength(8);
  });
});

describe('removePlayerFromState', () => {
  it('removes a player by id', () => {
    let state = createInitialState('1234', 'host-1', 'Ahmed', '🧕');
    state = addPlayerToState(state, {
      id: 'p2', name: 'Maryam', avatar: '🌙', score: 0,
      streak: 0, answers: [], isHost: false, joinedAt: Date.now(),
    });
    const updated = removePlayerFromState(state, 'p2');
    expect(updated.players).toHaveLength(1);
    expect(updated.players[0].id).toBe('host-1');
  });
});

describe('processAnswer', () => {
  it('records correct answer and adds points', () => {
    let state = createInitialState('1234', 'host-1', 'Ahmed', '🧕');
    const questions = generateQuestions(MOCK_VERSES, { ...DEFAULT_SETTINGS, questionCount: 5 });
    state = { ...state, questions, currentQuestion: 0 };
    const correctIdx = questions[0].correctIndex;

    const updated = processAnswer(state, 'host-1', 0, correctIdx, 3000);
    const player = updated.players[0];
    expect(player.answers).toHaveLength(1);
    expect(player.answers[0].correct).toBe(true);
    expect(player.score).toBeGreaterThan(0);
    expect(player.streak).toBe(1);
  });

  it('records wrong answer with zero points', () => {
    let state = createInitialState('1234', 'host-1', 'Ahmed', '🧕');
    const questions = generateQuestions(MOCK_VERSES, { ...DEFAULT_SETTINGS, questionCount: 5 });
    state = { ...state, questions, currentQuestion: 0 };
    const wrongIdx = (questions[0].correctIndex + 1) % 4;

    const updated = processAnswer(state, 'host-1', 0, wrongIdx, 3000);
    const player = updated.players[0];
    expect(player.answers[0].correct).toBe(false);
    expect(player.answers[0].points).toBe(0);
    expect(player.streak).toBe(0);
  });

  it('prevents duplicate answers for same question', () => {
    let state = createInitialState('1234', 'host-1', 'Ahmed', '🧕');
    const questions = generateQuestions(MOCK_VERSES, { ...DEFAULT_SETTINGS, questionCount: 5 });
    state = { ...state, questions, currentQuestion: 0 };
    const correctIdx = questions[0].correctIndex;

    state = processAnswer(state, 'host-1', 0, correctIdx, 3000);
    const scoreBefore = state.players[0].score;
    state = processAnswer(state, 'host-1', 0, correctIdx, 2000);
    expect(state.players[0].answers).toHaveLength(1);
    expect(state.players[0].score).toBe(scoreBefore);
  });

  it('builds streak over consecutive correct answers', () => {
    let state = createInitialState('1234', 'host-1', 'Ahmed', '🧕');
    const questions = generateQuestions(MOCK_VERSES, { ...DEFAULT_SETTINGS, questionCount: 5 });
    state = { ...state, questions };

    for (let i = 0; i < 3; i++) {
      state = { ...state, currentQuestion: i };
      state = processAnswer(state, 'host-1', i, questions[i].correctIndex, 3000);
    }
    expect(state.players[0].streak).toBe(3);
  });

  it('resets streak on wrong answer', () => {
    let state = createInitialState('1234', 'host-1', 'Ahmed', '🧕');
    const questions = generateQuestions(MOCK_VERSES, { ...DEFAULT_SETTINGS, questionCount: 5 });
    state = { ...state, questions };

    // 2 correct then 1 wrong
    state = { ...state, currentQuestion: 0 };
    state = processAnswer(state, 'host-1', 0, questions[0].correctIndex, 3000);
    state = { ...state, currentQuestion: 1 };
    state = processAnswer(state, 'host-1', 1, questions[1].correctIndex, 3000);
    state = { ...state, currentQuestion: 2 };
    const wrongIdx = (questions[2].correctIndex + 1) % 4;
    state = processAnswer(state, 'host-1', 2, wrongIdx, 3000);
    expect(state.players[0].streak).toBe(0);
  });
});

describe('getPlayerRanking', () => {
  it('sorts players by score descending', () => {
    let state = createInitialState('1234', 'host-1', 'Ahmed', '🧕');
    state = addPlayerToState(state, {
      id: 'p2', name: 'Maryam', avatar: '🌙', score: 0,
      streak: 0, answers: [], isHost: false, joinedAt: Date.now(),
    });
    // Give p2 a higher score
    state = {
      ...state,
      players: state.players.map(p =>
        p.id === 'p2' ? { ...p, score: 1000 } : { ...p, score: 500 }
      ),
    };
    const ranking = getPlayerRanking(state);
    expect(ranking[0].id).toBe('p2');
    expect(ranking[1].id).toBe('host-1');
  });
});

// ─── Bot Players ─────────────────────────────────────────────

describe('createBot', () => {
  it('creates a bot with bot- prefixed id', () => {
    const bot = createBot(0);
    expect(bot.id).toMatch(/^bot-0-/);
    expect(bot.isHost).toBe(false);
    expect(bot.score).toBe(0);
  });

  it('creates different bots with different indices', () => {
    const bot0 = createBot(0);
    const bot1 = createBot(1);
    expect(bot0.name).not.toBe(bot1.name);
  });
});

describe('simulateBotAnswer', () => {
  const mockQuestion: QuizQuestion = {
    id: 0, type: 'complete',
    prompt: 'test prompt',
    options: ['a', 'b', 'c', 'd'],
    correctIndex: 2,
    verseKey: '1:1',
    topicColor: 'red',
    timeLimit: 15,
  };

  it('returns a selectedIndex between 0-3', () => {
    const { selectedIndex } = simulateBotAnswer(mockQuestion, 'medium');
    expect(selectedIndex).toBeGreaterThanOrEqual(0);
    expect(selectedIndex).toBeLessThanOrEqual(3);
  });

  it('returns positive timeMs', () => {
    const { timeMs } = simulateBotAnswer(mockQuestion, 'medium');
    expect(timeMs).toBeGreaterThan(0);
  });

  it('hard bots answer faster on average', () => {
    let easyTotal = 0, hardTotal = 0;
    const rounds = 100;
    for (let i = 0; i < rounds; i++) {
      easyTotal += simulateBotAnswer(mockQuestion, 'easy').timeMs;
      hardTotal += simulateBotAnswer(mockQuestion, 'hard').timeMs;
    }
    expect(hardTotal / rounds).toBeLessThan(easyTotal / rounds);
  });
});

// ─── Leaderboard ─────────────────────────────────────────────

describe('leaderboard', () => {
  it('starts empty', () => {
    expect(loadLeaderboard()).toEqual([]);
  });

  it('saves and loads entries', () => {
    saveToLeaderboard({
      playerName: 'Ahmed', score: 5000,
      questionsCorrect: 8, questionsTotal: 10,
      date: new Date().toISOString(), roomCode: '1234',
    });
    const lb = loadLeaderboard();
    expect(lb).toHaveLength(1);
    expect(lb[0].playerName).toBe('Ahmed');
    expect(lb[0].score).toBe(5000);
  });

  it('sorts by score descending', () => {
    saveToLeaderboard({ playerName: 'A', score: 3000, questionsCorrect: 6, questionsTotal: 10, date: new Date().toISOString(), roomCode: '1' });
    saveToLeaderboard({ playerName: 'B', score: 7000, questionsCorrect: 9, questionsTotal: 10, date: new Date().toISOString(), roomCode: '2' });
    saveToLeaderboard({ playerName: 'C', score: 5000, questionsCorrect: 7, questionsTotal: 10, date: new Date().toISOString(), roomCode: '3' });
    const lb = loadLeaderboard();
    expect(lb[0].playerName).toBe('B');
    expect(lb[1].playerName).toBe('C');
    expect(lb[2].playerName).toBe('A');
  });

  it('clears leaderboard', () => {
    saveToLeaderboard({ playerName: 'A', score: 1000, questionsCorrect: 5, questionsTotal: 10, date: new Date().toISOString(), roomCode: '1' });
    clearLeaderboard();
    expect(loadLeaderboard()).toEqual([]);
  });
});

// ─── Constants ───────────────────────────────────────────────

describe('constants', () => {
  it('has 12 avatars', () => {
    expect(AVATARS).toHaveLength(12);
  });

  it('has 4 question presets', () => {
    expect(QUESTION_PRESETS).toHaveLength(4);
  });

  it('has 4 time presets', () => {
    expect(TIME_PRESETS).toHaveLength(4);
  });

  it('default settings are valid', () => {
    expect(DEFAULT_SETTINGS.questionCount).toBe(10);
    expect(DEFAULT_SETTINGS.timePerQuestion).toBe(15);
    expect(DEFAULT_SETTINGS.questionTypes).toContain('complete');
    expect(DEFAULT_SETTINGS.questionTypes).toContain('surah');
    expect(DEFAULT_SETTINGS.questionTypes).toContain('topic');
    expect(DEFAULT_SETTINGS.questionTypes).toContain('order');
    expect(DEFAULT_SETTINGS.difficulty).toBe('medium');
  });
});
