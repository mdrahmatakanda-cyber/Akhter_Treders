/* ══════════════════════════════════════════════════════════════
   📊 REPORTS
   ══════════════════════════════════════════════════════════════
   দৈনিক/মাসিক/কাস্টম রিপোর্ট ও প্রিন্ট।
   ══════════════════════════════════════════════════════════════ */

// ══════════════════════════════════════════════
// 📊 REPORTS
// ══════════════════════════════════════════════
function setReportPeriod(period){
  reportPeriod=period;
  document.querySelectorAll('#page-reports .tab-btn').forEach(b=>b.classList.remove('active'));
  const idx={today:0,week:1,month:2,custom:3}[period];
  document.querySelectorAll('#page-reports .tab-btn')[idx]?.classList.add('active');
  const cdr=document.getElementById('custom-date-range');
  if(cdr){period==='custom'?cdr.classList.remove('hidden'):cdr.classList.add('hidden');}
  loadReport();
}
function getReportDateRange(){
  const now=new Date(); let from,to;
  if(reportPeriod==='today'){from=to=todayISO();}
  else if(reportPeriod==='week'){const d=new Date(now);d.setDate(d.getDate()-6);from=d.toISOString().split('T')[0];to=todayISO();}
  else if(reportPeriod==='month'){from=new Date(now.getFullYear(),now.getMonth(),1).toISOString().split('T')[0];to=todayISO();}
  else{from=document.getElementById('report-from')?.value||todayISO();to=document.getElementById('report-to')?.value||todayISO();}
  return{from,to};
}
async function loadReport(){
  const {from,to}=getReportDateRange();
  try{
    const [salesR,purR,expR,custR,cashR]=await Promise.all([
      sb.from('sales').select('total_amount,cash_amount,due_amount').eq('status','active').gte('sale_date',from+'T00:00:00').lte('sale_date',to+'T23:59:59'),
      sb.from('purchases').select('total_amount,paid_amount,due_amount').eq('status','active').gte('purchase_date',from+'T00:00:00').lte('purchase_date',to+'T23:59:59'),
      sb.from('expenses').select('amount').eq('status','active').gte('expense_date',from).lte('expense_date',to),
      sb.from('customers').select('total_due').eq('status','active').gt('total_due',0),
      sb.from('cash_transactions').select('direction,amount').gte('transaction_date',from+'T00:00:00').lte('transaction_date',to+'T23:59:59')
    ]);
    const totalSales=(salesR.data||[]).reduce((s,r)=>s+parseFloat(r.total_amount||0),0);
    const totalPur=(purR.data||[]).reduce((s,r)=>s+parseFloat(r.total_amount||0),0);
    const totalExp=(expR.data||[]).reduce((s,r)=>s+parseFloat(r.amount||0),0);
    const totalCustDue=(custR.data||[]).reduce((s,r)=>s+parseFloat(r.total_due||0),0);
    const cashIn=(cashR.data||[]).filter(c=>c.direction==='in').reduce((s,c)=>s+parseFloat(c.amount||0),0);
    const cashOut=(cashR.data||[]).filter(c=>c.direction==='out').reduce((s,c)=>s+parseFloat(c.amount||0),0);
    const profit=totalSales-totalPur-totalExp;
    const setTxt=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    setTxt('rpt-sales',taka(totalSales)); setTxt('rpt-purchase',taka(totalPur));
    setTxt('rpt-expense',taka(totalExp)); setTxt('rpt-customer-due',taka(totalCustDue));
    setTxt('rpt-cash',taka(cashIn-cashOut));
    const profitEl=document.getElementById('rpt-profit');
    if(profitEl){profitEl.textContent=taka(Math.abs(profit));profitEl.style.color=profit>=0?'#2d8a45':'#c62828';const lbl=profitEl.parentElement?.querySelector('.report-label');if(lbl)lbl.textContent=profit>=0?t('reports.s37'):t('reports.s39');}
  }catch(e){toast(t('reports.s29'),'error');}
}
async function showReportDetail(type){
  const {from,to}=getReportDateRange();
  const headEl=document.getElementById('report-detail-head');
  const bodyEl=document.getElementById('report-detail-body');
  const titleEl=document.getElementById('report-detail-title');
  if(!headEl||!bodyEl)return;

  if(type==='sales'){
    const {data}=await sb.from('sales').select('*').eq('status','active').gte('sale_date',from+'T00:00:00').lte('sale_date',to+'T23:59:59').order('sale_date',{ascending:false});
    if(titleEl)titleEl.textContent=t('reports.s34');
    headEl.innerHTML=t('reports.s14');
    bodyEl.innerHTML=(data||[]).map(s=>`<tr><td>${fmtDate(s.sale_date)}</td><td>${s.customer_name}</td><td>${taka(s.total_amount)}</td><td>${taka(s.cash_amount)}</td><td style="color:#c62828;">${taka(s.due_amount)}</td></tr>`).join('')||t('reports.s13');
  }else if(type==='purchases'){
    const {data}=await sb.from('purchases').select('*').eq('status','active').gte('purchase_date',from+'T00:00:00').lte('purchase_date',to+'T23:59:59').order('purchase_date',{ascending:false});
    if(titleEl)titleEl.textContent=t('purchases.s36');
    headEl.innerHTML=t('reports.s17');
    bodyEl.innerHTML=(data||[]).map(p=>`<tr><td>${fmtDate(p.purchase_date)}</td><td>${p.supplier_name}</td><td>${taka(p.total_amount)}</td><td>${taka(p.paid_amount)}</td><td style="color:#c62828;">${taka(p.due_amount)}</td></tr>`).join('')||t('reports.s10');
  }else if(type==='expenses'){
    const {data}=await sb.from('expenses').select('*').eq('status','active').gte('expense_date',from).lte('expense_date',to).order('expense_date',{ascending:false});
    if(titleEl)titleEl.textContent=t('reports.s36');
    headEl.innerHTML=t('reports.s15');
    bodyEl.innerHTML=(data||[]).map(e=>`<tr><td>${fmtDate(e.expense_date)}</td><td>${e.category}</td><td style="color:#c62828;">${taka(e.amount)}</td><td>${e.note||'—'}</td><td></td></tr>`).join('')||t('reports.s11');
  }else if(type==='due'){
    const {data}=await sb.from('customers').select('*').eq('status','active').gt('total_due',0).order('total_due',{ascending:false});
    if(titleEl)titleEl.textContent=t('reports.s33');
    headEl.innerHTML=t('reports.s18');
    bodyEl.innerHTML=(data||[]).map(c=>`<tr><td>${c.name}</td><td>${c.phone||'—'}</td><td style="color:#c62828;font-weight:700;">${taka(c.total_due)}</td><td></td><td></td></tr>`).join('')||t('reports.s12');
  } else if (type === 'cash') {
    // ক্যাশ ট্রানজেকশনের বিস্তারিত
    const {data} = await sb.from('cash_transactions').select('*').gte('transaction_date',from+'T00:00:00').lte('transaction_date',to+'T23:59:59').order('transaction_date',{ascending:false});
    if(titleEl) titleEl.textContent = t('reports.s35');
    headEl.innerHTML = t('reports.s16');
    const tMap = {sale:t('common.sales'),purchase:t('common.purchase'),expense:t('common.expense'),due_payment:t('reports.s23'),supplier_due_payment:t('cashbox.s15'),manual_in:t('cashbox.s11'),manual_out:t('cashbox.s10')};
    bodyEl.innerHTML = (data||[]).map(t => `<tr><td>${fmtDate(t.transaction_date)}</td><td>${tMap[t.transaction_type]||t.transaction_type}</td><td>${t.direction==='in'?'<span class="badge badge-green">↑ ইন</span>':'<span class="badge badge-red">↓ আউট</span>'}</td><td style="text-align:right;font-weight:700;">${taka(t.amount)}</td></tr>`).join('') || t('reports.s9');

  } else if (type === 'profit') {
    // লাভ / ক্ষতির বিস্তারিত হিসাব
    const [salesR, purR, expR] = await Promise.all([
      sb.from('sales').select('total_amount').eq('status','active').gte('sale_date',from+'T00:00:00').lte('sale_date',to+'T23:59:59'),
      sb.from('purchases').select('total_amount').eq('status','active').gte('purchase_date',from+'T00:00:00').lte('purchase_date',to+'T23:59:59'),
      sb.from('expenses').select('amount').eq('status','active').gte('expense_date',from).lte('expense_date',to)
    ]);
    const tSales = (salesR.data||[]).reduce((s,r) => s+(parseFloat(r.total_amount)||0), 0);
    const tPur = (purR.data||[]).reduce((s,r) => s+(parseFloat(r.total_amount)||0), 0);
    const tExp = (expR.data||[]).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

    // নিট লাভ বা ক্ষতি হিসাব
    const netProfit = tSales - tPur - tExp;
    const isProfit = netProfit >= 0;
    const profitText = isProfit ? t('reports.s30') : t('reports.s19');
    const profitColor = isProfit ? 'green' : 'red';

    if (titleEl) titleEl.textContent = t('reports.s38');
    
    // টেবিলের হেড
    headEl.innerHTML = `
      <tr>
        <th>${t('reports.s24')}</th>
        <th style="text-align:right;">${t('common.quantity')}</th>
      </tr>
    `;

    // টেবিলের বডি (বিক্রয়, ক্রয়, খরচ এবং চূড়ান্ত লাভ/ক্ষতি)
    bodyEl.innerHTML = `
      <tr>
        <td>${t('reports.s27')}</td>
        <td style="text-align:right; font-weight:600; color:green;">${taka(tSales)}</td>
      </tr>
      <tr>
        <td>${t('reports.s26')}</td>
        <td style="text-align:right; color:red;">- ${taka(tPur)}</td>
      </tr>
      <tr>
        <td>${t('reports.s25')}</td>
        <td style="text-align:right; color:red;">- ${taka(tExp)}</td>
      </tr>
      <tr style="border-top: 2px solid #ccc; background-color: #f9f9f9;">
        <td style="font-weight:700; font-size: 1.1em;">${t('reports.s21')}${profitText}</td>
        <td style="text-align:right; font-weight:700; font-size: 1.1em; color:${profitColor};">
          ${taka(Math.abs(netProfit))}
        </td>
      </tr>
    `;
  }
}
function printReport(){
  const {from,to}=getReportDateRange();
  const win=window.open('','_blank','width=800,height:600');
  if(!win){toast(t('reports.s22'),'error');return;}

  const sales=document.getElementById('rpt-sales')?.textContent||t('purchases.s34');
  const purchase=document.getElementById('rpt-purchase')?.textContent||t('purchases.s34');
  const expense=document.getElementById('rpt-expense')?.textContent||t('purchases.s34');
  const due=document.getElementById('rpt-customer-due')?.textContent||t('purchases.s34');
  const profit=document.getElementById('rpt-profit')?.textContent||t('purchases.s34');
  const profitLabel=document.getElementById('rpt-profit')?.parentElement?.querySelector('.report-label')?.textContent||t('reports.s31');

  const detailHead=document.getElementById('report-detail-head')?.innerHTML||'';
  const detailBody=document.getElementById('report-detail-body')?.innerHTML||'';
  const detailTitle=document.getElementById('report-detail-title')?.textContent||'';

  win.document.write(`<!DOCTYPE html>
<html lang="bn"><head>
<meta charset="UTF-8"/>
<title>${t('reports.s28')}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@400;600;700;800&display=swap" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Noto Serif Bengali',serif;font-size:10px;padding:14px;color:#1a1a1a;}
th,td{padding:4px 6px;font-size:10px;}
h1{font-size:16px;}
h2,h3{font-size:11px;}
.card .value{font-size:14px;}
.card .label{font-size:10px;}
@page{size:A4;margin:10mm;}
h1{font-size:20px;font-weight:800;color:#1a5c2a;text-align:center;margin-bottom:4px;}
h2{font-size:13px;text-align:center;color:#6b7280;margin-bottom:4px;}
h3{font-size:12px;text-align:center;color:#6b7280;margin-bottom:16px;}
.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px;}
.card{border:2px solid #2d8a45;border-radius:10px;padding:12px;text-align:center;}
.card .label{font-size:11px;color:#6b7280;margin-bottom:4px;}
.card .value{font-size:18px;font-weight:800;color:#1a5c2a;}
.card.red .value{color:#c62828;}
.card.blue .value{color:#1565c0;}
.card.orange .value{color:#e65c00;}
table{width:100%;border-collapse:collapse;margin-top:16px;}
thead{background:#1a5c2a;color:white;}
th,td{padding:8px 10px;text-align:left;border-bottom:1px solid #e0e0e0;}
.period{text-align:center;font-size:12px;color:#6b7280;margin-bottom:12px;
        padding:6px;background:#f0f4f0;border-radius:8px;}
.print-btn{display:none;}
@media print{.print-btn{display:none;}}
/* ── PRODUCT GRID 2 COLUMNS COMPACT FIX ── */
#sale-product-grid, #pur-product-grid {
  grid-template-columns: repeat(2, 1fr) !important; /*${t('reports.s2')}*/
  gap: 6px !important; /*${t('reports.s3')}*/
  padding: 4px !important;
}
</style>
</head><body>
<h1>${t('auth.s23')}</h1>
<h2>${t('reports.s20')}</h2>
<h3>${t('reports.s28')}</h3>
<div class="period">${t('reports.s32')}${from}${t('backup.s2')}${to}</div>

<div class="summary">
  <div class="card">
    <div class="label">💰${t('reports.s8')}</div>
    <div class="value">${sales}</div>
  </div>
  <div class="card red">
    <div class="label">📦${t('reports.s6')}</div>
    <div class="value" style="color:#1565c0;">${purchase}</div>
  </div>
  <div class="card red">
    <div class="label">💸${t('reports.s7')}</div>
    <div class="value">${expense}</div>
  </div>
  <div class="card orange">
    <div class="label">👥${t('reports.s4')}</div>
    <div class="value">${due}</div>
  </div>
  <div class="card">
    <div class="label">${profitLabel}</div>
    <div class="value">${profit}</div>
  </div>
</div>

${detailTitle?`
<div style="font-size:15px;font-weight:800;color:#1a5c2a;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #2d8a45;">${detailTitle}</div>
<table>
  <thead>${detailHead}</thead>
  <tbody>${detailBody}</tbody>
</table>`:''}

<div style="text-align:center;margin-top:24px;font-size:11px;color:#9ca3af;">
${t('reports.s1')}${fmtDate(new Date())} |${t('reports.s5')}
</div>
</body></html>`);

  win.document.close();
  setTimeout(()=>win.print(),600);
}
