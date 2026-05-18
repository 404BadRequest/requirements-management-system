/**
 * Archivo estático en /sw.js: el navegador a veces pide un service worker previo
 * (otra app en localhost:3000). Sin este archivo, Next puede intentar enrutar la petición
 * y fallar si la carpeta .next está incompleta (ENOENT routes-manifest.json).
 * Al activarse, se desregistra solo para no interferir con la app.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.registration.unregister());
});
