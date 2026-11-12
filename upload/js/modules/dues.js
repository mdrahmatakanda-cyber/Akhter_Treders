/* ══════════════════════════════════════════════════════════════
   👥 DUE / CUSTOMERS & SUPPLIERS
   ══════════════════════════════════════════════════════════════
   কাস্টমার ও সাপ্লায়ারের বাকি (due) হিসাব — একীভূত মডিউল।
   ══════════════════════════════════════════════════════════════ */

// ══════════════════════════════════════════════
// 👥 DUE / CUSTOMERS & SUPPLIERS (Unified)
// ══════════════════════════════════════════════
let dueTabMode = 'customer';
let allSuppliers =[];
let currentDueType = 'customer'; 

function switchDueTab(mode) {
  dueTabMode = mode;
  document.querySelectorAll('#page-due .tab-btn').forEach((b, i) => b.classList.toggle('active', (i===0 && mode==='customer') || (i===1 && mode==='supplier')));
  document.getElementById('btn-add-due-person').textContent = mode === 'customer' ? t('dues.s47') : t('dues.s48');
  document.getElementById('btn-add-due-person').setAttribute('onclick', mode === 'customer' ? 'openAddCustomerModal()' : 'openAddSupplierModal()');
  document.getElementById('due-list-container').innerHTML = t('dues.s6');
  if(mode === 'customer') loadCustomers(); else loadSuppliers();
}

async function loadCustomers() {
  try {
    const {data} = await sb.from('customers').select('*').eq('status','active').order('total_due',{ascending:false});
    allCustomers = data ||[]; renderDueList(allCustomers, 'customer');
  } catch(e) { toast(t('dues.s12'), 'error'); }
}

async function loadSuppliers() {
  try {
    const {data, error} = await sb.from('suppliers').select('*').eq('status','active').order('total_due',{ascending:false});
    if(error) throw error;
    allSuppliers = data ||[]; renderDueList(allSuppliers, 'supplier');
  } catch(e) {
    if(e.message && e.message.includes('relation "suppliers" does not exist')) {
        document.getElementById('due-list-container').innerHTML = t('dues.s4');
    } else { toast(t('dues.s29'), 'error'); }
  }
}

function filterDueList() {
  const q = (document.getElementById('due-search-input')?.value||'').toLowerCase();
  const filter = document.getElementById('due-filter')?.value||'';
  const sourceList = dueTabMode === 'customer' ? allCustomers : allSuppliers;
  const filtered = sourceList.filter(c =>
    (!q || c.name.toLowerCase().includes(q) || (c.phone||'').includes(q)) &&
    (!filter || (filter==='due' && c.total_due>0) || (filter==='clear' && c.total_due<=0))
  );
  renderDueList(filtered, dueTabMode);
}

function renderDueList(list, type) {
  const el = document.getElementById('due-list-container'); if(!el) return;
  if(!list.length){ el.innerHTML=t('dues.s5'); return; }
  el.innerHTML = list.map(item => `
    <div class="customer-card ${item.total_due>0?'has-due':''}" onclick="openDueDetail('${item.id}', '${type}')">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:42px;height:42px;background:${type==='customer'?'#e8f5e9':'#fff3e0'};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;">${type === 'customer' ? '👤' : '🏢'}</div>
          <div><div style="font-weight:700;">${item.name}</div><div style="font-size:12px;color:#6b7280;">📞 ${item.phone||'—'}</div></div>
        </div>
        <div style="text-align:right;">
          ${item.total_due>0 ? `<div style="font-size:18px;font-weight:700;color:#c62828;">${taka(item.total_due)}</div><div style="font-size:11px;color:#c62828;">${type==='customer'?'বাকি পাবো':'বাকি দিতে হবে'}</div>` : `<div style="font-size:14px;font-weight:700;color:#2d8a45;">✅ পরিষ্কার</div>`}
        </div>
      </div>
    </div>`).join('');
}

