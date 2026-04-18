/**
 * Swagger/OpenAPI Specification Endpoint
 *
 * GET /api/v1/docs/swagger.json
 * Returns OpenAPI 3.0 specification
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateOpenApiSpec } from '@/lib/api/openapi';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const spec = generateOpenApiSpec();

    return NextResponse.json(spec, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate OpenAPI spec' },
      { status: 500 }
    );
  }
}
