const CACHE_NAME = "shop-management-cache-v4";

// যেসব ফাইল অফলাইনের জন্য ক্যাশ করতে হবে
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/config.js",
  "./js/state.js",
  "./js/utils.js",
  "./js/auth.js",
  "./js/nav.js",
  "./js/ui-panels.js",
  "./js/app.js",
  "./js/i18n/i18n.js",
  "./js/i18n/bn.js",
  "./js/i18n/en.js",
  "./js/db/storage-engine.js",
  "./js/db/db-adapter.js",
  "./js/modules/dashboard.js",
  "./js/modules/products.js",
  "./js/modules/sales.js",
  "./js/modules/purchases.js",
  "./js/modules/stock.js",
  "./js/modules/dues.js",
  "./js/modules/cashbox.js",
  "./js/modules/expenses.js",
  "./js/modules/reports.js",
  "./js/modules/settings.js",
  "./js/modules/trash.js",
  "./js/modules/backup.js",
  "./assets/images/logo.png",
  "./assets/images/banner-loading.webp",
  "./assets/images/banner-auth.webp",
  "./assets/images/ad-banner.webp",
  "./assets/images/apple-touch-icon.png",
  "./assets/images/icon-192.png",
  "./assets/images/icon-512.png",
  "./assets/images/icon-maskable-512.png",
  "https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@300;400;500;600;700;800&display=swap",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
];

// ইনস্টল ইভেন্ট: সব ফাইল ক্যাশে সংরক্ষণ করা
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Service Worker: Caching Files");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// এক্টিভেট ইভেন্ট: পুরোনো ক্যাশ মুছে ফেলা (যদি ভার্সন আপডেট হয়)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("Service Worker: Clearing Old Cache");
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// ফেচ ইভেন্ট: অফলাইনে থাকলে ক্যাশ থেকে ফাইল সার্ভ করা
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});