const CACHE_NAME = "shop-management-cache-v7";

// ইনস্টল ইভেন্ট
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// এক্টিভেট ইভেন্ট: পুরোনো ক্যাশ সাথে সাথে ডিলিট করে কন্ট্রোল নেওয়া
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ফেচ ইভেন্ট: নেটওয়ার্ক ফেইল না করলে কখনো অফলাইন ক্যাশ বা এরর দেখাবে না
self.addEventListener("fetch", (event) => {
  // Supabase বা যেকোনো এক্সটার্নাল API এবং POST রিকোয়েস্ট সরাসরি পাস করে দিন
  if (event.request.method !== "GET" || event.request.url.includes("supabase.co")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        return networkResponse;
      })
      .catch(() => {
        // শুধু ইন্টারনেট পুরোপুরি বিচ্ছিন্ন থাকলে ক্যাশ থেকে দেখাবে, অন্যথায় নয়
        return caches.match(event.request);
      })
  );
});