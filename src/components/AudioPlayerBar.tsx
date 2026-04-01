'use client';

import { useState, useRef } from 'react';
import { SURAH_NAMES } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { useAudioPlayer } from '@/lib/useAudioPlayer';

/**
 * Fixed bottom audio player bar — appears when audio is active.
 * Shows playback controls, progress, reciter selector, repeat & speed options.
 */
export default function AudioPlayerBar() {
  const { lang } = useI18n();
  const {
    state, isPlaying, isActive,
    togglePlayPause, stop, next, previous, seek,
    setReciter, cycleRepeatMode, setPlaybackRate, reciters,
  } = useAudioPlayer();
  const [showReciterPicker, setShowReciterPicker] = useState(false);
  const [showSpeed, setShowSpeed] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const ar = lang === 'ar';

  if (!isActive) return null;

  const verse = state.currentVerse;
  const repeatIcon = state.repeatMode === 'verse' ? '🔂' : state.repeatMode === 'page' ? '🔁' : '➡️';
  const repeatLabel = state.repeatMode === 'verse'
    ? (ar ? 'تكرار الآية' : 'Repeat verse')
    : state.repeatMode === 'page'
    ? (ar ? 'تكرار الصفحة' : 'Repeat page')
    : (ar ? 'بدون تكرار' : 'No repeat');

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    // In RTL, clicking on the right means beginning
    const rawFrac = (e.clientX - rect.left) / rect.width;
    const fraction = ar ? 1 - rawFrac : rawFrac;
    seek(Math.max(0, Math.min(1, fraction)));
  };

  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <>
      {/* Backdrop for pickers */}
      {(showReciterPicker || showSpeed) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setShowReciterPicker(false); setShowSpeed(false); }}
        />
      )}

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-mushaf-paper)] border-t border-[var(--color-mushaf-border)] shadow-lg safe-bottom">
        {/* Progress bar */}
        <div
          ref={progressRef}
          className="h-1.5 cursor-pointer group relative"
          onClick={handleProgressClick}
        >
          <div className="absolute inset-0 bg-[var(--color-mushaf-border)]/30" />
          <div
            className="absolute top-0 h-full bg-[var(--color-mushaf-gold)] transition-all duration-200"
            style={{
              width: `${state.progress * 100}%`,
              [ar ? 'right' : 'left']: 0,
            }}
          />
          <div className="absolute inset-0 bg-[var(--color-mushaf-gold)]/0 group-hover:bg-[var(--color-mushaf-gold)]/10 transition-colors" />
        </div>

        {/* Controls */}
        <div className="px-3 sm:px-4 py-2 flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Verse info */}
          <div className="flex-1 min-w-0 basis-full sm:basis-auto order-1 sm:order-none">
            {verse && (
              <div className="text-sm truncate">
                <span className="font-[var(--font-arabic)] text-[var(--color-mushaf-text)]">
                  {SURAH_NAMES[verse.surah]}
                </span>
                <span className="text-[var(--color-mushaf-text)]/40 mx-1.5">:</span>
                <span className="text-[var(--color-mushaf-text)]/60">{verse.ayah}</span>
                {state.playlist.length > 1 && (
                  <span className="text-[10px] text-[var(--color-mushaf-text)]/30 mx-2">
                    {state.playlistIndex + 1}/{state.playlist.length}
                  </span>
                )}
              </div>
            )}
            <div className="text-[10px] text-[var(--color-mushaf-text)]/40">
              {formatTime(state.currentTime)} / {formatTime(state.duration)}
              <span className="mx-1">·</span>
              {state.reciter.name_ar}
            </div>
          </div>

          {/* Playback controls */}
          <div className="flex items-center gap-1.5 order-2 sm:order-none">
            {/* Previous */}
            <button
              onClick={previous}
              disabled={state.playlistIndex <= 0}
              className="p-2.5 rounded-lg hover:bg-[var(--color-mushaf-border)]/30 disabled:opacity-20 transition-colors"
              title={ar ? 'السابق' : 'Previous'}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlayPause}
              className="p-2 rounded-full bg-[var(--color-mushaf-gold)] text-white hover:opacity-90 transition-opacity"
            >
              {state.playback === 'loading' ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : isPlaying ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>

            {/* Next */}
            <button
              onClick={next}
              disabled={state.playlistIndex >= state.playlist.length - 1}
              className="p-2.5 rounded-lg hover:bg-[var(--color-mushaf-border)]/30 disabled:opacity-20 transition-colors"
              title={ar ? 'التالي' : 'Next'}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>

            {/* Stop */}
            <button
              onClick={stop}
              className="p-2.5 rounded-lg hover:bg-[var(--color-mushaf-border)]/30 transition-colors text-[var(--color-mushaf-text)]/40 hover:text-[var(--color-topic-red)]"
              title={ar ? 'إيقاف' : 'Stop'}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z"/>
              </svg>
            </button>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-1 order-3 sm:order-none">
            {/* Repeat mode */}
            <button
              onClick={cycleRepeatMode}
              className="p-2.5 rounded-lg hover:bg-[var(--color-mushaf-border)]/30 transition-colors text-sm"
              title={repeatLabel}
            >
              {repeatIcon}
            </button>

            {/* Speed */}
            <div className="relative">
              <button
                onClick={() => { setShowSpeed(!showSpeed); setShowReciterPicker(false); }}
                className="px-2.5 py-2 rounded-lg hover:bg-[var(--color-mushaf-border)]/30 transition-colors text-xs font-bold text-[var(--color-mushaf-text)]/60"
                title={ar ? 'السرعة' : 'Speed'}
              >
                {state.playbackRate}x
              </button>
              {showSpeed && (
                <div className="absolute bottom-full mb-2 end-0 bg-[var(--color-mushaf-paper)] border border-[var(--color-mushaf-border)] rounded-xl shadow-lg p-2 min-w-[80px] z-50">
                  {speeds.map(s => (
                    <button
                      key={s}
                      onClick={() => { setPlaybackRate(s); setShowSpeed(false); }}
                      className={`block w-full text-start px-3 py-1.5 rounded-lg text-xs transition-colors ${
                        state.playbackRate === s
                          ? 'bg-[var(--color-mushaf-gold)]/20 text-[var(--color-mushaf-gold)] font-bold'
                          : 'hover:bg-[var(--color-mushaf-border)]/30'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reciter picker */}
            <div className="relative">
              <button
                onClick={() => { setShowReciterPicker(!showReciterPicker); setShowSpeed(false); }}
                className="p-1.5 rounded-lg hover:bg-[var(--color-mushaf-border)]/30 transition-colors"
                title={ar ? 'اختيار القارئ' : 'Choose reciter'}
              >
                <svg className="w-4 h-4 text-[var(--color-mushaf-text)]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              {showReciterPicker && (
                <div className="absolute bottom-full mb-2 end-0 bg-[var(--color-mushaf-paper)] border border-[var(--color-mushaf-border)] rounded-xl shadow-lg p-2 min-w-[200px] z-50">
                  <div className="text-[10px] text-[var(--color-mushaf-text)]/40 px-3 py-1 mb-1">
                    {ar ? 'اختر القارئ' : 'Select Reciter'}
                  </div>
                  {reciters.map(r => (
                    <button
                      key={r.id}
                      onClick={() => { setReciter(r); setShowReciterPicker(false); }}
                      className={`block w-full text-start px-3 py-2 rounded-lg text-sm transition-colors ${
                        state.reciter.id === r.id
                          ? 'bg-[var(--color-mushaf-gold)]/20 text-[var(--color-mushaf-gold)]'
                          : 'hover:bg-[var(--color-mushaf-border)]/30'
                      }`}
                    >
                      <div className="font-[var(--font-arabic)]">{r.name_ar}</div>
                      <div className="text-[10px] text-[var(--color-mushaf-text)]/40">{r.name_en} · {r.quality}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
