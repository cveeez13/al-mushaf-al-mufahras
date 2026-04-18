/**
 * useAiTafsirLLM — React Hook for LLM-powered Tafsir
 * 
 * Handles:
 * - SSE streaming from server
 * - Progressive text reveal
 * - Error handling and retries
 * - Cost tracking
 * - Quota awareness
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { LLMProvider } from '@/lib/llmTafsir';

export interface UseLLMTafsirOptions {
  provider: LLMProvider;
  apiKey: string;
  baseUrl?: string; // Default: current origin
  onChunk?: (text: string) => void;
  onComplete?: (fullText: string, cost: number, sources: TafsirSource[]) => void;
  onError?: (error: string) => void;
  onQuotaWarning?: (remaining: number) => void;
}

import type { TafsirSource } from '@/lib/aiTafsir';

export interface LLMTafsirState {
  text: string;
  isStreaming: boolean;
  error: string | null;
  cost: number;
  tokensUsed: { prompt: number; completion: number; total: number };
  sources: TafsirSource[];
  cached: boolean;
}

export function useAiTafsirLLM(options: UseLLMTafsirOptions) {
  const [state, setState] = useState<LLMTafsirState>({
    text: '',
    isStreaming: false,
    error: null,
    cost: 0,
    tokensUsed: { prompt: 0, completion: 0, total: 0 },
    sources: [],
    cached: false,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Stream from SSE endpoint
  const streamTafsir = useCallback(
    async (surah: number, ayah: number, dialect: 'egyptian' | 'msa') => {
      // Cleanup previous connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setState({
        text: '',
        isStreaming: true,
        error: null,
        cost: 0,
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        sources: [],
        cached: false,
      });

      try {
        const baseUrl = options.baseUrl || window.location.origin;
        const url = `${baseUrl}/api/tafsir/stream?surah=${surah}&ayah=${ayah}&dialect=${dialect}&provider=${options.provider}`;

        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        let fullText = '';
        let totalCost = 0;
        let sources: TafsirSource[] = [];

        eventSource.addEventListener('chunk', (event: any) => {
          try {
            const data = JSON.parse(event.data);
            fullText += data.text || '';
            options.onChunk?.(data.text);

            setState(prev => ({
              ...prev,
              text: fullText,
              error: null,
            }));
          } catch (e) {
            console.error('Failed to parse chunk:', e);
          }
        });

        eventSource.addEventListener('sources', (event: any) => {
          try {
            const data = JSON.parse(event.data);
            sources = data.sources || [];
            setState(prev => ({ ...prev, sources }));
          } catch (e) {
            console.error('Failed to parse sources:', e);
          }
        });

        eventSource.addEventListener('complete', (event: any) => {
          try {
            const data = JSON.parse(event.data);
            totalCost = data.cost || 0;

            setState(prev => ({
              ...prev,
              isStreaming: false,
              cost: totalCost,
              tokensUsed: data.tokensUsed || { prompt: 0, completion: 0, total: 0 },
            }));

            options.onComplete?.(fullText, totalCost, sources);

            // Check quota after completion
            checkQuota();
          } catch (e) {
            console.error('Failed to parse complete event:', e);
          } finally {
            eventSource.close();
            eventSourceRef.current = null;
          }
        });

        eventSource.addEventListener('error', (event: any) => {
          try {
            const data = JSON.parse(event.data);
            const error = data.error || 'Unknown error';

            setState(prev => ({
              ...prev,
              isStreaming: false,
              error,
            }));

            options.onError?.(error);
          } catch (e) {
            const errorMsg = 'Connection error';
            setState(prev => ({
              ...prev,
              isStreaming: false,
              error: errorMsg,
            }));
            options.onError?.(errorMsg);
          } finally {
            eventSource.close();
            eventSourceRef.current = null;
          }
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setState(prev => ({
          ...prev,
          isStreaming: false,
          error: errorMsg,
        }));
        options.onError?.(errorMsg);
      }
    },
    [options],
  );

  // Check quota
  const checkQuota = useCallback(async () => {
    try {
      const baseUrl = options.baseUrl || window.location.origin;
      const response = await fetch(`${baseUrl}/api/tafsir/quota`, {
        headers: {
          'X-API-Key': options.apiKey,
        },
      });

      if (!response.ok) return;

      const quota = await response.json();
      const dailyRemaining = quota.daily?.remaining || 0;

      // Warn if less than 10% remaining
      if (dailyRemaining < 10) {
        options.onQuotaWarning?.(dailyRemaining);
      }
    } catch (e) {
      console.warn('Failed to check quota:', e);
    }
  }, [options]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setState(prev => ({ ...prev, isStreaming: false }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    streamTafsir,
    stopStreaming,
    checkQuota,
  };
}

// ═══════════════════════════════════════════════════════════
// Fallback Hook (for clients without server)
// ═══════════════════════════════════════════════════════════

import { generateAiTafsir, streamAiTafsir } from '@/lib/aiTafsir';

export function useAiTafsirFallback() {
  const [state, setState] = useState<LLMTafsirState>({
    text: '',
    isStreaming: false,
    error: null,
    cost: 0,
    tokensUsed: { prompt: 0, completion: 0, total: 0 },
    sources: [],
    cached: false,
  });

  const streamRef = useRef(false);

  const streamTafsir = useCallback(
    async (surah: number, ayah: number, dialect: 'egyptian' | 'msa') => {
      setState({
        text: '',
        isStreaming: true,
        error: null,
        cost: 0,
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        sources: [],
        cached: false,
      });

      streamRef.current = true;

      try {
        const verseText = `[Verse ${surah}:${ayah}]`; // Would be actual verse text in real impl
        let fullText = '';
        const sources: TafsirSource[] = [];

        for await (const chunk of streamAiTafsir(surah, ayah, verseText, dialect)) {
          if (!streamRef.current) break;

          fullText = chunk.text;

          setState(prev => ({
            ...prev,
            text: fullText,
            sources: chunk.sources || [],
          }));

          // Small delay for visual effect
          await new Promise(r => setTimeout(r, 10));
        }

        const response = generateAiTafsir(surah, ayah, verseText, dialect);

        setState(prev => ({
          ...prev,
          isStreaming: false,
          text: response.text,
          sources: response.sources,
          cached: response.cached,
        }));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setState(prev => ({
          ...prev,
          isStreaming: false,
          error: errorMsg,
        }));
      }
    },
    [],
  );

  const stopStreaming = useCallback(() => {
    streamRef.current = false;
    setState(prev => ({ ...prev, isStreaming: false }));
  }, []);

  return {
    ...state,
    streamTafsir,
    stopStreaming,
    checkQuota: async () => {}, // No-op for fallback
  };
}
