// @ts-nocheck
/**
 * API Middleware
 *
 * Combines authentication, rate limiting, logging
 * Works with Next.js API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  successResponse,
  errorResponse,
  AuthenticationError,
  RateLimitError,
  ApiError,
} from './apiUtils';
import {
  extractApiKey,
  apiKeyManager,
  hashApiKey,
} from './apiAuth';
import {
  validateRateLimit,
  getRateLimitIdentifier,
  DEFAULT_RATE_LIMITS,
  RateLimitConfig,
} from './rateLimiter';

export interface ApiRequest extends NextRequest {
  apiKeyId?: string;
  userId?: string;
  ip?: string;
  startTime?: number;
}

export interface ApiMiddlewareOptions {
  requireAuth?: boolean;
  rateLimit?: RateLimitConfig;
  corsOrigins?: string[];
  methods?: string[];
  version?: string;
}

/**
 * API middleware wrapper
 */
export async function withApiAuth(
  handler: (req: ApiRequest) => Promise<NextResponse>,
  options: ApiMiddlewareOptions = {}
): Promise<(req: NextRequest) => Promise<NextResponse>> {
  return async (req: NextRequest) => {
    const request = req as ApiRequest;
    request.startTime = Date.now();
    request.ip = getClientIp(req);

    try {
      // Check method
      if (options.methods && !options.methods.includes(req.method)) {
        return new NextResponse(
          JSON.stringify(
            errorResponse('METHOD_NOT_ALLOWED', `Method ${req.method} not allowed`)
          ),
          {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Check CORS
      if (options.corsOrigins) {
        const origin = req.headers.get('origin');
        if (origin && !options.corsOrigins.includes(origin)) {
          return new NextResponse(
            JSON.stringify(errorResponse('CORS_ERROR', 'Origin not allowed')),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // Authenticate if required
      if (options.requireAuth) {
        const apiKey = extractApiKey(Object.fromEntries(req.headers));
        if (!apiKey) {
          throw new AuthenticationError('Missing API key');
        }

        const validatedKey = await apiKeyManager.validateKey(apiKey);
        if (!validatedKey) {
          throw new AuthenticationError('Invalid API key');
        }

        request.apiKeyId = validatedKey.id;
        request.userId = validatedKey.userId;

        // Check rate limit
        if (options.rateLimit) {
          const identifier = getRateLimitIdentifier(validatedKey.id, request.ip);
          const { allowed, headers } = validateRateLimit(
            identifier,
            options.rateLimit
          );

          if (!allowed) {
            throw new RateLimitError();
          }

          // Track usage
          apiKeyManager.trackUsage({
            keyId: validatedKey.id,
            endpoint: req.nextUrl.pathname,
            method: req.method,
            statusCode: 200, // Will be updated after handler
            responseTime: 0,
            ip: request.ip,
            userAgent: req.headers.get('user-agent') || undefined,
          });

          // Add rate limit headers to response
          const response = await handler(request);
          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
          return response;
        }
      }

      // Call handler
      const response = await handler(request);

      // Add timing header
      if (request.startTime) {
        const duration = Date.now() - request.startTime;
        response.headers.set('X-Response-Time', `${duration}ms`);
      }

      return response;
    } catch (error) {
      return handleApiError(error, request);
    }
  };
}

/**
 * Handle API errors
 */
export function handleApiError(error: any, req?: ApiRequest): NextResponse {
  let statusCode = 500;
  let response: any;

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    response = errorResponse(error.code, error.message, error.details);
  } else if (error instanceof Error) {
    response = errorResponse('INTERNAL_ERROR', error.message);
  } else {
    response = errorResponse('UNKNOWN_ERROR', 'An unknown error occurred');
  }

  // Add timing if available
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (req?.startTime) {
    headers['X-Response-Time'] = `${Date.now() - req.startTime}ms`;
  }

  return new NextResponse(JSON.stringify(response), {
    status: statusCode,
    headers,
  });
}

/**
 * Get client IP address
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

/**
 * Create typed API handler
 */
export function createApiHandler<T = any>(
  handler: (req: ApiRequest) => Promise<T>,
  options?: ApiMiddlewareOptions
) {
  return async (req: NextRequest) => {
    return withApiAuth(
      async (request: ApiRequest) => {
        const data = await handler(request);
        const version = options?.version || '1.0.0';

        return new NextResponse(
          JSON.stringify(successResponse(data, version)),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      },
      options
    )(req);
  };
}

/**
 * CORS headers
 */
export function getCorsHeaders(origin?: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Max-Age': '3600',
  };
}

/**
 * Handle OPTIONS request
 */
export function handleOptions(): NextResponse {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(),
  });
}
