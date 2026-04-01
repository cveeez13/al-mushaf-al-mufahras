'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { audioManager, RECITERS, type AudioPlayerState, type PlaylistItem, type Reciter, type RepeatMode } from './audio';

const RECITER_STORAGE_KEY = 'mushaf-reciter';

function loadReciter(): Reciter {
  if (typeof window === 'undefined') return RECITERS[0];
  try {
    const id = localStorage.getItem(RECITER_STORAGE_KEY);
    if (id) {
      const found = RECITERS.find(r => r.id === id);
      if (found) return found;
    }
  } catch { /* ignore */ }
  return RECITERS[0];
}

export function useAudioPlayer() {
  const [state, setState] = useState<AudioPlayerState>(() => audioManager.state);

  // Subscribe to manager state changes
  useEffect(() => {
    // Restore saved reciter
    const saved = loadReciter();
    audioManager.setReciter(saved);

    return audioManager.subscribe(setState);
  }, []);

  const playVerse = useCallback((item: PlaylistItem) => {
    audioManager.playVerse(item);
  }, []);

  const playPage = useCallback((items: PlaylistItem[]) => {
    audioManager.playPlaylist(items);
  }, []);

  const pause = useCallback(() => audioManager.pause(), []);
  const resume = useCallback(() => audioManager.resume(), []);
  const togglePlayPause = useCallback(() => audioManager.togglePlayPause(), []);
  const stop = useCallback(() => audioManager.stop(), []);
  const next = useCallback(() => audioManager.next(), []);
  const previous = useCallback(() => audioManager.previous(), []);
  const seek = useCallback((frac: number) => audioManager.seek(frac), []);

  const setReciter = useCallback((reciter: Reciter) => {
    audioManager.setReciter(reciter);
    localStorage.setItem(RECITER_STORAGE_KEY, reciter.id);
  }, []);

  const cycleRepeatMode = useCallback(() => audioManager.cycleRepeatMode(), []);
  const setRepeatMode = useCallback((m: RepeatMode) => audioManager.setRepeatMode(m), []);

  const setPlaybackRate = useCallback((rate: number) => {
    audioManager.setPlaybackRate(rate);
  }, []);

  const isPlaying = state.playback === 'playing';
  const isActive = state.playback !== 'idle';
  const isCurrentVerse = useCallback((verseKey: string) => {
    return state.currentVerse?.verse_key === verseKey;
  }, [state.currentVerse]);

  return {
    state,
    isPlaying,
    isActive,
    isCurrentVerse,
    playVerse,
    playPage,
    pause,
    resume,
    togglePlayPause,
    stop,
    next,
    previous,
    seek,
    setReciter,
    cycleRepeatMode,
    setRepeatMode,
    setPlaybackRate,
    reciters: RECITERS,
  };
}
