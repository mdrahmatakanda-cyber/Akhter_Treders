/* ══════════════════════════════════════════════════════════════
   🛒 PURCHASES — ক্রয়, ক্রয় কার্ট
   ══════════════════════════════════════════════════════════════
   সাপ্লায়ারের কাছ থেকে পণ্য ক্রয় ও ক্রয় তালিকা।
   ══════════════════════════════════════════════════════════════ */

async function openNewPurchaseModal(){
  purchaseCart=[];
  // সবসময় ডাটাবেস থেকে ফ্রেশ স্টক আনবে
  const {data}=await sb.from('products').select('*, stock(current_quantity)').eq('status','active').order('name');
allProducts=data||[];
  // এই ক্যাটাগরি ভ্যালুগুলো পণ্যের category ফিল্ডের সাথে মিলিয়ে ফিল্টার করা হয়
  const cats=getProductCategories();
  const html=`
   <!-- Tabs: সব পণ্য / লো স্টক -->
    <div style="display:flex;gap:6px;margin-bottom:10px;background:#f0f4f0;padding:4px;border-radius:10px;">
      <button id="pur-tab-all" onclick="switchPurTab('all')"
        style="flex:1;padding:7px;border:none;border-radius:8px;font-size:13px;
               font-weight:700;cursor:pointer;font-family:inherit;
               background:white;color:#1a5c2a;box-shadow:0 1px 4px rgba(0,0,0,0.1);">
        📦${t('purchases.s3')}
      </button>
      <button id="pur-tab-low" onclick="switchPurTab('low')"
        style="flex:1;padding:7px;border:none;border-radius:8px;font-size:13px;
               font-weight:700;cursor:pointer;font-family:inherit;
               background:transparent;color:#6b7280;">
        ⚠️${t('purchases.s2')}
      </button>
    </div>
 <!-- Category + Search -->
    <div style="display:flex;gap:8px;margin-bottom:8px;">
      <select id="pur-cat-filter" class="form-control" style="flex:0 0 120px;" onchange="renderPurProductGrid()">
        <option value="">${t('purchases.s28')}</option>
        ${cats.map(c=>`<option value="${c}">${c}</option>`).join('')}
      </select>
      <input id="pur-prod-search" class="form-control" style="flex:1;"
        placeholder="🔍${t('purchases.s1')}" oninput="renderPurProductGrid()"/>
    </div>

    <!-- Product Grid -->
    <div id="pur-product-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:3px;
         max-height:160px;overflow-y:auto;border:1.5px solid #e0e0e0;border-radius:10px;
         padding:8px;background:#fafafa;margin-bottom:10px;"></div>

    <!-- Cart -->
    <div id="pur-cart-items" style="margin-bottom:10px;"></div>

    <!-- Total -->
    <div style="background:#e3f2fd;border:1.5px dashed #1565c0;border-radius:10px;padding:12px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:800;color:#1565c0;">
        <span>${t('purchases.s29')}</span><span id="pur-total">${t('purchases.s34')}</span>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">${t('purchases.s30')}</label>
      <input id="pur-supplier-name" class="form-control" placeholder="${t('purchases.s32')}"/>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">${t('purchases.s19')}</label>
        <input type="number" id="pur-paid" class="form-control" value="0" min="0" oninput="calcPurDue()"/>
      </div>
      <div class="form-group">
        <label class="form-label">${t('purchases.s22')}</label>
        <input type="number" id="pur-due" class="form-control" value="0" readonly
          style="background:#f9fafb;color:#c62828;font-weight:700;"/>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">${t('common.note')}</label>
      <input id="pur-note" class="form-control" placeholder="${t('expenses.s12')}"/>
    </div>`;

  openModal('purchaseModal',t('purchases.s37'),html,[
    {label:t('purchases.s35'),action:'savePurchase()',cls:'btn-primary'},
    {label:t('common.cancel'),action:'closeModal("purchaseModal")',cls:'btn-secondary'}
  ],'md');
  setTimeout(()=>renderPurProductGrid(),80);
}


// এই ছোট ফাংশনটি শুধু পুরনো লিংকের এরর ফিক্স করার জন্য
function renderPurProductGridFiltered(tab='all'){
  renderPurProductGrid(tab);
}

function switchPurTab(tab){
  const allBtn=document.getElementById('pur-tab-all');
  const lowBtn=document.getElementById('pur-tab-low');
  if(!allBtn||!lowBtn) return;

  if(tab==='all'){
    allBtn.style.background='white'; allBtn.style.color='#1a5c2a'; allBtn.style.boxShadow='0 1px 4px rgba(0,0,0,0.1)';
    lowBtn.style.background='transparent'; lowBtn.style.color='#6b7280'; lowBtn.style.boxShadow='none';
    const catEl=document.getElementById('pur-cat-filter'); if(catEl) catEl.value='';
  } else {
    lowBtn.style.background='white'; lowBtn.style.color='#c62828'; lowBtn.style.boxShadow='0 1px 4px rgba(0,0,0,0.1)';
    allBtn.style.background='transparent'; allBtn.style.color='#6b7280'; allBtn.style.boxShadow='none';
  }

  renderPurProductGrid(tab);
}