function openAddCustomerModal(){
  const html=`<div class="form-group"><label class="form-label">${t('dues.s20')}<span class="required">*</span></label><input id="nc-name" class="form-control" placeholder="${t('dues.s13')}"/></div><div class="form-group"><label class="form-label">${t('dues.s38')}</label><input id="nc-phone" class="form-control" placeholder="01XXXXXXXXX"/></div><div class="form-group"><label class="form-label">${t('dues.s15')}</label><input id="nc-address" class="form-control" placeholder="${t('dues.s16')}"/></div>`;
  openModal('addCustModal',t('dues.s50'),html,[{label:t('common.save'),action:'saveCustomer()',cls:'btn-primary'},{label:t('common.cancel'),action:'closeModal("addCustModal")',cls:'btn-secondary'}]);
}
async function saveCustomer(){
  const name=document.getElementById('nc-name')?.value.trim(), phone=document.getElementById('nc-phone')?.value.trim(), address=document.getElementById('nc-address')?.value.trim();
  if(!name){toast(t('dues.s21'),'error');return;}
  try{ await sb.from('customers').insert({name,phone,address,created_by:currentUserProfile?.id}); closeModal('addCustModal'); toast(t('dues.s11')); loadCustomers(); }catch(e){toast(t('auth.s21')+e.message,'error');}
}

function openAddSupplierModal(){
  const html = `<div class="form-group"><label class="form-label">${t('dues.s30')}<span class="required">*</span></label><input id="ns-name" class="form-control" placeholder="${t('dues.s19')}"/></div><div class="form-group"><label class="form-label">${t('dues.s38')}</label><input id="ns-phone" class="form-control" placeholder="01XXXXXXXXX"/></div><div class="form-group"><label class="form-label">${t('dues.s15')}</label><input id="ns-address" class="form-control" placeholder="${t('dues.s15')}"/></div>`;
  openModal('addSuppModal',t('dues.s49'),html,[{label:t('common.save'),action:'saveSupplier()',cls:'btn-primary'},{label:t('common.cancel'),action:'closeModal("addSuppModal")',cls:'btn-secondary'}]);
}
async function saveSupplier(){
  const name = document.getElementById('ns-name')?.value.trim(), phone = document.getElementById('ns-phone')?.value.trim(), address = document.getElementById('ns-address')?.value.trim();
  if(!name){toast(t('dues.s21'),'error');return;}
  try{ await sb.from('suppliers').insert({name, phone, address, created_by: currentUserProfile?.id}); closeModal('addSuppModal'); toast(t('dues.s28')); loadSuppliers(); } catch(e){toast(t('auth.s21') + e.message,'error');}
}

async function openDueDetail(id, type) {
    currentDueType = type;
    const isCust = type === 'customer';
    const person = isCust ? allCustomers.find(c=>c.id===id) : allSuppliers.find(c=>c.id===id);
    if(!person) return;
    
    currentCustomerId = id; 
    document.querySelector('#page-customer-detail .page-top-title').innerHTML = `${isCust ? '👤 কাস্টমার' : '🏢 মহাজন'}${t('dues.s3')}<div class="page-top-sub">${t('dues.s41')}</div>`;
    document.getElementById('cd-name').textContent = person.name;
    document.getElementById('cd-phone').textContent = person.phone || '—';
    document.getElementById('cd-address').textContent = person.address || '—';
    document.getElementById('cd-total-due').textContent = taka(person.total_due);
    
    let btnContainer = document.querySelector('#page-customer-detail .page-top-bar .action-btns');
    if (!btnContainer) {
        btnContainer = document.createElement('div');
        btnContainer.className = 'action-btns';
        btnContainer.style.display = 'flex'; btnContainer.style.gap = '6px';
        const topBar = document.querySelector('#page-customer-detail .page-top-bar');
        const origBtn = topBar.querySelector('button.btn-primary'); if(origBtn) origBtn.remove();
        topBar.appendChild(btnContainer);
    }
    const deleteBtn = currentUserProfile?.role === 'owner' ? `<button class="btn btn-icon btn-sm" style="background:#ffebee;color:#c62828;border:1px solid #ffcdd2;padding:6px 10px;" onclick="deleteDueEntity('${id}', '${type}')" title="${t('dues.s32')}">🗑️</button>` : '';
    btnContainer.innerHTML = `<button class="btn btn-danger btn-sm" onclick="openAddManualDueModal()">＋${t('dues.s2')}</button><button class="btn btn-primary btn-sm" onclick="openPaymentModal()">💰${t('dues.s1')}${isCust ? 'গ্রহণ' : 'প্রদান'}</button>${deleteBtn}`;
    
    const title1 = document.getElementById('cd-total-sales').previousElementSibling; if(title1) title1.textContent = isCust ? t('dues.s36') : t('dues.s35');
    const title2 = document.getElementById('cd-total-paid').previousElementSibling; if(title2) title2.textContent = isCust ? t('dues.s34') : t('dues.s33');

    const {data:txns} = await sb.from('due_transactions').select('*').eq('entity_id',id).eq('entity_type', type).order('created_at',{ascending:false}).limit(30);
    const totalAdded = (txns||[]).filter(t=>t.transaction_type==='due_added').reduce((s,t)=>s+parseFloat(t.amount||0),0);
    const totalPaid = (txns||[]).filter(t=>t.transaction_type==='payment').reduce((s,t)=>s+parseFloat(t.amount||0),0);
    
    document.getElementById('cd-total-sales').textContent = taka(totalAdded);
    document.getElementById('cd-total-paid').textContent = taka(totalPaid);
    
    const tbody = document.getElementById('customer-txn-body');
    if(tbody) tbody.innerHTML = txns?.length ? txns.map(t=>`<tr><td style="font-size:11px;">${fmtDT(t.created_at)}</td><td>${t.transaction_type==='payment' ? `<span class="badge badge-green">${isCust?'পেমেন্ট রিসিভ':'পেমেন্ট প্রদান'}</span>` : '<span class="badge badge-red">বাকি</span>'}</td><td style="font-weight:700;">${taka(t.amount)}</td><td>${taka(t.balance_after)}</td><td>${t.note||'—'}</td></tr>`).join('') : t('dues.s7');
    navigateTo('customer-detail');
}

