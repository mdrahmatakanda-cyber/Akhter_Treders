/* ══════════════════════════════════════════════════════════════
   💰 SALES — বিক্রয়, কার্ট, রিসিট প্রিন্ট
   ══════════════════════════════════════════════════════════════
   নতুন বিক্রয় তৈরি, কার্ট ম্যানেজমেন্ট, বিক্রয় তালিকা ও রিসিট প্রিন্ট।
   ══════════════════════════════════════════════════════════════ */

// ══════════════════════════════════════════════
// 💰 SALES
// ══════════════════════════════════════════════
async function loadSales(){
  try{
    // users(name) বাদ দেওয়া হয়েছে এবং ডাটাবেস থেকে সব ডাটা আনা হচ্ছে
    const {data, error} = await sb.from('sales').select('*').order('sale_date',{ascending:false}).limit(100);
    if(error) throw error;
    
    // শুধু ট্র্যাশে থাকা (deleted) ডাটাগুলো বাদ দিয়ে বাকি সব দেখানো হবে
    allSales = (data||[]).filter(s => s.status !== 'deleted');
    renderSalesTable(allSales);
  } catch(e) { 
    console.error(e); toast(t('sales.s35'), 'error'); 
  }
}
function renderSalesTable(sales){
  const tbody=document.getElementById('sales-table-body'); if(!tbody)return;
  if(!sales||!sales.length){
    tbody.innerHTML=t('sales.s20');
    return;
  }
  tbody.innerHTML=sales.map((s,i)=>`<tr>
    <td>${bn(i+1)}</td>
    <td style="font-size:11px;white-space:nowrap;">${fmtDT(s.sale_date)}</td>
    <td style="font-weight:600;">${s.customer_name||'Cash Customer'}</td>
    <td style="font-weight:700;color:#1a5c2a;">${taka(s.total_amount)}</td>
    <td style="color:#2d8a45;">${taka(s.cash_amount)}</td>
    <td style="color:${parseFloat(s.due_amount)>0?'#c62828':'#2d8a45'};">${taka(s.due_amount)}</td>
    <td><span class="badge ${s.status==='active'?'badge-green':s.status==='returned'?'badge-orange':'badge-gray'}">${s.status==='active'?'সক্রিয়':s.status==='returned'?'ফেরত':'মুছে ফেলা'}</span></td>
    <td><div style="display:flex;gap:4px;flex-wrap:nowrap;">
      <button class="btn btn-icon btn-sm" title="${t('sales.s38')}" onclick="viewSaleDetail('${s.id}')">👁️</button>
      ${s.status==='active'?`<button class="btn btn-icon btn-sm" title="প্রিন্ট" onclick="printSaleReceipt('${s.id}')">🖨️</button>`:''}
      <button class="btn btn-icon btn-sm" style="color:#c62828;" title="${t('dues.s32')}" onclick="deleteSale('${s.id}')">🗑️</button>
    </div></td></tr>`).join('');
}
function filterSales(q){
  const search=(q||document.querySelector('#page-sales .search-input')?.value||'').toLowerCase();
  const dateVal=document.getElementById('sales-date-filter')?.value||'';
  renderSalesTable(allSales.filter(s=>
    (!search||(s.customer_name||'').toLowerCase().includes(search))&&
    (!dateVal||s.sale_date?.startsWith(dateVal))
  ));
}

