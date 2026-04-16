// GastOS Service Worker
// Strategy:
//   - Static assets (JS/CSS/fonts/images): cache-first, update in background
//   - HTML navigation: network-first, serve cached shell on offline
//   - Supabase API / external calls: network-only (encrypted user data, never cache)

const CACHE_VERSION = "gastos-v1"
const SHELL_CACHE   = `${CACHE_VERSION}-shell`
const ASSET_CACHE   = `${CACHE_VERSION}-assets`

// App shell: the minimal set of URLs needed to render the app offline
const SHELL_URLS = ["/", "/offline"]

const SUPABASE_ORIGIN = "supabase.co"
const RESEND_ORIGIN   = "resend.com"

// ── Install: pre-cache the app shell ─────────────────────────────────────────
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  )
})

// ── Activate: remove old caches ───────────────────────────────────────────────
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== SHELL_CACHE && k !== ASSET_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// ── Fetch: routing logic ──────────────────────────────────────────────────────
self.addEventListener("fetch", event => {
  const { request } = event
  const url = new URL(request.url)

  // Never intercept external APIs (Supabase, Resend) or non-GET
  if (
    request.method !== "GET" ||
    url.hostname.includes(SUPABASE_ORIGIN) ||
    url.hostname.includes(RESEND_ORIGIN) ||
    url.pathname.startsWith("/api/")
  ) {
    return
  }

  // Static assets (_next/static, images, fonts): cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    /\.(png|jpg|jpeg|svg|ico|woff2?|ttf)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(cache =>
        cache.match(request).then(cached => {
          if (cached) {
            // Refresh in background
            fetch(request).then(res => { if (res.ok) cache.put(request, res.clone()) }).catch(() => {})
            return cached
          }
          return fetch(request).then(res => {
            if (res.ok) cache.put(request, res.clone())
            return res
          })
        })
      )
    )
    return
  }

  // HTML navigation: network-first, fall back to cached shell
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            caches.open(SHELL_CACHE).then(c => c.put(request, res.clone()))
          }
          return res
        })
        .catch(() =>
          caches.match(request)
            .then(cached => cached ?? caches.match("/offline") ?? caches.match("/"))
        )
    )
  }
})
