const CACHE = 'better-v3';
const ASSETS = [
  '.', 'index.html', 'styles.css', 'manifest.json',
  'js/util.js', 'js/data.js', 'js/runs.js', 'js/yearmap.js', 'js/wins.js', 'js/learn.js',
  'js/views/home.js', 'js/views/meals.js', 'js/views/train.js', 'js/views/urges.js', 'js/views/more.js',
  'js/app.js',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// network-first with cache fallback: updates arrive, offline keeps working.
// Only same-origin GETs are cached — the running-app API is never cached here.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
