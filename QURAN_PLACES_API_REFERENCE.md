# Quranic Places Enhancement — API Reference & Examples

## Table of Contents

1. [Timeline Functions](#timeline-functions)
2. [Spatial Analytics](#spatial-analytics)
3. [React Components](#react-components)
4. [Code Examples](#code-examples)
5. [Types & Interfaces](#types--interfaces)

---

## Timeline Functions

### `getTimelineEvents()`

Get all timeline events organized by era.

```typescript
import { getTimelineEvents } from '@/lib/quranPlacesTimeline';

const events = getTimelineEvents();
// Returns: TimelineEvent[]

events.forEach(event => {
  console.log(event.era);           // 'creation', 'ibrahim', 'musa', etc.
  console.log(event.eraOrder);      // 0-5
  console.log(event.places.length); // How many places in this era
  console.log(event.description_ar);// Arabic narrative
  console.log(event.description_en);// English narrative
});
```

**Output Example:**
```typescript
[
  {
    era: 'creation',
    eraOrder: 0,
    places: [
      { id: 'flood', name_ar: 'الفلك', ... },
      { id: 'ahqaf', name_ar: 'الأحقاف', ... },
      // ... more places
    ],
    description_ar: 'عصر الخلق والأنبياء الأوائل...',
    description_en: 'Age of Creation and Early Prophets...'
  },
  // ... 5 more eras
]
```

---

### `getPlaceNarrative(placeId: string)`

Get detailed narrative context for a specific place.

```typescript
import { getPlaceNarrative } from '@/lib/quranPlacesTimeline';

const narrative = getPlaceNarrative('makkah');

if (narrative) {
  console.log(narrative.place.name_en);    // 'Makkah'
  console.log(narrative.storyType);         // 'crossroads'
  console.log(narrative.previousPlaces);    // Places mentioned before (Quran order)
  console.log(narrative.nextPlaces);        // Places mentioned after
  console.log(narrative.relatedPlaces);     // Places in same era/topic/story
}
```

**Usage Example — Display Related Places:**
```typescript
function PlaceDetails({ placeId }) {
  const narrative = getPlaceNarrative(placeId);
  
  if (!narrative) return <div>Place not found</div>;
  
  return (
    <div>
      <h2>{narrative.place.name_en}</h2>
      
      {narrative.previousPlaces.length > 0 && (
        <section>
          <h3>Mentioned Before</h3>
          {narrative.previousPlaces.map(p => (
            <PlaceLink key={p.id} place={p} />
          ))}
        </section>
      )}
      
      {narrative.relatedPlaces.length > 0 && (
        <section>
          <h3>Related Places ({narrative.storyType})</h3>
          {narrative.relatedPlaces.map(p => (
            <PlaceLink key={p.id} place={p} />
          ))}
        </section>
      )}
    </div>
  );
}
```

---

### `getProphetTimelines()`

Get chronological story progression for each prophet.

```typescript
import { getProphetTimelines } from '@/lib/quranPlacesTimeline';

const prophets = getProphetTimelines();

const musa = prophets.find(p => p.prophet_en === 'Musa');
console.log(musa?.places.length);     // 5 places in Musa's story
console.log(musa?.storyArc_en);       // Narrative summary
console.log(musa?.keyVerses[0]);      // Main verse reference

// Map each prophet to their journey
prophets.forEach(prophet => {
  const journey = prophet.places.map(p => p.name_en).join(' → ');
  console.log(`${prophet.prophet_en}: ${journey}`);
  // Output:
  // Muhammad (PBUH): Makkah → Cave of Hira → Madinah → Badr → ...
  // Musa (AS): Egypt → Madyan → Sinai → Jerusalem
  // etc.
});
```

**Display Prophet Timeline:**
```typescript
function ProphetTimeline() {
  const prophets = getProphetTimelines();
  
  return (
    <div className="space-y-6">
      {prophets.map(prophet => (
        <div key={prophet.prophet_en} className="border rounded-lg p-4">
          <h3 className="text-lg font-bold">
            {prophet.icon} {prophet.prophet_en}
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            {prophet.storyArc_en}
          </p>
          <div className="flex flex-wrap gap-2">
            {prophet.places.map((place, i) => (
              <div key={place.id} className="flex items-center gap-1">
                <span className="text-lg">{place.icon}</span>
                <span className="text-sm font-bold">{place.name_en}</span>
                {i < prophet.places.length - 1 && (
                  <span className="text-gray-400 mx-1">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

### `getTimelineConnections()`

Get relationships between places (migrations, stories, etc.)

```typescript
import { getTimelineConnections } from '@/lib/quranPlacesTimeline';

const connections = getTimelineConnections();

// Find all migrations
const migrations = connections.filter(c => c.type === 'migration');
migrations.forEach(conn => {
  console.log(`${conn.from} → ${conn.to}: ${conn.description_en}`);
  // Output: misr → madyan: Migration from Egypt to Madyan
});

// Find all same-story connections
const stories = connections.filter(c => c.type === 'same-story');
console.log(`${stories.length} place pairs in same story`);
```

---

## Spatial Analytics

### `clusterPlaces(clusterCount?: number)`

Group nearby places geographically.

```typescript
import { clusterPlaces } from '@/lib/quranPlacesSpatial';

const clusters = clusterPlaces(6); // 6 regional clusters

clusters.forEach(cluster => {
  console.log(`${cluster.regionName_en}:`);
  console.log(`  Places: ${cluster.places.length}`);
  console.log(`  Radius: ${cluster.radius.toFixed(0)} km`);
  console.log(`  Density: ${cluster.density.toFixed(1)} places/1000km²`);
  console.log(`  Center: ${cluster.center.lat}°, ${cluster.center.lng}°`);
});
```

**Output Example:**
```
Arabian Peninsula:
  Places: 15
  Radius: 2200 km
  Density: 0.31 places/1000km²
  Center: 24.5°, 42.5°

Egypt and Levant:
  Places: 12
  Radius: 1800 km
  Density: 0.37 places/1000km²
  ...
```

---

### `findProximities(radiusKm?: number)`

Find all place pairs within specified distance.

```typescript
import { findProximities } from '@/lib/quranPlacesSpatial';

const proximities = findProximities(500); // Within 500 km

proximities.forEach(prox => {
  console.log(`${prox.place1Id} ↔ ${prox.place2Id}`);
  console.log(`  Distance: ${prox.distance} km`);
  console.log(`  Route type: ${prox.routeType}`);
});

// Find specific pair
const pair = proximities.find(
  p => (p.place1Id === 'misr' && p.place2Id === 'sinai') ||
       (p.place1Id === 'sinai' && p.place2Id === 'misr')
);
console.log(`Egypt to Sinai: ${pair?.distance} km`);
```

---

### `generateHeatmap(cellSizeKm?: number)`

Create heatmap grid showing place/verse density.

```typescript
import { generateHeatmap } from '@/lib/quranPlacesSpatial';

const heatmap = generateHeatmap(100); // 100 km cells

// Render as color gradient
heatmap.forEach(cell => {
  const color = getHeatColor(cell.intensity);
  console.log(`(${cell.lat}°, ${cell.lng}°): intensity=${cell.intensity}`);
  console.log(`  Places: ${cell.placeCount}, Verses: ${cell.verseCount}`);
});

function getHeatColor(intensity) {
  // Intensity 0-1 maps to blue → red
  if (intensity < 0.3) return '#4878D4'; // Blue
  if (intensity < 0.6) return '#F8B62D'; // Yellow
  return '#E83C42';                      // Red
}
```

---

### `getRegions()`

Get places grouped by geographic region.

```typescript
import { getRegions } from '@/lib/quranPlacesSpatial';

const regions = getRegions();

regions.forEach(region => {
  console.log(`${region.name_en}:`);
  console.log(`  Bounds: N=${region.bounds.north}°, S=${region.bounds.south}°`);
  console.log(`  Places: ${region.places.length}`);
  console.log(`  Dominant topic: ${region.dominantTopic}`);
  console.log(`  Major eras: ${region.majorEras.join(', ')}`);
});
```

---

### `generatePlaceNetwork()`

Create network graph of place relationships.

```typescript
import { generatePlaceNetwork } from '@/lib/quranPlacesSpatial';

const network = generatePlaceNetwork();

const makkahNode = network.find(n => n.nodeId === 'makkah');
console.log(`Makkah connected to: ${makkahNode?.connectedPlaces}`);
// Output: ['madinah', 'safa', 'marwa', 'hajj-valley', 'arafat']

// Strength indicates closeness
console.log(`Connection strength: ${makkahNode?.connectionStrength}`);
console.log(`Connection type: ${makkahNode?.connectionType}`);
```

---

### `calculateDistance(lat1, lng1, lat2, lng2)`

Calculate exact distance between two points (Haversine formula).

```typescript
import { calculateDistance } from '@/lib/quranPlacesSpatial';

const makkahLat = 21.4225, makkahLng = 39.8262;
const madinahLat = 24.4672, madinahLng = 39.6112;

const distance = calculateDistance(makkahLat, makkahLng, madinahLat, madinahLng);
console.log(`Makkah to Madinah: ${distance.toFixed(0)} km`); // ≈ 450 km

// Common distances
const distances = {
  'Cairo to Sinai': calculateDistance(30.0444, 31.2357, 28.5394, 33.9750),
  'Sinai to Jerusalem': calculateDistance(28.5394, 33.9750, 31.7781, 35.2354),
  'Makkah to Yemen': calculateDistance(21.4225, 39.8262, 15.3694, 44.2020),
};
```

---

## React Components

### `<TimelineSlider />`

Interactive timeline slider with narrative.

```typescript
import TimelineSlider from '@/components/TimelineSlider';
import { useState } from 'react';

function MyPage() {
  const [selectedEra, setSelectedEra] = useState(0);
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  
  return (
    <div>
      <h1>Current era: {selectedEra}</h1>
      <h2>Selected place: {selectedPlace}</h2>
      
      <TimelineSlider
        onEraChange={(index) => {
          setSelectedEra(index);
          console.log(`Switched to era ${index}`);
        }}
        onPlaceSelect={(id) => {
          setSelectedPlace(id);
          console.log(`Selected place: ${id}`);
        }}
        maxEraIndex={5}
      />
    </div>
  );
}
```

**Features:**
- Drag slider or click era markers
- See place list for current era
- Story type badges
- Related places links
- Narrative description

---

### `<QuranPlacesMapEnhanced />`

Complete map system with all features.

```typescript
import QuranPlacesMapEnhanced from '@/components/QuranPlacesMapEnhanced';

function MapPage() {
  return (
    <div className="h-screen">
      <QuranPlacesMapEnhanced
        onGoToPage={(page) => console.log(`Go to page ${page}`)}
        highlightEra="nabawi"
      />
    </div>
  );
}
```

**Props:**
- `onGoToPage?: (page: number) => void` — Called when verse location selected
- `highlightEra?: string` — Initial era to highlight

**Features Included:**
- 🗺️ Place list with search
- 📍 Cluster grouping
- 🔥 Heatmap visualization
- 🔗 Network graph
- 🎚️ Timeline slider
- 🌍 Full responsiveness
- 🌙 Dark mode

---

## Code Examples

### Example 1: Display All Places in an Era

```typescript
import { getTimelineEvents } from '@/lib/quranPlacesTimeline';
import { TOPICS } from '@/lib/types';

function EraPlaces({ eraIndex }) {
  const events = getTimelineEvents();
  const currentEra = events[eraIndex];
  
  if (!currentEra) return null;
  
  return (
    <div>
      <h2>{currentEra.era.toUpperCase()}</h2>
      <p>{currentEra.description_en}</p>
      
      <div className="grid grid-cols-2 gap-4">
        {currentEra.places.map(place => {
          const topic = TOPICS[place.topicId];
          return (
            <div key={place.id} className="border rounded p-3">
              <h3 className="font-bold">{place.icon} {place.name_en}</h3>
              <p className="text-sm text-gray-600">{place.description_en}</p>
              <span
                className="text-xs text-white px-2 py-1 rounded"
                style={{ backgroundColor: topic?.hex }}
              >
                {topic?.name_en}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

### Example 2: Show All Prophet Journeys

```typescript
import { getProphetTimelines } from '@/lib/quranPlacesTimeline';

function ProphetJourneys() {
  const prophets = getProphetTimelines();
  
  return (
    <div className="space-y-6">
      {prophets.map(prophet => (
        <div key={prophet.prophet_en} className="border-l-4 pl-4"
             style={{ borderColor: '#3498DB' }}>
          <h3 className="text-lg font-bold">
            {prophet.icon} {prophet.prophet_en}
          </h3>
          
          <p className="text-sm text-gray-600 mb-3">
            {prophet.storyArc_en}
          </p>
          
          {/* Journey map */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {prophet.places.map((place, i) => (
              <div key={place.id} className="whitespace-nowrap">
                <div className="text-center">
                  <span className="text-2xl">{place.icon}</span>
                  <p className="text-xs font-bold mt-1">{place.name_en}</p>
                </div>
                {i < prophet.places.length - 1 && (
                  <span className="text-gray-400">→</span>
                )}
              </div>
            ))}
          </div>
          
          {/* Key verses */}
          <div className="mt-3 text-xs text-gray-500">
            <span className="font-bold">Key verses:</span>
            {prophet.keyVerses.slice(0, 2).map((v, i) => (
              <div key={i}>📖 {v.verse_key}: {v.snippet_en}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

### Example 3: Interactive Place Selector

```typescript
import {
  clusterPlaces,
  findProximities,
} from '@/lib/quranPlacesSpatial';
import { QURAN_PLACES } from '@/lib/quranPlaces';
import { useState } from 'react';

function PlaceSelector() {
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const clusters = clusterPlaces();
  const proximities = findProximities(500);
  
  const place = QURAN_PLACES.find(p => p.id === selectedPlace);
  const nearbyPlaces = proximities
    .filter(p => p.place1Id === selectedPlace || p.place2Id === selectedPlace)
    .slice(0, 3);
  
  return (
    <div className="space-y-4">
      {/* Cluster selector */}
      <div>
        <h3 className="font-bold mb-2">Select Cluster</h3>
        <div className="flex flex-wrap gap-2">
          {clusters.map(cluster => (
            <button
              key={cluster.id}
              onClick={() => setSelectedPlace(cluster.places[0]?.id || null)}
              className="px-3 py-1 rounded bg-blue-500 text-white text-sm"
            >
              {cluster.regionName_en} ({cluster.places.length})
            </button>
          ))}
        </div>
      </div>
      
      {/* Place detail */}
      {place && (
        <div className="border rounded p-4">
          <h2 className="text-lg font-bold">{place.name_en}</h2>
          <p className="text-gray-600">{place.description_en}</p>
          <p className="text-xs text-gray-500 mt-2">
            📍 {place.lat.toFixed(2)}°, {place.lng.toFixed(2)}°
          </p>
          
          {/* Nearby places */}
          {nearbyPlaces.length > 0 && (
            <div className="mt-3">
              <h4 className="font-bold text-sm">Nearby Places:</h4>
              <ul className="text-sm mt-1">
                {nearbyPlaces.map(prox => {
                  const otherPlace = QURAN_PLACES.find(
                    p => p.id === (prox.place1Id === selectedPlace ? prox.place2Id : prox.place1Id)
                  );
                  return (
                    <li key={otherPlace?.id}>
                      {otherPlace?.icon} {otherPlace?.name_en} ({prox.distance} km)
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Types & Interfaces

### TimelineEvent
```typescript
interface TimelineEvent {
  era: PlaceEra;                          // 'creation' | 'ibrahim' | ...
  eraOrder: number;                       // 0-5
  places: QuranPlace[];                   // Places in this era
  description_ar: string;                 // Arabic narrative
  description_en: string;                 // English narrative
}
```

### PlaceNarrative
```typescript
interface PlaceNarrative {
  placeId: string;                        // 'makkah'
  place: QuranPlace;                      // Full place object
  previousPlaces: QuranPlace[];           // Before this (Quran order)
  nextPlaces: QuranPlace[];               // After this
  relatedPlaces: QuranPlace[];            // Same era/topic/story
  storyType: 'solo' | 'part-of-cycle' | 'crossroads';
}
```

### ProphetTimeline
```typescript
interface ProphetTimeline {
  prophet_ar: string;                     // 'موسى عليه السلام'
  prophet_en: string;                     // 'Musa (AS)'
  icon: string;                           // '⛰️'
  era: PlaceEra;                          // 'musa'
  places: QuranPlace[];                   // All places in story
  keyVerses: Array<{                      // Main verses
    verse_key: string;
    snippet_ar: string;
    snippet_en: string;
  }>;
  storyArc_ar: string;                    // Story summary (Arabic)
  storyArc_en: string;                    // Story summary (English)
}
```

### GeoCluster
```typescript
interface GeoCluster {
  id: string;                             // 'cluster-0'
  center: { lat: number; lng: number };   // Cluster center
  places: QuranPlace[];                   // All places
  radius: number;                         // km
  density: number;                        // places per 1000 km²
  regionName_ar: string;                  // 'الجزيرة العربية'
  regionName_en: string;                  // 'Arabian Peninsula'
}
```

### GeoProximity
```typescript
interface GeoProximity {
  place1Id: string;                       // 'misr'
  place2Id: string;                       // 'sinai'
  distance: number;                       // km
  routeType: 'direct' | 'via-migration-path';
  verseCount: number;                     // Shared verses
}
```

### GeoRegion
```typescript
interface GeoRegion {
  name_ar: string;                        // 'الجزيرة العربية'
  name_en: string;                        // 'Arabian Peninsula'
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  places: QuranPlace[];                   // All places
  dominantTopic: number;                  // Topic ID
  majorEras: string[];                    // Top 3 eras
}
```

---

## Quick Lookup Table

| Need | Function | Returns |
|------|----------|---------|
| Timeline events | `getTimelineEvents()` | `TimelineEvent[]` |
| Place narrative | `getPlaceNarrative(id)` | `PlaceNarrative \| null` |
| Prophet stories | `getProphetTimelines()` | `ProphetTimeline[]` |
| Geography clusters | `clusterPlaces(6)` | `GeoCluster[]` |
| Place density | `generateHeatmap(100)` | `GeoHeatCell[]` |
| Nearby places | `findProximities(500)` | `GeoProximity[]` |
| Regional groups | `getRegions()` | `GeoRegion[]` |
| Place relationships | `generatePlaceNetwork()` | `PlaceNetwork[]` |
| Distance calculation | `calculateDistance(...)` | `number` |

---

## Performance Notes

- **Clustering**: O(n² log n) — precompute and cache
- **Heatmap**: O(n) — fast, can regenerate on grid change
- **Proximities**: O(n²) — cache results
- **Network**: O(n²) — memoize in React

Use `useMemo` for spatial calculations:
```typescript
const clusters = useMemo(() => clusterPlaces(6), []);
```

---

## License & Attribution

All code provided as-is for use in Al-Mushaf project.

Type definitions match existing codebase.

No external dependencies beyond Leaflet (already present).
