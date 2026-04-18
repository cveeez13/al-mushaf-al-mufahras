/**
 * Quran Places Timeline — Narrative & Chronological Ordering
 *
 * Features:
 * - Timeline grouping by era with chronological ordering
 * - Verse sequence within each place (Quran order vs chronological order)
 * - Related places (same story, prophet, era)
 * - Timeline narrative (story progression across eras)
 * - Prophet-centric timeline (all prophets in order)
 */

import { QURAN_PLACES, type QuranPlace, type PlaceEra, ERAS_ORDERED } from './quranPlaces';
import { SURAH_NAMES } from './types';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export interface TimelineEvent {
  era: PlaceEra;
  eraOrder: number;
  places: QuranPlace[];
  description_ar: string;
  description_en: string;
}

export interface PlaceNarrative {
  placeId: string;
  place: QuranPlace;
  previousPlaces: QuranPlace[]; // Places mentioned before this one in Quran order
  nextPlaces: QuranPlace[]; // Places mentioned after
  relatedPlaces: QuranPlace[]; // Same era, topic, or prophet story
  storyType: 'solo' | 'part-of-cycle' | 'crossroads'; // Is this place isolated, part of a series, or connected to multiple stories?
}

export interface ProphetTimeline {
  prophet_ar: string;
  prophet_en: string;
  icon: string;
  era: PlaceEra;
  places: QuranPlace[];
  keyVerses: Array<{ verse_key: string; snippet_ar: string; snippet_en: string }>;
  storyArc_ar: string;
  storyArc_en: string;
}

export interface TimelineNode {
  id: string;
  type: 'place' | 'event' | 'story';
  era: PlaceEra;
  timestamp: number; // Era order
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  connectedPlaces: string[]; // Place IDs connected to this node
  color: string;
}

export interface TimelineConnection {
  from: string; // Place ID
  to: string; // Place ID
  type: 'prophecy-fulfillment' | 'migration' | 'visit' | 'same-story' | 'same-prophet';
  description_ar: string;
  description_en: string;
}

// ═══════════════════════════════════════════════════════════
// Era Descriptions
// ═══════════════════════════════════════════════════════════

const ERA_NARRATIVES: Record<PlaceEra, { ar: string; en: string }> = {
  creation: {
    ar: 'عصر الخلق والأنبياء الأوائل — آدم ونوح وهود وصالح. يدور حول قصص الأقوام المكذبة وعذابهم.',
    en: 'Age of Creation and Early Prophets — Adam, Noah, Hud, Salih. Focuses on stories of nations that rejected faith and their punishment.',
  },
  ibrahim: {
    ar: 'عصر إبراهيم — الخليل ولوط وإسماعيل. يركز على بناء الكعبة والهجرة والاختبارات الإلهية.',
    en: 'Age of Ibrahim — The Khalil, Lut, and Ismail. Focuses on building the Kaaba, migration, and divine tests.',
  },
  musa: {
    ar: 'عصر موسى — مصر والتوراة وبني إسرائيل. يحكي قصة الخروج من مصر والتيه في الصحراء.',
    en: 'Age of Musa — Egypt, the Torah, and Bani Israel. Tells the story of the Exodus and wandering in the desert.',
  },
  prophets: {
    ar: 'عصر الأنبياء — داود وسليمان وعيسى وغيرهم. عهد الملوك والدعوة والمعجزات.',
    en: 'Age of Prophets — David, Solomon, Jesus and others. Era of kings, preaching, and miracles.',
  },
  jahiliyyah: {
    ar: 'عصر الجاهلية — قريش وأصحاب الفيل وقبل البعثة. الظلام قبل النور.',
    en: 'Age of Ignorance — Quraysh and People of the Elephant. The darkness before enlightenment.',
  },
  nabawi: {
    ar: 'العهد النبوي — رسالة محمد ﷺ والمدينة والغزوات. نور الهداية والرسالة الخاتمة.',
    en: 'Prophetic Era — Message of Muhammad (PBUH), Madinah, and battles. The light of guidance and the final message.',
  },
};

// ═══════════════════════════════════════════════════════════
// Prophet-Centric Timelines
// ═══════════════════════════════════════════════════════════

