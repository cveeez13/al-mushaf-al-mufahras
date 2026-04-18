# 🎯 Multiplayer Quiz Socket.io Integration Guide

## Overview

This guide shows how to integrate the **Socket.io-based cross-device multiplayer system** into your existing Kahoot-style quiz. The new system enables:

✅ **Real cross-device multiplayer** (not just same-browser)
✅ **Advanced game modes** (Team, Lightning, Time Attack, Tournament)
✅ **In-game chat & reactions**
✅ **ELO ranking system**
✅ **Analytics & achievement tracking**
✅ **Fallback to BroadcastChannel** if server unavailable

---

## Architecture

```
┌─────────────────────────────────────┐
│     Al-Mushaf Quiz Frontend         │
│  (Next.js 14 + React + TypeScript)  │
└──────────────┬──────────────────────┘
               │
               ├─► Socket.io Connection
               │   (multiplayerQuizSocket.ts)
               │
               ├─► BroadcastChannel Fallback
               │   (original multiplayerQuiz.ts)
               │
               └─► Advanced Game Modes
                   (advancedGameModes.ts)
                   
┌─────────────────────────────────────┐
│   Al-Mushaf Quiz Server             │
│   (Node.js + Express + Socket.io)   │
│   (server/index.ts)                 │
└─────────────────────────────────────┘
   │
   ├─ Room Management
   ├─ Game State Sync
   ├─ Player Scoring
   ├─ Tournament Bracket
   └─ ELO Rankings
```

---

## Setup Steps

### Phase 1: Install Server Dependencies

```bash
cd server
npm install
```

Required packages:
- `express` - Web server
- `socket.io` - Real-time communication
- `cors` - Cross-origin requests
- `uuid` - ID generation
- `ioredis` - (Optional) Redis for production scaling

### Phase 2: Configure Environment Variables

**server/.env**
```env
PORT=4000
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
NODE_ENV=development
```

**src/.env.local** (already configured)
```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

### Phase 3: Start the Server

```bash
# Development mode (with auto-reload)
cd server
npm run dev

# Output:
# 🎯 Al-Mushaf Quiz Server running on port 4000
# 📡 WebSocket endpoint: ws://localhost:4000
# 🏥 Health check: http://localhost:4000/health
```

### Phase 4: Update MultiplayerQuizPanel Component

Replace the **BroadcastChannel initialization** with **Socket.io initialization**:

```typescript
// src/components/MultiplayerQuizPanel.tsx

'use client';
import { useEffect } from 'react';
import {
  initializeSocket,
  createRoomRemote,
  joinRoomRemote,
  submitAnswerRemote,
  onGameFinished,
  onAnswerSubmitted,
  getConnectionStatus,
  cleanupSocket,
} from '@/lib/multiplayerQuizSocket';

export default function MultiplayerQuizPanel() {
  const ar = useI18n().lang === 'ar';

  // Initialize Socket connection on mount
  useEffect(() => {
    (async () => {
      const connected = await initializeSocket();
      if (!connected) {
        console.warn('Using BroadcastChannel fallback');
        // Falls back to existing BroadcastChannel code
      }
    })();

    // Cleanup on unmount
    return () => cleanupSocket();
  }, []);

  // Subscribe to game events
  useEffect(() => {
    onGameFinished(({ room, ranking }) => {
      setScreen('results');
      // Show results
    });

    onAnswerSubmitted(({ playerId, correct, points, score }) => {
      // Update player scores in real-time
    });
  }, []);

  // Create room (modified)
  const createRoom = async () => {
    const result = await createRoomRemote({
      name: myName,
      avatar: myAvatar,
      gameMode: 'classic', // or 'team', 'lightning', 'timeAttack'
      isPrivate: false,
    });

    if (result.success) {
      setGameState(result.room);
      setScreen('lobby');
    } else {
      // Fallback to BroadcastChannel if Socket.io fails
      useLocalBroadcastChannel();
    }
  };

  // Join room (modified)
  const joinRoom = async () => {
    const result = await joinRoomRemote({
      code: joinCode,
      name: myName,
      avatar: myAvatar,
    });

    if (result.success) {
      setGameState(result.room);
      setScreen('lobby');
    }
  };

  // Submit answer (modified)
  const submitAnswer = async (selectedIndex: number) => {
    const timeMs = Date.now() - questionStartRef.current;
    
    const result = await submitAnswerRemote({
      questionId: gameState.currentQuestion,
      selectedIndex,
      timeMs,
    });

    if (result.success) {
      setSelectedAnswer(selectedIndex);
      setAnswered(true);
    }
  };

  // Rest of component...
}
```

### Phase 5: Add Advanced Game Mode Support

```typescript
// In MultiplayerQuizPanel, add game mode selection:

const [gameMode, setGameMode] = useState<GameMode>('classic');

