/**
 * API v1 - Search Endpoint
 *
 * GET /api/v1/search - Full-text search across all data
 */

import { NextRequest, NextResponse } from 'next/server';
import { QURAN_PLACES } from '@/lib/quranPlaces';
import { TOPIC_COLORS } from '@/lib/mushafOverlays';
import { getAllVerses } from '@/lib/data';
import {
  successResponse,
  paginatedResponse,
  getPaginationParams,
  ValidationError,
} from '@/lib/api/apiUtils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/search
 * Full-text search across topics, places, and verses
 */
export async function GET(request: NextRequest) {

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';
    const type = searchParams.get('type') || 'all';
    const { page, pageSize } = getPaginationParams(searchParams);

    if (!query.trim()) {
      throw new ValidationError('Search query (q) is required');
    }

    let results: any[] = [];
    const verses = await getAllVerses();

    // Search topics
    if (type === 'all' || type === 'topics') {
      const topicResults = Object.entries(TOPIC_COLORS)
        .filter(
          ([key, value]) =>
            key.includes(query) ||
            value.ar.includes(query) ||
            value.en.toLowerCase().includes(query)
        )
        .map(([key, value]) => ({
          type: 'topic',
          id: key,
          name_ar: value.ar,
          name_en: value.en,
          color: value.color,
          verseCount: verses.filter(v => v.topic?.id === Number(key)).length,
        }));
      results.push(...topicResults);
    }

    // Search places
    if (type === 'all' || type === 'places') {
      const placeResults = QURAN_PLACES.filter(
        p =>
          p.name_ar?.includes(query) ||
          p.name_en?.toLowerCase().includes(query) ||
          p.era?.toLowerCase().includes(query)
      ).map(p => ({
        type: 'place',
        ...p,
      }));
      results.push(...placeResults);
    }

    // Search verses (text and translations)
    if (type === 'all' || type === 'verses') {
      const verseResults = verses.filter(
        v =>
          v.text?.includes(query)
      )
        .slice(0, 50) // Limit verse results
        .map(v => ({
          type: 'verse',
          surah: v.surah,
          ayah: v.ayah,
          text: v.text?.substring(0, 100),
        }));
      results.push(...verseResults);
    }

    // Apply pagination to combined results
    const start = (page - 1) * pageSize;
    const paginatedResults = results.slice(start, start + pageSize);

    return NextResponse.json(
      paginatedResponse(paginatedResults, results.length, page, pageSize),
      { status: 200 }
    );
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code || 'INTERNAL_ERROR',
          message: error.message || 'An error occurred',
        },
      },
      { status: statusCode }
    );
  }
}
