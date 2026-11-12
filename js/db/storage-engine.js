/* ══════════════════════════════════════════════════════════════
   STORAGE ENGINE — কাঁচা ডাটা লেয়ার (Raw Data Layer)
   ══════════════════════════════════════════════════════════════
   এই ফাইলটি ব্রাউজারের localStorage-কে একটি ছোট্ট "ডাটাবেজ" এর
   মত ব্যবহার করে। প্রতিটি টেবিল একটি আলাদা localStorage key-তে
   JSON Array আকারে জমা থাকে (key format: sms_db_<table_name>)।

   ভবিষ্যতে সত্যিকারের ডাটাবেজ (Supabase / MySQL / Firebase ইত্যাদি)
   যোগ করতে চাইলে শুধু এই একটি ফাইল বদলালেই হবে — বাকি পুরো
   অ্যাপ্লিকেশন (db-adapter.js এর ওপরের সব কোড) অপরিবর্তিত থাকবে,
   কারণ db-adapter.js সবসময় নিচের ৫টি ফাংশনের মাধ্যমেই ডাটার
   সাথে কথা বলে:
        getAll(table), saveAll(table, rows),
        genId(), nowISO(), STORAGE_PREFIX

   অর্থাৎ, নতুন ব্যাকেন্ড লাগাতে হলে শুধু StorageEngine অবজেক্টের
   এই মেথডগুলো নতুন করে বাস্তবায়ন (implement) করে দিলেই চলবে।
   ══════════════════════════════════════════════════════════════ */

const StorageEngine = (function () {
  const PREFIX = 'sms_db_'; // Smart Management System - Database

  function key(table) {
    return PREFIX + table;
  }

  /** টেবিলের সব রো (row) রিড করা */
  function getAll(table) {
    try {
      const raw = localStorage.getItem(key(table));
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('StorageEngine.getAll error for table:', table, e);
      return [];
    }
  }

  /** টেবিলের সব রো ওভাররাইট করে সেভ করা */
  function saveAll(table, rows) {
    try {
      localStorage.setItem(key(table), JSON.stringify(rows));
      return true;
    } catch (e) {
      console.error('StorageEngine.saveAll error for table:', table, e);
      // localStorage ভরে গেলে (quota exceeded) ইউজারকে জানানো
      if (e.name === 'QuotaExceededError') {
        toastSafe(t('storage_engine.s1'), 'error');
      }
      return false;
    }
  }

  function toastSafe(msg, type) {
    if (typeof toast === 'function') toast(msg, type);
  }

  /** নতুন ইউনিক আইডি তৈরি (UUID v4 ধাঁচের) */
  function genId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    // ফলব্যাক (পুরনো ব্রাউজার সাপোর্টের জন্য)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function nowISO() {
    return new Date().toISOString();
  }

  /** সম্পূর্ণ ডাটাবেজ এক্সপোর্ট (ব্যাকআপ / মাইগ্রেশনের জন্য) */
  function exportAll() {
    const dump = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) {
        dump[k.replace(PREFIX, '')] = JSON.parse(localStorage.getItem(k));
      }
    }
    return dump;
  }

  /** ব্যাকআপ ফাইল থেকে সম্পূর্ণ ডাটাবেজ ইমপোর্ট (রিস্টোর) */
  function importAll(dump) {
    Object.keys(dump).forEach(function (table) {
      saveAll(table, dump[table]);
    });
  }

  /** নির্দিষ্ট টেবিল খালি করা (শুধু ট্রাবলশুট / টেস্টিং এর জন্য) */
  function clearTable(table) {
    localStorage.removeItem(key(table));
  }

  return { getAll, saveAll, genId, nowISO, exportAll, importAll, clearTable, PREFIX };
})();
