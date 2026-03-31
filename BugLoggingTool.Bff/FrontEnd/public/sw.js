// // // public/sw.js
// // // ⚠️  __SW_CACHE_VERSION__ is replaced by vite.config.js at build time.
// // //     Never edit this string manually.
// // const CACHE_VERSION = '__SW_CACHE_VERSION__';
// // const CACHE_NAME    = CACHE_VERSION;   // e.g. "blt-cache-1.0.0-1711234567890"

// // console.log('[SW] Loaded. Cache key:', CACHE_NAME);

// // // ── Never cache these — must always be fresh ──────────────────────────────────
// // const NEVER_CACHE = [
// //   '/index.html',
// //   '/',
// //   '/version.json',
// //   '/sw.js',
// //   '/manifest.json',
// //   'localhost:42080',    // BLT Agent API
// //   '127.0.0.1:42080',   // BLT Agent API (alt)
// // ];

// // // ── Cache-first assets (content-hashed, safe to cache forever) ───────────────
// // const CACHE_FIRST_PATTERNS = [
// //   '/assets/',   // Vite outputs all JS/CSS here with hash in filename
// //   '/icons/',
// // ];

// // // ── Extension / dev tooling — ignore completely ──────────────────────────────
// // const IGNORE_PATTERNS = [
// //   'chrome-extension://',
// //   '__vite',
// //   '/sockjs/',
// //   '/@vite/',
// //   '/@fs/',
// //   'hot-update',
// // ];

// // /* ═══════════════════════════════════════════════════════════════════════════
// //    INSTALL — cache core assets
// // ═══════════════════════════════════════════════════════════════════════════ */
// // // self.addEventListener('install', event => {
// // //   console.log('[SW] Installing:', CACHE_NAME);
// // //   event.waitUntil(
// // //     caches.open(CACHE_NAME)
// // //       .then(cache => cache.addAll(['/icons/icon-192.png', '/icons/icon-512.png']))
// // //       .then(() => self.skipWaiting())   // activate immediately — don't wait for tabs to close
// // //       .catch(err => console.warn('[SW] Install cache error (non-fatal):', err))
// // //   );
// // // });

// // self.addEventListener('install', event => {
// //   event.waitUntil(
// //     caches.open(CACHE_NAME)
// //       .then(cache => {
// //         // Try to pre-cache icons — failure is non-fatal, doesn't block install
// //         return cache.addAll(['/icons/icon-192.png', '/icons/icon-512.png'])
// //           .catch(err => console.warn('[SW] Icon pre-cache failed (non-fatal):', err));
// //       })
// //       .then(() => self.skipWaiting())   // always fires now
// //       .then(() => console.log('[SW] Installed:', CACHE_NAME))
// //   );
// // });

// // /* ═══════════════════════════════════════════════════════════════════════════
// //    ACTIVATE — delete ALL old caches by name mismatch
// // ═══════════════════════════════════════════════════════════════════════════ */
// // self.addEventListener('activate', event => {
// //   console.log('[SW] Activating:', CACHE_NAME);
// //   event.waitUntil(
// //     caches.keys()
// //       .then(keys => Promise.all(
// //         keys
// //           .filter(k => k !== CACHE_NAME)
// //           .map(k => {
// //             console.log('[SW] Deleting stale cache:', k);
// //             return caches.delete(k);
// //           })
// //       ))
// //       .then(() => self.clients.claim())  // take control of all open tabs immediately
// //       .then(() => notifyClients({ type: 'SW_ACTIVATED', version: CACHE_NAME }))
// //   );
// // });

// // /* ═══════════════════════════════════════════════════════════════════════════
// //    FETCH — routing strategy
// // ═══════════════════════════════════════════════════════════════════════════ */
// // self.addEventListener('fetch', event => {
// //   const { request } = event;
// //   const url = request.url;

// //   // 1. Non-HTTP — pass through (file://, chrome-extension://, etc.)
// //   if (!url.startsWith('http')) return;

// //   // 2. Dev tooling — pass through
// //   if (IGNORE_PATTERNS.some(p => url.includes(p))) return;

// //   // 3. Never-cache list — always hit the network
// //   if (shouldNeverCache(url)) {
// //     event.respondWith(
// //       fetch(request).catch(() => {
// //         // navigation offline fallback only
// //         if (request.mode === 'navigate') return offlineFallback();
// //       })
// //     );
// //     return;
// //   }

