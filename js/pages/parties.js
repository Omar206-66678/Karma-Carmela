import { getAll, put, tx } from '../db.js';
import { esc, money, fmtDate, GROUPS, balanceLabel } from '../core.js';
import { sheet, closeSheet, toast, $, printDoc, coInfo } from '../ui.js';
import { payParty } from '../services.js';
export const title = 'العملاء والموردون';
const TY = { sale: 'فاتورة بيع', purchase: 'فاتورة شراء', payment: 'دفعة', sale_return: 'مرتجع مبيعات', purchase_return: 'مرتجع مشتريات' };
const refresh = () => render($('#view'));
const lbl = balanceLabel;

export async function render(el) {
  let tab = sessionStorage.getItem('ptab') || 'customer';
  const all = await getAll('parties'), cur = (await coInfo()).cur;
  el.innerHTML = `<div class="seg"><button data-t="customer">العملاء</button><button data-t="supplier">الموردون</button></div><input id="s" class="search" placeholder="بحث بالاسم / الهاتف"><div class="card" id="sum"></div><div id="list" class="list"></div><button class="fab" id="add">＋</button>`;
  const draw = () => {
    el.querySelectorAll('.seg button').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
    const q = $('#s', el).value.trim().toLowerCase();
    const L = all.filter(p => p.type === tab && (!q || (p.name + (p.phone || '')).toLowerCase().includes(q)));
    const tot = all.filter(p => p.type === tab && p.balance > 0).reduce((s, p) => s + p.balance, 0);
    $('#sum', el).innerHTML = `<div class="row sb"><span>${tab === 'customer' ? 'إجمالي المستحق لنا' : 'إجمالي المستحق علينا'}</span><b>${money(tot)} ${cur}</b></div>`;
    $('#list', el).innerHTML = L.map(p => `<div class="item" data-id="${p.id}"><div><b>${esc(p.name)}</b><small>${esc(p.phone || '')}${p.group && tab === 'customer' ? ' • ' + GROUPS[p.group] : ''}</small></div><b class="${(p.balance || 0) > 0 ? (tab === 'customer' ? 'neg' : 'pos') : ''}">${p.balance ? lbl(p) + ' ' + money(Math.abs(p.balance)) : '—'}</b></div>`).join('') || '<p class="empty">لا يوجد</p>';
  };
  draw();
  el.querySelector('.seg').onclick = e => { if (e.target.dataset.t) { tab = e.target.dataset.t; sessionStorage.setItem('ptab', tab); draw(); } };
  $('#s', el).oninput = draw;
  $('#add', el).onclick = () => form(null, tab);
  $('#list', el).onclick = e => { const it = e.target.closest('.item'); if (it) detail(all.find(p => p.id == it.dataset.id), cur); };
}

function form(p, type) {
  const n = !p; p = p || { type, balance: 0 };
  const isC = p.type === 'customer';
  sheet(`<h3>${n ? 'إضافة' : 'تعديل'} ${isC ? 'عميل' : 'مورد'}</h3>
    <label>الاسم<input id="n" value="${esc(p.name || '')}"></label><label>الهاتف<input id="t" inputmode="tel" value="${esc(p.phone || '')}"></label>
    ${isC ? `<label>مجموعة الأسعار<select id="g">${Object.entries(GROUPS).map(([k, x]) => `<option value="${k}" ${p.group === k ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
    <label>حد الائتمان (0 = بدون حد)<input id="c" type="number" inputmode="decimal" value="${p.creditLimit || ''}"></label>` : ''}
    <button class="btn full" id="go">حفظ</button>`,
    b => $('#go', b).onclick = async () => {
      if (!$('#n', b).value.trim()) return toast('اكتب الاسم');
      await put('parties', { ...p, name: $('#n', b).value.trim(), phone: $('#t', b).value.trim(), group: isC ? $('#g', b).value : undefined, creditLimit: isC ? +$('#c', b).value || 0 : 0 });
      toast('تم الحفظ ✓'); closeSheet(); refresh();
    });
}

async function detail(p, cur) {
  const L = (await tx(['ledger'], S => S.ledger.idx('partyId', p.id), 'readonly')).reverse();
  sheet(`<h3>${esc(p.name)}</h3><div class="card"><div class="row sb"><span>الرصيد</span><b class="big">${money(Math.abs(p.balance || 0))} ${cur} <small style="display:inline">${p.balance ? lbl(p) : ''}</small></b></div></div>
    <div class="row"><button class="btn full" id="pay">💵 ${p.type === 'customer' ? 'استلام دفعة' : 'سداد للمورد'}</button><button class="btn alt full" id="ed">✏️</button><button class="btn alt full" id="pr">🖨</button></div>
    <h4 style="margin:4px 0">كشف الحساب</h4><div class="list">${L.map(x => `<div class="item"><div><b>${TY[x.type] || x.type}</b><small>${fmtDate(x.date)} ${x.ref || ''}</small></div><div class="end"><b class="${x.change > 0 ? 'neg' : 'pos'}">${x.change > 0 ? '+' : ''}${money(x.change)}</b><small>الرصيد ${money(x.balance)}</small></div></div>`).join('') || '<p class="empty">لا توجد حركات</p>'}</div>`,
    b => {
      $('#ed', b).onclick = () => form(p);
      $('#pay', b).onclick = () => sheet(`<h3>${p.type === 'customer' ? 'استلام دفعة من' : 'سداد إلى'} ${esc(p.name)}</h3><label>المبلغ<input id="a" type="number" step="any" inputmode="decimal"></label><label>ملاحظة<input id="m"></label><button class="btn full" id="go">تأكيد</button>`,
        c => $('#go', c).onclick = async () => { try { await payParty(p.id, +$('#a', c).value, $('#m', c).value); toast('تم التسجيل ✓'); closeSheet(); refresh(); } catch (e) { toast(e.message); } });
      $('#pr', b).onclick = async () => {
        const co = await coInfo();
        printDoc(`<div class="inv"><h2>${esc(co.name)}</h2><h3>كشف حساب: ${esc(p.name)}</h3><table><thead><tr><th>التاريخ</th><th>البيان</th><th>الحركة</th><th>الرصيد</th></tr></thead><tbody>${[...L].reverse().map(x => `<tr><td>${fmtDate(x.date)}</td><td>${TY[x.type] || ''} ${x.ref || ''}</td><td>${money(x.change)}</td><td>${money(x.balance)}</td></tr>`).join('')}</tbody></table><div class="tt"><p><b>الرصيد الحالي: ${money(p.balance)} ${co.cur} (${lbl(p)})</b></p></div></div>`, 'a4');
      };
    });
}
