import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  API_VERSION,
  API_ENDPOINTS,
  handleApiRequest,
  createApiKey,
  getApiKeys,
  revokeApiKey,
  deleteApiKey,
  validateApiKey,
  checkRateLimit,
  consumeRateLimit,
  getUsageLog,
  getUsageStats,
  clearUsageLog,
  generateOpenApiSpec,
  type ApiKey,
  type ApiResponse,
} from '@/lib/topicsApi';

// ──── Helpers ────

function clearAllStorage() {
  localStorage.removeItem('quran-api-keys');
  localStorage.removeItem('quran-api-usage');
  localStorage.removeItem('quran-api-rate');
}

describe('Public Topics API', () => {
  beforeEach(() => {
    clearAllStorage();
  });

  // ═══════════════════════════════════════════════════
  // API Version
  // ═══════════════════════════════════════════════════

  it('should have a version string', () => {
    expect(API_VERSION).toBe('v1');
  });

  // ═══════════════════════════════════════════════════
  // API Key Management
  // ═══════════════════════════════════════════════════

  describe('API Key Management', () => {
    it('should create an API key with correct format', () => {
      const key = createApiKey('My App');
      expect(key.key).toMatch(/^qm_/);
      expect(key.name).toBe('My App');
      expect(key.active).toBe(true);
      expect(key.totalRequests).toBe(0);
      expect(key.rateLimit).toBe(60);
      expect(key.createdAt).toBeGreaterThan(0);
    });

    it('should persist keys to localStorage', () => {
      createApiKey('App A');
      createApiKey('App B');
      const keys = getApiKeys();
      expect(keys).toHaveLength(2);
      expect(keys[0].name).toBe('App A');
      expect(keys[1].name).toBe('App B');
    });

    it('should validate active keys', () => {
      const key = createApiKey('Valid');
      expect(validateApiKey(key.key)).toBeTruthy();
      expect(validateApiKey('qm_fake-key-1234')).toBeNull();
    });

    it('should revoke a key', () => {
      const key = createApiKey('To Revoke');
      expect(revokeApiKey(key.key)).toBe(true);
      expect(validateApiKey(key.key)).toBeNull();
      // Key still exists but inactive
      const keys = getApiKeys();
      expect(keys[0].active).toBe(false);
    });

    it('should delete a key', () => {
      const key = createApiKey('To Delete');
      expect(deleteApiKey(key.key)).toBe(true);
      expect(getApiKeys()).toHaveLength(0);
    });

    it('should return false when revoking non-existent key', () => {
      expect(revokeApiKey('qm_nonexistent')).toBe(false);
    });

    it('should return false when deleting non-existent key', () => {
      expect(deleteApiKey('qm_nonexistent')).toBe(false);
    });

    it('should use default name for empty name', () => {
      const key = createApiKey('  ');
      expect(key.name).toBe('Unnamed Key');
    });

    it('each key should be unique', () => {
      const k1 = createApiKey('A');
      const k2 = createApiKey('B');
      expect(k1.key).not.toBe(k2.key);
    });
  });

  // ═══════════════════════════════════════════════════
  // Rate Limiting
  // ═══════════════════════════════════════════════════

  describe('Rate Limiting', () => {
    it('should start with full tokens', () => {
      const key = createApiKey('Rate Test');
      const rl = checkRateLimit(key);
      expect(rl.limit).toBe(60);
      expect(rl.remaining).toBe(60);
    });

    it('should consume tokens', () => {
      const key = createApiKey('Consume Test');
      const r1 = consumeRateLimit(key);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(59);

      const r2 = consumeRateLimit(key);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(58);
    });

    it('should deny when tokens exhausted', () => {
      const key = createApiKey('Exhaust');
      // Override rate to 2 for faster test
      const keys = getApiKeys();
      keys[0].rateLimit = 2;
      localStorage.setItem('quran-api-keys', JSON.stringify(keys));

      const updatedKey = getApiKeys()[0];
      consumeRateLimit(updatedKey);
      consumeRateLimit(updatedKey);
      const r3 = consumeRateLimit(updatedKey);
      expect(r3.allowed).toBe(false);
      expect(r3.remaining).toBe(0);
    });

    it('should track total requests on key', () => {
      const key = createApiKey('Track');
      consumeRateLimit(key);
      consumeRateLimit(key);
      const keys = getApiKeys();
      expect(keys[0].totalRequests).toBe(2);
      expect(keys[0].lastUsedAt).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════
  // API Request Handler — Auth & Errors
  // ═══════════════════════════════════════════════════

  describe('API Request Handler', () => {
    it('should reject non-GET methods', async () => {
      const res = await handleApiRequest('POST', '/api/v1/topics', 'any', {});
      expect(res.status).toBe(405);
      expect(res.ok).toBe(false);
    });

    it('should reject missing API key', async () => {
      const res = await handleApiRequest('GET', '/api/v1/topics', '', {});
      expect(res.status).toBe(401);
      expect(res.error).toContain('Missing API key');
    });

    it('should reject invalid API key', async () => {
      const res = await handleApiRequest('GET', '/api/v1/topics', 'qm_fake', {});
      expect(res.status).toBe(401);
      expect(res.error).toContain('Invalid');
    });

    it('should return 429 when rate limited', async () => {
      const key = createApiKey('RL Test');
      // Set rate to 1
      const keys = getApiKeys();
      keys[0].rateLimit = 1;
      localStorage.setItem('quran-api-keys', JSON.stringify(keys));

      await handleApiRequest('GET', '/api/v1/topics', key.key, {});
      const res2 = await handleApiRequest('GET', '/api/v1/topics', key.key, {});
      expect(res2.status).toBe(429);
    });

    it('should return 404 for unknown endpoint', async () => {
      const key = createApiKey('404 Test');
      const res = await handleApiRequest('GET', '/api/v1/unknown', key.key, {});
      expect(res.status).toBe(404);
    });

    it('response should include meta with version and requestId', async () => {
      const key = createApiKey('Meta Test');
      const res = await handleApiRequest('GET', '/api/v1/topics', key.key, {});
      expect(res.meta.version).toBe('v1');
      expect(res.meta.requestId).toMatch(/^req_/);
      expect(res.meta.timestamp).toBeGreaterThan(0);
      expect(res.meta.rateLimit).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════
  // Endpoint Responses
  // ═══════════════════════════════════════════════════

  describe('Endpoints', () => {
    let apiKey: string;

    beforeEach(() => {
      clearAllStorage();
      apiKey = createApiKey('Endpoint Test').key;
    });

    it('GET / should return API info with endpoint list', async () => {
      const res = await handleApiRequest('GET', '/api/v1/', apiKey, {});
      expect(res.ok).toBe(true);
      expect(res.status).toBe(200);
      const data = res.data as { message: string; version: string; endpoints: string[] };
      expect(data.message).toContain('Topics API');
      expect(data.version).toBe('v1');
      expect(data.endpoints.length).toBeGreaterThanOrEqual(7);
    });

    it('GET /topics should return 7 topics', async () => {
      const res = await handleApiRequest('GET', '/api/v1/topics', apiKey, {});
      expect(res.ok).toBe(true);
      const data = res.data as { topics: unknown[]; count: number };
      expect(data.count).toBe(7);
      expect(data.topics).toHaveLength(7);
    });

    it('GET /topics/:id should return topic with verses', async () => {
      const res = await handleApiRequest('GET', '/api/v1/topics/1', apiKey, { limit: '5' });
      expect(res.ok).toBe(true);
      const data = res.data as { topic: { id: number }; verses: unknown[]; pagination: { total: number } };
      expect(data.topic.id).toBe(1);
      expect(data.verses).toBeDefined();
      expect(data.pagination).toBeDefined();
    });

    it('GET /topics/:id should return 404 for invalid topic', async () => {
      const res = await handleApiRequest('GET', '/api/v1/topics/99', apiKey, {});
      expect(res.status).toBe(404);
    });

    it('GET /verses should return paginated verses', async () => {
      const res = await handleApiRequest('GET', '/api/v1/verses', apiKey, { limit: '5', page: '1' });
      expect(res.ok).toBe(true);
      const data = res.data as { verses: unknown[]; pagination: { page: number; limit: number; total: number } };
      expect(data.verses.length).toBeLessThanOrEqual(5);
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(5);
    });

    it('GET /verses should filter by surah', async () => {
      const res = await handleApiRequest('GET', '/api/v1/verses', apiKey, { surah: '1', limit: '100' });
      expect(res.ok).toBe(true);
      const data = res.data as { verses: { surah: number }[] };
      for (const v of data.verses) {
        expect(v.surah).toBe(1);
      }
    });

    it('GET /verses should filter by topic', async () => {
      const res = await handleApiRequest('GET', '/api/v1/verses', apiKey, { topic: '4', limit: '10' });
      expect(res.ok).toBe(true);
      const data = res.data as { verses: { topic: { id: number } }[] };
      for (const v of data.verses) {
        expect(v.topic.id).toBe(4);
      }
    });

    it('GET /surahs should return 114 surahs', async () => {
      const res = await handleApiRequest('GET', '/api/v1/surahs', apiKey, {});
      expect(res.ok).toBe(true);
      const data = res.data as { surahs: unknown[]; count: number };
      expect(data.count).toBe(114);
      expect(data.surahs).toHaveLength(114);
    });

    it('GET /surahs/:number should return surah with verses', async () => {
      const res = await handleApiRequest('GET', '/api/v1/surahs/1', apiKey, { limit: '10' });
      expect(res.ok).toBe(true);
      const data = res.data as { surah: { number: number; name_ar: string } };
      expect(data.surah.number).toBe(1);
      expect(data.surah.name_ar).toBe('الفاتحة');
    });

    it('GET /surahs/:number should return 404 for invalid surah', async () => {
      const res = await handleApiRequest('GET', '/api/v1/surahs/999', apiKey, {});
      expect(res.status).toBe(404);
    });

    it('GET /stats should return distribution data', async () => {
      const res = await handleApiRequest('GET', '/api/v1/stats', apiKey, {});
      expect(res.ok).toBe(true);
      const data = res.data as { totalSurahs: number; totalTopics: number };
      expect(data.totalSurahs).toBe(114);
      expect(data.totalTopics).toBe(7);
    });
  });

  // ═══════════════════════════════════════════════════
  // Usage Tracking
  // ═══════════════════════════════════════════════════

  describe('Usage Tracking', () => {
    it('should log API requests', async () => {
      const key = createApiKey('Usage Test');
      await handleApiRequest('GET', '/api/v1/topics', key.key, {});
      const log = getUsageLog();
      expect(log.length).toBe(1);
      expect(log[0].endpoint).toBe('/topics');
      expect(log[0].status).toBe(200);
      expect(log[0].method).toBe('GET');
    });

    it('should track multiple requests', async () => {
      const key = createApiKey('Multi');
      await handleApiRequest('GET', '/api/v1/topics', key.key, {});
      await handleApiRequest('GET', '/api/v1/surahs', key.key, {});
      await handleApiRequest('GET', '/api/v1/stats', key.key, {});
      expect(getUsageLog()).toHaveLength(3);
    });

    it('should compute usage stats', async () => {
      const key = createApiKey('Stats');
      await handleApiRequest('GET', '/api/v1/topics', key.key, {});
      await handleApiRequest('GET', '/api/v1/topics', key.key, {});
      await handleApiRequest('GET', '/api/v1/surahs', key.key, {});

      const stats = getUsageStats();
      expect(stats.totalRequests).toBe(3);
      expect(stats.last24h).toBe(3);
      expect(stats.byEndpoint['/topics']).toBe(2);
      expect(stats.byEndpoint['/surahs']).toBe(1);
      expect(stats.byStatus[200]).toBe(3);
    });

    it('should clear usage log', async () => {
      const key = createApiKey('Clear');
      await handleApiRequest('GET', '/api/v1/topics', key.key, {});
      clearUsageLog();
      expect(getUsageLog()).toHaveLength(0);
    });

    it('should filter stats by API key', async () => {
      const k1 = createApiKey('Key1');
      const k2 = createApiKey('Key2');
      await handleApiRequest('GET', '/api/v1/topics', k1.key, {});
      await handleApiRequest('GET', '/api/v1/topics', k2.key, {});
      await handleApiRequest('GET', '/api/v1/surahs', k1.key, {});

      const k1Prefix = k1.key.slice(0, 12) + '...';
      const stats = getUsageStats(k1Prefix);
      expect(stats.totalRequests).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════
  // OpenAPI Spec
  // ═══════════════════════════════════════════════════

  describe('OpenAPI Spec', () => {
    it('should generate valid OpenAPI 3.0 spec', () => {
      const spec = generateOpenApiSpec() as Record<string, unknown>;
      expect(spec.openapi).toBe('3.0.3');
      expect((spec.info as Record<string, unknown>).version).toBe('v1');
    });

    it('should include all endpoints in paths', () => {
      const spec = generateOpenApiSpec() as { paths: Record<string, unknown> };
      const pathKeys = Object.keys(spec.paths);
      expect(pathKeys.length).toBe(API_ENDPOINTS.length);
    });

    it('should include security scheme', () => {
      const spec = generateOpenApiSpec() as { components: { securitySchemes: Record<string, unknown> } };
      expect(spec.components.securitySchemes.ApiKeyAuth).toBeDefined();
    });

    it('each endpoint should have GET method with security', () => {
      const spec = generateOpenApiSpec() as { paths: Record<string, { get: { security: unknown[] } }> };
      for (const pathDef of Object.values(spec.paths)) {
        expect(pathDef.get).toBeDefined();
        expect(pathDef.get.security).toBeDefined();
      }
    });
  });

  // ═══════════════════════════════════════════════════
  // API Endpoints Metadata
  // ═══════════════════════════════════════════════════

  describe('API Endpoints Metadata', () => {
    it('should have at least 7 documented endpoints', () => {
      expect(API_ENDPOINTS.length).toBeGreaterThanOrEqual(7);
    });

    it('every endpoint should have bilingual summaries', () => {
      for (const ep of API_ENDPOINTS) {
        expect(ep.summary_ar).toBeTruthy();
        expect(ep.summary_en).toBeTruthy();
        expect(ep.description_ar).toBeTruthy();
        expect(ep.description_en).toBeTruthy();
        expect(ep.method).toBe('GET');
        expect(ep.path).toMatch(/^\//);
        expect(ep.tags.length).toBeGreaterThanOrEqual(1);
        expect(ep.responseExample).toBeDefined();
      }
    });

    it('path params should have examples', () => {
      for (const ep of API_ENDPOINTS) {
        const pathParams = ep.params?.filter(p => p.in === 'path') || [];
        for (const p of pathParams) {
          expect(p.example).toBeTruthy();
        }
      }
    });
  });

  // ═══════════════════════════════════════════════════
  // Pagination
  // ═══════════════════════════════════════════════════

  describe('Pagination', () => {
    let apiKey: string;

    beforeEach(() => {
      clearAllStorage();
      apiKey = createApiKey('Pagination Test').key;
    });

    it('should respect page and limit params', async () => {
      const res = await handleApiRequest('GET', '/api/v1/verses', apiKey, { page: '2', limit: '3' });
      const data = res.data as { pagination: { page: number; limit: number } };
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(3);
    });

    it('should cap limit at 100 for verses', async () => {
      const res = await handleApiRequest('GET', '/api/v1/verses', apiKey, { limit: '500' });
      const data = res.data as { pagination: { limit: number } };
      expect(data.pagination.limit).toBe(100);
    });

    it('should default page to 1', async () => {
      const res = await handleApiRequest('GET', '/api/v1/verses', apiKey, {});
      const data = res.data as { pagination: { page: number } };
      expect(data.pagination.page).toBe(1);
    });

    it('should include total and pages in pagination', async () => {
      const res = await handleApiRequest('GET', '/api/v1/verses', apiKey, { limit: '10' });
      const data = res.data as { pagination: { total: number; pages: number; limit: number } };
      expect(data.pagination.total).toBeGreaterThanOrEqual(0);
      expect(data.pagination.pages).toBeGreaterThanOrEqual(0);
      expect(data.pagination.pages).toBe(Math.ceil(data.pagination.total / 10) || 0);
      expect(data.pagination.limit).toBe(10);
    });
  });
});
