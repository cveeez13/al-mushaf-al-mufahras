// @ts-nocheck
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import {
  getTimelineEvents,
  getTimelineNodes,
  getChronologicalTimeline,
  getPlaceNarrative,
  type TimelineEvent,
  type TimelineNode,
} from '@/lib/quranPlacesTimeline';
import { TOPICS } from '@/lib/types';

interface TimelineSliderProps {
  onEraChange: (eraIndex: number) => void;
  onPlaceSelect: (placeId: string) => void;
  maxEraIndex?: number;
}

/**
 * Advanced Timeline Slider for Quranic Places
 * Features:
 * - Era-by-era navigation with smooth transitions
 * - Timeline narrative view
 * - Prophet focus toggle
 * - Verse progression counter
 * - Story arc visualization
 */
export default function TimelineSlider({
  onEraChange,
  onPlaceSelect,
  maxEraIndex = 5,
}: TimelineSliderProps) {
  const { lang } = useI18n();
  const [sliderValue, setSliderValue] = useState(0);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [nodes, setNodes] = useState<TimelineNode[]>([]);
  const [showNarrative, setShowNarrative] = useState(true);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [placeNarrative, setPlaceNarrative] = useState<any>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Load timeline data
  useEffect(() => {
    const timelineEvents = getTimelineEvents();
    const timelineNodes = getChronologicalTimeline();
    setEvents(timelineEvents);
    setNodes(timelineNodes);
  }, []);

  // Handle era change
  useEffect(() => {
    if (events.length > 0 && sliderValue >= 0 && sliderValue <= maxEraIndex) {
      onEraChange(sliderValue);
    }
  }, [sliderValue, events, onEraChange, maxEraIndex]);

  // Load place narrative when selected
  useEffect(() => {
    if (selectedPlaceId) {
      const narrative = getPlaceNarrative(selectedPlaceId);
      setPlaceNarrative(narrative);
      onPlaceSelect(selectedPlaceId);
    }
  }, [selectedPlaceId, onPlaceSelect]);

  const currentEvent = events[sliderValue];
  const isRTL = lang === 'ar';

  return (
    <div
      className="w-full bg-gradient-to-b from-[var(--color-mushaf-paper)] to-[var(--color-mushaf-paper)]/80 border-t border-[var(--color-mushaf-border)] rounded-t-2xl shadow-lg"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* ── Timeline Header ── */}
      <div className="px-4 py-4 border-b border-[var(--color-mushaf-border)]/50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold">
              {lang === 'ar' ? 'خط الزمن الإسلامي' : 'Islamic Timeline'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {lang === 'ar'
                ? `${currentEvent?.places.length || 0} مكان • ${currentEvent?.places.reduce((sum, p) => sum + p.verses.length, 0) || 0} آية`
                : `${currentEvent?.places.length || 0} places • ${currentEvent?.places.reduce((sum, p) => sum + p.verses.length, 0) || 0} verses`}
            </p>
          </div>
          <button
            onClick={() => setShowNarrative(!showNarrative)}
            className="px-3 py-1.5 text-xs rounded-lg bg-[var(--color-mushaf-gold)]/10 hover:bg-[var(--color-mushaf-gold)]/20 transition-colors border border-[var(--color-mushaf-gold)]/30 text-[var(--color-mushaf-gold)]"
          >
            {lang === 'ar' ? (showNarrative ? '🗺️ الخريطة' : '📖 القصة') : showNarrative ? '🗺️ Map' : '📖 Story'}
          </button>
        </div>
      </div>

      {/* ── Era Slider ── */}
      <div className="px-6 py-6">
        {/* Visual Timeline Track */}
        <div className="mb-6">
          <div className="relative h-12 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-green-500/20 rounded-full overflow-hidden flex items-center">
            {/* Era Markers */}
            <div className="absolute inset-0 flex items-center justify-between px-2">
              {events.map((event, i) => (
                <div
                  key={i}
                  className={`flex-1 flex flex-col items-center justify-center cursor-pointer transition-all ${
                    i === sliderValue ? 'scale-110' : 'opacity-60 hover:opacity-80'
                  }`}
                  onClick={() => setSliderValue(i)}
                >
                  <div
                    className={`w-3 h-3 rounded-full border-2 transition-all ${
                      i === sliderValue
                        ? 'bg-[var(--color-mushaf-gold)] border-[var(--color-mushaf-gold)] shadow-lg'
                        : 'bg-white border-gray-400'
                    }`}
                  />
                  <span className="text-[9px] font-bold mt-1 whitespace-nowrap">
                    {lang === 'ar'
                      ? event.era === 'creation'
                        ? 'الخلق'
                        : event.era === 'ibrahim'
                          ? 'إبراهيم'
                          : event.era === 'musa'
                            ? 'موسى'
                            : event.era === 'prophets'
                              ? 'الأنبياء'
                              : event.era === 'jahiliyyah'
                                ? 'الجاهلية'
                                : 'النبوي'
                      : event.era}
                  </span>
                </div>
              ))}
            </div>

            {/* Progress Fill */}
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 via-blue-500 to-green-500 opacity-30 transition-all duration-300"
              style={{ width: `${((sliderValue + 1) / events.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Slider Input */}
        <input
          ref={sliderRef}
          type="range"
          min="0"
          max={maxEraIndex}
          value={sliderValue}
          onChange={e => setSliderValue(parseInt(e.target.value))}
          className="w-full h-2 bg-[var(--color-mushaf-border)] rounded-lg appearance-none cursor-pointer accent-[var(--color-mushaf-gold)]"
          style={{
            background: `linear-gradient(to ${isRTL ? 'left' : 'right'}, var(--color-mushaf-gold) 0%, var(--color-mushaf-gold) ${((sliderValue + 1) / (maxEraIndex + 1)) * 100}%, var(--color-mushaf-border) ${((sliderValue + 1) / (maxEraIndex + 1)) * 100}%, var(--color-mushaf-border) 100%)`,
          }}
        />

        {/* Era Label and Description */}
        {currentEvent && (
          <div className="mt-6 p-4 rounded-xl bg-[var(--color-mushaf-border)]/10 border border-[var(--color-mushaf-border)]/30">
            <h4 className="text-sm font-bold mb-2">
              {lang === 'ar' ? `عصر ${currentEvent.era}` : `Era: ${currentEvent.era}`}
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              {lang === 'ar' ? currentEvent.description_ar : currentEvent.description_en}
            </p>
          </div>
        )}
      </div>

      {/* ── Narrative View ── */}
      {showNarrative && currentEvent && (
        <div className="px-6 pb-6 space-y-3 max-h-96 overflow-y-auto">
          <h4 className="text-sm font-bold sticky top-0 bg-[var(--color-mushaf-paper)]">
            {lang === 'ar' ? 'الأماكن في هذا العصر' : 'Places in this Era'}
          </h4>

          {currentEvent.places.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-4">
              {lang === 'ar' ? 'لا توجد أماكن' : 'No places'}
            </div>
          ) : (
            currentEvent.places.map((place, idx) => {
              const topic = TOPICS[place.topicId];
              const narrative = getPlaceNarrative(place.id);

              return (
                <button
                  key={place.id}
                  onClick={() => setSelectedPlaceId(place.id)}
                  className={`w-full text-start p-3 rounded-lg border transition-all ${
                    selectedPlaceId === place.id
                      ? 'border-[var(--color-mushaf-gold)] bg-[var(--color-mushaf-gold)]/10'
                      : 'border-[var(--color-mushaf-border)]/50 hover:border-[var(--color-mushaf-gold)]/50 bg-[var(--color-mushaf-border)]/5'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xl shrink-0">{place.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm">
                          {lang === 'ar' ? place.name_ar : place.name_en}
                        </span>
                        <span
                          className="px-2 py-0.5 text-[9px] text-white rounded font-bold"
                          style={{ backgroundColor: topic?.hex || '#888' }}
                        >
                          {lang === 'ar' ? topic?.name_ar.slice(0, 8) : topic?.name_en.slice(0, 8)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-1">
                        {lang === 'ar' ? place.description_ar : place.description_en}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400">
                        <span>📍 {place.lat.toFixed(1)}°, {place.lng.toFixed(1)}°</span>
                        <span>•</span>
                        <span>
                          {place.verses.length} {lang === 'ar' ? 'آية' : 'verse' + (place.verses.length > 1 ? 's' : '')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Story Type Badge */}
                  {narrative && (
                    <div className="mt-2 pt-2 border-t border-[var(--color-mushaf-border)]/20 text-[9px]">
                      {narrative.storyType === 'part-of-cycle' && (
                        <span className="inline-block px-2 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-300">
                          {lang === 'ar' ? '🔗 جزء من سلسلة' : '🔗 Part of cycle'}
                        </span>
                      )}
                      {narrative.storyType === 'crossroads' && (
                        <span className="inline-block px-2 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300">
                          {lang === 'ar' ? '✡️ نقطة التقاء' : '✡️ Crossroads'}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}

      {/* ── Place Detail Panel (if selected) ── */}
      {selectedPlaceId && placeNarrative && (
        <div className="px-6 pb-6 border-t border-[var(--color-mushaf-border)]/50 pt-4">
          <h4 className="text-sm font-bold mb-3">
            {lang === 'ar' ? 'تفاصيل المكان' : 'Place Details'}
          </h4>

          <div className="space-y-2 text-xs">
            {placeNarrative.relatedPlaces.length > 0 && (
              <div>
                <span className="font-bold text-gray-600 dark:text-gray-400">
                  {lang === 'ar' ? 'أماكن مرتبطة:' : 'Related places:'}
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {placeNarrative.relatedPlaces.slice(0, 4).map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlaceId(p.id)}
                      className="px-2 py-1 rounded bg-[var(--color-mushaf-gold)]/20 hover:bg-[var(--color-mushaf-gold)]/30 text-[var(--color-mushaf-gold)] font-bold transition-colors"
                    >
                      {p.icon} {lang === 'ar' ? p.name_ar.slice(0, 10) : p.name_en.slice(0, 10)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {placeNarrative.previousPlaces.length > 0 && (
              <div>
                <span className="font-bold text-gray-600 dark:text-gray-400">
                  {lang === 'ar' ? 'قبل هذا المكان:' : 'Before this place:'}
                </span>
                <p className="text-gray-500 mt-1">
                  {placeNarrative.previousPlaces.slice(-2).map((p: any) => lang === 'ar' ? p.name_ar : p.name_en).join(` ${lang === 'ar' ? '→' : '→'} `)}
                </p>
              </div>
            )}

            {placeNarrative.nextPlaces.length > 0 && (
              <div>
                <span className="font-bold text-gray-600 dark:text-gray-400">
                  {lang === 'ar' ? 'بعد هذا المكان:' : 'After this place:'}
                </span>
                <p className="text-gray-500 mt-1">
                  {placeNarrative.nextPlaces.slice(0, 2).map((p: any) => lang === 'ar' ? p.name_ar : p.name_en).join(` ${lang === 'ar' ? '←' : '→'} `)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