// //   // 4. Hashed assets — cache-first (safe: filename changes on every build)
// //   if (CACHE_FIRST_PATTERNS.some(p => url.includes(p))) {
// //     event.respondWith(cacheFirst(request));
// //     return;
// //   }

// //   // 5. Everything else — network-first (stale fallback if offline)
// //   event.respondWith(networkFirst(request));
// // });

// // /* ═══════════════════════════════════════════════════════════════════════════
// //    STRATEGIES
// // ═══════════════════════════════════════════════════════════════════════════ */
// // function shouldNeverCache(url) {
// //   return NEVER_CACHE.some(p => url.includes(p));
// // }

// // async function cacheFirst(request) {
// //   const cached = await caches.match(request);
// //   if (cached) return cached;
// //   try {
// //     const response = await fetch(request);
// //     if (response.ok) {
// //       const cache = await caches.open(CACHE_NAME);
// //       cache.put(request, response.clone());
// //     }
// //     return response;
// //   } catch {
// //     if (request.mode === 'navigate') return offlineFallback();
// //     throw new Error(`[SW] Cache-first failed for: ${request.url}`);
// //   }
// // }

// // async function networkFirst(request) {
// //   try {
// //     const response = await fetch(request);
// //     if (response.ok) {
// //       const cache = await caches.open(CACHE_NAME);
// //       cache.put(request, response.clone());
// //     }
// //     return response;
// //   } catch {
// //     const cached = await caches.match(request);
// //     if (cached) return cached;
// //     if (request.mode === 'navigate') return offlineFallback();
// //     throw new Error(`[SW] Network-first failed for: ${request.url}`);
// //   }
// // }

// // async function offlineFallback() {
// //   const cache  = await caches.open(CACHE_NAME);
// //   const cached = await cache.match('/index.html') || await cache.match('/');
// //   if (cached) return cached;

// //   return new Response(
// //     `<!DOCTYPE html><html><head>
// //        <title>BLT — Offline</title>
// //        <meta name="viewport" content="width=device-width,initial-scale=1">
// //        <style>
// //          body{font-family:'Segoe UI',sans-serif;display:flex;align-items:center;
// //               justify-content:center;min-height:100vh;margin:0;
// //               background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;text-align:center;padding:20px}
// //          h2{margin:0 0 12px}p{opacity:.9;margin:0 0 24px}
// //          button{padding:12px 28px;background:#fff;color:#667eea;border:none;
// //                 border-radius:8px;font-size:15px;font-weight:600;cursor:pointer}
// //        </style>
// //      </head><body>
// //        <div>
// //          <div style="font-size:56px;margin-bottom:16px">📴</div>
// //          <h2>BLT is Offline</h2>
// //          <p>Your data is safe. Reports will sync when the connection is restored.</p>
// //          <button onclick="location.reload()">Try Again</button>
// //        </div>
// //      </body></html>`,
// //     { status: 200, headers: { 'Content-Type': 'text/html' } }
// //   );
// // }

// // /* ═══════════════════════════════════════════════════════════════════════════
// //    MESSAGES from app
// // ═══════════════════════════════════════════════════════════════════════════ */
// // self.addEventListener('message', event => {
// //   if (event.data?.type === 'SKIP_WAITING') {
// //     console.log('[SW] SKIP_WAITING received — activating now');
// //     self.skipWaiting();
// //   }
// //   if (event.data?.type === 'GET_VERSION') {
// //     event.ports[0]?.postMessage({ version: CACHE_NAME });
// //   }
// // });

// // /* ═══════════════════════════════════════════════════════════════════════════
// //    HELPERS
// // ═══════════════════════════════════════════════════════════════════════════ */
// // async function notifyClients(message) {
// //   const allClients = await self.clients.matchAll({ type: 'window' });
// //   allClients.forEach(c => c.postMessage(message));
// // }

// // self.addEventListener('error',              e => console.error('[SW] Error:', e.error));
// // self.addEventListener('unhandledrejection', e => console.error('[SW] Unhandled rejection:', e.reason));

