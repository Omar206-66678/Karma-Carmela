import { getAll, setting } from '../db.js';
import { esc, money, formatQty, unitsOf, priceFor, r2, r3, fmtDate } from '../core.js';
import { $, sheet, closeSheet, toast, scan, invHtml, typeName, printDoc, coInfo } from '../ui.js';
import { createSale, createPurchase, returnDoc } from '../services.js';

export const sale = { title: 'فاتورة بيع', render: el => doc(el, 'sale') };
export const purchase = { title: 'فاتورة شراء (وارد)', render: el => doc(el, 'purchase') };
export const invoices = { title: 'الفواتير', render: listInvoices };

async function doc(el, kind) {
  const isS = kind === 'sale';
  const [P, parties, cur] = await Promise.all([getAll('products'), getAll('parties'), setting('currency', 'ج.م')]);
  const PL = parties.filter(x => x.type === (isS ? 'customer' : 'supplier'));
  const st = { cart: [] };
  el.innerHTML = `<div class="card"><label>${isS ? 'العميل' : 'المورد'}<select id="party"><option value="">${isS ? 'عميل نقدي' : 'مورد نقدي'}</option>${PL.map(x => `<option value="${x.id}">${esc(x.name)}${x.balance ? ` (${(isS ? x.balance > 0 : x.balance > 0) ? (isS ? 'عليه' : 'له') : ''} ${money(Math.abs(x.balance))})` : ''}</option>`).join('')}</select></label>
    <div class="row"><input id="q" placeholder="ابحث بالاسم أو امسح الباركود" autocomplete="off"><button class="btn ic" id="sc" type="button">📷</button></div><div id="res" class="list"></div></div>
    <div id="cart"></div>
    <div class="card"><div class="row sb"><span>الإجمالي</span><b id="sub"></b></div>
    <label>الخصم<input id="disc" type="number" step="any" inputmode="decimal" placeholder="0"></label>
    <div class="row sb big"><span>الصافي</span><b id="netv"></b></div>
    <label>المدفوع (اتركه فارغاً = دفع كامل)<input id="paid" type="number" step="any" inputmode="decimal"></label>
    <div class="row sb"><span>المتبقي (آجل)</span><b id="due"></b></div>
    <input id="note" placeholder="ملاحظة (اختياري)"><button class="btn full" id="save">💾 حفظ الفاتورة</button></div>`;

  const party = () => PL.find(x => x.id == $('#party', el).value);
  const prod = id => P.find(p => p.id === id);
  const unitPrice = l => {
    const p = prod(l.productId), u = unitsOf(p)[l.unitIdx];
    const perBase = isS ? priceFor(p, (party() || {}).group || 'wholesale', l.qty * u.factor) : (p.prices.cost || p.avgCost || 0);
    return r2(perBase * u.factor);
  };
  const reprice = () => st.cart.forEach(l => { if (!l.manual) l.price = unitPrice(l); });
  const add = p => {
    const l = st.cart.find(x => x.productId === p.id && x.unitIdx === 0);
    if (l) l.qty++; else st.cart.push({ productId: p.id, unitIdx: 0, qty: 1, price: 0 });
    reprice(); drawCart();
  };
  function totals() {
    const sub = r2(st.cart.reduce((s, l) => s + l.qty * l.price, 0)), disc = +$('#disc', el).value || 0, net = r2(sub - disc);
    const pv = $('#paid', el).value, paid = pv === '' ? net : +pv;
    $('#sub', el).textContent = `${money(sub)} ${cur}`; $('#netv', el).textContent = `${money(net)} ${cur}`;
    $('#due', el).textContent = `${money(net - paid)} ${cur}`;
    return { disc, paid };
  }
  function drawCart() {
    $('#cart', el).innerHTML = st.cart.map((l, i) => {
      const p = prod(l.productId), us = unitsOf(p);
      return `<div class="card line" data-i="${i}"><div class="row sb"><b>${esc(p.name)}</b><button class="x2" data-act="del">🗑</button></div>${isS ? `<small>المتاح: ${formatQty(p.qty, p)}</small>` : ''}
      <div class="row"><select data-f="unitIdx">${us.map((u, k) => `<option value="${k}" ${k === l.unitIdx ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select>
      <input type="number" step="any" min="0" inputmode="decimal" data-f="qty" value="${l.qty}"><input type="number" step="any" min="0" inputmode="decimal" data-f="price" value="${l.price}"></div>
      <div class="end"><b>${money(l.qty * l.price)} ${cur}</b></div></div>`;
    }).join('');
    totals();
  }
  const find = q => { q = q.trim().toLowerCase(); return q ? P.filter(p => (p.barcode && p.barcode === q) || p.name.toLowerCase().includes(q)).slice(0, 8) : []; };
  const showRes = () => {
    const R = find($('#q', el).value);
    $('#res', el).innerHTML = R.map(p => `<div class="item" data-pid="${p.id}"><div><b>${esc(p.name)}</b><small>${esc(p.category || '')}</small></div><span class="badge ${p.qty <= (p.minStock || 0) ? 'warn' : ''}">${formatQty(p.qty, p)}</span></div>`).join('');
  };
  const pick = p => { add(p); $('#q', el).value = ''; $('#res', el).innerHTML = ''; };

  $('#q', el).oninput = showRes;
  $('#q', el).onkeydown = e => { if (e.key === 'Enter') { const R = find($('#q', el).value); if (R[0]) pick(R[0]); else toast('لا يوجد صنف بهذا الاسم/الباركود'); } };
  $('#sc', el).onclick = () => scan(c => { const p = P.find(x => x.barcode === c); p ? pick(p) : toast('باركود غير مسجل: ' + c); });
  el.oninput = e => { if (e.target.id === 'disc' || e.target.id === 'paid') totals(); };
  el.onclick = async e => {
    const it = e.target.closest('[data-pid]'); if (it) return pick(prod(+it.dataset.pid));
    if (e.target.dataset.act === 'del') { st.cart.splice(+e.target.closest('.line').dataset.i, 1); return drawCart(); }
    if (e.target.id === 'save') {
      try {
        const t = totals(), items = st.cart.filter(l => l.qty > 0);
        if (!items.length) throw new Error('الفاتورة فارغة');
        const d = { partyId: +$('#party', el).value || null, items: items.map(l => ({ productId: l.productId, unitIdx: l.unitIdx, qty: l.qty, price: l.price })), discount: t.disc, paid: t.paid, note: $('#note', el).value };
        const inv = await (isS ? createSale : createPurchase)(d);
        toast('تم الحفظ ✓'); await doc(el, kind); showInvoice(inv);
      } catch (err) { toast(err.message); }
    }
  };
  el.onchange = e => {
    const t = e.target;
    if (t.id === 'party') { reprice(); return drawCart(); }
    const line = t.closest && t.closest('.line'); if (!line) return;
    const l = st.cart[+line.dataset.i], f = t.dataset.f;
    l[f] = f === 'unitIdx' ? +t.value : Math.max(0, +t.value || 0);
    if (f === 'price') l.manual = true;
    if (f === 'unitIdx') l.manual = false;
    if (!l.manual) l.price = unitPrice(l);
    drawCart();
  };
}

export async function showInvoice(inv) {
  const co = await coInfo(), canRet = inv.type === 'sale' || inv.type === 'purchase';
  sheet(`<div class="paper">${invHtml(inv, co)}</div><div class="row"><button class="btn full" id="a4">🖨 A4</button><button class="btn alt full" id="th">🧾 حراري</button>${canRet ? '<button class="btn alt full" id="rt">↩ مرتجع</button>' : ''}</div>`,
    b => {
      $('#a4', b).onclick = () => printDoc(invHtml(inv, co), 'a4');
      $('#th', b).onclick = () => printDoc(invHtml(inv, co), 'thermal');
      if (canRet) $('#rt', b).onclick = () => returnSheet(inv);
    });
}

function returnSheet(inv) {
  const isS = inv.type === 'sale';
  const rows = inv.items.map((it, i) => {
    const left = r3(it.qty - it.returned);
    return left > 0 ? `<div class="card"><b>${esc(it.name)}</b><small>المتاح للإرجاع: ${left} ${esc(it.unit)}</small><div class="row"><input type="number" step="any" min="0" max="${left}" data-i="${i}" placeholder="كمية المرتجع" inputmode="decimal">${isS ? `<select data-c="${i}"><option value="good">سليم (يرجع للمخزن)</option><option value="damaged">تالف (خسارة)</option></select>` : ''}</div></div>` : '';
  }).join('') || '<p class="empty">تم إرجاع كل الأصناف</p>';
  sheet(`<h3>مرتجع ${typeName(inv.type)} ${inv.no}</h3>${rows}<label>طريقة التسوية<select id="mode"><option value="cash">${isS ? 'رد نقدي للعميل' : 'استرداد نقدي من المورد'}</option>${inv.partyId ? '<option value="credit">على حساب الطرف</option>' : ''}</select></label><button class="btn full" id="go">تنفيذ المرتجع</button>`,
    b => $('#go', b).onclick = async () => {
      try {
        const lines = [...b.querySelectorAll('[data-i]')].map(x => ({ idx: +x.dataset.i, qty: +x.value || 0, cond: (b.querySelector(`[data-c="${x.dataset.i}"]`) || {}).value || 'good' }));
        const r = await returnDoc(isS ? 'sale' : 'purchase', inv.id, lines, $('#mode', b).value);
        toast('تم المرتجع ✓'); closeSheet(); showInvoice(r);
      } catch (e) { toast(e.message); }
    });
}

async function listInvoices(el) {
  const cur = await setting('currency', 'ج.م'), all = (await getAll('invoices')).reverse();
  el.innerHTML = `<div class="row" style="margin-bottom:10px"><select id="ft"><option value="">كل الأنواع</option>${['sale', 'purchase', 'sale_return', 'purchase_return'].map(t => `<option value="${t}">${typeName(t)}</option>`).join('')}</select><input id="fq" placeholder="رقم / اسم"></div><div id="il" class="list"></div>`;
  const draw = () => {
    const t = $('#ft', el).value, q = $('#fq', el).value.trim().toLowerCase();
    $('#il', el).innerHTML = all.filter(i => (!t || i.type === t) && (!q || (i.no + (i.partyName || '')).toLowerCase().includes(q))).slice(0, 150)
      .map(i => `<div class="item" data-id="${i.id}"><div><b>${i.no}</b><small>${typeName(i.type)} • ${fmtDate(i.date)} • ${esc(i.partyName || '')}</small></div><b>${money(i.total)} ${cur}</b></div>`).join('') || '<p class="empty">لا توجد فواتير</p>';
  };
  draw(); $('#ft', el).onchange = draw; $('#fq', el).oninput = draw;
  $('#il', el).onclick = e => { const it = e.target.closest('.item'); if (it) showInvoice(all.find(i => i.id == it.dataset.id)); };
}
