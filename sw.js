/**
 * Service Worker - Monitoring Toko (HP2)
 * Bertugas menyimpan App Shell ke cache agar aplikasi bisa dibuka offline.
 * TIDAK MENANGANI sinkronisasi Firebase (Sinkronisasi ditangani langsung oleh aplikasi JS).
 */

const CACHE_NAME = "monitoring-toko-v1";

// Daftar aset statis (App Shell) yang harus disimpan di cache
const ASSETS_TO_CACHE = [
    "./",
    "./index.html",
    "./style.css",
    "./config.js",
    "./firebase-config.js",
    "./manifest.json",
    "./js/utils.js",
    "./js/db.js",
    "./js/sync.js",
    "./js/ui.js",
    "./js/main.js",
    "https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth-compat.js",
    "https://www.gstatic.com/firebasejs/12.18.0/firebase-database-compat.js",
    "https://cdn.jsdelivr.net/npm/chart.js"
];

// Event 1: Install - Menyimpan semua aset ke cache
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("[SW] Caching App Shell...");
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => {
            return self.skipWaiting();
        })
    );
});

// Event 2: Activate - Membersihkan cache versi lama saat terjadi pembaruan (v1 -> v2)
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log("[SW] Deleting old cache:", cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// Event 3: Fetch - Strategi Cache-First untuk App Shell
self.addEventListener("fetch", (event) => {
    // Abaikan request bukan GET atau request ke Firebase Realtime Database / Auth API
    if (event.request.method !== "GET" || event.request.url.includes("firebasedatabase.app") || event.request.url.includes("identitytoolkit")) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Kembalikan aset dari cache lokal
                return cachedResponse;
            }
            // Jika tidak ada di cache, ambil dari jaringan
            return fetch(event.request);
        })
    );
});
