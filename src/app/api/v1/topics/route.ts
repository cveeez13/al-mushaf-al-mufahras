/**
 * API v1 - Topics Endpoint
 *
 * GET /api/v1/topics - List all topics
 * GET /api/v1/topics/{id} - Get specific topic
 * GET /api/v1/topics/{id}/verses - Get verses for topic
 */

import { NextRequest, NextResponse } from 'next/server';
import { TOPIC_COLORS, QURAN_VERSES } from '@/lib/quranData';
import {
  successResponse,
  paginatedResponse,
  getPaginationParams,
  NotFoundError,
} from '@/lib/api/apiUtils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/topics
 * List all topics with pagination
 */
export async function GET(request: NextRequest, context: any) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, pageSize } = getPaginationParams(searchParams);
    const search = searchParams.get('search')?.toLowerCase() || '';

    // Build topics array
    const topics = Object.entries(TOPIC_COLORS).map(([key, value]) => ({
      id: key,
      name_ar: value.ar,
      name_en: value.en,
      color: value.color,
      verseCount: QURAN_VERSES.filter(v => v.topics?.includes(key as any)).length,
    }));

    // Apply search filter
    let filtered = topics;
    if (search) {
      filtered = topics.filter(
        t =>
          t.name_ar.includes(search) ||
          t.name_en.toLowerCase().includes(search)
      );
    }

    // Apply pagination
    const start = (page - 1) * pageSize;
    const paginatedTopics = filtered.slice(start, start + pageSize);

    return NextResponse.json(
      paginatedResponse(paginatedTopics, filtered.length, page, pageSize),
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'An error occurred',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/topics/{id}
 * Get specific topic
 */
export async function GET_TOPIC(request: NextRequest, context: any) {
  try {
    const topicId = context.params.id;

    const topicEntry = Object.entries(TOPIC_COLORS).find(
      ([key]) => key === topicId
    );

    if (!topicEntry) {
      throw new NotFoundError('Topic');
    }

    const [key, value] = topicEntry;
    const verseCount = QURAN_VERSES.filter(v => v.topics?.includes(key as any))
      .length;

    const topic = {
      id: key,
      name_ar: value.ar,
      name_en: value.en,
      description_ar: `موضوع: ${value.ar}`,
      description_en: `Topic: ${value.en}`,
      color: value.color,
      verseCount,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(successResponse(topic), { status: 200 });
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