const PROPHET_TIMELINES: ProphetTimeline[] = [
  {
    prophet_ar: 'نوح عليه السلام',
    prophet_en: 'Noah (AS)',
    icon: '⛵',
    era: 'creation',
    places: QURAN_PLACES.filter(p => ['flood', 'ark'].some(id => p.id.includes(id))),
    keyVerses: [
      {
        verse_key: '7:64',
        snippet_ar: 'فكذبوه فأنجيناه ومن معه في الفلك وجعلناهم خلائف',
        snippet_en: 'But they denied him, so We saved him and those with him in the Ark',
      },
    ],
    storyArc_ar: 'دعوة نوح لـ 950 سنة، ورفض قومه، والطوفان الذي أغرقهم.',
    storyArc_en: 'Noah\'s call for 950 years, rejection by his people, and the flood that drowned them.',
  },
  {
    prophet_ar: 'إبراهيم عليه السلام',
    prophet_en: 'Ibrahim (AS)',
    icon: '🙏',
    era: 'ibrahim',
    places: QURAN_PLACES.filter(p => p.era === 'ibrahim'),
    keyVerses: [
      {
        verse_key: '2:124',
        snippet_ar: 'وإذ ابتلى إبراهيم ربه بكلمات فأتمهن',
        snippet_en: 'And when his Lord tested Ibrahim with words, he fulfilled them',
      },
    ],
    storyArc_ar: 'الاختبار والهجرة وبناء الكعبة مع إسماعيل.',
    storyArc_en: 'Testing, migration, and building the Kaaba with Ismail.',
  },
  {
    prophet_ar: 'موسى عليه السلام',
    prophet_en: 'Musa (AS)',
    icon: '⛰️',
    era: 'musa',
    places: QURAN_PLACES.filter(p => p.era === 'musa'),
    keyVerses: [
      {
        verse_key: '10:87',
        snippet_ar: 'وأوحينا إلى موسى وأخيه أن تبوآ لقومكما بمصر بيوتا',
        snippet_en: 'We inspired Musa and his brother to settle your people in Egypt',
      },
    ],
    storyArc_ar: 'الولادة والنشأة بقصر فرعون والخروج من مصر والتوراة.',
    storyArc_en: 'Birth, upbringing in Pharaoh\'s palace, Exodus, and the Torah.',
  },
  {
    prophet_ar: 'محمد ﷺ',
    prophet_en: 'Muhammad (PBUH)',
    icon: '🕌',
    era: 'nabawi',
    places: QURAN_PLACES.filter(p => p.era === 'nabawi'),
    keyVerses: [
      {
        verse_key: '1:1',
        snippet_ar: 'الحمد لله رب العالمين',
        snippet_en: 'All praise is due to Allah, Lord of all the worlds',
      },
    ],
    storyArc_ar: 'البعثة والهجرة والغزوات وتأسيس الدولة الإسلامية.',
    storyArc_en: 'Prophethood, migration, battles, and establishment of the Islamic state.',
  },
];

// ═══════════════════════════════════════════════════════════
// Timeline Generation Functions
// ═══════════════════════════════════════════════════════════

/**
 * Get timeline events organized by era
 */
export function getTimelineEvents(): TimelineEvent[] {
  return ERAS_ORDERED.map((era, index) => {
    const places = QURAN_PLACES.filter(p => p.era === era);
    return {
      era,
      eraOrder: index,
      places,
      description_ar: ERA_NARRATIVES[era].ar,
      description_en: ERA_NARRATIVES[era].en,
    };
  });
}

/**
 * Get narrative context for a place
 */
export function getPlaceNarrative(placeId: string): PlaceNarrative | null {
  const place = QURAN_PLACES.find(p => p.id === placeId);
  if (!place) return null;

  const allPlaces = QURAN_PLACES;
  const currentIndex = allPlaces.findIndex(p => p.id === placeId);

  // Previous and next places in Quran order
  const previousPlaces = allPlaces.slice(0, currentIndex);
  const nextPlaces = allPlaces.slice(currentIndex + 1);

  // Related places: same era, same topic, or connected story
  const relatedPlaces = allPlaces.filter(
    p =>
      p.id !== placeId &&
      (p.era === place.era || p.topicId === place.topicId || isConnectedStory(place, p))
  );

  // Determine story type
  let storyType: 'solo' | 'part-of-cycle' | 'crossroads' = 'solo';
  const sameEraPla ces = QURAN_PLACES.filter(p => p.era === place.era && p.id !== placeId);
  const sameTopic = QURAN_PLACES.filter(p => p.topicId === place.topicId && p.id !== placeId);

  if (sameEraPlaces.length > 2) storyType = 'part-of-cycle';
  if (sameTopic.length > 5) storyType = 'crossroads';

  return {
    placeId,
    place,
    previousPlaces,
    nextPlaces,
    relatedPlaces,
    storyType,
  };
}

/**
 * Check if two places are connected in a story (same prophet, city relationship, etc.)
 */
function isConnectedStory(place1: QuranPlace, place2: QuranPlace): boolean {
  // Same narrative era and related through story (heuristic)
  if (place1.era === place2.era) {
    const overlap = place1.verses.some(v1 =>
      place2.verses.some(v2 => Math.abs(v1.surah - v2.surah) <= 1)
    );
    return overlap;
  }

  // Check for prophecy-fulfillment (e.g., Egypt story spans multiple eras)
  if (place1.id === 'misr' || place2.id === 'misr') {
    return true; // Egypt is central to multiple prophet stories
  }

  return false;
}

