/**
 * Swagger/OpenAPI Documentation Generator
 *
 * Generates OpenAPI 3.0 spec for the Quran API
 */

export interface OpenAPIInfo {
  title: string;
  version: string;
  description?: string;
  contact?: {
    name?: string;
    email?: string;
    url?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
}

export interface OpenAPISpec {
  openapi: string;
  info: OpenAPIInfo;
  servers: Array<{ url: string; description?: string }>;
  paths: Record<string, any>;
  components: {
    schemas: Record<string, any>;
    securitySchemes: Record<string, any>;
  };
  security?: Array<Record<string, string[]>>;
  tags?: Array<{ name: string; description?: string }>;
}

/**
 * Generate OpenAPI spec for Quran API
 */
export function generateOpenApiSpec(): OpenAPISpec {
  return {
    openapi: '3.0.0',
    info: {
      title: 'Al-Mushaf Al-Mufahras API',
      version: '1.0.0',
      description: 'Complete REST API for Quran topics, places, and related data',
      contact: {
        name: 'Al-Mushaf Team',
        url: 'https://al-mushaf.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'https://api.al-mushaf.com/v1',
        description: 'Production API',
      },
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development API',
      },
    ],
    paths: {
      // Topics endpoints
      '/topics': {
        get: {
          summary: 'List all topics',
          operationId: 'listTopics',
          tags: ['Topics'],
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', minimum: 1, default: 1 },
              description: 'Page number',
            },
            {
              name: 'pageSize',
              in: 'query',
              schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
              description: 'Items per page',
            },
            {
              name: 'search',
              in: 'query',
              schema: { type: 'string' },
              description: 'Search by name',
            },
          ],
          security: [{ ApiKeyAuth: [] }],
          responses: {
            '200': {
              description: 'List of topics',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/TopicsResponse' },
                },
              },
            },
            '401': { description: 'Unauthorized' },
            '429': { description: 'Rate limit exceeded' },
          },
        },
      },
      '/topics/{id}': {
        get: {
          summary: 'Get topic by ID',
          operationId: 'getTopic',
          tags: ['Topics'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Topic ID',
            },
          ],
          security: [{ ApiKeyAuth: [] }],
          responses: {
            '200': {
              description: 'Topic details',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Topic' },
                },
              },
            },
            '404': { description: 'Topic not found' },
          },
        },
      },
      '/topics/{id}/verses': {
        get: {
          summary: 'Get verses for a topic',
          operationId: 'getTopicVerses',
          tags: ['Topics'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', minimum: 1, default: 1 },
            },
            {
              name: 'pageSize',
              in: 'query',
              schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            },
          ],
          security: [{ ApiKeyAuth: [] }],
          responses: {
            '200': {
              description: 'Verses for topic',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/VersesResponse' },
                },
              },
            },
          },
        },
      },

      // Places endpoints
      '/places': {
        get: {
          summary: 'List all geographical places',
          operationId: 'listPlaces',
          tags: ['Places'],
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', minimum: 1, default: 1 },
            },
            {
              name: 'pageSize',
              in: 'query',
              schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            },
            {
              name: 'region',
              in: 'query',
              schema: { type: 'string' },
              description: 'Filter by region',
            },
          ],
          security: [{ ApiKeyAuth: [] }],
          responses: {
            '200': {
              description: 'List of places',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PlacesResponse' },
                },
              },
            },
          },
        },
      },
      '/places/{id}': {
        get: {
          summary: 'Get place by ID',
          operationId: 'getPlace',
          tags: ['Places'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          security: [{ ApiKeyAuth: [] }],
          responses: {
            '200': {
              description: 'Place details',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Place' },
                },
              },
            },
          },
        },
      },

      // Verses endpoints
      '/verses/{surah}/{ayah}': {
        get: {
          summary: 'Get specific verse',
          operationId: 'getVerse',
          tags: ['Verses'],
          parameters: [
            {
              name: 'surah',
              in: 'path',
              required: true,
              schema: { type: 'integer', minimum: 1, maximum: 114 },
            },
            {
              name: 'ayah',
              in: 'path',
              required: true,
              schema: { type: 'integer', minimum: 1 },
            },
          ],
          security: [{ ApiKeyAuth: [] }],
          responses: {
            '200': {
              description: 'Verse details',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Verse' },
                },
              },
            },
          },
        },
      },

      // Search endpoints
      '/search': {
        get: {
          summary: 'Full-text search',
          operationId: 'search',
          tags: ['Search'],
          parameters: [
            {
              name: 'q',
              in: 'query',
              required: true,
              schema: { type: 'string' },
              description: 'Search query',
            },
            {
              name: 'type',
              in: 'query',
              schema: { type: 'string', enum: ['topics', 'places', 'verses', 'all'] },
              description: 'Search type',
            },
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', minimum: 1, default: 1 },
            },
          ],
          security: [{ ApiKeyAuth: [] }],
          responses: {
            '200': {
              description: 'Search results',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SearchResults' },
                },
              },
            },
          },
        },
      },

      // API key endpoints (authenticated)
      '/auth/keys': {
        post: {
          summary: 'Create new API key',
          operationId: 'createApiKey',
          tags: ['Authentication'],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiKeyRequest' },
              },
            },
          },
          responses: {
            '201': {
              description: 'API key created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiKeyResponse' },
                },
              },
            },
          },
        },
        get: {
          summary: 'List API keys',
          operationId: 'listApiKeys',
          tags: ['Authentication'],
          security: [{ ApiKeyAuth: [] }],
          responses: {
            '200': {
              description: 'List of API keys',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiKeysResponse' },
                },
              },
            },
          },
        },
      },

      // Health check
      '/health': {
        get: {
          summary: 'Health check',
          operationId: 'health',
          tags: ['System'],
          responses: {
            '200': {
              description: 'API is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', enum: ['ok', 'degraded'] },
                      timestamp: { type: 'string', format: 'date-time' },
                      version: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    components: {
      schemas: {
        Topic: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name_ar: { type: 'string' },
            name_en: { type: 'string' },
            description_ar: { type: 'string' },
            description_en: { type: 'string' },
            color: { type: 'string' },
            verseCount: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        TopicsResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                items: { type: 'array', items: { $ref: '#/components/schemas/Topic' } },
                pagination: { $ref: '#/components/schemas/Pagination' },
              },
            },
          },
        },
        Place: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name_ar: { type: 'string' },
            name_en: { type: 'string' },
            coordinates: {
              type: 'object',
              properties: {
                latitude: { type: 'number' },
                longitude: { type: 'number' },
              },
            },
            region: { type: 'string' },
            verseCount: { type: 'integer' },
          },
        },
        PlacesResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                items: { type: 'array', items: { $ref: '#/components/schemas/Place' } },
                pagination: { $ref: '#/components/schemas/Pagination' },
              },
            },
          },
        },
        Verse: {
          type: 'object',
          properties: {
            surah: { type: 'integer' },
            ayah: { type: 'integer' },
            text: { type: 'string' },
            translation: { type: 'string' },
            topics: { type: 'array', items: { type: 'string' } },
            places: { type: 'array', items: { type: 'string' } },
            page: { type: 'integer' },
          },
        },
        VersesResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                items: { type: 'array', items: { $ref: '#/components/schemas/Verse' } },
                pagination: { $ref: '#/components/schemas/Pagination' },
              },
            },
          },
        },
        SearchResults: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                results: { type: 'array' },
                total: { type: 'integer' },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page: { type: 'integer' },
            pageSize: { type: 'integer' },
            totalPages: { type: 'integer' },
            hasMore: { type: 'boolean' },
          },
        },
        ApiKeyRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            expiresAt: { type: 'string', format: 'date-time' },
            allowedOrigins: { type: 'array', items: { type: 'string' } },
          },
        },
        ApiKeyResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                key: { type: 'string', description: 'Only returned on creation' },
                name: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        ApiKeysResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/ApiKeyResponse' },
            },
          },
        },
      },

      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
          description: 'API key for authentication',
        },
      },
    },

    tags: [
      { name: 'Topics', description: 'Quran topic endpoints' },
      { name: 'Places', description: 'Geographical places endpoints' },
      { name: 'Verses', description: 'Quranic verses endpoints' },
      { name: 'Search', description: 'Full-text search' },
      { name: 'Authentication', description: 'API key management' },
      { name: 'System', description: 'System endpoints' },
    ],
  };
}
