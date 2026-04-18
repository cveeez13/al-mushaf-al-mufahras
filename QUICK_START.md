# API Quick Start Guide

Get started with the Al-Mushaf API in 5 minutes.

---

## 1️⃣ Get Your API Key

### Option A: Web Dashboard
1. Go to http://localhost:3000/api/docs
2. Click "API Keys" tab
3. Click "Create New Key"
4. Copy your key (shown only once!)

### Option B: Programmatic
```bash
curl -X POST http://localhost:3000/api/v1/auth/keys \
  -H "X-API-Key: demo-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My App",
    "description": "Test app"
  }'
```

---

## 2️⃣ Make Your First Request

### Using cURL
```bash
export API_KEY="your_api_key_here"

# Get list of topics
curl -H "X-API-Key: $API_KEY" \
  http://localhost:3000/api/v1/topics

# Get a specific verse
curl -H "X-API-Key: $API_KEY" \
  http://localhost:3000/api/v1/verses/1/1

# Search for something
curl -H "X-API-Key: $API_KEY" \
  "http://localhost:3000/api/v1/search?q=mosque"
```

### Using JavaScript
```javascript
const apiKey = "your_api_key_here";

// Fetch topics
const response = await fetch('http://localhost:3000/api/v1/topics', {
  headers: { 'X-API-Key': apiKey }
});
const data = await response.json();
console.log(data.data.items);
```

### Using Python
```python
import requests

api_key = "your_api_key_here"
headers = {"X-API-Key": api_key}

# Get topics
response = requests.get(
    'http://localhost:3000/api/v1/topics',
    headers=headers
)
topics = response.json()['data']['items']
print(topics)
```

---

## 3️⃣ Common Endpoints

### Topics
```
GET /api/v1/topics                    # List all topics
GET /api/v1/topics?page=1&pageSize=5  # With pagination
GET /api/v1/topics/belief              # Get specific topic
GET /api/v1/topics/belief/verses       # Get topic verses
```

### Search
```
GET /api/v1/search?q=mosque                    # Search everything
GET /api/v1/search?q=belief&type=topics        # Search topics
GET /api/v1/search?q=mecca&type=places         # Search places
GET /api/v1/search?q=prayer&type=verses        # Search verses
```

### Verses
```
GET /api/v1/verses/1/1                 # Get verse Surah 1, Ayah 1
GET /api/v1/verses/2/255               # Get verse Surah 2, Ayah 255
```

### Places
```
GET /api/v1/places                     # List all places
GET /api/v1/places?region=arabia       # Filter by region
GET /api/v1/places/makkah              # Get specific place
```

---

## 4️⃣ Response Structure

All responses follow this format:

### Success (200 OK)
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "belief",
        "name_en": "Belief",
        "name_ar": "العقيدة",
        "color": "#FF6B6B",
        "verseCount": 245
      }
    ],
    "pagination": {
      "total": 7,
      "page": 1,
      "pageSize": 20,
      "totalPages": 1,
      "hasMore": false
    }
  },
  "meta": {
    "version": "1.0.0",
    "timestamp": "2024-04-18T12:00:00Z"
  }
}
```

### Error (400/401/429/500)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid page number",
    "details": {}
  }
}
```

---

## 5️⃣ Usage Examples

### React Component
```jsx
import { useState, useEffect } from 'react';

export function TopicsList() {
  const [topics, setTopics] = useState([]);
  const apiKey = process.env.REACT_APP_API_KEY;

  useEffect(() => {
    fetch('http://localhost:3000/api/v1/topics', {
      headers: { 'X-API-Key': apiKey }
    })
      .then(res => res.json())
      .then(data => setTopics(data.data.items));
  }, [apiKey]);

  return (
    <div>
      {topics.map(topic => (
        <div key={topic.id}>
          <h3>{topic.name_en}</h3>
          <p>{topic.name_ar}</p>
          <p>{topic.verseCount} verses</p>
        </div>
      ))}
    </div>
  );
}
```

### Express.js Backend
```javascript
const express = require('express');
const app = express();

const apiKey = process.env.QURAN_API_KEY;

app.get('/api/topics', async (req, res) => {
  const response = await fetch('http://localhost:3000/api/v1/topics', {
    headers: { 'X-API-Key': apiKey }
  });
  const data = await response.json();
  res.json(data);
});

app.listen(3001);
```

### Command Line / Shell Script
```bash
#!/bin/bash

API_KEY="your_api_key_here"
BASE_URL="http://localhost:3000/api/v1"

# Function to query API
query_api() {
  local endpoint=$1
  curl -s -H "X-API-Key: $API_KEY" "$BASE_URL$endpoint" | jq '.'
}

# List all topics
query_api "/topics"

# Search for verses about prayer
query_api "/search?q=prayer&type=verses"

# Get verse 2:255 (Ayat al-Kursi)
query_api "/verses/2/255"
```

---

## 🔑 Rate Limiting

**Limits**:
- 60 requests per minute
- 1,000 requests per hour
- 10,000 requests per day

**When limit exceeded**:
```bash
HTTP/1.1 429 Too Many Requests

{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Retry after 60 seconds"
  }
}
```

**Response headers**:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1712347260
Retry-After: 60
```

---

## 🐛 Debugging

### Check API Health
```bash
curl http://localhost:3000/api/v1/health
```

### View Full Docs
Visit: http://localhost:3000/api/docs

### Test with Postman
1. Download Postman
2. Import OpenAPI spec: http://localhost:3000/api/v1/docs/swagger.json
3. Add API key to headers
4. Test endpoints

### Enable Logging
```javascript
// In your code
const response = await fetch(url, options);
console.log('Status:', response.status);
console.log('Headers:', Object.fromEntries(response.headers));
console.log('Body:', await response.json());
```

---

## ⚠️ Common Issues

### "Invalid API Key"
```
✗ Cause: API key is missing or invalid
✓ Fix: Add -H "X-API-Key: your_key" to your request
```

### "Rate limit exceeded"
```
✗ Cause: Too many requests in time window
✓ Fix: Wait for Retry-After seconds, then retry
✓ Optimize: Cache responses, batch requests
```

### "Page not found" (404)
```
✗ Cause: Resource ID doesn't exist
✓ Fix: Check resource ID spelling
✓ Verify: List all resources first, then request specific one
```

### "Internal Server Error" (500)
```
✗ Cause: Server error (rare)
✓ Fix: Check API status page
✓ Retry: Wait a few seconds and retry
✓ Report: Contact api-support@al-mushaf.com
```

---

## 📚 Learn More

- **Full API Reference**: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- **Implementation Guide**: [PUBLIC_API_IMPLEMENTATION.md](PUBLIC_API_IMPLEMENTATION.md)
- **Interactive Docs**: http://localhost:3000/api/docs
- **OpenAPI Spec**: http://localhost:3000/api/v1/docs/swagger.json

---

## 🚀 Next Steps

1. ✅ Get API key
2. ✅ Make your first request
3. ✅ Explore endpoints
4. ✅ Build your app
5. 📖 Read full documentation for advanced features

---

## 💡 Tips

- **Pagination**: Use `page` and `pageSize` for large datasets
- **Search**: Use `/search` endpoint for flexible searching
- **Caching**: Cache popular endpoints to reduce API calls
- **Rate Limits**: Design apps to stay within limits (60/min is plenty for most use cases)
- **Keys**: Generate separate keys for different apps/environments

---

**Ready to build?** Start with the [API Dashboard](/api/docs)!
