/* ══════════════════════════════════════════════════════════════
   AUTH & LOCK SCREEN
   ══════════════════════════════════════════════════════════════
   লগইন, রেজিস্ট্রেশন, সেশন, লক স্ক্রিন এবং পাসওয়ার্ড রিকভারি।
   বর্তমান মোডে (localStorage ব্যাকএন্ড) যেকোনো ইমেইল ও পাসওয়ার্ড দিয়ে
   লগইন সফল হবে — দেখুন js/db/db-adapter.js এর auth অংশ।
   ══════════════════════════════════════════════════════════════ */

// ══════════════════════════════════════════════
// 🔐 AUTH
// ══════════════════════════════════════════════
async function initApp(){
  const loadingTimeout = setTimeout(() => {
    const spinner = document.getElementById('loading-spinner-box');
    const errorBox = document.getElementById('loading-error');
    if(spinner) spinner.style.display = 'none';
    if(errorBox) errorBox.style.display = 'block';
  }, 16000); 

  try {
    const {data:{session}, error} = await sb.auth.getSession();
    if(error) throw error;
    
    if(session) {
      currentUser = session.user;
      
      // ডাটাবেসের জন্য অপেক্ষা না করে সাথে সাথে মেমোরি থেকে অ্যাপ ওপেন হবে
      loadUserProfile().then(() => applyRolePermissions()); 
      loadShopSettings();
      
      clearTimeout(loadingTimeout); 
      hide('loading-screen');
      showMainApp();
    } else {
      clearTimeout(loadingTimeout);
      hide('loading-screen');
      showAuthScreen();
    }
  } catch(e) {
    console.error('Init error:', e);
    const spinner = document.getElementById('loading-spinner-box');
    const errorBox = document.getElementById('loading-error');
    if(spinner) spinner.style.display = 'none';
    if(errorBox) errorBox.style.display = 'block';
  }
}

function switchAuthTab(tab){
  document.querySelectorAll('.auth-tab').forEach(t=>t.classList.remove('active'));
  if(tab==='login'){ document.querySelectorAll('.auth-tab')[0].classList.add('active'); show('login-form'); hide('register-form'); }
  else{ document.querySelectorAll('.auth-tab')[1].classList.add('active'); hide('login-form'); show('register-form'); }
}

async function doLogin(){
  const email=document.getElementById('login-email').value.trim();
  const pass=document.getElementById('login-pass').value;
  if(!email||!pass){toast(t('auth.s7'),'error');return;}
  const btn=document.getElementById('login-btn'); btn.disabled=true; btn.textContent=t('auth.s27');
  try{
    const {data,error}=await sb.auth.signInWithPassword({email,password:pass});
    if(error)throw error;
    currentUser=data.user; await loadUserProfile(); await loadShopSettings();
    hide('auth-screen'); showMainApp(); toast(t('auth.s31')+currentUserProfile?.name);
  }catch(e){ toast(t('auth.s26')+(e.message||t('auth.s8')),'error'); }
  finally{ btn.disabled=false; btn.innerHTML=t('auth.s38'); }
}

async function doRegister(){
  const name=document.getElementById('reg-name').value.trim();
  const email=document.getElementById('reg-email').value.trim();
  const phone=document.getElementById('reg-phone').value.trim();
  const pass=document.getElementById('reg-pass').value;
  const role=document.getElementById('reg-role').value;
  if(!name||!email||!pass){toast(t('auth.s30'),'error');return;}
  if(pass.length<6){toast(t('auth.s17'),'error');return;}
  const btn=document.getElementById('reg-btn'); btn.disabled=true; btn.textContent=t('auth.s15');
  try{
    const {data,error}=await sb.auth.signUp({email,password:pass});
    if(error)throw error;
    await sb.from('users').insert({auth_id:data.user.id,name,phone,email,role});
    toast(t('auth.s14'));
    switchAuthTab('login');
    document.getElementById('login-email').value=email;
  }catch(e){ toast(t('auth.s13')+e.message,'error'); }
  finally{ btn.disabled=false; btn.innerHTML=t('auth.s34'); }
}

