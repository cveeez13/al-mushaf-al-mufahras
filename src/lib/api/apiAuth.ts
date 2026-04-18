/**
 * API Authentication — API Key Management
 *
 * Handles:
 * - API key generation and validation
 * - API key storage and retrieval
 * - API key lifecycle (creation, revocation, renewal)
 * - Usage tracking per key
 */

import { randomBytes } from 'crypto';

export interface ApiKey {
  id: string;
  key: string; // Hashed key
  name: string;
  description?: string;
  userId: string;
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  allowedOrigins?: string[];
  allowedEndpoints?: string[];
  metadata?: Record<string, any>;
}

export interface ApiKeyCreateRequest {
  name: string;
  description?: string;
  expiresAt?: Date;
  rateLimit?: {
    requestsPerMinute?: number;
    requestsPerDay?: number;
  };
  allowedOrigins?: string[];
  allowedEndpoints?: string[];
}

export interface ApiKeyUsage {
  keyId: string;
  timestamp: Date;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  ip?: string;
  userAgent?: string;
}

/**
 * Generate new API key
 */
export function generateApiKey(): string {
  return `${Date.now().toString(36)}.${randomBytes(32).toString('hex')}`;
}

/**
 * Hash API key (for storage)
 */
export async function hashApiKey(key: string): Promise<string> {
  // In production, use bcrypt or similar
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Verify API key
 */
export async function verifyApiKey(
  providedKey: string,
  hashedKey: string
): Promise<boolean> {
  const crypto = await import('crypto');
  const providedHash = crypto.createHash('sha256').update(providedKey).digest('hex');
  return providedHash === hashedKey;
}

/**
 * Extract API key from headers
 */
export function extractApiKey(headers: Record<string, string | string[]>): string | null {
  // Check Authorization header (Bearer format)
  const auth = headers.authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.substring(7);
  }

  // Check X-API-Key header
  const apiKey = headers['x-api-key'];
  if (typeof apiKey === 'string') {
    return apiKey;
  }

  return null;
}

/**
 * API Key Manager (mock/in-memory for now)
 * In production, use MongoDB or similar database
 */
export class ApiKeyManager {
  private keys: Map<string, ApiKey> = new Map();
  private keysByHash: Map<string, ApiKey> = new Map();
  private usage: ApiKeyUsage[] = [];

  async createKey(userId: string, request: ApiKeyCreateRequest): Promise<string> {
    const key = generateApiKey();
    const hashedKey = await hashApiKey(key);
    const now = new Date();

    const apiKey: ApiKey = {
      id: `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      key: hashedKey,
      name: request.name,
      description: request.description,
      userId,
      createdAt: now,
      expiresAt: request.expiresAt,
      isActive: true,
      rateLimit: {
        requestsPerMinute: request.rateLimit?.requestsPerMinute ?? 60,
        requestsPerDay: request.rateLimit?.requestsPerDay ?? 10000,
      },
      allowedOrigins: request.allowedOrigins,
      allowedEndpoints: request.allowedEndpoints,
    };

    this.keysByHash.set(hashedKey, apiKey);
    this.keys.set(apiKey.id, apiKey);

    return key;
  }

  async validateKey(key: string): Promise<ApiKey | null> {
    const hashedKey = await hashApiKey(key);
    const apiKey = this.keysByHash.get(hashedKey);

    if (!apiKey) return null;
    if (!apiKey.isActive) return null;
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

    return apiKey;
  }

  async revokeKey(keyId: string): Promise<boolean> {
    const key = this.keys.get(keyId);
    if (!key) return false;

    key.isActive = false;
    return true;
  }

  async getKey(keyId: string): Promise<ApiKey | null> {
    return this.keys.get(keyId) ?? null;
  }

  async listKeys(userId: string): Promise<Omit<ApiKey, 'key'>[]> {
    const userKeys = Array.from(this.keys.values()).filter(k => k.userId === userId);
    return userKeys.map(({ key: _, ...rest }) => rest);
  }

  trackUsage(usage: Omit<ApiKeyUsage, 'timestamp'>): void {
    this.usage.push({
      ...usage,
      timestamp: new Date(),
    });

    // Update last used
    const key = this.keys.get(usage.keyId);
    if (key) {
      key.lastUsedAt = new Date();
    }
  }

  getUsage(keyId: string, hours: number = 24): ApiKeyUsage[] {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.usage.filter(u => u.keyId === keyId && u.timestamp >= since);
  }

  getUsageStats(keyId: string, hours: number = 24) {
    const usage = this.getUsage(keyId, hours);
    return {
      totalRequests: usage.length,
      requestsPerMinute: usage.filter(u => u.timestamp > new Date(Date.now() - 60000)).length,
      averageResponseTime: usage.length > 0
        ? usage.reduce((sum, u) => sum + u.responseTime, 0) / usage.length
        : 0,
      errorRate: usage.length > 0
        ? (usage.filter(u => u.statusCode >= 400).length / usage.length) * 100
        : 0,
    };
  }
}

// Global instance (use DI in production)
export const apiKeyManager = new ApiKeyManager();
