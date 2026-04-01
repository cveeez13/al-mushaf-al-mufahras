'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Highlight {
  id: string;
  verse_key: string;
  tafsir_id: number;
  text: string;
  start_offset: number;
  end_offset: number;
  color: string;
  created_at: string;
}

export const HIGHLIGHT_COLORS = [
  { id: 'yellow', hex: '#FEF08A', label_ar: 'أصفر', label_en: 'Yellow' },
  { id: 'green', hex: '#BBF7D0', label_ar: 'أخضر', label_en: 'Green' },
  { id: 'blue', hex: '#BFDBFE', label_ar: 'أزرق', label_en: 'Blue' },
  { id: 'pink', hex: '#FBCFE8', label_ar: 'وردي', label_en: 'Pink' },
  { id: 'orange', hex: '#FED7AA', label_ar: 'برتقالي', label_en: 'Orange' },
];

const STORAGE_KEY = 'mushaf-highlights';

function loadHighlights(): Highlight[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHighlights(highlights: Highlight[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(highlights));
}

export function useHighlights() {
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  useEffect(() => {
    setHighlights(loadHighlights());
  }, []);

  const addHighlight = useCallback((h: Omit<Highlight, 'id' | 'created_at'>) => {
    setHighlights(prev => {
      const newH: Highlight = {
        ...h,
        id: `${h.verse_key}-${h.tafsir_id}-${h.start_offset}-${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      const updated = [...prev, newH];
      saveHighlights(updated);
      return updated;
    });
  }, []);

  const removeHighlight = useCallback((id: string) => {
    setHighlights(prev => {
      const updated = prev.filter(h => h.id !== id);
      saveHighlights(updated);
      return updated;
    });
  }, []);

  const getHighlightsForVerse = useCallback((verseKey: string, tafsirId: number): Highlight[] => {
    return highlights.filter(h => h.verse_key === verseKey && h.tafsir_id === tafsirId);
  }, [highlights]);

  const clearHighlights = useCallback(() => {
    setHighlights([]);
    saveHighlights([]);
  }, []);

  return { highlights, addHighlight, removeHighlight, getHighlightsForVerse, clearHighlights };
}

/**
 * Apply highlights to a text string, returning an array of segments.
 * Each segment has text, optional highlight color, and optional highlight id.
 */
export interface TextSegment {
  text: string;
  highlightColor?: string;
  highlightId?: string;
}

export function applyHighlights(text: string, highlights: Highlight[]): TextSegment[] {
  if (highlights.length === 0) return [{ text }];

  // Sort highlights by start_offset
  const sorted = [...highlights].sort((a, b) => a.start_offset - b.start_offset);

  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const h of sorted) {
    const start = Math.max(h.start_offset, cursor);
    const end = Math.min(h.end_offset, text.length);

    if (start > end) continue;

    // Add plain text before this highlight
    if (cursor < start) {
      segments.push({ text: text.slice(cursor, start) });
    }

    // Add highlighted text
    segments.push({
      text: text.slice(start, end),
      highlightColor: h.color,
      highlightId: h.id,
    });

    cursor = end;
  }

  // Add remaining text
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return segments;
}
