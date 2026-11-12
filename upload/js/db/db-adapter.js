// js/db/db-adapter.js

// Supabase ক্লায়েন্ট তৈরি করা হচ্ছে
window.sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

console.log("✅ Supabase Successfully Connected!");