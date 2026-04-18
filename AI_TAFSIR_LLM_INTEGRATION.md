# AI Tafsir LLM Integration Guide

## Overview

This guide shows how to add **real LLM integration** (Google Gemini, OpenAI) to your existing AI Tafsir system.

**Features:**
- Real-time streaming via Server-Sent Events (SSE)
- Advanced prompt engineering with safety guardrails
- Intelligent response caching with versioning
- Rate limiting & quota management
- Cost tracking
- Graceful fallback to pre-seeded database

**New Files Created:**
1. `src/lib/llmTafsir.ts` — LLM API integration (Gemini, OpenAI)
2. `src/lib/llmTafsirStream.ts` — SSE streaming & server endpoint
3. `src/lib/useAiTafsirLLM.ts` — React hooks for LLM
4. `src/components/AiTafsirPanelEnhanced.tsx` — Example integration

---

## Quick Start (5 minutes)

### Step 1: Get API Keys

**Google Gemini:**
- Visit https://aistudio.google.com/apikey
- Create a new API key
- Copy to `.env.local`: `NEXT_PUBLIC_GEMINI_API_KEY=your_key_here`

**OpenAI:**
- Visit https://platform.openai.com/api-keys
- Create a new API key
- Copy to `.env.local`: `OPENAI_API_KEY=your_key_here`

### Step 2: Add Environment Variables

```bash
# .env.local
NEXT_PUBLIC_GEMINI_API_KEY=gm-abc123...
OPENAI_API_KEY=sk-proj-abc123...
LLM_PROVIDER=gemini  # or 'openai'
LLM_MODEL=gemini-2.0-flash  # or 'gpt-3.5-turbo'
ADMIN_KEY=your-admin-secret-for-stats
```

### Step 3: Update Your Component

Replace calls to `generateAiTafsir()` with the new hook:

```typescript
// OLD (local pre-seeded only)
const response = generateAiTafsir(surah, ayah, verseText, dialect);

// NEW (with LLM)
const { text, isStreaming, streamTafsir, cost } = useAiTafsirLLM({
  provider: 'gemini',
  apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
});

await streamTafsir(surah, ayah, dialect);
```

### Step 4: Test

```bash
npm run dev
# Visit http://localhost:3000
# Select verse → Click "Explain Simply"
# Watch real-time streaming generation
```

---

## Architecture

### Flow Diagram

```
┌─────────────────────┐
│  React Component    │
│  (AiTafsirPanel)    │
└──────────┬──────────┘
           │
           │ useAiTafsirLLM()
           │
    ┌──────▼───────┐
    │ Check Cache? │ ──YES─→ (Return cached)
    └──────┬───────┘
           │ NO
           │
    ┌──────▼──────────────┐
    │ Stream SSE from     │
    │ /api/tafsir/stream  │
    └──────┬──────────────┘
           │
    ┌──────▼────────────────────┐
    │ Server Endpoint            │
    │ 1. Validate API key        │
    │ 2. Check rate limit        │
    │ 3. Call LLM API (Gemini)   │
    │ 4. Stream via EventSource  │
    └──────┬────────────────────┘
           │
    ┌──────▼────────────────────┐
    │ LLM Response              │
    │ - Progressive chunks      │
    │ - Token count             │
    │ - Cost calculation        │
    │ - Source extraction       │
    └──────┬────────────────────┘
           │
    ┌──────▼──────────────────────┐
    │ Client (useAiTafsirLLM hook)│
    │ - onChunk: update UI         │
    │ - onComplete: cache result   │
    │ - onError: fallback to local │
    │ - onQuotaWarning: alert user │
    └─────────────────────────────┘
```

---

## Detailed Integration

### 1. Install Dependencies

No new npm packages needed! We use:
- Built-in `fetch()` for API calls
- Browser `EventSource` API for SSE
- `localStorage` for caching

### 2. Setup Environment

```bash
# Create .env.local if not exist
cat > .env.local << 'EOF'
# Google Gemini
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key_here

# OR OpenAI
OPENAI_API_KEY=your_openai_key_here

# Server config
LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.0-flash
ADMIN_KEY=your-secret-admin-key
EOF
```

### 3. Create Backend Endpoint

If using Node.js/Express server:

```typescript
// server/routes/tafsir.ts
import { createTafsirStreamRoute } from '@/lib/llmTafsirStream';

app.get('/api/tafsir/stream', (req, res) => {
  const { surah, ayah, dialect, provider } = req.query;
  const apiKey = req.headers['x-api-key'] || process.env.LLM_API_KEY;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Stream response (see llmTafsirStream.ts)
});
```

### 4. Use in React Component

**Option A: Use Provided Hook**

