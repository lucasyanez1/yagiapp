// Service Worker: cache-first de los archivos de la app.
// Tras cambiar cualquier archivo de app/, ejecutar `python tools/bump_sw.py` (sube CACHE y actualiza
// la huella de contenido; `python tools/audit.py` falla si se olvida).
// Los archivos se piden con cache:'reload' para no llenar la caché con copias viejas de la caché HTTP.
const CACHE = 'fitness-v11';
// contenido: df8bac7b7d1e497f
const ARCHIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/main.js',
  './js/db.js',
  './js/schema.js',
  './js/errors.js',
  './js/format.js',
  './js/theme.js',
  './js/settings.js',
  './js/router.js',
  './js/ui/components.js',
  './js/ui/vistas.js',
  './js/ui/respaldos.js',
  './js/backup.js',
  './js/entrenamientos.js',
  './js/domain/entrenamiento.js',
  './js/ui/entrenar.js',
  './js/ui/grafico.js',
  './js/ui/comida.js',
  './js/comidas.js',
  './js/domain/nutricion.js',
  './js/data/alimentos.js',
  './js/ui/inicio.js',
  './js/ui/peso.js',
  './js/pesos.js',
  './js/domain/peso.js',
  './js/domain/panel.js',
  './js/domain/analisis.js',
  './js/analisis.js',
  './js/recordatorios.js',
  './js/domain/recordatorios.js',
  './js/ui/recordatorios.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request).then((r) => r ?? fetch(e.request)));
});
