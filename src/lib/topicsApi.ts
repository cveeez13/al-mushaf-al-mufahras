/**
 * Public Topics API — RESTful API engine for Quran topic classification data
 * 
 * Implements: REST endpoints, API key auth, rate limiting, versioning, OpenAPI spec
 * Runs client-side (static export) but structured identically to a real backend API
 */

import { TOPICS, SURAH_NAMES, type Topic, type Verse } from '@/lib/types';

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════

export interface ApiKey {
  key: string;
  name: string;
  createdAt: number;
  lastUsedAt: number | null;
  totalRequests: number;
  rateLimit: number;      // requests per window
  rateLimitWindow: number; // window in ms
  active: boolean;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: number;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  meta: {
    version: string;
    timestamp: number;
    rateLimit: RateLimitInfo;
    requestId: string;
  };
}

export interface ApiUsageEntry {
  timestamp: number;
  endpoint: string;
  method: string;
  apiKey: string;
  status: number;
  responseTime: number;
}

export interface ApiEndpoint {
  method: 'GET';
  path: string;
  summary_ar: string;
  summary_en: string;
  description_ar: string;
  description_en: string;
  params?: EndpointParam[];
  responseExample: unknown;
  tags: string[];
}

export interface EndpointParam {
  name: string;
  in: 'path' | 'query';
  required: boolean;
  type: string;
  description_en: string;
  description_ar: string;
  example?: string;
}

// ═══════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════

export const API_VERSION = 'v1';
const STORAGE_KEYS_KEY = 'quran-api-keys';
const STORAGE_USAGE_KEY = 'quran-api-usage';
const STORAGE_RATE_KEY = 'quran-api-rate';

const DEFAULT_RATE_LIMIT = 60;          // 60 requests
const DEFAULT_RATE_WINDOW = 60 * 1000;  // per minute
const MAX_USAGE_ENTRIES = 500;

// ═══════════════════════════════════════════════════
// API Key Management
// ═══════════════════════════════════════════════════

function generateKeyString(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const segments = [8, 4, 4, 12];
  return 'qm_' + segments.map(len => {
    let s = '';
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    for (let i = 0; i < len; i++) s += chars[arr[i] % chars.length];
    return s;
  }).join('-');
}

export function getApiKeys(): ApiKey[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS_KEY) || '[]');
  } catch { return []; }
}

function saveApiKeys(keys: ApiKey[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS_KEY, JSON.stringify(keys));
}

export function createApiKey(name: string): ApiKey {
  const keys = getApiKeys();
  const newKey: ApiKey = {
    key: generateKeyString(),
    name: name.trim() || 'Unnamed Key',
    createdAt: Date.now(),
    lastUsedAt: null,
    totalRequests: 0,
    rateLimit: DEFAULT_RATE_LIMIT,
    rateLimitWindow: DEFAULT_RATE_WINDOW,
    active: true,
  };
  keys.push(newKey);
  saveApiKeys(keys);
  return newKey;
}

export function revokeApiKey(key: string): boolean {
  const keys = getApiKeys();
  const found = keys.find(k => k.key === key);
  if (!found) return false;
  found.active = false;
  saveApiKeys(keys);
  return true;
}

export function deleteApiKey(key: string): boolean {
  const keys = getApiKeys();
  const filtered = keys.filter(k => k.key !== key);
  if (filtered.length === keys.length) return false;
  saveApiKeys(filtered);
  return true;
}

export function validateApiKey(key: string): ApiKey | null {
  const keys = getApiKeys();
  const found = keys.find(k => k.key === key && k.active);
  return found ?? null;
}

// ═══════════════════════════════════════════════════
// Rate Limiting (Token Bucket)
// ═══════════════════════════════════════════════════

interface RateBucket {
  tokens: number;
  lastRefill: number;
}

function getRateBuckets(): Record<string, RateBucket> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_RATE_KEY) || '{}');
  } catch { return {}; }
}

function saveRateBuckets(buckets: Record<string, RateBucket>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_RATE_KEY, JSON.stringify(buckets));
}

export function checkRateLimit(apiKey: ApiKey): RateLimitInfo {
  const buckets = getRateBuckets();
  const now = Date.now();

  let bucket = buckets[apiKey.key];
  if (!bucket) {
    bucket = { tokens: apiKey.rateLimit, lastRefill: now };
  }

  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill;
  if (elapsed >= apiKey.rateLimitWindow) {
    bucket.tokens = apiKey.rateLimit;
    bucket.lastRefill = now;
  }

  const remaining = Math.max(0, bucket.tokens);
  const resetAt = bucket.lastRefill + apiKey.rateLimitWindow;

  return { limit: apiKey.rateLimit, remaining, resetAt };
}

