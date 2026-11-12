// সার্ভিস ওয়ার্কারকে সম্পূর্ণ নিষ্ক্রিয় এবং আনরেজিস্ট্রার করার কোড
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => caches.delete(cache))
      );
    }).then(() => {
      return self.registration.unregister();
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", (event) => {
  // সব রিকোয়েস্ট সরাসরি ইন্টারনেটে পাঠিয়ে দেবে, কোনো ক্যাশ বা ব্লক করবে না
  event.respondWith(fetch(event.request));
});