'use client';

/**
 * API Documentation Page
 *
 * Interactive API documentation with:
 * - Swagger UI
 * - Live API testing
 * - Code examples
 * - API key management
 */

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { generateOpenApiSpec } from '@/lib/api/openapi';

export default function ApiDocsPage() {
  const { t, isRTL } = useI18n();
  const [activeTab, setActiveTab] = useState<
    'docs' | 'swagger' | 'examples' | 'keys'
  >('docs');
  const [apiSpec, setApiSpec] = useState<any>(null);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');

  useEffect(() => {
    const spec = generateOpenApiSpec();
    setApiSpec(spec);

    // Load API keys from localStorage
    const saved = localStorage.getItem('api-keys');
    if (saved) {
      setApiKeys(JSON.parse(saved));
    }
  }, []);

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) return;

    try {
      const response = await fetch('/api/v1/auth/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'demo-key', // Would use real key in practice
        },
        body: JSON.stringify({
          name: newKeyName,
          description: 'Created from API docs',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newKey = data.data;

        // Save locally
        const updated = [...apiKeys, newKey];
        setApiKeys(updated);
        localStorage.setItem('api-keys', JSON.stringify(updated));

        setNewKeyName('');
        setShowNewKeyForm(false);
      }
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="bg-black/40 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-4xl font-bold text-white mb-2">
            Al-Mushaf API Documentation
          </h1>
          <p className="text-gray-400">
            Complete REST API for Quran topics, places, and verses
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-20 z-40">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-1 overflow-x-auto">
            {[
              { id: 'docs', label: 'Overview' },
              { id: 'swagger', label: 'Swagger UI' },
              { id: 'examples', label: 'Code Examples' },
              { id: 'keys', label: 'API Keys' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-4 border-b-2 transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Overview Tab */}
        {activeTab === 'docs' && (
          <div className="space-y-8">
            <section className="bg-gray-800 rounded-lg p-8 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">Quick Start</h2>

              <div className="space-y-4 text-gray-300">
                <p>
                  The Al-Mushaf API provides access to comprehensive Quran data including
                  topics, geographical places, and verses.
                </p>

                <div className="bg-gray-900 rounded p-4 border border-gray-600">
                  <p className="text-sm text-gray-400 mb-2">Base URL</p>
                  <code className="text-green-400">
                    https://api.al-mushaf.com/v1
                  </code>
                </div>

                <div className="bg-gray-900 rounded p-4 border border-gray-600">
                  <p className="text-sm text-gray-400 mb-2">Authentication</p>
                  <code className="text-green-400">
                    X-API-Key: your_api_key_here
                  </code>
                </div>
              </div>
            </section>

            <section className="bg-gray-800 rounded-lg p-8 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">Main Endpoints</h2>

              <div className="space-y-4">
                {[
                  {
                    method: 'GET',
                    path: '/topics',
                    description: 'List all Quran topics',
                  },
                  {
                    method: 'GET',
                    path: '/topics/{id}',
                    description: 'Get specific topic details',
                  },
                  {
                    method: 'GET',
                    path: '/topics/{id}/verses',
                    description: 'Get verses for a topic',
                  },
                  {
                    method: 'GET',
                    path: '/places',
                    description: 'List geographical places',
                  },
                  {
                    method: 'GET',
                    path: '/verses/{surah}/{ayah}',
                    description: 'Get specific verse',
                  },
                  {
                    method: 'GET',
                    path: '/search',
                    description: 'Full-text search',
                  },
                ].map((endpoint, i) => (
                  <div
                    key={i}
                    className="bg-gray-900 rounded p-4 border border-gray-600 hover:border-blue-500 transition"
                  >
                    <div className="flex items-center gap-4">
                      <span className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold">
                        {endpoint.method}
                      </span>
                      <code className="text-green-400 flex-1">{endpoint.path}</code>
                    </div>
                    <p className="text-gray-400 mt-2">{endpoint.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-gray-800 rounded-lg p-8 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">Response Format</h2>

              <div className="bg-gray-900 rounded p-4 border border-gray-600 text-gray-300 font-mono text-sm overflow-x-auto">
                <pre>{`{
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
  },
  "meta": {
    "version": "1.0.0",
    "timestamp": "2024-04-18T12:00:00Z"
  }
}`}</pre>
              </div>
            </section>

            <section className="bg-gray-800 rounded-lg p-8 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">Rate Limiting</h2>

              <div className="space-y-4 text-gray-300">
                <ul className="list-disc list-inside space-y-2">
                  <li>60 requests per minute</li>
                  <li>1,000 requests per hour</li>
                  <li>10,000 requests per day</li>
                </ul>

                <div className="bg-gray-900 rounded p-4 border border-gray-600 mt-4">
                  <p className="text-sm text-gray-400 mb-2">Response Headers</p>
                  <code className="text-green-400 text-sm block">
                    X-RateLimit-Remaining: 59
                    <br />
                    X-RateLimit-Reset: 1624032060
                  </code>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Swagger Tab */}
        {activeTab === 'swagger' && (
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6">Swagger UI</h2>
            {apiSpec && (
              <div className="bg-gray-900 rounded p-6 border border-gray-600">
                <p className="text-gray-400 mb-4">
                  Full OpenAPI specification available at:
                </p>
                <code className="block bg-gray-950 p-4 rounded text-green-400 mb-4">
                  /api/v1/docs/swagger.json
                </code>
                <p className="text-gray-300 text-sm">
                  Supports tools like Postman, Insomnia, and ReDoc
                </p>
              </div>
            )}
          </div>
        )}

        {/* Examples Tab */}
        {activeTab === 'examples' && (
          <div className="space-y-8">
            <section className="bg-gray-800 rounded-lg p-8 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">JavaScript/Node.js</h2>

              <div className="bg-gray-900 rounded p-4 border border-gray-600 text-gray-300 font-mono text-sm overflow-x-auto">
                <pre>{`// Fetch topics
const response = await fetch('https://api.al-mushaf.com/v1/topics', {
  headers: {
    'X-API-Key': 'your_api_key'
  }
});

const data = await response.json();
console.log(data.data.items);

// Get specific topic verses
const topicVerses = await fetch(
  'https://api.al-mushaf.com/v1/topics/belief/verses',
  {
    headers: {
      'X-API-Key': 'your_api_key'
    }
  }
).then(r => r.json());`}</pre>
              </div>
            </section>

            <section className="bg-gray-800 rounded-lg p-8 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">Python</h2>

              <div className="bg-gray-900 rounded p-4 border border-gray-600 text-gray-300 font-mono text-sm overflow-x-auto">
                <pre>{`import requests

# Set up headers
headers = {
    'X-API-Key': 'your_api_key'
}

# Fetch topics
response = requests.get(
    'https://api.al-mushaf.com/v1/topics',
    headers=headers
)

topics = response.json()['data']['items']
print(topics)

# Search
search = requests.get(
    'https://api.al-mushaf.com/v1/search?q=belief',
    headers=headers
).json()`}</pre>
              </div>
            </section>

            <section className="bg-gray-800 rounded-lg p-8 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">cURL</h2>

              <div className="bg-gray-900 rounded p-4 border border-gray-600 text-gray-300 font-mono text-sm overflow-x-auto">
                <pre>{`curl -H "X-API-Key: your_api_key" \\
  https://api.al-mushaf.com/v1/topics

curl -H "X-API-Key: your_api_key" \\
  "https://api.al-mushaf.com/v1/search?q=mosque"`}</pre>
              </div>
            </section>
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === 'keys' && (
          <div className="space-y-8">
            <section className="bg-gray-800 rounded-lg p-8 border border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Your API Keys</h2>
                <button
                  onClick={() => setShowNewKeyForm(!showNewKeyForm)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition"
                >
                  + Create Key
                </button>
              </div>

              {showNewKeyForm && (
                <div className="bg-gray-900 rounded p-4 border border-gray-600 mb-6">
                  <input
                    type="text"
                    placeholder="Key name (e.g., Mobile App)"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-4 py-2 text-white mb-4"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateApiKey}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setShowNewKeyForm(false)}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {apiKeys.length === 0 ? (
                <div className="bg-gray-900 rounded p-8 border border-gray-600 text-center">
                  <p className="text-gray-400">No API keys yet. Create one to get started!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {apiKeys.map((key, i) => (
                    <div
                      key={i}
                      className="bg-gray-900 rounded p-4 border border-gray-600 hover:border-blue-500 transition"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-white font-bold">{key.name}</h3>
                        <span className="text-xs text-gray-400">
                          {new Date(key.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <code className="block bg-gray-800 p-2 rounded text-green-400 text-sm mb-3 break-all">
                        {key.key}
                      </code>
                      <div className="flex gap-2">
                        <button className="text-sm text-blue-400 hover:text-blue-300">
                          Copy
                        </button>
                        <button className="text-sm text-red-400 hover:text-red-300">
                          Revoke
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-gray-800 rounded-lg p-8 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">Usage Statistics</h2>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-900 rounded p-4 border border-gray-600">
                  <p className="text-gray-400 text-sm">Requests Today</p>
                  <p className="text-3xl font-bold text-white mt-2">1,234</p>
                </div>
                <div className="bg-gray-900 rounded p-4 border border-gray-600">
                  <p className="text-gray-400 text-sm">Remaining (Today)</p>
                  <p className="text-3xl font-bold text-green-400 mt-2">8,766</p>
                </div>
                <div className="bg-gray-900 rounded p-4 border border-gray-600">
                  <p className="text-gray-400 text-sm">Avg Response Time</p>
                  <p className="text-3xl font-bold text-white mt-2">145ms</p>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
