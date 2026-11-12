/* ══════════════════════════════════════════════════════════════
   🏭 STOCK
   ══════════════════════════════════════════════════════════════
   স্টক দেখা, সমন্বয় (adjustment) ও স্টক হিস্টোরি।
   ══════════════════════════════════════════════════════════════ */

// ══════════════════════════════════════════════
// 🏭 STOCK
// ══════════════════════════════════════════════
async function loadStock(){
  try{
    const {data}=await sb.from('stock').select('*,products(id,name,category,product_type,unit,low_stock_threshold,status)');
    allStockData=(data||[]).filter(s=>s.products);
    renderStockTable(allStockData);
  }catch(e){toast(t('stock.s29'),'error');}
}
function renderStockTable(stocks){
  const tbody=document.getElementById('stock-table-body'); if(!tbody)return;
  if(!stocks.length){tbody.innerHTML=t('stock.s9');return;}
  tbody.innerHTML=stocks.map((s, i)=>{
    const threshold=s.products?.low_stock_threshold||10; 
    const qty=s.current_quantity||0;
    const status=qty<=0?'out':qty<=threshold?'low':'ok';
    const badge=status==='out'?t('stock.s8'):status==='low'?t('stock.s7'):t('stock.s6');
    
    return `<tr>
      <td style="font-weight:700; color:#6b7280;">${i + 1}</td>
      <td><strong>${s.products?.name||'—'}</strong></td>
      <td>${s.products?.category||'—'}</td>
      <td>${s.products?.product_type==='weight'?'⚖️ কেজি':'📦 পিস'}</td>
      <td style="font-weight:800;font-size:16px;color:#1a5c2a;">${qty} <small style="color:#6b7280;font-size:12px;">${s.products?.unit||''}</small></td>
      <td style="font-weight:600;">${threshold}</td><td>${badge}</td>
      <td><div style="display:flex;gap:4px;">
        <button class="btn btn-sm" style="background:#e8f5e9;color:#2d8a45;border:1px solid #2d8a45;" onclick="quickStockAdjust('${s.product_id}','${s.products?.name}',${qty},'in')">${t('stock.s4')}</button>
        <button class="btn btn-sm" style="background:#ffebee;color:#c62828;border:1px solid #c62828;" onclick="quickStockAdjust('${s.product_id}','${s.products?.name}',${qty},'out')">${t('stock.s5')}</button>
        <button class="btn btn-icon btn-sm" onclick="viewStockHistory('${s.product_id}','${s.products?.name}')">📜</button>
      </div></td></tr>`;
  }).join('');
}
function filterStock(q){
  const search=(q||document.querySelector('#page-stock .search-input')?.value||'').toLowerCase();
  const statusF=document.getElementById('stock-status-filter')?.value||'';
  renderStockTable(allStockData.filter(s=>{
    const qty=s.current_quantity||0; const threshold=s.products?.low_stock_threshold||10;
    const statusOk=!statusF||(statusF==='low'&&qty>0&&qty<=threshold)||(statusF==='out'&&qty<=0);
    return(!search||s.products?.name?.toLowerCase().includes(search))&&statusOk;
  }));
}
function openStockAdjustModal(){
  const html=`
    <div class="form-group"><label class="form-label">${t('stock.s15')}<span class="required">*</span></label>
      <select id="adj-product" class="form-control"><option value="">${t('stock.s17')}</option>
        ${allProducts.filter(p=>p.status==='active').map(p=>`<option value="${p.id}">${p.name} (${p.category})</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">${t('stock.s13')}</label><select id="adj-direction" class="form-control"><option value="in">➕${t('stock.s3')}</option><option value="out">➖${t('stock.s2')}</option></select></div>
      <div class="form-group"><label class="form-label">${t('stock.s18')}<span class="required">*</span></label><input type="number" id="adj-qty" class="form-control" min="0.01" step="0.01" placeholder="${t('common.quantity')}"/></div>
    </div>
    <div class="form-group"><label class="form-label">${t('cashbox.s2')}</label><select id="adj-reason" class="form-control"><option value="correction">${t('stock.s25')}</option><option value="${t('stock.s14')}">${t('stock.s14')}</option><option value="${t('stock.s31')}">${t('stock.s31')}</option><option value="expired">${t('stock.s24')}</option></select></div>
    <div class="form-group"><label class="form-label">${t('common.note')}</label><input id="adj-note" class="form-control" placeholder="${t('stock.s23')}"/></div>`;
  openModal('adjModal',t('stock.s10'),html,[
    {label:t('common.save'),action:'saveStockAdjustment()',cls:'btn-primary'},
    {label:t('common.cancel'),action:'closeModal("adjModal")',cls:'btn-secondary'}
  ]);
}
function quickStockAdjust(productId,productName,currentQty,direction){
  const html=`
    <div style="margin-bottom:14px;padding:12px;background:#f9fafb;border-radius:10px;"><strong>${productName}</strong><br><span style="color:#6b7280;">${t('stock.s21')}<strong>${bn(currentQty)}</strong></span></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">${t('stock.s18')}<span class="required">*</span></label><input type="number" id="qadj-qty" class="form-control" min="0.01" step="0.01" placeholder="${t('common.quantity')}"/></div>
      <div class="form-group"><label class="form-label">${t('cashbox.s2')}</label><select id="qadj-reason" class="form-control"><option value="correction">${t('stock.s25')}</option><option value="${t('stock.s14')}">${t('stock.s14')}</option><option value="${t('stock.s31')}">${t('stock.s31')}</option></select></div>
    </div>
    <input type="hidden" id="qadj-product-id" value="${productId}"/>
    <input type="hidden" id="qadj-direction" value="${direction}"/>
    <input type="hidden" id="qadj-current" value="${currentQty}"/>`;
  openModal('qadjModal',direction==='in'?t('stock.s32'):t('stock.s33'),html,[
    {label:t('common.save'),action:'saveQuickAdj()',cls:direction==='in'?'btn-primary':'btn-danger'},
    {label:t('common.cancel'),action:'closeModal("qadjModal")',cls:'btn-secondary'}
  ]);
}
async function saveQuickAdj(){
  const productId=document.getElementById('qadj-product-id')?.value;
  const direction=document.getElementById('qadj-direction')?.value;
  const qty=parseFloat(document.getElementById('qadj-qty')?.value)||0;
  const reason=document.getElementById('qadj-reason')?.value;
  const current=parseFloat(document.getElementById('qadj-current')?.value)||0;
  if(!productId||qty<=0){toast(t('cashbox.s6'),'error');return;}
  const after=direction==='in'?current+qty:Math.max(0,current-qty);
  await sb.from('stock').update({current_quantity:after}).eq('product_id',productId);
  await sb.from('stock_movements').insert({product_id:productId,movement_type:'adjustment',quantity:qty,direction,before_stock:current,after_stock:after,reason,created_by:currentUserProfile?.id});
  closeModal('qadjModal'); toast(t('stock.s28')); loadStock();
}
async function saveStockAdjustment(){
  const productId=document.getElementById('adj-product')?.value;
  const direction=document.getElementById('adj-direction')?.value;
  const qty=parseFloat(document.getElementById('adj-qty')?.value)||0;
  const reason=document.getElementById('adj-reason')?.value;
  const note=document.getElementById('adj-note')?.value;
  if(!productId||qty<=0){toast(t('stock.s16'),'error');return;}
  const {data:stk}=await sb.from('stock').select('current_quantity').eq('product_id',productId).single();
  const before=stk?.current_quantity||0; const after=direction==='in'?before+qty:Math.max(0,before-qty);
  await sb.from('stock').update({current_quantity:after}).eq('product_id',productId);
  await sb.from('stock_movements').insert({product_id:productId,movement_type:'adjustment',quantity:qty,direction,before_stock:before,after_stock:after,reason,note,created_by:currentUserProfile?.id});
  closeModal('adjModal'); toast(t('stock.s30')); loadStock();
}
async function viewStockHistory(productId,productName){
  const {data}=await sb.from('stock_movements').select('*,users(name)').eq('product_id',productId).order('created_at',{ascending:false}).limit(20);
  const typeMap={sale:t('common.sales'),purchase:t('common.purchase'),sale_return:t('stock.s22'),purchase_return:t('stock.s12'),adjustment:t('stock.s26'),edit:t('stock.s27')};
  const html=`<h4 style="margin-bottom:12px;">${productName}${t('stock.s1')}</h4>
    <div class="table-wrapper"><table><thead><tr><th>${t('backup.s13')}</th><th>${t('stock.s13')}</th><th>${t('stock.s11')}</th><th>${t('common.quantity')}</th><th>${t('stock.s20')}</th><th>${t('stock.s19')}</th><th>${t('cashbox.s2')}</th></tr></thead>
    <tbody>${(data||[]).map(m=>`<tr>
      <td style="font-size:11px;">${fmtDT(m.created_at)}</td>
      <td>${typeMap[m.movement_type]||m.movement_type}</td>
      <td>${m.direction==='in'?'<span style="color:#2d8a45;">➕ ইন</span>':'<span style="color:#c62828;">➖ আউট</span>'}</td>
      <td><strong>${bn(m.quantity)}</strong></td><td>${bn(m.before_stock||0)}</td><td>${bn(m.after_stock||0)}</td>
      <td>${m.reason||'—'}</td></tr>`).join('')}</tbody></table></div>`;
  openModal('historyModal',t('stock.s34'),html,[{label:t('common.close'),action:'closeModal("historyModal")',cls:'btn-primary'}],true);
}

