'use client';

/**
 * QiraatPanel — Compare Quran recitation variants (Qira'at) side by side.
 *
 * Features:
 * - Verse selector (surah + ayah or browse available variants)
 * - Reader comparison with word-level diff highlighting
 * - Diff type legend and notes
 * - Base reader selection (compare all others against chosen base)
 */

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { SURAH_NAMES } from '@/lib/types';
import {
  getQiraatData,
  getVariantForVerse,
  diffArabicTexts,
  READER_IDS,
  READER_COLORS,
  type QiraatData,
  type QiraatVariant,
  type ReaderId,
  type ReaderInfo,
  type DiffType,
  type DiffTypeInfo,
  type DiffWord,
} from '@/lib/qiraat';

interface QiraatPanelProps {
  initialVerse?: { surah: number; ayah: number };
  onGoToPage?: (page: number) => void;
}

export default function QiraatPanel({ initialVerse, onGoToPage }: QiraatPanelProps) {
  const { lang } = useI18n();
  const isAr = lang === 'ar';

  const [data, setData] = useState<QiraatData | null>(null);
  const [loading, setLoading] = useState(true);

  // Selection state
  const [selectedSurah, setSelectedSurah] = useState(initialVerse?.surah || 1);
  const [selectedAyah, setSelectedAyah] = useState(initialVerse?.ayah || 4);
  const [variant, setVariant] = useState<QiraatVariant | null>(null);
  const [baseReader, setBaseReader] = useState<ReaderId>('hafs');
  const [activeReaders, setActiveReaders] = useState<ReaderId[]>(['hafs', 'warsh', 'qalun']);
  const [browseMode, setBrowseMode] = useState(false);
  const [variantIndex, setVariantIndex] = useState(0);

  // Load data
  useEffect(() => {
    getQiraatData().then(d => {
      setData(d);
      setLoading(false);
    });
  }, []);

  // Load variant when verse changes
  const loadVariant = useCallback(async (surah: number, ayah: number) => {
    const key = `${surah}:${ayah}`;
    const v = await getVariantForVerse(key);
    setVariant(v);
  }, []);

  useEffect(() => {
    loadVariant(selectedSurah, selectedAyah);
  }, [selectedSurah, selectedAyah, loadVariant]);

  // Browse mode navigation
  useEffect(() => {
    if (browseMode && data) {
      const nonIdentical = data.variants.filter(v => v.diff_type !== 'identical');
      if (nonIdentical[variantIndex]) {
        const v = nonIdentical[variantIndex];
        setSelectedSurah(v.surah);
        setSelectedAyah(v.ayah);
      }
    }
  }, [browseMode, variantIndex, data]);

  const toggleReader = (id: ReaderId) => {
    setActiveReaders(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  if (loading || !data) {
    return (
      <div className="p-8 text-center opacity-50">
        {isAr ? 'جارٍ تحميل بيانات القراءات...' : 'Loading Qira\'at data...'}
      </div>
    );
  }

  const readers = data.readers;
  const diffTypes = data.diff_types;
  const nonIdenticalVariants = data.variants.filter(v => v.diff_type !== 'identical');

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">📖</span>
        <div>
          <h2 className="text-lg font-bold text-[var(--color-mushaf-gold)]">
            {isAr ? 'مقارنة القراءات' : 'Qira\'at Comparison'}
          </h2>
          <p className="text-xs opacity-50">
            {isAr ? `${nonIdenticalVariants.length} آية فيها اختلاف بين القراء` : `${nonIdenticalVariants.length} verses with variant readings`}
          </p>
        </div>
      </div>

      {/* Verse Selector */}
      <div className="page-frame p-4 rounded-xl mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Browse toggle */}
          <button
            onClick={() => setBrowseMode(!browseMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              browseMode
                ? 'bg-[var(--color-mushaf-gold)] text-white border-[var(--color-mushaf-gold)]'
                : 'border-[var(--color-mushaf-border)] hover:border-[var(--color-mushaf-gold)]'
            }`}
          >
            {isAr ? '📋 تصفح الاختلافات' : '📋 Browse Variants'}
          </button>

          {browseMode ? (
            /* Browse controls */
            <div className="flex items-center gap-2">
              <button
                onClick={() => setVariantIndex(Math.max(0, variantIndex - 1))}
                disabled={variantIndex === 0}
                className="px-2 py-1 rounded hover:bg-[var(--color-mushaf-border)]/30 disabled:opacity-30"
              >
                {isAr ? '→' : '←'}
              </button>
              <span className="text-sm font-medium">
                {variantIndex + 1} / {nonIdenticalVariants.length}
              </span>
              <button
                onClick={() => setVariantIndex(Math.min(nonIdenticalVariants.length - 1, variantIndex + 1))}
                disabled={variantIndex >= nonIdenticalVariants.length - 1}
                className="px-2 py-1 rounded hover:bg-[var(--color-mushaf-border)]/30 disabled:opacity-30"
              >
                {isAr ? '←' : '→'}
              </button>
            </div>
          ) : (
            /* Manual selector */
            <>
              <select
                value={selectedSurah}
                onChange={e => { setSelectedSurah(parseInt(e.target.value)); setSelectedAyah(1); }}
                className="p-2 rounded-lg border border-[var(--color-mushaf-border)] bg-transparent text-sm"
              >
                {Object.entries(SURAH_NAMES).map(([num, name]) => (
                  <option key={num} value={num}>{num}. {name}</option>
                ))}
              </select>

              <div className="flex items-center gap-1">
                <label className="text-xs opacity-50">{isAr ? 'آية:' : 'Ayah:'}</label>
                <input
                  type="number"
                  min={1}
                  max={286}
                  value={selectedAyah}
                  onChange={e => setSelectedAyah(parseInt(e.target.value) || 1)}
                  className="w-16 p-2 rounded-lg border border-[var(--color-mushaf-border)] bg-transparent text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </>
          )}

          {/* Verse info */}
          <div className="ml-auto text-sm font-medium text-[var(--color-mushaf-gold)]">
            {isAr ? 'سورة' : 'Surah'} {SURAH_NAMES[selectedSurah]} — {isAr ? 'آية' : 'Ayah'} {selectedAyah}
          </div>
        </div>
      </div>

      {/* No variant found */}
      {!variant && (
        <div className="page-frame p-8 rounded-xl text-center opacity-50">
          <div className="text-4xl mb-3">🔍</div>
          <p>{isAr ? 'لا توجد بيانات قراءات لهذه الآية في قاعدة البيانات' : 'No variant data for this verse in the database'}</p>
          <p className="text-xs mt-2">{isAr ? 'جرّب تصفح الاختلافات المتاحة' : 'Try browsing available variants'}</p>
        </div>
      )}

      {variant && (
        <>
          {/* Diff type badge & notes */}
          <div className="page-frame p-4 rounded-xl mb-4">
            <div className="flex items-center gap-3 mb-2">
              <span
                className="px-2.5 py-1 rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: diffTypes[variant.diff_type]?.color || '#95A5A6' }}
              >
                {isAr ? diffTypes[variant.diff_type]?.label_ar : diffTypes[variant.diff_type]?.label_en}
              </span>
              <span className="text-xs opacity-40">{variant.verse_key}</span>
            </div>
            <p className="text-sm leading-relaxed" dir={isAr ? 'rtl' : 'ltr'}>
              {isAr ? variant.notes_ar : variant.notes_en}
            </p>
          </div>

          {/* Reader toggles + Base reader picker */}
          <div className="page-frame p-4 rounded-xl mb-4">
            <div className="flex flex-wrap items-start gap-4">
              {/* Base reader */}
              <div>
                <label className="text-xs opacity-50 block mb-1.5">{isAr ? 'القراءة الأساسية:' : 'Base reader:'}</label>
                <div className="flex flex-wrap gap-1">
                  {READER_IDS.map(id => (
                    <button
                      key={id}
                      onClick={() => {
                        setBaseReader(id);
                        if (!activeReaders.includes(id)) setActiveReaders(prev => [...prev, id]);
                      }}
                      className={`px-3 py-1.5 text-xs rounded-lg border-2 transition-colors ${
                        baseReader === id
                          ? 'text-white font-bold'
                          : 'border-transparent hover:opacity-70'
                      }`}
                      style={{
                        borderColor: baseReader === id ? READER_COLORS[id] : 'transparent',
                        backgroundColor: baseReader === id ? READER_COLORS[id] : 'transparent',
                        color: baseReader === id ? 'white' : READER_COLORS[id],
                      }}
                    >
                      {isAr ? readers[id].name_ar : readers[id].name_en}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active readers */}
              <div className="flex-1">
                <label className="text-xs opacity-50 block mb-1.5">{isAr ? 'القراء المعروضون:' : 'Visible readers:'}</label>
                <div className="flex flex-wrap gap-1">
                  {READER_IDS.filter(id => id !== baseReader).map(id => (
                    <button
                      key={id}
                      onClick={() => toggleReader(id)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        activeReaders.includes(id)
                          ? 'font-medium'
                          : 'opacity-40'
                      }`}
                      style={{
                        borderColor: READER_COLORS[id],
                        backgroundColor: activeReaders.includes(id) ? `${READER_COLORS[id]}15` : 'transparent',
                        color: READER_COLORS[id],
                      }}
                    >
                      {isAr ? readers[id].name_ar.split(' ')[0] : readers[id].name_en.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Comparison View */}
          <div className="space-y-3">
            {/* Base reading */}
            <ReadingCard
              reader={readers[baseReader]}
              readerId={baseReader}
              text={variant.readings[baseReader]}
              isBase={true}
              diffWords={null}
              isAr={isAr}
            />

            {/* Other readings */}
            {READER_IDS.filter(id => id !== baseReader && activeReaders.includes(id)).map(id => {
              const { targetWords } = diffArabicTexts(
                variant.readings[baseReader],
                variant.readings[id]
              );
              const hasDiff = targetWords.some(w => w.status !== 'equal');

              return (
                <ReadingCard
                  key={id}
                  reader={readers[id]}
                  readerId={id}
                  text={variant.readings[id]}
                  isBase={false}
                  diffWords={hasDiff ? targetWords : null}
                  isAr={isAr}
                />
              );
            })}
          </div>

          {/* If all are identical */}
          {variant.diff_type === 'identical' && (
            <div className="mt-4 p-4 rounded-xl bg-green-500/10 text-center text-sm text-green-600">
              {isAr ? '✅ جميع القراء يقرؤون هذه الآية بنفس الطريقة' : '✅ All readers recite this verse identically'}
            </div>
          )}
        </>
      )}

      {/* Diff Type Legend */}
      <div className="page-frame p-4 rounded-xl mt-6">
        <h3 className="text-sm font-bold mb-3">{isAr ? 'أنواع الاختلاف' : 'Difference Types'}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(diffTypes).map(([key, info]) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: info.color }} />
              <span>{isAr ? info.label_ar : info.label_en}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reader info cards */}
      <div className="page-frame p-4 rounded-xl mt-4">
        <h3 className="text-sm font-bold mb-3">{isAr ? 'القراء السبعة' : 'The Seven Readers'}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {READER_IDS.map(id => (
            <div key={id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-mushaf-border)]/20">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: READER_COLORS[id] }} />
              <div className="min-w-0">
                <div className="text-xs font-medium">{isAr ? readers[id].name_ar : readers[id].name_en}</div>
                <div className="text-xs opacity-40">{isAr ? readers[id].region : readers[id].region_en}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Reading Card Component ───────────────────────────────────

interface ReadingCardProps {
  reader: ReaderInfo;
  readerId: ReaderId;
  text: string;
  isBase: boolean;
  diffWords: DiffWord[] | null;
  isAr: boolean;
}

function ReadingCard({ reader, readerId, text, isBase, diffWords, isAr }: ReadingCardProps) {
  const color = READER_COLORS[readerId];

  return (
    <div
      className={`page-frame p-4 rounded-xl transition-all ${isBase ? 'ring-2' : ''}`}
      style={isBase ? { borderColor: color, boxShadow: `0 0 0 2px ${color}30` } : {}}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-sm font-bold" style={{ color }}>
          {isAr ? reader.name_ar : reader.name_en}
        </span>
        {isBase && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-mushaf-gold)]/20 text-[var(--color-mushaf-gold)]">
            {isAr ? 'الأساس' : 'BASE'}
          </span>
        )}
        <span className="text-xs opacity-30 ml-auto">{isAr ? reader.region : reader.region_en}</span>
      </div>

      {/* Text */}
      <div className="font-[var(--font-arabic)] text-xl leading-[2.2] text-[var(--color-mushaf-text)]" dir="rtl">
        {diffWords ? (
          /* Highlighted diff view */
          diffWords.map((word, i) => (
            <span key={i}>
              {i > 0 && ' '}
              <span
                className={
                  word.status === 'changed' ? 'px-1 py-0.5 rounded' :
                  word.status === 'added' ? 'px-1 py-0.5 rounded border-b-2' :
                  word.status === 'removed' ? 'line-through opacity-40' :
                  ''
                }
                style={
                  word.status === 'changed' ? { backgroundColor: `${color}25`, color } :
                  word.status === 'added' ? { backgroundColor: `${color}15`, borderColor: color, color } :
                  word.status === 'removed' ? { color: '#E74C3C' } :
                  {}
                }
              >
                {word.text}
              </span>
            </span>
          ))
        ) : (
          /* Plain text — matches base */
          text
        )}
      </div>

      {/* Identical indicator for non-base */}
      {!isBase && !diffWords && (
        <div className="mt-2 text-xs opacity-40">
          {isAr ? '✓ مطابق للقراءة الأساسية' : '✓ Identical to base reading'}
        </div>
      )}
    </div>
  );
}
