# 📚 Multiplayer Socket.io API Reference

## Table of Contents
1. [Socket.io Client API](#socketio-client-api)
2. [Server API Endpoints](#server-api-endpoints)
3. [Advanced Game Modes API](#advanced-game-modes-api)
4. [Type Definitions](#type-definitions)
5. [Event Flow](#event-flow)
6. [Code Examples](#code-examples)

---

## Socket.io Client API

### Connection Management

#### `initializeSocket(serverUrl?: string): Promise<boolean>`

Initialize Socket.io connection to multiplayer server.

**Parameters:**
- `serverUrl` (optional): WebSocket server URL (defaults to `NEXT_PUBLIC_SOCKET_URL`)

**Returns:** Promise that resolves to `true` if connected, `false` if fallback mode activated

**Example:**
```typescript
import { initializeSocket } from '@/lib/multiplayerQuizSocket';

const connected = await initializeSocket('http://localhost:4000');
if (connected) {
  console.log('✅ Connected to multiplayer server');
} else {
  console.log('⚠️ Using BroadcastChannel fallback');
}
```

#### `cleanupSocket(): void`

Disconnect from server and cleanup resources.

**Example:**
```typescript
useEffect(() => {
  return () => cleanupSocket();
}, []);
```

#### `getConnectionStatus(): ConnectionStatus`

Get current connection status.

**Returns:**
```typescript
{
  isConnected: boolean;      // true if Socket.io connected
  useFallback: boolean;      // true if using BroadcastChannel
  serverUrl?: string;        // Server URL if connected
}
```

**Example:**
```typescript
const status = getConnectionStatus();
if (status.useFallback) {
  console.log('Running in local multiplayer mode');
}
```

---

### Room Management

#### `createRoomRemote(payload): Promise<CreateRoomResponse>`

Create a new game room on server.

**Parameters:**
```typescript
{
  name: string;              // Player name (2-20 chars)
  avatar: string;            // Emoji avatar
  gameMode: GameMode;        // 'classic' | 'team' | 'lightning' | 'timeAttack'
  isPrivate: boolean;        // If true, only joinable by code
}
```

**Returns:**
```typescript
{
  success: boolean;
  room?: RemoteRoom;         // Room object if successful
  error?: string;            // Error message if failed
}
```

**Example:**
```typescript
const result = await createRoomRemote({
  name: 'Ahmed',
  avatar: '🧑‍🎓',
  gameMode: 'classic',
  isPrivate: false,
});

if (result.success) {
  console.log(`Room created: ${result.room.code}`);
} else {
  console.error(result.error);
}
```

#### `joinRoomRemote(payload): Promise<JoinRoomResponse>`

Join an existing game room.

**Parameters:**
```typescript
{
  code: string;              // 4-digit room code
  name: string;              // Player name
  avatar: string;            // Emoji avatar
  asSpectator?: boolean;     // Join as spectator (view-only)
}
```

**Returns:** Same as `createRoomRemote`

**Example:**
```typescript
const result = await joinRoomRemote({
  code: '1234',
  name: 'Maryam',
  avatar: '👩‍🎓',
});
```

#### `leaveRoomRemote(): void`

Leave current room. If you're the host, leadership passes to next player.

**Example:**
```typescript
leaveRoomRemote();
console.log('✅ Left room');
```

---

### Game Control

#### `startGameRemote(): Promise<StartGameResponse>`

Start the game (host only). Generates questions and begins countdown.

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Requirements:**
- Must be room host
- Minimum 2 players required
- Returns error if conditions not met

**Example:**
```typescript
const result = await startGameRemote();
if (!result.success) {
  alert(result.error); // "Need at least 2 players"
}
```

#### `submitAnswerRemote(payload): Promise<SubmitAnswerResponse>`

Submit answer to current question.

**Parameters:**
```typescript
{
  questionId: number;        // Index of question (0-based)
  selectedIndex: number;     // Selected option (0-3)
  timeMs: number;            // Time taken to answer (ms)
}
```

**Returns:**
```typescript
{
  success: boolean;
  correct?: boolean;         // Whether answer is correct
  points?: number;           // Points earned (0 if wrong)
  error?: string;
}
```

**Example:**
```typescript
const startTime = Date.now();

// ... player selects answer ...

const result = await submitAnswerRemote({
  questionId: 0,
  selectedIndex: 2,
  timeMs: Date.now() - startTime,
});

if (result.success && result.correct) {
  console.log(`🎉 Correct! +${result.points} points`);
} else {
  console.log('❌ Wrong answer');
}
```

#### `nextQuestionRemote(): Promise<NextQuestionResponse>`

Advance to next question (host only).

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Auto-triggers:**
- When all players have answered
- Reveals previous answer first
- Shows leaderboard for 4 seconds
- Then displays countdown for next question

**Example:**
```typescript
const result = await nextQuestionRemote();
if (result.success) {
  console.log('Moving to next question...');
}
```

---

### Chat & Reactions

#### `sendChatMessage(message: string): Promise<boolean>`

Send chat message to all players in room.

**Parameters:**
- `message`: String (max 500 chars)

**Returns:** `true` if sent, `false` if failed

**Rate limits:** 10 messages per minute per player

**Example:**
```typescript
const sent = await sendChatMessage('Good luck everyone! 🍀');
if (sent) {
  console.log('Message sent');
}
```

#### `sendReaction(emoji: string): Promise<boolean>`

Send reaction emoji (non-verbal communication).

**Parameters:**
- `emoji`: Single emoji character

**Valid emojis:** 🔥 ⚡ 💯 👏 😂 🎉 🏆 💪 😅 🤔

**Returns:** `true` if sent, `false` if failed

**Example:**
```typescript
await sendReaction('🔥'); // "On fire!" reaction
```

---

### Event Listeners

#### `onRoomCreated(callback: (room: RemoteRoom) => void): void`

Subscribe to room creation event (fires after you create room).

**Example:**
```typescript
onRoomCreated((room) => {
  console.log(`🏠 Room created: ${room.code}`);
  console.log(`👥 Players: ${room.playerCount}/${room.maxPlayers}`);
});
```

#### `onPlayerJoined(callback: (player: RemotePlayer) => void): void`

New player joined your room.

**Example:**
```typescript
onPlayerJoined((player) => {
  console.log(`${player.avatar} ${player.name} joined!`);
});
```

#### `onPlayerLeft(callback: (playerId: string) => void): void`

Player left the room.

**Example:**
```typescript
onPlayerLeft((playerId) => {
  console.log(`Player left (${playerId})`);
});
```

#### `onGameStarted(callback: (room: RemoteRoom) => void): void`

Game has started (host clicked "Start").

**Example:**
```typescript
onGameStarted((room) => {
  console.log(`🎮 Game started! ${room.totalQuestions} questions`);
});
```

#### `onGameFinished(callback: (data: { room: RemoteRoom; ranking: RemotePlayer[] }) => void): void`

Game has finished. Contains final results and rankings.

**Example:**
```typescript
onGameFinished(({ room, ranking }) => {
  console.log('🏁 Game finished!');
  console.log(`1st: ${ranking[0].name} (${ranking[0].score} pts)`);
  console.log(`2nd: ${ranking[1].name} (${ranking[1].score} pts)`);
});
```

#### `onAnswerSubmitted(callback: (answer: AnswerSubmission) => void): void`

Another player submitted an answer.

**Parameters:**
```typescript
{
  playerId: string;
  correct: boolean;
  points: number;
  score: number;             // Updated total score
}
```

**Example:**
```typescript
onAnswerSubmitted(({ playerId, correct, points, score }) => {
  if (correct) {
    console.log(`${playerId} answered correctly! +${points}`);
  }
});
```

#### `onChatMessage(callback: (msg: ChatMessage) => void): void`

New chat message received.

**Parameters:**
```typescript
{
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;         // Unix timestamp
}
```

#### `onReaction(callback: (reaction: GameReaction) => void): void`

Player sent reaction emoji.

**Parameters:**
```typescript
{
  playerId: string;
  playerName: string;
  emoji: string;
  timestamp?: number;
}
```

#### `onHostChanged(callback: (hostId: string) => void): void`

Host left, new host assigned.

#### `onRoomClosed(callback: () => void): void`

Room was closed (last player left).

#### `onQuestionChanged(callback: (data: { questionNumber: number; totalQuestions: number }) => void): void`

Moving to next question.

---

## Server API Endpoints

### Health Check

```http
GET /health

Response:
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Player Statistics

```http
GET /stats/player/:playerId

Response:
{
  "gamesPlayed": 15,
  "gamesWon": 9,
  "totalPoints": 67500,
  "elo": 1350,
  "lastSeen": 1704067200000
}
```

### Global Leaderboard

```http
GET /stats/leaderboard?limit=100

Response:
[
  {
    "playerId": "abc123",
    "gamesPlayed": 50,
    "gamesWon": 35,
    "totalPoints": 250000,
    "elo": 1650,
    "lastSeen": 1704067200000
  },
  ...
]
```

### Room Information

```http
GET /rooms/:code

Response:
{
  "id": "room-123",
  "code": "1234",
  "hostId": "player-1",
  "playerCount": 4,
  "spectatorCount": 1,
  "maxPlayers": 8,
  "gameState": "active",
  "phase": "question",
  "gameMode": "classic",
  "currentQuestion": 3,
  "totalQuestions": 10,
  "startedAt": 1704067200000,
  "endedAt": null
}
```

---

## Advanced Game Modes API

### Team Mode

```typescript
import { Team, createTeam, addPlayerToTeam, addTeamScore } from '@/lib/advancedGameModes';

// Create teams
const team1 = createTeam('team-1', 'Red Team', 'var(--color-topic-red)');
const team2 = createTeam('team-2', 'Blue Team', 'var(--color-topic-blue)');

// Add players to teams
addPlayerToTeam(team1, 'player-1');
addPlayerToTeam(team1, 'player-2');
addPlayerToTeam(team2, 'player-3');
addPlayerToTeam(team2, 'player-4');

// Update team score
addTeamScore(team1, 500, true);  // +500 points for correct answer

// Get ranking
const ranking = getTeamRanking([team1, team2]);
```

### Lightning Round

```typescript
import { LIGHTNING_PRESETS, calculateLightningPoints } from '@/lib/advancedGameModes';

// Use preset
const mode = LIGHTNING_PRESETS[0]; // { name: 'Quick Fire', questionCount: 5, timePerQuestion: 5, pointsMultiplier: 2 }

// Calculate points (2x multiplier)
const points = calculateLightningPoints(true, 3000, 5000, mode.pointsMultiplier);
// Returns: 1000 * (1 - 3000/5000) * 2 = 400 points
```

### Time Attack

```typescript
import { TIME_ATTACK_DIFFICULTIES, updateTimeAttackTime } from '@/lib/advancedGameModes';

const config = TIME_ATTACK_DIFFICULTIES.medium;
// {
//   initialTime: 90,
//   timeAddedPerCorrect: 8,
//   timeReducedPerWrong: 8,
//   minTimePerQuestion: 3,
//   maxQuestions: 100
// }

let timeLeft = config.initialTime;

// Correct answer
timeLeft = updateTimeAttackTime(timeLeft, true, config);
// timeLeft becomes 98 seconds

// Wrong answer
timeLeft = updateTimeAttackTime(timeLeft, false, config);
// timeLeft becomes 90 seconds
```

### Tournament

```typescript
import { createTournament, recordTournamentMatch, getTournamentWinner } from '@/lib/advancedGameModes';

// Create single-elimination tournament
const tournament = createTournament(
  'Weekly Championship',
  ['player-1', 'player-2', 'player-3', 'player-4'],
  'single-elimination'
);

// Record match result
recordTournamentMatch(tournament, 'br-0-0', 5000, 4500);
// player-1 wins 5000-4500, advances to next round

// Get winner
const winner = getTournamentWinner(tournament);
```

### Achievements

```typescript
import { calculateMetrics, checkAchievements } from '@/lib/advancedGameModes';

const metrics = calculateMetrics(
  'game-123',
  'player-1',
  'classic',
  startTime,
  endTime,
  answers,
  finalScore,
  finalRank,
  eloChange
);

// Check which achievements were unlocked
const unlocked = checkAchievements(metrics);
// Returns: ['perfect-score', 'streak-10']

// Available achievements:
// - first-game: Complete your first game
// - perfect-score: Answer all questions correctly
// - streak-10: Get a 10-question streak
// - tournament-winner: Win a tournament
// - speed-demon: Average response < 3s
// - team-player: Win a team game
// - comeback-king: Win from 3+ points behind
// - streaky: Win 5 games in a row
```

---

## Type Definitions

```typescript
// Game Mode
type GameMode = 'classic' | 'team' | 'lightning' | 'timeAttack' | 'tournament';

// Game State
type GameState = 'waiting' | 'active' | 'paused' | 'finished';

// Game Phase
type GamePhase = 'idle' | 'lobby' | 'countdown' | 'question' | 'reveal' | 'leaderboard' | 'results';

// Remote Player
interface RemotePlayer {
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

// Remote Room
interface RemoteRoom {
  id: string;
  code: string;
  hostId: string;
  hostName: string;
  playerCount: number;
  spectatorCount: number;
  maxPlayers: number;
  gameState: GameState;
  phase: GamePhase;
  gameMode: GameMode;
  players: RemotePlayer[];
  spectators: RemotePlayer[];
  currentQuestion: number;
  totalQuestions: number;
  startedAt: number | null;
  endedAt: number | null;
}

// Chat Message
interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

// Game Metrics
interface GameMetrics {
  gameId: string;
  playerId: string;
  gameMode: string;
  startedAt: number;
  endedAt: number;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  finalScore: number;
  finalRank: number;
  avgResponseTime: number;
  maxStreak: number;
  eloChange: number;
}
```

---

## Event Flow

### Game Creation & Joining

```
Host                                Server                    Players
  │
  ├─ initializeSocket()
  │   └─────────────────────────────────►
  │                          Connected ◄──────────────────────┤
  │
  ├─ createRoomRemote()
  │   └─────────────────────────────────►
  │                        Room Created ◄──────────────────────┤
  │
  │◄─ onRoomCreated()
  │
  └─ broadcast room code
                                         Player 1
                                           │
                                           ├─ initializeSocket()
                                           ├─ joinRoomRemote(code: '1234')
                                           │   └───────────────────────►
                                           │         Player Joined ◄────┤
                                           │
                                           └─ onPlayerJoined()
```

### Game Play

```
Host                Server                Players
  │
  ├─ startGameRemote()
  │   └──────────────────────►
  │                  Game Started ◄──────────┤
  │
  ├─ Countdown (3-2-1)
  │
  ├─ Question Displayed
  │
  ├─────────────────────────────────────────► Player selects answer
  │                                                │
  │                                                ├─ submitAnswerRemote()
  │                                                └──────────────►
  │                          Answer Submitted ◄──────────────┤
  │
  │◄─ onAnswerSubmitted()
  │
  ├─ All players answered?
  │   └─ Yes: nextQuestionRemote()
  │   └─ No: Wait
  │
  ├─ Reveal Phase (show correct answer + scores)
  │
  ├─ Leaderboard (4 seconds)
  │
  └─ Repeat for next question...
```

### Game End

```
Game ends when all questions answered

  ├─ Calculate final rankings
  ├─ Update ELO ratings
  ├─ Check achievements
  ├─ Save metrics
  └─ onGameFinished({room, ranking})
```

---

## Code Examples

### Complete Game Loop Example

```typescript
import {
  initializeSocket,
  createRoomRemote,
  startGameRemote,
  submitAnswerRemote,
  nextQuestionRemote,
  onGameStarted,
  onAnswerSubmitted,
  onGameFinished,
} from '@/lib/multiplayerQuizSocket';

export function QuizGame() {
  const [gameState, setGameState] = useState(null);
  const [score, setScore] = useState(0);

  // Initialize on mount
  useEffect(() => {
    (async () => {
      await initializeSocket();
    })();
  }, []);

  // Create game
  const createGame = async () => {
    const result = await createRoomRemote({
      name: 'Ahmed',
      avatar: '🧑‍🎓',
      gameMode: 'classic',
      isPrivate: false,
    });

    if (result.success) {
      setGameState(result.room);
    }
  };

  // Start game (when ready)
  const handleStart = async () => {
    await startGameRemote();
  };

  // Answer question
  const handleAnswer = async (selectedIndex) => {
    const result = await submitAnswerRemote({
      questionId: gameState.currentQuestion,
      selectedIndex,
      timeMs: Date.now() - questionStartTime,
    });

    if (result.correct) {
      setScore(s => s + result.points);
    }
  };

  // Listen for game events
  useEffect(() => {
    onGameStarted((room) => {
      setGameState(room);
    });

    onAnswerSubmitted(({ correct, points }) => {
      if (correct) {
        showNotification(`+${points} points!`);
      }
    });

    onGameFinished(({ ranking }) => {
      showResults(ranking);
    });
  }, []);

  return (
    <div>
      {!gameState && <button onClick={createGame}>Create Game</button>}
      {gameState?.phase === 'lobby' && (
        <button onClick={handleStart}>Start Game</button>
      )}
      {gameState?.phase === 'question' && (
        <QuestionDisplay onAnswer={handleAnswer} />
      )}
      {gameState?.phase === 'results' && (
        <ResultsScreen />
      )}
    </div>
  );
}
```

### Team Mode Example

```typescript
import { createTeam, addPlayerToTeam, addTeamScore } from '@/lib/advancedGameModes';

const teams = [
  createTeam('team-1', 'Team A', 'red'),
  createTeam('team-2', 'Team B', 'blue'),
];

// Distribute players
gameState.players.forEach((player, i) => {
  const team = teams[i % 2];
  addPlayerToTeam(team, player.id);
});

// On answer
onAnswerSubmitted(({ playerId, correct, points }) => {
  const playerTeam = teams.find(t => t.players.includes(playerId));
  if (playerTeam) {
    addTeamScore(playerTeam, points, correct);
    updateTeamDisplay(teams);
  }
});
```

See `MULTIPLAYER_SOCKET_INTEGRATION.md` for setup instructions.
