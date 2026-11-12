/* ══════════════════════════════════════════════════════════════
   APP BOOTSTRAP
   ══════════════════════════════════════════════════════════════
   সব ফাইল লোড হওয়ার পর এখান থেকেই অ্যাপ শুরু হয়।
   ══════════════════════════════════════════════════════════════ */

// ── BOOT ──
window.addEventListener('load', async ()=>{
  I18N.applyStaticTranslations(); // পেজ লোড হওয়ার সাথে সাথেই সংরক্ষিত ভাষা প্রয়োগ করা হয়
  document.documentElement.setAttribute('lang', I18N.getLang());
  document.documentElement.setAttribute('dir', I18N.getLang()==='ar' ? 'rtl' : 'ltr');
  document.querySelectorAll('#lang-switcher, #lang-switcher-app').forEach(el => { el.value = I18N.getLang(); });
  const LANG_ORDER = ['bn','en','ar'];
  const SHORT_LABELS = { bn:'বাং', en:'EN', ar:'عربي' };
  const hdrLabel = document.getElementById('hdr-lang-label');
  if (hdrLabel) {
    const idx = LANG_ORDER.indexOf(I18N.getLang());
    hdrLabel.textContent = SHORT_LABELS[LANG_ORDER[(idx+1)%LANG_ORDER.length]];
  }
  initApp();
});
history.pushState({}, '');