async function openNewSaleModal(){
  saleCart=[]; saleCustomer=null;
  // সবসময় ডাটাবেস থেকে ফ্রেশ স্টক আনবে
  const {data}=await sb.from('products').select('*, stock(current_quantity)').eq('status','active').order('name');
allProducts=data||[];
  // এই ক্যাটাগরি ভ্যালুগুলো পণ্যের category ফিল্ডের সাথে মিলিয়ে ফিল্টার করা হয়
  const cats=getProductCategories();
  const html=`
    <!-- Price type -->
    <div style="display:flex;gap:16px;margin-bottom:14px;padding:10px;background:#e8f5e9;border-radius:10px;">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:700;font-size:14px;">
        <input type="radio" name="price-type" value="retail" checked onchange="renderSaleProductGrid()">${t('sales.s4')}
      </label>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:700;font-size:14px;">
        <input type="radio" name="price-type" value="wholesale" onchange="renderSaleProductGrid()">${t('sales.s6')}
      </label>
    </div>

    <!-- Category + Search -->
    <div style="display:flex;gap:8px;margin-bottom:8px;">
      <select id="sale-cat-filter" class="form-control" style="flex:0 0 120px;" onchange="renderSaleProductGrid()">
        <option value="">${t('purchases.s28')}</option>
        ${cats.map(c=>`<option value="${c}">${c}</option>`).join('')}
      </select>
      <input id="sale-prod-search" class="form-control" style="flex:1;"
        placeholder="🔍${t('purchases.s1')}" oninput="renderSaleProductGrid()"/>
    </div>

    <!-- Product Grid -->
    <div id="sale-product-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:3px;
         max-height:160px;overflow-y:auto;border:1.5px solid #e0e0e0;border-radius:10px;
         padding:6px;background:#fafafa;margin-bottom:10px;"></div>

    <!-- Cart items -->
    <div id="sale-cart-items" style="margin-bottom:10px;"></div>

    <!-- Total box -->
    <div style="background:#e8f5e9;border:1.5px dashed #4caf65;border-radius:10px;padding:12px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px;">
        <span>${t('sales.s41')}</span><span id="s-subtotal">${t('purchases.s34')}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:13px;">
        <span>${t('sales.s27')}</span>
        <input type="number" id="s-discount" style="width:90px;padding:4px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;" value="0" min="0" oninput="recalcCart()"/>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:800;color:#1a5c2a;border-top:2px solid #4caf65;padding-top:8px;margin-top:4px;">
        <span>${t('purchases.s29')}</span><span id="s-total">${t('purchases.s34')}</span>
      </div>
    </div>

    <!-- Customer search -->
    <div class="form-group">
      <label class="form-label">${t('sales.s23')}</label>
      <div class="product-search-wrapper">
        <input id="sale-customer-search" class="form-control" placeholder="🔍${t('sales.s3')}"
          oninput="showCustomerSuggestions(this.value)" autocomplete="off"/>
        <div id="customer-dropdown" class="product-dropdown hidden"></div>
      </div>
      <div id="selected-customer-info" class="hidden"
        style="margin-top:6px;padding:8px;background:#e8f5e9;border-radius:8px;font-size:13px;"></div>
      <!-- নতুন কাস্টমার বাটন -->
      <button id="new-customer-btn" onclick="showNewCustomerForm()"
        style="display:none;margin-top:6px;background:#e8f5e9;border:1.5px dashed #2d8a45;
               color:#1a5c2a;padding:7px 12px;border-radius:8px;font-size:13px;
               font-weight:700;cursor:pointer;width:100%;font-family:inherit;">
        ＋${t('sales.s2')}
      </button>
      <!-- নতুন কাস্টমার ফর্ম -->
      <div id="new-customer-form" style="display:none;margin-top:8px;padding:10px;
           background:#f9fafb;border-radius:8px;border:1.5px solid #e0e0e0;">
        <div style="font-size:12px;font-weight:700;margin-bottom:8px;color:#1a5c2a;">${t('sales.s31')}</div>
        <input id="nc-sale-name" class="form-control" placeholder="${t('dues.s20')}*" style="margin-bottom:6px;"/>
        <input id="nc-sale-phone" class="form-control" placeholder="${t('sales.s40')}" style="margin-bottom:8px;"/>
        <div style="display:flex;gap:8px;">
          <button onclick="createCustomerAndSelect()"
            style="flex:1;background:#2d8a45;color:white;border:none;padding:8px;
                   border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;">
            ✅${t('sales.s5')}
          </button>
          <button onclick="document.getElementById('new-customer-form').style.display='none'"
            style="background:#f0f0f0;border:none;padding:8px 12px;border-radius:8px;cursor:pointer;font-family:inherit;">
${t('sales.s1')}
          </button>
        </div>
      </div>
    </div>

    <!-- Payment -->
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">${t('sales.s29')}</label>
        <input type="number" id="s-cash" class="form-control" value="0" min="0" oninput="calcDue()"/>
      </div>
      <div class="form-group">
        <label class="form-label">${t('purchases.s22')}</label>
        <input type="number" id="s-due" class="form-control" value="0" readonly
          style="background:#f9fafb;color:#c62828;font-weight:700;"/>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">${t('common.note')}</label>
      <input id="s-note" class="form-control" placeholder="${t('expenses.s12')}"/>
    </div>`;

  openModal('saleModal',t('sales.s46'),html,[
    {label:t('sales.s45'),action:'saveSale(true)',cls:'btn-secondary'},
    {label:t('dues.s45'),action:'saveSale(false)',cls:'btn-primary'},
    {label:t('sales.s43'),action:'closeModal("saleModal")',cls:'btn-danger'}
  ],'md');
  setTimeout(()=>renderSaleProductGrid(),80);
}


