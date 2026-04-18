'use client';

/**
 * Example React Component Using Quran API
 *
 * Demonstrates how to use the QuranApiClient in a React application
 */

import React, { useState, useEffect } from 'react';
import { QuranApiClient } from '@/lib/api/client';

export function QuranTopicsViewer() {
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [topicVerses, setTopicVerses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Initialize API client
  const apiKey = process.env.NEXT_PUBLIC_QURAN_API_KEY;
  const client = apiKey ? new QuranApiClient(apiKey) : null;

  // Load topics on mount
  useEffect(() => {
    loadTopics();
  }, [page]);

  const loadTopics = async () => {
    if (!client) return;

    setLoading(true);
    setError(null);

    try {
      const response = await client.topics.list(page, 10);
      setTopics(response.data.items);
    } catch (err: any) {
      setError(err.message || 'Failed to load topics');
    } finally {
      setLoading(false);
    }
  };

  const loadTopicVerses = async (topicId: string) => {
    if (!client) return;

    setSelectedTopic(topicId);
    setLoading(true);
    setError(null);

    try {
      const response = await client.topics.getVerses(topicId, 1, 50);
      setTopicVerses(response.data.items);
    } catch (err: any) {
      setError(err.message || 'Failed to load verses');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Topics List */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Quran Topics</h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {topics.map(topic => (
            <button
              key={topic.id}
              onClick={() => loadTopicVerses(topic.id)}
              className={`p-4 rounded-lg border-2 transition ${
                selectedTopic === topic.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
              style={{
                backgroundColor:
                  selectedTopic === topic.id ? `${topic.color}20` : undefined,
              }}
            >
              <div className="font-bold">{topic.name_en}</div>
              <div className="text-sm text-gray-600">{topic.name_ar}</div>
              <div className="text-xs text-gray-500 mt-2">
                {topic.verseCount} verses
              </div>
            </button>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex justify-between mt-4">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="py-2">Page {page}</span>
          <button
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Next
          </button>
        </div>
      </div>

      {/* Verses List */}
      {selectedTopic && (
        <div>
          <h3 className="text-xl font-bold mb-4">
            Verses for {selectedTopic}
          </h3>

          {loading && <div className="text-center text-gray-500">Loading...</div>}

          {!loading && (
            <div className="space-y-4">
              {topicVerses.map((verse, i) => (
                <div key={i} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="font-arabic text-lg mb-2">{verse.text}</div>
                  <div className="text-sm text-gray-600">
                    {verse.surahName} {verse.surah}:{verse.ayah}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Example: Search Component
 */
export function QuranSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_QURAN_API_KEY;
  const client = apiKey ? new QuranApiClient(apiKey) : null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !query.trim()) return;

    setLoading(true);
    try {
      const response = await client.search.search(query, 'all', 1);
      setResults(response.data.items);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSearch} className="mb-6">
        <input
          type="text"
          placeholder="Search topics, places, verses..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        />
        <button
          type="submit"
          className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-lg"
        >
          Search
        </button>
      </form>

      {loading && <div>Searching...</div>}

      <div className="space-y-4">
        {results.map((result, i) => (
          <div key={i} className="border rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">
              {result.type.toUpperCase()}
            </div>
            {result.type === 'topic' && (
              <>
                <div className="font-bold">{result.name_en}</div>
                <div className="text-sm">{result.name_ar}</div>
              </>
            )}
            {result.type === 'place' && (
              <>
                <div className="font-bold">{result.name_en}</div>
                <div className="text-sm">{result.name_ar}</div>
              </>
            )}
            {result.type === 'verse' && (
              <>
                <div className="font-arabic">{result.text}...</div>
                <div className="text-sm text-gray-600">
                  {result.surahName} {result.surah}:{result.ayah}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
