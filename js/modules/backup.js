/* ══════════════════════════════════════════════════════════════
   💾 DATA BACKUP & CLEANUP
   ══════════════════════════════════════════════════════════════
   নির্দিষ্ট সময়ের ডাটা প্রিন্ট/সেভ অথবা স্থায়ীভাবে মুছে ফেলা।
   ══════════════════════════════════════════════════════════════ */

// ══════════════════════════════════════════════
// 💾 DATA BACKUP & SECURE CLEANUP SYSTEM
// ══════════════════════════════════════════════
function openBackupModal() {
  const html = `
    <div style="background:#e3f2fd; padding:12px; border-radius:8px; font-size:12px; margin-bottom:14px; color:#0d47a1; border:1px solid #bbdefb;">
      ℹ️${t('backup.s4')}PDF${t('backup.s5')}
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">${t('backup.s27')}</label><input type="date" id="backup-from" class="form-control" value="${todayISO().substring(0,8)+'01'}"/></div>
      <div class="form-group"><label class="form-label">${t('backup.s28')}</label><input type="date" id="backup-to" class="form-control" value="${todayISO()}"/></div>
    </div>
  `;
  openModal('backupModal', t('backup.s35'), html, [
    {label: t('backup.s36'), action: "processBackupData('export')", cls: 'btn-primary'},
    {label: t('backup.s38'), action: "openDeleteAuthModal()", cls: 'btn-danger'}
  ]);
}

function openDeleteAuthModal() {
  const from = document.getElementById('backup-from').value;
  const to = document.getElementById('backup-to').value;
  if(!from || !to) { toast(t('backup.s14'), 'error'); return; }
  closeModal('backupModal');

  const html = `
    <div style="background:#ffebee; padding:12px; border-radius:8px; font-size:12px; margin-bottom:14px; color:#c62828; border:1px solid #ffcdd2; font-weight:600;">
      ⚠️${t('backup.s3')}
    </div>
    <div class="form-group"><label class="form-label">${t('backup.s25')}</label><input type="email" id="del-auth-email" class="form-control" value="${currentUserProfile?.email || ''}" readonly style="background:#f5f5f5;" /></div>
    <div class="form-group"><label class="form-label">${t('backup.s18')}</label><input type="password" id="del-auth-pass" class="form-control" placeholder="${t('backup.s26')}" /></div>
  `;
  openModal('deleteAuthModal', t('backup.s37'), html, [
    {label: t('backup.s34'), action: `verifyAndDeleteBackup('${from}', '${to}')`, cls: 'btn-danger'},
    {label: t('common.cancel'), action: 'closeModal("deleteAuthModal")', cls: 'btn-secondary'}
  ]);
}

async function verifyAndDeleteBackup(from, to) {
  const email = document.getElementById('del-auth-email').value.trim();
  const pass = document.getElementById('del-auth-pass').value;
  if(!pass) { toast(t('backup.s19'), 'error'); return; }
  toast(t('backup.s23'), 'info');
  try {
    const { error } = await sb.auth.signInWithPassword({ email: email, password: pass });
    if(error) throw error;
    closeModal('deleteAuthModal');
    setTimeout(() => { processBackupData('delete', from, to); }, 200);
  } catch (e) { toast(t('backup.s24'), 'error'); }
}