// Menu screen (add mode selector)
if (screen === 'menu') {
  return (
    <div>
      {/* Game Mode Selection */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {(['classic', 'team', 'lightning', 'timeAttack'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setGameMode(mode)}
            className={`py-2 rounded-lg ${
              gameMode === mode
                ? 'bg-[var(--color-mushaf-gold)] text-white'
                : 'bg-[var(--color-mushaf-border)]/20'
            }`}
          >
            {mode === 'classic' ? '🎮 Classic'}
            {mode === 'team' ? '👥 Team'}
            {mode === 'lightning' ? '⚡ Lightning'}
            {mode === 'timeAttack' ? '⏱️ Time Attack'}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Phase 6: Implement Game Mode Logic

**For Team Mode:**
```typescript
import { Team, createTeam, addPlayerToTeam, addTeamScore, getTeamRanking } from '@/lib/advancedGameModes';

const [teams, setTeams] = useState<Team[]>([]);

// Create teams on game start
const startGame = () => {
  const numTeams = gameState.players.length > 4 ? 4 : 2;
  const newTeams = [
    createTeam('team-1', 'Red Team', 'var(--color-topic-red)'),
    createTeam('team-2', 'Blue Team', 'var(--color-topic-blue)'),
  ];

  // Distribute players to teams
  let teamIndex = 0;
  gameState.players.forEach(player => {
    addPlayerToTeam(newTeams[teamIndex % numTeams], player.id);
    teamIndex++;
  });

  setTeams(newTeams);
  // Start game...
};

// On answer, update team score
const handleAnswer = (playerId: string, correct: boolean, points: number) => {
  const playerTeam = teams.find(t => t.players.includes(playerId));
  if (playerTeam) {
    addTeamScore(playerTeam, points, correct);
  }
};
```

**For Lightning Round:**
```typescript
import { LIGHTNING_PRESETS, calculateLightningPoints } from '@/lib/advancedGameModes';

const [lightningMode, setLightningMode] = useState(LIGHTNING_PRESETS[0]);

const calculatePoints = (correct: boolean, timeMs: number, timeLimitMs: number) => {
  return calculateLightningPoints(correct, timeMs, timeLimitMs, lightningMode.pointsMultiplier);
};
```

**For Time Attack:**
```typescript
import { TIME_ATTACK_DIFFICULTIES, updateTimeAttackTime } from '@/lib/advancedGameModes';

const [timeLeft, setTimeLeft] = useState(TIME_ATTACK_DIFFICULTIES.medium.initialTime);
const [config] = useState(TIME_ATTACK_DIFFICULTIES.medium);

// On answer
const handleTimeAttackAnswer = (correct: boolean) => {
  const newTime = updateTimeAttackTime(timeLeft, correct, config);
  setTimeLeft(newTime);

  if (newTime <= 0) {
    endGame(); // Player ran out of time
  }
};
```

### Phase 7: Add Chat & Reactions

```typescript
import { sendChatMessage, sendReaction, onChatMessage, onReaction } from '@/lib/multiplayerQuizSocket';

const [messages, setMessages] = useState<ChatMessage[]>([]);
const [chatInput, setChatInput] = useState('');

// Subscribe to chat
useEffect(() => {
  onChatMessage(msg => {
    setMessages(prev => [...prev, msg]);
  });

  onReaction(reaction => {
    // Show floating emoji reaction
    showReaction(reaction.emoji);
  });
}, []);

// Send message
const handleSendMessage = async () => {
  if (!chatInput.trim()) return;
  const success = await sendChatMessage(chatInput);
  if (success) {
    setChatInput('');
  }
};

// Send reaction
const handleReaction = (emoji: string) => {
  sendReaction(emoji);
};

// Render chat
return (
  <div className="chat-panel">
    <div className="messages-list">
      {messages.map((msg, i) => (
        <div key={i} className="message">
          <span className="player-name">{msg.playerName}</span>
          <span className="text">{msg.message}</span>
        </div>
      ))}
    </div>
    
    <input
      value={chatInput}
      onChange={e => setChatInput(e.target.value)}
      placeholder="Type a message..."
    />

    {/* Quick reactions */}
    <div className="reactions">
      {['🔥', '👏', '💯', '😂'].map(emoji => (
        <button key={emoji} onClick={() => handleReaction(emoji)}>
          {emoji}
        </button>
      ))}
    </div>
  </div>
);
```

### Phase 8: Add Analytics & Metrics

```typescript
import { calculateMetrics, checkAchievements } from '@/lib/advancedGameModes';

const recordGameMetrics = (gameEnd: GameEndData) => {
  const metrics = calculateMetrics(
    gameEnd.gameId,
    playerId,
    gameMode,
    startTime,
    Date.now(),
    myAnswers,
    myScore,
    myRank,
    eloChange,
  );

  // Save to localStorage or backend
  localStorage.setItem(`game-metrics-${metrics.gameId}`, JSON.stringify(metrics));

  // Check achievements
  const unlocked = checkAchievements(metrics);
  if (unlocked.length > 0) {
    showAchievements(unlocked);
  }
};
```

---

## Connection Fallback Strategy

The system automatically falls back to **BroadcastChannel** if:
- Server is unreachable
- Network connection fails
- Socket.io initialization fails

```typescript
const status = getConnectionStatus();
// {
//   isConnected: boolean,
//   useFallback: boolean,
//   serverUrl?: string
// }

if (status.useFallback) {
  console.log('Using local BroadcastChannel for multiplayer');
  // Automatically uses existing multiplayerQuiz.ts code
}
```

---

## API Endpoints

### Health Check
```
GET http://localhost:4000/health
Response: { status: 'ok', timestamp: '2024-01-01T00:00:00Z' }
```

### Player Stats
```
GET http://localhost:4000/stats/player/:playerId
Response: { 
  gamesPlayed: 10,
  gamesWon: 6,
  totalPoints: 45000,
  elo: 1250,
  lastSeen: 1704067200000
}
```

### Leaderboard
```
GET http://localhost:4000/stats/leaderboard?limit=100
Response: [
  { playerId: 'abc123', gamesPlayed: 50, gamesWon: 35, elo: 1500 },
  ...
]
```

### Room Info
```
GET http://localhost:4000/rooms/:code
Response: {
  id: 'room-123',
  code: '1234',
  playerCount: 4,
  gameState: 'active',
  ...
}
```

---

## Testing Checklist

- [ ] Server starts without errors (`npm run dev` in `/server`)
- [ ] Client connects to server (`initializeSocket()` succeeds)
- [ ] Create room works (room code generated)
- [ ] Join room works (players synchronized)
- [ ] Answer submission updates scores in real-time
- [ ] Chat messages broadcast to all players
- [ ] Game finishes and shows rankings
- [ ] Fallback to BroadcastChannel works if server down
- [ ] Team mode distributes players correctly
- [ ] Lightning round multiplies points
- [ ] Time Attack countdown works
- [ ] ELO ratings update on game end
- [ ] Metrics saved to localStorage

---

## Deployment

### Local Testing
```bash
# Terminal 1: Start server
cd server && npm run dev

# Terminal 2: Start Next.js app
npm run dev

# Open http://localhost:3000
```

### Production Deployment

**Server (Node.js):**
```bash
# Build
npm run build

# Run
npm start

# Or use PM2:
pm2 start server/index.ts --name quiz-server
```

**Client (Next.js):**
```bash
# Deploy as usual
npm run build
npm start
```

**Environment Variables:**
- `NEXT_PUBLIC_SOCKET_URL=https://quiz-server.example.com`
- `CORS_ORIGIN=https://quiz.example.com`

---

## Performance Tips

1. **Use Redis in production** for room persistence
2. **Enable Socket.io adapter for clustering**
3. **Implement room limits** (max 100 players per room)
4. **Archive old metrics** to database after 30 days
5. **Use JWT tokens** for player authentication
6. **Rate limit messages** (max 10 messages/minute per player)
7. **Enable gzip compression** on server responses

---

## Troubleshooting

### Socket.io won't connect
```typescript
// Check browser console
const status = getConnectionStatus();
console.log(status); // Inspect connection details

// Verify server is running
// http://localhost:4000/health should return 200
```

### BroadcastChannel not working
```typescript
// Some browsers don't support BroadcastChannel (Safari)
// Check for available APIs:
console.log('BroadcastChannel:', typeof BroadcastChannel !== 'undefined');
```

### Rooms disappearing
```typescript
// Rooms are deleted when last player leaves
// Implement room persistence in production using Redis
```

### High latency
```typescript
// Check socket.io latency in DevTools
// Multiplayer tab → WebSockets → See frame headers
// If > 500ms, consider using server closer to users
```

---

## Architecture Benefits

| Feature | BroadcastChannel | Socket.io |
|---------|------------------|-----------|
| Cross-device | ❌ | ✅ |
| Cross-browser tab | ✅ | ✅ |
| Real-time sync | ~5s delay | <100ms |
| Spectators | ❌ | ✅ |
| Chat | ❌ | ✅ |
| Persistence | ❌ | ✅ |
| Scale | 1 device | Unlimited |
| Server required | ❌ | ✅ |

---

## Next Steps

1. ✅ Deploy server to production
2. ✅ Migrate players to Socket.io
3. ✅ Monitor ELO rankings & achievements
4. ✅ Add tournament bracket UI
5. ✅ Implement match replays/VODs
6. ✅ Add mobile app (React Native)

See `MULTIPLAYER_SOCKET_API_REFERENCE.md` for complete function documentation.