function renderSaleProductGrid(){
  const cat=document.getElementById('sale-cat-filter')?.value||'';
  const q=(document.getElementById('sale-prod-search')?.value||'').toLowerCase();
  const priceType=document.querySelector('input[name="price-type"]:checked')?.value||'retail';
  const filtered=allProducts.filter(p=>
    p.status==='active'&&
    (!cat||p.category===cat)&&
    (!q||[p.name,p.unit,p.brand].some(value=>(value||'').toLowerCase().includes(q)))
  );
  const grid=document.getElementById('sale-product-grid');
  
  if(!grid) return;
  if(!filtered.length){
    renderMissingProductAction(grid,t('sales.s17'),'sale',q);
    return;
  }
  
  grid.innerHTML=filtered.map(p=>{
    const price = priceType === 'retail' ? p.retail_price : p.wholesale_price;
    const inCart = saleCart.find(c => c.product_id === p.id);
    const stockQty = Array.isArray(p.stock) ? (p.stock[0]?.current_quantity || 0) : (p.stock?.current_quantity || 0);
    const exactUnit = p.unit || (p.product_type === 'weight' ? t('purchases.s11') : t('purchases.s21')); 
    
    const stockColor = stockQty <= 0 ? '#c62828' : '#e65c00';
    const stockBg = stockQty <= 0 ? '#ffebee' : '#fff3e0';

    return `<div onclick="addToCartDirect('${p.id}')"
      style="background:${inCart?'#e8f5e9':'white'}; border:1px solid ${inCart?'#2d8a45':'#e5e7eb'};
             border-radius:6px; padding:6px; cursor:pointer; transition:all 0.15s; 
             display:flex; flex-direction:column; gap:3px; box-shadow:0 1px 3px rgba(0,0,0,0.05);"
      onmouseover="this.style.borderColor='#2d8a45';this.style.background='#f0faf0'"
      onmouseout="this.style.borderColor='${inCart?'#2d8a45':'#e5e7eb'}';this.style.background='${inCart?'#e8f5e9':'white'}'">
      
      <!-- ১. নাম এবং পরিমাণ (Unit Badge) -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:4px;">
        <div style="font-size:11px; font-weight:800; color:#1a3a1a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.2;">${p.name}</div>
        <div style="font-size:9px; font-weight:800; color:white; background:#e65c00; padding:2px 5px; border-radius:4px; white-space:nowrap;">${exactUnit}</div>
      </div>
      
      <!-- ২. ক্যাটাগরি -->
      <div style="font-size:9px; color:#6b7280; font-weight:600; text-align:left;">${p.category}</div>
      
      <!-- ৩. মূল্য এবং স্টক -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
        <div style="font-size:13px; font-weight:800; color:#2d8a45;">${taka(price)}</div>
        <div style="font-size:10px; font-weight:700; color:${stockColor}; background:${stockBg}; padding:2px 5px; border-radius:4px;">${t('dashboard.s10')}${stockQty}</div>
      </div>
      
    </div>`;
  }).join('');
}


function addToCartDirect(productId){
  const p=allProducts.find(x=>x.id===productId); if(!p) return;
  const priceType=document.querySelector('input[name="price-type"]:checked')?.value||'retail';
  const existing=saleCart.find(c=>c.product_id===productId);
  if(existing){
    existing.quantity+=1;
    renderCart(); renderSaleProductGrid(); return;
  }
  saleCart.push({
    product_id:p.id, name:p.name, unit:p.unit||'', quantity:1,
    unit_price:priceType==='retail'?p.retail_price:p.wholesale_price,
    retail_price:p.retail_price, wholesale_price:p.wholesale_price,
    discount:0, product_type:p.product_type
  });
  renderCart(); renderSaleProductGrid();
}


