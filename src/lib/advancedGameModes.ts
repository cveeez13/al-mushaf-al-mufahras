/**
 * Advanced Multiplayer Game Modes
 * 
 * Modes:
 * 1. Classic - Traditional Kahoot-style (individual scoring)
 * 2. Team - 2-4 teams compete, team scores combined
 * 3. Lightning Round - Speed focused, shorter time limits, more points
 * 4. Time Attack - Race against the clock, survival mode
 * 5. Tournament - Bracket-based elimination tournament
 */

// ═══════════════════════════════════════════════════════════
// Team Mode
// ═══════════════════════════════════════════════════════════

export interface Team {
  id: string;
  name: string;
  color: string;
  players: string[];
  score: number;
  correctAnswers: number;
}

export function createTeam(id: string, name: string, color: string): Team {
  return {
    id,
    name,
    color,
    players: [],
    score: 0,
    correctAnswers: 0,
  };
}

export function addPlayerToTeam(team: Team, playerId: string): void {
  if (!team.players.includes(playerId)) {
    team.players.push(playerId);
  }
}

export function addTeamScore(team: Team, points: number, isCorrect: boolean): void {
  team.score += points;
  if (isCorrect) team.correctAnswers++;
}

export function getTeamRanking(teams: Team[]): Team[] {
  return [...teams].sort((a, b) => b.score - a.score);
}

// ═══════════════════════════════════════════════════════════
// Lightning Round
// ═══════════════════════════════════════════════════════════

export interface LightningRoundSettings {
  questionCount: number;
  timePerQuestion: number; // seconds (typically 5-10)
  questionTypes: string[];
  pointsMultiplier: number; // 2x or 3x for faster answers
}

export const LIGHTNING_PRESETS = [
  {
    name: 'Quick Fire',
    questionCount: 5,
    timePerQuestion: 5,
    pointsMultiplier: 2,
  },
  {
    name: 'Blitz',
    questionCount: 10,
    timePerQuestion: 7,
    pointsMultiplier: 2.5,
  },
  {
    name: 'Overdrive',
    questionCount: 15,
    timePerQuestion: 5,
    pointsMultiplier: 3,
  },
];

export function calculateLightningPoints(
  correct: boolean,
  timeMs: number,
  timeLimitMs: number,
  multiplier: number,
): number {
  if (!correct) return 0;
  const speedBonus = Math.max(0.2, 1 - timeMs / timeLimitMs);
  return Math.round(1000 * speedBonus * multiplier);
}

// ═══════════════════════════════════════════════════════════
// Time Attack (Survival Mode)
// ═══════════════════════════════════════════════════════════

export interface TimeAttackConfig {
  initialTime: number; // seconds
  timeAddedPerCorrect: number; // seconds
  timeReducedPerWrong: number; // seconds
  minTimePerQuestion: number; // seconds
  maxQuestions: number;
}

export const TIME_ATTACK_DIFFICULTIES = {
  easy: {
    initialTime: 120,
    timeAddedPerCorrect: 10,
    timeReducedPerWrong: 5,
    minTimePerQuestion: 5,
    maxQuestions: 50,
  },
  medium: {
    initialTime: 90,
    timeAddedPerCorrect: 8,
    timeReducedPerWrong: 8,
    minTimePerQuestion: 3,
    maxQuestions: 100,
  },
  hard: {
    initialTime: 60,
    timeAddedPerCorrect: 5,
    timeReducedPerWrong: 10,
    minTimePerQuestion: 2,
    maxQuestions: 150,
  },
};

export function updateTimeAttackTime(
  currentTime: number,
  isCorrect: boolean,
  config: TimeAttackConfig,
): number {
  let newTime = currentTime;
  if (isCorrect) {
    newTime += config.timeAddedPerCorrect;
  } else {
    newTime -= config.timeReducedPerWrong;
    newTime = Math.max(config.minTimePerQuestion, newTime);
  }
  return newTime;
}

// ═══════════════════════════════════════════════════════════
// Tournament System (Single Elimination)
// ═══════════════════════════════════════════════════════════

export interface TournamentBracket {
  id: string;
  round: number;
  match: number;
  player1Id?: string;
  player2Id?: string;
  player1Score?: number;
  player2Score?: number;
  winnerId?: string;
  roomId?: string;
  startedAt?: number;
  endedAt?: number;
}

