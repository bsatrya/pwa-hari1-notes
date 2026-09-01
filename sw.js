// Nama cache unik beserta versinya untuk manajemen cache
const CACHE_NAME = 'catatan-pwa-v1';

// Daftar aset inti yang wajib disimpan di cache saat instalasi
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json'
];

// Event listener saat Service Worker pertama kali diinstal oleh browser
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Menginstall Service Worker...');
  
  // Menunda proses instalasi hingga seluruh aset inti selesai di-cache
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Melakukan caching aset aplikasi');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting()) // Langsung aktifkan SW tanpa menunggu tab lama ditutup
  );
});

// Event listener saat Service Worker diaktifkan dan membersihkan cache lama
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Mengaktifkan Service Worker baru...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          // Hapus cache lama jika versinya berbeda dengan CACHE_NAME saat ini
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Menghapus cache lama:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim()) // Ambil alih kontrol halaman segera
  );
});

// Event listener untuk mencegat setiap permintaan jaringan (fetch)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    // Cek apakah aset yang diminta sudah tersedia di dalam cache
    caches.match(event.request)
      .then((cachedResponse) => {
        // Jika ada di cache, kembalikan versi cache; jika tidak, ambil dari jaringan
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request);
      })
  );
});