'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export type TtsProvider = 'web-speech';

export interface TtsVoiceOption {
  id: string;
  name: string;
  lang: string;
  localService: boolean;
  defaultVoice: boolean;
}

const VOICE_STORAGE_KEY = 'mushaf-tafsir-tts-voice';
const RATE_STORAGE_KEY = 'mushaf-tafsir-tts-rate';
const PITCH_STORAGE_KEY = 'mushaf-tafsir-tts-pitch';

function sortVoices(voices: SpeechSynthesisVoice[]) {
  return [...voices].sort((a, b) => {
    const aArabic = a.lang.toLowerCase().startsWith('ar');
    const bArabic = b.lang.toLowerCase().startsWith('ar');
    if (aArabic && !bArabic) return -1;
    if (!aArabic && bArabic) return 1;
    if (a.default && !b.default) return -1;
    if (!a.default && b.default) return 1;
    return a.name.localeCompare(b.name);
  });
}

function loadStoredNumber(key: string, fallback: number) {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function useTafsirTts() {
  const [voices, setVoices] = useState<TtsVoiceOption[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState('');
  const [rate, setRateState] = useState(() => loadStoredNumber(RATE_STORAGE_KEY, 0.95));
  const [pitch, setPitchState] = useState(() => loadStoredNumber(PITCH_STORAGE_KEY, 1));
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const isSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined';

  useEffect(() => {
    if (!isSupported) return;

    const synth = window.speechSynthesis;

    const applyVoices = () => {
      const speechVoices = sortVoices(synth.getVoices());
      const mapped = speechVoices.map((voice) => ({
        id: voice.voiceURI,
        name: voice.name,
        lang: voice.lang,
        localService: voice.localService,
        defaultVoice: voice.default,
      }));

      setVoices(mapped);

      const stored = window.localStorage.getItem(VOICE_STORAGE_KEY);
      const chosen =
        mapped.find((voice) => voice.id === stored) ||
        mapped.find((voice) => voice.lang.toLowerCase().startsWith('ar')) ||
        mapped[0];

      if (chosen) {
        setSelectedVoiceId(chosen.id);
      }
    };

    applyVoices();
    synth.addEventListener('voiceschanged', applyVoices);

    return () => {
      synth.removeEventListener('voiceschanged', applyVoices);
      synth.cancel();
    };
  }, [isSupported]);

  const selectedVoice = useMemo(
    () => voices.find((voice) => voice.id === selectedVoiceId) || voices[0] || null,
    [selectedVoiceId, voices]
  );

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, [isSupported]);

  const pause = useCallback(() => {
    if (!isSupported || !window.speechSynthesis.speaking) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, [isSupported]);

  const resume = useCallback(() => {
    if (!isSupported || !window.speechSynthesis.paused) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
    setIsSpeaking(true);
  }, [isSupported]);

  const speak = useCallback((text: string) => {
    if (!isSupported || !text.trim()) return false;

    const utterance = new SpeechSynthesisUtterance(text);
    const synth = window.speechSynthesis;
    const availableVoices = synth.getVoices();
    const voice = availableVoices.find((item) => item.voiceURI === selectedVoiceId);

    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || selectedVoice?.lang || 'ar-SA';
    utterance.rate = rate;
    utterance.pitch = pitch;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    utterance.onpause = () => {
      setIsPaused(true);
    };
    utterance.onresume = () => {
      setIsPaused(false);
      setIsSpeaking(true);
    };

    synth.cancel();
    synth.speak(utterance);
    return true;
  }, [isSupported, pitch, rate, selectedVoice?.lang, selectedVoiceId]);

  const setSelectedVoice = useCallback((voiceId: string) => {
    setSelectedVoiceId(voiceId);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VOICE_STORAGE_KEY, voiceId);
    }
  }, []);

  const setRate = useCallback((value: number) => {
    setRateState(value);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(RATE_STORAGE_KEY, String(value));
    }
  }, []);

  const setPitch = useCallback((value: number) => {
    setPitchState(value);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PITCH_STORAGE_KEY, String(value));
    }
  }, []);

  return {
    provider: 'web-speech' as TtsProvider,
    isSupported,
    voices,
    selectedVoice,
    selectedVoiceId,
    setSelectedVoice,
    rate,
    setRate,
    pitch,
    setPitch,
    isSpeaking,
    isPaused,
    speak,
    stop,
    pause,
    resume,
  };
}
