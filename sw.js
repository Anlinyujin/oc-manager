const CACHE_NAME = 'oc-manager-v3'; // <--- 这里改了，强制刷新缓存
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './css/style.css',
  './js/ui.js',
  './js/data.js',
  './js/markdown.js',
  './js/characters.js',
  './js/notes.js',
  './js/tags.js',
  './js/app.js'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // <--- 强制立即接管
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim(); // <--- 立即控制页面
});

self.addEventListener('fetch', event => {
  // 策略改为：网络优先，失败才走缓存（方便开发调试）
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 只有请求成功才更新缓存
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