```typescript
import { useAiTafsirLLM } from '@/lib/useAiTafsirLLM';

export function MyTafsirComponent() {
  const { text, isStreaming, streamTafsir, cost } = useAiTafsirLLM({
    provider: 'gemini',
    apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    onChunk: (chunk) => console.log('New:', chunk),
    onComplete: (full, cost) => console.log(`Done! Cost: $${cost}`),
    onError: (err) => console.error('Error:', err),
  });

  return (
    <>
      <button onClick={() => streamTafsir(2, 255, 'egyptian')}>
        Explain Verse 2:255
      </button>
      <div>{text}</div>
      {isStreaming && <p>⏳ Generating...</p>}
      {cost > 0 && <p>Cost: ${cost.toFixed(6)}</p>}
    </>
  );
}
```

**Option B: Call API Directly**

```typescript
// Without hook (manual control)
const response = await fetch(
  '/api/tafsir/stream?surah=2&ayah=255&dialect=egyptian&provider=gemini',
  {
    headers: {
      'X-API-Key': process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    },
  }
);

const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const text = new TextDecoder().decode(value);
  console.log(text); // SSE events
}
```

### 5. Update Existing AiTafsirPanel

```typescript
// src/components/AiTafsirPanel.tsx
import { useAiTafsirLLM } from '@/lib/useAiTafsirLLM';

export default function AiTafsirPanel({ verseContext }) {
  const [useLLM, setUseLLM] = useState(false);

  // Use LLM if enabled, otherwise fallback
  const hook = useLLM 
    ? useAiTafsirLLM({ provider: 'gemini', apiKey: ... })
    : useAiTafsirFallback();

  const handleGenerate = async () => {
    await hook.streamTafsir(surah, ayah, dialect);
  };

  return (
    <>
      <label>
        <input
          type="checkbox"
          checked={useLLM}
          onChange={(e) => setUseLLM(e.target.checked)}
        />
        Use Advanced AI (requires API key)
      </label>

      <button onClick={handleGenerate} disabled={hook.isStreaming}>
        {hook.isStreaming ? 'Generating...' : 'Explain'}
      </button>

      <div>{hook.text}</div>
      {hook.cost > 0 && <p>Cost: ${hook.cost.toFixed(6)}</p>}
    </>
  );
}
```

---

## Advanced: Prompt Engineering

The system uses sophisticated prompts to ensure accuracy:

```typescript
// src/lib/llmTafsir.ts
buildSystemPrompt(dialect, safetyLevel)
// Returns: Complete system instruction with guardrails

buildUserPrompt(surah, ayah, verseText)
// Returns: Formatted user request with context
```

**System Prompt includes:**

