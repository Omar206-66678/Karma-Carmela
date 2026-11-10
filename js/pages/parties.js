import { getAll, get, tx } from '../db.js';
import { esc, money, fmtDate, fmtDay, GROUPS, balanceLabel, METHODS, r2 } from '../core.js';
import { $, ic, logo, sheet, closeSheet, sheetHead, toast, head, coInfo, printDoc, typeName } from '../ui.js';
import { saveParty, deleteParty, payParty } from '../services.js';
import { showInvoice } from './invoices.js';

const TY = { sale: 'فاتورة بيع', purchase: 'فاتورة شراء', payment: 'دفعة', sale_return: 'مرتجع مبيعات', purchase_return: 'مرتجع مشتريات', opening: 'رصيد افتتاحي' };

function partyForm(p, type, done) {
  const n = !p; p = p || { type, balance: 0 }; const isC = p.type === 'customer';
  sheet(`${sheetHead((n ? 'إضافة ' : 'تعديل ') + (isC ? 'عميل' : 'مورد'))}
    <label>الاسم<input id="n" value="${esc(p.name || '')}"></label><label>الهاتف<input id="t" inputmode="tel" dir="ltr" value="${esc(p.phone || '')}"></label><label>العنوان<input id="a" value="${esc(p.address || '')}"></label>
    ${isC ? `<div class="fieldgrid"><label>مجموعة الأسعار<select id="g">${Object.entries(GROUPS).map(([k, x]) => `<option value="${k}" ${p.group === k ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label>حد الائتمان (0 = بدون)<input id="c" type="number" inputmode="decimal" value="${p.creditLimit || ''}"></label></div>` : ''}
    ${n ? `<label>${isC ? 'دين افتتاحي (عليه)' : 'رصيد افتتاحي (له)'}<input id="o" type="number" step="any" inputmode="decimal" placeholder="0"></label>` : ''}
    <button class="btn full lg" id="go">${ic('save', 20)} حفظ</button>`,
    b => $('#go', b).onclick = async () => {
      try {
        if (!$('#n', b).value.trim()) throw new Error('اكتب الاسم');
        await saveParty({ ...p, name: $('#n', b).value.trim(), phone: $('#t', b).value.trim(), address: $('#a', b).value.trim(), group: isC ? $('#g', b).value : undefined, creditLimit: isC ? +$('#c', b).value || 0 : 0 }, n ? +$('#o', b).value || 0 : 0);
        toast('تم الحفظ'); closeSheet(); done();
      } catch (e) { toast(e.message, 'err'); }
    });
}

function listPage(type) {
  const isC = type === 'customer';
  return {
    title: isC ? 'العملاء' : 'الموردون',
    async render(el) {
      const [all, co] = await Promise.all([getAll('parties'), coInfo()]), L0 = all.filter(p => p.type === type);
      const tot = r2(L0.filter(p => p.balance > 0).reduce((s, p) => s + p.balance, 0));
      el.innerHTML = head(isC ? 'العملاء' : 'الموردون', `${L0.length} ${isC ? 'عميل' : 'مورد'}`, 'users', `<button class="btn" id="add">${ic('plus', 19)} ${isC ? 'عميل جديد' : 'مورد جديد'}</button>`, isC ? 'b' : 'a') +
        `<div class="kpi ${isC ? 'b' : 'r'} mb"><div class="top"><span class="ci sm ${isC ? 'b' : 'r'}">${ic(isC ? 'users' : 'truck', 20)}</span></div><div><small>${isC ? 'إجمالي المستحق لنا' : 'إجمالي المستحق علينا'}</small><b>${money(tot)}<i>${esc(co.cur)}</i></b></div></div>
        <div class="sbox"><span class="sico">${ic('search', 19)}</span><input id="s" type="search" placeholder="بحث بالاسم أو الهاتف…"></div><div class="list" id="l"></div>`;
      const draw = () => {
        const q = $('#s', el).value.trim().toLowerCase();
        $('#l', el).innerHTML = L0.filter(p => !q || (p.name + (p.phone || '')).toLowerCase().includes(q)).map(p => `<a class="it" href="#/party/${p.id}"><span class="av">${esc(p.name.trim()[0] || '؟')}</span><div class="tx"><b class="trunc">${esc(p.name)}</b><small>${esc(p.phone || '')}${isC && p.group ? ' • ' + GROUPS[p.group] : ''}</small></div><div class="end">${p.balance ? `<b class="${p.balance > 0 ? (isC ? 'neg' : 'pos') : ''}">${money(Math.abs(p.balance))} ${esc(co.cur)}</b><small>${balanceLabel(p)}</small>` : '<span class="bd ok">مسدد</span>'}</div></a>`).join('') || '<p class="empty">لا يوجد</p>';
      };
      draw();
      $('#s', el).oninput = draw;
      $('#add', el).onclick = () => partyForm(null, type, () => this.render(el));
    }
  };
}
export const customers = listPage('customer');
export const suppliers = listPage('supplier');

export const party = {
  title: 'تفاصيل الحساب',
  async render(el, arg) {
    const p = await get('parties', +arg); if (!p) throw new Error('الحساب غير موجود');
    const [L, all, co] = await Promise.all([tx(['ledger'], S => S.ledger.idx('partyId', p.id), 'readonly'), getAll('invoices'), coInfo()]);
    L.reverse(); const invs = all.filter(i => i.partyId === p.id).reverse(), isC = p.type === 'customer';
    const sum = f => r2(L.filter(f).reduce((s, x) => s + x.change, 0));
    const total = sum(x => ['sale', 'purchase', 'opening', 'sale_return', 'purchase_return'].includes(x.type)), paid = -sum(x => x.type === 'payment');
    let tab = 'invoices';
    el.innerHTML = `<a class="lnk mb" href="#/${isC ? 'customers' : 'suppliers'}" style="display:inline-flex">${ic('chev', 16)} ${isC ? 'العودة للعملاء' : 'العودة للموردين'}</a>
      <section class="hero" style="margin-top:8px"><div class="ht"><div><small>${isC ? 'عميل' : 'مورد'}${isC && p.group ? ' • ' + GROUPS[p.group] : ''}</small><h2>${esc(p.name)}</h2><small>${esc([p.phone, p.address].filter(Boolean).join(' • ') || '—')}</small></div><span class="av" style="background:rgba(255,255,255,.18);color:#fff">${esc(p.name.trim()[0] || '؟')}</span></div>
      <div class="big">${money(Math.abs(p.balance || 0))}<i>${esc(co.cur)} ${p.balance ? balanceLabel(p) : ''}</i></div><small>الرصيد الحالي</small>
      <div class="acts mt"><button class="btn or" id="pay">${ic('banknote', 19)} ${isC ? 'استلام دفعة' : 'سداد للمورد'}</button><a class="btn glass" href="#/${isC ? 'pos' : 'purchase-new'}" id="newinv">${ic(isC ? 'cart' : 'truck', 19)} فاتورة جديدة</a></div></section>
      <div class="tiles"><div class="tile"><small>${isC ? 'إجمالي مبيعاته' : 'إجمالي مشترياته'}</small><b>${money(total)}</b></div><div class="tile"><small>${isC ? 'المدفوع' : 'المدفوع له'}</small><b class="pos">${money(paid)}</b></div><div class="tile"><small>المتبقي</small><b class="${p.balance > 0 ? 'neg' : ''}">${money(p.balance || 0)}</b></div></div>
      <div class="row mb"><button class="btn out sm" id="ed">${ic('pencil', 17)} تعديل</button><button class="btn out sm" id="pr">${ic('printer', 17)} كشف حساب</button><button class="btn out sm" id="del" style="color:var(--r)">${ic('trash', 17)} حذف</button></div>
      <div class="seg" id="seg"><button data-t="invoices" class="on">الفواتير</button><button data-t="payments">الدفعات</button><button data-t="ledger">كشف الحساب</button></div><div class="list" id="tb"></div>`;
    const draw = () => {
      $$seg();
      let h = '';
      if (tab === 'invoices') h = invs.map(i => `<button class="it" data-id="${i.id}"><span class="av">${ic('receipt', 20)}</span><div class="tx"><b>${esc(i.no)}</b><small>${typeName(i.type)} • ${fmtDate(i.date)}</small></div><div class="end"><b>${money(i.total)} ${esc(co.cur)}</b>${i.due > 0 ? '<span class="bd warn">آجل</span>' : ''}</div></button>`).join('') || '<p class="empty">لا توجد فواتير</p>';
      else if (tab === 'payments') h = L.filter(x => x.type === 'payment').map(x => `<div class="it" style="cursor:default"><span class="av" style="background:var(--o-soft);color:var(--o)">${ic('banknote', 20)}</span><div class="tx"><b>${money(-x.change)} ${esc(co.cur)}</b><small>${fmtDate(x.date)} ${esc(x.note || '')}</small></div></div>`).join('') || '<p class="empty">لا توجد دفعات</p>';
      else h = L.map(x => `<div class="it" style="cursor:default"><div class="tx"><b>${TY[x.type] || x.type}</b><small>${fmtDate(x.date)} ${esc(x.ref || '')}</small></div><div class="end"><b class="${x.change > 0 ? 'neg' : 'pos'}">${x.change > 0 ? '+' : ''}${money(x.change)}</b><small>الرصيد ${money(x.balance)}</small></div></div>`).join('') || '<p class="empty">لا توجد حركات</p>';
      $('#tb', el).innerHTML = h;
    };
    const $$seg = () => el.querySelectorAll('#seg button').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
    draw();
    el.onclick = e => {
      const t = e.target.closest('#seg [data-t]'); if (t) { tab = t.dataset.t; return draw(); }
      const it = e.target.closest('.it[data-id]'); if (it) return showInvoice(invs.find(i => i.id == it.dataset.id));
      if (e.target.closest('#newinv')) sessionStorage.setItem('preParty', p.id);
      if (e.target.closest('#ed')) partyForm(p, p.type, () => party.render(el, arg));
      if (e.target.closest('#del')) { if (confirm('حذف هذا الحساب؟')) deleteParty(p.id).then(() => { toast('تم الحذف'); location.hash = '#/' + (isC ? 'customers' : 'suppliers'); }).catch(err => toast(err.message, 'err')); }
      if (e.target.closest('#pay')) sheet(`${sheetHead(isC ? 'استلام دفعة' : 'سداد للمورد', esc(p.name))}<label>المبلغ<input id="a" type="number" step="any" inputmode="decimal"></label><label>طريقة الدفع<select id="m">${METHODS.filter(m => m !== 'آجل').map(m => `<option>${m}</option>`).join('')}</select></label><label>ملاحظة<input id="n"></label><button class="btn or full lg" id="go">تأكيد</button>`,
        b => $('#go', b).onclick = async () => { try { await payParty(p.id, +$('#a', b).value, $('#n', b).value, $('#m', b).value); toast('تم التسجيل'); closeSheet(); party.render(el, arg); } catch (err) { toast(err.message, 'err'); } });
      if (e.target.closest('#pr')) printDoc(`<article class="paper" dir="rtl"><div class="hd">${logo(50)}<h3>${esc(co.name)}</h3><p><b>كشف حساب: ${esc(p.name)}</b></p></div><table><thead><tr><th>التاريخ</th><th>البيان</th><th>الحركة</th><th>الرصيد</th></tr></thead><tbody>${[...L].reverse().map(x => `<tr><td>${fmtDay(x.date)}</td><td>${TY[x.type] || ''} ${esc(x.ref || '')}</td><td class="c">${money(x.change)}</td><td class="c">${money(x.balance)}</td></tr>`).join('')}</tbody></table><div class="tot"><table><tbody><tr class="grand"><td>الرصيد الحالي (${balanceLabel(p)})</td><td class="l">${money(p.balance)} ${esc(co.cur)}</td></tr></tbody></table></div></article>`, 'a4');
    };
  }
};