# AI Tafsir LLM — Complete API Reference

## Table of Contents

1. [LLM Integration API](#llm-integration-api)
2. [React Hooks](#react-hooks)
3. [Server Endpoints](#server-endpoints)
4. [Types & Interfaces](#types--interfaces)
5. [Examples](#examples)

---

## LLM Integration API

### `llmTafsir.ts` — Core LLM Functions

#### `buildSystemPrompt()`

**Purpose:** Generate system prompt with safety guardrails

```typescript
function buildSystemPrompt(
  dialect: 'egyptian' | 'msa',
  safetyLevel: ContentSafetyLevel = 'strict',
): string
```

**Parameters:**
- `dialect`: Language variant
  - `'egyptian'` — Egyptian colloquial (عامية مصرية)
  - `'msa'` — Modern Standard Arabic (فصحى مبسطة)
- `safetyLevel`: Content safety level
  - `'strict'` — Paranoid checking (default, recommended)
  - `'moderate'` — Balanced trust
  - `'permissive'` — Higher freedom

**Returns:** Complete system prompt string

**Example:**
```typescript
const prompt = buildSystemPrompt('egyptian', 'strict');
// Returns: "أنت مفسّر قرآني متخصص. تشرح آيات القرآن الكريم..."
```

**Safety Features Included:**
✓ Tafsir source attribution (5 sources)
✓ Hadith fabrication prevention
✓ Fatwa prohibition
✓ Context constraints
✓ Scholarly attribution

---

#### `buildUserPrompt()`

**Purpose:** Format user request for a specific verse

```typescript
function buildUserPrompt(
  surah: number,
  ayah: number,
  verseText: string,
  previousContext?: string,
): string
```

**Parameters:**
- `surah`: Surah number (1-114)
- `ayah`: Ayah number in surah
- `verseText`: Full Arabic verse text
- `previousContext`: Optional context from previous verses

**Returns:** Formatted user prompt string

**Example:**
```typescript
const prompt = buildUserPrompt(
  2, 255,
  'الله لا إله إلا هو الحي القيوم',
  undefined
);
// Returns: "اشرح لي الآية الكريمة بكل بساطة:\n📖 **السورة:** 2..."
```

---

#### `callGeminiAPI()`

**Purpose:** Call Google Gemini API for tafsir generation

```typescript
async function callGeminiAPI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  model: string = 'gemini-2.0-flash',
): Promise<LLMResponse>
```

**Parameters:**
- `apiKey`: Google Gemini API key
- `systemPrompt`: System instruction (from `buildSystemPrompt()`)
- `userPrompt`: User request (from `buildUserPrompt()`)
- `model`: Gemini model ID
  - `'gemini-2.0-flash'` — Recommended (fastest, cheapest)
  - `'gemini-1.5-pro'` — Higher quality, slower

**Returns:** `LLMResponse`

**LLMResponse:**
```typescript
{
  text: string,                    // Generated tafsir
  sources: string[],               // Mentioned classical sources
  tokensUsed: {
    prompt: number,
    completion: number,
    total: number,
  },
  cost: number,                    // In USD
  model: string,
  provider: 'gemini',
  timestamp: number,
}
```

**Example:**
```typescript
const response = await callGeminiAPI(
  'gm-abc123...',
  systemPrompt,
  userPrompt,
  'gemini-2.0-flash',
);

console.log(response.text);    // "الآية الكريمة تتحدث عن..."
console.log(response.cost);    // 0.000115 (USD)
```

---

#### `callOpenAIAPI()`

**Purpose:** Call OpenAI ChatGPT API

```typescript
async function callOpenAIAPI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  model: string = 'gpt-3.5-turbo',
): Promise<LLMResponse>
```

**Parameters:**
- `apiKey`: OpenAI API key (starts with `sk-`)
- `systemPrompt`: System instruction
- `userPrompt`: User request
- `model`: OpenAI model ID
  - `'gpt-3.5-turbo'` — Recommended (fast, cheap)
  - `'gpt-4-turbo'` — Most capable, expensive

**Returns:** `LLMResponse` (same structure as Gemini)

**Example:**
```typescript
const response = await callOpenAIAPI(
  'sk-proj-abc123...',
  systemPrompt,
  userPrompt,
  'gpt-3.5-turbo',
);
```

---

#### `streamGeminiResponse()`

**Purpose:** Stream Gemini response using AsyncGenerator

```typescript
async function* streamGeminiResponse(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  model: string = 'gemini-2.0-flash',
): AsyncGenerator<StreamEvent>
```

**Parameters:** Same as `callGeminiAPI()`

**Yields:** `StreamEvent` objects
```typescript
type StreamEvent = {
  type: 'start' | 'chunk' | 'sources' | 'complete' | 'error',
  data: {
    text?: string,
    sources?: string[],
    error?: string,
    tokensUsed?: { prompt, completion, total },
    cost?: number,
  },
}
```

**Example:**
```typescript
for await (const event of streamGeminiResponse(apiKey, sysPrompt, userPrompt)) {
  if (event.type === 'chunk') {
    console.log('New text:', event.data.text);
  } else if (event.type === 'complete') {
    console.log('Done! Cost:', event.data.cost);
  } else if (event.type === 'error') {
    console.error('Error:', event.data.error);
  }
}
```

---

#### Helper Functions

**`extractSources(text: string): string[]`**
Extract mentioned tafsir sources from generated text.
```typescript
const sources = extractSources("وقال ابن كثير...");
// Returns: ['ابن كثير']
```

**`calculateCost(provider, model, promptTokens, completionTokens): number`**
Calculate cost of a single request.
```typescript
const cost = calculateCost('gemini', 'gemini-2.0-flash', 100, 250);
// Returns: 0.000041 (USD)
```

**`formatCost(cost: number): string`**
Format cost as USD string.
```typescript
const formatted = formatCost(0.000041);
// Returns: '$0.000041'
```

---

## React Hooks

### `useAiTafsirLLM()`

**Purpose:** Stream tafsir from LLM with full control

```typescript
function useAiTafsirLLM(options: UseLLMTafsirOptions): {
  text: string,
  isStreaming: boolean,
  error: string | null,
  cost: number,
  tokensUsed: { prompt, completion, total },
  sources: string[],
  cached: boolean,
  streamTafsir: (surah: number, ayah: number, dialect: Dialect) => Promise<void>,
  stopStreaming: () => void,
  checkQuota: () => Promise<void>,
}
```

**Options:**
```typescript
interface UseLLMTafsirOptions {
  provider: LLMProvider,           // 'gemini' | 'openai'
  apiKey: string,                  // API key for provider
  baseUrl?: string,                // Default: window.location.origin
  onChunk?: (text: string) => void,
  onComplete?: (fullText, cost, sources) => void,
  onError?: (error: string) => void,
  onQuotaWarning?: (remaining: number) => void,
}
```

**Example:**
```typescript
export function MyComponent() {
  const { text, isStreaming, streamTafsir, cost, error } = useAiTafsirLLM({
    provider: 'gemini',
    apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    onChunk: (chunk) => console.log('Got:', chunk),
    onComplete: (fullText, cost, sources) => {
      console.log(`✓ Generated ${fullText.length} chars`);
      console.log(`Cost: $${cost.toFixed(6)}`);
      console.log(`Sources: ${sources.join(', ')}`);
    },
    onError: (error) => console.error(error),
    onQuotaWarning: (remaining) => {
      alert(`Only ${remaining} requests left today!`);
    },
  });

  return (
    <>
      <button
        onClick={() => streamTafsir(2, 255, 'egyptian')}
        disabled={isStreaming}
      >
        {isStreaming ? 'Generating...' : 'Explain Verse 2:255'}
      </button>

      <div>{text}</div>

      {error && <div style={{ color: 'red' }}>{error}</div>}

      {cost > 0 && (
        <p>Cost: ${cost.toFixed(6)} | Tokens: {tokensUsed.total}</p>
      )}
    </>
  );
}
```

---

### `useAiTafsirFallback()`

**Purpose:** Use pre-seeded local tafsir (no LLM cost)

```typescript
function useAiTafsirFallback(): {
  text: string,
  isStreaming: boolean,
  error: string | null,
  cost: 0,
  tokensUsed: { prompt: 0, completion: 0, total: 0 },
  sources: string[],
  cached: boolean,
  streamTafsir: (surah, ayah, dialect) => Promise<void>,
  stopStreaming: () => void,
  checkQuota: () => Promise<void>, // No-op
}
```

**Automatically Used When:**
- LLM API is unavailable
- API key is not provided
- Network errors occur
- Quota is exceeded

**Example:**
```typescript
const fallback = useAiTafsirFallback();
// Same interface as useAiTafsirLLM
// But uses pre-seeded database instead of LLM
// Cost is always 0
```

---

## Server Endpoints

### `GET /api/tafsir/stream`

**Purpose:** Stream tafsir via Server-Sent Events (SSE)

**Query Parameters:**
- `surah` (required): Surah number (1-114)
- `ayah` (required): Ayah number in surah
- `dialect` (optional): `'egyptian'` | `'msa'` (default: `'egyptian'`)
- `provider` (optional): `'gemini'` | `'openai'` (default: from env)

**Headers:**
- `X-API-Key`: LLM API key (or use env variable)

**Response:**
Server-Sent Events with these event types:
- `start`: { text: "جاري التوليد..." }
- `chunk`: { text: "مقطع من النص" }
- `sources`: { sources: ["ابن كثير", ...] }
- `complete`: { tokensUsed: {...}, cost: 0.000123 }
- `error`: { error: "Error message" }

**Example (Browser):**
```typescript
const eventSource = new EventSource(
  '/api/tafsir/stream?surah=2&ayah=255&dialect=egyptian'
);

eventSource.addEventListener('chunk', (event) => {
  const { text } = JSON.parse(event.data);
  console.log(text);
});

eventSource.addEventListener('error', (event) => {
  const { error } = JSON.parse(event.data);
  console.error(error);
});
```

**Example (cURL):**
```bash
curl \
  -H "X-API-Key: gm-abc123..." \
  'http://localhost:3000/api/tafsir/stream?surah=2&ayah=255&dialect=egyptian'
```

---

### `GET /api/tafsir/quota`

**Purpose:** Check rate limit quota for current client

**Headers:**
- `X-API-Key`: Optional (for authenticated requests)

**Response:**
```json
{
  "daily": {
    "limit": 100,
    "used": 45,
    "remaining": 55
  },
  "monthly": {
    "limit": 1000,
    "used": 200,
    "remaining": 800
  },
  "resetAt": "2024-01-20T12:00:00Z"
}
```

**Example:**
```typescript
const quota = await (
  await fetch('/api/tafsir/quota', {
    headers: { 'X-API-Key': apiKey },
  })
).json();

console.log(`${quota.daily.remaining} requests remaining today`);
```

---

### `GET /api/tafsir/stats` (Admin Only)

**Purpose:** Get usage statistics (requires admin key)

**Headers:**
- `X-Admin-Key`: Admin secret key (from `ADMIN_KEY` env)

**Response:**
```json
{
  "totalRequests": 5234,
  "totalTokensUsed": 1234567,
  "totalCost": 45.67,
  "cacheHitRate": 65.4,
  "requestsByProvider": {
    "gemini": 3500,
    "openai": 1734
  }
}
```

**Example:**
```bash
curl \
  -H "X-Admin-Key: secret-admin-key" \
  'http://localhost:3000/api/tafsir/stats'
```

---

## Types & Interfaces

### `LLMProvider`
```typescript
type LLMProvider = 'gemini' | 'openai' | 'local-fallback'
```

### `Dialect`
```typescript
type Dialect = 'egyptian' | 'msa'
```

### `ContentSafetyLevel`
```typescript
type ContentSafetyLevel = 'strict' | 'moderate' | 'permissive'
```

### `LLMConfig`
```typescript
interface LLMConfig {
  provider: LLMProvider,
  apiKey: string,
  model: string,
  temperature: number,
  maxTokens: number,
  safetyLevel: ContentSafetyLevel,
}
```

### `LLMResponse`
```typescript
interface LLMResponse {
  text: string,
  sources: string[],
  tokensUsed: {
    prompt: number,
    completion: number,
    total: number,
  },
  cost: number,
  model: string,
  provider: LLMProvider,
  timestamp: number,
}
```

### `StreamEvent`
```typescript
interface StreamEvent {
  type: 'start' | 'chunk' | 'sources' | 'complete' | 'error',
  data: {
    text?: string,
    sources?: string[],
    error?: string,
    tokensUsed?: { prompt: number, completion: number, total: number },
    cost?: number,
  },
}
```

---

## Examples

### Example 1: Simple Generation

```typescript
import { callGeminiAPI, buildSystemPrompt, buildUserPrompt } from '@/lib/llmTafsir';

async function generateTafsir() {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  const sysPrompt = buildSystemPrompt('egyptian', 'strict');
  const userPrompt = buildUserPrompt(2, 255, 'الله لا إله إلا هو');

  const response = await callGeminiAPI(apiKey, sysPrompt, userPrompt);

  console.log('Tafsir:', response.text);
  console.log('Cost:', `$${response.cost.toFixed(6)}`);
}
```

### Example 2: Real-time Streaming

```typescript
import { streamGeminiResponse, buildSystemPrompt, buildUserPrompt } from '@/lib/llmTafsir';

async function streamTafsir() {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  const sysPrompt = buildSystemPrompt('egyptian', 'strict');
  const userPrompt = buildUserPrompt(2, 255, 'الله لا إله إلا هو');

  let fullText = '';

  for await (const event of streamGeminiResponse(apiKey, sysPrompt, userPrompt)) {
    if (event.type === 'chunk') {
      process.stdout.write(event.data.text || '');
      fullText += event.data.text || '';
    } else if (event.type === 'complete') {
      console.log(`\n✓ Done. Cost: $${event.data.cost?.toFixed(6)}`);
    } else if (event.type === 'error') {
      console.error('✗ Error:', event.data.error);
    }
  }

  return fullText;
}
```

### Example 3: React Component with LLM

```typescript
import { useAiTafsirLLM } from '@/lib/useAiTafsirLLM';
import { useState } from 'react';

export function TafsirViewer() {
  const [surah, setSurah] = useState(1);
  const [ayah, setAyah] = useState(1);

  const { text, isStreaming, streamTafsir, cost, error } = useAiTafsirLLM({
    provider: 'gemini',
    apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
  });

  return (
    <div>
      <div>
        <label>
          Surah:
          <input
            type="number"
            value={surah}
            onChange={(e) => setSurah(Number(e.target.value))}
            min="1"
            max="114"
          />
        </label>

        <label>
          Ayah:
          <input
            type="number"
            value={ayah}
            onChange={(e) => setAyah(Number(e.target.value))}
            min="1"
          />
        </label>

        <button
          onClick={() => streamTafsir(surah, ayah, 'egyptian')}
          disabled={isStreaming}
        >
          {isStreaming ? '⏳ Loading...' : '→ Generate'}
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      <div className="tafsir-text">{text}</div>

      {cost > 0 && <p>Cost: ${cost.toFixed(6)}</p>}
    </div>
  );
}
```

### Example 4: Provider Switching

```typescript
import { useAiTafsirLLM, useAiTafsirFallback } from '@/lib/useAiTafsirLLM';
import { useState } from 'react';

export function ProviderSwitcher() {
  const [provider, setProvider] = useState<'llm' | 'fallback'>('fallback');

  const llm = useAiTafsirLLM({
    provider: 'gemini',
    apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    onError: () => setProvider('fallback'), // Auto-fallback on error
  });

  const fallback = useAiTafsirFallback();

  const current = provider === 'llm' ? llm : fallback;

  return (
    <>
      <label>
        <input
          type="radio"
          checked={provider === 'llm'}
          onChange={() => setProvider('llm')}
        />
        LLM (advanced)
      </label>

      <label>
        <input
          type="radio"
          checked={provider === 'fallback'}
          onChange={() => setProvider('fallback')}
        />
        Local (fast, free)
      </label>

      <button onClick={() => current.streamTafsir(2, 255, 'egyptian')}>
        Generate
      </button>

      {current.text && <p>{current.text}</p>}
      {current.cost > 0 && <p>Cost: ${current.cost.toFixed(6)}</p>}
    </>
  );
}
```

---

## API Constants

### Available Models

**Gemini:**
```typescript
LLM_MODELS.gemini = {
  'gemini-2.0-flash': { costPer1kPrompt: 0.000075, costPer1kCompletion: 0.0003 },
  'gemini-1.5-pro': { costPer1kPrompt: 0.00125, costPer1kCompletion: 0.005 },
}
```

**OpenAI:**
```typescript
LLM_MODELS.openai = {
  'gpt-4-turbo': { costPer1kPrompt: 0.01, costPer1kCompletion: 0.03 },
  'gpt-3.5-turbo': { costPer1kPrompt: 0.0005, costPer1kCompletion: 0.0015 },
}
```

### Quota Limits

```typescript
const DEFAULT_RATE_LIMIT = 60;          // 60 requests per minute
const DEFAULT_RATE_WINDOW = 60 * 1000;  // per minute
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_VERSION = '1.0.0';
```

---

## Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 401 | Missing/invalid API key | Check `NEXT_PUBLIC_GEMINI_API_KEY` env |
| 403 | Admin key required | Use correct `X-Admin-Key` |
| 429 | Rate limit exceeded | Wait or increase quota |
| 500 | Server error | Check logs, retry |
| Network timeout | Connection failed | Check internet, server |

---

## Performance Tips

1. **Use Caching**: Responses cached 7 days → instant on repeat requests
2. **Use Gemini**: ~2% cost of GPT-4, 95% quality
3. **Batch Requests**: Get 10 verses at once (cheaper per-token)
4. **Monitor Usage**: Check `/api/tafsir/stats` regularly
5. **Implement Quota Checks**: Show warning when nearing limit
