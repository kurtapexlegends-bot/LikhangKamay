/**
 * LikhangKamay Static Asset Shell Service Worker
 *
 * Strategy:
 * - Cache-First for immutable Vite build assets (/build/assets/*) and static decoders (/draco/*)
 * - Cache-First for core static images and offline placeholders (/images/*)
 * - Strict Bypass for HTML navigation, Inertia JSON requests, and backend APIs
 *   to ensure dynamic sessions, auth state, and fresh CSRF tokens are never corrupted.
 */

const CACHE_NAME = 'likhangkamay-static-v1';

// Critical static assets pre-cached on install
const PRECACHE_ASSETS = [
    '/images/placeholder.svg',
    '/images/no-image.png',
    '/favicon.ico',
    '/draco/gltf/draco_decoder.wasm',
    '/draco/gltf/draco_decoder_gltf.wasm',
    '/draco/gltf/draco_decoder.js',
    '/draco/gltf/draco_wasm_wrapper.js',
];

// 1. Install event: pre-cache static shell fallbacks
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            await Promise.all(
                PRECACHE_ASSETS.map((asset) =>
                    cache.add(asset).catch((err) => {
                        // Tolerate optional/missing precache items without aborting SW install
                        console.debug('[SW] Precache optional asset skipped:', asset, err);
                    })
                )
            );
        }).then(() => self.skipWaiting())
    );
});

// 2. Activate event: purge stale cache versions and claim immediate client control
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.map((key) => {
                    if (key.startsWith('likhangkamay-') && key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                    return Promise.resolve();
                })
            )
        ).then(() => self.clients.claim())
    );
});

// 3. Fetch event: Cache-First for static assets, Strict Bypass for navigation & dynamic APIs
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Only process idempotent GET requests
    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);

    // Only handle HTTP/HTTPS protocols
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Only handle same-origin requests for the static asset shell
    if (url.origin !== self.location.origin) {
        return;
    }

    // CRITICAL SAFETY GUARDS:
    // Pure network bypass for navigation, Inertia state, and mutating/dynamic APIs.
    // Never serve stale HTML or cached responses for routes needing fresh CSRF tokens or authentication state.
    const isNavigation = request.mode === 'navigate' || request.destination === 'document' || Boolean(request.headers.get('accept')?.includes('text/html'));
    const isInertia = Boolean(request.headers.get('x-inertia'));
    const isDynamicRoute =
        url.pathname.startsWith('/api/') ||
        url.pathname.startsWith('/webhooks/') ||
        url.pathname.startsWith('/sanctum/') ||
        url.pathname.startsWith('/broadcasting/') ||
        url.pathname.startsWith('/auth/') ||
        url.pathname === '/login' ||
        url.pathname === '/logout' ||
        url.pathname === '/register' ||
        url.pathname === '/ping';

    if (isNavigation || isInertia || isDynamicRoute) {
        // Bypass Service Worker completely, delegating directly to normal browser networking
        return;
    }

    // Determine if request is an immutable static asset
    const isHashedAsset = url.pathname.startsWith('/build/assets/');
    const isDracoDecoder = url.pathname.startsWith('/draco/');
    const isStaticImage = url.pathname.startsWith('/images/') || url.pathname === '/favicon.ico';
    const isStaticModel = url.pathname.startsWith('/models/');

    if (isHashedAsset || isDracoDecoder || isStaticImage || isStaticModel) {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(request).then((networkResponse) => {
                    // Only cache successful basic or cors responses (exclude opaque / error responses)
                    if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseToCache);
                        });
                    }
                    return networkResponse;
                }).catch((error) => {
                    // Offline fallback for failed image requests
                    if (request.destination === 'image' || url.pathname.match(/\.(png|jpe?g|svg|webp|avif|gif)$/i)) {
                        return caches.match('/images/placeholder.svg').then((fallback) => {
                            if (fallback) {
                                return fallback;
                            }
                            const svgFallback = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="#a65638" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                            return new Response(svgFallback, {
                                headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' }
                            });
                        });
                    }
                    throw error;
                });
            })
        );
    }
});