// // public/sw.js
// // ⚠️  __SW_CACHE_VERSION__ is replaced by vite.config.js at build time.
// //     Never edit this string manually.
// const CACHE_VERSION = '__SW_CACHE_VERSION__';
// const CACHE_NAME    = CACHE_VERSION;
// const SHELL_KEY     = 'blt-app-shell';   // dedicated key for the navigation response

// console.log('[SW] Loaded. Cache key:', CACHE_NAME);

// // ── Never cache — always fresh from network, no offline fallback ─────────────
// const NEVER_CACHE = [
//   '/version.json',
//   '/sw.js',
//   '/manifest.json',
//   'localhost:42080',
//   '127.0.0.1:42080',
// ];

// // ── Cache-first — content-hashed, safe forever ───────────────────────────────
// const CACHE_FIRST_PATTERNS = [
//   '/assets/',
//   '/icons/',
// ];

// // ── Dev tooling / extensions — ignore completely ─────────────────────────────
// const IGNORE_PATTERNS = [
//   'chrome-extension://',
//   '__vite',
//   '/sockjs/',
//   '/@vite/',
//   '/@fs/',
//   'hot-update',
// ];

// /* ═══════════════════════════════════════════════════════════════════════════
//    INSTALL — cache icons only (app shell cached at runtime, not install)
// ═══════════════════════════════════════════════════════════════════════════ */
// self.addEventListener('install', event => {
//   console.log('[SW] Installing:', CACHE_NAME);
//   event.waitUntil(
//     (async () => {
//       // Pre-cache icons
//       try {
//         const assetCache = await caches.open(CACHE_NAME);
//         await assetCache.addAll(['/icons/icon-192.png', '/icons/icon-512.png']);
//       } catch (err) {
//         console.warn('[SW] Icon pre-cache failed (non-fatal):', err);
//       }

//       // Pre-cache the app shell at install time so offline works immediately
//       // without needing to visit the page online first
//       try {
//         const shellCache = await caches.open(SHELL_KEY);
//         const existing   = await shellCache.match(SHELL_KEY);
//         if (!existing) {
//           // Only fetch if not already cached — avoids redundant request on update
//           const shellResp = await fetch('/', { cache: 'no-store' });
//           if (shellResp.ok) {
//             await shellCache.put(SHELL_KEY, shellResp);
//             console.log('[SW] App shell pre-cached at install');
//           }
//         } else {
//           console.log('[SW] App shell already in cache — skipping install fetch');
//         }
//       } catch (err) {
//         // Non-fatal — navigationFirst will cache it on first online visit
//         console.warn('[SW] Shell pre-cache at install failed (non-fatal):', err);
//       }

//       await self.skipWaiting();
//       console.log('[SW] Installed:', CACHE_NAME);
//     })()
//   );
// });

// /* ═══════════════════════════════════════════════════════════════════════════
//    ACTIVATE — delete ALL old caches
// ═══════════════════════════════════════════════════════════════════════════ */
// self.addEventListener('activate', event => {
//   console.log('[SW] Activating:', CACHE_NAME);
//   event.waitUntil(
//     caches.keys()
//       .then(keys => Promise.all(
//         keys
//           .filter(k => k !== CACHE_NAME && k !== SHELL_KEY)
//           .map(k => {
//             console.log('[SW] Deleting stale cache:', k);
//             return caches.delete(k);
//           })
//       ))
//       .then(() => self.clients.claim())
//       .then(() => notifyClients({ type: 'SW_ACTIVATED', version: CACHE_NAME }))
//   );
// });

// /* ═══════════════════════════════════════════════════════════════════════════
//    FETCH — routing strategy
// ═══════════════════════════════════════════════════════════════════════════ */
// self.addEventListener('fetch', event => {
//   const { request } = event;
//   const url = request.url;

//   // 1. Non-HTTP — pass through
//   if (!url.startsWith('http')) return;

//   // 2. Dev tooling — pass through
//   if (IGNORE_PATTERNS.some(p => url.includes(p))) return;

//   // 3. Navigation requests (page loads) — network-first, cache shell for offline
//   if (request.mode === 'navigate') {
//     event.respondWith(navigationFirst(request));
//     return;
//   }

//   // 4. Never cache — always network, no fallback
//   if (NEVER_CACHE.some(p => url.includes(p))) {
//     event.respondWith(fetch(request).catch(() =>
//       new Response(null, { status: 503, statusText: 'Offline' })
//     ));
//     return;
//   }