export interface TournamentState {
  id: string;
  name: string;
  format: 'single-elimination' | 'double-elimination';
  players: string[];
  brackets: TournamentBracket[][];
  currentRound: number;
  totalRounds: number;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
}

export function createTournament(
  name: string,
  players: string[],
  format: 'single-elimination' | 'double-elimination' = 'single-elimination',
): TournamentState {
  const totalRounds = Math.ceil(Math.log2(players.length));
  const brackets: TournamentBracket[][] = [];

  // Generate first round brackets
  const firstRound: TournamentBracket[] = [];
  for (let i = 0; i < players.length; i += 2) {
    firstRound.push({
      id: `br-0-${i / 2}`,
      round: 0,
      match: Math.floor(i / 2),
      player1Id: players[i],
      player2Id: players[i + 1],
    });
  }
  brackets.push(firstRound);

  // Generate subsequent rounds (empty, will be filled as matches complete)
  for (let round = 1; round < totalRounds; round++) {
    const matchCount = Math.pow(2, totalRounds - round - 1);
    const roundBrackets: TournamentBracket[] = [];
    for (let match = 0; match < matchCount; match++) {
      roundBrackets.push({
        id: `br-${round}-${match}`,
        round,
        match,
      });
    }
    brackets.push(roundBrackets);
  }

  return {
    id: `tour-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    format,
    players,
    brackets,
    currentRound: 0,
    totalRounds,
    createdAt: Date.now(),
  };
}

export function recordTournamentMatch(
  tournament: TournamentState,
  bracketId: string,
  player1Score: number,
  player2Score: number,
): boolean {
  const [roundStr, matchStr] = bracketId.split('-').slice(1, 3).map(Number);
  const bracket = tournament.brackets[roundStr][matchStr];

  if (!bracket) return false;

  const winner = player1Score > player2Score ? bracket.player1Id : bracket.player2Id;
  bracket.player1Score = player1Score;
  bracket.player2Score = player2Score;
  bracket.winnerId = winner;
  bracket.endedAt = Date.now();

  // Advance winner to next round
  if (roundStr + 1 < tournament.brackets.length) {
    const nextRound = tournament.brackets[roundStr + 1];
    const nextMatchIndex = Math.floor(matchStr / 2);
    const isPlayer1Slot = matchStr % 2 === 0;

    if (isPlayer1Slot) {
      nextRound[nextMatchIndex].player1Id = winner;
    } else {
      nextRound[nextMatchIndex].player2Id = winner;
    }
  }

  return true;
}

export function getTournamentWinner(tournament: TournamentState): string | null {
  const finalRound = tournament.brackets[tournament.totalRounds - 1];
  return finalRound[0]?.winnerId || null;
}

export function getTournamentProgress(tournament: TournamentState): number {
  let completedMatches = 0;
  let totalMatches = 0;

  tournament.brackets.forEach(round => {
    round.forEach(bracket => {
      totalMatches++;
      if (bracket.winnerId) completedMatches++;
    });
  });

  return totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;
}

// ═══════════════════════════════════════════════════════════
// Power-Ups & Bonuses (Optional)
// ═══════════════════════════════════════════════════════════

export type PowerUpType = 'double-points' | 'extra-time' | 'hint' | 'freeze-opponents' | 'steal-points';

export interface PowerUp {
  type: PowerUpType;
  playerId: string;
  questionId: number;
  activatedAt: number;
  duration: number; // milliseconds
}

export const POWER_UPS = {
  'double-points': {
    name: 'Double Points',
    icon: '⚡',
    duration: 5000,
    cost: 100, // points to activate
  },
  'extra-time': {
    name: 'Extra Time',
    icon: '⏰',
    duration: 5000,
    cost: 150,
  },
  'hint': {
    name: 'Hint',
    icon: '💡',
    duration: 0,
    cost: 200,
  },
  'freeze-opponents': {
    name: 'Freeze Opponents',
    icon: '❄️',
    duration: 3000,
    cost: 250,
  },
  'steal-points': {
    name: 'Steal Points',
    icon: '🎯',
    duration: 0,
    cost: 300,
  },
};

export function activatePowerUp(powerUpType: PowerUpType, playerId: string, questionId: number): PowerUp {
  return {
    type: powerUpType,
    playerId,
    questionId,
    activatedAt: Date.now(),
    duration: POWER_UPS[powerUpType]?.duration || 0,
  };
}

export function isPowerUpActive(powerUp: PowerUp, currentTime: number = Date.now()): boolean {
  if (powerUp.duration === 0) return false;
  return currentTime - powerUp.activatedAt < powerUp.duration;
}

// ═══════════════════════════════════════════════════════════
// Analytics & Metrics
// ═══════════════════════════════════════════════════════════

export interface GameMetrics {
  gameId: string;
  playerId: string;
  gameMode: string;
  startedAt: number;
  endedAt: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  accuracy: number;
  finalScore: number;
  finalRank: number;
  totalTime: number;
  avgResponseTime: number;
  maxStreak: number;
  eloChange: number;
}

export function calculateMetrics(
  gameId: string,
  playerId: string,
  gameMode: string,
  startedAt: number,
  endedAt: number,
  answers: Array<{ correct: boolean; timeMs: number }>,
  finalScore: number,
  finalRank: number,
  eloChange: number,
): GameMetrics {
  const correctAnswers = answers.filter(a => a.correct).length;
  const wrongAnswers = answers.length - correctAnswers;
  const accuracy = answers.length > 0 ? (correctAnswers / answers.length) * 100 : 0;
  const totalTime = endedAt - startedAt;
  const avgResponseTime = answers.length > 0 ? answers.reduce((sum, a) => sum + a.timeMs, 0) / answers.length : 0;

  // Calculate max streak
  let maxStreak = 0;
  let currentStreak = 0;
  answers.forEach(a => {
    if (a.correct) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });

  return {
    gameId,
    playerId,
    gameMode,
    startedAt,
    endedAt,
    totalQuestions: answers.length,
    correctAnswers,
    wrongAnswers,
    accuracy: Math.round(accuracy * 10) / 10,
    finalScore,
    finalRank,
    totalTime,
    avgResponseTime: Math.round(avgResponseTime),
    maxStreak,
    eloChange,
  };
}

// ═══════════════════════════════════════════════════════════
// Achievements & Badges
// ═══════════════════════════════════════════════════════════

export type AchievementType =
  | 'first-game'
  | 'perfect-score'
  | 'streak-10'
  | 'tournament-winner'
  | 'speed-demon'
  | 'team-player'
  | 'comeback-king'
  | 'streaky';

export interface Achievement {
  type: AchievementType;
  unlockedAt: number;
  gameId?: string;
}

export const ACHIEVEMENTS = {
  'first-game': { name: 'First Steps', icon: '🎮', description: 'Complete your first game' },
  'perfect-score': { name: 'Perfect!', icon: '💯', description: 'Answer all questions correctly' },
  'streak-10': { name: 'On Fire!', icon: '🔥', description: 'Get a 10-question streak' },
  'tournament-winner': { name: 'Champion', icon: '🏆', description: 'Win a tournament' },
  'speed-demon': { name: 'Speed Demon', icon: '⚡', description: 'Average response time under 3 seconds' },
  'team-player': { name: 'Team Player', icon: '🤝', description: 'Win a team game' },
  'comeback-king': { name: 'Comeback King', icon: '👑', description: 'Win from 3+ points behind' },
  'streaky': { name: 'Streaky', icon: '📈', description: 'Win 5 games in a row' },
};

export function checkAchievements(metrics: GameMetrics): AchievementType[] {
  const unlocked: AchievementType[] = [];

  if (metrics.accuracy === 100) {
    unlocked.push('perfect-score');
  }

  if (metrics.maxStreak >= 10) {
    unlocked.push('streak-10');
  }

  if (metrics.avgResponseTime < 3000) {
    unlocked.push('speed-demon');
  }

  if (metrics.gameMode === 'team' && metrics.finalRank === 1) {
    unlocked.push('team-player');
  }

  if (metrics.gameMode === 'tournament' && metrics.finalRank === 1) {
    unlocked.push('tournament-winner');
  }

  return unlocked;
}
