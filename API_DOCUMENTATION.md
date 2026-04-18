# Al-Mushaf API Documentation

## Overview

The Al-Mushaf API is a comprehensive REST API providing access to:
- **Quran Topics**: 7 categorized topic classifications with color coding
- **Geographical Places**: 40+ locations mentioned in the Quran
- **Quranic Verses**: Complete text with translations and metadata
- **Full-Text Search**: Semantic and keyword search across all data

**API Version**: 1.0.0  
**Base URL**: `https://api.al-mushaf.com/v1` (Production) | `http://localhost:3000/api/v1` (Development)

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Endpoints](#endpoints)
4. [Rate Limiting](#rate-limiting)
5. [Response Format](#response-format)
6. [Error Handling](#error-handling)
7. [Code Examples](#code-examples)
8. [API Key Management](#api-key-management)
9. [Versioning](#versioning)
10. [SDKs & Tools](#sdks--tools)

---

## Getting Started

### 1. Obtain API Key

Generate an API key from the [API Dashboard](/api/docs):
```bash
POST /api/v1/auth/keys
```

### 2. Make Your First Request

```bash
curl -H "X-API-Key: your_api_key" \
  https://api.al-mushaf.com/v1/health
```

### 3. Parse Response

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2024-04-18T12:00:00Z",
    "version": "1.0.0"
  },
  "meta": {
    "version": "1.0.0",
    "timestamp": "2024-04-18T12:00:00Z"
  }
}
```

---

## Authentication

### API Key Authentication

All requests must include an API key in one of these formats:

**Option 1: Header (Recommended)**
```bash
curl -H "X-API-Key: your_api_key" \
  https://api.al-mushaf.com/v1/topics
```

**Option 2: Authorization Header**
```bash
curl -H "Authorization: Bearer your_api_key" \
  https://api.al-mushaf.com/v1/topics
```

### Creating API Keys

#### via API
```bash
curl -X POST https://api.al-mushaf.com/v1/auth/keys \
  -H "X-API-Key: your_existing_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mobile App",
    "description": "iOS and Android app",
    "expiresAt": "2025-04-18",
    "allowedOrigins": ["https://app.example.com"]
  }'
```

#### Response
```json
{
  "success": true,
  "data": {
    "id": "key_1712347200000_abc123def456",
    "key": "key_1712347200000.abc123def456789xyz...",
    "name": "Mobile App",
    "createdAt": "2024-04-18T12:00:00Z"
  }
}
```

**Important**: Store the `key` value securely. It will not be shown again.

### Key Features
- ✅ Create unlimited API keys
- ✅ Set expiration dates
- ✅ Restrict to specific origins
- ✅ Limit to specific endpoints
- ✅ Revoke keys anytime
- ✅ Track usage per key

---

## Endpoints

### Topics

#### List Topics
```
GET /api/v1/topics
```

**Parameters**:
- `page` (integer, default: 1) - Page number
- `pageSize` (integer, default: 20, max: 100) - Items per page
- `search` (string) - Search by name

**Example**:
```bash
curl https://api.al-mushaf.com/v1/topics?page=1&pageSize=10 \
  -H "X-API-Key: your_api_key"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "belief",
        "name_ar": "العقيدة",
        "name_en": "Belief",
        "color": "#FF6B6B",
        "verseCount": 245
      }
    ],
    "pagination": {
      "total": 7,
      "page": 1,
      "pageSize": 10,
      "totalPages": 1,
      "hasMore": false
    }
  }
}
```

#### Get Topic
```
GET /api/v1/topics/{id}
```

**Example**:
```bash
curl https://api.al-mushaf.com/v1/topics/belief \
  -H "X-API-Key: your_api_key"
```

#### Get Topic Verses
```
GET /api/v1/topics/{id}/verses
```

**Parameters**:
- `page` (integer, default: 1)
- `pageSize` (integer, default: 50, max: 100)

**Example**:
```bash
curl https://api.al-mushaf.com/v1/topics/belief/verses?page=1 \
  -H "X-API-Key: your_api_key"
```

---

### Places

#### List Places
```
GET /api/v1/places
```

**Parameters**:
- `page` (integer, default: 1)
- `pageSize` (integer, default: 20)
- `region` (string) - Filter by region

**Example**:
```bash
curl https://api.al-mushaf.com/v1/places?region=arabia \
  -H "X-API-Key: your_api_key"
```

#### Get Place
```
GET /api/v1/places/{id}
```

**Example**:
```bash
curl https://api.al-mushaf.com/v1/places/makkah \
  -H "X-API-Key: your_api_key"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "makkah",
    "name_ar": "مكة",
    "name_en": "Mecca",
    "coordinates": {
      "latitude": 21.4225,
      "longitude": 39.8264
    },
    "region": "arabia",
    "verseCount": 87
  }
}
```

---

### Verses

#### Get Verse
```
GET /api/v1/verses/{surah}/{ayah}
```

**Parameters**:
- `surah` (integer, 1-114) - Chapter number
- `ayah` (integer, 1+) - Verse number

**Example**:
```bash
curl https://api.al-mushaf.com/v1/verses/1/1 \
  -H "X-API-Key: your_api_key"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "surah": 1,
    "ayah": 1,
    "text": "الحمد لله رب العالمين",
    "translation": "All praise is due to Allah, the Lord of the worlds",
    "topics": ["belief"],
    "places": [],
    "page": 1
  }
}
```

---

### Search

#### Full-Text Search
```
GET /api/v1/search
```

**Parameters**:
- `q` (string, required) - Search query
- `type` (string) - Filter by type: `topics`, `places`, `verses`, `all` (default: `all`)
- `page` (integer, default: 1)
- `pageSize` (integer, default: 20)

**Example**:
```bash
curl "https://api.al-mushaf.com/v1/search?q=mosque&type=places" \
  -H "X-API-Key: your_api_key"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "type": "place",
        "id": "al-aqsa",
        "name": "Al-Aqsa Mosque"
      }
    ],
    "total": 3
  }
}
```

---

## Rate Limiting

### Limits

| Metric | Limit | Window |
|--------|-------|--------|
| Requests | 60 | Per minute |
| Requests | 1,000 | Per hour |
| Requests | 10,000 | Per day |

### Rate Limit Headers

Every response includes:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1712347260
```

