/* ══════════════════════════════════════════════════════════════
   UI PANELS — স্লাইড প্যানেল, ব্রাউজার ব্যাক বাটন হ্যান্ডলার, গ্লোবাল ইভেন্ট
   ══════════════════════════════════════════════════════════════
   মোবাইলে ব্যাক বাটন চাপলে মোডাল/প্যানেল বন্ধ হওয়ার লজিক এখানে।
   ══════════════════════════════════════════════════════════════ */

// ── GLOBAL CLOSE DROPDOWNS ──
document.addEventListener('click',e=>{
  if(!e.target.closest('.product-search-wrapper')) document.querySelectorAll('.product-dropdown').forEach(d=>d.classList.add('hidden'));
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){const modals=Object.keys(activeModals); if(modals.length)closeModal(modals[modals.length-1]);}
});


// ══════════════════════════════════════════════
// 🪟 SLIDE PANEL ENGINE
// ══════════════════════════════════════════════
function openSlidePanel(title, bodyHtml, footerBtns=[]) {
  document.getElementById('slide-panel-title').textContent = title;
  document.getElementById('slide-panel-body').innerHTML = bodyHtml;
  const footer = document.getElementById('slide-panel-footer');
  footer.innerHTML = footerBtns.map(b =>
    `<button class="btn ${b.cls}" style="flex:1;" onclick="${b.action.replace(/"/g, '&quot;')}">${b.label}</button>`
  ).join('');
  document.getElementById('slide-panel').classList.add('open');
  document.getElementById('slide-panel-backdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
  // Push history state for back button
  history.pushState({ panel: true }, '');
}

function closeSlidePanel() {
  document.getElementById('slide-panel').classList.remove('open');
  document.getElementById('slide-panel-backdrop').classList.remove('open');
  document.body.style.overflow = '';
}

// ══════════════════════════════════════════════
// 📱 BROWSER BACK BUTTON HANDLER
// ══════════════════════════════════════════════
window.addEventListener('popstate', function(e) {
  // If slide panel is open → close it
  if (document.getElementById('slide-panel').classList.contains('open')) {
    closeSlidePanel();
    return;
  }
  // If a modal is open → close top modal
  const modals = Object.keys(activeModals);
  if (modals.length) {
    closeModal(modals[modals.length - 1]);
    history.pushState({}, '');
    return;
  }
  // If not on dashboard → go back to dashboard
  const activePage = document.querySelector('.page.active');
  if (activePage && activePage.id !== 'page-dashboard') {
    navigateTo('dashboard');
    history.pushState({}, '');
    return;
  }
  // On dashboard → do nothing (prevent exit)
  history.pushState({}, '');
});

// Push initial state so back button works from first load
history.pushState({}, '');

// Auto lock disabled - manual only

