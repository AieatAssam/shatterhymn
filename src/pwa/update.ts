let registration: ServiceWorkerRegistration | null = null;
const listeners = new Set<(ready: boolean) => void>();

function notify(): void {
  for (const listener of listeners) listener(Boolean(registration?.waiting));
}

export function onUpdateReady(listener: (ready: boolean) => void): () => void {
  listeners.add(listener);
  listener(Boolean(registration?.waiting));
  return () => listeners.delete(listener);
}

export function applyUpdate(): void {
  const worker = registration?.waiting;
  if (!worker) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
  worker.postMessage({ type: 'skipWaiting' });
}

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("./sw.js").then(result => {
      registration = result;
      const watch = () => {
        const worker = result.installing;
        worker?.addEventListener("statechange", notify);
      };
      result.addEventListener("updatefound", watch);
      watch();
      notify();
    }).catch(() => { /* The game remains usable without offline support. */ });
  }, { once: true });
}
