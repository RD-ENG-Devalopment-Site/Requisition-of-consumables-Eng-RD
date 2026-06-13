if (typeof self !== 'undefined' && self.addEventListener) {
  const CACHE_NAME = 'sup-v2';

  self.addEventListener('install', function() {
    self.skipWaiting();
  });

  self.addEventListener('activate', function(event) {
    event.waitUntil(
      caches.keys().then(function(names) {
        return Promise.all(names.map(function(name) { return caches.delete(name); }));
      }).then(function() {
        return self.clients.claim();
      })
    );
  });

  self.addEventListener('fetch', function(event) {
    if (event.request.method !== 'GET') return;
    event.respondWith(fetch(event.request));
  });
}
