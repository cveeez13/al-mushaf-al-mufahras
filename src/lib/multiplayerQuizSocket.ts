// @ts-nocheck
/**
 * Multiplayer Quiz Client — Socket.io Integration
 * 
 * Enhances the existing BroadcastChannel multiplayer with:
 * - Real cross-device multiplayer via Socket.io
 * - Fallback to BroadcastChannel if server unavailable
 * - Advanced game modes (Team, Lightning, Time Attack)
 * - In-game chat & reactions
 * - ELO ranking system
 * - Tournament support
 * - Metrics & analytics
 */

import { io, Socket as ClientSocket } from 'socket.io-client';
import type { Verse } from './types';
import { TOPICS } from './types';

// ═══════════════════════════════════════════════════════════
// Types & Interfaces
// ═══════════════════════════════════════════════════════════

export interface RemotePlayer {
  id: string;
  name: string;
  avatar: string;
  score: number;
  correctAnswers: number;
  currentStreak: number;
  elo: number;
  isHost: boolean;
  isSpectator: boolean;
  joinedAt: number;
}

export interface RemoteRoom {
  id: string;
  code: string;
  hostId: string;
  hostName: string;
  playerCount: number;
  spectatorCount: number;
  maxPlayers: number;
  gameState: 'waiting' | 'active' | 'paused' | 'finished';
  phase: 'idle' | 'lobby' | 'countdown' | 'question' | 'reveal' | 'leaderboard' | 'results';
  gameMode: 'classic' | 'team' | 'lightning' | 'timeAttack' | 'tournament';
  players: RemotePlayer[];
  spectators: RemotePlayer[];
  currentQuestion: number;
  totalQuestions: number;
  startedAt: number | null;
  endedAt: number | null;
}

export interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

export interface GameReaction {
  playerId: string;
  playerName: string;
  emoji: string;
  timestamp?: number;
}

export interface AnswerSubmission {
  playerId: string;
  correct: boolean;
  points: number;
  score: number;
}

// ═══════════════════════════════════════════════════════════
// Client Manager
// ═══════════════════════════════════════════════════════════

let socket: ClientSocket | null = null;
let currentRoomId: string | null = null;
let isConnected = false;
let useFallbackMode = false;

/**
 * Initialize Socket.io connection to multiplayer server
 * Falls back to BroadcastChannel if server unavailable
 */
export function initializeSocket(serverUrl: string = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000'): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      socket = io(serverUrl, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        isConnected = true;
        useFallbackMode = false;
        console.log('✅ Connected to multiplayer server');
        resolve(true);
      });

      socket.on('connect_error', (error) => {
        console.warn('⚠️ Connection error, falling back to BroadcastChannel:', error);
        useFallbackMode = true;
        isConnected = false;
        resolve(false);
      });

      socket.on('disconnect', () => {
        isConnected = false;
        console.log('❌ Disconnected from server');
      });
    } catch (err) {
      console.error('Failed to initialize socket:', err);
      useFallbackMode = true;
      resolve(false);
    }
  });
}

/**
 * Create a new game room
 */
export async function createRoomRemote(payload: {
  name: string;
  avatar: string;
  gameMode: 'classic' | 'team' | 'lightning' | 'timeAttack' | 'tournament';
  isPrivate: boolean;
}): Promise<{ success: boolean; room?: RemoteRoom; error?: string }> {
  return new Promise((resolve) => {
    if (!socket || !isConnected) {
      return resolve({ success: false, error: 'Not connected to server' });
    }

    socket.emit('create-room', payload, (response: any) => {
      if (response.success) {
        currentRoomId = response.room.id;
      }
      resolve(response);
    });
  });
}

/**
 * Join an existing game room
 */
export async function joinRoomRemote(payload: {
  code: string;
  name: string;
  avatar: string;
  asSpectator?: boolean;
}): Promise<{ success: boolean; room?: RemoteRoom; error?: string }> {
  return new Promise((resolve) => {
    if (!socket || !isConnected) {
      return resolve({ success: false, error: 'Not connected to server' });
    }

    socket.emit('join-room', payload, (response: any) => {
      if (response.success) {
        currentRoomId = response.room.id;
      }
      resolve(response);
    });
  });
}

/**
 * Leave current room
 */
export function leaveRoomRemote(): void {
  if (socket && isConnected && currentRoomId) {
    socket.emit('leave-room', currentRoomId);
    currentRoomId = null;
  }
}

/**
 * Start the game (host only)
 */
export async function startGameRemote(): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    if (!socket || !isConnected || !currentRoomId) {
      return resolve({ success: false, error: 'Not connected' });
    }

    socket.emit('start-game', currentRoomId, (response: any) => {
      resolve(response);
    });
  });
}

/**
 * Submit an answer to the current question
 */
export async function submitAnswerRemote(payload: {
  questionId: number;
  selectedIndex: number;
  timeMs: number;
}): Promise<{ success: boolean; correct?: boolean; points?: number; error?: string }> {
  return new Promise((resolve) => {
    if (!socket || !isConnected || !currentRoomId) {
      return resolve({ success: false, error: 'Not connected' });
    }

    socket.emit('submit-answer', { roomId: currentRoomId, ...payload }, (response: any) => {
      resolve(response);
    });
  });
}

