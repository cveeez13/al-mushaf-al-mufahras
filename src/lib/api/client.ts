/**
 * JavaScript/TypeScript SDK for Al-Mushaf API
 *
 * Installation:
 *   npm install @al-mushaf/api-client
 *
 * Usage:
 *   import { QuranApiClient } from '@al-mushaf/api-client';
 *   const client = new QuranApiClient(apiKey);
 *   const topics = await client.topics.list();
 */

export interface ClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface RequestOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  [key: string]: any;
}

/**
 * Main API Client
 */
export class QuranApiClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  topics: TopicsClient;
  places: PlacesClient;
  verses: VersesClient;
  search: SearchClient;
  auth: AuthClient;

  constructor(config: ClientConfig | string) {
    // Allow passing just API key as string
    if (typeof config === 'string') {
      this.apiKey = config;
      this.baseUrl = 'https://api.al-mushaf.com/v1';
      this.timeout = 10000;
    } else {
      this.apiKey = config.apiKey;
      this.baseUrl = config.baseUrl || 'https://api.al-mushaf.com/v1';
      this.timeout = config.timeout || 10000;
    }

    // Initialize sub-clients
    this.topics = new TopicsClient(this);
    this.places = new PlacesClient(this);
    this.verses = new VersesClient(this);
    this.search = new SearchClient(this);
    this.auth = new AuthClient(this);
  }

  /**
   * Make API request
   */
  async request<T>(
    method: string,
    path: string,
    options?: RequestOptions
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);

    // Add query parameters
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method,
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new ApiError(
          error.error?.message || 'API Error',
          response.status,
          error.error?.code
        );
      }

      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        error.message || 'Request failed',
        500,
        'NETWORK_ERROR'
      );
    }
  }
}

/**
 * Topics Client
 */
export class TopicsClient {
  constructor(private client: QuranApiClient) {}

  async list(page: number = 1, pageSize: number = 20, search?: string) {
    return this.client.request('/topics', { page, pageSize, search });
  }

  async get(id: string) {
    return this.client.request(`/topics/${id}`);
  }

  async getVerses(id: string, page: number = 1, pageSize: number = 50) {
    return this.client.request(`/topics/${id}/verses`, { page, pageSize });
  }
}

/**
 * Places Client
 */
export class PlacesClient {
  constructor(private client: QuranApiClient) {}

  async list(page: number = 1, pageSize: number = 20, region?: string) {
    return this.client.request('/places', { page, pageSize, region });
  }

  async get(id: string) {
    return this.client.request(`/places/${id}`);
  }

  async getVerses(id: string, page: number = 1) {
    return this.client.request(`/places/${id}/verses`, { page });
  }
}

/**
 * Verses Client
 */
export class VersesClient {
  constructor(private client: QuranApiClient) {}

  async get(surah: number, ayah: number) {
    return this.client.request(`/verses/${surah}/${ayah}`);
  }

  async getSurah(surah: number, page: number = 1) {
    return this.client.request(`/verses/${surah}`, { page });
  }

  async search(query: string, page: number = 1) {
    return this.client.request(`/verses/search`, {
      q: query,
      page,
    });
  }
}

/**
 * Search Client
 */
export class SearchClient {
  constructor(private client: QuranApiClient) {}

  async search(
    query: string,
    type: 'all' | 'topics' | 'places' | 'verses' = 'all',
    page: number = 1
  ) {
    return this.client.request('/search', { q: query, type, page });
  }

  async topics(query: string, page: number = 1) {
    return this.client.request('/search', {
      q: query,
      type: 'topics',
      page,
    });
  }

  async places(query: string, page: number = 1) {
    return this.client.request('/search', {
      q: query,
      type: 'places',
      page,
    });
  }

  async verses(query: string, page: number = 1) {
    return this.client.request('/search', {
      q: query,
      type: 'verses',
      page,
    });
  }
}

/**
 * Authentication Client
 */
export class AuthClient {
  constructor(private client: QuranApiClient) {}

  async createKey(name: string, description?: string) {
    return this.client.request('/auth/keys', { name, description });
  }

  async listKeys() {
    return this.client.request('/auth/keys');
  }

  async revokeKey(keyId: string) {
    return this.client.request(`/auth/keys/${keyId}`, {});
  }

  async getUsage(keyId: string) {
    return this.client.request(`/auth/keys/${keyId}/usage`);
  }
}

/**
 * API Error Class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Export for use
export default QuranApiClient;
