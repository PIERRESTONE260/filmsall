// On passe à la V3 pour forcer la mise à jour immédiate chez tout le monde
const CACHE_NAME = 'filmsall-v3';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './apropos.html',
  './demande.html',
  './images.html',
  './logo/filmsall.png',
  './logo/icon.svg' 
];

// 1. Installation
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force l'activation immédiate
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('FILMSall: Mise en cache v3');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Activation (Nettoyage)
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
  return self.clients.claim();
});

// 3. Interception des requêtes (LE SECRET EST ICI)
self.addEventListener('fetch', (event) => {
  
  // A. Ignorer Google Drive (Streaming)
  if (event.request.url.includes('drive.google.com')) {
      return; 
  }

  // B. IMPORTANT : Toujours chercher films.json sur Internet (pas dans le cache)
  // Comme ça, dès que tu ajoutes un film, il apparaît direct !
  if (event.request.url.includes('films.json')) {
      event.respondWith(
          fetch(event.request).catch(() => caches.match(event.request))
      );
      return;
  }

  // C. Pour le reste (Images, CSS, JS), on utilise le cache pour la vitesse
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});