export function consumeRateLimit(apiKey: ApiKey): RateLimitInfo & { allowed: boolean } {
  const buckets = getRateBuckets();
  const now = Date.now();

  let bucket = buckets[apiKey.key];
  if (!bucket) {
    bucket = { tokens: apiKey.rateLimit, lastRefill: now };
  }

  // Refill if window expired
  const elapsed = now - bucket.lastRefill;
  if (elapsed >= apiKey.rateLimitWindow) {
    bucket.tokens = apiKey.rateLimit;
    bucket.lastRefill = now;
  }

  const allowed = bucket.tokens > 0;
  if (allowed) {
    bucket.tokens--;
  }

  buckets[apiKey.key] = bucket;
  saveRateBuckets(buckets);

  // Update key usage stats
  if (allowed) {
    const keys = getApiKeys();
    const k = keys.find(x => x.key === apiKey.key);
    if (k) {
      k.lastUsedAt = now;
      k.totalRequests++;
      saveApiKeys(keys);
    }
  }

  return {
    limit: apiKey.rateLimit,
    remaining: Math.max(0, bucket.tokens),
    resetAt: bucket.lastRefill + apiKey.rateLimitWindow,
    allowed,
  };
}

// ═══════════════════════════════════════════════════
// Usage Tracking
// ═══════════════════════════════════════════════════

export function getUsageLog(): ApiUsageEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_USAGE_KEY) || '[]');
  } catch { return []; }
}

function logUsage(entry: ApiUsageEntry): void {
  if (typeof window === 'undefined') return;
  const log = getUsageLog();
  log.push(entry);
  // Keep only last N entries
  const trimmed = log.slice(-MAX_USAGE_ENTRIES);
  localStorage.setItem(STORAGE_USAGE_KEY, JSON.stringify(trimmed));
}

export function clearUsageLog(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_USAGE_KEY, '[]');
}

export function getUsageStats(apiKeyFilter?: string): {
  totalRequests: number;
  last24h: number;
  last7d: number;
  byEndpoint: Record<string, number>;
  byStatus: Record<number, number>;
  avgResponseTime: number;
} {
  const log = getUsageLog();
  const now = Date.now();
  const h24 = now - 24 * 60 * 60 * 1000;
  const d7 = now - 7 * 24 * 60 * 60 * 1000;

  const filtered = apiKeyFilter ? log.filter(e => e.apiKey === apiKeyFilter) : log;

  const byEndpoint: Record<string, number> = {};
  const byStatus: Record<number, number> = {};
  let totalTime = 0;
  let last24h = 0;
  let last7d = 0;

  for (const e of filtered) {
    byEndpoint[e.endpoint] = (byEndpoint[e.endpoint] || 0) + 1;
    byStatus[e.status] = (byStatus[e.status] || 0) + 1;
    totalTime += e.responseTime;
    if (e.timestamp >= h24) last24h++;
    if (e.timestamp >= d7) last7d++;
  }

  return {
    totalRequests: filtered.length,
    last24h,
    last7d,
    byEndpoint,
    byStatus,
    avgResponseTime: filtered.length ? Math.round(totalTime / filtered.length) : 0,
  };
}

// ═══════════════════════════════════════════════════
// Verse data cache (loaded on demand)
// ═══════════════════════════════════════════════════

let versesCache: Verse[] | null = null;

async function loadVerses(): Promise<Verse[]> {
  if (versesCache) return versesCache;
  try {
    const { getTopicsMaster } = await import('@/lib/data');
    const data = await getTopicsMaster();
    versesCache = data?.verses || [];
  } catch {
    versesCache = [];
  }
  return versesCache;
}

// ═══════════════════════════════════════════════════
// API Request Handler
// ═══════════════════════════════════════════════════

function generateRequestId(): string {
  return 'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function makeResponse<T>(status: number, data: T | undefined, error: string | undefined, rateLimit: RateLimitInfo, requestId: string): ApiResponse<T> {
  return {
    ok: status >= 200 && status < 300,
    status,
    ...(data !== undefined ? { data } : {}),
    ...(error !== undefined ? { error } : {}),
    meta: {
      version: API_VERSION,
      timestamp: Date.now(),
      rateLimit,
      requestId,
    },
  };
}