async function processBackupData(action, passFrom=null, passTo=null) {
  const from = passFrom || document.getElementById('backup-from').value;
  const to = passTo || document.getElementById('backup-to').value;
  if(!from || !to) return;

  if(action === 'delete') {
    if(!confirm(t('backup.s33'))) return;
    if(!confirm(t('backup.s6'))) return;
  }
  
  toast(t('backup.s10'), 'info');
  try {
    const [salesR, purR, expR] = await Promise.all([
      sb.from('sales').select('*').gte('sale_date', from+'T00:00:00').lte('sale_date', to+'T23:59:59').order('sale_date'),
      sb.from('purchases').select('*').gte('purchase_date', from+'T00:00:00').lte('purchase_date', to+'T23:59:59').order('purchase_date'),
      sb.from('expenses').select('*').gte('expense_date', from).lte('expense_date', to).order('expense_date')
    ]);
    
    const sales = salesR.data || []; const purchases = purR.data || []; const expenses = expR.data || [];
    if(sales.length === 0 && purchases.length === 0 && expenses.length === 0) {
      toast(t('backup.s7'), 'error'); return;
    }
    
    if (action === 'export') {
        let printHtml = `<html><head><title>Backup ${from} to ${to}</title><style>body{font-family:sans-serif;font-size:10px;padding:20px;} table{width:100%;border-collapse:collapse;margin-bottom:20px;} th,td{border:1px solid #ccc;padding:4px;text-align:left;} th{background:#e8f5e9;color:#1a5c2a;} h2{font-size:14px;color:#1a5c2a;border-bottom:1px solid #1a5c2a;padding-bottom:4px;}</style></head><body>`;
        printHtml += `<h1 style="text-align:center;color:#1a5c2a;">${t('backup.s11')}</h1><p style="text-align:center;font-weight:bold;">${t('backup.s15')}${from}${t('backup.s2')}${to}</p>`;
        
        if(sales.length) {
          printHtml += `<h2>${t('backup.s30')}${sales.length}${t('backup.s1')}</h2><table><tr><th>${t('backup.s13')}</th><th>${t('backup.s8')}</th><th>${t('common.total')}</th><th>${t('backup.s16')}</th><th>${t('backup.s21')}</th></tr>`;
          sales.forEach(s => printHtml += `<tr><td>${s.sale_date.split('T')[0]}</td><td>${s.customer_name}</td><td>${s.total_amount}</td><td>${s.cash_amount}</td><td>${s.due_amount}</td></tr>`);
          printHtml += `</table>`;
        }
        if(purchases.length) {
          printHtml += `<h2>${t('backup.s31')}${purchases.length}${t('backup.s1')}</h2><table><tr><th>${t('backup.s13')}</th><th>${t('backup.s29')}</th><th>${t('common.total')}</th><th>${t('backup.s17')}</th><th>${t('backup.s21')}</th></tr>`;
          purchases.forEach(p => printHtml += `<tr><td>${p.purchase_date.split('T')[0]}</td><td>${p.supplier_name}</td><td>${p.total_amount}</td><td>${p.paid_amount}</td><td>${p.due_amount}</td></tr>`);
          printHtml += `</table>`;
        }
        if(expenses.length) {
          printHtml += `<h2>${t('backup.s32')}${expenses.length}${t('backup.s1')}</h2><table><tr><th>${t('backup.s13')}</th><th>${t('backup.s9')}</th><th>${t('common.note')}</th><th>${t('common.quantity')}</th></tr>`;
          expenses.forEach(e => printHtml += `<tr><td>${e.expense_date}</td><td>${e.category}</td><td>${e.note||'—'}</td><td>${e.amount}</td></tr>`);
          printHtml += `</table>`;
        }
        printHtml += `</body></html>`;
        
        const win = window.open('', '_blank');
        win.document.write(printHtml);
        win.document.close();
        setTimeout(() => win.print(), 500);
        toast(t('backup.s22'));
        
    } else if (action === 'delete') {
        const sIds = sales.map(s=>s.id); const pIds = purchases.map(p=>p.id); const eIds = expenses.map(e=>e.id);
        if(sIds.length) await sb.from('sales').delete().in('id', sIds);
        if(pIds.length) await sb.from('purchases').delete().in('id', pIds);
        if(eIds.length) await sb.from('expenses').delete().in('id', eIds);
        toast(t('backup.s12'));
    }
  } catch(err) { toast(t('backup.s20') + err.message, 'error'); }
}

