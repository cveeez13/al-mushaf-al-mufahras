import { describe, it, expect } from 'vitest';
import {
  QURAN_PLACES,
  ERA_LABELS,
  ERAS_ORDERED,
  getAvailableEras,
  filterPlacesByEra,
  filterPlacesByTopic,
  searchPlaces,
  getTotalVerseRefs,
  getPlaceById,
  toGeoJSON,
  type QuranPlace,
  type PlaceEra,
} from '@/lib/quranPlaces';
import { TOPICS } from '@/lib/types';

describe('Quran Places Data', () => {
  // ──── Data integrity ────

  it('should have at least 20 places', () => {
    expect(QURAN_PLACES.length).toBeGreaterThanOrEqual(20);
  });

  it('every place should have required fields', () => {
    for (const place of QURAN_PLACES) {
      expect(place.id).toBeTruthy();
      expect(place.name_ar).toBeTruthy();
      expect(place.name_en).toBeTruthy();
      expect(typeof place.lat).toBe('number');
      expect(typeof place.lng).toBe('number');
      expect(place.era).toBeTruthy();
      expect(place.topicId).toBeGreaterThanOrEqual(1);
      expect(place.topicId).toBeLessThanOrEqual(7);
      expect(place.description_ar).toBeTruthy();
      expect(place.description_en).toBeTruthy();
      expect(place.icon).toBeTruthy();
      expect(place.verses.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('every place should have a unique id', () => {
    const ids = QURAN_PLACES.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all place coordinates should be valid lat/lng', () => {
    for (const place of QURAN_PLACES) {
      expect(place.lat).toBeGreaterThanOrEqual(-90);
      expect(place.lat).toBeLessThanOrEqual(90);
      expect(place.lng).toBeGreaterThanOrEqual(-180);
      expect(place.lng).toBeLessThanOrEqual(180);
    }
  });

  it('all place topicIds should reference existing TOPICS', () => {
    for (const place of QURAN_PLACES) {
      expect(TOPICS[place.topicId]).toBeDefined();
    }
  });

  it('all eras should be valid PlaceEra values', () => {
    const validEras = new Set(ERAS_ORDERED);
    for (const place of QURAN_PLACES) {
      expect(validEras.has(place.era)).toBe(true);
    }
  });

  it('every verse ref should have surah between 1-114 and ayah >= 1', () => {
    for (const place of QURAN_PLACES) {
      for (const v of place.verses) {
        expect(v.surah).toBeGreaterThanOrEqual(1);
        expect(v.surah).toBeLessThanOrEqual(114);
        expect(v.ayah).toBeGreaterThanOrEqual(1);
        expect(v.verse_key).toBe(`${v.surah}:${v.ayah}`);
        expect(v.snippet_ar).toBeTruthy();
        expect(v.snippet_en).toBeTruthy();
      }
    }
  });

  // ──── ERA_LABELS ────

  it('should have labels for all eras', () => {
    for (const era of ERAS_ORDERED) {
      expect(ERA_LABELS[era]).toBeDefined();
      expect(ERA_LABELS[era].ar).toBeTruthy();
      expect(ERA_LABELS[era].en).toBeTruthy();
      expect(typeof ERA_LABELS[era].order).toBe('number');
    }
  });

  it('ERAS_ORDERED should have 6 eras in order', () => {
    expect(ERAS_ORDERED).toHaveLength(6);
    for (let i = 0; i < ERAS_ORDERED.length; i++) {
      expect(ERA_LABELS[ERAS_ORDERED[i]].order).toBe(i);
    }
  });

  // ──── Key places exist ────

  it('should include Makkah', () => {
    const makkah = QURAN_PLACES.find(p => p.id === 'makkah');
    expect(makkah).toBeDefined();
    expect(makkah!.name_ar).toContain('مكة');
    expect(makkah!.verses.length).toBeGreaterThanOrEqual(2);
  });

  it('should include Egypt', () => {
    const misr = QURAN_PLACES.find(p => p.id === 'misr');
    expect(misr).toBeDefined();
    expect(misr!.era).toBe('musa');
  });

  it('should include Mount Sinai', () => {
    const sinai = QURAN_PLACES.find(p => p.id === 'sinai');
    expect(sinai).toBeDefined();
    expect(sinai!.name_ar).toContain('سيناء');
  });

  it('should include Jerusalem/Al-Aqsa', () => {
    const quds = QURAN_PLACES.find(p => p.id === 'quds');
    expect(quds).toBeDefined();
    // Surah Al-Isra verse 1
    const isra = quds!.verses.find(v => v.surah === 17 && v.ayah === 1);
    expect(isra).toBeDefined();
  });

  it('should include Badr', () => {
    const badr = QURAN_PLACES.find(p => p.id === 'badr');
    expect(badr).toBeDefined();
    expect(badr!.era).toBe('nabawi');
  });

  // ──── Helper functions ────

  describe('getAvailableEras', () => {
    it('should return eras that exist in places data', () => {
      const eras = getAvailableEras();
      expect(eras.length).toBeGreaterThanOrEqual(4);
      // All returned eras should be in ERAS_ORDERED
      for (const era of eras) {
        expect(ERAS_ORDERED).toContain(era);
      }
    });

    it('should preserve chronological order', () => {
      const eras = getAvailableEras();
      for (let i = 1; i < eras.length; i++) {
        expect(ERA_LABELS[eras[i]].order).toBeGreaterThan(ERA_LABELS[eras[i - 1]].order);
      }
    });
  });

  describe('filterPlacesByEra', () => {
    it('should return only places up to given era order', () => {
      const creationOnly = filterPlacesByEra(0); // creation
      expect(creationOnly.length).toBeGreaterThanOrEqual(1);
      for (const p of creationOnly) {
        expect(ERA_LABELS[p.era].order).toBeLessThanOrEqual(0);
      }
    });

    it('should return all places when maxEraOrder is 5', () => {
      const all = filterPlacesByEra(5);
      expect(all.length).toBe(QURAN_PLACES.length);
    });

    it('should return progressively more places with higher era values', () => {
      let prevCount = 0;
      for (let i = 0; i <= 5; i++) {
        const count = filterPlacesByEra(i).length;
        expect(count).toBeGreaterThanOrEqual(prevCount);
        prevCount = count;
      }
    });
  });

  describe('filterPlacesByTopic', () => {
    it('should filter by topic correctly', () => {
      const topic4 = filterPlacesByTopic(4); // Stories of Prophets
      expect(topic4.length).toBeGreaterThanOrEqual(3);
      for (const p of topic4) {
        expect(p.topicId).toBe(4);
      }
    });

    it('should return empty for non-existent topic', () => {
      const none = filterPlacesByTopic(99);
      expect(none).toHaveLength(0);
    });
  });

  describe('searchPlaces', () => {
    it('should find places by Arabic name', () => {
      const results = searchPlaces('مكة');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some(p => p.id === 'makkah')).toBe(true);
    });

    it('should find places by English name (case insensitive)', () => {
      const results = searchPlaces('egypt');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some(p => p.id === 'misr')).toBe(true);
    });

    it('should search in descriptions', () => {
      const results = searchPlaces('Pharaoh');
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('should return all places for empty query', () => {
      expect(searchPlaces('')).toHaveLength(QURAN_PLACES.length);
      expect(searchPlaces('  ')).toHaveLength(QURAN_PLACES.length);
    });

    it('should return empty for no match', () => {
      expect(searchPlaces('xyznotaplace')).toHaveLength(0);
    });
  });

  describe('getTotalVerseRefs', () => {
    it('should return total verse references across all places', () => {
      const total = getTotalVerseRefs();
      expect(total).toBeGreaterThanOrEqual(30);
      // Manual check
      const manual = QURAN_PLACES.reduce((s, p) => s + p.verses.length, 0);
      expect(total).toBe(manual);
    });
  });

  describe('getPlaceById', () => {
    it('should return place for valid id', () => {
      const place = getPlaceById('makkah');
      expect(place).toBeDefined();
      expect(place!.id).toBe('makkah');
    });

    it('should return undefined for invalid id', () => {
      expect(getPlaceById('nonexistent')).toBeUndefined();
    });
  });

  describe('toGeoJSON', () => {
    it('should return valid GeoJSON FeatureCollection', () => {
      const geojson = toGeoJSON(QURAN_PLACES);
      expect(geojson.type).toBe('FeatureCollection');
      expect(geojson.features).toHaveLength(QURAN_PLACES.length);
    });

    it('each feature should have Point geometry with coordinates', () => {
      const geojson = toGeoJSON(QURAN_PLACES);
      for (const feature of geojson.features) {
        expect(feature.type).toBe('Feature');
        expect(feature.geometry.type).toBe('Point');
        expect(feature.geometry.coordinates).toHaveLength(2);
        // GeoJSON is [lng, lat]
        const [lng, lat] = feature.geometry.coordinates;
        expect(lng).toBeGreaterThanOrEqual(-180);
        expect(lng).toBeLessThanOrEqual(180);
        expect(lat).toBeGreaterThanOrEqual(-90);
        expect(lat).toBeLessThanOrEqual(90);
      }
    });

    it('features should have required properties', () => {
      const geojson = toGeoJSON(QURAN_PLACES);
      for (const feature of geojson.features) {
        expect(feature.properties.id).toBeTruthy();
        expect(feature.properties.name_ar).toBeTruthy();
        expect(feature.properties.name_en).toBeTruthy();
        expect(feature.properties.era).toBeTruthy();
        expect(feature.properties.topicId).toBeDefined();
        expect(feature.properties.verseCount).toBeGreaterThanOrEqual(1);
      }
    });

    it('should work with filtered places', () => {
      const filtered = filterPlacesByEra(0);
      const geojson = toGeoJSON(filtered);
      expect(geojson.features).toHaveLength(filtered.length);
    });

    it('should work with empty array', () => {
      const geojson = toGeoJSON([]);
      expect(geojson.features).toHaveLength(0);
    });
  });
});
