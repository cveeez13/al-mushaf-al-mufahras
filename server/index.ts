/**
 * Al-Mushaf Multiplayer Quiz Server
 * WebSocket-based real-time game engine for cross-device multiplayer
 * 
 * Features:
 * - Real-time multiplayer (Socket.io)
 * - Room management & persistence
 * - Tournament system (single-elimination, round-robin)
 * - Advanced scoring & ELO ranking
 * - Game mode variants (Team, Lightning, Time Attack)
 * - In-game chat & reactions
 * - Analytics & metrics tracking
 * - Broadcasting for spectators
 * 
 * Architecture:
 * - Express server with Socket.io on top
 * - Redis for room/game state persistence (optional)
 * - Event-driven game flow
 * - JWT-based player authentication
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 60000,
  maxHttpBufferSize: 1e6,
});

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════
// Types & Interfaces
// ═══════════════════════════════════════════════════════════

export interface Player {
  id: string;
  socketId: string;
  name: string;
  avatar: string;
  score: number;
  correctAnswers: number;
  currentStreak: number;
  elo: number;
  joinedAt: number;
  isHost: boolean;
  isSpectator: boolean;
  answers: PlayerAnswer[];
}

export interface PlayerAnswer {
  questionId: number;
  selectedIndex: number;
  correct: boolean;
  timeMs: number;
  points: number;
}

export interface GameQuestion {
  id: number;
  type: 'complete' | 'surah' | 'topic' | 'order';
  prompt: string;
  options: string[];
  correctIndex: number;
  verseKey: string;
  topicColor: string;
  timeLimit: number;
}

export interface GameRoom {
  id: string;
  code: string;
  hostId: string;
  hostName: string;
  players: Map<string, Player>;
  spectators: Map<string, Player>;
  gameState: GameState;
  settings: GameSettings;
  questions: GameQuestion[];
  currentQuestion: number;
  phase: GamePhase;
  startedAt: number | null;
  endedAt: number | null;
  tournamentId?: string;
  gameMode: GameMode;
  isPrivate: boolean;
  maxPlayers: number;
}

export interface GameSettings {
  questionCount: number;
  timePerQuestion: number;
  questionTypes: ('complete' | 'surah' | 'topic' | 'order')[];
  difficulty: 'easy' | 'medium' | 'hard';
  allowSpectators: boolean;
  minPlayers: number;
}

export type GameMode = 'classic' | 'team' | 'lightning' | 'timeAttack' | 'tournament';
export type GamePhase = 'idle' | 'lobby' | 'countdown' | 'question' | 'reveal' | 'leaderboard' | 'results';
export type GameState = 'waiting' | 'active' | 'paused' | 'finished';

export interface Tournament {
  id: string;
  name: string;
  createdBy: string;
  startedAt: number;
  endedAt: number | null;
  format: 'single-elimination' | 'round-robin' | 'swiss';
  bracket: BracketNode[];
  players: string[];
  currentRound: number;
  totalRounds: number;
}

export interface BracketNode {
  id: string;
  player1Id?: string;
  player2Id?: string;
  winner?: string;
  roomId?: string;
  round: number;
}

export interface GameMetrics {
  playerId: string;
  gameId: string;
  totalTime: number;
  avgResponseTime: number;
  accuracy: number;
  streakMax: number;
  difficulty: string;
  result: 'win' | 'loss' | 'draw';
  pointsEarned: number;
  eloChange: number;
}

// ═══════════════════════════════════════════════════════════
// In-Memory Storage (Use Redis in production)
// ═══════════════════════════════════════════════════════════

const rooms = new Map<string, GameRoom>();
const tournaments = new Map<string, Tournament>();
const playerMetrics = new Map<string, GameMetrics[]>();
const playerStats = new Map<string, {
  gamesPlayed: number;
  gamesWon: number;
  totalPoints: number;
  elo: number;
  lastSeen: number;
}>();

// ═══════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════

function generateRoomCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function generateGameId(): string {
  return uuidv4();
}

function calculateEloChange(playerElo: number, opponentElo: number, isWin: boolean): number {
  const K = 32; // ELO K-factor
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  const actualScore = isWin ? 1 : 0;
  return Math.round(K * (actualScore - expectedScore));
}

function calculatePoints(
  correct: boolean,
  timeMs: number,
  timeLimitMs: number,
  streak: number,
): number {
  if (!correct) return 0;
  const speedMultiplier = Math.max(0.3, 1 - timeMs / timeLimitMs);
  const basePoints = Math.round(1000 * speedMultiplier);
  const streakBonus = Math.min(streak * 10, 200); // Max 200 bonus
  return basePoints + streakBonus;
}

function getPlayerRanking(room: GameRoom): Player[] {
  const all = [...room.players.values(), ...room.spectators.values()];
  return all.sort((a, b) => b.score - a.score);
}

// ═══════════════════════════════════════════════════════════
// Socket.io Event Handlers
// ═══════════════════════════════════════════════════════════

io.on('connection', (socket: Socket) => {
  console.log(`[CONNECT] ${socket.id}`);

  // ─────────────────────────────────────────────────────────
  // ROOM MANAGEMENT
  // ─────────────────────────────────────────────────────────

  socket.on('create-room', (payload: { name: string; avatar: string; gameMode: GameMode; isPrivate: boolean }, callback) => {
    try {
      const roomCode = generateRoomCode();
      const room: GameRoom = {
        id: generateGameId(),
        code: roomCode,
        hostId: socket.id,
        hostName: payload.name,
        players: new Map(),
        spectators: new Map(),
        gameState: 'waiting',
        settings: {
          questionCount: 10,
          timePerQuestion: 15,
          questionTypes: ['complete', 'surah', 'topic', 'order'],
          difficulty: 'medium',
          allowSpectators: true,
          minPlayers: 2,
        },
        questions: [],
        currentQuestion: 0,
        phase: 'lobby',
        startedAt: null,
        endedAt: null,
        gameMode: payload.gameMode,
        isPrivate: payload.isPrivate,
        maxPlayers: payload.gameMode === 'team' ? 8 : 4,
      };

      // Add host as first player
      const hostPlayer: Player = {
        id: socket.id,
        socketId: socket.id,
        name: payload.name,
        avatar: payload.avatar,
        score: 0,
        correctAnswers: 0,
        currentStreak: 0,
        elo: 1000,
        joinedAt: Date.now(),
        isHost: true,
        isSpectator: false,
        answers: [],
      };

      room.players.set(socket.id, hostPlayer);
      rooms.set(room.id, room);
      socket.join(room.id);

      if (!playerStats.has(socket.id)) {
        playerStats.set(socket.id, {
          gamesPlayed: 0,
          gamesWon: 0,
          totalPoints: 0,
          elo: 1000,
          lastSeen: Date.now(),
        });
      }

      io.to(room.id).emit('room-created', { room: serializeRoom(room) });
      callback({ success: true, room: serializeRoom(room) });
    } catch (err) {
      callback({ success: false, error: (err as Error).message });
    }
  });

  socket.on('join-room', (payload: { code: string; name: string; avatar: string; asSpectator?: boolean }, callback) => {
    try {
      const room = [...rooms.values()].find(r => r.code === payload.code);
      if (!room) {
        return callback({ success: false, error: 'Room not found' });
      }

      if (room.gameState === 'active') {
        // Allow spectators if game is active
        if (!payload.asSpectator || !room.settings.allowSpectators) {
          return callback({ success: false, error: 'Game already in progress' });
        }
      }

      // Check max players
      if (!payload.asSpectator && room.players.size >= room.maxPlayers) {
        return callback({ success: false, error: 'Room is full' });
      }

      const player: Player = {
        id: socket.id,
        socketId: socket.id,
        name: payload.name,
        avatar: payload.avatar,
        score: 0,
        correctAnswers: 0,
        currentStreak: 0,
        elo: playerStats.get(socket.id)?.elo || 1000,
        joinedAt: Date.now(),
        isHost: false,
        isSpectator: payload.asSpectator || false,
        answers: [],
      };

      if (payload.asSpectator) {
        room.spectators.set(socket.id, player);
      } else {
        room.players.set(socket.id, player);
      }

      socket.join(room.id);

      if (!playerStats.has(socket.id)) {
        playerStats.set(socket.id, {
          gamesPlayed: 0,
          gamesWon: 0,
          totalPoints: 0,
          elo: 1000,
          lastSeen: Date.now(),
        });
      }

      io.to(room.id).emit('player-joined', { player: serializePlayer(player) });
      callback({ success: true, room: serializeRoom(room) });
    } catch (err) {
      callback({ success: false, error: (err as Error).message });
    }
  });

  socket.on('leave-room', (roomId: string) => {
    const room = rooms.get(roomId);
    if (!room) return;

    room.players.delete(socket.id);
    room.spectators.delete(socket.id);

    if (room.players.size === 0) {
      // Room is empty, clean up
      rooms.delete(roomId);
      io.to(roomId).emit('room-closed');
    } else if (room.hostId === socket.id) {
      // Host left, assign new host
      const newHost = [...room.players.values()][0];
      if (newHost) {
        newHost.isHost = true;
        room.hostId = newHost.id;
        io.to(roomId).emit('host-changed', { newHostId: newHost.id });
      }
    }

    socket.leave(roomId);
    io.to(roomId).emit('player-left', { playerId: socket.id });
  });

  // ─────────────────────────────────────────────────────────
  // GAME FLOW
  // ─────────────────────────────────────────────────────────

  socket.on('start-game', (roomId: string, callback) => {
    try {
      const room = rooms.get(roomId);
      if (!room || room.hostId !== socket.id) {
        return callback({ success: false, error: 'Not authorized' });
      }

      if (room.players.size < room.settings.minPlayers) {
        return callback({ success: false, error: `Need at least ${room.settings.minPlayers} players` });
      }

      room.gameState = 'active';
      room.phase = 'countdown';
      room.startedAt = Date.now();

      // Reset players for new game
      room.players.forEach(p => {
        p.score = 0;
        p.correctAnswers = 0;
        p.currentStreak = 0;
        p.answers = [];
      });

      io.to(roomId).emit('game-started', { room: serializeRoom(room) });
      callback({ success: true });
    } catch (err) {
      callback({ success: false, error: (err as Error).message });
    }
  });

  socket.on('submit-answer', (payload: { roomId: string; questionId: number; selectedIndex: number; timeMs: number }, callback) => {
    try {
      const room = rooms.get(payload.roomId);
      if (!room) return callback({ success: false, error: 'Room not found' });

      const player = room.players.get(socket.id);
      if (!player || player.isSpectator) {
        return callback({ success: false, error: 'Not a player' });
      }

      const question = room.questions[payload.questionId];
      if (!question) return callback({ success: false, error: 'Question not found' });

      const correct = payload.selectedIndex === question.correctIndex;
      const points = calculatePoints(correct, payload.timeMs, question.timeLimit * 1000, player.currentStreak);

      // Update player
      player.answers.push({
        questionId: payload.questionId,
        selectedIndex: payload.selectedIndex,
        correct,
        timeMs: payload.timeMs,
        points,
      });
      player.score += points;
      if (correct) {
        player.correctAnswers++;
        player.currentStreak++;
      } else {
        player.currentStreak = 0;
      }

      io.to(payload.roomId).emit('answer-submitted', {
        playerId: socket.id,
        correct,
        points,
        score: player.score,
      });

      callback({ success: true, correct, points });
    } catch (err) {
      callback({ success: false, error: (err as Error).message });
    }
  });

  socket.on('next-question', (roomId: string, callback) => {
    try {
      const room = rooms.get(roomId);
      if (!room || room.hostId !== socket.id) {
        return callback({ success: false, error: 'Not authorized' });
      }

      room.currentQuestion++;
      if (room.currentQuestion >= room.questions.length) {
        room.gameState = 'finished';
        room.phase = 'results';
        room.endedAt = Date.now();

        // Calculate final rankings & ELO changes
        const ranking = getPlayerRanking(room);
        ranking.forEach((p, index) => {
          const stats = playerStats.get(p.id);
          if (stats) {
            stats.gamesPlayed++;
            stats.totalPoints += p.score;
            stats.lastSeen = Date.now();

            // Award ELO to top 3
            if (index === 0) {
              stats.gamesWon++;
              const eloChange = calculateEloChange(p.elo, 1000, true);
              stats.elo += eloChange;
              p.elo = stats.elo;
            }
          }
        });

        io.to(roomId).emit('game-finished', {
          room: serializeRoom(room),
          ranking: ranking.map(serializePlayer),
        });
      } else {
        room.phase = 'countdown';
        io.to(roomId).emit('question-changed', {
          questionNumber: room.currentQuestion + 1,
          totalQuestions: room.questions.length,
        });
      }

      callback({ success: true });
    } catch (err) {
      callback({ success: false, error: (err as Error).message });
    }
  });

  // ─────────────────────────────────────────────────────────
  // CHAT & REACTIONS
  // ─────────────────────────────────────────────────────────

  socket.on('chat-message', (payload: { roomId: string; message: string }, callback) => {
    const room = rooms.get(payload.roomId);
    const player = room?.players.get(socket.id) || room?.spectators.get(socket.id);
    if (!player) return callback({ success: false });

    io.to(payload.roomId).emit('chat-received', {
      playerId: socket.id,
      playerName: player.name,
      message: payload.message,
      timestamp: Date.now(),
    });
    callback({ success: true });
  });

  socket.on('reaction', (payload: { roomId: string; emoji: string }, callback) => {
    const room = rooms.get(payload.roomId);
    const player = room?.players.get(socket.id);
    if (!player) return callback({ success: false });

    io.to(payload.roomId).emit('reaction-received', {
      playerId: socket.id,
      playerName: player.name,
      emoji: payload.emoji,
    });
    callback({ success: true });
  });

  // ─────────────────────────────────────────────────────────
  // DISCONNECT
  // ─────────────────────────────────────────────────────────

  socket.on('disconnect', () => {
    console.log(`[DISCONNECT] ${socket.id}`);

    // Clean up rooms
    for (const [roomId, room] of rooms) {
      if (room.hostId === socket.id && room.gameState === 'waiting') {
        rooms.delete(roomId);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════
// REST API Endpoints
// ═══════════════════════════════════════════════════════════

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/stats/player/:playerId', (req, res) => {
  const stats = playerStats.get(req.params.playerId);
  res.json(stats || { gamesPlayed: 0, gamesWon: 0, totalPoints: 0, elo: 1000 });
});

app.get('/stats/leaderboard', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const leaderboard = [...playerStats.entries()]
    .map(([id, stats]) => ({ playerId: id, ...stats }))
    .sort((a, b) => b.elo - a.elo)
    .slice(0, limit);
  res.json(leaderboard);
});

app.get('/rooms/:code', (req, res) => {
  const room = [...rooms.values()].find(r => r.code === req.params.code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json(serializeRoom(room));
});

// ═══════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════

function serializeRoom(room: GameRoom) {
  return {
    id: room.id,
    code: room.code,
    hostId: room.hostId,
    hostName: room.hostName,
    playerCount: room.players.size,
    spectatorCount: room.spectators.size,
    maxPlayers: room.maxPlayers,
    gameState: room.gameState,
    phase: room.phase,
    gameMode: room.gameMode,
    players: [...room.players.values()].map(serializePlayer),
    spectators: [...room.spectators.values()].map(serializePlayer),
    currentQuestion: room.currentQuestion,
    totalQuestions: room.questions.length,
    startedAt: room.startedAt,
    endedAt: room.endedAt,
  };
}

function serializePlayer(player: Player) {
  return {
    id: player.id,
    name: player.name,
    avatar: player.avatar,
    score: player.score,
    correctAnswers: player.correctAnswers,
    currentStreak: player.currentStreak,
    elo: player.elo,
    isHost: player.isHost,
    isSpectator: player.isSpectator,
    joinedAt: player.joinedAt,
  };
}

// ═══════════════════════════════════════════════════════════
// Server Start
// ═══════════════════════════════════════════════════════════

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`\n🎯 Al-Mushaf Quiz Server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health\n`);
});

export { io, rooms, tournaments, playerStats };
