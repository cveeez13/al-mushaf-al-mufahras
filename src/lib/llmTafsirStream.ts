/**
 * AI Tafsir SSE Endpoint — Node.js/Express
 * 
 * This is a server endpoint that:
 * - Handles real LLM API calls
 * - Streams responses via Server-Sent Events (SSE)
 * - Manages caching with versioning
 * - Tracks rate limits and quotas
 * - Validates requests
 * 
 * Usage:
 * GET /api/tafsir/stream?surah=2&ayah=255&dialect=egyptian&provider=gemini
 * 
 * Response:
 * - SSE stream with events: start, chunk, sources, complete, error
 */

import { buildSystemPrompt, buildUserPrompt, streamGeminiResponse, callOpenAIAPI } from '@/lib/llmTafsir';
import type { StreamEvent, LLMProvider } from '@/lib/llmTafsir';

// ═══════════════════════════════════════════════════════════
// Rate Limiting & Quota
// ═══════════════════════════════════════════════════════════

interface QuotaInfo {
  dailyLimit: number;
  dailyUsed: number;
  monthlyLimit: number;
  monthlyUsed: number;
  resetAt: number;
}

interface RequestLog {
  timestamp: number;
  surah: number;
  ayah: number;
  provider: LLMProvider;
  tokens: number;
  cost: number;
  cached: boolean;
}

const quotaCache = new Map<string, QuotaInfo>();
const requestLogs: RequestLog[] = [];

function getClientQuota(clientId: string): QuotaInfo {
  if (quotaCache.has(clientId)) {
    return quotaCache.get(clientId)!;
  }

  const quota: QuotaInfo = {
    dailyLimit: 100,
    dailyUsed: 0,
    monthlyLimit: 1000,
    monthlyUsed: 0,
    resetAt: Date.now() + 24 * 60 * 60 * 1000,
  };

  quotaCache.set(clientId, quota);
  return quota;
}

function checkQuota(clientId: string, estimatedTokens: number = 500): { allowed: boolean; reason?: string } {
  const quota = getClientQuota(clientId);
  const now = Date.now();

  // Reset daily quota if needed
  if (now > quota.resetAt) {
    quota.dailyUsed = 0;
    quota.resetAt = now + 24 * 60 * 60 * 1000;
  }

  if (quota.dailyUsed + estimatedTokens > quota.dailyLimit) {
    return { allowed: false, reason: 'Daily quota exceeded' };
  }

  if (quota.monthlyUsed + estimatedTokens > quota.monthlyLimit) {
    return { allowed: false, reason: 'Monthly quota exceeded' };
  }

  return { allowed: true };
}

function consumeQuota(clientId: string, tokens: number): void {
  const quota = getClientQuota(clientId);
  quota.dailyUsed += tokens;
  quota.monthlyUsed += tokens;
}

// ═══════════════════════════════════════════════════════════
// SSE Stream Response
// ═══════════════════════════════════════════════════════════

export async function handleTafsirStream(
  surah: number,
  ayah: number,
  dialect: 'egyptian' | 'msa',
  provider: LLMProvider,
  apiKey: string,
  clientId: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
  signal: AbortSignal,
): Promise<void> {
  const encoder = new TextEncoder();

  // Helper to send SSE event
  function sendEvent(event: StreamEvent): void {
    const data = JSON.stringify(event.data);
    const message = `event: ${event.type}\ndata: ${data}\n\n`;
    controller.enqueue(encoder.encode(message));
  }

  try {
    // Validate request
    if (!apiKey) {
      sendEvent({ type: 'error', data: { error: 'Missing API key' } });
      return;
    }

    // Check quota
    const quotaCheck = checkQuota(clientId);
    if (!quotaCheck.allowed) {
      sendEvent({ type: 'error', data: { error: quotaCheck.reason } });
      return;
    }

    // Check for signal abort
    if (signal.aborted) {
      return;
    }

    // Build prompts
    const systemPrompt = buildSystemPrompt(dialect, 'strict');
    const userPrompt = buildUserPrompt(surah, ayah, `[Verse ${surah}:${ayah}]`);

    sendEvent({ type: 'start', data: { text: 'جاري توليد التفسير...' } });

    // Stream based on provider
    if (provider === 'gemini') {
      for await (const event of streamGeminiResponse(apiKey, systemPrompt, userPrompt)) {
        if (signal.aborted) {
          return;
        }

        if (event.type === 'chunk' && event.data.text) {
          sendEvent({
            type: 'chunk',
            data: { text: event.data.text },
          });
        } else if (event.type === 'complete') {
          if (event.data.tokensUsed) {
            consumeQuota(clientId, event.data.tokensUsed.total);
          }

          sendEvent({
            type: 'complete',
            data: {
              tokensUsed: event.data.tokensUsed,
              cost: event.data.cost,
            },
          });
        } else if (event.type === 'error') {
          sendEvent({ type: 'error', data: { error: event.data.error } });
          return;
        }
      }
    } else if (provider === 'openai') {
      // For OpenAI, we'd implement streaming similarly
      // Using OpenAI's streaming API with fetch
      const systemPrompt = buildSystemPrompt(dialect, 'strict');
      const userPrompt = buildUserPrompt(surah, ayah, `[Verse ${surah}:${ayah}]`);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          stream: true,
        }),
      });

      if (!response.ok) {
        sendEvent({ type: 'error', data: { error: `OpenAI API error: ${response.statusText}` } });
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        sendEvent({ type: 'error', data: { error: 'No response body' } });
        return;
      }

      let buffer = '';
      const decoder = new TextDecoder();
      let totalTokens = 0;

      while (true) {
        if (signal.aborted) {
          return;
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6); // Remove 'data: '
          if (data === '[DONE]') {
            sendEvent({
              type: 'complete',
              data: { tokensUsed: { prompt: 0, completion: 0, total: totalTokens } },
            });
            return;
          }

          try {
            const json = JSON.parse(data);
            const text = json.choices?.[0]?.delta?.content || '';
            if (text) {
              sendEvent({ type: 'chunk', data: { text } });
            }
            if (json.usage) {
              totalTokens = json.usage.total_tokens || 0;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }
  } catch (error) {
    sendEvent({
      type: 'error',
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
    });
  } finally {
    controller.close();
  }
}