// ══ CART & SALE FUNCTIONS ══

function renderCart(){
  const el=document.getElementById('sale-cart-items'); if(!el)return;
  if(!saleCart.length){
    el.innerHTML=t('sales.s18');
    return;
  }
  el.innerHTML=`<div style="border:1.5px solid #e0e0e0;border-radius:10px;overflow:hidden;margin-bottom:10px;">
    <div style="background:#1a5c2a;color:white;padding:8px 12px;display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:6px;font-size:11px;font-weight:700;">
      <span>${t('purchases.s18')}</span><span style="text-align:center;">${t('common.quantity')}</span><span style="text-align:right;">${t('sales.s21')}</span><span style="text-align:right;">${t('common.total')}</span><span></span>
    </div>
    ${saleCart.map((item,i)=>`
    <div style="padding:8px 12px;display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:6px;align-items:center;border-bottom:1px solid #f0f0f0;font-size:12px;background:white;">
      <div><div style="font-weight:700;font-size:13px;">${item.name}</div><div style="color:#6b7280;font-size:10px;">${item.unit||''}</div></div>
      <input type="number" value="${item.quantity}" min="0.01" step="0.01"
        style="width:100%;padding:5px 6px;border:1.5px solid #ddd;border-radius:6px;font-size:13px;text-align:center;font-family:inherit;"
        oninput="updateCartItem(${i},'quantity',this.value)"/>
      <input type="number" value="${item.unit_price}" min="0"
        style="width:100%;padding:5px 6px;border:1.5px solid #ddd;border-radius:6px;font-size:12px;text-align:right;font-family:inherit;"
        oninput="updateCartItem(${i},'unit_price',this.value)"/>
      <div style="text-align:right;font-weight:700;color:#1a5c2a;">${taka(item.quantity*item.unit_price)}</div>
      <button onclick="removeCartItem(${i})"
        style="background:#ffebee;border:none;color:#c62828;width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:14px;line-height:1;">✕</button>
    </div>`).join('')}
  </div>`;
  recalcCartTotals();
}

function recalcCartTotals(){
  const sub=saleCart.reduce((s,c)=>s+(parseFloat(c.quantity)||0)*(parseFloat(c.unit_price)||0),0);
  const disc=parseFloat(document.getElementById('s-discount')?.value)||0;
  const total=Math.max(0,sub-disc);
  const subEl=document.getElementById('s-subtotal'); if(subEl)subEl.textContent=taka(sub);
  const totEl=document.getElementById('s-total'); if(totEl)totEl.textContent=taka(total); document.getElementById('s-cash').dataset.modified = 'false';
  calcDue();
}

function recalcCart(){
  const priceType=document.querySelector('input[name="price-type"]:checked')?.value||'retail';
  saleCart.forEach(item=>{item.unit_price=priceType==='retail'?item.retail_price:item.wholesale_price;});
  renderCart();
}

function removeCartItem(i){ saleCart.splice(i,1); renderCart(); renderSaleProductGrid(); }
function updateCartItem(i,f,v){ saleCart[i][f]=parseFloat(v)||0; recalcCartTotals(); }

function calcDue() {
  const sub = saleCart.reduce((s, c) => s + (parseFloat(c.quantity) || 0) * (parseFloat(c.unit_price) || 0), 0);
  const disc = parseFloat(document.getElementById('s-discount')?.value) || 0;
  const total = Math.max(0, sub - disc);
  
  const cashInput = document.getElementById('s-cash');
  const dueInput = document.getElementById('s-due');
  
  if (!cashInput || !dueInput) return;

  // যখনই নতুন পণ্য যোগ হবে, তখন যদি আগে থেকে কাস্টম কোনো টাকা দেওয়া না থাকে, তবে পুরো টাকাটা "নগদ" ধরে নিবে
  if (cashInput.dataset.modified !== 'true') {
    cashInput.value = total.toFixed(2);
  }

  const cash = parseFloat(cashInput.value) || 0;
  dueInput.value = Math.max(0, total - cash).toFixed(2);
}