/**
 * Get prophet-centric timeline
 */
export function getProphetTimelines(): ProphetTimeline[] {
  return PROPHET_TIMELINES;
}

/**
 * Get timeline nodes for visualization
 */
export function getTimelineNodes(): TimelineNode[] {
  const nodes: TimelineNode[] = [];
  const events = getTimelineEvents();

  events.forEach((event, index) => {
    // Add era node
    nodes.push({
      id: `era-${event.era}`,
      type: 'event',
      era: event.era,
      timestamp: index,
      title_ar: `العصر: ${event.era}`,
      title_en: `Era: ${event.era}`,
      description_ar: event.description_ar,
      description_en: event.description_en,
      connectedPlaces: event.places.map(p => p.id),
      color: '#888',
    });

    // Add place nodes
    event.places.forEach(place => {
      nodes.push({
        id: place.id,
        type: 'place',
        era: place.era,
        timestamp: index,
        title_ar: place.name_ar,
        title_en: place.name_en,
        description_ar: place.description_ar,
        description_en: place.description_en,
        connectedPlaces: [],
        color: `#${QURAN_PLACES.find(p => p.topicId === place.topicId)?.topicId || 0}`,
      });
    });
  });

  return nodes;
}

/**
 * Get connections between places for relationship visualization
 */
export function getTimelineConnections(): TimelineConnection[] {
  const connections: TimelineConnection[] = [];

  // Same prophet stories
  PROPHET_TIMELINES.forEach(prophet => {
    for (let i = 0; i < prophet.places.length - 1; i++) {
      connections.push({
        from: prophet.places[i].id,
        to: prophet.places[i + 1].id,
        type: 'same-story',
        description_ar: `جزء من قصة ${prophet.prophet_ar}`,
        description_en: `Part of ${prophet.prophet_en}'s story`,
      });
    }
  });

  // Migrations and visits
  const migrationPairs = [
    ['quds', 'misr'],
    ['misr', 'madyan'],
    ['madyan', 'sinai'],
    ['sinai', 'quds'],
    ['makkah', 'madinah'],
  ];

  migrationPairs.forEach(([from, to]) => {
    const fromPlace = QURAN_PLACES.find(p => p.id === from);
    const toPlace = QURAN_PLACES.find(p => p.id === to);
    if (fromPlace && toPlace) {
      connections.push({
        from,
        to,
        type: 'migration',
        description_ar: `هجرة من ${fromPlace.name_ar} إلى ${toPlace.name_ar}`,
        description_en: `Migration from ${fromPlace.name_en} to ${toPlace.name_en}`,
      });
    }
  });

  return connections;
}

/**
 * Get verse-by-verse timeline for a specific place
 */
export function getPlaceVerseTimeline(placeId: string): Array<{
  surah: number;
  ayah: number;
  verse_key: string;
  snippet_ar: string;
  snippet_en: string;
  context_ar: string;
  context_en: string;
}> {
  const place = QURAN_PLACES.find(p => p.id === placeId);
  if (!place) return [];

  return place.verses.map(verse => ({
    ...verse,
    context_ar: `من سورة ${SURAH_NAMES[verse.surah]}`,
    context_en: `From Surah ${SURAH_NAMES[verse.surah]}`,
  }));
}

/**
 * Get chronological order of major events across all eras
 */
export function getChronologicalTimeline(): TimelineNode[] {
  const events = getTimelineEvents();
  const nodes: TimelineNode[] = [];

  events.forEach((event, index) => {
    nodes.push({
      id: `era-${index}`,
      type: 'event',
      era: event.era,
      timestamp: index,
      title_ar: ERA_NARRATIVES[event.era].ar.split(' — ')[0],
      title_en: ERA_NARRATIVES[event.era].en.split(' — ')[0],
      description_ar: event.description_ar,
      description_en: event.description_en,
      connectedPlaces: event.places.map(p => p.id),
      color: '#888',
    });
  });

  return nodes;
}

/**
 * Get summary statistics for timeline
 */
export function getTimelineStats() {
  const events = getTimelineEvents();
  const totalPlaces = QURAN_PLACES.length;
  const totalVerses = QURAN_PLACES.reduce((sum, p) => sum + p.verses.length, 0);

  return {
    totalEras: events.length,
    totalPlaces,
    totalVerses,
    eraBreakdown: Object.fromEntries(
      events.map(e => [
        e.era,
        {
          placeCount: e.places.length,
          verseCount: e.places.reduce((sum, p) => sum + p.verses.length, 0),
        },
      ])
    ),
  };
}
