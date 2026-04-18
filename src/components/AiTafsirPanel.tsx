'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { SURAH_NAMES } from '@/lib/types';
import {
  type Dialect,
  type AiTafsirResponse,
  type TafsirSource,
  DISCLAIMER_AR,
  DISCLAIMER_EN,
  TAFSIR_SOURCES,
  generateAiTafsir,
  streamAiTafsir,
  getCacheStats,
  clearTafsirCache,
  getSeededVerseKeys,
  hasSeededTafsir,
  validateGuardrails,
} from '@/lib/aiTafsir';
import { useTafsirTts } from '@/lib/useTafsirTts';

interface AiTafsirPanelProps {
  onGoToPage?: (page: number) => void;
  verseContext?: {
    surah: number;
    ayah: number;
    text: string;
    topicColor?: string;
    topicId?: number;
  };
}

export default function AiTafsirPanel({ verseContext }: AiTafsirPanelProps) {
  const { lang } = useI18n();
  const ar = lang === 'ar';

  const [surah, setSurah] = useState(verseContext?.surah ?? 1);
  const [ayah, setAyah] = useState(verseContext?.ayah ?? 1);
  const [verseText, setVerseText] = useState(verseContext?.text ?? '');

  const [dialect, setDialect] = useState<Dialect>('egyptian');
  const [response, setResponse] = useState<AiTafsirResponse | null>(null);
  const [streamText, setStreamText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamSources, setStreamSources] = useState<TafsirSource[]>([]);
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  const [copied, setCopied] = useState(false);
  const [cacheStats, setCacheStats] = useState(getCacheStats());
  const [ttsMessage, setTtsMessage] = useState('');

  const streamRef = useRef(false);
  const textContainerRef = useRef<HTMLDivElement>(null);

  const {
    provider,
    isSupported: ttsSupported,
    voices,
    selectedVoiceId,
    setSelectedVoice,
    rate: ttsRate,
    setRate: setTtsRate,
    pitch: ttsPitch,
    setPitch: setTtsPitch,
    isSpeaking,
    isPaused,
    speak,
    stop: stopTts,
    pause: pauseTts,
    resume: resumeTts,
  } = useTafsirTts();

  useEffect(() => {
    if (!verseContext) return;
    setSurah(verseContext.surah);
    setAyah(verseContext.ayah);
    setVerseText(verseContext.text);
    setResponse(null);
    setStreamText('');
    setStreamSources([]);
    stopTts();
  }, [stopTts, verseContext]);

  useEffect(() => {
    if (isStreaming && textContainerRef.current) {
      textContainerRef.current.scrollTop = textContainerRef.current.scrollHeight;
    }
  }, [streamText, isStreaming]);

  useEffect(() => () => stopTts(), [stopTts]);

  useEffect(() => {
    stopTts();
  }, [surah, ayah, dialect, stopTts]);

  useEffect(() => {
    if (!ttsMessage) return;
    const timer = window.setTimeout(() => setTtsMessage(''), 2500);
    return () => window.clearTimeout(timer);
  }, [ttsMessage]);

  const speakableText = useMemo(() => {
    if (!streamText.trim()) return '';
    const sourceNames = streamSources.map((src) => (ar ? src.name_ar : src.name_en)).join('، ');
    return sourceNames
      ? `${streamText}\n\n${ar ? 'المصادر المعتمدة' : 'Sources'}: ${sourceNames}`
      : streamText;
  }, [ar, streamSources, streamText]);

  const seededKeys = getSeededVerseKeys();
  const surahName = SURAH_NAMES[surah] || `${surah}`;
  const verseKey = `${surah}:${ayah}`;
  const isSeeded = hasSeededTafsir(verseKey);
  const topicColor = verseContext?.topicColor;

  const resetGeneratedState = useCallback(() => {
    setResponse(null);
    setStreamText('');
    setStreamSources([]);
    stopTts();
  }, [stopTts]);

  const handleGenerate = useCallback(async () => {
    if (isStreaming) return;

    resetGeneratedState();
    setIsStreaming(true);
    streamRef.current = true;

    try {
      const gen = streamAiTafsir(surah, ayah, verseText, dialect);
      for await (const chunk of gen) {
        if (!streamRef.current) break;
        setStreamText(chunk.text);
        if (chunk.done && chunk.sources) {
          setStreamSources(chunk.sources);
        }
      }

      const full = generateAiTafsir(surah, ayah, verseText, dialect);
      setResponse(full);
      setCacheStats(getCacheStats());
    } finally {
      setIsStreaming(false);
      streamRef.current = false;
    }
  }, [ayah, dialect, isStreaming, resetGeneratedState, surah, verseText]);

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
  }, [ar, streamText]);

  const handleClearCache = useCallback(() => {
    clearTafsirCache();
    setCacheStats(getCacheStats());
  }, []);

  const handleSpeak = useCallback(() => {
    if (!ttsSupported) {
      setTtsMessage(ar ? 'المتصفح لا يدعم القراءة الصوتية هنا.' : 'This browser does not support TTS here.');
      return;
    }
    if (!speakableText.trim()) {
      setTtsMessage(ar ? 'ولّد الشرح أولًا ثم استمع إليه.' : 'Generate the tafsir first, then listen to it.');
      return;
    }
    const started = speak(speakableText);
    if (!started) {
      setTtsMessage(ar ? 'تعذر تشغيل الشرح الصوتي.' : 'Unable to start tafsir audio.');
    }
  }, [ar, speak, speakableText, ttsSupported]);

  const guardrailResult = streamText && !isStreaming ? validateGuardrails(streamText) : null;

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h2 className="mb-1 text-center font-[var(--font-arabic)] text-lg font-bold text-[var(--color-mushaf-gold)]">
        {ar ? 'اشرحلي ببساطة' : 'Explain Simply'}
      </h2>
      <p className="mb-4 text-center text-xs text-[var(--color-mushaf-text)]/50">
        {ar
          ? 'تفسير مبسط مع شرح صوتي اختياري مستند إلى التفاسير المعتمدة'
          : 'Simplified tafsir with optional spoken playback based on trusted sources'}
      </p>

      {showDisclaimer && (
        <div className="relative mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <button
            onClick={() => setShowDisclaimer(false)}
            className="absolute left-2 top-2 text-xs text-amber-500/50 transition-colors hover:text-amber-500"
            aria-label={ar ? 'إغلاق' : 'Close'}
          >
            ×
          </button>
          <div className="pr-4 text-xs leading-relaxed text-amber-700 dark:text-amber-400" dir="rtl">
            {ar ? DISCLAIMER_AR : DISCLAIMER_EN}
          </div>
        </div>
      )}

      <div className="page-frame mb-4 rounded-xl p-4">
        {verseText ? (
          <div
            className="mb-3 rounded-lg p-3 text-center"
            style={{
              backgroundColor: topicColor ? `${topicColor}15` : 'var(--color-mushaf-border)',
              borderRight: topicColor ? `3px solid ${topicColor}` : undefined,
            }}
          >
            <div className="mb-1 text-xs text-[var(--color-mushaf-text)]/50">
              {surahName} : {ayah}
            </div>
            <div className="font-[var(--font-arabic)] text-sm leading-loose" dir="rtl">
              {verseText.length > 150 ? `${verseText.slice(0, 150)}...` : verseText}
            </div>
          </div>
        ) : (
          <div className="mb-3 py-4 text-center text-sm text-[var(--color-mushaf-text)]/40">
            {ar ? 'اختر آية من المصحف أو من الأمثلة الجاهزة.' : 'Pick a verse from the Mushaf or use a quick example.'}
          </div>
        )}

        <div className="mb-3 flex gap-2">
          <div className="flex-1">
            <label className="mb-0.5 block text-[10px] text-[var(--color-mushaf-text)]/50">
              {ar ? 'السورة' : 'Surah'}
            </label>
            <input
              type="number"
              min={1}
              max={114}
              value={surah}
              onChange={(e) => setSurah(Math.max(1, Math.min(114, Number(e.target.value))))}
              className="w-full rounded-lg border border-[var(--color-mushaf-border)] bg-[var(--color-mushaf-border)]/20 px-2 py-1.5 text-center text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="mb-0.5 block text-[10px] text-[var(--color-mushaf-text)]/50">
              {ar ? 'الآية' : 'Ayah'}
            </label>
            <input
              type="number"
              min={1}
              max={286}
              value={ayah}
              onChange={(e) => setAyah(Math.max(1, Number(e.target.value)))}
              className="w-full rounded-lg border border-[var(--color-mushaf-border)] bg-[var(--color-mushaf-border)]/20 px-2 py-1.5 text-center text-sm"
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-[10px] text-[var(--color-mushaf-text)]/50">
            {ar ? 'أمثلة جاهزة' : 'Quick examples'}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {seededKeys.map((key) => {
              const [exampleSurah, exampleAyah] = key.split(':').map(Number);
              const exampleName = SURAH_NAMES[exampleSurah] || `${exampleSurah}`;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setSurah(exampleSurah);
                    setAyah(exampleAyah);
                    setVerseText('');
                    resetGeneratedState();
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
                    verseKey === key
                      ? 'bg-[var(--color-mushaf-gold)] text-white'
                      : 'bg-[var(--color-mushaf-border)]/20 hover:bg-[var(--color-mushaf-border)]/40'
                  }`}
                >
                  {exampleName}:{exampleAyah}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-3 flex gap-2">
          <button
            onClick={() => {
              setDialect('egyptian');
              resetGeneratedState();
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
              dialect === 'egyptian'
                ? 'bg-[var(--color-mushaf-gold)] text-white'
                : 'bg-[var(--color-mushaf-border)]/20 hover:bg-[var(--color-mushaf-border)]/40'
            }`}
          >
            {ar ? 'عامية مصرية' : 'Egyptian Arabic'}
          </button>
          <button
            onClick={() => {
              setDialect('msa');
              resetGeneratedState();
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
              dialect === 'msa'
                ? 'bg-[var(--color-mushaf-gold)] text-white'
                : 'bg-[var(--color-mushaf-border)]/20 hover:bg-[var(--color-mushaf-border)]/40'
            }`}
          >
            {ar ? 'فصحى مبسطة' : 'Simple MSA'}
          </button>
        </div>

        <button
          onClick={isStreaming ? handleStop : handleGenerate}
          className={`w-full rounded-xl py-2.5 text-sm font-bold text-white transition-all ${
            isStreaming ? 'bg-red-500 hover:bg-red-600' : 'bg-[var(--color-mushaf-gold)] hover:opacity-90'
          }`}
        >
          {isStreaming ? (ar ? 'إيقاف التوليد' : 'Stop generating') : ar ? 'اشرحلي ببساطة' : 'Explain simply'}
        </button>

        {isSeeded && !response && !isStreaming && (
          <div className="mt-1 text-center text-[10px] text-[var(--color-topic-green)]">
            {ar ? 'يوجد شرح مفصل محفوظ لهذه الآية.' : 'A richer pre-seeded explanation is available for this verse.'}
          </div>
        )}
      </div>

      {(streamText || isStreaming) && (
        <div className="page-frame mb-4 overflow-hidden rounded-xl">
          <div className="flex items-center justify-between border-b border-[var(--color-mushaf-border)] bg-[var(--color-mushaf-border)]/20 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm">AI</span>
              <span className="text-xs font-medium">
                {ar ? 'التفسير المبسط' : 'Simplified tafsir'}
              </span>
              {response?.cached && (
                <span className="rounded bg-[var(--color-topic-blue)]/20 px-1.5 py-0.5 text-[10px] text-[var(--color-topic-blue)]">
                  {ar ? 'مخزن مؤقتًا' : 'Cached'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isStreaming && (
                <span className="animate-pulse text-[10px] text-[var(--color-mushaf-gold)]">
                  {ar ? 'جارٍ التوليد...' : 'Generating...'}
                </span>
              )}
              {streamText && !isStreaming && (
                <button
                  onClick={handleCopy}
                  className="rounded bg-[var(--color-mushaf-border)]/20 px-2 py-0.5 text-[10px] transition-colors hover:bg-[var(--color-mushaf-border)]/40"
                >
                  {ar ? (copied ? 'تم النسخ' : 'نسخ') : copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
          </div>

          {streamText && !isStreaming && (
            <div className="border-b border-[var(--color-mushaf-border)]/50 bg-[var(--color-mushaf-border)]/10 px-4 py-3">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={handleSpeak}
                  disabled={!ttsSupported}
                  className="rounded-lg bg-[var(--color-mushaf-gold)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSpeaking && !isPaused
                    ? ar ? 'إعادة تشغيل الشرح' : 'Replay tafsir'
                    : ar ? 'استمع للشرح' : 'Listen to tafsir'}
                </button>
                <button
                  onClick={isPaused ? resumeTts : pauseTts}
                  disabled={!isSpeaking}
                  className="rounded-lg bg-[var(--color-mushaf-border)]/30 px-3 py-1.5 text-xs transition-colors hover:bg-[var(--color-mushaf-border)]/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPaused ? (ar ? 'استكمال' : 'Resume') : ar ? 'إيقاف مؤقت' : 'Pause'}
                </button>
                <button
                  onClick={stopTts}
                  disabled={!isSpeaking && !isPaused}
                  className="rounded-lg bg-[var(--color-mushaf-border)]/30 px-3 py-1.5 text-xs transition-colors hover:bg-[var(--color-mushaf-border)]/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {ar ? 'إيقاف الصوت' : 'Stop audio'}
                </button>
                <span className="text-[10px] text-[var(--color-mushaf-text)]/50">
                  {ar ? 'المزوّد' : 'Provider'}: {provider}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="flex flex-col gap-1 text-[10px] text-[var(--color-mushaf-text)]/55">
                  <span>{ar ? 'الصوت' : 'Voice'}</span>
                  <select
                    value={selectedVoiceId}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    disabled={!ttsSupported || voices.length === 0}
                    className="rounded-lg border border-[var(--color-mushaf-border)] bg-[var(--color-background)] px-2 py-2 text-xs"
                  >
                    {voices.length === 0 ? (
                      <option value="">{ar ? 'لا توجد أصوات متاحة' : 'No voices available'}</option>
                    ) : (
                      voices.map((voice) => (
                        <option key={voice.id} value={voice.id}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))
                    )}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-[10px] text-[var(--color-mushaf-text)]/55">
                  <span>{ar ? 'السرعة' : 'Speed'}: {ttsRate.toFixed(2)}x</span>
                  <input
                    type="range"
                    min="0.7"
                    max="1.25"
                    step="0.05"
                    value={ttsRate}
                    onChange={(e) => setTtsRate(Number(e.target.value))}
                  />
                </label>

                <label className="flex flex-col gap-1 text-[10px] text-[var(--color-mushaf-text)]/55">
                  <span>{ar ? 'حدة الصوت' : 'Pitch'}: {ttsPitch.toFixed(2)}</span>
                  <input
                    type="range"
                    min="0.8"
                    max="1.2"
                    step="0.05"
                    value={ttsPitch}
                    onChange={(e) => setTtsPitch(Number(e.target.value))}
                  />
                </label>
              </div>

              <div className="mt-2 min-h-4 text-[10px] text-[var(--color-topic-blue)]">
                {ttsMessage || (!ttsSupported ? (ar ? 'الشرح الصوتي يعتمد على دعم المتصفح لـ Web Speech API.' : 'Spoken playback depends on Web Speech API support in the browser.') : '')}
              </div>
            </div>
          )}

          <div ref={textContainerRef} className="max-h-[400px] overflow-y-auto p-4">
            <div className="whitespace-pre-wrap font-[var(--font-arabic)] text-sm leading-[2]" dir="rtl">
              {streamText}
              {isStreaming && (
                <span className="mr-1 inline-block h-4 w-2 animate-pulse align-middle bg-[var(--color-mushaf-gold)]" />
              )}
            </div>
          </div>

          {streamSources.length > 0 && !isStreaming && (
            <div className="border-t border-[var(--color-mushaf-border)] bg-[var(--color-mushaf-border)]/10 px-4 py-2.5">
              <div className="mb-1 text-[10px] text-[var(--color-mushaf-text)]/50">
                {ar ? 'المصادر المعتمدة:' : 'Sources:'}
              </div>
              <div className="flex flex-wrap gap-2">
                {streamSources.map((src) => (
                  <span
                    key={src.id}
                    className="rounded-full bg-[var(--color-mushaf-gold)]/10 px-2 py-0.5 text-[10px] text-[var(--color-mushaf-gold)]"
                  >
                    {ar ? src.name_ar : src.name_en}
                  </span>
                ))}
              </div>
            </div>
          )}

          {guardrailResult && (
            <div className="border-t border-[var(--color-mushaf-border)]/50 px-4 py-2">
              <div
                className={`flex items-center gap-1 text-[10px] ${
                  guardrailResult.safe ? 'text-[var(--color-topic-green)]' : 'text-red-500'
                }`}
              >
                <span>{guardrailResult.safe ? 'OK' : '!'}</span>
                <span>
                  {guardrailResult.safe
                    ? ar ? 'المحتوى اجتاز ضوابط العرض.' : 'Content passed display guardrails.'
                    : ar ? `تنبيه: ${guardrailResult.reason}` : `Warning: ${guardrailResult.reason}`}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {!streamText && !isStreaming && (
        <div className="page-frame mb-4 rounded-xl p-4">
          <h3 className="mb-2 text-xs font-semibold text-[var(--color-mushaf-gold)]">
            {ar ? 'ضمانات المحتوى' : 'Content guardrails'}
          </h3>
          <div className="space-y-1.5 text-[11px] text-[var(--color-mushaf-text)]/60" dir="rtl">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-green-500">✓</span>
              <span>
                {ar
                  ? 'يعتمد على التفاسير المعتمدة مثل ابن كثير والسعدي والتفسير الميسر.'
                  : 'Uses trusted tafsirs such as Ibn Kathir, Al-Saadi, and Al-Muyassar.'}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-green-500">✓</span>
              <span>
                {ar
                  ? 'لا يصدر فتاوى، بل يقدم شرحًا مساعدًا للفهم.'
                  : 'Does not issue fatwas; it is an aid for understanding.'}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-green-500">✓</span>
              <span>
                {ar
                  ? 'يمكن تشغيل الشرح صوتيًا بصوت المتصفح واختيار السرعة والصوت المناسب.'
                  : 'The explanation can be played back with browser TTS, with selectable voice and speed.'}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-green-500">✓</span>
              <span>
                {ar
                  ? 'التخزين المؤقت يسرّع إعادة فتح نفس الآية مرة أخرى.'
                  : 'Caching makes repeat verse explanations instant.'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="page-frame rounded-xl p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-[var(--color-mushaf-text)]/60">
            {ar ? 'التخزين المؤقت' : 'Cache'}
          </h3>
          {cacheStats.count > 0 && (
            <button
              onClick={handleClearCache}
              className="text-[10px] text-red-400 transition-colors hover:text-red-500"
            >
              {ar ? 'مسح' : 'Clear'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-lg font-bold text-[var(--color-mushaf-gold)]">{cacheStats.count}</div>
            <div className="text-[10px] text-[var(--color-mushaf-text)]/40">{ar ? 'عناصر مخزنة' : 'Cached items'}</div>
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

        <div className="mt-3 border-t border-[var(--color-mushaf-border)]/30 pt-3">
          <div className="mb-1 text-[10px] text-[var(--color-mushaf-text)]/40">
            {ar ? 'المراجع الأساسية:' : 'Trusted references:'}
          </div>
          <div className="flex flex-wrap gap-1">
            {TAFSIR_SOURCES.map((src) => (
              <span key={src.id} className="rounded bg-[var(--color-mushaf-border)]/15 px-2 py-0.5 text-[10px]">
                {ar ? src.author_ar : src.author_en}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