// এই ফাংশনটিও আপডেট করতে হবে, যাতে নগদ টাকার ঘরে হাত দিলে অটো ফিল হওয়া বন্ধ হয়ে যায়
document.addEventListener('input', function(e) {
  if (e.target.id === 's-cash') {
    e.target.dataset.modified = 'true';
    calcDue();
  }
});

async function saveSale(shouldPrint=false){
  if(!saleCart.length){toast(t('sales.s22'),'error');return;}
  const priceType=document.querySelector('input[name="price-type"]:checked')?.value||'retail';
  const subtotal=saleCart.reduce((s,c)=>s+(parseFloat(c.quantity)||0)*(parseFloat(c.unit_price)||0),0);
  const discount=parseFloat(document.getElementById('s-discount')?.value)||0;
  const total_amount=Math.max(0,subtotal-discount);
  const cash_amount=parseFloat(document.getElementById('s-cash')?.value)||0;
  const due_amount=parseFloat(document.getElementById('s-due')?.value)||0;
  const note=document.getElementById('s-note')?.value||'';

  // পরিবর্তন: এখানে আগে 0 টাকা হলে এরর দিতো। এখন শুধু ঋণাত্মক (মাইনাস) হলে এরর দিবে। 0 টাকা এলাউ করা হলো।
  if(total_amount < 0){toast(t('sales.s39'),'error');return;}

  if(due_amount>0 && !saleCustomer?.id){
    toast(t('sales.s33'),'error');
    document.getElementById('sale-customer-search')?.focus();
    return;
  }
  
  try{
    const {data:sale,error}=await sb.from('sales').insert({
      customer_id:saleCustomer?.id||null,
      customer_name:saleCustomer?.name||'Cash Customer',
      price_type:priceType, subtotal, discount, total_amount, cash_amount, due_amount, note,
      created_by:currentUserProfile?.id
    }).select().single();
    if(error)throw error;

    for(const item of saleCart){
      await sb.from('sale_items').insert({
        sale_id:sale.id, product_id:item.product_id, product_name:item.name,
        quantity:parseFloat(item.quantity), unit:item.unit,
        unit_price:parseFloat(item.unit_price), discount:0,
        subtotal:parseFloat(item.quantity)*parseFloat(item.unit_price)
      });
      const {data:stk}=await sb.from('stock').select('current_quantity').eq('product_id',item.product_id).single();
      const before=parseFloat(stk?.current_quantity||0);
      const after=Math.max(0,before-parseFloat(item.quantity));
      await sb.from('stock').update({current_quantity:after,updated_at:new Date().toISOString()}).eq('product_id',item.product_id);
      await sb.from('stock_movements').insert({
        product_id:item.product_id, movement_type:'sale',
        quantity:parseFloat(item.quantity), direction:'out',
        before_stock:before, after_stock:after,
        reference_id:sale.id, created_by:currentUserProfile?.id
      });
    }

    // শুধু যদি ক্যাশ 0 টাকার বেশি হয়, তবেই ক্যাশবক্সে এন্ট্রি হবে
    if(cash_amount>0){
      await sb.from('cash_transactions').insert({
        transaction_type:'sale', direction:'in', amount:cash_amount,
        reference_id:sale.id,
        note:t('sales.s37')+(saleCustomer?.name||'Cash Customer'),
        created_by:currentUserProfile?.id
      });
    }

    if(due_amount>0 && saleCustomer?.id){
      const newDue=(parseFloat(saleCustomer.due)||0)+due_amount;
      await sb.from('customers').update({total_due:newDue,updated_at:new Date().toISOString()}).eq('id',saleCustomer.id);
      await sb.from('due_transactions').insert({
        entity_type:'customer', entity_id:saleCustomer.id,
        transaction_type:'due_added', amount:due_amount, direction:'in',
        balance_after:newDue, reference_id:sale.id, created_by:currentUserProfile?.id
      });
    }

    closeModal('saleModal');
    toast(t('sales.s36'));
    if(document.getElementById('page-sales').classList.contains('active')) loadSales();
    loadDashboard();
    if(shouldPrint) printSaleReceiptData(sale, saleCart);
  }catch(e){ toast(t('sales.s34')+e.message,'error'); console.error(e); }
}
function showNewCustomerForm(){
  const name=document.getElementById('sale-customer-search')?.value||'';
  const nameInput=document.getElementById('nc-sale-name');
  if(nameInput) nameInput.value=name;
  const form=document.getElementById('new-customer-form');
  if(form) form.style.display='block';
  const btn=document.getElementById('new-customer-btn');
  if(btn) btn.style.display='none';
}