//   // 5. Hashed assets — cache-first forever
//   if (CACHE_FIRST_PATTERNS.some(p => url.includes(p))) {
//     event.respondWith(cacheFirst(request));
//     return;
//   }

//   // 6. Everything else — network-first
//   event.respondWith(networkFirst(request));
// });

// /* ═══════════════════════════════════════════════════════════════════════════
//    STRATEGIES
// ═══════════════════════════════════════════════════════════════════════════ */

// // Navigation — stale-while-revalidate for app shell.
// // Serve cache IMMEDIATELY if available, fetch fresh in background.
// // This eliminates the race between offline detection and cache lookup.
// async function navigationFirst(request) {
//   // 1. Try to get the cached shell immediately
//   let cachedShell = null;
//   try {
//     const shellCache = await caches.open(SHELL_KEY);
//     cachedShell = await shellCache.match(SHELL_KEY);
//   } catch (err) {
//     console.warn('[SW] Shell cache read failed:', err);
//   }

//   // 2. Always attempt network fetch (update shell in background or return fresh)
//   const networkFetch = fetch(request)
//     .then(async response => {
//       if (response.ok) {
//         try {
//           const shellCache = await caches.open(SHELL_KEY);
//           await shellCache.put(SHELL_KEY, response.clone());
//           console.log('[SW] App shell updated in cache');
//         } catch (err) {
//           console.warn('[SW] Shell cache write failed:', err);
//         }
//       }
//       return response;
//     })
//     .catch(err => {
//       console.log('[SW] Network fetch failed (offline?):', err.message);
//       return null; // signal network failure
//     });

//   // 3a. If we have a cached shell — serve it immediately, update in background
//   if (cachedShell) {
//     console.log('[SW] Serving cached shell immediately');
//     // Update shell in background without blocking response
//     networkFetch.catch(() => {});
//     return cachedShell;
//   }

//   // 3b. No cached shell — wait for network
//   console.log('[SW] No cached shell — waiting for network...');
//   const networkResponse = await networkFetch;
//   if (networkResponse) {
//     return networkResponse;
//   }

//   // 3c. Network failed AND no cache — last resort inline fallback
//   console.warn('[SW] Offline with no shell cached — showing offline page');
//   return offlineFallback();
// }

// async function cacheFirst(request) {
//   const cached = await caches.match(request);
//   if (cached) return cached;
//   try {
//     const response = await fetch(request);
//     if (response.ok) {
//       const cache = await caches.open(CACHE_NAME);
//       cache.put(request, response.clone());
//     }
//     return response;
//   } catch {
//     return new Response(null, { status: 503, statusText: 'Offline' });
//   }
// }

// async function networkFirst(request) {
//   try {
//     const response = await fetch(request);
//     if (response.ok) {
//       const cache = await caches.open(CACHE_NAME);
//       cache.put(request, response.clone());
//     }
//     return response;
//   } catch {
//     const cached = await caches.match(request);
//     if (cached) return cached;
//     return new Response(null, { status: 503, statusText: 'Offline' });
//   }
// }

// // Only shown on very first visit when user is already offline
// async function offlineFallback() {
//   return new Response(
//     `<!DOCTYPE html><html><head>
//        <meta charset="UTF-8">
//        <title>BLT — Offline</title>
//        <meta name="viewport" content="width=device-width,initial-scale=1">
//        <style>
//          body{font-family:'Segoe UI',sans-serif;display:flex;align-items:center;
//               justify-content:center;min-height:100vh;margin:0;
//               background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;
//               text-align:center;padding:20px}
//          h2{margin:0 0 12px}p{opacity:.9;margin:0 0 24px}
//          button{padding:12px 28px;background:#fff;color:#667eea;border:none;
//                 border-radius:8px;font-size:15px;font-weight:600;cursor:pointer}
//        </style>
//      </head><body>
//        <div>
//          <div style="font-size:56px;margin-bottom:16px">&#x1F4F4;</div>
//          <h2>BLT is Offline</h2>
//          <p>Please visit BLT while online at least once to enable offline mode.</p>
//          <button onclick="location.reload()">Try Again</button>
//        </div>
//      </body></html>`,
//     { status: 200, headers: { 'Content-Type': 'text/html; charset=UTF-8' } }
//   );
// }

