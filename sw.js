const CACHE_NAME = 'filmsall-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './films.json',
  './logo/filmsall.png',
  './manifest.json',
  './apropos.html',
  './demande.html',
  './images.html'
];

// 1. Installation du Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('FILMSall: Mise en cache des fichiers');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Activation et nettoyage des vieux caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
});

// 3. Interception des requêtes (Mode Hors-Ligne basique)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});