async function createCustomerAndSelect(){
  const name=document.getElementById('nc-sale-name')?.value.trim();
  const phone=document.getElementById('nc-sale-phone')?.value.trim()||'';
  if(!name){toast(t('sales.s26'),'error');return;}
  try{
    const {data,error}=await sb.from('customers')
      .insert({name,phone,total_due:0,status:'active',created_by:currentUserProfile?.id})
      .select().single();
    if(error)throw error;
    selectCustomer(data.id,data.name,data.phone||'',0);
    toast(t('sales.s24'));
  }catch(e){toast(t('auth.s21')+e.message,'error');}
}

async function viewSaleDetail(id){
  const [{data:sale},{data:items}]=await Promise.all([
    sb.from('sales').select('*').eq('id',id).single(),
    sb.from('sale_items').select('*').eq('sale_id',id)
  ]);
  const html=`
    <div style="background:#f9fafb;padding:12px;border-radius:10px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>${t('sales.s25')}</span><strong>${sale.customer_name}</strong></div>
      <div style="display:flex;justify-content:space-between;"><span>${t('purchases.s17')}</span><span>${fmtDT(sale.sale_date)}</span></div>
    </div>
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead style="background:#1a5c2a;color:white;"><tr><th style="padding:8px;">${t('purchases.s18')}</th><th style="padding:8px;">${t('common.quantity')}</th><th style="padding:8px;">${t('purchases.s25')}</th><th style="padding:8px;">${t('common.total')}</th></tr></thead>
        <tbody>${(items||[]).map(i=>`<tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:8px;">${i.product_name}</td><td style="padding:8px;">${bn(i.quantity)} ${i.unit}</td><td style="padding:8px;">${taka(i.unit_price)}</td><td style="padding:8px;font-weight:700;">${taka(i.subtotal)}</td></tr>`).join('')}</tbody>
      </table>
    </div>
    <div style="background:#e8f5e9;border-radius:10px;padding:12px;margin-top:12px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>${t('sales.s42')}</span><span>${taka(sale.subtotal)}</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>${t('sales.s28')}</span><span>${taka(sale.discount)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:17px;font-weight:800;color:#1a5c2a;border-top:2px solid #4caf65;padding-top:8px;margin-top:6px;"><span>${t('purchases.s26')}</span><span>${taka(sale.total_amount)}</span></div>
      <div style="display:flex;justify-content:space-between;color:#2d8a45;margin-top:4px;"><span>${t('sales.s30')}</span><span>${taka(sale.cash_amount)}</span></div>
      <div style="display:flex;justify-content:space-between;color:#c62828;"><span>${t('purchases.s23')}</span><span>${taka(sale.due_amount)}</span></div>
    </div>`;
  openModal('saleDetailModal',t('sales.s47'),html,[
    {label:t('sales.s44'),action:`printSaleReceipt('${id}')`,cls:'btn-secondary'},
    {label:t('common.close'),action:'closeModal("saleDetailModal")',cls:'btn-primary'}
  ]);
}

async function printSaleReceipt(id){
  const [{data:sale},{data:items}]=await Promise.all([
    sb.from('sales').select('*').eq('id',id).single(),
    sb.from('sale_items').select('*').eq('sale_id',id)
  ]);
  printSaleReceiptData(sale, items);
}

function selectCustomer(id,name,phone,due){
  saleCustomer={id,name,phone,due};
  const inEl=document.getElementById('sale-customer-search'); if(inEl)inEl.value=name;
  const dd=document.getElementById('customer-dropdown'); if(dd)dd.classList.add('hidden');
  const info=document.getElementById('selected-customer-info');
  if(info){
    info.innerHTML=`<strong>${name}</strong> | 📞 ${phone||'—'} |${t('sales.s7')}<strong style="color:#c62828;">${taka(due)}</strong>`;
    info.classList.remove('hidden');
  }
  const btn=document.getElementById('new-customer-btn');
  const form=document.getElementById('new-customer-form');
  if(btn) btn.style.display='none';
  if(form) form.style.display='none';
}

function loadSettings(){ /* placeholder */ }



function printSaleReceiptData(sale, items) {
  const s = shopSettings;
  const win = window.open('', '_blank', 'width=420,height=650');
  if(!win) { toast(t('sales.s32'),'error'); return; }
  const rows = (items||[]).map(i=>`<tr>
    <td>${i.product_name||i.name||''}</td>
    <td style="text-align:center">${i.quantity} ${i.unit||''}</td>
    <td style="text-align:right">${Number(i.unit_price).toLocaleString('en-IN')}</td>
    <td style="text-align:right">${Number(i.subtotal||Number(i.quantity)*Number(i.unit_price)).toLocaleString('en-IN')}</td>
  </tr>`).join('');
  win.document.write(t('sales.s9')+
  '<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@400;600;700;800&display=swap" rel="stylesheet"/>'+
  '<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:"Noto Serif Bengali",serif;font-size:12px;padding:20px;max-width:320px;margin:0 auto;}.c{text-align:center;}.b{font-weight:700;}.row{display:flex;justify-content:space-between;padding:3px 0;}hr{border:none;border-top:1px dashed #666;margin:7px 0;}table{width:100%;border-collapse:collapse;font-size:11px;}th{padding:4px 3px;border-bottom:1px solid #333;text-align:left;}td{padding:3px;}@media print{body{margin:0;}}</style>'+
  '</head><body>'+
  '<div class="c b" style="font-size:15px;margin-bottom:3px;">'+(s.shop_name||t('auth.s23'))+'</div>'+
  '<div class="c" style="font-size:10px;margin-bottom:2px;">'+(s.shop_subtitle||'')+'</div>'+
  '<div class="c" style="font-size:10px;">📞 '+(s.phone1||'')+' / '+(s.phone2||'')+'</div>'+
  '<div class="c" style="font-size:10px;margin-bottom:5px;">📍 '+(s.address||'')+'</div>'+
  '<hr/>'+
  t('sales.s14')+(sale.customer_name||'Cash Customer')+'</span></div>'+
  t('sales.s15')+fmtDate(sale.sale_date||new Date())+'</span></div>'+
  '<hr/>'+
  t('sales.s19')+
  '<tbody>'+rows+'</tbody></table>'+
  '<hr/>'+
  t('sales.s11')+Number(sale.total_amount).toLocaleString('en-IN')+'</span></div>'+
  t('sales.s12')+Number(sale.cash_amount).toLocaleString('en-IN')+'</span></div>'+
  t('sales.s13')+Number(sale.due_amount).toLocaleString('en-IN')+'</span></div>'+
  '<hr/>'+
  t('sales.s10')+
  t('sales.s16')+
  '</body></html>');
  win.document.close();
  setTimeout(()=>win.print(), 600);
}


async function showCustomerSuggestions(q){
  const dd=document.getElementById('customer-dropdown'); if(!dd)return;
  if(!q||q.length<1){dd.classList.add('hidden');return;}
  try{
    const {data}=await sb.from('customers').select('*').ilike('name','%'+q+'%').eq('status','active').limit(5);
    if(!data||!data.length){
  dd.classList.add('hidden');
  const btn=document.getElementById('new-customer-btn');
  if(btn) btn.style.display='block';
  return;
}
const btn=document.getElementById('new-customer-btn');
if(btn) btn.style.display='none';
    dd.innerHTML=data.map(c=>`
      <div class="product-option" onclick="selectCustomer('${c.id}','${c.name}','${c.phone||''}',${c.total_due||0})">
        <span>${c.name}</span>
        <span class="p-price">${c.phone||''} |${t('sales.s8')}${taka(c.total_due)}</span>
      </div>`).join('');
    dd.classList.remove('hidden');
  }catch(e){}
}
