/**
 * Quran audio service — streams per-ayah recitation from public CDNs.
 *
 * Uses everyayah.com CDN which hosts audio for all 6,236 verses
 * from dozens of reciters. Falls back to Web Speech API synthesis
 * if CDN audio is unavailable.
 *
 * Audio URL pattern:
 *   https://everyayah.com/data/{reciterPath}/{surah3}{ayah3}.mp3
 *   e.g. Alafasy_64kbps/002003.mp3 = Al-Baqarah ayah 3
 */

export interface Reciter {
  id: string;
  name_ar: string;
  name_en: string;
  path: string;       // CDN subfolder
  quality: string;     // bitrate label
}

export const RECITERS: Reciter[] = [
  { id: 'alafasy',   name_ar: 'مشاري العفاسي',    name_en: 'Mishary Alafasy',      path: 'Alafasy_64kbps',                quality: '64kbps' },
  { id: 'husary',    name_ar: 'محمود خليل الحصري', name_en: 'Mahmoud Al-Husary',    path: 'Husary_64kbps',                 quality: '64kbps' },
  { id: 'minshawi',  name_ar: 'محمد صديق المنشاوي', name_en: 'Mohamed Al-Minshawi', path: 'Minshawy_Murattal_128kbps',     quality: '128kbps' },
  { id: 'abdulbasit',name_ar: 'عبد الباسط عبد الصمد',name_en: 'Abdul Basit',         path: 'Abdul_Basit_Murattal_192kbps',  quality: '192kbps' },
  { id: 'sudais',    name_ar: 'عبد الرحمن السديس',  name_en: 'Abdurrahman As-Sudais',path: 'Abdurrahmaan_As-Sudais_192kbps',quality: '192kbps' },
  { id: 'shuraym',   name_ar: 'سعود الشريم',       name_en: 'Saud Ash-Shuraym',     path: 'Saood_ash-Shuraym_64kbps',      quality: '64kbps' },
];

const CDN_BASE = 'https://everyayah.com/data';

export function getAudioUrl(reciter: Reciter, surah: number, ayah: number): string {
  const s = String(surah).padStart(3, '0');
  const a = String(ayah).padStart(3, '0');
  return `${CDN_BASE}/${reciter.path}/${s}${a}.mp3`;
}

export interface PlaylistItem {
  surah: number;
  ayah: number;
  verse_key: string;
  text?: string;
}

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export type RepeatMode = 'none' | 'verse' | 'page';

export interface AudioPlayerState {
  playback: PlaybackState;
  currentVerse: PlaylistItem | null;
  playlist: PlaylistItem[];
  playlistIndex: number;
  reciter: Reciter;
  repeatMode: RepeatMode;
  playbackRate: number;
  progress: number;      // 0-1
  duration: number;       // seconds
  currentTime: number;    // seconds
}

/**
 * Core audio manager. Manages a single HTMLAudioElement,
 * playlist navigation, repeat modes, and playback rate.
 */
export class AudioManager {
  private audio: HTMLAudioElement | null = null;
  private _state: AudioPlayerState;
  private listeners: Set<(state: AudioPlayerState) => void> = new Set();

  constructor() {
    this._state = {
      playback: 'idle',
      currentVerse: null,
      playlist: [],
      playlistIndex: -1,
      reciter: RECITERS[0],
      repeatMode: 'none',
      playbackRate: 1,
      progress: 0,
      duration: 0,
      currentTime: 0,
    };
  }

  get state(): AudioPlayerState {
    return this._state;
  }

  subscribe(fn: (state: AudioPlayerState) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    const snapshot = { ...this._state };
    for (const fn of this.listeners) fn(snapshot);
  }

  private update(partial: Partial<AudioPlayerState>) {
    this._state = { ...this._state, ...partial };
    this.emit();
  }

