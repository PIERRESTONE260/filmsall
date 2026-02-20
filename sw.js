// On change le nom en 'v2' pour forcer la mise à jour du cache sur les téléphones
const CACHE_NAME = 'filmsall-v2';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './films.json',
  './manifest.json',
  './apropos.html',
  './demande.html',
  './images.html',
  
  // IMAGES IMPORTANTES
  './logo/filmsall.png', // Pour la barre de menu (Navbar)
  './logo/icon.svg'      // NOUVEAU : Pour l'installation sur téléphone (Indispensable !)
];

// 1. Installation du Service Worker
self.addEventListener('install', (event) => {
  // Force le nouveau Service Worker à s'activer immédiatement
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('FILMSall: Mise en cache des fichiers v2');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Activation et nettoyage des vieux caches (v1)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('Suppression de l\'ancien cache :', key);
          return caches.delete(key);
        }
      }));
    })
  );
  // Prend le contrôle de la page immédiatement
  return self.clients.claim();
});

// 3. Interception des requêtes (Mode Hors-Ligne)
self.addEventListener('fetch', (event) => {
  // On ne met pas en cache les vidéos Google Drive (trop lourd)
  if (event.request.url.includes('drive.google.com')) {
      return; 
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Si le fichier est dans le cache, on le rend, sinon on va le chercher sur internet
      return response || fetch(event.request);
    })
  );
});