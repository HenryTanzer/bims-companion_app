const CACHE = 'bims-v1'
const PRECACHE = ['/', '/login', '/offline']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle GET requests from the same origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // Skip Next.js internal routes
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(
      fetch(request).then(response => {
        const clone = response.clone()
        caches.open(CACHE).then(cache => cache.put(request, clone))
        return response
      }).catch(() => caches.match(request))
    )
    return
  }

  // Network-first for navigation and API requests
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE).then(cache => cache.put(request, clone))
        }
        return response
      })
      .catch(() =>
        caches.match(request).then(cached => {
          if (cached) return cached
          // For page navigations with no cached version, show offline page
          if (request.mode === 'navigate') {
            return caches.match('/offline')
          }
        })
      )
  )
})
