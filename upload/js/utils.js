/* ══════════════════════════════════════════════════════════════
   UTILITIES — বাংলা সংখ্যা/তারিখ ফরম্যাট, টোস্ট, মোডাল ইঞ্জিন
   ══════════════════════════════════════════════════════════════
   ছোট ছোট সাহায্যকারী (helper) ফাংশন যেগুলো প্রায় সব মডিউলেই দরকার হয়।
   ══════════════════════════════════════════════════════════════ */

// ── BANGLA UTILS ──
// মাস/বার-এর নাম t() দিয়ে "লাইভ" অনুবাদ হয় (ভাষা বদলালে সাথে সাথে বদলাবে) —
// তাই এগুলো top-level const অ্যারে না রেখে key দিয়ে ফাংশনের ভেতর থেকে ডাকা হয়
const MONTH_KEYS = ['utils.month1','utils.month2','utils.month3','utils.month4','utils.month5','utils.month6','utils.month7','utils.month8','utils.month9','utils.month10','utils.month11','utils.month12'];
const DAY_KEYS = ['utils.day0','utils.day1','utils.day2','utils.day3','utils.day4','utils.day5','utils.day6'];
function bn(n){ return String(n).replace(/[0-9]/g,d=>t('utils.s1')[d]); }

// ── ক্যাটাগরি কাস্টমাইজেশন ──
// Settings থেকে ইউজার নিজের মতো ক্যাটাগরি লিস্ট বদলাতে পারবেন;
// শপ_settings-এ কিছু সেভ করা না থাকলে এই ডিফল্ট লিস্ট ব্যবহার হয়।
function getProductCategories(){
  return (shopSettings.product_categories && shopSettings.product_categories.length)
    ? shopSettings.product_categories
    : ['তেল','চিনি','সাবান','বিস্কুট','কোমল পানীয়'];
}
function getExpenseCategories(){
  return (shopSettings.expense_categories && shopSettings.expense_categories.length)
    ? shopSettings.expense_categories
    : ['ভাড়া','বিদ্যুৎ বিল','কর্মচারী বেতন','পরিবহন','মোবাইল/ইন্টারনেট','মেইনটেন্যান্স','অন্যান্য'];
}
// ক্যাটাগরি ফিল্টার dropdown-এ (#product-cat-filter / #expense-cat-filter) অপশন বসানো —
// পেজ প্রতিবার লোড হওয়ার সময় কল হয়, যাতে Settings থেকে বদলানো ক্যাটাগরি সাথে সাথে দেখা যায়
function renderCategoryFilterOptions(selectId, categories){
  const sel = document.getElementById(selectId);
  if(!sel) return;
  const current = sel.value;
  // প্রথম অপশন ("সব ক্যাটাগরি") রেখে বাকি সব মুছে আবার বসানো হচ্ছে
  sel.innerHTML = sel.options.length ? sel.options[0].outerHTML : '';
  categories.forEach(c=>{
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    sel.appendChild(opt);
  });
  if(categories.includes(current)) sel.value = current; // আগের সিলেকশন থাকলে রাখা হচ্ছে
}
function fmtDate(d){ const dt=d?new Date(d):new Date(); return `${bn(dt.getDate())} ${t(MONTH_KEYS[dt.getMonth()])}, ${bn(dt.getFullYear())}`; }
function fmtDT(d){ const dt=d?new Date(d):new Date(); const h=dt.getHours()%12||12; const m=String(dt.getMinutes()).padStart(2,'0'); const ap=dt.getHours()>=12?'PM':'AM'; return `${fmtDate(dt)} ${bn(h)}:${bn(m)} ${ap}`; }
function taka(n){ return t('utils.s2')+bn((parseFloat(n)||0).toLocaleString('en-IN')); }

// ড্যাশবোর্ডের সংখ্যা "কাউন্ট-আপ" করে দেখানোর জন্য (০ থেকে আসল সংখ্যায় অ্যানিমেটেড)
function animateNumber(el, targetValue, duration=600){
  if(!el) return;
  const startTime = performance.now();
  function step(now){
    const progress = Math.min((now-startTime)/duration, 1);
    const eased = 1-Math.pow(1-progress,3);
    el.textContent = taka(targetValue*eased);
    if(progress<1) requestAnimationFrame(step);
    else el.textContent = taka(targetValue); // শেষে ঠিক আসল মান বসানো (রাউন্ডিং এরর এড়াতে)
  }
  requestAnimationFrame(step);
}
function todayISO(){ return new Date().toISOString().split('T')[0]; }

// ── UI HELPERS ──
function toast(msg,type='success'){ const el=document.createElement('div'); el.className=`toast toast-${type}`; el.textContent=msg; document.getElementById('toast-container').appendChild(el); setTimeout(()=>el.remove(),3500); }
function show(id){ document.getElementById(id)?.classList.remove('hidden'); }
function hide(id){ document.getElementById(id)?.classList.add('hidden'); }

// ── MODAL ENGINE ──
function openModal(id,title,bodyHtml,buttons=[],size='sm'){
  closeModal(id);
  // size: 'sm'=420px, 'md'=520px, 'lg'=680px  (legacy: true=lg, false=sm)
  if(size===true) size='md';
  if(size===false) size='sm';
  const sizeClass = size==='lg'?'modal-lg':size==='md'?'modal-lg':'';
  const el=document.createElement('div');
  el.className='modal-backdrop'; el.id='backdrop-'+id;
  el.innerHTML=`<div class="modal ${sizeClass}">
    <div class="modal-header"><h3>${title}</h3><button class="modal-close" onclick="closeModal('${id}')">✕</button></div>
    <div class="modal-body">${bodyHtml}</div>
    ${buttons.length?`<div class="modal-footer">${buttons.map(b=>`<button class="btn ${b.cls}" onclick="${b.action.replace(/"/g, '&quot;')}">${b.label}</button>`).join('')}</div>`:''}
  </div>`;
  document.body.appendChild(el);
  activeModals[id]=el;
  el.addEventListener('click',e=>{ if(e.target===el) closeModal(id); });
}

function closeModal(id){ const el=activeModals[id]||document.getElementById('backdrop-'+id); if(el){el.remove();delete activeModals[id];} }
