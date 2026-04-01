'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { TOPICS, SURAH_START_PAGES } from '@/lib/types';
import {
  QURAN_PLACES,
  ERA_LABELS,
  ERAS_ORDERED,
  filterPlacesByEra,
  searchPlaces,
  type QuranPlace,
  type PlaceEra,
} from '@/lib/quranPlaces';

interface QuranMapPanelProps {
  onGoToPage: (page: number) => void;
}

export default function QuranMapPanel({ onGoToPage }: QuranMapPanelProps) {
  const { t, lang } = useI18n();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);

  const [eraSlider, setEraSlider] = useState(5); // max = show all eras
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<QuranPlace | null>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [listMode, setListMode] = useState(false);

  // Leaflet types (loaded dynamically)
  type L = typeof import('leaflet');
  const leafletRef = useRef<L | null>(null);

  // Filtered places
  const filteredPlaces = searchQuery
    ? searchPlaces(searchQuery).filter(p => ERA_LABELS[p.era].order <= eraSlider)
    : filterPlacesByEra(eraSlider);

  // ──── Dynamic Leaflet import (SSR-safe) ────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import('leaflet');
      // Import Leaflet CSS
      await import('leaflet/dist/leaflet.css');
      if (!cancelled) {
        leafletRef.current = L;
        setLeafletReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ──── Initialize map ────
  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current || mapInstanceRef.current) return;
    const L = leafletRef.current!;

    const map = L.map(mapContainerRef.current, {
      center: [25.0, 40.0], // Center on Arabia
      zoom: 5,
      minZoom: 3,
      maxZoom: 12,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [leafletReady]);

  // ──── Update markers on filter change ────
  const updateMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    const map = mapInstanceRef.current;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    filteredPlaces.forEach(place => {
      const topic = TOPICS[place.topicId];
      const color = topic?.hex || '#888';

      const marker = L.circleMarker([place.lat, place.lng], {
        radius: 10,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85,
      }).addTo(map);

      // Tooltip with place name
      marker.bindTooltip(
        `${place.icon} ${lang === 'ar' ? place.name_ar : place.name_en}`,
        { direction: 'top', offset: [0, -10], className: 'quran-map-tooltip' }
      );

      // Click handler
      marker.on('click', () => {
        setSelectedPlace(place);
      });

      markersRef.current.push(marker);
    });
  }, [filteredPlaces, lang]);

  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  // ──── Fly to selected place ────
  useEffect(() => {
    if (selectedPlace && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([selectedPlace.lat, selectedPlace.lng], 8, { duration: 1 });
    }
  }, [selectedPlace]);

  const currentEra = ERAS_ORDERED[eraSlider] as PlaceEra | undefined;
  const eraLabel = currentEra ? (lang === 'ar' ? ERA_LABELS[currentEra].ar : ERA_LABELS[currentEra].en) : '';

  return (
    <div className="flex flex-col h-full" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-[var(--color-mushaf-border)] bg-[var(--color-mushaf-paper)]">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-xl font-bold text-[var(--color-mushaf-gold)]">
            🗺️ {lang === 'ar' ? 'خريطة الأماكن القرآنية' : 'Quran Places Map'}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setListMode(false)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${!listMode ? 'bg-[var(--color-mushaf-gold)] text-white' : 'bg-[var(--color-mushaf-border)]/30'}`}
            >
              🗺️ {lang === 'ar' ? 'خريطة' : 'Map'}
            </button>
            <button
              onClick={() => setListMode(true)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${listMode ? 'bg-[var(--color-mushaf-gold)] text-white' : 'bg-[var(--color-mushaf-border)]/30'}`}
            >
              📋 {lang === 'ar' ? 'قائمة' : 'List'}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'ar' ? 'ابحث عن مكان...' : 'Search for a place...'}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-mushaf-border)] bg-[var(--color-mushaf-bg)] text-sm"
          />
        </div>

        {/* Timeline Slider */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="font-semibold">{lang === 'ar' ? 'الحقبة الزمنية' : 'Timeline Era'}</span>
            <span className="px-2 py-0.5 rounded bg-[var(--color-mushaf-border)]/20 text-xs font-medium">
              {eraLabel} • {filteredPlaces.length} {lang === 'ar' ? 'مكان' : 'places'}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={ERAS_ORDERED.length - 1}
            value={eraSlider}
            onChange={(e) => setEraSlider(Number(e.target.value))}
            className="w-full accent-[var(--color-mushaf-gold)]"
            aria-label={lang === 'ar' ? 'شريط الحقبة الزمنية' : 'Timeline era slider'}
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
            {ERAS_ORDERED.map(era => (
              <span key={era} className={ERA_LABELS[era].order <= eraSlider ? 'text-[var(--color-mushaf-gold)] font-bold' : ''}>
                {lang === 'ar' ? ERA_LABELS[era].ar : ERA_LABELS[era].en}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex overflow-hidden">
        {!listMode ? (
          /* ── Map View ── */
          <div className="flex-1 flex">
            {/* Map container */}
            <div className="flex-1 relative">
              <div ref={mapContainerRef} className="absolute inset-0" style={{ zIndex: 0 }} />
              {!leafletReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-mushaf-bg)]">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🗺️</div>
                    <p className="text-sm text-gray-500">{lang === 'ar' ? 'جارٍ تحميل الخريطة...' : 'Loading map...'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Side detail panel */}
            {selectedPlace && (
              <PlaceDetailPanel
                place={selectedPlace}
                lang={lang}
                onClose={() => setSelectedPlace(null)}
                onGoToPage={onGoToPage}
              />
            )}
          </div>
        ) : (
          /* ── List View ── */
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPlaces.map(place => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  lang={lang}
                  onClick={() => { setSelectedPlace(place); setListMode(false); }}
                />
              ))}
            </div>
            {filteredPlaces.length === 0 && (
              <div className="text-center text-gray-400 py-12 text-sm">
                {lang === 'ar' ? 'لا توجد أماكن تطابق البحث' : 'No places match your search'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div className="px-4 py-2 border-t border-[var(--color-mushaf-border)] bg-[var(--color-mushaf-paper)] flex gap-3 overflow-x-auto text-xs">
        {Object.values(TOPICS).map(topic => {
          const count = filteredPlaces.filter(p => p.topicId === topic.id).length;
          if (count === 0) return null;
          return (
            <span key={topic.id} className="flex items-center gap-1 whitespace-nowrap">
              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: topic.hex }} />
              {lang === 'ar' ? topic.name_ar : topic.name_en} ({count})
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ──── Place Detail Panel ────
function PlaceDetailPanel({
  place,
  lang,
  onClose,
  onGoToPage,
}: {
  place: QuranPlace;
  lang: 'ar' | 'en';
  onClose: () => void;
  onGoToPage: (page: number) => void;
}) {
  const topic = TOPICS[place.topicId];

  return (
    <div className="absolute inset-0 sm:relative sm:inset-auto w-full sm:w-80 border-s border-[var(--color-mushaf-border)] bg-[var(--color-mushaf-paper)] overflow-y-auto shrink-0 z-10">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="text-2xl">{place.icon}</span>
            <h3 className="text-lg font-bold mt-1">{lang === 'ar' ? place.name_ar : place.name_en}</h3>
            {lang === 'ar' && <p className="text-xs text-gray-400">{place.name_en}</p>}
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        {/* Era & Topic badges */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-mushaf-border)]/20">
            {lang === 'ar' ? ERA_LABELS[place.era].ar : ERA_LABELS[place.era].en}
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-xs text-white"
            style={{ backgroundColor: topic?.hex || '#888' }}
          >
            {lang === 'ar' ? topic?.name_ar : topic?.name_en}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
          {lang === 'ar' ? place.description_ar : place.description_en}
        </p>

        {/* Verses */}
        <h4 className="font-bold text-sm mb-2">
          📖 {lang === 'ar' ? 'الآيات المرتبطة' : 'Related Verses'} ({place.verses.length})
        </h4>
        <div className="space-y-2">
          {place.verses.map((v) => (
            <div
              key={v.verse_key}
              className="p-2.5 rounded-lg border border-[var(--color-mushaf-border)]/50 bg-[var(--color-mushaf-bg)] hover:border-[var(--color-mushaf-gold)]/50 transition-colors cursor-pointer"
              onClick={() => {
                const startPage = SURAH_START_PAGES[v.surah] || 1;
                const approxPage = Math.max(1, Math.min(604, startPage + Math.floor(v.ayah / 15)));
                onGoToPage(approxPage);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  const startPage = SURAH_START_PAGES[v.surah] || 1;
                  const approxPage = Math.max(1, Math.min(604, startPage + Math.floor(v.ayah / 15)));
                  onGoToPage(approxPage);
                }
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[var(--color-mushaf-gold)]">
                  {v.verse_key}
                </span>
                <span className="text-[10px] text-gray-400">
                  {lang === 'ar' ? 'اذهب للآية ←' : '→ Go to verse'}
                </span>
              </div>
              <p className="text-sm leading-relaxed" dir="rtl" style={{ fontFamily: 'var(--font-arabic)' }}>
                {v.snippet_ar}
              </p>
              {lang === 'en' && (
                <p className="text-xs text-gray-400 mt-1 italic" dir="ltr">
                  {v.snippet_en}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Coordinates */}
        <div className="mt-4 text-[10px] text-gray-400 text-center">
          📍 {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
        </div>
      </div>
    </div>
  );
}

// ──── Place Card (list view) ────
function PlaceCard({
  place,
  lang,
  onClick,
}: {
  place: QuranPlace;
  lang: 'ar' | 'en';
  onClick: () => void;
}) {
  const topic = TOPICS[place.topicId];

  return (
    <button
      onClick={onClick}
      className="p-3 rounded-xl border border-[var(--color-mushaf-border)] bg-[var(--color-mushaf-paper)] hover:border-[var(--color-mushaf-gold)]/50 transition-all text-start w-full"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{place.icon}</span>
        <span className="font-bold text-sm">{lang === 'ar' ? place.name_ar : place.name_en}</span>
      </div>
      <div className="flex gap-1.5 mb-1.5 flex-wrap">
        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--color-mushaf-border)]/20">
          {lang === 'ar' ? ERA_LABELS[place.era].ar : ERA_LABELS[place.era].en}
        </span>
        <span
          className="px-1.5 py-0.5 rounded text-[10px] text-white"
          style={{ backgroundColor: topic?.hex || '#888' }}
        >
          {lang === 'ar' ? topic?.name_ar : topic?.name_en}
        </span>
      </div>
      <p className="text-xs text-gray-500 line-clamp-2">
        {lang === 'ar' ? place.description_ar : place.description_en}
      </p>
      <p className="text-[10px] text-[var(--color-mushaf-gold)] mt-1">
        📖 {place.verses.length} {lang === 'ar' ? 'آيات' : 'verses'}
      </p>
    </button>
  );
}
