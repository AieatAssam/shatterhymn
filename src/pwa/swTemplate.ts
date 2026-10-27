export function buildServiceWorkerSource(files: string[], version: string): string {
  const assets = [...new Set(["./", "./index.html", ...files.map(file => `./${file.replace(/^\.\//, "")}`)])];
  return `const CACHE = ${JSON.stringify(`shatterhymn-${version.slice(0, 10)}`)};
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("shatterhymn-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("message", event => {
  if (event.data && event.data.type === "skipWaiting") self.skipWaiting();
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).catch(error => {
    if (event.request.mode === "navigate") return caches.match("./index.html").then(page => { if (page) return page; throw error; });
    throw error;
  })));
});
`;
}
