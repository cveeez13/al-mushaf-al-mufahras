// @ts-nocheck
/**
 * Mapbox GL Integration for Quran Places Map
 *
 * Features:
 * - Vector tiles with better performance
 * - Custom styling (dark/light modes)
 * - Heatmap layer for place density
 * - Clustering layer for zoomed-out view
 * - Custom popups with verse information
 * - 3D terrain visualization option
 */

import { QURAN_PLACES, toGeoJSON, type QuranPlace } from './quranPlaces';
import { clusterPlaces, generateHeatmap, getSpatialStats, type GeoCluster } from './quranPlacesSpatial';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export interface MapboxConfig {
  accessToken: string;
  style: 'light' | 'dark' | 'satellite';
  showClusters: boolean;
  showHeatmap: boolean;
  show3DTerrain: boolean;
  enableGeocoding: boolean;
}

export interface MapboxLayer {
  id: string;
  type: 'circle' | 'symbol' | 'heatmap' | 'line' | 'fill';
  source: string;
  paint: Record<string, any>;
  layout?: Record<string, any>;
  minzoom?: number;
  maxzoom?: number;
}

export interface MapboxSource {
  type: 'geojson' | 'vector' | 'raster';
  data?: any;
  url?: string;
}

// ═══════════════════════════════════════════════════════════
// Map Configuration
// ═══════════════════════════════════════════════════════════

/**
 * Get Mapbox style URL based on preference
 */
export function getMapboxStyle(style: 'light' | 'dark' | 'satellite' = 'light'): string {
  const baseUrl = 'mapbox://styles/mapbox';
  const styles: Record<string, string> = {
    light: `${baseUrl}/light-v11`,
    dark: `${baseUrl}/dark-v11`,
    satellite: `${baseUrl}/satellite-v9`,
  };
  return styles[style] || styles.light;
}

/**
 * Get GeoJSON data source for Quran Places
 */
export function getPlacesGeoJSONSource(): MapboxSource {
  return {
    type: 'geojson',
    data: toGeoJSON(QURAN_PLACES),
  };
}

/**
 * Get clustered places GeoJSON source
 */
export function getClusteredPlacesSource(clusterRadius: number = 80): MapboxSource {
  const geojson = toGeoJSON(QURAN_PLACES);
  return {
    type: 'geojson',
    data: geojson,
  };
}

/**
 * Get heatmap GeoJSON source
 */
export function getHeatmapSource(): MapboxSource {
  const heatmapCells = generateHeatmap();
  return {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: heatmapCells.map(cell => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [cell.lng, cell.lat],
        },
        properties: {
          intensity: cell.intensity,
          placeCount: cell.placeCount,
          verseCount: cell.verseCount,
        },
      })),
    },
  };
}

// ═══════════════════════════════════════════════════════════
// Layer Definitions
// ═══════════════════════════════════════════════════════════

/**
 * Get base map layers (background, water, etc.)
 */
export function getBaseLayers(): MapboxLayer[] {
  return [
    {
      id: 'background',
      type: 'circle',
      source: 'places',
      paint: {
        'circle-radius': 4,
        'circle-color': '#fff',
          // filter: ['has', 'point_count'],
        'circle-stroke-width': 1,
      },
    },
  ];
}

/**
 * Get clustered markers layer
 */
export function getClusterLayer(): MapboxLayer {
  return {
    id: 'clusters',
    type: 'circle',
    source: 'places',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step',
        ['get', 'point_count'],
        '#51bbd6',
        100,
        '#f1f075',
        750,
        '#f28cb1',
      ],
      'circle-radius': ['step', ['get', 'point_count'], 20, 100, 30, 750, 40],
    },
  };
}

/**
 * Get unclustered points layer
 */
export function getUnclusteredPointLayer(): MapboxLayer {
  return {
    id: 'unclustered-point',
    type: 'circle',
    source: 'places',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': [
        'match',
        ['get', 'topicId'],
        1, '#3498DB',
        2, '#27AE60',
        3, '#F39C12',
        4, '#E74C3C',
        5, '#9B59B6',
        6, '#E67E22',
        7, '#C0392B',
        '#888',
      ],
      'circle-radius': 8,
      'circle-stroke-color': '#fff',
      'circle-stroke-width': 2,
      'circle-opacity': 0.8,
    },
  };
}

/**
 * Get heatmap layer
 */
export function getHeatmapLayer(): MapboxLayer {
  return {
    id: 'heatmap',
    type: 'heatmap',
    source: 'heatmap',
    maxzoom: 9,
    paint: {
      'heatmap-weight': ['interpolate', ['linear'], ['get', 'intensity'], 0, 0, 1, 1],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0,
        'rgba(33, 102, 172, 0)',
        0.2,
        'rgb(103, 169, 207)',
        0.4,
        'rgb(209, 229, 240)',
        0.6,
        'rgb(253, 219, 199)',
        0.8,
        'rgb(239, 138, 98)',
        1,
        'rgb(178, 24, 43)',
      ],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20],
    },
  };
}

/**
 * Get cluster count layer
 */
export function getClusterCountLayer(): MapboxLayer {
  return {
    id: 'cluster-count',
    type: 'symbol',
    source: 'places',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 12,
    },
    paint: {
      'text-color': '#fff',
    },
  };
}

