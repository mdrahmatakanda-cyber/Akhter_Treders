/* ══════════════════════════════════════════════════════════════
   ⚙️ SETTINGS — দোকানের তথ্য, ইউজার ম্যানেজমেন্ট, পাসওয়ার্ড পরিবর্তন
   ══════════════════════════════════════════════════════════════
   
   ══════════════════════════════════════════════════════════════ */

// ── ক্যাটাগরি কাস্টমাইজেশন (Settings থেকে পণ্য/খরচের ক্যাটাগরি বদলানো) ──
async function editCategories(type){
  const current = (type==='product' ? getProductCategories() : getExpenseCategories()).join(', ');
  const input = prompt(t('ui.enter_categories'), current);
  if(input===null) return;
  const list = input.split(',').map(s=>s.trim()).filter(Boolean);
  if(!list.length) return;
  const field = type==='product' ? 'product_categories' : 'expense_categories';
  const payload = {[field]: list};
  if(shopSettings.id){ await sb.from('shop_settings').update(payload).eq('id',shopSettings.id); }
  else { await sb.from('shop_settings').insert(payload); }
  shopSettings = {...shopSettings, ...payload};
  localStorage.setItem('cache_shop_settings', JSON.stringify(shopSettings));
  toast(t('ui.categories_updated'));
}

// ══════════════════════════════════════════════
function openShopSettingsModal(){
  const s=shopSettings;
  const html=`
    <div class="form-group"><label class="form-label">${t('settings.s12')}</label><input id="ss-name" class="form-control" value="${s.shop_name||''}"/></div>
    <div class="form-group"><label class="form-label">${t('settings.s29')}</label><input id="ss-sub" class="form-control" value="${s.shop_subtitle||''}"/></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">${t('settings.s23')}</label><input id="ss-p1" class="form-control" value="${s.phone1||''}"/></div>
      <div class="form-group"><label class="form-label">${t('settings.s24')}</label><input id="ss-p2" class="form-control" value="${s.phone2||''}"/></div>
    </div>
    <div class="form-group"><label class="form-label">${t('dues.s15')}</label><input id="ss-addr" class="form-control" value="${s.address||''}"/></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">WhatsApp</label><input id="ss-wa" class="form-control" value="${s.whatsapp||''}"/></div>
      <div class="form-group"><label class="form-label">${t('settings.s7')}</label><input id="ss-email" class="form-control" value="${s.email||''}"/></div>
    </div>`;
  openModal('shopSetModal',t('settings.s32'),html,[
    {label:t('common.save'),action:'saveShopSettings()',cls:'btn-primary'},
    {label:t('common.cancel'),action:'closeModal("shopSetModal")',cls:'btn-secondary'}
  ]);
}
async function saveShopSettings(){
  const payload={shop_name:document.getElementById('ss-name')?.value.trim(),shop_subtitle:document.getElementById('ss-sub')?.value.trim(),phone1:document.getElementById('ss-p1')?.value.trim(),phone2:document.getElementById('ss-p2')?.value.trim(),address:document.getElementById('ss-addr')?.value.trim(),whatsapp:document.getElementById('ss-wa')?.value.trim(),email:document.getElementById('ss-email')?.value.trim()};
  try{
    if(shopSettings.id){await sb.from('shop_settings').update(payload).eq('id',shopSettings.id);}
    else{await sb.from('shop_settings').insert(payload);}
    shopSettings={...shopSettings,...payload}; updateHeaderInfo(); closeModal('shopSetModal'); toast(t('settings.s30'));
  }catch(e){toast(t('auth.s21')+e.message,'error');}
}
function openChangePasswordModal(){
  const html=`
    <div class="form-group"><label class="form-label">${t('auth.s12')}<span class="required">*</span></label><input type="password" id="np-pass" class="form-control" placeholder="${t('settings.s10')}"/></div>
    <div class="form-group"><label class="form-label">${t('settings.s15')}<span class="required">*</span></label><input type="password" id="np-confirm" class="form-control" placeholder="${t('settings.s18')}"/></div>`;
  openModal('changePwModal',t('settings.s35'),html,[
    {label:t('settings.s16'),action:'doChangePassword()',cls:'btn-primary'},
    {label:t('common.cancel'),action:'closeModal("changePwModal")',cls:'btn-secondary'}
  ]);
}
async function doChangePassword(){
  const pass=document.getElementById('np-pass')?.value;
  const confirm=document.getElementById('np-confirm')?.value;
  if(!pass||pass.length<6){toast(t('auth.s11'),'error');return;}
  if(pass!==confirm){toast(t('settings.s21'),'error');return;}
  try{
    const {error}=await sb.auth.updateUser({password:pass});
    if(error)throw error;
    closeModal('changePwModal'); toast(t('settings.s19'));
  }catch(e){toast(t('auth.s21')+e.message,'error');}
}
async function openUsersModal(){
  const {data}=await sb.from('users').select('*').order('name');
  const html=`<div class="table-wrapper"><table>
    <thead><tr><th>${t('settings.s13')}</th><th>${t('settings.s7')}</th><th>${t('settings.s26')}</th><th>${t('settings.s31')}</th><th>${t('settings.s11')}</th></tr></thead>
    <tbody>${(data||[]).map(u=>`<tr>
      <td><strong style="color:#1a5c2a;">${u.name}</strong><br><small style="color:#e65c00;font-weight:700;">📞 ${u.phone||'নাম্বার নেই'}</small></td>
      <td style="font-size:11px;color:#1565c0;">${u.email||'—'}</td>
      <td><span class="badge ${u.role==='owner'?'badge-blue':'badge-green'}">${u.role==='owner'?'👑 Owner':'👤 Manager'}</span></td>
      <td><span class="badge ${u.is_active?'badge-green':'badge-gray'}">${u.is_active?'সক্রিয়':'নিষ্ক্রিয়'}</span></td>
      <td>${u.auth_id!==currentUser?.id?`<button class="btn btn-sm btn-secondary" onclick="toggleUserStatus('${u.id}',${u.is_active})">${u.is_active?'নিষ্ক্রিয় করুন':'সক্রিয় করুন'}</button>`:'<span class="text-soft text-sm">আপনি</span>'}</td></tr>`).join('')}
    </tbody></table></div>
    <div style="margin-top:12px; font-size:11px; color:#c62828; background:#ffebee; padding:10px; border-radius:8px; border:1px solid #ffcdd2;">
      🔒 <b>${t('settings.s14')}</b>${t('settings.s1')}Encrypted${t('settings.s6')}"${t('settings.s20')}"${t('settings.s2')}
    </div>`;
  openModal('usersModal',t('settings.s34'),html,[{label:t('common.close'),action:'closeModal("usersModal")',cls:'btn-primary'}],true);
}
async function toggleUserStatus(id,isActive){
  await sb.from('users').update({is_active:!isActive}).eq('id',id);
  toast(`${t('settings.s25')}${!isActive?'সক্রিয়':'নিষ্ক্রিয়'}${t('settings.s4')}`); openUsersModal();
}

