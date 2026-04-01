'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { SURAH_NAMES, TOPIC_HEX_BG } from '@/lib/types';
import {
  searchByVoiceText,
  createSpeechRecognition,
  isSpeechRecognitionSupported,
  type VoiceSearchResult,
  type RecognitionStatus,
} from '@/lib/voiceSearch';

interface VoiceSearchPanelProps {
  onGoToPage: (page: number) => void;
}

export default function VoiceSearchPanel({ onGoToPage }: VoiceSearchPanelProps) {
  const { lang } = useI18n();
  const isAr = lang === 'ar';

  const [status, setStatus] = useState<RecognitionStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [results, setResults] = useState<VoiceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [hasNetworkError, setHasNetworkError] = useState(false);

  const recognitionRef = useRef<ReturnType<typeof createSpeechRecognition>>(null);
  const supported = typeof window !== 'undefined' ? isSpeechRecognitionSupported() : true;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  // Auto-search when final transcript arrives
  const doSearch = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setIsSearching(true);
    setErrorMsg('');
    try {
      const matches = await searchByVoiceText(text, 8);
      setResults(matches);
      if (matches.length === 0) {
        setErrorMsg(isAr ? 'لم يتم العثور على نتائج. حاول مرة أخرى.' : 'No matches found. Try again.');
      }
    } catch {
      setErrorMsg(isAr ? 'حدث خطأ أثناء البحث' : 'Search error occurred');
    } finally {
      setIsSearching(false);
    }
  }, [isAr]);

  const startListening = useCallback(() => {
    setTranscript('');
    setInterimText('');
    setResults([]);
    setErrorMsg('');

    const rec = createSpeechRecognition({
      onTranscript: (text, isFinal) => {
        if (isFinal) {
          setTranscript(text);
          setInterimText('');
          doSearch(text);
        } else {
          setInterimText(text);
        }
      },
      onStatusChange: setStatus,
      onError: (err) => {
        const errorMap: Record<string, { ar: string; en: string }> = {
          'Microphone access denied': {
            ar: 'تم رفض الوصول للميكروفون. يرجى السماح بالوصول من إعدادات المتصفح.',
            en: 'Microphone access denied. Please allow access in browser settings.'
          },
          'No speech detected': {
            ar: 'لم يتم اكتشاف أي صوت. حاول التحدث بصوت أعلى.',
            en: 'No speech detected. Try speaking louder.'
          },
          'No microphone found': {
            ar: 'لم يتم العثور على ميكروفون. تأكد من توصيله.',
            en: 'No microphone found. Make sure one is connected.'
          },
          'Network error': {
            ar: 'خطأ في الشبكة — التعرف على الصوت يحتاج اتصال بالإنترنت. استخدم البحث الكتابي بالأسفل ⬇️',
            en: 'Network error — Speech recognition requires internet. Use text search below ⬇️'
          },
        };
        const msg = errorMap[err] ? (isAr ? errorMap[err].ar : errorMap[err].en) : err;
        setErrorMsg(msg);
        // Auto-show manual input on network/mic errors
        if (err === 'Network error' || err === 'Microphone access denied' || err === 'No microphone found') {
          setShowManual(true);
          setHasNetworkError(err === 'Network error');
        }
      },
      continuous: false,
      lang: 'ar-SA',
    });

    if (rec) {
      recognitionRef.current = rec;
      rec.start();
    }
  }, [doSearch, isAr]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setStatus('idle');
    // If we have interim text, search with it
    if (interimText && !transcript) {
      setTranscript(interimText);
      doSearch(interimText);
      setInterimText('');
    }
  }, [interimText, transcript, doSearch]);

  const handleManualSearch = useCallback(() => {
    if (!manualInput.trim()) return;
    setTranscript(manualInput);
    doSearch(manualInput);
  }, [manualInput, doSearch]);

  const isListening = status === 'listening';

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">
          🎙️ {isAr ? 'البحث الصوتي' : 'Voice Search'}
        </h2>
        <p className="text-sm opacity-60">
          {isAr
            ? 'اقرأ جزءاً من آية وسيتعرف التطبيق عليها فوراً'
            : 'Read part of a verse and the app will recognize it instantly'}
        </p>
      </div>

      {/* Microphone Button */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={!supported && !showManual}
          className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 ${
            isListening
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-110'
              : 'bg-[var(--color-mushaf-gold)] text-white hover:scale-105 hover:shadow-lg hover:shadow-[var(--color-mushaf-gold)]/30'
          } ${!supported ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {/* Pulse animation when listening */}
          {isListening && (
            <>
              <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20" />
              <span className="absolute inset-[-8px] rounded-full border-2 border-red-400 animate-pulse opacity-40" />
            </>
          )}
          <svg className="w-12 h-12 relative z-10" fill="currentColor" viewBox="0 0 24 24">
            {isListening ? (
              // Stop icon
              <rect x="6" y="6" width="12" height="12" rx="2" />
            ) : (
              // Microphone icon
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            )}
          </svg>
        </button>

        <p className="text-sm font-medium">
          {isListening
            ? (isAr ? '🔴 جاري الاستماع... اقرأ الآية' : '🔴 Listening... read the verse')
            : status === 'processing'
              ? (isAr ? '⏳ جاري المعالجة...' : '⏳ Processing...')
              : (isAr ? 'اضغط للتحدث' : 'Tap to speak')}
        </p>

        {!supported && (
          <p className="text-xs text-orange-500 text-center">
            {isAr
              ? '⚠️ المتصفح لا يدعم التعرف على الصوت. استخدم البحث اليدوي.'
              : '⚠️ Browser does not support speech recognition. Use manual search.'}
          </p>
        )}
      </div>

      {/* Live Transcript */}
      {(transcript || interimText) && (
        <div className="bg-[var(--color-mushaf-paper)] border border-[var(--color-mushaf-border)] rounded-xl p-4 text-center">
          <p className="text-xs opacity-50 mb-1">{isAr ? 'النص المسموع:' : 'Heard:'}</p>
          <p className="text-lg font-[var(--font-arabic)] leading-relaxed" dir="rtl">
            {transcript || <span className="opacity-50 animate-pulse">{interimText}</span>}
          </p>
        </div>
      )}

      {/* Manual Text Search */}
      <div className="space-y-3">
        {!showManual && (
          <div className="text-center">
            <button
              onClick={() => setShowManual(true)}
              className="text-xs text-[var(--color-mushaf-gold)] hover:underline"
            >
              {isAr ? '⌨️ أو ابحث يدوياً بكتابة النص' : '⌨️ Or search manually by typing'}
            </button>
          </div>
        )}

        {showManual && (
          <div className="space-y-2">
            {hasNetworkError && (
              <p className="text-center text-sm font-medium">
                {isAr ? '⌨️ ابحث بكتابة جزء من الآية:' : '⌨️ Search by typing part of a verse:'}
              </p>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleManualSearch(); }}
                placeholder={isAr ? 'اكتب جزءاً من آية... مثال: بسم الله الرحمن' : 'Type part of a verse...'}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-[var(--color-mushaf-gold)]/40 bg-transparent text-base font-[var(--font-arabic)] focus:border-[var(--color-mushaf-gold)] focus:outline-none transition-colors"
                dir="rtl"
                autoFocus={hasNetworkError}
              />
              <button
                onClick={handleManualSearch}
                disabled={!manualInput.trim() || isSearching}
                className="px-6 py-3 rounded-xl bg-[var(--color-mushaf-gold)] text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isAr ? 'بحث' : 'Search'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="text-center text-sm bg-red-50 dark:bg-red-900/20 rounded-xl p-4 space-y-2">
          <p className="text-red-600 dark:text-red-400">{errorMsg}</p>
          <button
            onClick={() => { setErrorMsg(''); startListening(); }}
            className="text-xs text-[var(--color-mushaf-gold)] hover:underline"
          >
            {isAr ? '🔄 إعادة المحاولة' : '🔄 Retry'}
          </button>
        </div>
      )}

      {/* Loading */}
      {isSearching && (
        <div className="flex items-center justify-center gap-2 p-4">
          <div className="w-5 h-5 border-2 border-[var(--color-mushaf-gold)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">{isAr ? 'جاري البحث في القرآن...' : 'Searching the Quran...'}</span>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-sm">
            {isAr ? `✅ تم العثور على ${results.length} نتائج:` : `✅ Found ${results.length} results:`}
          </h3>

          {results.map((r, i) => (
            <ResultCard
              key={r.verse.verse_key}
              result={r}
              rank={i + 1}
              isAr={isAr}
              onGoToPage={onGoToPage}
            />
          ))}
        </div>
      )}

      {/* Tips */}
      {results.length === 0 && !isSearching && !transcript && (
        <div className="bg-[var(--color-mushaf-paper)] border border-[var(--color-mushaf-border)] rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-sm">{isAr ? '💡 نصائح للنتائج الأفضل:' : '💡 Tips for best results:'}</h3>
          <ul className="text-sm space-y-2 opacity-70" dir={isAr ? 'rtl' : 'ltr'}>
            <li>{isAr ? '• اقرأ 3 كلمات على الأقل من الآية' : '• Read at least 3 words from the verse'}</li>
            <li>{isAr ? '• تحدث بوضوح وبصوت مسموع' : '• Speak clearly and audibly'}</li>
            <li>{isAr ? '• يمكنك قراءة من أي موضع في الآية' : '• You can read from any position in the verse'}</li>
            <li>{isAr ? '• التطبيق يتعرف على النص حتى بدون تشكيل' : '• The app recognizes text even without diacritics'}</li>
            <li>{isAr ? '• يمكنك أيضاً الكتابة يدوياً عبر الحقل أدناه' : '• You can also type manually using the field below'}</li>
          </ul>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Result Card Component
// ═══════════════════════════════════════════════════════════════

function ResultCard({ result, rank, isAr, onGoToPage }: {
  result: VoiceSearchResult;
  rank: number;
  isAr: boolean;
  onGoToPage: (p: number) => void;
}) {
  const { verse, score, matchType } = result;
  const bgColor = TOPIC_HEX_BG[verse.topic.color] || '#f9f9f9';
  const scorePercent = Math.round(score * 100);

  const matchLabel = matchType === 'exact'
    ? (isAr ? 'مطابقة تامة' : 'Exact match')
    : matchType === 'substring'
      ? (isAr ? 'تطابق جزئي' : 'Partial match')
      : (isAr ? 'تطابق تقريبي' : 'Fuzzy match');

  const matchColor = matchType === 'exact' ? '#27AE60' : matchType === 'substring' ? '#3498DB' : '#E67E22';

  return (
    <button
      onClick={() => verse.page && onGoToPage(verse.page)}
      className="w-full text-start rounded-xl border-2 p-4 transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
      style={{ borderColor: verse.topic.hex, backgroundColor: bgColor }}
    >
      <div className="flex items-start gap-3">
        {/* Rank Badge */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ backgroundColor: verse.topic.hex }}
        >
          {rank}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          {/* Verse info row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">
              {isAr ? `سورة ${SURAH_NAMES[verse.surah]}` : `Surah ${SURAH_NAMES[verse.surah]}`} — {isAr ? `آية ${verse.ayah}` : `Verse ${verse.ayah}`}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: matchColor }}>
              {matchLabel} {scorePercent}%
            </span>
            {verse.page && (
              <span className="text-xs opacity-50">
                {isAr ? `ص${verse.page}` : `p.${verse.page}`}
              </span>
            )}
          </div>

          {/* Verse text */}
          <p className="text-base font-[var(--font-arabic)] leading-[2]" dir="rtl">
            {verse.text}
          </p>

          {/* Topic */}
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: verse.topic.hex }}
            />
            <span className="text-xs opacity-60">
              {isAr ? verse.topic.name_ar : verse.topic.name_en}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
