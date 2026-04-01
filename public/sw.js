/**
 * Service Worker for Al-Mushaf Al-Mufahras — Offline-First Architecture
 *
 * Cache strategies:
 * - CacheFirst:  Static assets (JS, CSS, HTML, JSON data, images)
 * - NetworkFirst: Tafsir API calls (fallback to cache)
 * - StaleWhileRevalidate: Google Fonts
 * - NetworkOnly: Analytics, non-essential
 *
 * Lifecycle: install → precache shell; activate → purge old caches; fetch → strategy routing
 */

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `mushaf-static-${CACHE_VERSION}`;
const DATA_CACHE = `mushaf-data-${CACHE_VERSION}`;
const API_CACHE = `mushaf-api-${CACHE_VERSION}`;
const AUDIO_CACHE = `mushaf-audio-${CACHE_VERSION}`;
const FONT_CACHE = `mushaf-fonts-${CACHE_VERSION}`;

// App shell — precached on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/data/topics_master.json',
  '/data/topics_by_page.json',
  '/data/topics_by_surah.json',
  '/data/topics_by_juz.json',
  '/data/topic_statistics.json',
  '/votd-widget.js',
];

// ─── INSTALL: Precache app shell ──────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      // Add each URL individually so one failure doesn't block all
      const results = await Promise.allSettled(
        PRECACHE_URLS.map(url => cache.add(url).catch(err => {
          console.warn(`[SW] Failed to precache ${url}:`, err.message);
        }))
      );
      console.log(`[SW] Precached ${results.filter(r => r.status === 'fulfilled').length}/${PRECACHE_URLS.length} URLs`);
    }).then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE: Clean up old caches, claim clients ─────────────

self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, DATA_CACHE, API_CACHE, AUDIO_CACHE, FONT_CACHE];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k.startsWith('mushaf-') && !currentCaches.includes(k))
          .map(k => {
            console.log(`[SW] Purging old cache: ${k}`);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ─── FETCH: Strategy routing ──────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) schemes
  if (!url.protocol.startsWith('http')) return;

  // Skip Next.js dev/build assets — let Turbopack handle HMR/bundling directly
  if (url.pathname.startsWith('/_next/')) return;

  // Route by URL pattern
  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request, API_CACHE));
  } else if (isAudioRequest(url)) {
    event.respondWith(cacheFirst(request, AUDIO_CACHE));
  } else if (isFontRequest(url)) {
    event.respondWith(staleWhileRevalidate(request, FONT_CACHE));
  } else if (isDataRequest(url)) {
    event.respondWith(cacheFirst(request, DATA_CACHE));
  } else if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else {
    // Default: NetworkFirst for HTML navigation, CacheFirst for everything else
    if (request.mode === 'navigate') {
      event.respondWith(networkFirst(request, STATIC_CACHE));
    } else {
      event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    }
  }
});

// ─── URL matchers ─────────────────────────────────────────────

function isApiRequest(url) {
  return url.hostname === 'api.quran.com';
}

function isAudioRequest(url) {
  return url.hostname.includes('everyayah.com') ||
    (url.pathname.endsWith('.mp3') || url.pathname.endsWith('.ogg'));
}

function isFontRequest(url) {
  return url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com';
}

function isDataRequest(url) {
  return url.pathname.startsWith('/data/') && url.pathname.endsWith('.json');
}

function isStaticAsset(url) {
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|ico|woff2?|ttf|eot)$/);
}

// ─── Cache strategies ─────────────────────────────────────────

/**
 * CacheFirst: Serve from cache, fall back to network (then cache).
 * Best for: Static assets, data files, audio files.
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Offline and not cached — return offline fallback
    return offlineFallback(request);
  }
}

/**
 * NetworkFirst: Try network, fall back to cache.
 * Best for: API calls, HTML navigation (want fresh data when possible).
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Network failed — try cache
    const cached = await cache.match(request);
    if (cached) return cached;
    return offlineFallback(request);
  }
}

/**
 * StaleWhileRevalidate: Serve from cache immediately, update in background.
 * Best for: Fonts, non-critical resources.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  return cached || (await fetchPromise) || offlineFallback(request);
}

/**
 * Offline fallback response for requests we can't serve.
 */
function offlineFallback(request) {
  const url = new URL(request.url);

  // For navigation requests, try the cached app shell
  if (request.mode === 'navigate') {
    return caches.match('/index.html') || new Response(
      '<html><body dir="rtl" style="text-align:center;padding:50px;font-family:sans-serif">' +
      '<h1>غير متصل بالإنترنت</h1><p>التطبيق يعمل بدون إنترنت بعد أول تحميل</p>' +
      '</body></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  // For API requests, return empty JSON
  if (isApiRequest(url)) {
    return new Response(JSON.stringify({ error: 'offline', tafsir: null }), {
      headers: { 'Content-Type': 'application/json' },
      status: 503,
    });
  }

  // Generic offline response
  return new Response('Offline', { status: 503 });
}

// ─── Message handling (from main thread) ──────────────────────

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CACHE_AUDIO': {
      // Pre-cache specific audio URLs
      const { urls } = payload;
      if (urls && urls.length) {
        caches.open(AUDIO_CACHE).then(cache => {
          urls.forEach(url => {
            cache.match(url).then(cached => {
              if (!cached) {
                fetch(url).then(res => {
                  if (res.ok) cache.put(url, res);
                }).catch(() => {});
              }
            });
          });
        });
      }
      break;
    }

    case 'CACHE_URLS': {
      const { urls, cache: cacheName } = payload;
      if (urls && urls.length) {
        caches.open(cacheName || STATIC_CACHE).then(cache => {
          Promise.allSettled(urls.map(u => cache.add(u)));
        });
      }
      break;
    }

    case 'GET_CACHE_SIZE': {
      getCacheStats().then(stats => {
        event.source.postMessage({ type: 'CACHE_SIZE', payload: stats });
      });
      break;
    }

    case 'CLEAR_CACHE': {
      const { cacheName } = payload || {};
      if (cacheName) {
        caches.delete(cacheName).then(() => {
          event.source.postMessage({ type: 'CACHE_CLEARED', payload: { cacheName } });
        });
      } else {
        caches.keys().then(keys =>
          Promise.all(keys.filter(k => k.startsWith('mushaf-')).map(k => caches.delete(k)))
        ).then(() => {
          event.source.postMessage({ type: 'CACHE_CLEARED', payload: { all: true } });
        });
      }
      break;
    }
  }
});

// ─── Background sync ──────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'mushaf-sync') {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SYNC_TRIGGERED' });
        });
      })
    );
  }
});

// ─── Periodic background sync (if supported) ─────────────────

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'mushaf-periodic-sync') {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'PERIODIC_SYNC' });
        });
      })
    );
  }
});

// ─── Cache stats utility ──────────────────────────────────────

async function getCacheStats() {
  const stats = {};
  const keys = await caches.keys();
  for (const key of keys) {
    if (!key.startsWith('mushaf-')) continue;
    const cache = await caches.open(key);
    const entries = await cache.keys();
    stats[key] = entries.length;
  }
  return stats;
}