export async function handleApiRequest(
  method: string,
  path: string,
  apiKeyString: string,
  queryParams?: Record<string, string>,
): Promise<ApiResponse> {
  const startTime = performance.now();
  const requestId = generateRequestId();
  const defaultRateLimit: RateLimitInfo = { limit: 0, remaining: 0, resetAt: 0 };

  // 1. Validate method
  if (method !== 'GET') {
    return makeResponse(405, undefined, 'Method not allowed. Only GET is supported.', defaultRateLimit, requestId);
  }

  // 2. Validate API key
  if (!apiKeyString) {
    return makeResponse(401, undefined, 'Missing API key. Include X-API-Key header.', defaultRateLimit, requestId);
  }

  const apiKey = validateApiKey(apiKeyString);
  if (!apiKey) {
    return makeResponse(401, undefined, 'Invalid or revoked API key.', defaultRateLimit, requestId);
  }

  // 3. Check rate limit
  const rl = consumeRateLimit(apiKey);
  if (!rl.allowed) {
    const resp = makeResponse(429, undefined, 'Rate limit exceeded. Try again later.', rl, requestId);
    logUsage({ timestamp: Date.now(), endpoint: path, method, apiKey: apiKeyString.slice(0, 12) + '...', status: 429, responseTime: Math.round(performance.now() - startTime) });
    return resp;
  }

  // 4. Route request
  const normalizedPath = path.replace(/^\/api\/v1/, '').replace(/\/$/, '') || '/';
  let response: ApiResponse;

  try {
    if (normalizedPath === '/' || normalizedPath === '') {
      response = makeResponse(200, {
        message: 'Al-Mushaf Al-Mufahras Public Topics API',
        version: API_VERSION,
        endpoints: API_ENDPOINTS.map(e => `${e.method} /api/${API_VERSION}${e.path}`),
      }, undefined, rl, requestId);
    } else if (normalizedPath === '/topics') {
      response = await handleGetTopics(rl, requestId);
    } else if (/^\/topics\/\d+$/.test(normalizedPath)) {
      const topicId = parseInt(normalizedPath.split('/')[2], 10);
      response = await handleGetTopicById(topicId, rl, requestId, queryParams);
    } else if (normalizedPath === '/verses') {
      response = await handleGetVerses(rl, requestId, queryParams);
    } else if (/^\/verses\/\d+:\d+$/.test(normalizedPath)) {
      const vk = normalizedPath.split('/')[2];
      response = await handleGetVerseByKey(vk, rl, requestId);
    } else if (normalizedPath === '/surahs') {
      response = handleGetSurahs(rl, requestId);
    } else if (/^\/surahs\/\d+$/.test(normalizedPath)) {
      const surahNum = parseInt(normalizedPath.split('/')[2], 10);
      response = await handleGetSurahById(surahNum, rl, requestId, queryParams);
    } else if (normalizedPath === '/stats') {
      response = await handleGetStats(rl, requestId);
    } else {
      response = makeResponse(404, undefined, `Endpoint not found: ${normalizedPath}`, rl, requestId);
    }
  } catch {
    response = makeResponse(500, undefined, 'Internal server error', rl, requestId);
  }

  // 5. Log usage
  const responseTime = Math.round(performance.now() - startTime);
  logUsage({
    timestamp: Date.now(),
    endpoint: normalizedPath,
    method,
    apiKey: apiKeyString.slice(0, 12) + '...',
    status: response.status,
    responseTime,
  });

  return response;
}

// ═══════════════════════════════════════════════════
// Endpoint Handlers
// ═══════════════════════════════════════════════════

async function handleGetTopics(rl: RateLimitInfo, reqId: string): Promise<ApiResponse> {
  const topics = Object.values(TOPICS).map(t => ({
    id: t.id,
    color: t.color,
    hex: t.hex,
    name_ar: t.name_ar,
    name_en: t.name_en,
  }));
  return makeResponse(200, { topics, count: topics.length }, undefined, rl, reqId);
}

