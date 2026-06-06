const CACHE_NAME = 'delta-offline-maps-v1';
const APPSCRIPT_CACHE = 'delta-gas-sync-v1';

self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    const isMapTile = url.hostname.includes('cartocdn.com') || 
                      url.hostname.includes('maplibre.org') || 
                      url.pathname.includes('.pmtiles') ||
                      url.pathname.endsWith('.pbf') ||
                      url.pathname.endsWith('.png');
                      
    const isFirebaseOrGas = url.hostname.includes('firebaseio.com') || url.hostname.includes('script.google.com');

    // 1. Offline Maps Caching Strategy: Stale-While-Revalidate
    if (isMapTile && event.request.method === 'GET') {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(event.request).then(response => {
                    const fetchPromise = fetch(event.request).then(networkResponse => {
                        // Put in cache automatically silently
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    }).catch(err => {
                        console.warn('Offline Maps Cache Used for: ', url.pathname);
                        return response;
                    });
                    
                    return response || fetchPromise;
                });
            })
        );
        return; // Handled
    }

    // 2. Data Sync Strategy if offline
    if (isFirebaseOrGas && event.request.method === 'POST') {
        // Simple passthrough, offline-sync for mutations is handled via Firebase native offline capabilities
        // Google Apps script fallback (Basic implementation)
        return; 
    }
});
