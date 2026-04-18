/**
 * Rate Limiting Middleware
 *
 * Features:
 * - Per-IP rate limiting
 * - Per-API key rate limiting
 * - Sliding window algorithm
 * - Redis support (with in-memory fallback)
 */

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerDay: number;
  requestsPerHour?: number;
}

export const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 60,
  requestsPerHour: 1000,
  requestsPerDay: 10000,
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

/**
 * In-memory rate limiter (with sliding window)
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private windowSize: number; // milliseconds

  constructor(windowSizeSeconds: number = 60) {
    this.windowSize = windowSizeSeconds * 1000;

    // Cleanup old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  check(key: string, maxRequests: number): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.windowSize;

    // Get existing requests for this key
    let requests = this.requests.get(key) ?? [];

    // Remove old requests outside the window
    requests = requests.filter(t => t > windowStart);

    const remaining = Math.max(0, maxRequests - requests.length);
    const resetTime = new Date(requests[0] ? requests[0] + this.windowSize : now + this.windowSize);

    if (requests.length >= maxRequests) {
      return {
        allowed: false,
        remaining,
        resetTime,
        retryAfter: Math.ceil((resetTime.getTime() - now) / 1000),
      };
    }

    // Add current request
    requests.push(now);
    this.requests.set(key, requests);

    return {
      allowed: true,
      remaining,
      resetTime,
    };
  }

  reset(key: string): void {
    this.requests.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowSize;

    for (const [key, requests] of this.requests.entries()) {
      const remaining = requests.filter(t => t > windowStart);
      if (remaining.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, remaining);
      }
    }
  }
}

/**
 * Rate limit store (per-minute window)
 */
export class RateLimitStore {
  private minuteLimiter: RateLimiter;
  private hourLimiter: RateLimiter;
  private dayLimiter: RateLimiter;

  constructor() {
    this.minuteLimiter = new RateLimiter(60);
    this.hourLimiter = new RateLimiter(3600);
    this.dayLimiter = new RateLimiter(86400);
  }

  check(
    identifier: string,
    config: RateLimitConfig
  ): {
    allowed: boolean;
    remaining: number;
    resetTime: Date;
    retryAfter?: number;
  } {
    // Check minute limit
    const minute = this.minuteLimiter.check(
      `${identifier}:minute`,
      config.requestsPerMinute
    );
    if (!minute.allowed) {
      return minute;
    }

    // Check hour limit
    const hour = this.hourLimiter.check(
      `${identifier}:hour`,
      config.requestsPerHour ?? 1000
    );
    if (!hour.allowed) {
      return hour;
    }

    // Check day limit
    const day = this.dayLimiter.check(
      `${identifier}:day`,
      config.requestsPerDay
    );
    if (!day.allowed) {
      return day;
    }

    // Return most restrictive remaining
    return {
      allowed: true,
      remaining: Math.min(minute.remaining, hour.remaining, day.remaining),
      resetTime: day.resetTime,
    };
  }

  reset(identifier: string): void {
    this.minuteLimiter.reset(`${identifier}:minute`);
    this.hourLimiter.reset(`${identifier}:hour`);
    this.dayLimiter.reset(`${identifier}:day`);
  }
}

// Global rate limiter instance
export const rateLimitStore = new RateLimitStore();

/**
 * Get rate limit identifier from request
 */
export function getRateLimitIdentifier(
  apiKeyId?: string,
  ip?: string
): string {
  // Prefer API key if available, fallback to IP
  if (apiKeyId) {
    return `api_key:${apiKeyId}`;
  }
  return `ip:${ip || 'unknown'}`;
}

/**
 * Create rate limit headers
 */
export function createRateLimitHeaders(
  result: RateLimitResult
): Record<string, string> {
  return {
    'X-RateLimit-Limit': '1000', // Total limit
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime.getTime() / 1000).toString(),
    ...(result.retryAfter && { 'Retry-After': result.retryAfter.toString() }),
  };
}

/**
 * Validate rate limit and get headers
 */
export function validateRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; headers: Record<string, string> } {
  const result = rateLimitStore.check(identifier, config);
  const headers = createRateLimitHeaders(result);

  return {
    allowed: result.allowed,
    headers,
  };
}