async function handleGetTopicById(
  topicId: number,
  rl: RateLimitInfo,
  reqId: string,
  query?: Record<string, string>,
): Promise<ApiResponse> {
  const topic = TOPICS[topicId];
  if (!topic) {
    return makeResponse(404, undefined, `Topic ${topicId} not found. Valid IDs: 1-7.`, rl, reqId);
  }

  const verses = await loadVerses();
  let topicVerses = verses.filter(v => v.topic?.id === topicId);

  // Pagination
  const page = Math.max(1, parseInt(query?.page || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query?.limit || '20', 10) || 20));
  const offset = (page - 1) * limit;
  const total = topicVerses.length;
  topicVerses = topicVerses.slice(offset, offset + limit);

  return makeResponse(200, {
    topic: { id: topic.id, color: topic.color, hex: topic.hex, name_ar: topic.name_ar, name_en: topic.name_en },
    verses: topicVerses.map(serializeVerse),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  }, undefined, rl, reqId);
}

async function handleGetVerses(
  rl: RateLimitInfo,
  reqId: string,
  query?: Record<string, string>,
): Promise<ApiResponse> {
  let verses = await loadVerses();

  // Filter by surah
  if (query?.surah) {
    const s = parseInt(query.surah, 10);
    if (s >= 1 && s <= 114) verses = verses.filter(v => v.surah === s);
  }

  // Filter by topic
  if (query?.topic) {
    const t = parseInt(query.topic, 10);
    if (t >= 1 && t <= 7) verses = verses.filter(v => v.topic?.id === t);
  }

  // Search by text
  if (query?.q) {
    const q = query.q.toLowerCase();
    verses = verses.filter(v => v.text.toLowerCase().includes(q) || v.verse_key.includes(q));
  }

  // Pagination
  const page = Math.max(1, parseInt(query?.page || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query?.limit || '20', 10) || 20));
  const offset = (page - 1) * limit;
  const total = verses.length;
  const paginated = verses.slice(offset, offset + limit);

  return makeResponse(200, {
    verses: paginated.map(serializeVerse),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  }, undefined, rl, reqId);
}

async function handleGetVerseByKey(
  verseKey: string,
  rl: RateLimitInfo,
  reqId: string,
): Promise<ApiResponse> {
  const verses = await loadVerses();
  const verse = verses.find(v => v.verse_key === verseKey);
  if (!verse) {
    return makeResponse(404, undefined, `Verse ${verseKey} not found.`, rl, reqId);
  }
  return makeResponse(200, { verse: serializeVerse(verse) }, undefined, rl, reqId);
}

function handleGetSurahs(rl: RateLimitInfo, reqId: string): ApiResponse {
  const surahs = Object.entries(SURAH_NAMES).map(([num, name]) => ({
    number: parseInt(num, 10),
    name_ar: name,
  }));
  return makeResponse(200, { surahs, count: surahs.length }, undefined, rl, reqId);
}

async function handleGetSurahById(
  surahNum: number,
  rl: RateLimitInfo,
  reqId: string,
  query?: Record<string, string>,
): Promise<ApiResponse> {
  if (surahNum < 1 || surahNum > 114 || !SURAH_NAMES[surahNum]) {
    return makeResponse(404, undefined, `Surah ${surahNum} not found. Valid: 1-114.`, rl, reqId);
  }

  const verses = await loadVerses();
  let surahVerses = verses.filter(v => v.surah === surahNum);

  // Pagination
  const page = Math.max(1, parseInt(query?.page || '1', 10) || 1);
  const limit = Math.min(300, Math.max(1, parseInt(query?.limit || '50', 10) || 50));
  const offset = (page - 1) * limit;
  const total = surahVerses.length;
  surahVerses = surahVerses.slice(offset, offset + limit);

  // Topic breakdown
  const topicDist: Record<number, number> = {};
  for (const v of verses.filter(v2 => v2.surah === surahNum)) {
    const tid = v.topic?.id ?? 0;
    topicDist[tid] = (topicDist[tid] || 0) + 1;
  }

  return makeResponse(200, {
    surah: { number: surahNum, name_ar: SURAH_NAMES[surahNum] },
    topicDistribution: topicDist,
    verses: surahVerses.map(serializeVerse),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  }, undefined, rl, reqId);
}