### Handling Limits

If you exceed limits, you'll receive a `429 Too Many Requests` response:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Retry after 60 seconds",
    "details": {
      "retryAfter": 60
    }
  }
}
```

**Action**: Wait for the `Retry-After` header or `retryAfter` value before retrying.

---

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    // Requested data here
  },
  "meta": {
    "version": "1.0.0",
    "timestamp": "2024-04-18T12:00:00Z"
  }
}
```

### Paginated Response

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "total": 100,
      "page": 1,
      "pageSize": 20,
      "totalPages": 5,
      "hasMore": true
    }
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  },
  "meta": {
    "version": "1.0.0",
    "timestamp": "2024-04-18T12:00:00Z"
  }
}
```

---

## Error Handling

### Common Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| AUTHENTICATION_ERROR | 401 | Missing or invalid API key |
| AUTHORIZATION_ERROR | 403 | API key lacks required permissions |
| VALIDATION_ERROR | 400 | Invalid request parameters |
| NOT_FOUND | 404 | Resource not found |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

### Handling Errors

```javascript
fetch('https://api.al-mushaf.com/v1/topics', {
  headers: { 'X-API-Key': apiKey }
})
.then(res => {
  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }
  return res.json();
})
.catch(err => {
  console.error('Request failed:', err.message);
  // Implement retry logic
});
```

---

## Code Examples

### JavaScript/Node.js

```javascript
// Basic request
const response = await fetch('https://api.al-mushaf.com/v1/topics', {
  headers: {
    'X-API-Key': process.env.QURAN_API_KEY
  }
});

const data = await response.json();
console.log(data.data.items);