// এটি হলো আপনার ক্রয়ের (Purchase) মূল এবং স্মার্ট কার্ড ডিজাইন
function renderPurProductGrid(tab='all'){
  const cat=document.getElementById('pur-cat-filter')?.value||'';
  const q=(document.getElementById('pur-prod-search')?.value||'').toLowerCase();

  let filtered=allProducts.filter(p=>
    p.status==='active'&&
    (!cat||p.category===cat)&&
    (!q||[p.name,p.unit,p.brand].some(value=>(value||'').toLowerCase().includes(q)))
  );

  // লো স্টক ফিল্টার
  if(tab==='low'){
    filtered=filtered.filter(p=>{
      // ডাটাবেস থেকে পাওয়া লেটেস্ট স্টক চেক করা
      const stockQty = Array.isArray(p.stock) ? (p.stock[0]?.current_quantity || 0) : (p.stock?.current_quantity || 0);
      return stockQty <= (p.low_stock_threshold||10);
    });
  }

  const grid=document.getElementById('pur-product-grid');
  if(!grid) return;

  if(!filtered.length){
    const emptyMessage=tab==='low'?t('purchases.s5'):t('purchases.s4');
    if(q&&!allProducts.some(product=>productMatchesSearch(product,q))){
      renderMissingProductAction(grid,t('purchases.s4'),'purchase',q);
    }else{
      grid.innerHTML=emptyMessage;
    }
    return;
  }

  grid.innerHTML=filtered.map(p=>{
    const inCart=purchaseCart.find(c=>c.product_id===p.id);
    const stockQty = Array.isArray(p.stock) ? (p.stock[0]?.current_quantity || 0) : (p.stock?.current_quantity || 0);
    const isLow = stockQty <= (p.low_stock_threshold||10);
    
    // আসল ম্যাজিক: ডাটাবেস থেকে পণ্যের আসল একক (Unit) বের করা
    const exactUnit = p.unit || (p.product_type === 'weight' ? t('purchases.s11') : t('purchases.s21'));

    return `<div onclick="addPurToCartDirect('${p.id}')"
      style="background:${inCart?'#e3f2fd':'white'}; border:1px solid ${isLow?'#ffcdd2':inCart?'#1565c0':'#e0e0e0'};
             border-radius:6px; padding:6px; cursor:pointer; transition:all 0.15s; 
             display:flex; flex-direction:column; gap:3px; box-shadow:0 1px 3px rgba(0,0,0,0.05);"
      onmouseover="this.style.borderColor='#1565c0';this.style.background='#f0f4ff'"
      onmouseout="this.style.borderColor='${isLow?'#ffcdd2':inCart?'#1565c0':'#e0e0e0'}';this.style.background='${inCart?'#e3f2fd':'white'}'">
      
      <!-- ১. নাম এবং পরিমাণ (Unit Badge) -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:4px;">
        <div style="font-size:11px; font-weight:800; color:#1a3a1a; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; text-overflow:ellipsis; line-height:1.3;">${p.name}</div>
        <div style="font-size:9px; font-weight:800; color:white; background:#1565c0; padding:2px 5px; border-radius:4px; white-space:nowrap; flex-shrink:0;">${exactUnit}</div>
      </div>
      
      <!-- ২. ক্যাটাগরি -->
      <div style="font-size:9px; color:#6b7280; font-weight:600; text-align:left;">${p.category}</div>
      
      <!-- ৩. মূল্য এবং স্টক -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
        <div style="font-size:13px; font-weight:800; color:#1565c0;">${taka(p.purchase_price)}</div>
        <div style="font-size:10px; font-weight:700; color:${isLow?'#c62828':'#2d8a45'}; background:${isLow?'#ffebee':'#e8f5e9'}; padding:2px 5px; border-radius:4px;">${t('dashboard.s10')}${bn(stockQty)}</div>
      </div>
      
    </div>`;
  }).join('');
}

function addPurToCartDirect(productId){
  const p=allProducts.find(x=>x.id===productId); if(!p) return;
  const existing=purchaseCart.find(c=>c.product_id===productId);
  if(existing){existing.quantity+=1;renderPurchaseCart();renderPurProductGrid();return;}
  purchaseCart.push({product_id:p.id,name:p.name,unit:p.unit||'',quantity:1,unit_price:p.purchase_price||0,product_type:p.product_type});
  renderPurchaseCart(); renderPurProductGrid();
}