✅ **Rules Enforced:**
- Only use trusted tafsir sources (Ibn Kathir, Al-Sa'di, etc.)
- No invented hadith
- No fatwas or legal rulings
- Stay in Quranic context
- Always cite sources

✅ **Safety Levels:**
- `strict`: Paranoid checking (recommended)
- `moderate`: Balanced
- `permissive`: Trust the model more

✅ **Dialect Support:**
- Egyptian colloquial (عامية مصرية)
- Modern Standard Arabic (فصحى مبسطة)

Example:

```typescript
// Custom prompt for advanced use case
const systemPrompt = buildSystemPrompt('egyptian', 'strict');

const userPrompt = `
اشرح لي الآية الكريمة بكل بساطة:

📖 **السورة:** 2
📖 **الآية:** 255
📖 **النص:** "الله لا إله إلا هو الحي القيوم..."

المطلوب:
1. شرح مبسّط (2-3 فقرات)
2. المعنى الرئيسي بكلمة واحدة
3. الفائدة العملية
4. نسب التفسير للمصادر
`;

const response = await callGeminiAPI(apiKey, systemPrompt, userPrompt);
```

---

## Caching Strategy

Responses are cached with versioning:

```typescript
// Cache key structure:
// tafsir-llm:{surah}:{ayah}:{dialect}:{version}
// Example: tafsir-llm:2:255:egyptian:1.0.0

// Auto-cached after generation
cacheTafsir(
  surah, ayah, dialect,
  text, sources,
  'gemini', 'gemini-2.0-flash',
  cost
);

// Invalidated after 7 days or version bump
// To update cache strategy, increment CACHE_VERSION
const CACHE_VERSION = '1.0.0';
```

**Cache Hit Speed:** ~0ms (vs 3-5s for LLM generation)

---

## Rate Limiting & Quotas

**Per-Client Limits:**
- Daily: 100 requests
- Monthly: 1000 requests

**Check Quota:**

```typescript
const { checkQuota } = useAiTafsirLLM({...});
await checkQuota();

// Returns:
// {
//   daily: { limit, used, remaining },
//   monthly: { limit, used, remaining },
//   resetAt: ISO timestamp
// }
```

**Admin Stats:**

```bash
curl -H "X-Admin-Key: your-admin-key" \
  http://localhost:3000/api/tafsir/stats

# Returns:
# {
#   totalRequests: 1234,
#   totalTokensUsed: 45000,
#   totalCost: $2.34,
#   cacheHitRate: 65.4,
#   requestsByProvider: { gemini: 800, openai: 434 }
# }
```

---

## Cost Tracking

Each response includes cost calculation:

```typescript
// Gemini 2.0 Flash (recommended)
// Prompt: $0.075 per 1M tokens
// Completion: $0.30 per 1M tokens

// Example:
// - Prompt: 150 tokens → $0.000011
// - Completion: 350 tokens → $0.000105
// - Total: $0.000116 (~0.1 cents per verse)

// For 10,000 verses per month: ~$1.16
```

**Cost Model:**

```typescript
// src/lib/llmTafsir.ts
const modelInfo = LLM_MODELS.gemini['gemini-2.0-flash'];
const cost = 
  (promptTokens / 1000) * modelInfo.costPer1kPrompt +
  (completionTokens / 1000) * modelInfo.costPer1kCompletion;
```

---

## Error Handling & Fallback

Automatically graceful degrades:

```typescript
// If LLM fails → automatically use pre-seeded database
const { streamTafsir } = useAiTafsirLLM({
  onError: (error) => {
    // Handle error or switch provider
    console.error('LLM failed:', error);
    // Optionally fallback to local:
    // useAiTafsirFallback().streamTafsir(...)
  },
});
```

**Error Types:**
- Network timeout
- API rate limit
- Invalid API key
- Malformed response

---

## Testing

### Test 1: Basic Stream

```typescript
const hook = useAiTafsirLLM({
  provider: 'gemini',
  apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
});

await hook.streamTafsir(1, 1, 'egyptian'); // Surah Al-Fatihah
// Check: text progressively fills, cost updates, no errors
```

### Test 2: Cache Hit

```typescript
// First call (cache miss)
await hook.streamTafsir(1, 1, 'egyptian');
// Takes ~3-5 seconds

// Second call (cache hit)
await hook.streamTafsir(1, 1, 'egyptian');
// Takes ~0ms, UI instant
```

### Test 3: Quota Exhaustion

```typescript
// Make 101 requests in same day
for (let i = 0; i < 101; i++) {
  await hook.streamTafsir(i % 114 + 1, 1, 'egyptian');
}
// 101st request should fail with quota error
```

### Test 4: Provider Switching

```typescript
// Gemini
const gemini = useAiTafsirLLM({ provider: 'gemini', apiKey: gmKey });
await gemini.streamTafsir(2, 255, 'egyptian');

// OpenAI
const openai = useAiTafsirLLM({ provider: 'openai', apiKey: oaiKey });
await openai.streamTafsir(2, 255, 'egyptian');

// Both should produce similar results
```

---

## Deployment

### Vercel (Recommended)

```bash
# Set environment variables in Vercel dashboard
# Settings → Environment Variables

NEXT_PUBLIC_GEMINI_API_KEY=gm-...
OPENAI_API_KEY=sk-...
LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.0-flash
ADMIN_KEY=secret-admin-key

# Deploy
git push origin main  # Automatic deployment
```

### Self-Hosted

```bash
# 1. Build
npm run build

# 2. Start
npm start

# 3. Environment setup
export NEXT_PUBLIC_GEMINI_API_KEY=gm-...
export LLM_PROVIDER=gemini
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t al-mushaf .
docker run -e NEXT_PUBLIC_GEMINI_API_KEY=gm-... al-mushaf
```

---

## Troubleshooting

**Q: Getting "Missing API key" error**
A: Set `NEXT_PUBLIC_GEMINI_API_KEY` or `OPENAI_API_KEY` in `.env.local`

**Q: Streaming stops after 1-2 chunks**
A: Check if EventSource is supported (should be in all modern browsers)

**Q: Cost seems high**
A: Use `gemini-2.0-flash` (cheaper) instead of `gpt-4` (~2% of cost)

**Q: Cache not working**
A: Check localStorage is enabled, clear cache with `localStorage.clear()`

**Q: Responses are generic/low quality**
A: Try `safety_level='permissive'` in prompt, or increase `maxTokens` to 2048

---

## Next Steps

1. **Add More Languages**: Extend `buildSystemPrompt()` for other Arabic dialects
2. **Add Analytics**: Track which verses are most popular
3. **Add Ratings**: Let users rate tafsir quality, improve prompts
4. **Add Customization**: Let users choose their preferred tafsir style
5. **Add Discussion**: Link to Islamic forums for deeper learning
6. **Add Audio**: Generate TTS for streamed responses
7. **Add Video**: Link to YouTube lectures for popular verses

---

## Cost Estimate

| Verses/Month | Gemini | OpenAI | Monthly Cost |
|---|---|---|---|
| 100 | ~6¢ | ~15¢ | < $1 |
| 1,000 | ~60¢ | $1.50 | ~$2 |
| 10,000 | ~$6 | $15 | ~$20 |
| 100,000 | ~$60 | $150 | ~$200 |

*Prices with Gemini 2.0 Flash (recommended)*

---

## Support

- **Issues?** Check the troubleshooting section above
- **Want to contribute?** Fork the repo and submit a PR
- **Have suggestions?** Open a GitHub issue
- **Need help?** Review the code comments in `src/lib/llmTafsir.ts`
