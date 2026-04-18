/**
 * Quran Places Spatial Analytics — Geographic clustering, proximity analysis, heatmaps
 *
 * Features:
 * - Place clustering (group nearby places)
 * - Proximity analysis (distances, routes)
 * - Heatmap generation (density of places/verses)
 * - Geographic boundaries (regions, countries)
 * - Network graph analysis (place relationships)
 * - Trade route detection (path optimization)
 */

import { QURAN_PLACES, type QuranPlace } from './quranPlaces';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export interface GeoCluster {
  id: string;
  center: { lat: number; lng: number };
  places: QuranPlace[];
  radius: number; // km
  density: number; // places per 1000 km²
  regionName_ar: string;
  regionName_en: string;
}

export interface GeoProximity {
  place1Id: string;
  place2Id: string;
  distance: number; // km
  routeType: 'direct' | 'via-landmark' | 'via-migration-path';
  verseCount: number; // Shared verses mentioning both?
}

export interface GeoHeatCell {
  lat: number;
  lng: number;
  intensity: number; // 0-1, based on place density
  placeCount: number;
  verseCount: number;
}

export interface GeoRegion {
  name_ar: string;
  name_en: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  places: QuranPlace[];
  dominantTopic: number;
  majorEras: string[];
}

export interface PlaceNetwork {
  nodeId: string;
  connectedPlaces: string[]; // IDs of connected places
  connectionStrength: number; // 0-1
  connectionType: 'proximity' | 'story' | 'era' | 'topic';
}

// ═══════════════════════════════════════════════════════════
// Geospatial Utilities
// ═══════════════════════════════════════════════════════════

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get bounding box of a set of places
 */
export function getBoundingBox(places: QuranPlace[]): {
  north: number;
  south: number;
  east: number;
  west: number;
} {
  if (places.length === 0) {
    return { north: 0, south: 0, east: 0, west: 0 };
  }

  const lats = places.map(p => p.lat);
  const lngs = places.map(p => p.lng);

  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs),
  };
}

/**
 * Check if point is within geographic region
 */
export function isWithinRegion(
  lat: number,
  lng: number,
  bounds: { north: number; south: number; east: number; west: number }
): boolean {
  return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east;
}

// ═══════════════════════════════════════════════════════════
// Clustering
// ═══════════════════════════════════════════════════════════

/**
 * Cluster places using K-means algorithm
 */
export function clusterPlaces(
  clusterCount: number = 6
): GeoCluster[] {
  if (QURAN_PLACES.length === 0) return [];

  // Initialize random centers
  let centers = QURAN_PLACES.slice(0, clusterCount).map(p => ({
    lat: p.lat,
    lng: p.lng,
  }));

  // K-means iterations
  for (let iteration = 0; iteration < 10; iteration++) {
    // Assign places to nearest center
    const clusters: QuranPlace[][] = Array(clusterCount)
      .fill(null)
      .map(() => []);

    QURAN_PLACES.forEach(place => {
      let minDist = Infinity;
      let closestCluster = 0;

      centers.forEach((center, i) => {
        const dist = calculateDistance(place.lat, place.lng, center.lat, center.lng);
        if (dist < minDist) {
          minDist = dist;
          closestCluster = i;
        }
      });

      clusters[closestCluster].push(place);
    });

    // Update centers
    const newCenters = clusters.map(cluster => {
      if (cluster.length === 0) return centers[0];
      const avgLat = cluster.reduce((sum, p) => sum + p.lat, 0) / cluster.length;
      const avgLng = cluster.reduce((sum, p) => sum + p.lng, 0) / cluster.length;
      return { lat: avgLat, lng: avgLng };
    });

    // Check convergence
    const converged = centers.every((center, i) =>
      calculateDistance(center.lat, center.lng, newCenters[i].lat, newCenters[i].lng) < 0.1
    );

    centers = newCenters;
    if (converged) break;
  }

  // Create final clusters with metadata
  const finalClusters: GeoCluster[] = [];

  centers.forEach((center, i) => {
    const places = QURAN_PLACES.filter(place => {
      const dist = calculateDistance(place.lat, place.lng, center.lat, center.lng);
      const minDist = QURAN_PLACES.reduce((min, other) => {
        const d = calculateDistance(place.lat, place.lng, other.lat, other.lng);
        return Math.min(min, d);
      }, Infinity);
      return dist < 5000; // Within 5000 km (loose bound)
    });

    if (places.length > 0) {
      // Recalculate center based on actual places
      const realCenter = {
        lat: places.reduce((sum, p) => sum + p.lat, 0) / places.length,
        lng: places.reduce((sum, p) => sum + p.lng, 0) / places.length,
      };

      // Calculate radius (max distance from center to any place)
      const radius = Math.max(
        ...places.map(p => calculateDistance(realCenter.lat, realCenter.lng, p.lat, p.lng))
      );

      // Estimate area and density
      const areaKm2 = Math.PI * radius * radius;
      const density = (places.length / areaKm2) * 1000; // per 1000 km²

      finalClusters.push({
        id: `cluster-${i}`,
        center: realCenter,
        places,
        radius,
        density,
        regionName_ar: getRegionName(realCenter.lat, realCenter.lng).ar,
        regionName_en: getRegionName(realCenter.lat, realCenter.lng).en,
      });
    }
  });

  return finalClusters.filter(c => c.places.length > 0);
}