/**
 * Get place icon/symbol layer
 */
export function getPlaceSymbolLayer(): MapboxLayer {
  return {
    id: 'place-icons',
    type: 'symbol',
    source: 'places',
    filter: ['!', ['has', 'point_count']],
    layout: {
      'text-field': '{icon}',
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 14,
      'text-offset': [0, -1.5],
      'text-anchor': 'bottom',
    },
  };
}

// ═══════════════════════════════════════════════════════════
// Popup Templates
// ═══════════════════════════════════════════════════════════

/**
 * Generate HTML popup for place
 */
export function getPlacePopup(place: QuranPlace, lang: 'ar' | 'en'): string {
  const title = lang === 'ar' ? place.name_ar : place.name_en;
  const desc = lang === 'ar' ? place.description_ar : place.description_en;
  const versesLabel = lang === 'ar' ? 'آيات' : 'Verses';
  const era = lang === 'ar' ? 
    (place.era === 'creation' ? 'الخلق' : 
     place.era === 'ibrahim' ? 'إبراهيم' :
     place.era === 'musa' ? 'موسى' :
     place.era === 'prophets' ? 'الأنبياء' :
     place.era === 'jahiliyyah' ? 'الجاهلية' : 'النبوي')
    : place.era;

  return `
    <div class="popup-content" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
      <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 14px;">
        ${place.icon} ${title}
      </h3>
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">
        ${desc}
      </p>
      <div style="display: flex; gap: 8px; font-size: 11px; color: #999;">
        <span>📍 ${place.lat.toFixed(2)}°, ${place.lng.toFixed(2)}°</span>
        <span>📅 ${era}</span>
        <span>📖 ${place.verses.length} ${versesLabel}</span>
      </div>
    </div>
  `;
}

/**
 * Generate HTML popup for cluster
 */
export function getClusterPopup(cluster: GeoCluster, lang: 'ar' | 'en'): string {
  const regionName = lang === 'ar' ? cluster.regionName_ar : cluster.regionName_en;
  const placesLabel = lang === 'ar' ? 'أماكن' : 'Places';
  const densityLabel = lang === 'ar' ? 'الكثافة' : 'Density';

  return `
    <div class="cluster-popup" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
      <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 14px;">
        🗺️ ${regionName}
      </h3>
      <div style="font-size: 12px; color: #666;">
        <p>${cluster.places.length} ${placesLabel}</p>
        <p>${densityLabel}: ${cluster.density.toFixed(1)} places/1000km²</p>
      </div>
      <ul style="margin: 8px 0 0 0; padding-left: 16px; font-size: 11px; color: #999;">
        ${cluster.places
          .slice(0, 5)
          .map(p => `<li>${p.icon} ${lang === 'ar' ? p.name_ar : p.name_en}</li>`)
          .join('')}
        ${cluster.places.length > 5 ? `<li>... ${cluster.places.length - 5} more</li>` : ''}
      </ul>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
// Map Interactivity
// ═══════════════════════════════════════════════════════════

/**
 * Get fly-to parameters for place
 */
export function getFlyToPlace(place: QuranPlace) {
  return {
    center: [place.lng, place.lat],
    zoom: 8,
    pitch: 20,
    bearing: 0,
    duration: 1500,
  };
}

/**
 * Get fit-bounds parameters for region
 */
export function getFitBoundsParams(places: QuranPlace[]) {
  if (places.length === 0) {
    return {
      center: [0, 20],
      zoom: 2,
    };
  }

  const lats = places.map(p => p.lat);
  const lngs = places.map(p => p.lng);

  return {
    bounds: [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ],
    padding: 80,
  };
}

// ═══════════════════════════════════════════════════════════
// Advanced Features
// ═══════════════════════════════════════════════════════════

/**
 * Get 3D terrain source
 */
export function get3DTerrainSource(): MapboxSource {
  return {
    type: 'raster',
    url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
  };
}

/**
 * Get place connections as line layer
 */
export function getPlaceConnectionsLayer(
  connections: Array<{ from: string; to: string }>
): { source: MapboxSource; layer: MapboxLayer } {
  const features = connections.map(conn => {
    const fromPlace = QURAN_PLACES.find(p => p.id === conn.from);
    const toPlace = QURAN_PLACES.find(p => p.id === conn.to);

    if (!fromPlace || !toPlace) return null;

    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [fromPlace.lng, fromPlace.lat],
          [toPlace.lng, toPlace.lat],
        ],
      },
      properties: {
        from: conn.from,
        to: conn.to,
      },
    };
  }).filter(Boolean);

  return {
    source: {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features,
      },
    },
    layer: {
      id: 'place-connections',
      type: 'line',
      source: 'place-connections',
      paint: {
        'line-color': '#888',
        'line-width': 1,
        'line-opacity': 0.4,
        'line-dasharray': [2, 2],
      },
    },
  };
}

// ═══════════════════════════════════════════════════════════
// Statistics & Info
// ═══════════════════════════════════════════════════════════

/**
 * Get map statistics for display
 */
export function getMapStats() {
  return getSpatialStats();
}