function renderPurchaseCart(){
  const el=document.getElementById('pur-cart-items'); if(!el)return;
  if(!purchaseCart.length){
    el.innerHTML=t('purchases.s6');
    return;
  }
  el.innerHTML=`
    <div style="border:1.5px solid #e0e0e0;border-radius:10px;overflow:hidden;margin-bottom:10px;">
      <div style="background:#1565c0;color:white;padding:8px 12px;display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:6px;font-size:11px;font-weight:700;">
        <span>${t('purchases.s18')}</span><span style="text-align:center;">${t('common.quantity')}</span><span style="text-align:right;">${t('purchases.s12')}</span><span style="text-align:right;">${t('common.total')}</span><span></span>
      </div>
      ${purchaseCart.map((item,i)=>`
      <div style="padding:8px 12px;display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:6px;align-items:center;border-bottom:1px solid #f0f0f0;font-size:12px;">
        <div>
          <div style="font-weight:700;font-size:13px;">${item.name}</div>
          <div style="color:#6b7280;font-size:10px;">${item.unit||''}</div>
        </div>
        <input type="number" value="${item.quantity}" min="0.01" step="0.01"
          style="width:100%;padding:5px 6px;border:1.5px solid #ddd;border-radius:6px;font-size:13px;text-align:center;"
          oninput="updatePurCartItem(${i},'quantity',this.value)"/>
        <input type="number" value="${item.unit_price}" min="0"
          style="width:100%;padding:5px 6px;border:1.5px solid #ddd;border-radius:6px;font-size:12px;text-align:right;"
          oninput="updatePurCartItem(${i},'unit_price',this.value)"/>
        <div style="text-align:right;font-weight:700;color:#1565c0;">${taka(item.quantity*item.unit_price)}</div>
        <button onclick="removePurCartItem(${i})"
          style="background:#ffebee;border:none;color:#c62828;width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:14px;">✕</button>
      </div>`).join('')}
    </div>`;
  // Update total
  const total=purchaseCart.reduce((s,c)=>s+c.quantity*c.unit_price,0);
  const totEl=document.getElementById('pur-total'); if(totEl)totEl.textContent=taka(total);
  const paidEl=document.getElementById('pur-paid'); if(paidEl&&parseFloat(paidEl.value)==0)paidEl.value=total.toFixed(2);
  calcPurDue();
}


function removePurCartItem(i){purchaseCart.splice(i,1);renderPurchaseCart();renderPurProductGrid();}
function updatePurCartItem(i,f,v){purchaseCart[i][f]=parseFloat(v)||0;const t=purchaseCart.reduce((s,c)=>s+c.quantity*c.unit_price,0);const el=document.getElementById("pur-total");if(el)el.textContent=taka(t);calcPurDue();}
function calcPurDue() {
  const total = purchaseCart.reduce((s, c) => s + c.quantity * c.unit_price, 0);
  
  const paidInput = document.getElementById('pur-paid');
  const dueInput = document.getElementById('pur-due');
  
  if (!paidInput || !dueInput) return;

  // পুরো টাকাটা অটোমেটিক "পরিশোধ" এর ঘরে বসিয়ে দেওয়া
  if (paidInput.dataset.modified !== 'true') {
    paidInput.value = total.toFixed(2);
  }

  const paid = parseFloat(paidInput.value) || 0;
  dueInput.value = Math.max(0, total - paid).toFixed(2);
}

// পরিশোধের ঘরে টাইপ করলে যেন অটো ফিল বন্ধ থাকে
document.addEventListener('input', function(e) {
  if (e.target.id === 'pur-paid') {
    e.target.dataset.modified = 'true';
    calcPurDue();
  }
});

async function savePurchase(){
  if(!purchaseCart.length){toast(t('purchases.s9'),'error');return;}
  const total_amount=purchaseCart.reduce((s,c)=>s+c.quantity*c.unit_price,0);
  const paid_amount=parseFloat(document.getElementById('pur-paid')?.value)||0;
  const due_amount=parseFloat(document.getElementById('pur-due')?.value)||0;
  const supplier_name=document.getElementById('pur-supplier-name')?.value.trim()||'General Supplier';
  const note=document.getElementById('pur-note')?.value||'';
  try{
    const {data:pur,error}=await sb.from('purchases').insert({supplier_name,total_amount,subtotal:total_amount,paid_amount,due_amount,note,created_by:currentUserProfile?.id}).select().single();
    if(error)throw error;
    for(const item of purchaseCart){
      await sb.from('purchase_items').insert({purchase_id:pur.id,product_id:item.product_id,product_name:item.name,quantity:item.quantity,unit:item.unit,unit_price:item.unit_price,subtotal:item.quantity*item.unit_price});
      const {data:stk}=await sb.from('stock').select('current_quantity').eq('product_id',item.product_id).single();
      const before=stk?.current_quantity||0; const after=before+item.quantity;
      await sb.from('stock').update({current_quantity:after}).eq('product_id',item.product_id);
      await sb.from('stock_movements').insert({product_id:item.product_id,movement_type:'purchase',quantity:item.quantity,direction:'in',before_stock:before,after_stock:after,reference_id:pur.id,created_by:currentUserProfile?.id});
    }
    if(paid_amount>0) await sb.from('cash_transactions').insert({transaction_type:'purchase',direction:'out',amount:paid_amount,reference_id:pur.id,note:`${t('purchases.s16')}${supplier_name}`,created_by:currentUserProfile?.id});
    closeModal('purchaseModal'); toast(t('purchases.s15'));
    if(document.getElementById('page-purchase').classList.contains('active')) loadPurchases();
    loadDashboard();
  }catch(e){toast(t('purchases.s14')+e.message,'error');}
}

