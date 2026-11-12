/* ══════════════════════════════════════════════════════════════
   🗑️ TRASH & DELETE SYSTEM
   ══════════════════════════════════════════════════════════════
   মুছে ফেলা এন্ট্রি ট্র্যাশে জমা থাকে, চাইলে ফিরিয়ে আনা (restore) যায়।
   ══════════════════════════════════════════════════════════════ */

// ══════════════════════════════════════════════

// ১. বিক্রয় মুছা
async function deleteSale(id) {
    if(!confirm(t('trash.s5'))) return;
    try {
        const {data: sale} = await sb.from('sales').select('*').eq('id', id).single();
        await sb.from('sales').update({status: 'deleted'}).eq('id', id); // ট্র্যাশে পাঠানো
        // ক্যাশ এবং বাকির হিসাব রিভার্স (উল্টো) করা
        if(sale.cash_amount > 0) await sb.from('cash_transactions').insert({transaction_type:'sale', direction:'out', amount: sale.cash_amount, note: t('trash.s14') + sale.customer_name});
        if(sale.due_amount > 0 && sale.customer_id) {
            const {data: c} = await sb.from('customers').select('total_due').eq('id', sale.customer_id).single();
            await sb.from('customers').update({total_due: Math.max(0, (c?.total_due||0) - sale.due_amount)}).eq('id', sale.customer_id);
        }
        // স্টক আগের অবস্থায় ফিরিয়ে আনা
        const {data: items} = await sb.from('sale_items').select('*').eq('sale_id', id);
        for(let i of items) {
            const {data: stk} = await sb.from('stock').select('current_quantity').eq('product_id', i.product_id).single();
            await sb.from('stock').update({current_quantity: (stk?.current_quantity||0) + i.quantity}).eq('product_id', i.product_id);
        }
        toast(t('trash.s13')); if(typeof loadSales === 'function') loadSales();
    } catch(e) { toast(t('auth.s21') + e.message, 'error'); }
}

// ২. ক্রয় মুছা
async function deletePurchase(id) {
    if(!confirm(t('trash.s3'))) return;
    try {
        const {data: pur} = await sb.from('purchases').select('*').eq('id', id).single();
        await sb.from('purchases').update({status: 'deleted'}).eq('id', id);
        // ক্যাশ রিভার্স
        if(pur.paid_amount > 0) await sb.from('cash_transactions').insert({transaction_type:'purchase', direction:'in', amount: pur.paid_amount, note: t('trash.s7') + pur.supplier_name});
        // স্টক রিভার্স
        const {data: items} = await sb.from('purchase_items').select('*').eq('purchase_id', id);
        for(let i of items) {
            const {data: stk} = await sb.from('stock').select('current_quantity').eq('product_id', i.product_id).single();
            await sb.from('stock').update({current_quantity: Math.max(0, (stk?.current_quantity||0) - i.quantity)}).eq('product_id', i.product_id);
        }
        toast(t('trash.s13')); if(typeof loadPurchases === 'function') loadPurchases();
    } catch(e) { toast(t('auth.s21') + e.message, 'error'); }
}

// ৩. খরচ মুছা (আগের ফাংশনটি রিপ্লেস করবে)
async function deleteExpense(id, amount) {
    if(!confirm(t('trash.s4'))) return;
    try {
        await sb.from('expenses').update({status: 'deleted'}).eq('id', id);
        await sb.from('cash_transactions').insert({transaction_type:'expense', direction:'in', amount: parseFloat(amount), note: t('trash.s9')});
        toast(t('trash.s13')); if(typeof loadExpenses === 'function') loadExpenses();
    } catch(e) { toast(t('auth.s21') + e.message, 'error'); }
}


// ── ট্র্যাশ প্যানেল ও রিস্টোর সিস্টেম (Owner Only) ──
function openTrashModal() {
    const html = `
      <div class="tabs" style="margin-bottom:12px;">
        <button class="tab-btn active" id="tab-sales" onclick="loadTrashData('sales')">${t('common.sales')}</button>
        <button class="tab-btn" id="tab-purchases" onclick="loadTrashData('purchases')">${t('common.purchase')}</button>
        <button class="tab-btn" id="tab-expenses" onclick="loadTrashData('expenses')">${t('common.expense')}</button>
      </div>
      <div id="trash-list-container" style="max-height:400px; overflow-y:auto;">${t('trash.s18')}</div>
    `;
    openModal('trashModal', t('trash.s20'), html,[{label:t('common.close'), action:'closeModal("trashModal")', cls:'btn-primary'}], 'md');
    setTimeout(() => loadTrashData('sales'), 50);
}

