// @ts-nocheck
'use client';

import { useState, useEffect, useRef } from 'react';
import { useI18n } from '@/lib/i18n';
import { QURAN_PLACES, TOPICS, ERAS_ORDERED } from '@/lib/types';
import {
  clusterPlaces,
  generateHeatmap,
  getRegions,
  generatePlaceNetwork,
  calculateDistance,
  findProximities,
} from '@/lib/quranPlacesSpatial';
import { getTimelineEvents, getPlaceNarrative } from '@/lib/quranPlacesTimeline';
import TimelineSlider from './TimelineSlider';

interface QuranPlacesMapEnhancedProps {
  onGoToPage?: (page: number) => void;
  highlightEra?: string;
}

/**
 * Enhanced Quran Places Map with Timeline, Spatial Analytics, and Advanced Interactivity
 *
 * Features:
 * - Interactive timeline slider (era-by-era navigation)
 * - Spatial clustering visualization
 * - Place proximity/distance analysis
 * - Heatmap layer (place density)
 * - Regional grouping
 * - Network graph connections
 * - Detailed place cards
 * - Multi-language support (AR/EN)
 */
export default function QuranPlacesMapEnhanced({
  onGoToPage,
  highlightEra,
}: QuranPlacesMapEnhancedProps) {
  const { lang } = useI18n();
  const [selectedEra, setSelectedEra] = useState(0);
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [showClusters, setShowClusters] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showNetwork, setShowNetwork] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'clusters' | 'heatmap' | 'network'>('map');
  const [searchQuery, setSearchQuery] = useState('');
  const [clusters, setClusters] = useState<any[]>([]);
  const [heatmap, setHeatmap] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [proximities, setProximities] = useState<any[]>([]);

  const isRTL = lang === 'ar';

  // Load spatial data
  useEffect(() => {
    setClusters(clusterPlaces());
    setHeatmap(generateHeatmap());
    setRegions(getRegions());
    setProximities(findProximities(500)); // Within 500 km
  }, []);

  // Filter places by era
  const timelineEvents = getTimelineEvents();
  const currentEra = timelineEvents[selectedEra];
  const displayPlaces = currentEra ? currentEra.places : QURAN_PLACES;

  // Filter by search
  const filteredPlaces = displayPlaces.filter(
    p =>
      (lang === 'ar'
        ? p.name_ar.includes(searchQuery)
        : p.name_en.includes(searchQuery))
  );

  return (
    <div
      className="flex flex-col h-full bg-[var(--color-mushaf-paper)] overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-[var(--color-mushaf-border)] bg-gradient-to-r from-[var(--color-mushaf-gold)]/10 to-transparent">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <span>🗺️</span>
          {lang === 'ar' ? 'خريطة الأماكن القرآنية' : 'Quranic Places Map'}
        </h2>
      </div>

      {/* ── View Mode Tabs ── */}
      <div className="flex gap-2 px-4 py-2 border-b border-[var(--color-mushaf-border)] overflow-x-auto">
        {[
          { mode: 'map' as const, icon: '🗺️', label: lang === 'ar' ? 'الخريطة' : 'Map' },
          { mode: 'clusters' as const, icon: '📍', label: lang === 'ar' ? 'التجمعات' : 'Clusters' },
          { mode: 'heatmap' as const, icon: '🔥', label: lang === 'ar' ? 'الخريطة الحرارية' : 'Heatmap' },
          { mode: 'network' as const, icon: '🔗', label: lang === 'ar' ? 'الشبكة' : 'Network' },
        ].map(({ mode, icon, label }) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
              viewMode === mode
                ? 'bg-[var(--color-mushaf-gold)] text-white'
                : 'bg-[var(--color-mushaf-border)]/20 hover:bg-[var(--color-mushaf-border)]/40'
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="px-4 py-3 border-b border-[var(--color-mushaf-border)]">
        <input
          type="text"
          placeholder={lang === 'ar' ? 'ابحث عن مكان...' : 'Search places...'}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-[var(--color-mushaf-border)] bg-white dark:bg-slate-900 text-sm"
        />
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-y-auto">
        {/* Map View */}
        {viewMode === 'map' && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-[var(--color-mushaf-border)]/10">
                <span className="font-bold">{filteredPlaces.length}</span> {lang === 'ar' ? 'مكان' : 'Places'}
              </div>
              <div className="p-2 rounded-lg bg-[var(--color-mushaf-border)]/10">
                <span className="font-bold">
                  {filteredPlaces.reduce((sum, p) => sum + p.verses.length, 0)}
                </span>{' '}
                {lang === 'ar' ? 'آية' : 'Verses'}
              </div>
            </div>

            <div className="space-y-2">
              {filteredPlaces.map(place => {
                const topic = TOPICS[place.topicId];
                const narrative = getPlaceNarrative(place.id);

                return (
                  <button
                    key={place.id}
                    onClick={() => setSelectedPlace(place.id)}
                    className={`w-full p-3 rounded-xl border transition-all text-start ${
                      selectedPlace === place.id
                        ? 'border-[var(--color-mushaf-gold)] bg-[var(--color-mushaf-gold)]/10'
                        : 'border-[var(--color-mushaf-border)] hover:border-[var(--color-mushaf-gold)]/50 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl shrink-0">{place.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold">
                            {lang === 'ar' ? place.name_ar : place.name_en}
                          </span>
                          <span
                            className="px-2 py-0.5 text-[10px] text-white rounded font-bold shrink-0"
                            style={{ backgroundColor: topic?.hex }}
                          >
                            {lang === 'ar' ? topic?.name_ar.slice(0, 8) : topic?.name_en.slice(0, 8)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                          {lang === 'ar' ? place.description_ar : place.description_en}
                        </p>
                        <div className="flex gap-2 mt-1 text-[10px] text-gray-500">
                          <span>📍 {place.lat.toFixed(1)}°, {place.lng.toFixed(1)}°</span>
                          <span>📖 {place.verses.length}</span>
                        </div>
                      </div>
                    </div>

                    {/* Story Type Badge */}
                    {narrative && narrative.storyType !== 'solo' && (
                      <div className="mt-2 pt-2 border-t border-[var(--color-mushaf-border)]/20">
                        {narrative.storyType === 'part-of-cycle' && (
                          <span className="inline-block text-[9px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-300">
                            🔗 {lang === 'ar' ? 'جزء من سلسلة' : 'Part of cycle'}
                          </span>
                        )}
                        {narrative.storyType === 'crossroads' && (
                          <span className="inline-block text-[9px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300">
                            ✡️ {lang === 'ar' ? 'نقطة التقاء' : 'Crossroads'}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Clusters View */}
        {viewMode === 'clusters' && (
          <div className="p-4 space-y-3">
            <h3 className="font-bold text-sm">
              {lang === 'ar' ? `${clusters.length} تجمعات جغرافية` : `${clusters.length} Geographic Clusters`}
            </h3>
            {clusters.map(cluster => (
              <div
                key={cluster.id}
                className="p-3 rounded-xl border border-[var(--color-mushaf-border)] bg-white dark:bg-slate-900"
              >
                <h4 className="font-bold text-sm mb-2">
                  🗺️ {cluster.regionName_ar || cluster.regionName_en}
                </h4>
                <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                  <div>
                    <span className="font-bold">{cluster.places.length}</span> {lang === 'ar' ? 'أماكن' : 'Places'}
                  </div>
                  <div>
                    <span className="font-bold">{cluster.radius.toFixed(0)}</span> {lang === 'ar' ? 'كم' : 'km'}
                  </div>
                  <div>
                    <span className="font-bold">{cluster.density.toFixed(1)}</span> {lang === 'ar' ? 'الكثافة' : 'density'}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {cluster.places.slice(0, 5).map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlace(p.id)}
                      className="text-[9px] px-2 py-1 rounded bg-[var(--color-mushaf-gold)]/20 hover:bg-[var(--color-mushaf-gold)]/40 text-[var(--color-mushaf-gold)] font-bold transition-colors"
                    >
                      {p.icon} {lang === 'ar' ? p.name_ar.slice(0, 10) : p.name_en.slice(0, 10)}
                    </button>
                  ))}
                  {cluster.places.length > 5 && (
                    <span className="text-[9px] px-2 py-1 text-gray-500">
                      +{cluster.places.length - 5} {lang === 'ar' ? 'أخرى' : 'more'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Heatmap View */}
        {viewMode === 'heatmap' && (
          <div className="p-4 space-y-3">
            <h3 className="font-bold text-sm">
              {lang === 'ar' ? 'خريطة كثافة الأماكن' : 'Place Density Heatmap'}
            </h3>
            <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500 via-yellow-500 to-red-500 h-6 mb-2" />
            <div className="text-xs text-gray-500 mb-3">
              {lang === 'ar'
                ? 'يعرض تركيز الأماكن والآيات بناءً على المنطقة الجغرافية'
                : 'Shows concentration of places and verses by geographic region'}
            </div>
            {heatmap.slice(0, 10).map((cell, idx) => (
              <div key={idx} className="p-2 rounded-lg bg-[var(--color-mushaf-border)]/10 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{
                      background: `rgba(${200 + cell.intensity * 55}, ${100 - cell.intensity * 100}, ${150 - cell.intensity * 150}, 0.8)`,
                    }}
                  />
                  <span className="font-bold">({cell.lat.toFixed(1)}°, {cell.lng.toFixed(1)}°)</span>
                </div>
                <div className="flex gap-2">
                  <span>{cell.placeCount} places</span>
                  <span>•</span>
                  <span>{cell.verseCount} verses</span>
                  <span>•</span>
                  <span>Intensity: {(cell.intensity * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Network View */}
        {viewMode === 'network' && (
          <div className="p-4 space-y-3">
            <h3 className="font-bold text-sm">
              {lang === 'ar' ? 'شبكة الأماكن المرتبطة' : 'Place Connection Network'}
            </h3>
            <div className="text-xs text-gray-500 mb-3">
              {lang === 'ar'
                ? 'الأماكن المرتبطة برابطة القربية أو الحكاية أو العصر'
                : 'Places connected by proximity, story, or era'}
            </div>
            {proximities.slice(0, 8).map((prox, idx) => {
              const p1 = QURAN_PLACES.find(p => p.id === prox.place1Id);
              const p2 = QURAN_PLACES.find(p => p.id === prox.place2Id);
              return (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-[var(--color-mushaf-border)] text-xs"
                >
                  <div className="flex items-center gap-2 justify-center">
                    <button
                      onClick={() => setSelectedPlace(p1?.id || null)}
                      className="px-2 py-1 rounded bg-[var(--color-mushaf-gold)]/20 hover:bg-[var(--color-mushaf-gold)]/40 font-bold transition-colors"
                    >
                      {p1?.icon} {lang === 'ar' ? p1?.name_ar.slice(0, 8) : p1?.name_en.slice(0, 8)}
                    </button>
                    <span className="font-bold text-[var(--color-mushaf-gold)]">
                      ↔ {prox.distance}km
                    </span>
                    <button
                      onClick={() => setSelectedPlace(p2?.id || null)}
                      className="px-2 py-1 rounded bg-[var(--color-mushaf-gold)]/20 hover:bg-[var(--color-mushaf-gold)]/40 font-bold transition-colors"
                    >
                      {p2?.icon} {lang === 'ar' ? p2?.name_ar.slice(0, 8) : p2?.name_en.slice(0, 8)}
                    </button>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    {prox.routeType === 'via-migration-path' && (
                      <span>🚶 {lang === 'ar' ? 'طريق هجرة معروفة' : 'Known migration path'}</span>
                    )}
                    {prox.routeType === 'direct' && (
                      <span>📍 {lang === 'ar' ? 'مسافة مباشرة' : 'Direct distance'}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Timeline Slider (Footer) ── */}
      <TimelineSlider
        onEraChange={setSelectedEra}
        onPlaceSelect={setSelectedPlace}
        maxEraIndex={ERAS_ORDERED.length - 1}
      />
    </div>
  );
}