function openAddManualDueModal() {
    if(!currentCustomerId) return;
    const isCust = currentDueType === 'customer';
    const person = isCust ? allCustomers.find(c => c.id === currentCustomerId) : allSuppliers.find(c => c.id === currentCustomerId);
    
    const html = `<div style="margin-bottom:14px;padding:12px;background:#f9fafb;border-radius:10px;"><strong>${person?.name}</strong><br><span style="color:#c62828;font-weight:700;">${t('dues.s27')}${taka(person?.total_due)}</span></div><div class="form-group"><label class="form-label">${t('dues.s18')}<span class="required">*</span></label><input type="number" id="manual-due-amount" class="form-control" min="0.01" step="0.01" placeholder="${t('dues.s14')}"/></div><div class="form-group"><label class="form-label">${t('dues.s10')}</label><input id="manual-due-note" class="form-control" placeholder="${t('dues.s40')}"/></div>`;
    openModal('addManualDueModal', t('dues.s46'), html,[{label: t('dues.s45'), action: `saveManualDue(${person?.total_due || 0})`, cls: 'btn-danger'},{label: t('common.cancel'), action: 'closeModal("addManualDueModal")', cls: 'btn-secondary'}]);
}

async function saveManualDue(currentDue) {
    const amount = parseFloat(document.getElementById('manual-due-amount')?.value) || 0;
    const note = document.getElementById('manual-due-note')?.value || t('dues.s39');
    if(!amount || amount <= 0) { toast(t('dues.s42'), 'error'); return; }
    try {
        const newDue = currentDue + amount, table = currentDueType === 'customer' ? 'customers' : 'suppliers';
        await sb.from(table).update({total_due: newDue}).eq('id', currentCustomerId);
        await sb.from('due_transactions').insert({entity_type: currentDueType, entity_id: currentCustomerId, transaction_type: 'due_added', amount: amount, direction: 'in', balance_after: newDue, note: note, created_by: currentUserProfile?.id});
        closeModal('addManualDueModal'); toast(t('dues.s17'));
        
        if(currentDueType === 'customer') { const c = allCustomers.find(x => x.id === currentCustomerId); if(c) c.total_due = newDue; } 
        else { const s = allSuppliers.find(x => x.id === currentCustomerId); if(s) s.total_due = newDue; }
        openDueDetail(currentCustomerId, currentDueType); 
    } catch(e) { toast(t('auth.s21') + e.message, 'error'); }
}

function openPaymentModal() {
    if(!currentCustomerId) return;
    const isCust = currentDueType === 'customer';
    const person = isCust ? allCustomers.find(c => c.id === currentCustomerId) : allSuppliers.find(c => c.id === currentCustomerId);
    const html = `<div style="margin-bottom:14px;padding:12px;background:#f9fafb;border-radius:10px;"><strong>${person?.name}</strong><br><span style="color:#c62828;font-weight:700;">${t('dues.s37')}${taka(person?.total_due)}</span></div><div class="form-group"><label class="form-label">${t('dues.s23')}<span class="required">*</span></label><input type="number" id="pay-amount" class="form-control" min="0.01" step="0.01" value="${person?.total_due||0}"/></div><div class="form-group"><label class="form-label">${t('common.note')}</label><input id="pay-note" class="form-control" placeholder="${t('cashbox.s9')}"/></div>`;
    openModal('paymentModal', isCust ? t('dues.s51') : t('dues.s52'), html,[{label: t('dues.s44'), action: 'savePayment()', cls: 'btn-primary'},{label: t('common.cancel'), action: 'closeModal("paymentModal")', cls: 'btn-secondary'}]);
}

