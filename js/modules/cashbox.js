/* ══════════════════════════════════════════════════════════════
   💵 CASHBOX
   ══════════════════════════════════════════════════════════════
   নগদ লেনদেনের হিসাব (ক্যাশ ইন/আউট)।
   ══════════════════════════════════════════════════════════════ */

// ══════════════════════════════════════════════
// 💵 CASHBOX
// ══════════════════════════════════════════════
async function loadCashbox(){
  if(currentUserProfile?.role!=='owner'){navigateTo('dashboard');toast(t('cashbox.s13'),'error');return;}
  try{
    const {data:txns}=await sb.from('cash_transactions').select('*').order('transaction_date',{ascending:false}).limit(200);
    const totalIn=(txns||[]).filter(t=>t.direction==='in').reduce((s,t)=>s+parseFloat(t.amount||0),0);
    const totalOut=(txns||[]).filter(t=>t.direction==='out').reduce((s,t)=>s+parseFloat(t.amount||0),0);
    const balance=totalIn-totalOut;
    const setTxt=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    setTxt('cash-balance',taka(balance)); setTxt('total-cash-in',taka(totalIn)); setTxt('total-cash-out',taka(totalOut));
    const today=todayISO();
    const now=new Date();
    let filtered=txns||[];

    if(cashTabMode==='today'){
      filtered=filtered.filter(t=>t.transaction_date?.startsWith(today));
    } else if(cashTabMode==='week'){
      const weekAgo=new Date(now);
      weekAgo.setDate(weekAgo.getDate()-6);
      const weekStr=weekAgo.toISOString().split('T')[0];
      filtered=filtered.filter(t=>t.transaction_date?.substring(0,10)>=weekStr);
    } else if(cashTabMode==='month'){
      const monthStr=now.toISOString().substring(0,7);
      filtered=filtered.filter(t=>t.transaction_date?.startsWith(monthStr));
    } else if(cashTabMode==='custom'){
      const from=document.getElementById('cash-from')?.value;
      const to=document.getElementById('cash-to')?.value;
      if(from) filtered=filtered.filter(t=>t.transaction_date?.substring(0,10)>=from);
      if(to) filtered=filtered.filter(t=>t.transaction_date?.substring(0,10)<=to);
    }

    renderCashTable(filtered);
  }catch(e){toast(t('cashbox.s4'),'error');}
}
function renderCashTable(txns){
  const tbody=document.getElementById('cash-table-body'); if(!tbody)return;
  const typeMap={sale:t('common.sales'),purchase:t('common.purchase'),expense:t('common.expense'),due_payment:t('cashbox.s8'),supplier_due_payment:t('cashbox.s15'),manual_in:t('cashbox.s11'),manual_out:t('cashbox.s10'),opening:t('cashbox.s14')};
  tbody.innerHTML=txns.length?txns.map(t=>`<tr>
    <td style="font-size:11px;">${fmtDT(t.transaction_date)}</td>
    <td>${typeMap[t.transaction_type]||t.transaction_type}</td>
    <td>${t.direction==='in'?'<span style="color:#2d8a45;font-weight:700;">↑ ইন</span>':'<span style="color:#c62828;font-weight:700;">↓ আউট</span>'}</td>
    <td style="font-weight:700;">${taka(t.amount)}</td>
    <td>${taka(t.balance_after)}</td>
    <td>${t.note||'—'}</td></tr>`).join(''):t('cashbox.s1');
}
function switchCashTab(mode){
  cashTabMode=mode;
  // সব tab reset
  ['today','week','month','custom'].forEach(t=>{
    const btn=document.getElementById('cash-tab-'+t);
    if(btn){
      btn.style.background='transparent';
      btn.style.color='#6b7280';
      btn.style.boxShadow='none';
    }
  });
  // active tab
  const activeBtn=document.getElementById('cash-tab-'+mode);
  if(activeBtn){
    activeBtn.style.background='white';
    activeBtn.style.color='#1a5c2a';
    activeBtn.style.boxShadow='0 1px 4px rgba(0,0,0,0.1)';
  }
  // custom range দেখাও/লুকাও
  const customRange=document.getElementById('cash-custom-range');
  if(customRange) customRange.style.display=mode==='custom'?'block':'none';

  if(mode!=='custom') loadCashbox();
}
function openCashManualModal(direction){
  if(currentUserProfile?.role!=='owner'){toast(t('cashbox.s12'),'error');return;}
  const html=`
    <div class="form-group"><label class="form-label">${t('cashbox.s5')}<span class="required">*</span></label><input type="number" id="manual-amount" class="form-control" min="0.01" placeholder="${t('cashbox.s7')}"/></div>
    <div class="form-group"><label class="form-label">${t('cashbox.s2')}</label>
      <select id="manual-reason" class="form-control">
        ${direction==='in'?'<option>মালিক জমা</option><option>অতিরিক্ত আয়</option><option>সংশোধন</option>':'<option>ব্যক্তিগত উত্তোলন</option><option>সংশোধন</option>'}
      </select>
    </div>
    <div class="form-group"><label class="form-label">${t('common.note')}</label><input id="manual-note" class="form-control" placeholder="${t('cashbox.s9')}"/></div>
    <input type="hidden" id="manual-direction" value="${direction}"/>`;
  openModal('manualCashModal',direction==='in'?t('cashbox.s16'):t('cashbox.s17'),html,[
    {label:t('common.save'),action:'saveManualCash()',cls:direction==='in'?'btn-primary':'btn-danger'},
    {label:t('common.cancel'),action:'closeModal("manualCashModal")',cls:'btn-secondary'}
  ]);
}
async function saveManualCash(){
  const amount=parseFloat(document.getElementById('manual-amount')?.value)||0;
  const reason=document.getElementById('manual-reason')?.value;
  const note=document.getElementById('manual-note')?.value;
  const direction=document.getElementById('manual-direction')?.value;
  if(!amount||amount<=0){toast(t('cashbox.s6'),'error');return;}
  await sb.from('cash_transactions').insert({transaction_type:direction==='in'?'manual_in':'manual_out',direction,amount,note:reason+(note?': '+note:''),created_by:currentUserProfile?.id});
  closeModal('manualCashModal'); toast(t('cashbox.s3')); loadCashbox();
}

