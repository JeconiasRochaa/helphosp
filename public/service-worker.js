// HelpHosp — Service Worker v4: cache do "shell" estático; dados do Firebase nunca são cacheados.
const VERSION = 'helphosp-v4.1.1';
const SHELL = ['/', '/manifest.json', '/icons/favicon.svg', '/icons/icon-192x192.png', '/icons/icon-512x512.png', '/img/ti.jpg', '/img/manutencao.jpg', '/img/gesthosp.jpg', '/img/chamados.jpg'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request; const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;           // Firebase/CDN: direto na rede
  if (req.mode === 'navigate') { e.respondWith(fetch(req).catch(() => caches.match('/'))); return; }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/img/'))) { const c = res.clone(); caches.open(VERSION).then((ch) => ch.put(req, c)); }
    return res;
  })));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const alvo = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ws) => {
    for (const w of ws) { if ('focus' in w) { w.navigate(alvo); return w.focus(); } }
    return self.clients.openWindow(alvo);
  }));
});
