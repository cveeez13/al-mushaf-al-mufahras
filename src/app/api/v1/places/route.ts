/**
 * API v1 - Places Endpoint
 *
 * GET /api/v1/places - List all places
 * GET /api/v1/places/{id} - Get specific place
 */

import { NextRequest, NextResponse } from 'next/server';
import { QURAN_PLACES } from '@/lib/quranData';
import {
  successResponse,
  paginatedResponse,
  getPaginationParams,
  NotFoundError,
} from '@/lib/api/apiUtils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/places
 * List all geographical places
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, pageSize } = getPaginationParams(searchParams);
    const region = searchParams.get('region')?.toLowerCase() || '';

    // Filter by region if provided
    let filtered = QURAN_PLACES;
    if (region) {
      filtered = QURAN_PLACES.filter(p => p.region?.toLowerCase().includes(region));
    }

    // Apply pagination
    const start = (page - 1) * pageSize;
    const paginatedPlaces = filtered.slice(start, start + pageSize);

    return NextResponse.json(
      paginatedResponse(paginatedPlaces, filtered.length, page, pageSize),
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