function openRegisterModal(){
  const html=`
    <div class="form-group">
      <label class="form-label">${t('dues.s20')}<span class="required">*</span></label>
      <input id="nr-name" class="form-control" placeholder="${t('settings.s22')}"/>
    </div>
    <div class="form-group">
      <label class="form-label">${t('settings.s8')}<span class="required">*</span></label>
      <input type="email" id="nr-email" class="form-control" placeholder="${t('settings.s9')}"/>
    </div>
    <div class="form-group">
      <label class="form-label">${t('settings.s28')}</label>
      <input id="nr-phone" class="form-control" placeholder="01XXXXXXXXX"/>
    </div>
    <div class="form-group">
      <label class="form-label">${t('settings.s17')}<span class="required">*</span></label>
      <input type="password" id="nr-pass" class="form-control" placeholder="${t('settings.s10')}"/>
    </div>
    <div class="form-group">
      <label class="form-label">${t('settings.s27')}<span class="required">*</span></label>
      <select id="nr-role" class="form-control">
        <option value="manager">👤 Manager</option>
        <option value="owner">👑 Owner</option>
      </select>
    </div>
    <div style="background:#e8f5e9;border-radius:8px;padding:10px;font-size:12px;color:#1a5c2a;">
      ℹ️${t('settings.s5')}
    </div>`;
  openModal('registerModal',t('settings.s33'),html,[
    {label:t('auth.s34'),action:'doRegisterUser()',cls:'btn-primary'},
    {label:t('common.cancel'),action:'closeModal("registerModal")',cls:'btn-secondary'}
  ]);
}

async function doRegisterUser(){
  const name=document.getElementById('nr-name')?.value.trim();
  const email=document.getElementById('nr-email')?.value.trim();
  const phone=document.getElementById('nr-phone')?.value.trim()||'';
  const pass=document.getElementById('nr-pass')?.value;
  const role=document.getElementById('nr-role')?.value;

  if(!name||!email||!pass){toast(t('auth.s30'),'error');return;}
  if(pass.length<6){toast(t('auth.s17'),'error');return;}

  try{
    const {data,error}=await sb.auth.signUp({email,password:pass});
    if(error) throw error;

    if(data.user?.id){
      const {error:insertError}=await sb.from('users').insert({
        auth_id:data.user.id,
        name, phone, email, role, is_active:true
      });
      if(insertError) throw insertError;
    }

    closeModal('registerModal');
    toast(`✅ ${name}${t('settings.s3')}`);
    openUsersModal();

  }catch(e){
    toast(t('auth.s13')+e.message,'error');
  }
}