/**
 * Advance to next question (host only)
 */
export async function nextQuestionRemote(): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    if (!socket || !isConnected || !currentRoomId) {
      return resolve({ success: false, error: 'Not connected' });
    }

    socket.emit('next-question', currentRoomId, (response: any) => {
      resolve(response);
    });
  });
}

/**
 * Send chat message
 */
export async function sendChatMessage(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!socket || !isConnected || !currentRoomId) {
      return resolve(false);
    }

    socket.emit('chat-message', { roomId: currentRoomId, message }, (response: any) => {
      resolve(response.success);
    });
  });
}

/**
 * Send reaction emoji
 */
export async function sendReaction(emoji: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!socket || !isConnected || !currentRoomId) {
      return resolve(false);
    }

    socket.emit('reaction', { roomId: currentRoomId, emoji }, (response: any) => {
      resolve(response.success);
    });
  });
}

// ═══════════════════════════════════════════════════════════
// Event Listeners
// ═══════════════════════════════════════════════════════════

type RoomEventCallback = (room: RemoteRoom) => void;
type PlayerEventCallback = (player: RemotePlayer) => void;
type AnswerEventCallback = (answer: AnswerSubmission) => void;
type ChatEventCallback = (msg: ChatMessage) => void;
type ReactionEventCallback = (reaction: GameReaction) => void;
type RankingEventCallback = (ranking: RemotePlayer[]) => void;

const eventListeners = {
  'room-created': [] as RoomEventCallback[],
  'player-joined': [] as PlayerEventCallback[],
  'player-left': [] as ((playerId: string) => void)[],
  'game-started': [] as RoomEventCallback[],
  'game-finished': [] as ((data: { room: RemoteRoom; ranking: RemotePlayer[] }) => void)[],
  'answer-submitted': [] as AnswerEventCallback[],
  'chat-received': [] as ChatEventCallback[],
  'reaction-received': [] as ReactionEventCallback[],
  'host-changed': [] as ((hostId: string) => void)[],
  'room-closed': [] as (() => void)[],
  'question-changed': [] as ((data: { questionNumber: number; totalQuestions: number }) => void)[],
};

/**
 * Subscribe to room creation event
 */
export function onRoomCreated(callback: RoomEventCallback): void {
  eventListeners['room-created'].push(callback);
  socket?.on('room-created', callback);
}

/**
 * Subscribe to player joined event
 */
export function onPlayerJoined(callback: PlayerEventCallback): void {
  eventListeners['player-joined'].push(callback);
  socket?.on('player-joined', (data: { player: RemotePlayer }) => callback(data.player));
}

/**
 * Subscribe to player left event
 */
export function onPlayerLeft(callback: (playerId: string) => void): void {
  eventListeners['player-left'].push(callback);
  socket?.on('player-left', (data: { playerId: string }) => callback(data.playerId));
}

/**
 * Subscribe to game started event
 */
export function onGameStarted(callback: RoomEventCallback): void {
  eventListeners['game-started'].push(callback);
  socket?.on('game-started', (data: { room: RemoteRoom }) => callback(data.room));
}

/**
 * Subscribe to game finished event
 */
export function onGameFinished(callback: (data: { room: RemoteRoom; ranking: RemotePlayer[] }) => void): void {
  eventListeners['game-finished'].push(callback);
  socket?.on('game-finished', callback);
}

/**
 * Subscribe to answer submitted event
 */
export function onAnswerSubmitted(callback: AnswerEventCallback): void {
  eventListeners['answer-submitted'].push(callback);
  socket?.on('answer-submitted', callback);
}

/**
 * Subscribe to chat message event
 */
export function onChatMessage(callback: ChatEventCallback): void {
  eventListeners['chat-received'].push(callback);
  socket?.on('chat-received', callback);
}

/**
 * Subscribe to reaction event
 */
export function onReaction(callback: ReactionEventCallback): void {
  eventListeners['reaction-received'].push(callback);
  socket?.on('reaction-received', callback);
}

/**
 * Subscribe to host changed event
 */
export function onHostChanged(callback: (hostId: string) => void): void {
  eventListeners['host-changed'].push(callback);
  socket?.on('host-changed', (data: { newHostId: string }) => callback(data.newHostId));
}

/**
 * Subscribe to room closed event
 */
export function onRoomClosed(callback: () => void): void {
  eventListeners['room-closed'].push(callback);
  socket?.on('room-closed', callback);
}

/**
 * Subscribe to question changed event
 */
export function onQuestionChanged(callback: (data: { questionNumber: number; totalQuestions: number }) => void): void {
  eventListeners['question-changed'].push(callback);
  socket?.on('question-changed', callback);
}

// ═══════════════════════════════════════════════════════════
// Connection Status
// ═══════════════════════════════════════════════════════════

export function getConnectionStatus(): {
  isConnected: boolean;
  useFallback: boolean;
  serverUrl?: string;
} {
  return {
    isConnected,
    useFallback: useFallbackMode,
    serverUrl: socket?.io.uri,
  };
}

/**
 * Cleanup on unmount
 */
export function cleanupSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentRoomId = null;
    isConnected = false;
  }
}
