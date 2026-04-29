'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Bookmark {
  verse_key: string;
  surah: number;
  ayah: number;
  page: number | null;
  topic_color: string;
  text_preview: string;
  created_at: string;
}

const STORAGE_KEY = 'mushaf-bookmarks';
const BOOKMARKS_CHANGED_EVENT = 'mushaf-bookmarks-change';

function loadBookmarks(): Bookmark[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBookmarks(bookmarks: Bookmark[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  window.setTimeout(() => {
    window.dispatchEvent(new Event(BOOKMARKS_CHANGED_EVENT));
  }, 0);
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    const syncBookmarks = () => setBookmarks(loadBookmarks());

    syncBookmarks();
    window.addEventListener('storage', syncBookmarks);
    window.addEventListener(BOOKMARKS_CHANGED_EVENT, syncBookmarks);

    return () => {
      window.removeEventListener('storage', syncBookmarks);
      window.removeEventListener(BOOKMARKS_CHANGED_EVENT, syncBookmarks);
    };
  }, []);

  const addBookmark = useCallback((bm: Omit<Bookmark, 'created_at'>) => {
    setBookmarks(prev => {
      if (prev.some(b => b.verse_key === bm.verse_key)) return prev;
      const updated = [{ ...bm, created_at: new Date().toISOString() }, ...prev];
      saveBookmarks(updated);
      return updated;
    });
  }, []);

  const removeBookmark = useCallback((verse_key: string) => {
    setBookmarks(prev => {
      const updated = prev.filter(b => b.verse_key !== verse_key);
      saveBookmarks(updated);
      return updated;
    });
  }, []);

  const isBookmarked = useCallback((verse_key: string) => {
    return bookmarks.some(b => b.verse_key === verse_key);
  }, [bookmarks]);

  const clearBookmarks = useCallback(() => {
    setBookmarks([]);
    saveBookmarks([]);
  }, []);

  return { bookmarks, addBookmark, removeBookmark, isBookmarked, clearBookmarks };
}
