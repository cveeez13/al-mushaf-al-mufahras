'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { SURAH_NAMES, TOPICS } from '@/lib/types';
import {
  type Dialect, type AiTafsirResponse, type TafsirSource, type StreamChunk,
  DISCLAIMER_AR, DISCLAIMER_EN, TAFSIR_SOURCES,
  generateAiTafsir, streamAiTafsir,
  getCacheStats, clearTafsirCache,
  getSeededVerseKeys, hasSeededTafsir,
  validateGuardrails,
} from '@/lib/aiTafsir';

interface AiTafsirPanelProps {
  onGoToPage?: (page: number) => void;
  /** Pre-selected verse context from MushafViewer */
  verseContext?: {
    surah: number;
    ayah: number;
    text: string;
    topicColor?: string;
    topicId?: number;
  };
}

export default function AiTafsirPanel({ onGoToPage, verseContext }: AiTafsirPanelProps) {
  const { lang } = useI18n();
  const ar = lang === 'ar';

  // Verse selection state
  const [surah, setSurah] = useState(verseContext?.surah ?? 1);
  const [ayah, setAyah] = useState(verseContext?.ayah ?? 1);
  const [verseText, setVerseText] = useState(verseContext?.text ?? '');

  // AI tafsir state
  const [dialect, setDialect] = useState<Dialect>('egyptian');
  const [response, setResponse] = useState<AiTafsirResponse | null>(null);
  const [streamText, setStreamText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamSources, setStreamSources] = useState<TafsirSource[]>([]);
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  // UI state
  const [copied, setCopied] = useState(false);
  const [cacheStats, setCacheStats] = useState(getCacheStats());

  const streamRef = useRef(false);
  const textContainerRef = useRef<HTMLDivElement>(null);

  // Update verse from context
  useEffect(() => {
    if (verseContext) {
      setSurah(verseContext.surah);
      setAyah(verseContext.ayah);
      setVerseText(verseContext.text);
      // Auto-generate when verse context arrives
      setResponse(null);
      setStreamText('');
    }
  }, [verseContext]);

  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreaming && textContainerRef.current) {
      textContainerRef.current.scrollTop = textContainerRef.current.scrollHeight;
    }
  }, [streamText, isStreaming]);

  // ───── Generate tafsir ─────

  const handleGenerate = useCallback(async () => {
    if (isStreaming) return;

    setResponse(null);
    setStreamText('');
    setStreamSources([]);
    setIsStreaming(true);
    streamRef.current = true;

    try {
      const gen = streamAiTafsir(surah, ayah, verseText, dialect);
      for await (const chunk of gen) {
        if (!streamRef.current) break; // cancelled
        setStreamText(chunk.text);
        if (chunk.done && chunk.sources) {
          setStreamSources(chunk.sources);
        }
      }

      // Get cached response for metadata
      const full = generateAiTafsir(surah, ayah, verseText, dialect);
      setResponse(full);
      setCacheStats(getCacheStats());
    } finally {
      setIsStreaming(false);
      streamRef.current = false;
    }
  }, [surah, ayah, verseText, dialect, isStreaming]);

  const handleStop = useCallback(() => {
    streamRef.current = false;
    setIsStreaming(false);
  }, []);

  const handleCopy = useCallback(() => {
    if (!streamText) return;
    const disclaimerText = ar ? DISCLAIMER_AR : DISCLAIMER_EN;
    const fullText = `${streamText}\n\n---\n${disclaimerText}`;
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [streamText, ar]);

  const handleClearCache = useCallback(() => {
    clearTafsirCache();
    setCacheStats(getCacheStats());
  }, []);

  // ───── Seeded verse quick picks ─────
  const seededKeys = getSeededVerseKeys();
  const surahName = SURAH_NAMES[surah] || `${surah}`;
  const verseKey = `${surah}:${ayah}`;
  const isSeeded = hasSeededTafsir(verseKey);
  const topicColor = verseContext?.topicColor;

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* Header */}
      <h2 className="text-lg font-bold text-[var(--color-mushaf-gold)] mb-1 text-center font-[var(--font-arabic)]">
        {ar ? '🤖 اشرحلي ببساطة' : '🤖 Explain Simply'}
      </h2>
      <p className="text-xs text-center text-[var(--color-mushaf-text)]/50 mb-4">
        {ar ? 'تفسير مبسّط مستند لتفاسير العلماء المعتمدة' : 'Simplified tafsir based on classical scholarly sources'}
      </p>

      {/* Disclaimer Banner */}
      {showDisclaimer && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 relative">
          <button
            onClick={() => setShowDisclaimer(false)}
            className="absolute top-2 left-2 text-amber-500/50 hover:text-amber-500 text-xs"
            aria-label={ar ? 'إغلاق' : 'Close'}
          >✕</button>
          <div className="text-xs text-amber-700 dark:text-amber-400 font-[var(--font-arabic)] leading-relaxed pr-4" dir="rtl">
            {ar ? DISCLAIMER_AR : DISCLAIMER_EN}
          </div>
        </div>
      )}

      {/* Verse Selection */}
      <div className="page-frame rounded-xl p-4 mb-4">
        {/* Current verse display */}
        {verseText ? (
          <div
            className="p-3 rounded-lg mb-3 text-center"
            style={{
              backgroundColor: topicColor ? `${topicColor}15` : 'var(--color-mushaf-border)',
              borderRight: topicColor ? `3px solid ${topicColor}` : undefined,
            }}
          >
            <div className="text-xs text-[var(--color-mushaf-text)]/50 mb-1">
              {surahName} : {ayah}
            </div>
            <div className="font-[var(--font-arabic)] text-sm leading-loose" dir="rtl">
              {verseText.length > 150 ? verseText.slice(0, 150) + '…' : verseText}
            </div>
          </div>
        ) : (
          <div className="text-center text-sm text-[var(--color-mushaf-text)]/40 mb-3 py-4">
            {ar ? 'اضغط على آية في المصحف أو اختر من الأمثلة' : 'Click a verse in Mushaf or pick from examples'}
          </div>
        )}

        {/* Manual verse input */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <label className="text-[10px] text-[var(--color-mushaf-text)]/50 mb-0.5 block">
              {ar ? 'السورة' : 'Surah'}
            </label>
            <input
              type="number"
              min={1} max={114}
              value={surah}
              onChange={e => setSurah(Math.max(1, Math.min(114, Number(e.target.value))))}
              className="w-full px-2 py-1.5 rounded-lg bg-[var(--color-mushaf-border)]/20 border border-[var(--color-mushaf-border)] text-sm text-center"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-[var(--color-mushaf-text)]/50 mb-0.5 block">
              {ar ? 'الآية' : 'Ayah'}
            </label>
            <input
              type="number"
              min={1} max={286}
              value={ayah}
              onChange={e => setAyah(Math.max(1, Number(e.target.value)))}
              className="w-full px-2 py-1.5 rounded-lg bg-[var(--color-mushaf-border)]/20 border border-[var(--color-mushaf-border)] text-sm text-center"
            />
          </div>
        </div>

        {/* Quick picks: seeded verses */}
        <div className="mb-3">
          <label className="text-[10px] text-[var(--color-mushaf-text)]/50 mb-1 block">
            {ar ? 'أمثلة جاهزة' : 'Quick Examples'}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {seededKeys.map(key => {
              const [s, a] = key.split(':').map(Number);
              const name = SURAH_NAMES[s] || `${s}`;
              return (
                <button
                  key={key}
                  onClick={() => { setSurah(s); setAyah(a); setVerseText(''); setResponse(null); setStreamText(''); }}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    verseKey === key
                      ? 'bg-[var(--color-mushaf-gold)] text-white'
                      : 'bg-[var(--color-mushaf-border)]/20 hover:bg-[var(--color-mushaf-border)]/40'
                  }`}
                >
                  {name}:{a}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dialect toggle */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => { setDialect('egyptian'); setResponse(null); setStreamText(''); }}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              dialect === 'egyptian'
                ? 'bg-[var(--color-mushaf-gold)] text-white'
                : 'bg-[var(--color-mushaf-border)]/20 hover:bg-[var(--color-mushaf-border)]/40'
            }`}
          >
            🇪🇬 {ar ? 'عامية مصرية' : 'Egyptian Arabic'}
          </button>
          <button
            onClick={() => { setDialect('msa'); setResponse(null); setStreamText(''); }}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              dialect === 'msa'
                ? 'bg-[var(--color-mushaf-gold)] text-white'
                : 'bg-[var(--color-mushaf-border)]/20 hover:bg-[var(--color-mushaf-border)]/40'
            }`}
          >
            📝 {ar ? 'فصحى مبسطة' : 'Simple MSA'}
          </button>
        </div>

        {/* Generate button */}
        <button
          onClick={isStreaming ? handleStop : handleGenerate}
          className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${
            isStreaming
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-[var(--color-mushaf-gold)] text-white hover:opacity-90'
          }`}
        >
          {isStreaming
            ? (ar ? '⏹ إيقاف' : '⏹ Stop')
            : (ar ? '🤖 اشرحلي ببساطة' : '🤖 Explain Simply')}
        </button>

        {isSeeded && !response && !isStreaming && (
          <div className="text-center text-[10px] text-[var(--color-topic-green)] mt-1">
            ✨ {ar ? 'تفسير مفصّل متاح لهذه الآية' : 'Detailed tafsir available for this verse'}
          </div>
        )}
      </div>

      {/* Streaming Response */}
      {(streamText || isStreaming) && (
        <div className="page-frame rounded-xl overflow-hidden mb-4">
          {/* Response header */}
          <div className="px-4 py-2.5 bg-[var(--color-mushaf-border)]/20 border-b border-[var(--color-mushaf-border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">🤖</span>
              <span className="text-xs font-medium">
                {ar ? 'التفسير المبسّط' : 'Simplified Tafsir'}
              </span>
              {response?.cached && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-topic-blue)]/20 text-[var(--color-topic-blue)]">
                  {ar ? 'مُخزّن' : 'Cached'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isStreaming && (
                <span className="text-[10px] text-[var(--color-mushaf-gold)] animate-pulse">
                  {ar ? 'جارٍ التوليد...' : 'Generating...'}
                </span>
              )}
              {streamText && !isStreaming && (
                <button
                  onClick={handleCopy}
                  className="text-[10px] px-2 py-0.5 rounded bg-[var(--color-mushaf-border)]/20 hover:bg-[var(--color-mushaf-border)]/40 transition-colors"
                >
                  {copied ? '✓' : '📋'} {ar ? (copied ? 'تم النسخ' : 'نسخ') : (copied ? 'Copied' : 'Copy')}
                </button>
              )}
            </div>
          </div>

          {/* Streaming text body */}
          <div
            ref={textContainerRef}
            className="p-4 max-h-[400px] overflow-y-auto"
          >
            <div className="font-[var(--font-arabic)] text-sm leading-[2] whitespace-pre-wrap" dir="rtl">
              {streamText}
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-[var(--color-mushaf-gold)] animate-pulse align-middle mr-1" />
              )}
            </div>
          </div>

          {/* Sources */}
          {streamSources.length > 0 && !isStreaming && (
            <div className="px-4 py-2.5 bg-[var(--color-mushaf-border)]/10 border-t border-[var(--color-mushaf-border)]">
              <div className="text-[10px] text-[var(--color-mushaf-text)]/50 mb-1">
                {ar ? '📚 المصادر المعتمدة:' : '📚 Sources:'}
              </div>
              <div className="flex flex-wrap gap-2">
                {streamSources.map(src => (
                  <span
                    key={src.id}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-mushaf-gold)]/10 text-[var(--color-mushaf-gold)]"
                  >
                    {ar ? src.name_ar : src.name_en}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Guardrails status */}
          {streamText && !isStreaming && (
            <div className="px-4 py-2 border-t border-[var(--color-mushaf-border)]/50">
              {(() => {
                const result = validateGuardrails(streamText);
                return (
                  <div className={`text-[10px] flex items-center gap-1 ${
                    result.safe ? 'text-[var(--color-topic-green)]' : 'text-red-500'
                  }`}>
                    {result.safe ? '✅' : '⚠️'}
                    {result.safe
                      ? (ar ? 'المحتوى مطابق للضوابط الشرعية' : 'Content passes guardrails')
                      : (ar ? `تنبيه: ${result.reason}` : `Warning: ${result.reason}`)}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Prompt Engineering Info */}
      {!streamText && !isStreaming && (
        <div className="page-frame rounded-xl p-4 mb-4">
          <h3 className="text-xs font-semibold text-[var(--color-mushaf-gold)] mb-2">
            {ar ? '🛡️ ضمانات المحتوى' : '🛡️ Content Guardrails'}
          </h3>
          <div className="space-y-1.5 text-[11px] text-[var(--color-mushaf-text)]/60" dir="rtl">
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>{ar ? 'يعتمد فقط على التفاسير المعتمدة (ابن كثير، السعدي، التفسير الميسر)' : 'Based only on trusted tafsirs (Ibn Kathir, Al-Sa\'di, Al-Muyassar)'}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>{ar ? 'لا يخترع أحاديث أو أقوال غير موثقة' : 'No fabricated hadith or unverified quotes'}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>{ar ? 'لا يُصدر فتاوى — مساعدة للفهم فقط' : 'No fatwa issuing — understanding aid only'}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>{ar ? 'يذكر المصدر بوضوح في كل نقطة' : 'Clear source attribution for every point'}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>{ar ? 'التخزين المؤقت يوفّر الاستجابات الفورية' : 'Response caching for instant repeat queries'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Cache & available sources info */}
      <div className="page-frame rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-[var(--color-mushaf-text)]/60">
            {ar ? '💾 التخزين المؤقت' : '💾 Cache'}
          </h3>
          {cacheStats.count > 0 && (
            <button
              onClick={handleClearCache}
              className="text-[10px] text-red-400 hover:text-red-500"
            >
              {ar ? 'مسح' : 'Clear'}
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-lg font-bold text-[var(--color-mushaf-gold)]">{cacheStats.count}</div>
            <div className="text-[10px] text-[var(--color-mushaf-text)]/40">{ar ? 'تفسيرات مخزّنة' : 'Cached'}</div>
          </div>
          <div>
            <div className="text-lg font-bold text-[var(--color-topic-blue)]">{cacheStats.sizeKB}</div>
            <div className="text-[10px] text-[var(--color-mushaf-text)]/40">KB</div>
          </div>
          <div>
            <div className="text-lg font-bold text-[var(--color-topic-green)]">{TAFSIR_SOURCES.length}</div>
            <div className="text-[10px] text-[var(--color-mushaf-text)]/40">{ar ? 'مصادر' : 'Sources'}</div>
          </div>
        </div>

        {/* Source list */}
        <div className="mt-3 pt-3 border-t border-[var(--color-mushaf-border)]/30">
          <div className="text-[10px] text-[var(--color-mushaf-text)]/40 mb-1">
            {ar ? 'المصادر المعتمدة:' : 'Trusted Sources:'}
          </div>
          <div className="flex flex-wrap gap-1">
            {TAFSIR_SOURCES.map(src => (
              <span
                key={src.id}
                className="text-[10px] px-2 py-0.5 rounded bg-[var(--color-mushaf-border)]/15"
              >
                {ar ? src.author_ar : src.author_en}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