/**
 * Get region name from coordinates
 */
function getRegionName(lat: number, lng: number): { ar: string; en: string } {
  // Geographic regions mapping
  const regions: Array<{
    bounds: { north: number; south: number; east: number; west: number };
    name_ar: string;
    name_en: string;
  }> = [
    {
      bounds: { north: 35.5, south: 19, east: 42, west: 34 },
      name_ar: 'الجزيرة العربية',
      name_en: 'Arabian Peninsula',
    },
    {
      bounds: { north: 33, south: 24, east: 35, west: 25 },
      name_ar: 'مصر والشام',
      name_en: 'Egypt and Levant',
    },
    {
      bounds: { north: 40, south: 25, east: 45, west: 35 },
      name_ar: 'بلاد الرافدين والعراق',
      name_en: 'Mesopotamia and Iraq',
    },
    {
      bounds: { north: 40, south: 30, east: 55, west: 45 },
      name_ar: 'إيران والخليج',
      name_en: 'Persia and Gulf',
    },
  ];

  for (const region of regions) {
    if (isWithinRegion(lat, lng, region.bounds)) {
      return { ar: region.name_ar, en: region.name_en };
    }
  }

  return { ar: 'منطقة غير محددة', en: 'Unknown Region' };
}

// ═══════════════════════════════════════════════════════════
// Proximity Analysis
// ═══════════════════════════════════════════════════════════

/**
 * Find all place proximities within radius
 */
export function findProximities(radiusKm: number = 500): GeoProximity[] {
  const proximities: GeoProximity[] = [];

  for (let i = 0; i < QURAN_PLACES.length; i++) {
    for (let j = i + 1; j < QURAN_PLACES.length; j++) {
      const place1 = QURAN_PLACES[i];
      const place2 = QURAN_PLACES[j];
      const dist = calculateDistance(place1.lat, place1.lng, place2.lat, place2.lng);

      if (dist <= radiusKm) {
        // Determine route type
        let routeType: 'direct' | 'via-landmark' | 'via-migration-path' = 'direct';
        if (isKnownMigrationPath(place1.id, place2.id)) {
          routeType = 'via-migration-path';
        }

        proximities.push({
          place1Id: place1.id,
          place2Id: place2.id,
          distance: Math.round(dist),
          routeType,
          verseCount: 0, // TODO: Calculate from shared verses
        });
      }
    }
  }

  return proximities.sort((a, b) => a.distance - b.distance);
}

/**
 * Check if this is a known migration or travel path
 */
function isKnownMigrationPath(place1Id: string, place2Id: string): boolean {
  const paths = [
    ['misr', 'madyan'],
    ['madyan', 'sinai'],
    ['sinai', 'quds'],
    ['quds', 'makkah'],
    ['makkah', 'madinah'],
  ];

  return paths.some(
    ([a, b]) => (a === place1Id && b === place2Id) || (b === place1Id && a === place2Id)
  );
}

/**
 * Get nearest places to a given location
 */
export function findNearestPlaces(
  lat: number,
  lng: number,
  count: number = 5
): GeoProximity[] {
  const distances = QURAN_PLACES.map(place => ({
    place1Id: '',
    place2Id: place.id,
    distance: calculateDistance(lat, lng, place.lat, place.lng),
    routeType: 'direct' as const,
    verseCount: 0,
  }));

  return distances.sort((a, b) => a.distance - b.distance).slice(0, count);
}

// ═══════════════════════════════════════════════════════════
// Heatmap Generation
// ═══════════════════════════════════════════════════════════

/**
 * Generate heatmap grid for geographic density
 */
export function generateHeatmap(
  cellSizeKm: number = 100
): GeoHeatCell[] {
  const bounds = getBoundingBox(QURAN_PLACES);
  const heatCells: GeoHeatCell[] = [];

  // Convert km to degrees (rough approximation)
  const cellSizeDegrees = cellSizeKm / 111.3;

  for (let lat = bounds.south; lat <= bounds.north; lat += cellSizeDegrees) {
    for (let lng = bounds.west; lng <= bounds.east; lng += cellSizeDegrees) {
      const cellPlaces = QURAN_PLACES.filter(
        place =>
          Math.abs(place.lat - lat) < cellSizeDegrees / 2 &&
          Math.abs(place.lng - lng) < cellSizeDegrees / 2
      );

      if (cellPlaces.length > 0) {
        const verseCount = cellPlaces.reduce((sum, p) => sum + p.verses.length, 0);
        heatCells.push({
          lat: Math.round(lat * 100) / 100,
          lng: Math.round(lng * 100) / 100,
          placeCount: cellPlaces.length,
          verseCount,
          intensity: Math.min(1, verseCount / 50), // Normalize to 0-1
        });
      }
    }
  }

  return heatCells;
}

