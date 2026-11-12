/* ══════════════════════════════════════════════════════════════
   ONBOARDING TOUR — প্রথম লগইনের পর ফিচার পরিচিতি
   ══════════════════════════════════════════════════════════════
   একবার দেখা হয়ে গেলে localStorage-এ ফ্ল্যাগ সেভ থাকে, দ্বিতীয়বার
   আর অটো দেখাবে না। Settings থেকে ইচ্ছা করলে আবার দেখা যাবে
   (startTour() কল করলেই চলবে)।
   ══════════════════════════════════════════════════════════════ */

function getTourSteps(){
  return [
    {selector:'#main-header', titleKey:'tour.step1_title', textKey:'tour.step1_text'},
    {selector:'[data-nav="dashboard"]', titleKey:'tour.step2_title', textKey:'tour.step2_text'},
    {selector:'[data-nav="sales"]', titleKey:'tour.step3_title', textKey:'tour.step3_text'},
    {selector:'[data-nav="purchase"]', titleKey:'tour.step4_title', textKey:'tour.step4_text'},
    {selector:'[data-nav="expense"]', titleKey:'tour.step5_title', textKey:'tour.step5_text'},
    {selector:'[data-nav="settings"]', titleKey:'tour.step6_title', textKey:'tour.step6_text'},
  ];
}
let tourStep = 0;

function startTour(){
  endTour(); // আগে থেকে চলমান কোনো ট্যুর থাকলে বন্ধ করা
  tourStep = 0;
  document.body.insertAdjacentHTML('beforeend',
    `<div class="tour-spotlight" id="tour-spotlight"></div>
     <div class="tour-tooltip" id="tour-tooltip"></div>`);
  showTourStep();
}

function showTourStep(){
  const steps = getTourSteps();
  const step = steps[tourStep];
  const el = document.querySelector(step.selector);
  if(!el){ nextTourStep(); return; }
  const r = el.getBoundingClientRect();
  const spotlight = document.getElementById('tour-spotlight');
  const tip = document.getElementById('tour-tooltip');
  if(!spotlight || !tip) return;

  spotlight.style.cssText =
    `top:${r.top-6}px;left:${r.left-6}px;width:${r.width+12}px;height:${r.height+12}px;`;
  tip.style.top = Math.min(r.bottom+12, window.innerHeight-160)+'px';
  const isRtl = document.documentElement.getAttribute('dir')==='rtl';
  const leftPos = isRtl
    ? Math.min(Math.max(window.innerWidth-r.right,12), window.innerWidth-300)
    : Math.min(Math.max(r.left,12), window.innerWidth-300);
  tip.style.left = leftPos+'px';

  tip.innerHTML = `
    <h4 style="margin-bottom:6px;color:#1a5c2a;">${t(step.titleKey)}</h4>
    <p style="font-size:13px;color:#555;margin-bottom:12px;">${t(step.textKey)}</p>
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <button onclick="skipTour()" style="background:none;border:none;color:#888;font-size:12px;cursor:pointer;">${t('tour.skip')}</button>
      <span style="font-size:11px;color:#aaa;">${tourStep+1}/${steps.length}</span>
      <button onclick="nextTourStep()" class="btn btn-primary" style="padding:6px 14px;font-size:12px;">
        ${tourStep===steps.length-1 ? t('tour.finish') : t('tour.next')}
      </button>
    </div>`;
}

function nextTourStep(){
  tourStep++;
  const steps = getTourSteps();
  if(tourStep >= steps.length){ endTour(); } else { showTourStep(); }
}
function skipTour(){ endTour(); }
function endTour(){
  document.getElementById('tour-spotlight')?.remove();
  document.getElementById('tour-tooltip')?.remove();
  localStorage.setItem('sms_onboarding_done','1');
}