async function loadUserProfile() {
  const cached = localStorage.getItem('cache_user_profile');
  if(cached) { currentUserProfile = JSON.parse(cached); }

  try {
    const {data} = await sb.from('users').select('*').eq('auth_id',currentUser.id).single();
    if(data) {
      currentUserProfile = data;
      localStorage.setItem('cache_user_profile', JSON.stringify(data)); 
    } else {
      const {data:data2} = await sb.from('users').select('*').eq('email',currentUser.email).single();
      if(data2){
        await sb.from('users').update({auth_id:currentUser.id}).eq('email',currentUser.email);
        currentUserProfile = data2;
        localStorage.setItem('cache_user_profile', JSON.stringify(data2));
      }
    }
  } catch(e) {
    if(!currentUserProfile) {
      currentUserProfile = { name:currentUser.email?.split('@')[0]||t('auth.s20'), role:'manager', email:currentUser.email };
    }
  }
}

async function loadShopSettings() {
  const cached = localStorage.getItem('cache_shop_settings');
  if(cached) { shopSettings = JSON.parse(cached); updateHeaderInfo(); }

  try {
    const {data} = await sb.from('shop_settings').select('*').limit(1).single();
    if(data) {
      shopSettings = data;
      localStorage.setItem('cache_shop_settings', JSON.stringify(data)); 
      updateHeaderInfo();
    }
  } catch(e) {}
}

function updateHeaderInfo(){
  const s=shopSettings;
  const setTxt=(id,val)=>{ const el=document.getElementById(id); if(el)el.textContent=val||''; };
  setTxt('hdr-user', currentUserProfile?.name||'');
  setTxt('ad-whatsapp', s.whatsapp||'');
  setTxt('ad-email', s.email||'');
  setTxt('lock-shop-name', s.shop_name||t('auth.s23'));
  setTxt('lock-shop-sub', s.shop_subtitle||'');
  setTxt('lock-shop-contact', `📞 ${s.phone1||''} | 📍 ${s.address||''}`);
  setTxt('lock-username', currentUserProfile?.name||'');
  setTxt('lock-userrole', currentUserProfile?.role==='owner'?t('auth.s35'):'👤 Manager');
  setTxt('footer-shop-name', s.shop_name||t('auth.s23'));
  const now=new Date();
  setTxt('hdr-date', fmtDate(now));
  setTxt('hdr-day', t(DAY_KEYS[now.getDay()]));
}

function showAuthScreen(){ hide('loading-screen');hide('app');hide('lock-screen');show('auth-screen'); }

function showMainApp(){
  hide('auth-screen');hide('lock-screen');show('app');
  applyRolePermissions();
  if(!document.getElementById('bottom-nav')) createBottomNav();
  navigateTo('dashboard');
  startDateClock(); loadDashboard();
  if(!localStorage.getItem('sms_onboarding_done')){
    setTimeout(startTour, 800); // পেজ রেন্ডার শেষ হওয়ার পর শুরু
  }
}

async function doLogout(){
  if(!confirm(t('auth.s24')))return;
  clearLockTimer(); await sb.auth.signOut();
  currentUser=null; currentUserProfile=null;
  hide('app');hide('lock-screen');show('auth-screen');
  toast(t('auth.s25'));
}

function applyRolePermissions(){
  const isOwner=currentUserProfile?.role==='owner';
  document.querySelectorAll('.owner-only').forEach(el=>{ isOwner?el.classList.remove('hidden'):el.classList.add('hidden'); });
}

// ══════════════════════════════════════════════
// 🔒 LOCK
// ══════════════════════════════════════════════
function lockApp(){ clearLockTimer(); show('lock-screen'); document.getElementById('lock-password').value=''; setTimeout(()=>document.getElementById('lock-password').focus(),100); }
function startLockTimer(){ /* auto lock disabled */ }
function clearLockTimer(){ if(lockTimer){clearTimeout(lockTimer);lockTimer=null;} }
function resetLockTimer(){ if(currentUser&&document.getElementById('lock-screen').classList.contains('hidden')) startLockTimer(); }

