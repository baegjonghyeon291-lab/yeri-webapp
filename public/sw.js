// 최소 PWA Service Worker (개발 중 캐시 방지)
const CACHE_NAME = 'jhyr-v1';

// 개발 모드 감지 (localhost 또는 IP:port)
const IS_DEV = self.location.hostname === 'localhost' ||
               /^\d+\.\d+\.\d+\.\d+$/.test(self.location.hostname);

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // 개발 모드: 캐시 없이 네트워크 직접 통과
  if (IS_DEV) return;

  const url = new URL(event.request.url);

  // API 요청은 캐시 안 함
  if (url.pathname.startsWith('/api/')) return;

  // 나머지는 네트워크 우선, 실패 시 캐시
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request)
    )
  );
});