// ═══════════════════════════════════════════════════════════
// Express Route Handler (for Node.js server)
// ═══════════════════════════════════════════════════════════

export function createTafsirStreamRoute(app: any): void {
  app.get('/api/tafsir/stream', (req: any, res: any) => {
    const { surah, ayah, dialect = 'egyptian', provider = 'gemini' } = req.query;
    const apiKey = req.headers['x-api-key'] || process.env.LLM_API_KEY;
    const clientId = req.ip || req.connection.remoteAddress || 'unknown';

    // Validate parameters
    if (!surah || !ayah) {
      res.status(400).json({ error: 'Missing surah or ayah parameter' });
      return;
    }

    if (!apiKey) {
      res.status(401).json({ error: 'Missing API key' });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Create ReadableStream
    const stream = new ReadableStream({
      async start(controller: ReadableStreamDefaultController<Uint8Array>) {
        await handleTafsirStream(
          parseInt(surah as string),
          parseInt(ayah as string),
          dialect as 'egyptian' | 'msa',
          provider as LLMProvider,
          apiKey as string,
          clientId,
          controller,
          req.signal,
        );
      },
    });

    // Send stream to response
    stream.pipeTo(
      new WritableStream({
        write(chunk) {
          res.write(chunk);
        },
        close() {
          res.end();
        },
      }),
    );
  });

  // Quota info endpoint
  app.get('/api/tafsir/quota', (req: any, res: any) => {
    const clientId = req.ip || req.connection.remoteAddress || 'unknown';
    const quota = getClientQuota(clientId);

    res.json({
      daily: {
        limit: quota.dailyLimit,
        used: quota.dailyUsed,
        remaining: quota.dailyLimit - quota.dailyUsed,
      },
      monthly: {
        limit: quota.monthlyLimit,
        used: quota.monthlyUsed,
        remaining: quota.monthlyLimit - quota.monthlyUsed,
      },
      resetAt: new Date(quota.resetAt).toISOString(),
    });
  });

  // Usage stats endpoint (admin only)
  app.get('/api/tafsir/stats', (req: any, res: any) => {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_KEY) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const stats = {
      totalRequests: requestLogs.length,
      totalTokensUsed: requestLogs.reduce((sum, log) => sum + log.tokens, 0),
      totalCost: requestLogs.reduce((sum, log) => sum + log.cost, 0),
      cacheHitRate: (requestLogs.filter(log => log.cached).length / requestLogs.length) * 100,
      requestsByProvider: {
        gemini: requestLogs.filter(log => log.provider === 'gemini').length,
        openai: requestLogs.filter(log => log.provider === 'openai').length,
      },
    };

    res.json(stats);
  });
}

// ═══════════════════════════════════════════════════════════
// Caching with Versioning
// ═══════════════════════════════════════════════════════════

interface CacheEntry {
  text: string;
  sources: string[];
  timestamp: number;
  version: string; // Semantic version of cache format
  provider: LLMProvider;
  model: string;
  cost: number;
}

const CACHE_VERSION = '1.0.0';

export function getCachedTafsir(surah: number, ayah: number, dialect: string, version: string = CACHE_VERSION): CacheEntry | null {
  try {
    const key = `tafsir-llm:${surah}:${ayah}:${dialect}:${version}`;
    const cached = localStorage.getItem(key);

    if (!cached) return null;

    const entry: CacheEntry = JSON.parse(cached);

    // Invalidate if older than 7 days
    if (Date.now() - entry.timestamp > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(key);
      return null;
    }

    return entry;
  } catch {
    return null;
  }
}

export function cacheTafsir(
  surah: number,
  ayah: number,
  dialect: string,
  text: string,
  sources: string[],
  provider: LLMProvider,
  model: string,
  cost: number,
): void {
  try {
    const key = `tafsir-llm:${surah}:${ayah}:${dialect}:${CACHE_VERSION}`;

    const entry: CacheEntry = {
      text,
      sources,
      timestamp: Date.now(),
      version: CACHE_VERSION,
      provider,
      model,
      cost,
    };

    localStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    console.warn('Failed to cache tafsir:', e);
  }
}