async function savePayment() {
    const amount = parseFloat(document.getElementById('pay-amount')?.value) || 0;
    const note = document.getElementById('pay-note')?.value || '';
    if(!amount || amount <= 0) { toast(t('dues.s24'), 'error'); return; }
    
    const isCust = currentDueType === 'customer', table = isCust ? 'customers' : 'suppliers';
    const person = isCust ? allCustomers.find(c => c.id === currentCustomerId) : allSuppliers.find(c => c.id === currentCustomerId);
    try {
        const newDue = Math.max(0, (person?.total_due || 0) - amount);
        await sb.from(table).update({total_due: newDue}).eq('id', currentCustomerId);
        await sb.from('due_transactions').insert({entity_type: currentDueType, entity_id: currentCustomerId, transaction_type: 'payment', amount: amount, direction: 'out', balance_after: newDue, note: note, created_by: currentUserProfile?.id});
        
        const cashDirection = isCust ? 'in' : 'out', cashType = isCust ? 'due_payment' : 'supplier_due_payment';
        await sb.from('cash_transactions').insert({transaction_type: cashType, direction: cashDirection, amount: amount, note: (isCust ? `${t('dues.s22')}` : `${t('dues.s25')}`) + person?.name, created_by: currentUserProfile?.id});
        
        if(isCust) { const c = allCustomers.find(x => x.id === currentCustomerId); if(c) c.total_due = newDue; } 
        else { const s = allSuppliers.find(x => x.id === currentCustomerId); if(s) s.total_due = newDue; }
        closeModal('paymentModal'); toast(t('dues.s26')); openDueDetail(currentCustomerId, currentDueType);
    } catch(e) { toast(t('auth.s21') + e.message, 'error'); }
}

async function deleteDueEntity(id, type) {
    if(!confirm(t('dues.s9'))) return;
    
    const table = type === 'customer' ? 'customers' : 'suppliers';
    try {
        const {data: person, error: personError} = await sb.from(table).select('name,total_due,status').eq('id', id).single();
        if(personError) throw personError;
        if(!person) throw new Error(t('dues.s8'));

        const balance = parseFloat(person.total_due) || 0;
        if(balance !== 0 && !confirm(t('dues.s53').replace('{amount}', taka(Math.abs(balance))))) return;

        const {data: updated, error: updateError} = await sb.from(table)
            .update({status: 'deleted', total_due: 0})
            .eq('id', id)
            .select('id');
        if(updateError) throw updateError;
        if(!updated || updated.length === 0) throw new Error(t('dues.s8'));

        const {error: transactionError} = await sb.from('due_transactions')
            .delete()
            .eq('entity_id', id)
            .eq('entity_type', type);
        if(transactionError) {
            const {error: restoreError} = await sb.from(table)
                .update({status: person.status || 'active', total_due: balance})
                .eq('id', id);
            if(restoreError) {
                throw new Error(`${transactionError.message}; ${t('dues.s54')}${restoreError.message}`);
            }
            throw transactionError;
        }
        
        toast(t('dues.s43'));
        
        // ২. লোকাল লিস্ট থেকে সাথে সাথে মুছে ফেলা (যাতে চোখের সামনে থেকে সাথে সাথে গায়েব হয়ে যায়)
        if (type === 'customer') {
            allCustomers = allCustomers.filter(c => c.id !== id);
        } else {
            allSuppliers = allSuppliers.filter(s => s.id !== id);
        }
        
        // ৩. মূল বাকির খাতা পেজে ব্যাক করা
        document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
        document.getElementById('page-due').classList.add('active');
        
        if(typeof updateBottomNav === 'function') updateBottomNav('due');
        
        // ৪. যেখান থেকে ডিলিট হয়েছে, সেই নির্দিষ্ট ট্যাবটি আবার ওপেন ও রিফ্রেশ করা
        switchDueTab(type);
        if(typeof loadDashboard === 'function') loadDashboard();
        if(document.getElementById('page-reports')?.classList.contains('active') && typeof loadReport === 'function') loadReport();
        
    } catch(e) {
        toast(t('dues.s31') + e.message, 'error');
    }
}