async function loadTrashData(type) {
    document.querySelectorAll('#backdrop-trashModal .tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + type).classList.add('active');
    
    const el = document.getElementById('trash-list-container');
    el.innerHTML = t('dues.s6');
    
    try {
        const dateCol = type === 'expenses' ? 'expense_date' : (type === 'sales' ? 'sale_date' : 'purchase_date');
        const {data} = await sb.from(type).select('*').eq('status', 'deleted').order(dateCol, {ascending: false}).limit(50);
        
        if(!data || data.length === 0) { el.innerHTML = t('trash.s1'); return; }
        
        el.innerHTML = data.map(item => {
            let name = type === 'sales' ? item.customer_name : type === 'purchases' ? item.supplier_name : item.category;
            let amt = type === 'expenses' ? item.amount : item.total_amount;
            let date = item[dateCol];
            return `
            <div style="padding:10px; background:#fafafa; border:1px solid #eee; border-radius:10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <div style="flex:1;">
                    <strong style="color:#1a5c2a; font-size:13px;">${name||'—'}</strong><br>
                    <span style="font-size:11px; color:#6b7280;">📅 ${fmtDate(date)} | 💰 ${taka(amt)}</span>
                </div>
                <div style="display:flex; gap:6px;">
                    <button class="btn btn-sm btn-outline" style="padding:4px 8px; font-size:11px;" onclick="restoreEntity('${type}', '${item.id}')" title="${t('trash.s16')}">🔄</button>
                    <button class="btn btn-sm" style="padding:4px 8px; font-size:11px; background:#ffebee; color:#c62828; border:1px solid #ffcdd2;" onclick="permanentlyDeleteEntity('${type}', '${item.id}')" title="${t('trash.s11')}">❌</button>
                </div>
            </div>`;
        }).join('');
    } catch(e) { el.innerHTML = t('trash.s2'); }
}

// চিরতরে মুছে ফেলার নতুন ফাংশন
async function permanentlyDeleteEntity(type, id) {
    if(!confirm(t('trash.s19'))) return;
    try {
        // ডাটাবেস এরর এড়াতে আগে ভেতরের আইটেমগুলো ডিলিট করা হচ্ছে
        if(type === 'sales') await sb.from('sale_items').delete().eq('sale_id', id);
        if(type === 'purchases') await sb.from('purchase_items').delete().eq('purchase_id', id);
        
        // মূল ডাটা ডিলিট করা
        await sb.from(type).delete().eq('id', id);
        
        toast(t('trash.s12'));
        loadTrashData(type); // লিস্ট আপডেট করা
    } catch(e) { toast(t('auth.s21') + e.message, 'error'); }
}

async function restoreEntity(type, id) {
    if(!confirm(t('trash.s6'))) return;
    try {
        const {data: item} = await sb.from(type).select('*').eq('id', id).single();
        await sb.from(type).update({status: 'active'}).eq('id', id); // রিস্টোর করা হলো
        
        // রিস্টোর করার পর আবার ক্যাশ ও স্টক এডজাস্ট করা
        if(type === 'sales') {
            if(item.cash_amount > 0) await sb.from('cash_transactions').insert({transaction_type:'sale', direction:'in', amount: item.cash_amount, note: t('trash.s15') + item.customer_name});
            if(item.due_amount > 0 && item.customer_id) {
                const {data: c} = await sb.from('customers').select('total_due').eq('id', item.customer_id).single();
                await sb.from('customers').update({total_due: (c?.total_due||0) + item.due_amount}).eq('id', item.customer_id);
            }
            const {data: items} = await sb.from('sale_items').select('*').eq('sale_id', id);
            for(let i of items) {
                const {data: stk} = await sb.from('stock').select('current_quantity').eq('product_id', i.product_id).single();
                await sb.from('stock').update({current_quantity: Math.max(0, (stk?.current_quantity||0) - i.quantity)}).eq('product_id', i.product_id);
            }
        } 
        else if(type === 'purchases') {
            if(item.paid_amount > 0) await sb.from('cash_transactions').insert({transaction_type:'purchase', direction:'out', amount: item.paid_amount, note: t('trash.s8') + item.supplier_name});
            const {data: items} = await sb.from('purchase_items').select('*').eq('purchase_id', id);
            for(let i of items) {
                const {data: stk} = await sb.from('stock').select('current_quantity').eq('product_id', i.product_id).single();
                await sb.from('stock').update({current_quantity: (stk?.current_quantity||0) + i.quantity}).eq('product_id', i.product_id);
            }
        } 
        else if(type === 'expenses') {
            await sb.from('cash_transactions').insert({transaction_type:'expense', direction:'out', amount: item.amount, note: t('trash.s10')});
        }
        
        toast(t('trash.s17')); loadTrashData(type); 
        if(type==='sales' && typeof loadSales==='function') loadSales();
        if(type==='purchases' && typeof loadPurchases==='function') loadPurchases();
        if(type==='expenses' && typeof loadExpenses==='function') loadExpenses();
    } catch(e) { toast(t('auth.s21') + e.message, 'error'); }
}

