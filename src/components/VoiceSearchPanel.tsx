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
import VerseBookmarkButton from './VerseBookmarkButton';

interface VoiceSearchPanelProps {
  onGoToPage: (page: number) => void;
}

export default function VoiceSearchPanel({ onGoToPage }: VoiceSearchPanelProps) {
  const { lang } = useI18n();
  const isAr = lang === 'ar';
  const recognitionLangs = isAr ? ['ar-EG', 'ar-SA', 'ar'] : ['en-US', 'en-GB'];

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
        setErrorMsg(isAr ? 'Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ù†ØªØ§Ø¦Ø¬. Ø­Ø§ÙˆÙ„ Ù…Ø±Ø© Ø£Ø®Ø±Ù‰.' : 'No matches found. Try again.');
      }
    } catch {
      setErrorMsg(isAr ? 'Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ø¨Ø­Ø«' : 'Search error occurred');
    } finally {
      setIsSearching(false);
    }
  }, [isAr]);

    const startListening = useCallback((attempt = 0) => {
    if (attempt === 0) {
      setTranscript('');
      setInterimText('');
      setResults([]);
      setErrorMsg('');
      setHasNetworkError(false);
    }

    const chosenLang = recognitionLangs[Math.min(attempt, recognitionLangs.length - 1)];

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
            ar: 'تم رفض إذن الميكروفون. اسمحي بالوصول من إعدادات المتصفح.',
            en: 'Microphone access denied. Please allow access in browser settings.'
          },
          'No speech detected': {
            ar: 'لم يتم التقاط صوت. حاولي التحدث بصوت أعلى.',
            en: 'No speech detected. Try speaking louder.'
          },
          'No microphone found': {
            ar: 'لا يوجد ميكروفون متاح.',
            en: 'No microphone found. Make sure one is connected.'
          },
          'Network error': {
            ar: 'تعذر الاتصال بخدمة التعرف الصوتي.',
            en: 'Could not reach speech recognition service.'
          },
          'Speech service not allowed': {
            ar: 'خدمة التعرف الصوتي غير مسموح بها في إعدادات المتصفح.',
            en: 'Speech service is not allowed by browser/settings.'
          },
          'Language not supported': {
            ar: 'لغة التعرف الحالية غير مدعومة.',
            en: 'Recognition language is not supported.'
          },
        };

        if (err === 'Network error' && attempt < recognitionLangs.length - 1) {
          const nextAttempt = attempt + 1;
          const nextLang = recognitionLangs[nextAttempt];
          setErrorMsg(
            isAr
              ? `إعادة محاولة تلقائية بمحرك لغة مختلف (${nextLang})...`
              : `Auto-retrying with another recognition locale (${nextLang})...`
          );
          setTimeout(() => {
            recognitionRef.current?.abort();
            startListening(nextAttempt);
          }, 250);
          return;
        }

        const msg = errorMap[err] ? (isAr ? errorMap[err].ar : errorMap[err].en) : err;
        setErrorMsg(msg);
        if (err === 'Network error' || err === 'Microphone access denied' || err === 'No microphone found') {
          setShowManual(true);
          setHasNetworkError(err === 'Network error');
        }
      },
      continuous: false,
      lang: chosenLang,
    });

    if (rec) {
      recognitionRef.current = rec;
      rec.start();
    }
  }, [doSearch, isAr, recognitionLangs]);

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
          ðŸŽ™ï¸ {isAr ? 'Ø§Ù„Ø¨Ø­Ø« Ø§Ù„ØµÙˆØªÙŠ' : 'Voice Search'}
        </h2>
        <p className="text-sm opacity-60">
          {isAr
            ? 'Ø§Ù‚Ø±Ø£ Ø¬Ø²Ø¡Ø§Ù‹ Ù…Ù† Ø¢ÙŠØ© ÙˆØ³ÙŠØªØ¹Ø±Ù Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ø¹Ù„ÙŠÙ‡Ø§ ÙÙˆØ±Ø§Ù‹'
            : 'Read part of a verse and the app will recognize it instantly'}
        </p>
      </div>

      {/* Microphone Button */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={isListening ? stopListening : () => startListening()}
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
            ? (isAr ? 'ðŸ”´ Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø§Ø³ØªÙ…Ø§Ø¹... Ø§Ù‚Ø±Ø£ Ø§Ù„Ø¢ÙŠØ©' : 'ðŸ”´ Listening... read the verse')
            : status === 'processing'
              ? (isAr ? 'â³ Ø¬Ø§Ø±ÙŠ Ø§Ù„Ù…Ø¹Ø§Ù„Ø¬Ø©...' : 'â³ Processing...')
              : (isAr ? 'Ø§Ø¶ØºØ· Ù„Ù„ØªØ­Ø¯Ø«' : 'Tap to speak')}
        </p>

        {!supported && (
          <p className="text-xs text-orange-500 text-center">
            {isAr
              ? 'âš ï¸ Ø§Ù„Ù…ØªØµÙØ­ Ù„Ø§ ÙŠØ¯Ø¹Ù… Ø§Ù„ØªØ¹Ø±Ù Ø¹Ù„Ù‰ Ø§Ù„ØµÙˆØª. Ø§Ø³ØªØ®Ø¯Ù… Ø§Ù„Ø¨Ø­Ø« Ø§Ù„ÙŠØ¯ÙˆÙŠ.'
              : 'âš ï¸ Browser does not support speech recognition. Use manual search.'}
          </p>
        )}
      </div>

      {/* Live Transcript */}
      {(transcript || interimText) && (
        <div className="bg-[var(--color-mushaf-paper)] border border-[var(--color-mushaf-border)] rounded-xl p-4 text-center">
          <p className="text-xs opacity-50 mb-1">{isAr ? 'Ø§Ù„Ù†Øµ Ø§Ù„Ù…Ø³Ù…ÙˆØ¹:' : 'Heard:'}</p>
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
              {isAr ? 'âŒ¨ï¸ Ø£Ùˆ Ø§Ø¨Ø­Ø« ÙŠØ¯ÙˆÙŠØ§Ù‹ Ø¨ÙƒØªØ§Ø¨Ø© Ø§Ù„Ù†Øµ' : 'âŒ¨ï¸ Or search manually by typing'}
            </button>
          </div>
        )}

        {showManual && (
          <div className="space-y-2">
            {hasNetworkError && (
              <p className="text-center text-sm font-medium">
                {isAr ? 'âŒ¨ï¸ Ø§Ø¨Ø­Ø« Ø¨ÙƒØªØ§Ø¨Ø© Ø¬Ø²Ø¡ Ù…Ù† Ø§Ù„Ø¢ÙŠØ©:' : 'âŒ¨ï¸ Search by typing part of a verse:'}
              </p>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleManualSearch(); }}
                placeholder={isAr ? 'Ø§ÙƒØªØ¨ Ø¬Ø²Ø¡Ø§Ù‹ Ù…Ù† Ø¢ÙŠØ©... Ù…Ø«Ø§Ù„: Ø¨Ø³Ù… Ø§Ù„Ù„Ù‡ Ø§Ù„Ø±Ø­Ù…Ù†' : 'Type part of a verse...'}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-[var(--color-mushaf-gold)]/40 bg-transparent text-base font-[var(--font-arabic)] focus:border-[var(--color-mushaf-gold)] focus:outline-none transition-colors"
                dir="rtl"
                autoFocus={hasNetworkError}
              />
              <button
                onClick={handleManualSearch}
                disabled={!manualInput.trim() || isSearching}
                className="px-6 py-3 rounded-xl bg-[var(--color-mushaf-gold)] text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isAr ? 'Ø¨Ø­Ø«' : 'Search'}
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
            {isAr ? 'ðŸ”„ Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©' : 'ðŸ”„ Retry'}
          </button>
        </div>
      )}

      {/* Loading */}
      {isSearching && (
        <div className="flex items-center justify-center gap-2 p-4">
          <div className="w-5 h-5 border-2 border-[var(--color-mushaf-gold)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">{isAr ? 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø¨Ø­Ø« ÙÙŠ Ø§Ù„Ù‚Ø±Ø¢Ù†...' : 'Searching the Quran...'}</span>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-sm">
            {isAr ? `âœ… ØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ ${results.length} Ù†ØªØ§Ø¦Ø¬:` : `âœ… Found ${results.length} results:`}
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
          <h3 className="font-bold text-sm">{isAr ? 'ðŸ’¡ Ù†ØµØ§Ø¦Ø­ Ù„Ù„Ù†ØªØ§Ø¦Ø¬ Ø§Ù„Ø£ÙØ¶Ù„:' : 'ðŸ’¡ Tips for best results:'}</h3>
          <ul className="text-sm space-y-2 opacity-70" dir={isAr ? 'rtl' : 'ltr'}>
            <li>{isAr ? 'â€¢ Ø§Ù‚Ø±Ø£ 3 ÙƒÙ„Ù…Ø§Øª Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„ Ù…Ù† Ø§Ù„Ø¢ÙŠØ©' : 'â€¢ Read at least 3 words from the verse'}</li>
            <li>{isAr ? 'â€¢ ØªØ­Ø¯Ø« Ø¨ÙˆØ¶ÙˆØ­ ÙˆØ¨ØµÙˆØª Ù…Ø³Ù…ÙˆØ¹' : 'â€¢ Speak clearly and audibly'}</li>
            <li>{isAr ? 'â€¢ ÙŠÙ…ÙƒÙ†Ùƒ Ù‚Ø±Ø§Ø¡Ø© Ù…Ù† Ø£ÙŠ Ù…ÙˆØ¶Ø¹ ÙÙŠ Ø§Ù„Ø¢ÙŠØ©' : 'â€¢ You can read from any position in the verse'}</li>
            <li>{isAr ? 'â€¢ Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ ÙŠØªØ¹Ø±Ù Ø¹Ù„Ù‰ Ø§Ù„Ù†Øµ Ø­ØªÙ‰ Ø¨Ø¯ÙˆÙ† ØªØ´ÙƒÙŠÙ„' : 'â€¢ The app recognizes text even without diacritics'}</li>
            <li>{isAr ? 'â€¢ ÙŠÙ…ÙƒÙ†Ùƒ Ø£ÙŠØ¶Ø§Ù‹ Ø§Ù„ÙƒØªØ§Ø¨Ø© ÙŠØ¯ÙˆÙŠØ§Ù‹ Ø¹Ø¨Ø± Ø§Ù„Ø­Ù‚Ù„ Ø£Ø¯Ù†Ø§Ù‡' : 'â€¢ You can also type manually using the field below'}</li>
          </ul>
        </div>
      )}
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Result Card Component
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function ResultCard({ result, rank, isAr, onGoToPage }: {
  result: VoiceSearchResult;
  rank: number;
  isAr: boolean;
  onGoToPage: (p: number) => void;
}) {
  const { verse, score, matchType } = result;
  const bgColor = TOPIC_HEX_BG[verse.topic.color] || '#f9f9f9';
  const scorePercent = Math.round(score * 100);
  const openPage = () => {
    if (verse.page) onGoToPage(verse.page);
  };

  const matchLabel = matchType === 'exact'
    ? (isAr ? 'Ù…Ø·Ø§Ø¨Ù‚Ø© ØªØ§Ù…Ø©' : 'Exact match')
    : matchType === 'substring'
      ? (isAr ? 'ØªØ·Ø§Ø¨Ù‚ Ø¬Ø²Ø¦ÙŠ' : 'Partial match')
      : (isAr ? 'ØªØ·Ø§Ø¨Ù‚ ØªÙ‚Ø±ÙŠØ¨ÙŠ' : 'Fuzzy match');

  const matchColor = matchType === 'exact' ? '#27AE60' : matchType === 'substring' ? '#3498DB' : '#E67E22';

  return (
    <div
      role={verse.page ? 'button' : undefined}
      tabIndex={verse.page ? 0 : undefined}
      onClick={openPage}
      onKeyDown={(event) => {
        if (!verse.page) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openPage();
        }
      }}
      className={`w-full text-start rounded-xl border-2 p-4 transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99] ${
        verse.page ? 'cursor-pointer' : ''
      }`}
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
              {isAr ? `Ø³ÙˆØ±Ø© ${SURAH_NAMES[verse.surah]}` : `Surah ${SURAH_NAMES[verse.surah]}`} â€” {isAr ? `Ø¢ÙŠØ© ${verse.ayah}` : `Verse ${verse.ayah}`}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: matchColor }}>
              {matchLabel} {scorePercent}%
            </span>
            {verse.page && (
              <span className="text-xs opacity-50">
                {isAr ? `Øµ${verse.page}` : `p.${verse.page}`}
              </span>
            )}
            <VerseBookmarkButton verse={verse} compact />
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
    </div>
  );
}

