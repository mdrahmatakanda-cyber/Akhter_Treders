/* ══════════════════════════════════════════════════════════════
   NAVIGATION — পেজ পরিবর্তন ও বটম ন্যাভিগেশন বার
   ══════════════════════════════════════════════════════════════
   কোন পেজ দেখানো হবে তা নিয়ন্ত্রণ করে।
   ══════════════════════════════════════════════════════════════ */

// ══════════════════════════════════════════════
// 🧭 NAVIGATION
// ══════════════════════════════════════════════
function navigateTo(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const target=document.getElementById('page-'+page);
  if(target){ target.classList.add('active'); window.scrollTo(0,0); }
  updateBottomNav(page);
  // padding handled by CSS
  const loaders={dashboard:loadDashboard,sales:loadSales,purchase:loadPurchases,products:loadProducts,stock:loadStock,due:loadCustomers,cashbox:loadCashbox,expense:loadExpenses,reports:loadReport,settings:loadSettings};
  if(loaders[page])loaders[page]();
}
// Alias for HTML onclick calls
function navigate(page){ navigateTo(page); }

// ══════════════════════════════════════════════
// 📱 BOTTOM NAV
// ══════════════════════════════════════════════
function createBottomNav(){
  const nav=document.createElement('nav'); nav.id='bottom-nav';
  nav.style.cssText='position:fixed;bottom:0;left:0;right:0;background:white;border-top:1px solid #e5e7eb;display:flex;z-index:500;box-shadow:0 -2px 10px rgba(0,0,0,0.08);';
  const items=[{icon:'🏠',label:t('nav.s2'),page:'dashboard'},{icon:'🛒',label:t('common.sales'),page:'sales'},{icon:'📦',label:t('common.purchase'),page:'purchase'},{icon:'💸',label:t('common.expense'),page:'expense'},{icon:'⚙️',label:t('nav.s1'),page:'settings'}];
  nav.innerHTML=items.map(i=>`<button onclick="navigate('${i.page}')" data-nav="${i.page}" class="nav-btn" style="flex:1;padding:8px 4px;background:none;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;font-family: 'Noto Serif Bengali', serif;color:#6b7280;font-size:10px;font-weight:600;transition:color 0.2s;"><span style="font-size:20px;">${i.icon}</span><span>${i.label}</span></button>`).join('');
  document.getElementById('app').appendChild(nav);
}
function updateBottomNav(page){ document.querySelectorAll('.nav-btn').forEach(b=>{ b.style.color=b.dataset.nav===page?'#2d8a45':'#6b7280'; }); }

// ══════════════════════════════════════════════
// 🌐 LANGUAGE REFRESH — ভাষা বদলালে I18N.setLanguage() এখানে কল করে
// ══════════════════════════════════════════════
// বর্তমানে যে পেজ খোলা আছে সেটা আবার লোড করে (loader ফাংশন পুনরায় চালিয়ে),
// আর বটম ন্যাভও নতুন করে বানায় — যাতে সব লেবেল সাথে সাথে নতুন ভাষায় দেখায়।
// (নোট: কোনো মোডাল/প্যানেল খোলা থাকলে সেটা রিফ্রেশ হয় না — বন্ধ করে আবার খুললে
//  নতুন ভাষায় দেখা যাবে।)
function refreshCurrentView(){
  const activeEl = document.querySelector('.page.active');
  const page = activeEl ? activeEl.id.replace('page-','') : null;

  const nav = document.getElementById('bottom-nav');
  if (nav) nav.remove();
  if (document.getElementById('app') && !document.getElementById('app').classList.contains('hidden')) {
    createBottomNav();
    if (page) updateBottomNav(page);
  }

  if (page) {
    const loaders={dashboard:loadDashboard,sales:loadSales,purchase:loadPurchases,products:loadProducts,stock:loadStock,due:loadCustomers,cashbox:loadCashbox,expense:loadExpenses,reports:loadReport,settings:loadSettings};
    if (loaders[page]) loaders[page]();
  }
}

