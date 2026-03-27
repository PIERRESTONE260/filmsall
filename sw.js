const CACHE_NAME = 'filmsall-v3';
const ASSETS =[ 
  './', 
  './index.html', 
  './style.css', 
  './script.js', 
  './manifest.json', 
  './logo/filmsall.png', 
  './logo/icon.svg',
  './musique.json',
  './apropos.html',
  './contact.html', 
];

self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => { if(k !== CACHE_NAME) return caches.delete(k); })))); return self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('drive.google.com')) return; 
  if (e.request.url.includes('.json')) { e.respondWith(fetch(e.request).catch(() => caches.match(e.request))); return; }
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});