/**
 * API Utilities
 *
 * Core utilities for API handling:
 * - Response formatting
 * - Error handling
 * - Pagination
 * - Request validation
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    version: string;
    timestamp: string;
    requestId?: string;
  };
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

/**
 * Create successful response
 */
export function successResponse<T>(
  data: T,
  version: string = '1.0.0'
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      version,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Create error response
 */
export function errorResponse(
  code: string,
  message: string,
  details?: any,
  version: string = '1.0.0'
): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      version,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Create paginated response
 */
export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
  version: string = '1.0.0'
): ApiResponse<PaginatedResponse<T>> {
  const totalPages = Math.ceil(total / pageSize);
  return successResponse(
    {
      items,
      pagination: {
        total,
        page,
        pageSize,
        totalPages,
        hasMore: page < totalPages,
      },
    },
    version
  );
}

/**
 * Calculate pagination
 */
export function calculatePagination(
  total: number,
  page: number,
  pageSize: number
): { skip: number; take: number } {
  const skip = Math.max(0, (page - 1) * pageSize);
  const take = pageSize;
  return { skip, take };
}

/**
 * API Error classes
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', 400, message, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super('AUTHENTICATION_ERROR', 401, message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super('AUTHORIZATION_ERROR', 403, message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super('NOT_FOUND', 404, `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends ApiError {
  constructor(public retryAfter: number = 60) {
    super(
      'RATE_LIMIT_EXCEEDED',
      429,
      `Rate limit exceeded. Retry after ${retryAfter} seconds`,
      { retryAfter }
    );
    this.name = 'RateLimitError';
  }
}

/**
 * Validate required fields
 */
export function validateRequired(
  data: Record<string, any>,
  fields: string[]
): void {
  const missing = fields.filter(f => !data[f]);
  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
  }
}

/**
 * Validate query parameters
 */
export function validateQueryParams(
  params: Record<string, any>,
  schema: Record<string, { type: string; required?: boolean; min?: number; max?: number }>
): void {
  for (const [key, rules] of Object.entries(schema)) {
    const value = params[key];

    if (rules.required && value === undefined) {
      throw new ValidationError(`Missing required parameter: ${key}`);
    }

    if (value !== undefined) {
      if (rules.type === 'number') {
        const num = parseInt(value as string, 10);
        if (isNaN(num)) {
          throw new ValidationError(`${key} must be a number`);
        }
        if (rules.min !== undefined && num < rules.min) {
          throw new ValidationError(`${key} must be >= ${rules.min}`);
        }
        if (rules.max !== undefined && num > rules.max) {
          throw new ValidationError(`${key} must be <= ${rules.max}`);
        }
      }
    }
  }
}

/**
 * Extract pagination params
 */
export function getPaginationParams(query: any): { page: number; pageSize: number } {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize as string, 10) || 20));
  return { page, pageSize };
}

/**
 * Format error for response
 */
export function formatErrorResponse(error: any): ApiResponse {
  if (error instanceof ApiError) {
    return errorResponse(error.code, error.message, error.details);
  }

  if (error instanceof Error) {
    return errorResponse('INTERNAL_ERROR', error.message);
  }

  return errorResponse('UNKNOWN_ERROR', 'An unknown error occurred');
}

/**
 * Safe JSON stringify (handles circular references)
 */
export function safeStringify(obj: any): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  });
}
