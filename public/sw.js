const CACHE_NAME = 'offline-cache-v2'; // Incremented cache version
// The offline page URL. IMPORTANT: This must match the actual URL that serves the offline page content.
// From offline-handler.js, it seems to fetch '/offline-template'.
const OFFLINE_URL = '/offline-template'; // This is the endpoint that provides the offline HTML content.

const OFFLINE_PAGE_ASSETS = [
    OFFLINE_URL,
    '/css/tabler.min.css',
    '/css/app/tabler.custom.css',
    '/css/app/connection-indicator.css', // The new CSS for the indicator
    '/css/app/gradients-bg.css',         // Added for offline page background
    '/images/fruit.png',                 // The site favicon, often requested
    '/js/tabler.min.js',                 // Added, as base-empty.html.twig includes it
    '/js/app/index.js'                   // Added, as base-empty.html.twig includes it
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache and caching offline page assets for version:', CACHE_NAME);
                return cache.addAll(OFFLINE_PAGE_ASSETS);
            })
            .then(() => self.skipWaiting()) // Activate worker immediately
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control of uncontrolled clients
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    // If the fetch fails (offline), serve the cached offline page.
                    console.log('Fetch failed for navigation request; returning offline page from cache:', OFFLINE_URL);
                    return caches.match(OFFLINE_URL);
                })
        );
        return; // Important to return after responding.
    }

    // For non-navigation requests, try cache first, then network.
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return response from cache if found, otherwise fetch from network.
                return response || fetch(event.request)
                    .catch(error => {
                        // Handle network fetch errors for non-navigation requests.
                        // This could be important if an asset is critical and not cached,
                        // but for now, just logging. Could return a specific fallback if needed.
                        console.log('Network fetch failed for non-navigation request:', event.request.url, error);
                        // Re-throw the error to ensure the promise chain is correctly handled if this catch is meant to be informational only.
                        // Or, return a generic fallback if applicable: return new Response('Asset not available offline', { status: 404 });
                        throw error;
                    });
            })
            .catch((error) => { // This catches errors from caches.match or from the re-thrown fetch error.
                console.log('Cache match or network fetch failed for non-navigation request:', event.request.url, error);
                // Optionally, return a fallback for specific asset types, e.g., a placeholder image.
                // For now, let the browser handle the failed asset request.
            })
    );
});