// ═══════════════════════════════════════════════════════════
// Regional Analysis
// ═══════════════════════════════════════════════════════════

/**
 * Group places by geographic region
 */
export function getRegions(): GeoRegion[] {
  const regions: GeoRegion[] = [
    {
      name_ar: 'الجزيرة العربية',
      name_en: 'Arabian Peninsula',
      bounds: { north: 35, south: 12, east: 60, west: 32 },
      places: [],
      dominantTopic: 0,
      majorEras: [],
    },
    {
      name_ar: 'مصر والشام',
      name_en: 'Egypt and Levant',
      bounds: { north: 37, south: 22, east: 40, west: 24 },
      places: [],
      dominantTopic: 0,
      majorEras: [],
    },
    {
      name_ar: 'العراق وبلاد الرافدين',
      name_en: 'Iraq and Mesopotamia',
      bounds: { north: 37, south: 29, east: 48, west: 38 },
      places: [],
      dominantTopic: 0,
      majorEras: [],
    },
  ];

  // Assign places to regions
  QURAN_PLACES.forEach(place => {
    regions.forEach(region => {
      if (isWithinRegion(place.lat, place.lng, region.bounds)) {
        region.places.push(place);
      }
    });
  });

  // Calculate dominant topic and eras for each region
  regions.forEach(region => {
    if (region.places.length > 0) {
      const topicCounts: Record<number, number> = {};
      const eraCounts: Record<string, number> = {};

      region.places.forEach(place => {
        topicCounts[place.topicId] = (topicCounts[place.topicId] || 0) + 1;
        eraCounts[place.era] = (eraCounts[place.era] || 0) + 1;
      });

      region.dominantTopic = Number(
        Object.entries(topicCounts).sort((a, b) => b[1] - a[1])[0][0]
      );
      region.majorEras = Object.entries(eraCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([era]) => era);
    }
  });

  return regions.filter(r => r.places.length > 0);
}

// ═══════════════════════════════════════════════════════════
// Network Analysis
// ═══════════════════════════════════════════════════════════

/**
 * Generate network graph of place relationships
 */
export function generatePlaceNetwork(): PlaceNetwork[] {
  const networks: PlaceNetwork[] = [];

  QURAN_PLACES.forEach(place => {
    const connected: Array<{ id: string; strength: number; type: PlaceNetwork['connectionType'] }> =
      [];

    // Proximity connections
    QURAN_PLACES.forEach(other => {
      if (other.id !== place.id) {
        const dist = calculateDistance(place.lat, place.lng, other.lat, other.lng);
        if (dist < 1000) {
          // Within 1000 km
          connected.push({
            id: other.id,
            strength: Math.max(0, 1 - dist / 1000),
            type: 'proximity',
          });
        }
      }
    });

    // Story connections (same era)
    QURAN_PLACES.forEach(other => {
      if (other.id !== place.id && other.era === place.era) {
        const existing = connected.find(c => c.id === other.id);
        if (existing) {
          existing.strength = Math.min(1, existing.strength + 0.3);
        } else {
          connected.push({
            id: other.id,
            strength: 0.5,
            type: 'story',
          });
        }
      }
    });

    // Topic connections
    QURAN_PLACES.forEach(other => {
      if (other.id !== place.id && other.topicId === place.topicId) {
        const existing = connected.find(c => c.id === other.id);
        if (existing) {
          existing.strength = Math.min(1, existing.strength + 0.2);
        } else {
          connected.push({
            id: other.id,
            strength: 0.3,
            type: 'topic',
          });
        }
      }
    });

    // Consolidate and take top connections
    const consolidated = Array.from(
      new Map(connected.map(c => [c.id, c])).values()
    ).sort((a, b) => b.strength - a.strength);

    networks.push({
      nodeId: place.id,
      connectedPlaces: consolidated.slice(0, 5).map(c => c.id),
      connectionStrength: consolidated[0]?.strength || 0,
      connectionType: consolidated[0]?.type || 'proximity',
    });
  });

  return networks;
}

/**
 * Get spatial statistics
 */
export function getSpatialStats() {
  const bounds = getBoundingBox(QURAN_PLACES);
  const clusters = clusterPlaces();
  const proximities = findProximities();

  const latSpan = bounds.north - bounds.south;
  const lngSpan = bounds.east - bounds.west;
  const areaCovered = calculateDistance(bounds.south, bounds.west, bounds.north, bounds.east);

  return {
    totalPlaces: QURAN_PLACES.length,
    geographicBounds: bounds,
    estimatedAreaKm2: areaCovered * areaCovered * 0.7, // Rough estimate
    clusterCount: clusters.length,
    averageClusterSize: clusters.reduce((sum, c) => sum + c.places.length, 0) / clusters.length,
    proximityPairsWithin500km: proximities.filter(p => p.distance <= 500).length,
    densestRegion: clusters.sort((a, b) => b.density - a.density)[0]?.regionName_en,
  };
}
