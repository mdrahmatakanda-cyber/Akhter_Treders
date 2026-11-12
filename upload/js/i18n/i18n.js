/* ══════════════════════════════════════════════════════════════
   I18N ENGINE — ভাষা পরিবর্তন সিস্টেম
   ══════════════════════════════════════════════════════════════
   নতুন ভাষা যোগ করতে:
     ১) js/i18n/xx.js নামে একটা নতুন ফাইল বানান (bn.js/en.js দেখে)
     ২) I18N.registerLang('xx', {key: 'অনুবাদ', ...}) দিয়ে সব key-এর
        অনুবাদ দিন (bn.js এর সব key এখানে থাকা উচিত)
     ৩) index.html এ <script src="js/i18n/xx.js"></script> যোগ করুন
        (bn.js এর ঠিক পরে, i18n.js এর পরে)
     ৪) ভাষা সিলেক্টরে (index.html, #lang-switcher) একটা <option> যোগ করুন

   টেক্সট ব্যবহারের নিয়ম:
     - স্ট্যাটিক HTML এ:  <span data-i18n="nav.dashboard">...</span>
     - প্লেসহোল্ডারে:      <input data-i18n-placeholder="common.search"/>
     - JS কোডে:            t('nav.dashboard')  অথবা  t('msg.hello', {name: 'রহমত'})
   ══════════════════════════════════════════════════════════════ */

const I18N = (function () {
  const STORAGE_KEY = 'sms_lang';
  const FALLBACK_LANG = 'bn';
  const LANGS = {}; // { bn: {...}, en: {...} }

  let currentLang = localStorage.getItem(STORAGE_KEY) || FALLBACK_LANG;

  function registerLang(code, table) {
    LANGS[code] = Object.assign(LANGS[code] || {}, table);
  }

  function t(key, vars) {
    let str =
      (LANGS[currentLang] && LANGS[currentLang][key]) ||
      (LANGS[FALLBACK_LANG] && LANGS[FALLBACK_LANG][key]) ||
      key; // অনুবাদ না পেলে key-টাই দেখানো হবে (ডিবাগ করা সহজ হয়)
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
      });
    }
    return str;
  }

  var LANG_ORDER = ['bn', 'en', 'ar']; // চক্রাকারে (cycle) ভাষা বদলানোর ক্রম — নতুন ভাষা যোগ করলে এখানেও যোগ করুন

  function nextLanguage() {
    var idx = LANG_ORDER.indexOf(currentLang);
    var next = LANG_ORDER[(idx + 1) % LANG_ORDER.length];
    setLanguage(next);
  }

  function getLang() {
    return currentLang;
  }

  function availableLangs() {
    return Object.keys(LANGS);
  }

  function applyStaticTranslations(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    scope.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
  }

  function setLanguage(lang) {
    if (!LANGS[lang]) { console.warn('Unknown language:', lang); return; }
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    refreshUI();
  }

  function refreshUI() {
    applyStaticTranslations();
    document.querySelectorAll('#lang-switcher, #lang-switcher-app').forEach(function (el) {
      el.value = currentLang;
    });
    var hdrLabel = document.getElementById('hdr-lang-label');
    if (hdrLabel) {
      var idx = LANG_ORDER.indexOf(currentLang);
      var nextLang = LANG_ORDER[(idx + 1) % LANG_ORDER.length];
      var SHORT_LABELS = { bn: 'বাং', en: 'EN', ar: 'عربي' };
      hdrLabel.textContent = SHORT_LABELS[nextLang] || nextLang;
    }
    // বর্তমানে যে পেজ/মডাল খোলা আছে তার ডাইনামিক কন্টেন্ট পুনরায় রেন্ডার করা
    if (typeof refreshCurrentView === 'function') {
      try { refreshCurrentView(); } catch (e) { console.error('refreshCurrentView error:', e); }
    }
  }

  return {
    t: t,
    registerLang: registerLang,
    setLanguage: setLanguage,
    nextLanguage: nextLanguage,
    getLang: getLang,
    availableLangs: availableLangs,
    applyStaticTranslations: applyStaticTranslations,
    refreshUI: refreshUI
  };
})();

// শর্টহ্যান্ড — পুরো অ্যাপ জুড়ে t('key') আকারে ব্যবহার হবে
function t(key, vars) { return I18N.t(key, vars); }
