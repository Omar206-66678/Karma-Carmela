import { getAll } from '../db.js';
import { esc, money, formatQty, unitsOf, baseName, priceFor, r2, bcKey, matchP, balanceLabel, METHODS, stockStatus } from '../core.js';
import { $, ic, toast, head, searchBox, coInfo } from '../ui.js';
import { scanBarcode } from '../scanner.js';
import { createSale, createPurchase } from '../services.js';
import { showInvoice } from './invoices.js';

let ctl = null;
export const pos = { title: 'نقطة البيع', render: el => doc(el, 'sale'), onScan: c => ctl && ctl.onCode(c) };
export const purchaseNew = { title: 'فاتورة شراء', render: el => doc(el, 'purchase'), onScan: c => ctl && ctl.onCode(c) };
export const purchases = { title: 'المشتريات', render: listPurchases };

async function doc(el, kind) {
  const isS = kind === 'sale';
  const [P, parties, co, C] = await Promise.all([getAll('products'), getAll('parties'), coInfo(), getAll('categories')]);
  const PL = parties.filter(x => x.type === (isS ? 'customer' : 'supplier'));
  const st = { cart: [], method: 'كاش', disc: '', paid: '', note: '', saving: false, party: sessionStorage.getItem('preParty') || '', q: '' };
  sessionStorage.removeItem('preParty');
  const icon = n => (C.find(c => c.name === n) || {}).icon || '📦';
  const prod = id => P.find(p => p.id === id);
  const party = () => PL.find(x => String(x.id) === String(st.party));
  const unitPrice = l => {
    const p = prod(l.productId), u = unitsOf(p)[l.unitIdx];
    const base = isS ? priceFor(p, (party() || {}).group || 'wholesale', l.qty * u.factor) : (p.prices.cost || p.avgCost || 0);
    return r2(base * u.factor);
  };
  const reprice = () => st.cart.forEach(l => { if (!l.manual) l.price = unitPrice(l); });
  const add = p => {
    if (isS && !(p.qty > 0)) return toast('الصنف نافد من المخزون', 'err');
    const l = st.cart.find(x => x.productId === p.id && x.unitIdx === 0);
    if (l) l.qty = r2(l.qty + 1); else st.cart.push({ productId: p.id, unitIdx: 0, qty: 1, price: 0, exp: '' });
    reprice(); drawCart();
  };

  el.innerHTML = head(isS ? 'نقطة البيع' : 'فاتورة شراء جديدة', isS ? 'اختر الأصناف أو امسح الباركود' : 'سجّل الأصناف الواردة وتكلفتها', isS ? 'cart' : 'truck', isS ? '' : `<a class="btn out" href="#/purchases">كل الفواتير</a>`, isS ? 'o' : 't') +
    `<div class="split"><div>
      <div class="card"><label>${isS ? 'العميل' : 'المورد'}<select id="party"><option value="">${isS ? 'عميل نقدي' : 'مورد نقدي'}</option>${PL.map(x => `<option value="${x.id}" ${String(x.id) === String(st.party) ? 'selected' : ''}>${esc(x.name)}${x.balance ? ` (${balanceLabel(x)} ${money(Math.abs(x.balance))})` : ''}</option>`).join('')}</select></label></div>
      ${searchBox('s', 'ابحث بالاسم أو امسح الباركود…')}
      <button class="btn out full mb" id="scm">${ic('scan', 19)} مسح مستمر (عدة أصناف متتالية)</button>
      <div class="pgrid" id="grid"></div></div>
    <div class="stick"><div class="card" id="cart"></div></div></div>`;

  const totals = () => {
    const sub = r2(st.cart.reduce((s, l) => s + l.qty * l.price, 0)), disc = +st.disc || 0, net = r2(sub - disc);
    const paid = st.paid === '' ? (st.method === 'آجل' ? 0 : net) : +st.paid, due = r2(net - paid);
    const set = (id, v) => { const x = $('#' + id, el); if (x) x.textContent = v; };
    set('t_sub', `${money(sub)} ${co.cur}`); set('t_disc', `${money(disc)} ${co.cur}`); set('t_net', `${money(net)} ${co.cur}`); set('t_due', `${money(due)} ${co.cur}`);
    return { sub, disc, net, paid, due };
  };
  function drawCart() {
    const lines = st.cart.map((l, i) => {
      const p = prod(l.productId), us = unitsOf(p), u = us[l.unitIdx], over = isS && l.qty * u.factor > p.qty + 1e-9;
      return `<div class="ln" data-i="${i}"><div class="l1"><b class="trunc">${esc(p.name)}</b><button class="xb" data-act="del" aria-label="حذف">${ic('trash', 18)}</button></div>
        ${isS ? `<small class="${over ? 'neg' : ''}">المتاح: ${formatQty(p.qty, p)}${over ? ' — الكمية أكبر من المتاح' : ''}</small>` : ''}
        <div class="l2"><select data-f="unitIdx">${us.map((x, k) => `<option value="${k}" ${k === l.unitIdx ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
        <div class="stp"><button data-act="dec" aria-label="إنقاص">−</button><input type="number" step="any" min="0" inputmode="decimal" data-f="qty" value="${l.qty}"><button data-act="inc" aria-label="زيادة">+</button></div>
        <input type="number" step="any" min="0" inputmode="decimal" data-f="price" value="${l.price}" aria-label="السعر"></div>
        ${isS ? '' : `<label>تاريخ الصلاحية (اختياري)<input type="date" data-f="exp" value="${l.exp || ''}"></label>`}
        <div class="row sb"><small>${esc(u.name)}${u.factor > 1 ? ` = ${u.factor} ${esc(baseName(p))}` : ''}</small><b>${money(l.qty * l.price)} ${esc(co.cur)}</b></div></div>`;
    }).join('') || `<p class="empty">${isS ? 'السلة فارغة — اختر منتجاً أو امسح باركود' : 'أضف الأصناف الواردة'}</p>`;
    $('#cart', el).innerHTML = `<div class="card-h"><h2>${isS ? 'السلة' : 'بنود الفاتورة'} (${st.cart.length})</h2></div>${lines}
      <label>الخصم (${esc(co.cur)})<input id="disc" type="number" step="any" inputmode="decimal" placeholder="0" value="${st.disc}"></label>
      <div class="chips mt">${METHODS.map(m => `<button class="chip ${st.method === m ? 'on' : ''}" data-m="${m}">${m}</button>`).join('')}</div>
      <label>المدفوع (فارغ = ${st.method === 'آجل' ? 'لم يُدفع شيء' : 'دفع كامل'})<input id="paid" type="number" step="any" inputmode="decimal" value="${st.paid}"></label>
      <div class="mt"><div class="trow"><span>الإجمالي</span><span id="t_sub"></span></div><div class="trow"><span>الخصم</span><span id="t_disc"></span></div><div class="trow big"><span>الصافي</span><b id="t_net"></b></div><div class="trow"><span>المتبقي (آجل)</span><span id="t_due"></span></div></div>
      <input id="note" placeholder="ملاحظة (اختياري)" value="${esc(st.note)}" class="mb">
      <button class="btn or full lg" id="save">${ic('save', 20)} ${isS ? 'إتمام البيع' : 'حفظ فاتورة الشراء'}</button>`;
    totals();
  }
  const drawGrid = () => {
    const L = P.filter(p => matchP(p, st.q)).slice(0, 60);
    $('#grid', el).innerHTML = L.map(p => {
      const s = stockStatus(p), pr = isS ? priceFor(p, (party() || {}).group || 'wholesale', 1) : (p.prices.cost || p.avgCost || 0);
      return `<button class="pc ${isS && !(p.qty > 0) ? 'off' : ''}" data-pid="${p.id}"><div class="ph"><div class="row" style="min-width:0"><span class="av">${icon(p.category)}</span><div style="min-width:0"><div class="nm">${esc(p.name)}</div><small class="trunc" style="display:block">${esc(p.category || '')}</small></div></div><span class="bd ${s.cls}">${formatQty(p.qty, p)}</span></div><div class="pr"><b>${money(pr)} <small>${esc(co.cur)}/${esc(baseName(p))}</small></b><span class="ci sm g">${ic('plus', 18)}</span></div></button>`;
    }).join('') || '<p class="empty">لا توجد أصناف مطابقة</p>';
  };
  const onCode = code => {
    const k = bcKey(code), p = k && P.find(x => bcKey(x.barcode) === k);
    if (p) { add(p); toast('تمت إضافة ' + p.name); } else toast('باركود غير مسجل: ' + code, 'err');
  };
  ctl = { onCode };
  drawGrid(); drawCart();
  $('#sScan', el).onclick = () => scanBarcode(onCode);
  $('#scm', el).onclick = () => scanBarcode(onCode, { continuous: true });

  el.oninput = e => {
    const id = e.target.id;
    if (id === 's') { st.q = e.target.value; drawGrid(); }
    else if (id === 'disc') { st.disc = e.target.value; totals(); }
    else if (id === 'paid') { st.paid = e.target.value; totals(); }
    else if (id === 'note') st.note = e.target.value;
  };
  el.onkeydown = e => {
    if (e.key !== 'Enter' || e.target.id !== 's') return;
    e.preventDefault();
    const k = bcKey(st.q), L = P.filter(p => matchP(p, st.q)), p = (k && P.find(x => bcKey(x.barcode) === k)) || (L.length === 1 ? L[0] : null);
    if (p) { add(p); st.q = ''; e.target.value = ''; drawGrid(); } else toast('لا يوجد صنف مطابق', 'err');
  };
  el.onchange = e => {
    const t = e.target;
    if (t.id === 'party') { st.party = t.value; reprice(); drawCart(); drawGrid(); return; }
    const ln = t.closest('.ln'); if (!ln || !t.dataset.f) return;
    const l = st.cart[+ln.dataset.i], f = t.dataset.f;
    if (f === 'exp') { l.exp = t.value; return; }
    l[f] = f === 'unitIdx' ? +t.value : Math.max(0, +t.value || 0);
    if (f === 'price') l.manual = true;
    if (f === 'unitIdx') l.manual = false;
    if (!l.manual) l.price = unitPrice(l);
    drawCart();
  };
  el.onclick = async e => {
    const pc = e.target.closest('[data-pid]'); if (pc) return add(prod(+pc.dataset.pid));
    const mb = e.target.closest('[data-m]'); if (mb) { st.method = mb.dataset.m; return drawCart(); }
    const ab = e.target.closest('[data-act]');
    if (ab) {
      const i = +ab.closest('.ln').dataset.i, l = st.cart[i];
      if (ab.dataset.act === 'del') st.cart.splice(i, 1);
      else { l.qty = Math.max(0, r2(l.qty + (ab.dataset.act === 'inc' ? 1 : -1))); if (!l.manual) l.price = unitPrice(l); if (l.qty === 0) st.cart.splice(i, 1); }
      return drawCart();
    }
    if (e.target.closest('#save')) {
      if (st.saving) return; st.saving = true;
      try {
        const t = totals(), items = st.cart.filter(l => l.qty > 0);
        if (!items.length) throw new Error('الفاتورة فارغة');
        const d = { partyId: +st.party || null, items: items.map(l => ({ productId: l.productId, unitIdx: l.unitIdx, qty: l.qty, price: l.price, exp: l.exp })), discount: t.disc, paid: t.paid, method: st.method, note: st.note };
        const inv = await (isS ? createSale : createPurchase)(d);
        toast('تم حفظ الفاتورة ' + inv.no); await doc(el, kind); showInvoice(inv);
      } catch (err) { toast(err.message, 'err'); st.saving = false; }
    }
  };
  const pa = sessionStorage.getItem('preAdd');
  if (pa) { sessionStorage.removeItem('preAdd'); const p = prod(+pa); if (p) add(p); }
}

async function listPurchases(el) {
  const [all, co] = await Promise.all([getAll('invoices'), coInfo()]);
  const I = all.filter(i => i.type === 'purchase').reverse();
  const sup = [...new Map(I.filter(i => i.partyId).map(i => [i.partyId, i.partyName]))];
  el.innerHTML = head('المشتريات (الوارد)', `${I.length} فاتورة شراء`, 'truck', `<a class="btn" href="#/purchase-new">${ic('plus', 19)} فاتورة شراء جديدة</a>`, 't') +
    `<label class="mb">المورد<select id="f"><option value="">الكل</option>${sup.map(([id, n]) => `<option value="${id}">${esc(n)}</option>`).join('')}</select></label><div class="list" id="l"></div>`;
  const draw = () => {
    const f = $('#f', el).value;
    $('#l', el).innerHTML = I.filter(i => !f || String(i.partyId) === f).map(i => `<button class="it" data-id="${i.id}"><span class="av" style="background:var(--t-soft);color:var(--t)">${ic('truck', 20)}</span><div class="tx"><b>${esc(i.no)} • ${esc(i.partyName || '')}</b><small>${new Date(i.date).toLocaleDateString('en-GB')} • ${i.items.length} أصناف</small></div><div class="end"><b>${money(i.total)} ${esc(co.cur)}</b><span class="bd ${i.due > 0 ? 'warn' : 'ok'}">${i.due > 0 ? (i.paid > 0 ? 'جزئي' : 'آجلة') : 'مدفوعة'}</span></div></button>`).join('') || '<p class="empty">لا توجد فواتير شراء</p>';
  };
  draw();
  el.onchange = e => { if (e.target.id === 'f') draw(); };
  el.onclick = e => { const b = e.target.closest('.it[data-id]'); if (b) showInvoice(I.find(i => i.id == b.dataset.id)); };
}