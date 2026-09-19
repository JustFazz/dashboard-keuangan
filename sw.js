const CACHE_NAME = 'v2.1.4-b16'

const APP_SHELL = [
    './',
    './index.html',
    './style.css',
    './manifest.json',

    // Modul JavaScript
    './js/config.js',
    './js/firebase-config.js',
    './js/utils.js',
    './js/db.js',
    './js/sync.js',
    './js/ui.js',
    './js/storage.js',
    './js/test.js',
    './js/component-loader.js',
    './js/main.js',

    // Komponen HTML
    './components/lock-screen.html',
    './components/header.html',
    './components/input-page.html',
    './components/riwayat-page.html',
    './components/modals.html',

    // Media
    './sounds/success.mp3',
    './sounds/click.mp3'
];

// INSTALL: Pre-cache seluruh App Shell
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

// ACTIVATE: Hapus cache lama jika CACHE_NAME berubah
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// FETCH: Purni Cache First (Jaringan hanya dipanggil jika cache kosong)
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Bypass Firebase Realtime DB, Google Auth, & skema non-http
    if (
        url.origin.includes('firebase') ||
        url.origin.includes('googleapis') ||
        !url.protocol.startsWith('http')
    ) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            // 1. Jika ada di cache, langsung pakai tanpa background fetch
            if (cachedResponse) {
                return cachedResponse;
            }

            // 2. Jika tidak ada di cache, baru ambil dari jaringan & simpan
            return fetch(event.request)
                .then(networkResponse => {
                    if (
                        networkResponse &&
                        networkResponse.status === 200 &&
                        networkResponse.type === 'basic'
                    ) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                });
        })
    );
});