async function viewPurchaseDetail(id){
  const [{data:pur},{data:items}]=await Promise.all([sb.from('purchases').select('*').eq('id',id).single(),sb.from('purchase_items').select('*').eq('purchase_id',id)]);
  const html=`<div style="background:#f9fafb;padding:12px;border-radius:10px;margin-bottom:12px;">
    <div class="total-row"><span>${t('purchases.s31')}</span><strong>${pur.supplier_name}</strong></div>
    <div class="total-row"><span>${t('purchases.s17')}</span><span>${fmtDT(pur.purchase_date)}</span></div>
  </div>
  <div class="table-wrapper"><table><thead><tr><th>${t('purchases.s18')}</th><th>${t('common.quantity')}</th><th>${t('purchases.s25')}</th><th>${t('common.total')}</th></tr></thead>
  <tbody>${(items||[]).map(i=>`<tr><td>${i.product_name}</td><td>${bn(i.quantity)} ${i.unit}</td><td>${taka(i.unit_price)}</td><td>${taka(i.subtotal)}</td></tr>`).join('')}</tbody></table></div>
  <div class="total-box mt-3">
    <div class="total-row grand"><span>${t('purchases.s26')}</span><span>${taka(pur.total_amount)}</span></div>
    <div class="total-row"><span>${t('purchases.s20')}</span><span style="color:#2d8a45;">${taka(pur.paid_amount)}</span></div>
    <div class="total-row"><span>${t('purchases.s23')}</span><span style="color:#c62828;">${taka(pur.due_amount)}</span></div>
  </div>`;
  openModal('purDetailModal',t('purchases.s36'),html,[{label:t('common.close'),action:'closeModal("purDetailModal")',cls:'btn-primary'}]);
}


async function loadPurchases(){
  try{
    const {data, error} = await sb.from('purchases').select('*').order('purchase_date',{ascending:false}).limit(100);
    if(error) throw error;
    
    allPurchases = (data||[]).filter(p => p.status !== 'deleted');
    renderPurchasesTable(allPurchases);
  } catch(e) { 
    console.error(e); toast(t('purchases.s13'), 'error'); 
  }
}

// ══ MISSING FUNCTIONS ══


function filterPurchases(q){
  const search=(q||document.querySelector('#page-purchase .search-input')?.value||'').toLowerCase();
  const dateVal=document.getElementById('purchase-date-filter')?.value||'';
  renderPurchasesTable(allPurchases.filter(p=>
    (!search||(p.supplier_name||'').toLowerCase().includes(search))&&
    (!dateVal||p.purchase_date?.startsWith(dateVal))
  ));
}


function renderPurchasesTable(purchases){
  const tbody=document.getElementById('purchase-table-body'); if(!tbody)return;
  if(!purchases.length){tbody.innerHTML=t('purchases.s7');return;}
  tbody.innerHTML=purchases.map((p,i)=>`<tr>
    <td>${bn(i+1)}</td>
    <td style="font-size:11px;white-space:nowrap;">${fmtDT(p.purchase_date)}</td>
    <td>${p.supplier_name||'General Supplier'}</td>
    <td style="font-weight:700;">${taka(p.total_amount)}</td>
    <td style="color:#2d8a45;">${taka(p.paid_amount)}</td>
    <td style="color:#c62828;">${taka(p.due_amount)}</td>
    <td><span class="badge badge-green">${t('purchases.s27')}</span></td>
    <td><div style="display:flex;gap:4px;flex-wrap:nowrap;">
      <button class="btn btn-icon btn-sm" onclick="viewPurchaseDetail('${p.id}')">👁️</button>
      <button class="btn btn-icon btn-sm" style="color:#c62828;" title="${t('dues.s32')}" onclick="deletePurchase('${p.id}')">🗑️</button>
    </div></td>
  </tr>`).join('');
}
