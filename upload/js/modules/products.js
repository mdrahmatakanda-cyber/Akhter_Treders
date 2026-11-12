/* ══════════════════════════════════════════════════════════════
   📦 PRODUCTS
   ══════════════════════════════════════════════════════════════
   পণ্য যোগ/এডিট/তালিকা।
   ══════════════════════════════════════════════════════════════ */

// ══════════════════════════════════════════════
// 📦 PRODUCTS
// ══════════════════════════════════════════════
async function loadProducts(){
  renderCategoryFilterOptions('product-cat-filter', getProductCategories());
  try{
    // ডাটাবেস থেকে প্রোডাক্টের সাথে স্টকের পরিমাণও আনা হচ্ছে
    const {data,error}=await sb.from('products').select('*, stock(current_quantity)').order('name');
    if(error) throw error;
    allProducts=data||[];
    renderProductsTable(allProducts);
  }
  catch(e){console.error(e);toast(t('products.s11'),'error');}
}

function renderProductsTable(products){
  const tbody=document.getElementById('products-table-body');
  if(!tbody)return;
  if(!products.length){tbody.innerHTML=t('products.s3');return;}
  
  tbody.innerHTML=products.map((p, i)=>{
    const stockQty = Array.isArray(p.stock) ? (p.stock[0]?.current_quantity || 0) : (p.stock?.current_quantity || 0);
    
    return `<tr>
    <td style="font-weight:700; color:#6b7280;">${i + 1}</td>
    <td><strong>${p.name}</strong><br><small class="text-soft">${p.unit||''}${p.brand?` · ${p.brand}`:''}</small></td>
    <td><span class="badge badge-blue">${p.category}</span></td>
    <td>${p.product_type==='weight'?'⚖️ কেজি':'📦 পিস'}</td>
    <td>${taka(p.purchase_price)}/${p.unit||''}</td>
    <td>${taka(p.retail_price)}/${p.unit||''}</td>
    <td>${taka(p.wholesale_price)}/${p.unit||''}</td>
    <td style="font-weight:800; color:#e65c00;">${stockQty}</td>
    <td><span class="badge ${p.status==='active'?'badge-green':'badge-gray'}">${p.status==='active'?'সক্রিয়':'নিষ্ক্রিয়'}</span></td>
    <td><div style="display:flex;gap:4px;">
      <button type="button" class="btn btn-icon btn-sm" data-product-action="edit" data-product-id="${escapeProductModalHtml(p.id)}" title="${t('products.s12')}" aria-label="${t('products.s12')}">✏️</button>
      <button type="button" class="btn btn-icon btn-sm" data-product-action="duplicate" data-product-id="${escapeProductModalHtml(p.id)}" title="${t('products.duplicateProduct')}" aria-label="${t('products.duplicateProduct')}">📄</button>
      <button type="button" class="btn btn-icon btn-sm" data-product-action="toggle" data-product-id="${escapeProductModalHtml(p.id)}" data-product-status="${escapeProductModalHtml(p.status)}" title="${t('products.s17')}" aria-label="${t('products.s17')}">${p.status==='active'?'🚫':'✅'}</button>
    </div></td></tr>`
  }).join('');
}

async function handleProductTableAction(event){
  const button=event.target.closest?.('#products-table-body button[data-product-action]');
  if(!button)return;
  event.preventDefault();
  event.stopPropagation();
  const {productAction,productId}=button.dataset;
  if(!productId){toast(t('products.s11'),'error');return;}

  try{
    if(productAction==='edit') openProductModal(productId);
    else if(productAction==='duplicate') duplicateProduct(productId);
    else if(productAction==='toggle') await toggleProductStatus(productId,button.dataset.productStatus);
  }catch(error){
    console.error('পণ্যের কার্যক্রম চালাতে সমস্যা হয়েছে:',error);
    toast(t('auth.s21')+(error.message||error),'error');
  }
}

document.addEventListener('click',handleProductTableAction,true);
function filterProducts(q){
  const search=(q||document.querySelector('#page-products .search-input')?.value||'').toLowerCase();
  const cat=document.getElementById('product-cat-filter')?.value||'';
  renderProductsTable(allProducts.filter(p=>
    (!search||[p.name,p.unit,p.brand].some(value=>(value||'').toLowerCase().includes(search)))&&
    (!cat||p.category===cat)
  ));
}

