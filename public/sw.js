// ─── PWA Service Worker ─── Auto-update on every deploy ───
// CACHE_NAME은 빌드 시 generate-sw-version.js가 자동 교체
const CACHE_NAME = 'jhyr-92ecf3e-1775206892052';
const SHELL_URLS = ['/chat', '/watchlist', '/briefing', '/portfolio'];

// ── Install: 새 SW 즉시 활성화 ──
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// ── Activate: 구버전 캐시 전부 삭제 + 즉시 제어 ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Network-First, 성공 시 캐시 저장 ──
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API / 외부 요청은 캐시하지 않음
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) return;
  // POST 등 비-GET은 무시
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 성공 응답만 캐시 (opaque 제외)
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── Version check 메시지 핸들러 ──
self.addEventListener('message', (event) => {
  if (event.data === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: CACHE_NAME });
  }
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
