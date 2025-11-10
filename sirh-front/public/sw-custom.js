// Service Worker personnalisé pour SMART RH
const CACHE_NAME = 'smart-rh-v3.1.3';
const API_CACHE = 'smart-rh-api-cache';

// Fichiers à mettre en cache
const STATIC_FILES = [
  '/',
  '/index.html',
  '/assets/',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/manifest.json'
];

// URLs à exclure du cache
const EXCLUDE_PATTERNS = [
  /\/api\/auth/,
  /\/api\/logout/,
  /version\.json/
];

// Installation du service worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching static files');
      return cache.addAll(STATIC_FILES);
    }).then(() => {
      // Forcer l'activation immédiate
      return self.skipWaiting();
    })
  );
});

// Activation du service worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    Promise.all([
      // Nettoyer les anciens caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && cacheName !== API_CACHE;
            })
            .map((cacheName) => {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // Prendre le contrôle immédiatement
      self.clients.claim()
    ])
  );
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ne pas intercepter les requêtes exclues
  if (EXCLUDE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return;
  }

  // Stratégie pour les fichiers statiques
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        // Si le fichier est en cache, le retourner
        if (cachedResponse) {
          // Vérifier en arrière-plan s'il y a une nouvelle version
          fetch(request).then((fetchResponse) => {
            if (fetchResponse && fetchResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, fetchResponse.clone());
              });
            }
          }).catch(() => {
            // Ignorer les erreurs de réseau en arrière-plan
          });
          
          return cachedResponse;
        }
        
        // Sinon, récupérer depuis le réseau et mettre en cache
        return fetch(request).then((fetchResponse) => {
          if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
            return fetchResponse;
          }
          
          const responseToCache = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          
          return fetchResponse;
        }).catch(() => {
          // En cas d'erreur réseau, retourner une page d'erreur personnalisée
          if (request.destination === 'document') {
            return new Response(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>Hors ligne - SMART RH</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body { 
                    font-family: Arial, sans-serif; 
                    text-align: center; 
                    padding: 50px; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    min-height: 100vh;
                    margin: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;
                  }
                  .container {
                    background: rgba(255, 255, 255, 0.1);
                    padding: 40px;
                    border-radius: 15px;
                    backdrop-filter: blur(10px);
                  }
                  .retry-btn {
                    background: #4CAF50;
                    color: white;
                    padding: 15px 30px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                    margin-top: 20px;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>📱 SMART RH</h1>
                  <h2>🚫 Pas de connexion internet</h2>
                  <p>Vous êtes actuellement hors ligne. Vérifiez votre connexion et réessayez.</p>
                  <button class="retry-btn" onclick="window.location.reload()">
                    🔄 Réessayer
                  </button>
                </div>
              </body>
              </html>
            `, {
              headers: {
                'Content-Type': 'text/html; charset=utf-8',
              },
            });
          }
        });
      })
    );
  }
});

// Écouter les messages du client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: Skipping waiting...');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLIENTS_CLAIM') {
    console.log('Service Worker: Claiming clients...');
    self.clients.claim();
  }
});

// Notification de mise à jour disponible
self.addEventListener('message', (event) => {
  if (event.data === 'checkForUpdates') {
    // Vérifier s'il y a une nouvelle version
    fetch('/version.json?' + Date.now())
      .then(response => response.json())
      .then(versionData => {
        event.ports[0].postMessage({
          type: 'VERSION_INFO',
          version: versionData.version,
          buildTime: versionData.buildTime
        });
      })
      .catch(() => {
        event.ports[0].postMessage({
          type: 'VERSION_ERROR',
          message: 'Impossible de vérifier la version'
        });
      });
  }
});

console.log('Service Worker: Script loaded for SMART RH v3.1.3');