// /* ═══════════════════════════════════════════════════════════════════════════
//    MESSAGES from app
// ═══════════════════════════════════════════════════════════════════════════ */
// self.addEventListener('message', event => {
//   if (event.data?.type === 'SKIP_WAITING') {
//     console.log('[SW] SKIP_WAITING received — activating now');
//     self.skipWaiting();
//   }
//   if (event.data?.type === 'GET_VERSION') {
//     event.ports[0]?.postMessage({ version: CACHE_NAME });
//   }
// });

// /* ═══════════════════════════════════════════════════════════════════════════
//    HELPERS
// ═══════════════════════════════════════════════════════════════════════════ */
// async function notifyClients(message) {
//   const allClients = await self.clients.matchAll({ type: 'window' });
//   allClients.forEach(c => c.postMessage(message));
// }

// self.addEventListener('error',              e => console.error('[SW] Error:', e.error));
// self.addEventListener('unhandledrejection', e => console.error('[SW] Unhandled rejection:', e.reason));

const CACHE_VERSION = 'blt-cache-1.0.44-1774962970421';
const CACHE_NAME    = CACHE_VERSION;
const SHELL_KEY     = 'blt-app-shell';   // dedicated key for the navigation response

console.log('[SW] Loaded. Cache key:', CACHE_NAME);

// ── Never cache — always fresh from network, no offline fallback ─────────────
const NEVER_CACHE = [
  '/version.json',
  '/sw.js',
  '/manifest.json',
  'localhost:42080',
  '127.0.0.1:42080',
];

// ── Cache-first — content-hashed, safe forever ───────────────────────────────
const CACHE_FIRST_PATTERNS = [
  '/assets/',
  '/icons/',
];

// ── Dev tooling / extensions — ignore completely ─────────────────────────────
const IGNORE_PATTERNS = [
  'chrome-extension://',
  '__vite',
  '/sockjs/',
  '/@vite/',
  '/@fs/',
  'hot-update',
];

/* ═══════════════════════════════════════════════════════════════════════════
   INSTALL — cache icons only (app shell cached at runtime, not install)
═══════════════════════════════════════════════════════════════════════════ */
self.addEventListener('install', event => {
  console.log('[SW] Installing:', CACHE_NAME);
  event.waitUntil(
    (async () => {
      // Pre-cache icons
      try {
        const assetCache = await caches.open(CACHE_NAME);
        await assetCache.addAll(['/icons/icon-192.png', '/icons/icon-512.png']);
      } catch (err) {
        console.warn('[SW] Icon pre-cache failed (non-fatal):', err);
      }

      // Pre-cache the app shell at install time so offline works immediately
      // without needing to visit the page online first
      try {
        const shellCache = await caches.open(SHELL_KEY);
        const existing   = await shellCache.match(SHELL_KEY);
        if (!existing) {
          // Only fetch if not already cached — avoids redundant request on update
          const shellResp = await fetch('/', { cache: 'no-store' });
          if (shellResp.ok) {
            await shellCache.put(SHELL_KEY, shellResp);
            console.log('[SW] App shell pre-cached at install');
          }
        } else {
          console.log('[SW] App shell already in cache — skipping install fetch');
        }
      } catch (err) {
        // Non-fatal — navigationFirst will cache it on first online visit
        console.warn('[SW] Shell pre-cache at install failed (non-fatal):', err);
      }

      await self.skipWaiting();
      console.log('[SW] Installed:', CACHE_NAME);
    })()
  );
});

/* ═══════════════════════════════════════════════════════════════════════════
   ACTIVATE — delete ALL old caches
═══════════════════════════════════════════════════════════════════════════ */
self.addEventListener('activate', event => {
  console.log('[SW] Activating:', CACHE_NAME);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== SHELL_KEY)
          .map(k => {
            console.log('[SW] Deleting stale cache:', k);
            return caches.delete(k);
          })
      ))
      .then(() => self.clients.claim())
      .then(() => notifyClients({ type: 'SW_ACTIVATED', version: CACHE_NAME }))
  );
});