// With pagination
const topics = await fetch(
  'https://api.al-mushaf.com/v1/topics?page=1&pageSize=50',
  { headers: { 'X-API-Key': apiKey } }
).then(r => r.json());

// Search
const results = await fetch(
  `https://api.al-mushaf.com/v1/search?q=mosque&type=places`,
  { headers: { 'X-API-Key': apiKey } }
).then(r => r.json());
```

### Python

```python
import requests

api_key = os.getenv('QURAN_API_KEY')
headers = {'X-API-Key': api_key}

# List topics
response = requests.get(
    'https://api.al-mushaf.com/v1/topics',
    headers=headers
)
topics = response.json()['data']['items']

# Get verses for topic
verses = requests.get(
    'https://api.al-mushaf.com/v1/topics/belief/verses',
    headers=headers,
    params={'page': 1, 'pageSize': 100}
).json()

# Full-text search
results = requests.get(
    'https://api.al-mushaf.com/v1/search',
    headers=headers,
    params={'q': 'mosque', 'type': 'places'}
).json()
```

### cURL

```bash
# List topics
curl -H "X-API-Key: $API_KEY" \
  https://api.al-mushaf.com/v1/topics

# Get verse
curl -H "X-API-Key: $API_KEY" \
  https://api.al-mushaf.com/v1/verses/1/1

# Search with filter
curl -H "X-API-Key: $API_KEY" \
  "https://api.al-mushaf.com/v1/search?q=belief&type=topics"

# Paginated request
curl -H "X-API-Key: $API_KEY" \
  "https://api.al-mushaf.com/v1/topics?page=2&pageSize=50"
```

---

## API Key Management

### Dashboard

Visit [/api/docs](/api/docs) to:
- ✅ Create new API keys
- ✅ View usage statistics
- ✅ Revoke keys
- ✅ Set expiration dates
- ✅ Configure restrictions

### Programmatic Management

#### List Keys
```bash
GET /api/v1/auth/keys
```

#### Revoke Key
```bash
DELETE /api/v1/auth/keys/{keyId}
```

#### Get Key Usage
```bash
GET /api/v1/auth/keys/{keyId}/usage
```

Response:
```json
{
  "success": true,
  "data": {
    "totalRequests": 1234,
    "requestsPerMinute": 45,
    "averageResponseTime": 145,
    "errorRate": 0.5
  }
}
```

---

## Versioning

### Current Version

- **v1** (Current) - Stable API with topic classification, places, and search

### Version URLs

```
https://api.al-mushaf.com/v1/      # Version 1 (Current)
https://api.al-mushaf.com/v2/      # Version 2 (Future)
```

### Deprecation Policy

- **Advance notice**: 6 months before deprecation
- **Support duration**: 2 years minimum per version
- **Migration guide**: Provided for major changes

---

## SDKs & Tools

### Official SDKs

- **JavaScript/Node.js**: `@al-mushaf/api-client` (NPM)
- **Python**: `al-mushaf-api` (PyPI)
- **Go**: `github.com/al-mushaf/api-go`

### Community Tools

- **Postman Collection**: [Download](https://api.al-mushaf.com/postman.json)
- **OpenAPI UI**: [Swagger Editor](https://api.al-mushaf.com/swagger-ui)
- **GraphQL Gateway**: Coming soon

---

## Support & Community

- **Documentation**: https://api.al-mushaf.com/docs
- **GitHub Issues**: https://github.com/al-mushaf/api/issues
- **Email**: api-support@al-mushaf.com
- **Status Page**: https://status.al-mushaf.com

---

## Legal

### Terms of Service

- ✅ Free tier: 10,000 requests/day
- ✅ Commercial: Custom plans available
- ✅ Academic: Special rates for research

### Attribution

When using the API, please attribute:
> Data sourced from Al-Mushaf Al-Mufahras API

### License

API is licensed under MIT License. Data is available under Creative Commons Attribution.

---

Last Updated: April 18, 2024  
API Version: 1.0.0
