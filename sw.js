// Minimal offline support: cache the app shell so the trip guide still opens
// with patchy or no signal (useful island-to-island in Croatia). Anything
// cross-origin (Leaflet, Google Fonts, Open-Meteo, the Apps Script sync
// endpoint, Google Maps) is left alone and goes straight to the network --
// this only ever caches same-origin GET requests.

const CACHE_NAME = "trip-cache-v19";
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

// App shell code (html/css/js/json) is network-first: always try to fetch the
// latest deploy, and only fall back to the cache if there's no connection.
// This is deliberate -- this site gets redeployed constantly, and serving a
// cached copy of the code ahead of the network (stale-while-revalidate) means
// a fresh push can take an extra reload or two to actually show up.
function isCodeAsset(pathname) {
  return pathname.endsWith(".html") || pathname.endsWith(".js") || pathname.endsWith(".css") ||
    pathname.endsWith(".json") || pathname.endsWith("/");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (isCodeAsset(url.pathname)) {
    event.respondWith(
      // cache: "no-store" is the important part -- GitHub Pages serves this
      // repo's JS/CSS with `Cache-Control: max-age=600`, so a plain fetch()
      // here can silently be satisfied from the browser's own HTTP cache
      // instead of actually hitting the network, even though the intent of
      // this whole code path is "always get the latest deploy."
      fetch(req, { cache: "no-store" })
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Images and icons rarely change -- cache-first, refresh in the background.
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