async function handleGetStats(rl: RateLimitInfo, reqId: string): Promise<ApiResponse> {
  const verses = await loadVerses();
  const topicCounts: Record<number, number> = {};
  for (const v of verses) {
    const tid = v.topic?.id ?? 0;
    topicCounts[tid] = (topicCounts[tid] || 0) + 1;
  }

  return makeResponse(200, {
    totalVerses: verses.length,
    totalSurahs: 114,
    totalTopics: 7,
    topicDistribution: Object.entries(topicCounts).map(([tid, count]) => ({
      topicId: parseInt(tid, 10),
      topicName: TOPICS[parseInt(tid, 10)]?.name_en || 'Unknown',
      count,
      percentage: verses.length ? +(count / verses.length * 100).toFixed(1) : 0,
    })),
  }, undefined, rl, reqId);
}

function serializeVerse(v: Verse): Record<string, unknown> {
  return {
    verse_key: v.verse_key,
    surah: v.surah,
    ayah: v.ayah,
    page: v.page,
    text: v.text,
    topic: v.topic ? {
      id: v.topic.id,
      color: v.topic.color,
      hex: v.topic.hex,
      name_ar: v.topic.name_ar,
      name_en: v.topic.name_en,
    } : null,
    confidence: v.confidence,
  };
}

// ═══════════════════════════════════════════════════
// OpenAPI Specification
// ═══════════════════════════════════════════════════

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: 'GET',
    path: '/topics',
    summary_ar: 'جلب كل المواضيع',
    summary_en: 'List all topics',
    description_ar: 'يرجع قائمة بالمواضيع السبعة مع ألوانها وأسمائها',
    description_en: 'Returns all 7 topic categories with colors and names.',
    tags: ['Topics'],
    responseExample: {
      topics: [{ id: 1, color: 'blue', hex: '#3498DB', name_ar: 'دلائل قدرة الله وعظمته', name_en: "Signs of Allah's Power & Greatness" }],
      count: 7,
    },
  },
  {
    method: 'GET',
    path: '/topics/:id',
    summary_ar: 'جلب موضوع محدد مع آياته',
    summary_en: 'Get topic by ID with its verses',
    description_ar: 'يرجع تفاصيل موضوع معين وآياته مع pagination',
    description_en: 'Returns a specific topic and its verses with pagination.',
    params: [
      { name: 'id', in: 'path', required: true, type: 'integer', description_en: 'Topic ID (1-7)', description_ar: 'رقم الموضوع (1-7)', example: '4' },
      { name: 'page', in: 'query', required: false, type: 'integer', description_en: 'Page number (default: 1)', description_ar: 'رقم الصفحة (افتراضي: 1)' },
      { name: 'limit', in: 'query', required: false, type: 'integer', description_en: 'Items per page (1-100, default: 20)', description_ar: 'عدد النتائج بالصفحة (1-100، افتراضي: 20)' },
    ],
    tags: ['Topics'],
    responseExample: {
      topic: { id: 4, color: 'yellow', hex: '#F1C40F', name_ar: 'قصص الأنبياء', name_en: 'Stories of Prophets' },
      verses: [{ verse_key: '2:30', surah: 2, ayah: 30, text: '...' }],
      pagination: { page: 1, limit: 20, total: 200, pages: 10 },
    },
  },
  {
    method: 'GET',
    path: '/verses',
    summary_ar: 'بحث وتصفية الآيات',
    summary_en: 'Search and filter verses',
    description_ar: 'بحث في الآيات مع تصفية بالسورة والموضوع والنص',
    description_en: 'Search verses with filters by surah, topic, and text.',
    params: [
      { name: 'surah', in: 'query', required: false, type: 'integer', description_en: 'Filter by surah number (1-114)', description_ar: 'تصفية بالسورة (1-114)' },
      { name: 'topic', in: 'query', required: false, type: 'integer', description_en: 'Filter by topic ID (1-7)', description_ar: 'تصفية بالموضوع (1-7)' },
      { name: 'q', in: 'query', required: false, type: 'string', description_en: 'Text search query', description_ar: 'نص البحث' },
      { name: 'page', in: 'query', required: false, type: 'integer', description_en: 'Page number', description_ar: 'رقم الصفحة' },
      { name: 'limit', in: 'query', required: false, type: 'integer', description_en: 'Items per page (1-100)', description_ar: 'عدد نتائج الصفحة (1-100)' },
    ],
    tags: ['Verses'],
    responseExample: {
      verses: [{ verse_key: '1:1', surah: 1, ayah: 1, text: '...', topic: { id: 1 } }],
      pagination: { page: 1, limit: 20, total: 6236, pages: 312 },
    },
  },
  {
    method: 'GET',
    path: '/verses/:key',
    summary_ar: 'جلب آية محددة',
    summary_en: 'Get verse by key',
    description_ar: 'يرجع آية محددة بمفتاحها (مثل 2:255)',
    description_en: 'Returns a specific verse by its key (e.g. 2:255).',
    params: [
      { name: 'key', in: 'path', required: true, type: 'string', description_en: 'Verse key (surah:ayah)', description_ar: 'مفتاح الآية (سورة:آية)', example: '2:255' },
    ],
    tags: ['Verses'],
    responseExample: {
      verse: { verse_key: '2:255', surah: 2, ayah: 255, text: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ...', topic: { id: 1, name_en: "Signs of Allah's Power" } },
    },
  },
  {
    method: 'GET',
    path: '/surahs',
    summary_ar: 'جلب كل السور',
    summary_en: 'List all surahs',
    description_ar: 'يرجع قائمة بكل السور الـ 114',
    description_en: 'Returns all 114 surahs with Arabic names.',
    tags: ['Surahs'],
    responseExample: {
      surahs: [{ number: 1, name_ar: 'الفاتحة' }],
      count: 114,
    },
  },
  {
    method: 'GET',
    path: '/surahs/:number',
    summary_ar: 'جلب سورة محددة مع آياتها',
    summary_en: 'Get surah by number with verses',
    description_ar: 'يرجع آيات سورة محددة مع توزيع المواضيع',
    description_en: 'Returns verses of a surah with topic distribution.',
    params: [
      { name: 'number', in: 'path', required: true, type: 'integer', description_en: 'Surah number (1-114)', description_ar: 'رقم السورة (1-114)', example: '36' },
      { name: 'page', in: 'query', required: false, type: 'integer', description_en: 'Page number', description_ar: 'رقم الصفحة' },
      { name: 'limit', in: 'query', required: false, type: 'integer', description_en: 'Items per page (1-300)', description_ar: 'عدد النتائج (1-300)' },
    ],
    tags: ['Surahs'],
    responseExample: {
      surah: { number: 36, name_ar: 'يس' },
      topicDistribution: { '4': 30, '6': 20 },
      verses: [{ verse_key: '36:1', text: 'يس' }],
      pagination: { page: 1, limit: 50, total: 83, pages: 2 },
    },
  },
  {
    method: 'GET',
    path: '/stats',
    summary_ar: 'إحصائيات عامة',
    summary_en: 'General statistics',
    description_ar: 'يرجع إحصائيات عامة عن توزيع المواضيع في القرآن',
    description_en: 'Returns general statistics about topic distribution across the Quran.',
    tags: ['Stats'],
    responseExample: {
      totalVerses: 6236,
      totalSurahs: 114,
      totalTopics: 7,
      topicDistribution: [{ topicId: 1, topicName: "Signs of Allah's Power", count: 1200, percentage: 19.2 }],
    },
  },
];