/* ═══════════════════════════════════════════════════════════════════════════
   FETCH — routing strategy
═══════════════════════════════════════════════════════════════════════════ */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = request.url;

  // 1. Non-HTTP — pass through
  if (!url.startsWith('http')) return;

  // 2. Dev tooling — pass through
  if (IGNORE_PATTERNS.some(p => url.includes(p))) return;

  // 3. Navigation requests (page loads) — network-first, cache shell for offline
  if (request.mode === 'navigate') {
    event.respondWith(navigationFirst(request));
    return;
  }

  // 4. Never cache — always network, no fallback
  if (NEVER_CACHE.some(p => url.includes(p))) {
    event.respondWith(fetch(request).catch(() =>
      new Response(null, { status: 503, statusText: 'Offline' })
    ));
    return;
  }

  // 5. Hashed assets — cache-first forever
  if (CACHE_FIRST_PATTERNS.some(p => url.includes(p))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 6. Everything else — network-first
  event.respondWith(networkFirst(request));
});

/* ═══════════════════════════════════════════════════════════════════════════
   STRATEGIES
═══════════════════════════════════════════════════════════════════════════ */

// Navigation — stale-while-revalidate for app shell.
// Serve cache IMMEDIATELY if available, fetch fresh in background.
// This eliminates the race between offline detection and cache lookup.
async function navigationFirst(request) {
  // 1. Try to get the cached shell immediately
  let cachedShell = null;
  try {
    const shellCache = await caches.open(SHELL_KEY);
    cachedShell = await shellCache.match(SHELL_KEY);
  } catch (err) {
    console.warn('[SW] Shell cache read failed:', err);
  }

  // 2. Always attempt network fetch (update shell in background or return fresh)
  const networkFetch = fetch(request)
    .then(async response => {
      if (response.ok) {
        try {
          const shellCache = await caches.open(SHELL_KEY);
          await shellCache.put(SHELL_KEY, response.clone());
          console.log('[SW] App shell updated in cache');
        } catch (err) {
          console.warn('[SW] Shell cache write failed:', err);
        }
      }
      return response;
    })
    .catch(err => {
      console.log('[SW] Network fetch failed (offline?):', err.message);
      return null; // signal network failure
    });

  // 3a. If we have a cached shell — serve it immediately, update in background
  if (cachedShell) {
    console.log('[SW] Serving cached shell immediately');
    // Update shell in background without blocking response
    networkFetch.catch(() => {});
    return cachedShell;
  }

  // 3b. No cached shell — wait for network
  console.log('[SW] No cached shell — waiting for network...');
  const networkResponse = await networkFetch;
  if (networkResponse) {
    return networkResponse;
  }

  // 3c. Network failed AND no cache — last resort inline fallback
  console.warn('[SW] Offline with no shell cached — showing offline page');
  return offlineFallback();
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response(null, { status: 503, statusText: 'Offline' });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(null, { status: 503, statusText: 'Offline' });
  }
}

// Only shown on very first visit when user is already offline
async function offlineFallback() {
  return new Response(
    `<!DOCTYPE html><html><head>
       <meta charset="UTF-8">
       <title>BLT — Offline</title>
       <meta name="viewport" content="width=device-width,initial-scale=1">
       <style>
         body{font-family:'Segoe UI',sans-serif;display:flex;align-items:center;
              justify-content:center;min-height:100vh;margin:0;
              background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;
              text-align:center;padding:20px}
         h2{margin:0 0 12px}p{opacity:.9;margin:0 0 24px}
         button{padding:12px 28px;background:#fff;color:#667eea;border:none;
                border-radius:8px;font-size:15px;font-weight:600;cursor:pointer}
       </style>
     </head><body>
       <div>
         <div style="font-size:56px;margin-bottom:16px">&#x1F4F4;</div>
         <h2>BLT is Offline</h2>
         <p>Please visit BLT while online at least once to enable offline mode.</p>
         <button onclick="location.reload()">Try Again</button>
       </div>
     </body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=UTF-8' } }
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MESSAGES from app
═══════════════════════════════════════════════════════════════════════════ */
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING received — activating now');
    self.skipWaiting();
  }
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: CACHE_NAME });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */
async function notifyClients(message) {
  const allClients = await self.clients.matchAll({ type: 'window' });
  allClients.forEach(c => c.postMessage(message));
}

self.addEventListener('error',              e => console.error('[SW] Error:', e.error));
self.addEventListener('unhandledrejection', e => console.error('[SW] Unhandled rejection:', e.reason));