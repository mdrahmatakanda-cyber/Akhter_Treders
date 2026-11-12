/* ══════════════════════════════════════════════════════════════
   📊 DASHBOARD
   ══════════════════════════════════════════════════════════════
   হোম স্ক্রিনের সামারি কার্ড ও সাম্প্রতিক কার্যক্রম।
   ══════════════════════════════════════════════════════════════ */

// ══════════════════════════════════════════════
// 📊 DASHBOARD
// ══════════════════════════════════════════════
async function loadDashboard(){
  try{
    const today=todayISO();
    // Load products for sale/purchase modals
    const {data:prods}=await sb.from('products').select('*').eq('status','active').order('name');
    allProducts=prods||[];
    const {data:stocks}=await sb.from('stock').select('*,products(name,category,unit,low_stock_threshold,status)');
    const validStocks=(stocks||[]).filter(s=>s.products?.status==='active');
    const lowStockItems=validStocks.filter(s=>s.current_quantity<=(s.products?.low_stock_threshold||10));
    const el=document.getElementById('low-stock-count'); if(el)el.textContent=bn(lowStockItems.length);
    const lsEl=document.getElementById('low-stock-list');
    if(lsEl){
      if(!lowStockItems.length){ lsEl.innerHTML=t('dashboard.s2'); }
      else{ lsEl.innerHTML=lowStockItems.slice(0,5).map(s=>`<div class="low-stock-item"><div class="low-stock-icon">🌿</div><div><div class="low-stock-name">${s.products?.name||'—'}</div><div class="low-stock-qty">${t('dashboard.s10')}${bn(s.current_quantity)} ${s.products?.unit||''}</div></div><span class="low-stock-badge">${t('dashboard.s9')}</span></div>`).join(''); }
    }
    const {data:dueData}=await sb.from('customers').select('total_due').eq('status','active').gt('total_due',0);
    const totalDue=(dueData||[]).reduce((s,r)=>s+parseFloat(r.total_due||0),0);
    const todayDueEl=document.getElementById('today-due'); if(todayDueEl)animateNumber(todayDueEl, totalDue);
    const tcEl=document.getElementById('total-due-customers'); if(tcEl)tcEl.textContent=`${t('dashboard.s8')}${bn((dueData||[]).length)}${t('dashboard.s1')}`;
    const {data:cashData}=await sb.from('cash_transactions').select('direction,amount').gte('transaction_date',today+'T00:00:00').lte('transaction_date',today+'T23:59:59');
    const cashIn=(cashData||[]).filter(c=>c.direction==='in').reduce((s,c)=>s+parseFloat(c.amount||0),0);
    const cashOut=(cashData||[]).filter(c=>c.direction==='out').reduce((s,c)=>s+parseFloat(c.amount||0),0);
    const ciEl=document.getElementById('today-cash-in'); if(ciEl)animateNumber(ciEl, cashIn);
    const coEl=document.getElementById('today-cash-out'); if(coEl)animateNumber(coEl, cashOut);
    await loadRecentActivity(today);
  }catch(e){console.error('Dashboard error:',e);}
}

async function loadRecentActivity(today){
  const tbody = document.getElementById('recent-activity-body');
  if(!tbody) return;
  
  try {
    const rows =[];
    // আজকের দিনের ফিল্টার বাদ দেওয়া হয়েছে, যাতে সবসময় সর্বশেষ ডাটাগুলো দেখায়।
    // users(name) বাদ দেওয়া হয়েছে, যাতে ডাটাবেস রিলেশন না থাকলেও কোড ক্র্যাশ না করে।
    const [{data:sales}, {data:purs}, {data:exps}] = await Promise.all([
      sb.from('sales').select('*').eq('status','active').order('sale_date',{ascending:false}).limit(5),
      sb.from('purchases').select('*').eq('status','active').order('purchase_date',{ascending:false}).limit(3),
      sb.from('expenses').select('*').eq('status','active').order('created_at',{ascending:false}).limit(3)
    ]);

    (sales||[]).forEach(s => rows.push({date:fmtDT(s.sale_date), type:'sale', desc:s.customer_name||'Cash Customer', qty:'—', amount:taka(s.total_amount), user:'—', sort:new Date(s.sale_date)}));
    (purs||[]).forEach(p => rows.push({date:fmtDT(p.purchase_date), type:'purchase', desc:p.supplier_name||'General Supplier', qty:'—', amount:taka(p.total_amount), user:'—', sort:new Date(p.purchase_date)}));
    (exps||[]).forEach(e => rows.push({date:fmtDate(e.expense_date), type:'expense', desc:e.category, qty:'—', amount:taka(e.amount), user:'—', sort:new Date(e.created_at)}));
    
    // সময়ের ভিত্তিতে সাজানো (নতুনটা সবার উপরে)
    rows.sort((a,b) => b.sort - a.sort);
    
    const tbl = {sale:t('dashboard.s5'), purchase:t('dashboard.s4'), expense:t('dashboard.s3')};
    
    // প্রথম ৭টি কার্যক্রম দেখানো হবে
    tbody.innerHTML = rows.length ? rows.slice(0, 7).map(r => `<tr><td style="white-space:nowrap;font-size:11px;">${r.date}</td><td>${tbl[r.type]||r.type}</td><td>${r.desc}</td><td>${r.qty}</td><td style="font-weight:600;">${r.amount}</td><td style="text-align:center;">👤</td></tr>`).join('') : t('dashboard.s7');
    
  } catch (error) {
    console.error("Activity Load Error:", error);
    tbody.innerHTML = t('dashboard.s6');
  }
}