export function generateOpenApiSpec(): object {
  const paths: Record<string, unknown> = {};

  for (const ep of API_ENDPOINTS) {
    const pathKey = `/api/${API_VERSION}${ep.path.replace(/:(\w+)/g, '{$1}')}`;
    const parameters = (ep.params || []).map(p => ({
      name: p.name,
      in: p.in,
      required: p.required,
      schema: { type: p.type === 'integer' ? 'integer' : 'string' },
      description: p.description_en,
      ...(p.example ? { example: p.example } : {}),
    }));

    paths[pathKey] = {
      get: {
        summary: ep.summary_en,
        description: ep.description_en,
        tags: ep.tags,
        parameters,
        security: [{ ApiKeyAuth: [] }],
        responses: {
          '200': {
            description: 'Success',
            content: { 'application/json': { example: { ok: true, status: 200, data: ep.responseExample, meta: { version: API_VERSION } } } },
          },
          '401': { description: 'Unauthorized — missing or invalid API key' },
          '429': { description: 'Rate limit exceeded' },
        },
      },
    };
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'Al-Mushaf Al-Mufahras — Public Topics API',
      description: 'Open REST API for Quran topic classification data. 7 topics, 6236 verses, 114 surahs.',
      version: API_VERSION,
      contact: { name: 'Al-Mushaf Al-Mufahras' },
      license: { name: 'MIT' },
    },
    servers: [{ url: '/api/v1', description: 'Current version' }],
    paths,
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
      },
    },
  };
}
