import { getAll, get } from '../db.js';
import { esc, money, fmtDate, r3, METHODS } from '../core.js';
import { $, ic, sheet, closeSheet, sheetHead, toast, head, coInfo, invoiceHtml, invoiceText, typeName, printDoc, copyText } from '../ui.js';
import { returnDoc } from '../services.js';
import { range } from '../reports.js';

export const title = 'سجل الفواتير';

export async function showInvoice(inv) {
  const co = await coInfo(), full = inv.type === 'sale' || inv.type === 'purchase';
  sheet(`${sheetHead(typeName(inv.type) + ' ' + esc(inv.no))}${invoiceHtml(inv, co)}
    <div class="fieldgrid"><button class="btn" id="cp">${ic('copy', 18)} نسخ</button><a class="btn soft" href="https://wa.me/?text=${encodeURIComponent(invoiceText(inv, co))}" target="_blank" rel="noopener">واتساب</a>
    <button class="btn out" id="a4">${ic('printer', 18)} طباعة A4</button><button class="btn out" id="th">${ic('receipt', 18)} طباعة حرارية</button>${full ? `<button class="btn out" id="rt" style="grid-column:1/-1">${ic('undo', 18)} مرتجع</button>` : ''}</div>`,
    b => {
      $('#cp', b).onclick = () => copyText(invoiceText(inv, co));
      $('#a4', b).onclick = () => printDoc(invoiceHtml(inv, co), 'a4');
      $('#th', b).onclick = () => printDoc(invoiceHtml(inv, co), 'thermal');
      if (full) $('#rt', b).onclick = () => returnSheet(inv.id);
    }, 'wide');
}

export async function returnSheet(id) {
  const inv = await get('invoices', id), isS = inv.type === 'sale';
  const rows = inv.items.map((it, i) => {
    const left = r3(it.qty - it.returned);
    return left > 0 ? `<div class="ln"><b>${esc(it.name)}</b><small>المتاح للإرجاع: ${left} ${esc(it.unit)}</small><div class="row"><input type="number" step="any" min="0" max="${left}" data-i="${i}" placeholder="كمية المرتجع" inputmode="decimal">${isS ? `<select data-c="${i}"><option value="good">سليم (يرجع للمخزن)</option><option value="damaged">تالف (خسارة)</option></select>` : ''}</div></div>` : '';
  }).join('') || '<p class="empty">تم إرجاع كل الأصناف</p>';
  sheet(`${sheetHead('مرتجع ' + typeName(inv.type), esc(inv.no))}${rows}<label>طريقة التسوية<select id="mode"><option value="cash">${isS ? 'رد نقدي للعميل' : 'استرداد نقدي من المورد'}</option>${inv.partyId ? '<option value="credit">على حساب الطرف</option>' : ''}</select></label><button class="btn full lg" id="go">تنفيذ المرتجع</button>`,
    b => $('#go', b).onclick = async () => {
      try {
        const lines = [...b.querySelectorAll('[data-i]')].map(x => ({ idx: +x.dataset.i, qty: +x.value || 0, cond: (b.querySelector(`[data-c="${x.dataset.i}"]`) || {}).value || 'good' }));
        const r = await returnDoc(isS ? 'sale' : 'purchase', inv.id, lines, $('#mode', b).value);
        toast('تم تنفيذ المرتجع'); closeSheet(); showInvoice(r);
      } catch (e) { toast(e.message, 'err'); }
    });
}

export async function render(el) {
  const [all, co] = await Promise.all([getAll('invoices'), coInfo()]); all.reverse();
  el.innerHTML = head('سجل الفواتير', `${all.length} مستند • بيع وشراء ومرتجعات`, 'receipt', '', 'b') +
    `<div class="fieldgrid mb"><select id="ft"><option value="">كل الأنواع</option>${['sale', 'purchase', 'sale_return', 'purchase_return'].map(t => `<option value="${t}">${typeName(t)}</option>`).join('')}</select><select id="fp"><option value="all">كل الفترات</option><option value="today">اليوم</option><option value="week">آخر 7 أيام</option><option value="month">هذا الشهر</option></select></div>
    <div class="sbox"><span class="sico">${ic('search', 19)}</span><input id="fq" type="search" placeholder="رقم الفاتورة أو اسم الطرف…"></div><div class="list" id="il"></div>`;
  const draw = () => {
    const t = $('#ft', el).value, q = $('#fq', el).value.trim().toLowerCase(), [f, to] = range($('#fp', el).value);
    const L = all.filter(i => (!t || i.type === t) && i.date >= f && i.date < to && (!q || (i.no + ' ' + (i.partyName || '')).toLowerCase().includes(q))).slice(0, 200);
    $('#il', el).innerHTML = L.map(i => `<button class="it" data-id="${i.id}"><span class="av" style="${i.type.includes('return') ? 'background:var(--r-soft);color:var(--r)' : i.type === 'purchase' ? 'background:var(--t-soft);color:var(--t)' : ''}">${ic(i.type.includes('return') ? 'undo' : i.type === 'purchase' ? 'truck' : 'receipt', 20)}</span><div class="tx"><b>${esc(i.no)} • ${esc(i.partyName || '')}</b><small>${typeName(i.type)} • ${fmtDate(i.date)}</small></div><div class="end"><b>${money(i.total)} ${esc(co.cur)}</b>${i.due > 0 ? '<span class="bd warn">آجل</span>' : ''}</div></button>`).join('') || '<p class="empty">لا توجد فواتير</p>';
  };
  draw();
  el.onchange = e => { if (e.target.id === 'ft' || e.target.id === 'fp') draw(); };
  el.oninput = e => { if (e.target.id === 'fq') draw(); };
  el.onclick = e => { const b = e.target.closest('.it[data-id]'); if (b) showInvoice(all.find(i => i.id == b.dataset.id)); };
}