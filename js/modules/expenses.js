/* ══════════════════════════════════════════════════════════════
   💸 EXPENSES
   ══════════════════════════════════════════════════════════════
   দোকানের খরচ যোগ ও তালিকা।
   ══════════════════════════════════════════════════════════════ */

// ══════════════════════════════════════════════
// 💸 EXPENSE
// ══════════════════════════════════════════════
async function loadExpenses(){
  renderCategoryFilterOptions('expense-cat-filter', getExpenseCategories());
  try{
    const today=todayISO();
    const thisMonth=today.substring(0,7);

    const {data,error}=await sb.from('expenses').select('*')
      .order('created_at',{ascending:false}).limit(100);
    if(error) throw error;

    allExpenses=(data||[]).filter(e=>e.status!=='deleted');
    renderExpensesTable(allExpenses);

    renderExpenseSummary(allExpenses,today,thisMonth);

  }catch(e){
    toast(t('expenses.s5')+e.message,'error');
  }
}
function renderExpenseSummary(expenses,today=todayISO(),thisMonth=today.substring(0,7)){
  const todayTotal=expenses
    .filter(e=>e.expense_date===today)
    .reduce((s,e)=>s+parseFloat(e.amount||0),0);
  const monthTotal=expenses
    .filter(e=>e.expense_date?.startsWith(thisMonth))
    .reduce((s,e)=>s+parseFloat(e.amount||0),0);
  const teEl=document.getElementById('today-expense');
  if(teEl) teEl.textContent=taka(todayTotal);
  const meEl=document.getElementById('month-expense');
  if(meEl) meEl.textContent=taka(monthTotal);
}
function renderExpensesTable(expenses){
  const tbody=document.getElementById('expense-table-body'); if(!tbody)return;
  if(!expenses.length){tbody.innerHTML=t('expenses.s1');return;}
  tbody.innerHTML=expenses.map(e=>`<tr>
    <td style="white-space:nowrap;font-size:11px;">${fmtDate(e.expense_date)}</td>
    <td style="font-weight:600;">${e.note||e.category||'—'}</td>
    <td><span class="badge badge-orange" style="font-size:10px;">${e.category}</span></td>
    <td style="font-weight:700;color:#c62828;">${taka(e.amount)}</td>
    <td style="font-size:11px;">${e.users?.name||'—'}</td>
    <td><div style="display:flex;gap:4px;">
      <button class="btn btn-icon btn-sm" onclick="openExpenseModal('${e.id}')">✏️</button>
      <button class="btn btn-icon btn-sm" style="color:#c62828;" onclick="deleteExpense('${e.id}',${e.amount})">🗑️</button>
    </div></td></tr>`).join('');
}
function filterExpenses(){
  const cat=document.getElementById('expense-cat-filter')?.value||'';
  const date=document.getElementById('expense-date-filter')?.value||'';
  renderExpensesTable(allExpenses.filter(e=>(!cat||e.category===cat)&&(!date||e.expense_date===date)));
}
function openExpenseModal(id=null){
  editingExpenseId=id;
  const e=id?allExpenses.find(x=>x.id===id):null;
  const html=`
    <div class="form-group">
      <label class="form-label">${t('expenses.s9')}<span class="required">*</span></label>
      <input id="exp-name" class="form-control" value="${e?.note||''}"
        placeholder="${t('expenses.s13')}" />
    </div>
    <div class="form-group">
      <label class="form-label">${t('expenses.s2')}<span class="required">*</span></label>
      <select id="exp-cat" class="form-control">
        ${getExpenseCategories().map(c=>`<option value="${c}" ${e?.category===c?'selected':''}>${c}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">${t('expenses.s11')}<span class="required">*</span></label>
      <input type="date" id="exp-date" class="form-control" value="${e?.expense_date||todayISO()}"/>
    </div>
    <div class="form-group">
      <label class="form-label">${t('cashbox.s5')}<span class="required">*</span></label>
      <input type="number" id="exp-amount" class="form-control" min="0.01"
        value="${e?.amount||''}" placeholder="${t('expenses.s10')}"/>
    </div>
    <div class="form-group">
      <label class="form-label">${t('cashbox.s9')}</label>
      <textarea id="exp-note" class="form-control" rows="2"
        placeholder="${t('expenses.s12')}" style="resize:none;">${e?.note||''}</textarea>
    </div>`;
  openModal('expenseModal', id?t('expenses.s15'):t('expenses.s16'), html,[
    {label:id?t('auth.s32'):t('expenses.s14'), action:'saveExpense()', cls:'btn-primary'},
    {label:t('common.cancel'), action:'closeModal("expenseModal")', cls:'btn-secondary'}
  ],'sm');
}


async function saveExpense(){
  const expenseId=editingExpenseId;
  const name=document.getElementById('exp-name')?.value.trim()||'';
  const category=document.getElementById('exp-cat')?.value;
  const expense_date=document.getElementById('exp-date')?.value;
  const amount=parseFloat(document.getElementById('exp-amount')?.value)||0;
  const extraNote=document.getElementById('exp-note')?.value||'';
  const note=name+(extraNote?': '+extraNote:'');
  if(!category||!expense_date||!Number.isFinite(amount)||amount<=0){toast(t('expenses.s3'),'error');return;}

  const saveButton=activeModals.expenseModal?.querySelector('.modal-footer .btn-primary');
  if(saveButton?.disabled) return;
  const saveButtonLabel=saveButton?.textContent;
  if(saveButton){
    saveButton.disabled=true;
    saveButton.textContent=t('expenses.s18');
  }

  let followUpRequests=[];
  try{
    const old=expenseId?allExpenses.find(e=>e.id===expenseId):null;
    let savedExpense;
    if(expenseId){
      const payload={category,expense_date,amount,note,updated_by:currentUserProfile?.id};
      const {error}=await sb.from('expenses').update(payload).eq('id',expenseId);
      if(error) throw error;
      savedExpense={...old,...payload,id:expenseId};
      const diff=amount-(parseFloat(old?.amount)||0);
      followUpRequests.push(()=>sb.from('expense_logs').insert({
        expense_id:expenseId,old_amount:old?.amount,new_amount:amount,changed_by:currentUserProfile?.id
      }));
      if(diff!==0){
        followUpRequests.push(()=>sb.from('cash_transactions').insert({
          transaction_type:'expense',direction:diff>0?'out':'in',amount:Math.abs(diff),
          reference_id:expenseId,note:`${t('expenses.s7')}${category}`,created_by:currentUserProfile?.id
        }));
      }
    }else{
      const {data,error}=await sb.from('expenses')
        .insert({category,expense_date,amount,note,created_by:currentUserProfile?.id})
        .select().single();
      if(error) throw error;
      if(!data?.id) throw new Error(t('expenses.s19'));
      savedExpense=data;
      followUpRequests.push(()=>sb.from('cash_transactions').insert({
        transaction_type:'expense',direction:'out',amount,reference_id:data.id,
        note:`${t('expenses.s8')}${category}`,created_by:currentUserProfile?.id
      }));
    }

    allExpenses=[savedExpense,...allExpenses.filter(e=>e.id!==savedExpense.id)]
      .sort((a,b)=>new Date(b.created_at||b.expense_date)-new Date(a.created_at||a.expense_date))
      .slice(0,100);
    const categoryFilter=document.getElementById('expense-cat-filter');
    const dateFilter=document.getElementById('expense-date-filter');
    if(categoryFilter) categoryFilter.value='';
    if(dateFilter) dateFilter.value='';
    filterExpenses();
    renderExpenseSummary(allExpenses);

    editingExpenseId=null;
    closeModal('expenseModal');
    toast(expenseId?t('expenses.s4'):t('expenses.s6'));

    saveExpenseFollowUps(followUpRequests).catch(error=>{
      console.error('খরচের ইতিহাস/ক্যাশবক্স আপডেট ব্যর্থ:',error);
      toast(t('expenses.s17')+error.message,'error');
    });
  }catch(e){toast(t('auth.s21')+e.message,'error');}
  finally{
    if(saveButton?.isConnected){
      saveButton.disabled=false;
      saveButton.textContent=saveButtonLabel;
    }
  }
}

async function saveExpenseFollowUps(requests){
  const results=await Promise.all(requests.map(request=>request()));
  const errors=results.map(result=>result?.error).filter(Boolean);
  if(errors.length) throw new Error(errors.map(error=>error.message).join('; '));
}
