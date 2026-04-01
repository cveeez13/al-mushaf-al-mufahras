'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { SURAH_NAMES, SURAH_AYAH_COUNTS } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { TAFSIRS, fetchTafsir, type TafsirInfo } from '@/lib/tafsir';
import { useHighlights, applyHighlights, HIGHLIGHT_COLORS, type TextSegment } from '@/lib/useHighlights';

interface TafsirPanelProps {
  surah: number;
  ayah: number;
  verseText: string;
  onClose: () => void;
  onNavigate: (surah: number, ayah: number) => void;
}

interface SelectionInfo {
  tafsirId: number;
  text: string;
  startOffset: number;
  endOffset: number;
  rect: { top: number; left: number };
}

export default function TafsirPanel({ surah, ayah, verseText, onClose, onNavigate }: TafsirPanelProps) {
  const { t, lang } = useI18n();
  const { addHighlight, getHighlightsForVerse, removeHighlight } = useHighlights();

  const [activeTafsirs, setActiveTafsirs] = useState<number[]>([TAFSIRS[0].id, TAFSIRS[1].id, TAFSIRS[2].id]);
  const [tafsirTexts, setTafsirTexts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const panelRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const verseKey = `${surah}:${ayah}`;

  // Fetch tafsir texts when verse or active tafsirs change
  useEffect(() => {
    for (const tid of activeTafsirs) {
      if (tafsirTexts[tid] !== undefined) continue;
      setLoading(prev => ({ ...prev, [tid]: true }));
      fetchTafsir(tid, surah, ayah).then(text => {
        setTafsirTexts(prev => ({ ...prev, [tid]: text }));
        setLoading(prev => ({ ...prev, [tid]: false }));
      });
    }
  }, [surah, ayah, activeTafsirs, tafsirTexts]);

  // Reset texts when verse changes
  useEffect(() => {
    setTafsirTexts({});
    setSelection(null);
  }, [surah, ayah]);

  // Handle text selection for highlighting
  const handleMouseUp = useCallback((tafsirId: number) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      return;
    }

    const range = sel.getRangeAt(0);
    const container = panelRefs.current.get(tafsirId);
    if (!container || !container.contains(range.commonAncestorContainer)) {
      return;
    }

    const selectedText = sel.toString().trim();
    if (!selectedText) return;

    // Calculate offset relative to the full tafsir text
    const fullText = tafsirTexts[tafsirId] || '';
    const startIdx = fullText.indexOf(selectedText);
    if (startIdx === -1) return;

    const rect = range.getBoundingClientRect();
    setSelection({
      tafsirId,
      text: selectedText,
      startOffset: startIdx,
      endOffset: startIdx + selectedText.length,
      rect: { top: rect.top, left: rect.left + rect.width / 2 },
    });
  }, [tafsirTexts]);

  const handleHighlight = (colorId: string) => {
    if (!selection) return;
    const color = HIGHLIGHT_COLORS.find(c => c.id === colorId);
    if (!color) return;

    addHighlight({
      verse_key: verseKey,
      tafsir_id: selection.tafsirId,
      text: selection.text,
      start_offset: selection.startOffset,
      end_offset: selection.endOffset,
      color: color.hex,
    });

    window.getSelection()?.removeAllRanges();
    setSelection(null);
  };

  const toggleTafsir = (id: number) => {
    setActiveTafsirs(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  // Determine grid columns based on active count
  const colClass = activeTafsirs.length === 1 ? 'grid-cols-1'
    : activeTafsirs.length === 2 ? 'grid-cols-1 md:grid-cols-2'
    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-mushaf-bg)]">
      {/* Header */}
      <div className="bg-[var(--color-mushaf-paper)] border-b border-[var(--color-mushaf-border)] px-3 sm:px-4 py-2 sm:py-3 shrink-0">
        {/* Top row: close + title + verse nav */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onClose}
            className="p-2.5 rounded-lg hover:bg-[var(--color-mushaf-border)]/30 transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-[var(--color-mushaf-gold)] font-[var(--font-arabic)] text-base sm:text-lg truncate">
              {lang === 'ar' ? 'مقارنة التفاسير' : 'Tafsir Comparison'}
            </h2>
            <div className="text-xs text-[var(--color-mushaf-text)]/50">
              {t('surah')} {SURAH_NAMES[surah]} — {t('ayah')} {ayah}
            </div>
          </div>

          {/* Verse navigation */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                if (ayah > 1) onNavigate(surah, ayah - 1);
              }}
              disabled={ayah <= 1}
              className="p-2 rounded hover:bg-[var(--color-mushaf-border)]/30 disabled:opacity-30"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <span className="text-xs sm:text-sm font-medium px-1 sm:px-2">{verseKey}</span>
            <button
              onClick={() => {
                if (ayah < (SURAH_AYAH_COUNTS[surah] || 999)) onNavigate(surah, ayah + 1);
              }}
              disabled={ayah >= (SURAH_AYAH_COUNTS[surah] || 999)}
              className="p-2 rounded hover:bg-[var(--color-mushaf-border)]/30 disabled:opacity-30"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tafsir toggles — separate row, scrollable on mobile */}
        <div className="flex gap-1 mt-2 overflow-x-auto scrollbar-none">
          {TAFSIRS.map(tf => (
            <button
              key={tf.id}
              onClick={() => toggleTafsir(tf.id)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                activeTafsirs.includes(tf.id)
                  ? 'bg-[var(--color-mushaf-gold)] text-white border-[var(--color-mushaf-gold)]'
                  : 'border-[var(--color-mushaf-border)] hover:border-[var(--color-mushaf-gold)]'
              }`}
            >
              {lang === 'ar' ? tf.author_ar : tf.author_en}
            </button>
          ))}
        </div>
      </div>

      {/* Verse text */}
      <div className="bg-[var(--color-mushaf-paper)]/50 border-b border-[var(--color-mushaf-border)] px-6 py-4">
        <div className="max-w-5xl mx-auto text-center font-[var(--font-arabic)] text-xl leading-[2.2] text-[var(--color-mushaf-text)]">
          {verseText}
          <span className="verse-number mx-1">{ayah}</span>
        </div>
      </div>

      {/* Tafsir panels — multi-column comparison */}
      <div className={`flex-1 overflow-y-auto p-4`}>
        <div className={`grid ${colClass} gap-4 max-w-7xl mx-auto h-full`}>
          {activeTafsirs.map(tid => {
            const info = TAFSIRS.find(t => t.id === tid)!;
            const text = tafsirTexts[tid];
            const isLoading = loading[tid];
            const verseHighlights = getHighlightsForVerse(verseKey, tid);
            const segments = text ? applyHighlights(text, verseHighlights) : [];

            return (
              <div
                key={tid}
                className="page-frame rounded-xl flex flex-col overflow-hidden"
              >
                {/* Panel header */}
                <div className="bg-[var(--color-mushaf-border)]/20 px-4 py-2.5 border-b border-[var(--color-mushaf-border)] shrink-0">
                  <h3 className="font-semibold text-sm text-[var(--color-mushaf-gold)]">
                    {lang === 'ar' ? info.name_ar : info.name_en}
                  </h3>
                  <div className="text-[10px] text-[var(--color-mushaf-text)]/40">
                    {lang === 'ar' ? info.author_ar : info.author_en}
                  </div>
                </div>

                {/* Panel body */}
                <div
                  ref={el => { if (el) panelRefs.current.set(tid, el); }}
                  className="flex-1 p-4 overflow-y-auto font-[var(--font-arabic)] text-base leading-[2] select-text cursor-text"
                  onMouseUp={() => handleMouseUp(tid)}
                  onTouchEnd={() => setTimeout(() => handleMouseUp(tid), 100)}
                >
                  {isLoading && (
                    <div className="flex items-center justify-center py-10">
                      <div className="animate-pulse text-[var(--color-mushaf-gold)]">
                        {t('loading')}
                      </div>
                    </div>
                  )}

                  {!isLoading && !text && (
                    <div className="text-center py-10 text-[var(--color-mushaf-text)]/40 text-sm">
                      {lang === 'ar' ? 'لا يتوفر تفسير لهذه الآية' : 'No tafsir available for this verse'}
                    </div>
                  )}

                  {!isLoading && text && segments.length > 0 && (
                    <p className="whitespace-pre-wrap">
                      {segments.map((seg, i) =>
                        seg.highlightColor ? (
                          <mark
                            key={i}
                            className="rounded px-0.5 cursor-pointer hover:opacity-70 transition-opacity"
                            style={{ backgroundColor: seg.highlightColor }}
                            title={lang === 'ar' ? 'انقر لإزالة التظليل' : 'Click to remove highlight'}
                            onClick={() => seg.highlightId && removeHighlight(seg.highlightId)}
                          >
                            {seg.text}
                          </mark>
                        ) : (
                          <span key={i}>{seg.text}</span>
                        )
                      )}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Highlight color picker — floating toolbar on selection */}
      {selection && (
        <div
          className="fixed z-[60] flex items-center gap-1 bg-[var(--color-mushaf-paper)] border border-[var(--color-mushaf-border)] rounded-xl shadow-xl px-2 py-1.5"
          style={{
            top: selection.rect.top - 48,
            left: Math.max(16, Math.min(selection.rect.left, window.innerWidth - 200)),
          }}
        >
          <span className="text-[10px] text-[var(--color-mushaf-text)]/50 px-1">
            {lang === 'ar' ? 'تظليل:' : 'Highlight:'}
          </span>
          {HIGHLIGHT_COLORS.map(c => (
            <button
              key={c.id}
              onClick={() => handleHighlight(c.id)}
              className="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
              style={{ backgroundColor: c.hex }}
              title={lang === 'ar' ? c.label_ar : c.label_en}
            />
          ))}
          <button
            onClick={() => { window.getSelection()?.removeAllRanges(); setSelection(null); }}
            className="text-xs text-[var(--color-mushaf-text)]/40 hover:text-[var(--color-mushaf-text)] px-1 mr-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
