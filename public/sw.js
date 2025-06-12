const CACHE_NAME = 'offline-cache-v1';
// The offline page URL. IMPORTANT: This must match the actual URL that serves the offline page content.
// From offline-handler.js, it seems to fetch '/offline-template'.
// We should also cache the main offline HTML structure if it's a static asset or rendered by a simple route.
// For this task, let's assume '/offline-template' is the key resource to cache,
// and also cache the static fallback whale SVG if it's not already embedded or fetched elsewhere by the offline page.
// The offline.html.twig includes svg/whale.svg.twig, so it's part of that template.
// Let's also cache the base-empty.html.twig as it's the parent of offline.html.twig
const OFFLINE_URL = '/offline-template'; // This is the endpoint that provides the offline HTML content.
const OFFLINE_PAGE_ASSETS = [
    OFFLINE_URL,
    // Add other critical assets for the offline page if they are not inlined.
    // e.g., '/css/app/custom.css', '/css/tabler.min.css'
    // For now, just the offline template URL. The browser should handle associated CSS/JS if offline.html.twig links them.
    // However, the whale SVG is included in offline.html.twig, so it should be part of the OFFLINE_URL fetch.
    // Let's add the main CSS to be safe, as offline.html.twig extends base-empty.html.twig which might need them.
    '/css/tabler.min.css',
    '/css/app/tabler.custom.css',
    '/css/app/connection-indicator.css', // The new CSS for the indicator
    '/images/fruit.png' // The site favicon, often requested
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache and caching offline page assets');
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
                    console.log('Fetch failed; returning offline page from cache for navigation request.');
                    return caches.match(OFFLINE_URL);
                })
        );
        return;
    }

    // For non-navigation requests, try cache first, then network.
    // This is a common strategy but can be adjusted.
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                return response || fetch(event.request);
            })
            .catch(() => {
                // If both cache and network fail (e.g. for an asset not in OFFLINE_PAGE_ASSETS during offline),
                // and if it's an image, you could return a fallback image. For now, just let it fail.
                console.log('Fetch failed for non-navigation request:', event.request.url);
            })
    );
});