  private ensureAudio(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = 'auto';

      this.audio.addEventListener('loadstart', () => {
        this.update({ playback: 'loading' });
      });

      this.audio.addEventListener('canplay', () => {
        if (this._state.playback === 'loading') {
          this.update({ playback: 'playing', duration: this.audio!.duration || 0 });
        }
      });

      this.audio.addEventListener('playing', () => {
        this.update({ playback: 'playing' });
      });

      this.audio.addEventListener('pause', () => {
        if (!this.audio!.ended) {
          this.update({ playback: 'paused' });
        }
      });

      this.audio.addEventListener('timeupdate', () => {
        const ct = this.audio!.currentTime;
        const dur = this.audio!.duration || 1;
        this.update({ currentTime: ct, progress: ct / dur, duration: dur });
      });

      this.audio.addEventListener('ended', () => {
        this.onTrackEnd();
      });

      this.audio.addEventListener('error', () => {
        this.update({ playback: 'error' });
        // Try Web Speech API fallback
        this.fallbackTTS();
      });
    }
    return this.audio;
  }

  /** Play a single verse. */
  playVerse(item: PlaylistItem) {
    this.update({
      playlist: [item],
      playlistIndex: 0,
      currentVerse: item,
    });
    this.loadAndPlay(item);
  }

  /** Play a list of verses (e.g. whole page). */
  playPlaylist(items: PlaylistItem[], startIndex = 0) {
    if (items.length === 0) return;
    this.update({
      playlist: items,
      playlistIndex: startIndex,
      currentVerse: items[startIndex],
    });
    this.loadAndPlay(items[startIndex]);
  }

  private loadAndPlay(item: PlaylistItem) {
    const audio = this.ensureAudio();
    const url = getAudioUrl(this._state.reciter, item.surah, item.ayah);
    audio.src = url;
    audio.playbackRate = this._state.playbackRate;
    audio.play().catch(() => {
      // Autoplay blocked or load error — try fallback
      this.update({ playback: 'error' });
      this.fallbackTTS();
    });
  }

  private onTrackEnd() {
    const { repeatMode, playlistIndex, playlist } = this._state;

    if (repeatMode === 'verse') {
      // Replay same verse
      this.loadAndPlay(playlist[playlistIndex]);
      return;
    }

    // Move to next in playlist
    const next = playlistIndex + 1;
    if (next < playlist.length) {
      this.update({
        playlistIndex: next,
        currentVerse: playlist[next],
      });
      this.loadAndPlay(playlist[next]);
    } else if (repeatMode === 'page') {
      // Loop entire playlist
      this.update({
        playlistIndex: 0,
        currentVerse: playlist[0],
      });
      this.loadAndPlay(playlist[0]);
    } else {
      // Done
      this.update({ playback: 'idle', progress: 0, currentTime: 0 });
    }
  }

  /** Web Speech API fallback for when CDN audio fails. */
  private fallbackTTS() {
    const verse = this._state.currentVerse;
    if (!verse?.text || typeof speechSynthesis === 'undefined') return;

    this.update({ playback: 'playing' });
    const utterance = new SpeechSynthesisUtterance(verse.text);
    utterance.lang = 'ar-SA';
    utterance.rate = this._state.playbackRate;

    utterance.onend = () => this.onTrackEnd();
    utterance.onerror = () => this.update({ playback: 'error' });

    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }

  pause() {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }
    speechSynthesis?.cancel();
  }

  resume() {
    if (this.audio && this.audio.paused && this.audio.src) {
      this.audio.play().catch(() => {});
      this.update({ playback: 'playing' });
    }
  }

  togglePlayPause() {
    if (this._state.playback === 'playing') {
      this.pause();
    } else if (this._state.playback === 'paused') {
      this.resume();
    }
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    speechSynthesis?.cancel();
    this.update({
      playback: 'idle',
      currentVerse: null,
      playlist: [],
      playlistIndex: -1,
      progress: 0,
      currentTime: 0,
      duration: 0,
    });
  }

  next() {
    const { playlistIndex, playlist } = this._state;
    const nextIdx = playlistIndex + 1;
    if (nextIdx < playlist.length) {
      this.update({ playlistIndex: nextIdx, currentVerse: playlist[nextIdx] });
      this.loadAndPlay(playlist[nextIdx]);
    }
  }

  previous() {
    const { playlistIndex, playlist } = this._state;
    const prevIdx = playlistIndex - 1;
    if (prevIdx >= 0) {
      this.update({ playlistIndex: prevIdx, currentVerse: playlist[prevIdx] });
      this.loadAndPlay(playlist[prevIdx]);
    }
  }

  seek(fraction: number) {
    if (this.audio && this.audio.duration) {
      this.audio.currentTime = fraction * this.audio.duration;
    }
  }

  setReciter(reciter: Reciter) {
    const wasPlaying = this._state.playback === 'playing';
    this.update({ reciter });
    // Reload current verse with new reciter
    if (this._state.currentVerse && wasPlaying) {
      this.loadAndPlay(this._state.currentVerse);
    }
  }

  setRepeatMode(mode: RepeatMode) {
    this.update({ repeatMode: mode });
  }

  cycleRepeatMode() {
    const modes: RepeatMode[] = ['none', 'verse', 'page'];
    const current = modes.indexOf(this._state.repeatMode);
    this.update({ repeatMode: modes[(current + 1) % modes.length] });
  }

  setPlaybackRate(rate: number) {
    this.update({ playbackRate: rate });
    if (this.audio) {
      this.audio.playbackRate = rate;
    }
  }

  destroy() {
    this.stop();
    if (this.audio) {
      this.audio.src = '';
      this.audio = null;
    }
    this.listeners.clear();
  }
}

// Singleton instance
export const audioManager = new AudioManager();
