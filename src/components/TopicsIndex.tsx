'use client';

import { useEffect, useState } from 'react';
import { TOPICS, SURAH_NAMES } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import TopicGraph from './TopicGraph';

interface TopicStats {
  id: number;
  color: string;
  hex: string;
  name_ar: string;
  name_en: string;
  verse_count: number;
  percentage: number;
  surah_count: number;
  page_count: number;
}

interface TopicsIndexProps {
  onGoToPage: (page: number) => void;
  onFilterTopic: (color: string | null) => void;
}

export default function TopicsIndex({ onGoToPage, onFilterTopic }: TopicsIndexProps) {
  const { t, topicName, lang } = useI18n();
  const [stats, setStats] = useState<{ topics: TopicStats[] } | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'cards'>('graph');

  useEffect(() => {
    fetch('/data/topic_statistics.json').then(r => r.json()).then(setStats);
  }, []);

  if (!stats) {
    return <div className="text-center py-10 text-[var(--color-mushaf-text)]/50">{t('loading')}</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* View mode toggle */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <h2 className="text-xl font-bold text-[var(--color-mushaf-gold)] font-[var(--font-arabic)]">
          {t('topicsDirectory')}
        </h2>
        <div className="flex gap-1 bg-[var(--color-mushaf-border)]/20 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('graph')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              viewMode === 'graph'
                ? 'bg-[var(--color-mushaf-gold)] text-white'
                : 'hover:bg-[var(--color-mushaf-border)]/30'
            }`}
          >
            {lang === 'ar' ? '🔗 خريطة' : '🔗 Graph'}
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              viewMode === 'cards'
                ? 'bg-[var(--color-mushaf-gold)] text-white'
                : 'hover:bg-[var(--color-mushaf-border)]/30'
            }`}
          >
            {lang === 'ar' ? '📋 قائمة' : '📋 Cards'}
          </button>
        </div>
      </div>

      {/* Graph view */}
      {viewMode === 'graph' && (
        <div className="flex-1 min-h-0 px-4 pb-4">
          <div className="page-frame rounded-xl w-full h-full overflow-hidden relative">
            <TopicGraph onTopicClick={onFilterTopic} />
            <div className="absolute bottom-3 left-0 right-0 text-center text-[10px] text-[var(--color-mushaf-text)]/40">
              {lang === 'ar'
                ? 'اسحب الفقاعات · اضغط للتصفية · حجم الفقاعة = عدد الآيات · الخطوط = التجاور في الصفحات'
                : 'Drag bubbles · Click to filter · Size = verse count · Lines = page co-occurrence'}
            </div>
          </div>
        </div>
      )}

      {/* Cards view (original) */}
      {viewMode === 'cards' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto grid gap-4 sm:grid-cols-2">
            {stats.topics.map(topic => (
              <div
                key={topic.id}
                className="page-frame p-4 rounded-xl hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => onFilterTopic(topic.color)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: topic.hex }}
                  >
                    {topic.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm leading-snug">
                      {topicName(topic.id)}
                    </h3>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-[var(--color-mushaf-text)]/60">
                      <span>{topic.verse_count} {t('verses')}</span>
                      <span>{topic.percentage}% {t('ofQuran')}</span>
                      <span>{topic.surah_count} {t('surah')}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 h-1.5 bg-[var(--color-mushaf-border)]/30 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${topic.percentage}%`, backgroundColor: topic.hex }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total summary */}
          <div className="mt-6 text-center text-sm text-[var(--color-mushaf-text)]/50">
            6,236 {t('verses')} · 604 {t('page')} · 114 {t('surah')} · 30 Juz
          </div>

          {/* Data Sources */}
          <div className="mt-8 mx-auto max-w-3xl page-frame rounded-xl p-5">
            <h3 className="text-base font-bold text-[var(--color-mushaf-gold)] mb-4 font-[var(--font-arabic)]">
              {lang === 'ar' ? 'مصادر البيانات' : 'Data Sources'}
            </h3>
            <div className="space-y-4 text-sm text-[var(--color-mushaf-text)]/80 leading-relaxed">
              {/* Source 1 */}
              <div className="border-b border-[var(--color-mushaf-border)]/30 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-[var(--color-mushaf-gold)] text-white text-[10px] rounded font-bold">
                    {lang === 'ar' ? 'المصدر الأساسي' : 'PRIMARY'}
                  </span>
                  <span className="font-semibold">{lang === 'ar' ? 'الباحث القرآني' : 'Al-Bahith Al-Qurani'} (tafsir.app)</span>
                </div>
                <p className="text-xs opacity-70">
                  {lang === 'ar'
                    ? 'مصحف التفصيل الموضوعي — تصنيف موضوعي لكل آية من الـ 6,236 آية'
                    : 'Mushaf Al-Tafseel Al-Mawdu\'i — topic classification per verse (6,236 verses)'}
                </p>
                <code className="block mt-1 text-[10px] bg-black/5 rounded px-2 py-1 font-mono" dir="ltr">
                  https://tafsir.app/m-mawdou/&#123;surah&#125;/&#123;ayah&#125;
                </code>
              </div>
              {/* Source 2 */}
              <div className="border-b border-[var(--color-mushaf-border)]/30 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-[var(--color-mushaf-text)]/20 text-[var(--color-mushaf-text)] text-[10px] rounded font-bold">
                    {lang === 'ar' ? 'مصدر التحقق' : 'VERIFICATION'}
                  </span>
                  <span className="font-semibold">{lang === 'ar' ? 'ملفات PDF — أرشيف الإنترنت' : 'PDF Files — Internet Archive'}</span>
                </div>
                <ul className="text-xs opacity-70 space-y-1 mt-1 list-disc list-inside" dir="ltr">
                  <li>Quran27.pdf — Mushaf Al-Tafseel Al-Mawdu&apos;i (Dar Al-Fajr Al-Islami)</li>
                  <li>Quran28.pdf — Mushaf Al-Taqseem Al-Mawdu&apos;i (Dar Ghar Hiraa)</li>
                  <li>Quran29.pdf — Mushaf Al-Tahajjud (Al-Ghalayyini Foundation)</li>
                </ul>
              </div>
              {/* Source 3 */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-[var(--color-mushaf-text)]/10 text-[var(--color-mushaf-text)] text-[10px] rounded font-bold">
                    {lang === 'ar' ? 'مرجع إضافي' : 'REFERENCE'}
                  </span>
                  <span className="font-semibold">{lang === 'ar' ? 'تطبيق مصحف التفصيل الموضوعي الملون' : 'Google Play App'}</span>
                </div>
                <p className="text-xs opacity-70">
                  {lang === 'ar'
                    ? 'مرجع بصري إضافي للتحقق من تعيين الألوان'
                    : 'Additional visual reference for verifying color assignments'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
