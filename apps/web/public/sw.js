const STATIC_CACHE = "t26-static-v1";
const RUNTIME_CACHE = "t26-runtime-v1";
const OFFLINE_URL = "/offline.html";

const STATIC_ASSETS = [
  "/",
  "/today",
  "/login",
  "/manifest.json",
  "/icon-180.png",
  "/icon-192.png",
  "/icon-512.png",
  OFFLINE_URL
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  const isStaticAsset = /\.(?:js|css|png|jpg|jpeg|svg|ico|webp|woff|woff2)$/i.test(url.pathname);
  if (isStaticAsset) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

async function handleNavigation(request) {
  try {
    const network = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, network.clone());
    return network;
  } catch {
    const cachedPage = await caches.match(request);
    if (cachedPage) {
      return cachedPage;
    }

    const offlinePage = await caches.match(OFFLINE_URL);
    if (offlinePage) {
      return offlinePage;
    }

    return new Response("Sin conexión", {
      status: 503,
      statusText: "Offline"
    });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const network = await fetch(request);
    if (network.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, network.clone());
    }
    return network;
  } catch {
    return new Response("Recurso no disponible sin conexión", {
      status: 503,
      statusText: "Offline"
    });
  }
}

async function networkFirst(request) {
  try {
    const network = await fetch(request);

    if (network.ok && !request.url.includes("/api/auth/")) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, network.clone());
    }

    return network;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    return new Response("Sin conexión", {
      status: 503,
      statusText: "Offline"
    });
  }
}