let editingProductVariants=[];
let pendingProductReturnSource=null;

function escapeProductModalHtml(value){
  return String(value??'').replace(/[&<>"']/g, char=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  })[char]);
}

function productMatchesSearch(product,query){
  const search=String(query||'').trim().toLowerCase();
  return [product.name,product.unit,product.brand].some(value=>
    String(value||'').toLowerCase().includes(search)
  );
}

function renderMissingProductAction(grid,message,source,query){
  grid.innerHTML=message;
  const search=String(query||'').trim();
  if(!search||allProducts.some(product=>productMatchesSearch(product,search))) return;

  const button=document.createElement('button');
  button.type='button';
  button.className='btn btn-outline btn-sm';
  button.style.cssText='grid-column:1/-1;justify-self:center;margin:0 0 10px;';
  button.textContent=`＋ ${t('products.addFromTransaction')}`;
  button.addEventListener('click',()=>openProductModalFromTransaction(source));
  grid.appendChild(button);
}

function getProductVariantGroup(product){
  // The current schema stores each sellable SKU as a products row.
  return allProducts.filter(item=>
    item.name===product.name &&
    item.category===product.category &&
    (item.brand||'')===(product.brand||'') &&
    (item.product_type||'piece')===(product.product_type||'piece') &&
    (item.status||'active')===(product.status||'active')
  );
}

function openProductModal(id=null,duplicate=false,returnToTransaction=null){
  const p=id?allProducts.find(x=>x.id===id):null;
  if(id&&!p){toast(t('products.s11'),'error');return;}
  if(id&&!duplicate&&currentUserProfile?.role!=='owner'){toast(t('products.s22'),'error');return;}

  pendingProductReturnSource=returnToTransaction;
  editingProductId=duplicate?null:id;
  const sourceVariants=p?getProductVariantGroup(p):[];
  editingProductVariants=duplicate?[]:sourceVariants;
  const categories=[...getProductCategories()];
  if(p?.category&&!categories.includes(p.category)) categories.push(p.category);
  const categoryOptions=categories.map(category=>
    `<option value="${escapeProductModalHtml(category)}" ${p?.category===category?'selected':''}>${escapeProductModalHtml(category)}</option>`
  ).join('');

  const html=`
    <div class="form-row" style="margin-bottom:16px;padding-bottom:16px;border-bottom:2px dashed #d1d5db;">
      <div class="form-group">
        <label class="form-label">${t('products.s15')} <span class="required">*</span></label>
        <input id="pm-name" class="form-control" value="${escapeProductModalHtml(p?(duplicate?`${p.name} (${t('products.duplicateSuffix')})`:p.name):'')}" placeholder="${escapeProductModalHtml(t('products.s14'))}"/>
      </div>
      <div class="form-group">
        <label class="form-label">${t('expenses.s2')} <span class="required">*</span></label>
        <select id="pm-cat" class="form-control">${categoryOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label">${t('products.s19')}</label>
        <input id="pm-brand" class="form-control" value="${escapeProductModalHtml(p?.brand||'')}" placeholder="${escapeProductModalHtml(t('products.s20'))}"/>
      </div>
      <div class="form-group">
        <label class="form-label">${t('products.s13')} <span class="required">*</span></label>
        <select id="pm-type" class="form-control">
          <option value="weight" ${p?.product_type==='weight'?'selected':''}>⚖️ ${t('products.s1')}</option>
          <option value="piece" ${!p||p.product_type!=='weight'?'selected':''}>📦 ${t('products.s2')}</option>
        </select>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;">
      <div>
        <h4 style="font-size:14px;font-weight:bold;color:#1a5c2a;margin:0;">${t('products.variationTitle')}</h4>
        <small class="text-soft">${t('products.variationHelp')}</small>
      </div>
      <button type="button" onclick="addVariationRow()" class="btn btn-sm btn-outline" style="font-size:12px;white-space:nowrap;">
        ${t('products.addVariation')}
      </button>
    </div>
    <div id="variations-container"></div>`;

  openModal('productModal',id&&!duplicate?t('products.s12'):t('products.s8'),html,[
    {label:id&&!duplicate?t('products.s4'):t('common.save'),action:'saveProductVariation()',cls:'btn-primary'},
    {label:t('common.cancel'),action:'closeModal("productModal")',cls:'btn-secondary'}
  ],'lg');

  const variants=duplicate?sourceVariants.map(variant=>({...variant,id:''})):(editingProductVariants.length?editingProductVariants:[p]);
  if(variants[0]){
    variants.forEach(variant=>addVariationRow(variant,duplicate?'':variant.id));
  }else{
    addVariationRow();
  }
}

function openProductModalFromTransaction(source){
  const searchId=source==='sale'?'sale-prod-search':'pur-prod-search';
  const searchText=document.getElementById(searchId)?.value.trim()||'';
  openProductModal(null,false,source);
  const nameInput=document.getElementById('pm-name');
  if(nameInput&&searchText){
    nameInput.value=searchText;
    nameInput.focus();
  }
}

function duplicateProduct(id){
  openProductModal(id,true);
}

function addVariationRow(variant=null,productId=''){
  const container=document.getElementById('variations-container');
  if(!container)return;

  const row=document.createElement('div');
  row.className='variation-row';
  if(productId) row.dataset.productId=productId;
  row.innerHTML=`
    <div class="form-group">
      <label class="form-label">${t('products.variationUnit')} <span class="required">*</span></label>
      <input class="form-control variation-unit" value="${escapeProductModalHtml(variant?.unit||'')}" placeholder="${t('products.variationUnitPlaceholder')}"/>
    </div>
    <div class="form-group">
      <label class="form-label">${t('products.s6')}</label>
      <input class="form-control variation-purchase" type="number" value="${Number(variant?.purchase_price)||0}" min="0" step="any"/>
    </div>
    <div class="form-group">
      <label class="form-label">${t('products.s7')}</label>
      <input class="form-control variation-retail" type="number" value="${Number(variant?.retail_price)||0}" min="0" step="any"/>
    </div>
    <div class="form-group">
      <label class="form-label">${t('products.s18')}</label>
      <input class="form-control variation-wholesale" type="number" value="${Number(variant?.wholesale_price)||0}" min="0" step="any"/>
    </div>
    <div class="form-group">
      <label class="form-label">${t('products.s21')}</label>
      <input class="form-control variation-low-stock" type="number" value="${Number(variant?.low_stock_threshold??10)}" min="0" step="any"/>
    </div>
    <button type="button" class="btn btn-danger btn-sm variation-remove" title="${t('products.removeVariation')}" aria-label="${t('products.removeVariation')}" onclick="removeVariationRow(this)">✕</button>`;
  container.appendChild(row);
}

function removeVariationRow(button){
  button.closest('.variation-row')?.remove();
}

async function saveProductVariation(){
  const name=document.getElementById('pm-name')?.value.trim()||'';
  const category=document.getElementById('pm-cat')?.value||'';
  const product_type=document.getElementById('pm-type')?.value||'piece';
  const brand=document.getElementById('pm-brand')?.value.trim()||'';
  const rows=[...document.querySelectorAll('#variations-container .variation-row')];
  if(!name){toast(t('products.s16'),'error');return;}
  if(!category){toast(t('products.variationCategoryRequired'),'error');return;}
  if(!rows.length){toast(t('products.variationRequired'),'error');return;}

  const seenUnits=new Set();
  const variants=[];
  for(const row of rows){
    const unit=row.querySelector('.variation-unit')?.value.trim()||'';
    if(!unit){toast(t('products.variationUnitRequired'),'error');return;}
    const key=unit.toLocaleLowerCase();
    if(seenUnits.has(key)){toast(t('products.variationDuplicate'),'error');return;}
    seenUnits.add(key);

    const prices={
      purchase_price:Number(row.querySelector('.variation-purchase')?.value),
      retail_price:Number(row.querySelector('.variation-retail')?.value),
      wholesale_price:Number(row.querySelector('.variation-wholesale')?.value)
    };
    const low_stock_threshold=Number(row.querySelector('.variation-low-stock')?.value);
    if(Object.values(prices).some(price=>!Number.isFinite(price)||price<0)||!Number.isFinite(low_stock_threshold)||low_stock_threshold<0){
      toast(t('products.variationPriceInvalid'),'error');return;
    }
    variants.push({id:row.dataset.productId||'',unit,...prices,low_stock_threshold,row});
  }

  const duplicateProduct=variants.find(variant=>allProducts.some(item=>
    item.id!==variant.id &&
    item.name===name &&
    item.category===category &&
    (item.brand||'')===brand &&
    (item.product_type||'piece')===product_type &&
    (item.unit||'').trim().toLocaleLowerCase()===variant.unit.toLocaleLowerCase()
  ));
  if(duplicateProduct){
    toast(t('products.variationSkuExists'),'error');
    return;
  }

  const status=editingProductVariants[0]?.status||'active';
  const existingById=new Map(editingProductVariants.map(variant=>[variant.id,variant]));
  const retainedIds=new Set(variants.map(variant=>variant.id).filter(Boolean));
  const newProducts=[];

  try{
    for(const variant of variants){
      const existing=existingById.get(variant.id);
      const payload={
        name,category,product_type,unit:variant.unit,
        purchase_price:variant.purchase_price,
        retail_price:variant.retail_price,
        wholesale_price:variant.wholesale_price,
        brand,
        low_stock_threshold:variant.low_stock_threshold
      };
      if(existing){
        const {error}=await sb.from('products').update(payload).eq('id',existing.id);
        if(error) throw error;
      }else{
        newProducts.push({...payload,status,created_by:currentUserProfile?.id});
      }
    }

    if(newProducts.length){
      const {data,error}=await sb.from('products').insert(newProducts).select('id,unit');
      if(error) throw error;
      if(!data||data.length!==newProducts.length) throw new Error('নতুন ভেরিয়েশনগুলোর পণ্য আইডি পাওয়া যায়নি।');
      const {error:stockError}=await sb.from('stock').insert(data.map(product=>({
        product_id:product.id,current_quantity:0
      })));
      if(stockError){
        const {error:cleanupError}=await sb.from('products').delete().in('id',data.map(product=>product.id));
        if(cleanupError){
          throw new Error(`${stockError.message} (নতুন SKU সরানোর সময়ও সমস্যা হয়েছে: ${cleanupError.message})`);
        }
        throw stockError;
      }
      const newVariants=variants.filter(variant=>!variant.id);
      const idsByUnit=new Map(data.map(product=>[product.unit,product.id]));
      newVariants.forEach(variant=>{
        const productId=idsByUnit.get(variant.unit);
        variant.id=productId;
        retainedIds.add(productId);
        variant.row.dataset.productId=productId;
        const savedProduct={
          ...newProducts.find(product=>product.unit===variant.unit),
          id:productId,
          stock:[{current_quantity:0}]
        };
        editingProductVariants.push(savedProduct);
        allProducts.push(savedProduct);
      });
    }

    const removedIds=editingProductVariants
      .filter(variant=>variant.status==='active'&&!retainedIds.has(variant.id))
      .map(variant=>variant.id);
    if(removedIds.length){
      const {error}=await sb.from('products').update({status:'inactive'}).in('id',removedIds);
      if(error) throw error;
    }

    const returnToTransaction=pendingProductReturnSource;
    pendingProductReturnSource=null;
    closeModal('productModal');
    toast(editingProductId?t('products.s10'):t('products.s9'));
    await loadProducts();
    if(returnToTransaction==='sale'&&document.getElementById('sale-product-grid')){
      renderSaleProductGrid();
      document.getElementById('sale-prod-search')?.focus();
    }else if(returnToTransaction==='purchase'&&document.getElementById('pur-product-grid')){
      const categoryFilter=document.getElementById('pur-cat-filter');
      if(categoryFilter) categoryFilter.value='';
      switchPurTab('all');
      renderPurProductGrid('all');
      document.getElementById('pur-prod-search')?.focus();
    }
  }catch(e){
    console.error('পণ্য ভেরিয়েশন সংরক্ষণে সমস্যা হয়েছে:',e);
    toast(t('auth.s21')+(e.message||e),'error');
  }
}

window.openProductModal=openProductModal;
window.duplicateProduct=duplicateProduct;
window.addVariationRow=addVariationRow;
window.removeVariationRow=removeVariationRow;
window.saveProductVariation=saveProductVariation;

async function toggleProductStatus(id,status){
  if(currentUserProfile?.role!=='owner'){toast(t('cashbox.s12'),'error');return;}
  await sb.from('products').update({status:status==='active'?'inactive':'active'}).eq('id',id);
  toast(t('products.s17')); loadProducts();
}
