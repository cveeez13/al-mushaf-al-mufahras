'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { SURAH_NAMES, TOPICS, SURAH_START_PAGES } from '@/lib/types';

interface SearchBarProps {
  onGoToPage: (page: number) => void;
  onFilterTopic?: (color: string | null) => void;
}

type ResultItem =
  | { type: 'surah'; surah: number; name: string; page: number }
  | { type: 'topic'; id: number; name: string; color: string; hex: string }
  | { type: 'page'; page: number };

export default function SearchBar({ onGoToPage, onFilterTopic }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResultItem[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) { setResults([]); return; }

    const items: ResultItem[] = [];

    // Search by page number
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num >= 1 && num <= 604) {
      items.push({ type: 'page', page: num });
    }

    // Search by surah name
    const normalized = trimmed.replace(/[\u0650\u064E\u064F\u0651\u0652\u064B\u064C\u064D]/g, '');
    for (const [id, name] of Object.entries(SURAH_NAMES)) {
      const cleanName = name.replace(/[\u0650\u064E\u064F\u0651\u0652\u064B\u064C\u064D]/g, '');
      if (cleanName.includes(normalized) || name.includes(trimmed)) {
        const surahNum = Number(id);
        items.push({ type: 'surah', surah: surahNum, name, page: SURAH_START_PAGES[surahNum] });
      }
    }

    // Search by topic name
    for (const topic of Object.values(TOPICS)) {
      if (topic.name_ar.includes(trimmed) || topic.name_en.toLowerCase().includes(trimmed.toLowerCase())) {
        items.push({ type: 'topic', id: topic.id, name: topic.name_ar, color: topic.color, hex: topic.hex });
      }
    }

    setResults(items.slice(0, 12));
  }, []);

  useEffect(() => {
    search(query);
  }, [query, search]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (item: ResultItem) => {
    if (item.type === 'page') onGoToPage(item.page);
    else if (item.type === 'surah') onGoToPage(item.page);
    else if (item.type === 'topic') onFilterTopic?.(item.color);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="mushaf-search">
      <div className="mushaf-search-input-wrap">
        <span className="mushaf-search-icon" aria-hidden="true">🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="ابحث: سورة، صفحة، أو موضوع..."
          className="mushaf-search-input"
          aria-label="البحث في المصحف"
        />
      </div>
      {open && results.length > 0 && (
        <div className="mushaf-search-dropdown" role="listbox">
          {results.map((item, i) => (
            <button
              key={`${item.type}-${i}`}
              className="mushaf-search-result"
              onClick={() => handleSelect(item)}
              role="option"
              type="button"
            >
              {item.type === 'page' && (
                <>
                  <span className="mushaf-search-badge">📄</span>
                  <span>صفحة {item.page}</span>
                </>
              )}
              {item.type === 'surah' && (
                <>
                  <span className="mushaf-search-badge">📖</span>
                  <span>سورة {item.name}</span>
                  <span className="mushaf-search-meta">ص {item.page}</span>
                </>
              )}
              {item.type === 'topic' && (
                <>
                  <span className="mushaf-search-topic-dot" style={{ backgroundColor: item.hex }} />
                  <span>{item.name}</span>
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
