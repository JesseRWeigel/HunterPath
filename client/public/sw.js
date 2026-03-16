const CACHE_NAME = "hunters-path-v4";
const BASE_PATH = "/HunterPath/";

// Audio files to precache for offline play
const audioFiles = [
  "sounds/attack.wav",
  "sounds/block.wav",
  "sounds/critical.wav",
  "sounds/damage.wav",
  "sounds/defeat.wav",
  "sounds/victory.wav",
  "sounds/heal.wav",
  "sounds/level_up.wav",
  "sounds/gate_enter.wav",
  "sounds/rest.wav",
  "sounds/rune_use.wav",
  "sounds/binding_start.wav",
  "sounds/binding_loop.wav",
  "sounds/binding_success.wav",
  "sounds/binding_failure.wav",
  "music/ambient.wav",
  "music/combat.wav",
  "music/victory.wav",
  "music/defeat.wav",
];

// Cache built assets - these are the actual files served by the server
const urlsToCache = [
  BASE_PATH,
  BASE_PATH + "index.html",
  BASE_PATH + "manifest.json",
  ...audioFiles.map((f) => BASE_PATH + f),
];

// Install event - cache resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Check if a request URL is for an audio file
function isAudioRequest(url) {
  return url.pathname.match(/\.(wav|mp3|ogg)$/);
}

// Fetch event - cache-first for audio, network-first for everything else
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  // Cache-first strategy for audio files (they don't change often)
  if (isAudioRequest(url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first strategy for all other requests
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and cache successful responses
        if (response && response.status === 200 && response.type === "basic") {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          // Return index.html for navigation requests (PWA routing)
          if (event.request.mode === "navigate") {
            return caches.match(BASE_PATH + "index.html");
          }
          // Return a basic error response for other requests
          return new Response("Offline", { status: 503 });
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
