// Minimal offline support: cache the app shell so the trip guide still opens
// with patchy or no signal (useful island-to-island in Croatia). Anything
// cross-origin (Leaflet, Google Fonts, Open-Meteo, the Apps Script sync
// endpoint, Google Maps) is left alone and goes straight to the network --
// this only ever caches same-origin GET requests.

const CACHE_NAME = "trip-cache-v1";
const CORE_ASSETS = [
  "./",
  "index.html",
  "css/styles.css",
  "js/config.js",
  "js/data.js",
  "js/store.js",
  "js/app.js",
  "manifest.json",
  "favicon.svg",
  "favicon-32.png",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "assets/images/hero.jpg",
  "assets/images/rome.jpg",
  "assets/images/bari.jpg",
  "assets/images/dubrovnik.jpg",
  "assets/images/hvar.jpg",
  "assets/images/split.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((e) => console.warn("SW precache failed", e))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate: serve from cache immediately if present, and
// refresh the cache in the background from the network for next time.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
