/**
 * AiTafsirPanel Enhanced — Integration with LLM Provider
 * 
 * This shows how to integrate the new LLM system into the existing component.
 * Use this as a guide to update the existing AiTafsirPanel.tsx
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import type { Dialect } from '@/lib/aiTafsir';
import { useAiTafsirLLM, useAiTafsirFallback } from '@/lib/useAiTafsirLLM';
import type { LLMProvider } from '@/lib/llmTafsir';

interface EnhancedAiTafsirPanelProps {
  surah: number;
  ayah: number;
  verseText: string;
  useLLM?: boolean; // Use LLM provider or fallback
  llmProvider?: LLMProvider; // 'gemini' or 'openai'
  llmApiKey?: string;
}

export function AiTafsirPanelEnhanced(props: EnhancedAiTafsirPanelProps) {
  const { lang } = useI18n();
  const ar = lang === 'ar';

  const [dialect, setDialect] = useState<Dialect>('egyptian');
  const [useLLM, setUseLLM] = useState(props.useLLM ?? false);
  const [showApiConfig, setShowApiConfig] = useState(!props.llmApiKey);

  // Choose between LLM or fallback hook
  const llmHook = useAiTafsirLLM({
    provider: props.llmProvider || 'gemini',
    apiKey: props.llmApiKey || '',
    onChunk: (text) => {
      // Progressive text reveal
    },
    onComplete: (fullText, cost, sources) => {
      console.log(`✓ Generated ${fullText.length} chars, cost: $${cost.toFixed(6)}`);
    },
    onError: (error) => {
      console.error('LLM error:', error);
      setUseLLM(false); // Fallback to pre-seeded
    },
    onQuotaWarning: (remaining) => {
      console.warn(`⚠️ Only ${remaining} requests remaining today`);
    },
  });

  const fallbackHook = useAiTafsirFallback();

  const hook = useLLM ? llmHook : fallbackHook;

  // Generate tafsir
  const handleGenerate = useCallback(async () => {
    if (hook.isStreaming) return;

    try {
      await hook.streamTafsir(props.surah, props.ayah, dialect);
    } catch (error) {
      console.error('Failed to generate tafsir:', error);
    }
  }, [hook, props.surah, props.ayah, dialect]);

  const handleStop = useCallback(() => {
    hook.stopStreaming();
  }, [hook]);

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h2 className="mb-2 text-center font-[var(--font-arabic)] text-lg font-bold text-[var(--color-mushaf-gold)]">
        {ar ? 'اشرحلي ببساطة' : 'Explain Simply'}
      </h2>

      {/* LLM Provider Config */}
      {showApiConfig && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <div className="mb-3 flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useLLM}
                onChange={(e) => {
                  setUseLLM(e.target.checked);
                  if (e.target.checked) setShowApiConfig(true);
                }}
              />
              {ar ? 'استخدام LLM متقدم' : 'Use advanced LLM'}
            </label>
          </div>

          {useLLM && (
            <div className="space-y-2 text-xs">
              <div>
                <label className="block text-[var(--color-mushaf-text)]/70">
                  {ar ? 'المزوّد' : 'Provider'}
                </label>
                <select
                  value={props.llmProvider || 'gemini'}
                  className="w-full rounded border border-[var(--color-mushaf-border)] bg-[var(--color-background)] px-2 py-1 text-xs"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                </select>
              </div>

              <div>
                <label className="block text-[var(--color-mushaf-text)]/70">
                  API Key ({ar ? 'اختياري - يمكن تعيينه في البيئة' : 'Optional - set in .env'})
                </label>
                <input
                  type="password"
                  placeholder="sk-... or gm-..."
                  className="w-full rounded border border-[var(--color-mushaf-border)] bg-[var(--color-background)] px-2 py-1 text-xs"
                />
              </div>

              <button
                onClick={() => setShowApiConfig(false)}
                className="w-full rounded bg-[var(--color-mushaf-gold)]/20 px-2 py-1 text-[10px] text-[var(--color-mushaf-gold)] hover:bg-[var(--color-mushaf-gold)]/30"
              >
                {ar ? 'تم التكوين' : 'Done'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Dialect Selection */}
      <div className="mb-4 flex gap-2">
        <select
          value={dialect}
          onChange={(e) => setDialect(e.target.value as Dialect)}
          className="flex-1 rounded-lg border border-[var(--color-mushaf-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
        >
          <option value="egyptian">{ar ? 'عامية مصرية' : 'Egyptian Colloquial'}</option>
          <option value="msa">{ar ? 'فصحى مبسطة' : 'Simplified Classical'}</option>
        </select>

        <button
          onClick={hook.isStreaming ? handleStop : handleGenerate}
          disabled={!props.llmApiKey && useLLM}
          className={`flex-1 rounded-lg py-2 text-sm font-bold text-white ${
            hook.isStreaming
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-[var(--color-mushaf-gold)] hover:opacity-90'
          } ${!props.llmApiKey && useLLM ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          {hook.isStreaming ? (ar ? 'إيقاف' : 'Stop') : ar ? 'اشرحلي' : 'Explain'}
        </button>
      </div>

      {/* Streaming Text Display */}
      {(hook.text || hook.isStreaming) && (
        <div className="mb-4 rounded-xl border border-[var(--color-mushaf-border)] bg-[var(--color-mushaf-border)]/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--color-mushaf-gold)]">
                {useLLM ? 'AI LLM' : 'AI Local'}
              </span>
              {hook.cached && (
                <span className="rounded-full bg-[var(--color-topic-blue)]/20 px-2 py-0.5 text-[10px] text-[var(--color-topic-blue)]">
                  {ar ? 'مخزن مؤقت' : 'Cached'}
                </span>
              )}
            </div>

            {hook.cost > 0 && (
              <span className="text-[10px] text-[var(--color-mushaf-text)]/50">
                Cost: ${hook.cost.toFixed(6)}
              </span>
            )}
          </div>

          <div
            className="max-h-96 overflow-y-auto whitespace-pre-wrap font-[var(--font-arabic)] text-sm leading-relaxed"
            dir="rtl"
          >
            {hook.text}
            {hook.isStreaming && (
              <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-[var(--color-mushaf-gold)]" />
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {hook.error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-sm text-red-500">{hook.error}</p>
          <button
            onClick={() => setUseLLM(false)}
            className="mt-2 text-xs text-red-500 hover:underline"
          >
            {ar ? 'العودة للشرح المحلي' : 'Switch to local'}
          </button>
        </div>
      )}

      {/* Sources Display */}
      {hook.sources.length > 0 && !hook.isStreaming && (
        <div className="rounded-lg bg-[var(--color-mushaf-border)]/10 p-3">
          <p className="mb-2 text-xs font-bold text-[var(--color-mushaf-text)]">
            {ar ? 'المصادر' : 'Sources'}
          </p>
          <div className="flex flex-wrap gap-1">
            {hook.sources.map((source, i) => (
              <span key={i} className="rounded-full bg-[var(--color-mushaf-border)]/30 px-2 py-1 text-[10px]">
                {source.name_ar}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Token Usage Stats */}
      {hook.tokensUsed.total > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] text-[var(--color-mushaf-text)]/50">
          <div>Prompt: {hook.tokensUsed.prompt}</div>
          <div>Completion: {hook.tokensUsed.completion}</div>
          <div>Total: {hook.tokensUsed.total}</div>
        </div>
      )}
    </div>
  );
}