async function unlockApp(){
  const pass=document.getElementById('lock-password').value;
  if(!pass){toast(t('auth.s18'),'error');return;}
  try{
    const {error}=await sb.auth.signInWithPassword({email:currentUser.email,password:pass});
    if(error)throw error;
    hide('lock-screen'); startLockTimer(); toast(t('auth.s3'));
  }catch(e){ toast(t('auth.s22'),'error'); document.getElementById('lock-password').value=''; document.getElementById('lock-password').focus(); }
}


// Auto lock disabled - manual lock only
// Auto lock on visibility change disabled

function startDateClock(){
  function updateClock(){
    if(currentUser){
      const now=new Date();
      const dateEl=document.getElementById('hdr-date');
      const dayEl=document.getElementById('hdr-day');
      if(dateEl) dateEl.textContent=fmtDate(now);
      if(dayEl) dayEl.textContent=t(DAY_KEYS[now.getDay()]);
    }
  }
  updateClock();
  setInterval(updateClock, 60000);
}

function openWhatsApp(){ const num=shopSettings.whatsapp||'01752005057'; window.open(`https://wa.me/88${num}?text=${t('auth.s5')}`,'_blank'); }


// ══════════════════════════════════════════════
// 🔐 PASSWORD RECOVERY SYSTEM
// ══════════════════════════════════════════════
// আগের showForgotPassword ফাংশনটি রিপ্লেস করবে
function showForgotPassword() {
  const html = `
    <div style="background:#e3f2fd; padding:12px; border-radius:8px; font-size:12px; margin-bottom:14px; color:#0d47a1; border:1px solid #bbdefb;">
      ℹ️${t('auth.s2')}
    </div>
    <div class="form-group">
      <label class="form-label">${t('auth.s6')}<span class="required">*</span></label>
      <input type="email" id="reset-email" class="form-control" placeholder="${t('auth.s4')}" />
    </div>
  `;
  openModal('forgotPwModal', t('auth.s37'), html, [
    {label: t('auth.s28'), action: 'sendResetLink()', cls: 'btn-primary'},
    {label: t('common.cancel'), action: 'closeModal("forgotPwModal")', cls: 'btn-secondary'}
  ]);
}

async function sendResetLink() {
  const email = document.getElementById('reset-email').value.trim();
  if(!email) { toast(t('auth.s9'), 'error'); return; }
  toast(t('auth.s29'), 'info');
  try {
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) throw error;
    closeModal('forgotPwModal');
    toast(t('auth.s33'));
  } catch(e) { toast(t('auth.s21') + e.message, 'error'); }
}

// ইমেইলের লিংকে ক্লিক করে ফিরে আসলে নতুন পাসওয়ার্ড বসানোর বক্স
sb.auth.onAuthStateChange(async (event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    hide('auth-screen'); hide('loading-screen'); hide('lock-screen');
    const html = `
      <div style="background:#e3f2fd; padding:12px; border-radius:8px; font-size:12px; margin-bottom:14px; color:#0d47a1; border:1px solid #bbdefb;">
        ✅${t('auth.s1')}
      </div>
      <div class="form-group">
        <label class="form-label" style="text-align:center;">${t('auth.s12')}<span class="required">*</span></label>
        <input type="password" id="recovery-new-pass" class="form-control" placeholder="${t('auth.s10')}" 
               style="text-align:center; font-size:18px; padding:12px; font-weight:800; color:#1a5c2a;" />
      </div>
    `;
    openModal('recoveryModal', t('auth.s36'), html, [{label: t('auth.s32'), action: 'saveRecoveredPassword()', cls: 'btn-primary'}]);
  }
});

async function saveRecoveredPassword() {
  const newPass = document.getElementById('recovery-new-pass').value;
  if(!newPass || newPass.length < 6) { toast(t('auth.s11'), 'error'); return; }
  toast(t('auth.s16'), 'info');
  try {
    const { error } = await sb.auth.updateUser({ password: newPass });
    if(error) throw error;
    closeModal('recoveryModal');
    toast(t('auth.s19'));
    window.history.replaceState(null, null, window.location.pathname);
    initApp();
  } catch(e) { toast(t('auth.s21') + e.message, 'error'); }
}

