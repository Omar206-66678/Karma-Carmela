// منطق الأعمال — كل عملية = معاملة ذرية واحدة (مخزون + دفعات + فواتير + حسابات + خزنة)
import { tx, ALL } from './db.js';
import { r2, r3, r4, unitsOf } from './core.js';

const now = () => new Date().toISOString();
const PRE = { sale: 'S', purchase: 'P', sale_return: 'SR', purchase_return: 'PR' };
async function nextNo(S, t) {
  const k = 'no_' + t, r = await S.settings.get(k), n = (r ? r.value : 0) + 1;
  await S.settings.put({ key: k, value: n });
  return PRE[t] + String(n).padStart(5, '0');
}
const costing = async S => { const r = await S.settings.get('costing'); return r ? r.value : 'wac'; }; // 'fifo' | 'wac'

/** توزيع خصم الفاتورة على البنود بالتناسب مع قيمة كل بند (آخر بند يأخذ الباقي لضمان تطابق المجموع) */
export function allocate(lines, discount) {
  const sub = lines.reduce((s, x) => s + x, 0);
  if (!(discount > 0) || !(sub > 0)) return lines.map(() => 0);
  let left = discount;
  return lines.map((x, i) => {
    if (i === lines.length - 1) return r2(left);
    const s = r2(discount * x / sub); left = r2(left - s); return s;
  });
}

// حركة حساب عميل/مورد: الرصيد الموجب = عميل عليه فلوس / مورد له فلوس
async function ledger(S, party, type, ref, change, note = '') {
  party.balance = r2((party.balance || 0) + change);
  await S.parties.put(party);
  await S.ledger.add({ partyId: party.id, date: now(), type, ref, change: r2(change), balance: party.balance, note });
}
const cashMove = (S, dir, amount, kind, ref, note = '', cat = '') =>
  amount > 0 ? S.cash.add({ date: now(), dir, amount: r2(amount), kind, ref, note, cat }) : null;
const move = (S, productId, qty, reason, ref = '') => S.moves.add({ date: now(), productId, qty, reason, ref });

/** استهلاك دفعات FIFO — يرجع التكلفة بالطريقتين (FIFO والمتوسط المرجح) */
async function consume(S, p, base) {
  const layers = (await S.batches.idx('productId', p.id)).filter(b => b.left > 0).sort((a, b) => a.id - b.id);
  let need = base, fifo = 0;
  for (const b of layers) {
    if (need <= 0) break;
    const t = Math.min(b.left, need);
    b.left = r3(b.left - t); need = r3(need - t); fifo += t * b.cost;
    await S.batches.put(b);
  }
  if (need > 0) fifo += need * (p.avgCost || 0);
  return { fifo, wac: base * (p.avgCost || 0) };
}
/** إضافة دفعة جديدة للمخزن وتحديث المتوسط المرجح */
async function addLayer(S, p, base, cost, ref) {
  await S.batches.add({ productId: p.id, left: base, cost, date: now(), ref });
  const tot = p.qty + base;
  p.avgCost = tot > 0 ? r4((p.qty * (p.avgCost || 0) + base * cost) / tot) : cost;
  p.qty = r3(tot);
  await S.products.put(p);
}
/** مرتجع مشتريات: يسحب الكمية من دفعات نفس الفاتورة أولاً ثم الأقدم، ويعدّل المتوسط بتكلفة الشراء الأصلية */
async function takeBack(S, p, base, ref, unitCost) {
  const layers = (await S.batches.idx('productId', p.id)).filter(b => b.left > 0)
    .sort((a, b) => ((b.ref === ref) - (a.ref === ref)) || a.id - b.id);
  let need = base;
  for (const b of layers) {
    if (need <= 0) break;
    const t = Math.min(b.left, need);
    b.left = r3(b.left - t); need = r3(need - t);
    await S.batches.put(b);
  }
  const rest = r3(p.qty - base);
  if (rest > 0) p.avgCost = Math.max(0, r4((p.qty * (p.avgCost || 0) - base * unitCost) / rest));
  p.qty = rest;
  await S.products.put(p);
}

export const saveProduct = (p, opening = 0, openingCost = 0) => tx(ALL, async S => {
  if (p.barcode) {
    const dup = (await S.products.idx('barcode', p.barcode)).find(x => x.id !== p.id);
    if (dup) throw new Error('الباركود مستخدم لصنف آخر: ' + dup.name);
  }
  const isNew = !p.id;
  if (isNew) { delete p.id; p.qty = 0; p.avgCost = openingCost || p.prices.cost || 0; }
  p.id = await S.products.put(p);
  if (isNew && opening > 0) {
    const q = await S.products.get(p.id);
    await addLayer(S, q, opening, openingCost || p.prices.cost || 0, 'opening');
    await move(S, p.id, opening, 'opening');
  }
  return p;
});

export const createSale = d => tx(ALL, async S => {
  const m = await costing(S), no = await nextNo(S, 'sale');
  const party = d.partyId ? await S.parties.get(d.partyId) : null;
  let sub = 0, cogs = 0; const items = [];
  for (const it of d.items) {
    const p = await S.products.get(it.productId);
    const u = unitsOf(p)[it.unitIdx] || unitsOf(p)[0];
    const base = r3(it.qty * u.factor);
    if (!(base > 0)) throw new Error('كمية غير صحيحة: ' + p.name);
    if (p.qty + 1e-9 < base) throw new Error('المخزون غير كافٍ: ' + p.name);
    const c = await consume(S, p, base), cost = r2(m === 'fifo' ? c.fifo : c.wac);
    p.qty = r3(p.qty - base); await S.products.put(p);
    await move(S, p.id, -base, 'sale', no);
    sub += it.qty * it.price; cogs += cost;
    items.push({ productId: p.id, name: p.name, unit: u.name, factor: u.factor, qty: it.qty, price: it.price, baseQty: base, cost, disc: 0, returned: 0 });
  }
  sub = r2(sub);
  const discount = r2(d.discount || 0), total = r2(sub - discount);
  if (discount < 0) throw new Error('خصم غير صحيح');
  if (total < 0) throw new Error('الخصم أكبر من الإجمالي');
  allocate(items.map(i => i.qty * i.price), discount).forEach((s, i) => items[i].disc = s);
  const paid = r2(d.paid == null ? total : d.paid), due = r2(total - paid);
  if (paid < 0 || due < -0.005) throw new Error('المدفوع أكبر من الإجمالي');
  if (due > 0.005 && !party) throw new Error('اختر عميلاً للبيع الآجل');
  if (party && party.creditLimit > 0 && (party.balance || 0) + due > party.creditLimit) throw new Error('تجاوز حد الائتمان للعميل');
  const inv = { no, type: 'sale', date: now(), partyId: party ? party.id : null, partyName: party ? party.name : 'عميل نقدي', items, subtotal: sub, discount, total, paid, due, cogs: r2(cogs), costing: m, note: d.note || '' };
  inv.id = await S.invoices.add(inv);
  if (party) { await ledger(S, party, 'sale', no, total); if (paid > 0) await ledger(S, party, 'payment', no, -paid, 'دفعة مع الفاتورة'); }
  await cashMove(S, 'in', paid, 'sale', no);
  return inv;
});

export const createPurchase = d => tx(ALL, async S => {
  const no = await nextNo(S, 'purchase');
  const party = d.partyId ? await S.parties.get(d.partyId) : null;
  // المرحلة 1: التحقق وحساب البنود
  const rows = []; let sub = 0;
  for (const it of d.items) {
    const p = await S.products.get(it.productId);
    const u = unitsOf(p)[it.unitIdx] || unitsOf(p)[0];
    const base = r3(it.qty * u.factor);
    if (!(base > 0)) throw new Error('كمية غير صحيحة: ' + p.name);
    if (!(it.price >= 0)) throw new Error('سعر غير صحيح: ' + p.name);
    const line = r2(it.qty * it.price);
    rows.push({ it, name: p.name, u, base, line }); sub += line;
  }
  sub = r2(sub);
  const discount = r2(d.discount || 0);
  if (discount < 0 || discount > sub) throw new Error('الخصم أكبر من الإجمالي');
  const total = r2(sub - discount), shares = allocate(rows.map(r => r.line), discount);
  // المرحلة 2: إنشاء الدفعات بتكلفة صافية بعد الخصم
  const items = [];
  for (let i = 0; i < rows.length; i++) {
    const { it, name, u, base, line } = rows[i];
    const net = r2(line - shares[i]), cb = r4(net / base);
    const p = await S.products.get(it.productId);
    await addLayer(S, p, base, cb, no);
    p.prices.cost = cb; await S.products.put(p);
    await move(S, p.id, base, 'purchase', no);
    items.push({ productId: p.id, name, unit: u.name, factor: u.factor, qty: it.qty, price: it.price, baseQty: base, cost: net, disc: shares[i], returned: 0 });
  }
  const paid = r2(d.paid == null ? total : d.paid), due = r2(total - paid);
  if (paid < 0 || due < -0.005) throw new Error('المدفوع أكبر من الإجمالي');
  if (due > 0.005 && !party) throw new Error('اختر مورداً للشراء الآجل');
  const inv = { no, type: 'purchase', date: now(), partyId: party ? party.id : null, partyName: party ? party.name : 'مورد نقدي', items, subtotal: sub, discount, total, paid, due, note: d.note || '' };
  inv.id = await S.invoices.add(inv);
  if (party) { await ledger(S, party, 'purchase', no, total); if (paid > 0) await ledger(S, party, 'payment', no, -paid, 'دفعة مع الفاتورة'); }
  await cashMove(S, 'out', paid, 'purchase', no);
  return inv;
});

/** مرتجع مبيعات/مشتريات — المبلغ المردود صافٍ بعد نصيب الصنف من الخصم، السليم يرجع بتكلفته الأصلية، التالف خسارة */
export const returnDoc = (kind, invId, lines, mode) => tx(ALL, async S => {
  const inv = await S.invoices.get(invId);
  if (!inv) throw new Error('الفاتورة غير موجودة');
  const party = inv.partyId ? await S.parties.get(inv.partyId) : null;
  const no = await nextNo(S, kind + '_return');
  const items = []; let gross = 0, disc = 0, cogs = 0;
  for (const L of lines) {
    if (!(L.qty > 0)) continue;
    const it = inv.items[L.idx];
    if (!it) throw new Error('بند غير موجود');
    if (L.qty > r3(it.qty - it.returned) + 1e-9) throw new Error('كمية المرتجع أكبر من المتاحة: ' + it.name);
    const base = r3(L.qty * it.factor), p = await S.products.get(it.productId);
    const unitCost = it.cost / it.baseQty;
    const share = it.qty > 0 ? r2((it.disc || 0) * L.qty / it.qty) : 0;
    if (kind === 'sale') {
      if (L.cond === 'damaged') await S.damages.add({ date: now(), productId: p.id, name: p.name, qty: base, cost: r2(unitCost * base), reason: 'مرتجع تالف', ref: no });
      else await addLayer(S, p, base, r4(unitCost), no);
      await move(S, p.id, L.cond === 'damaged' ? 0 : base, 'sale_return', no);
    } else {
      if (p.qty + 1e-9 < base) throw new Error('المخزون أقل من كمية المرتجع: ' + p.name);
      await takeBack(S, p, base, inv.no, unitCost);
      await move(S, p.id, -base, 'purchase_return', no);
    }
    it.returned = r3(it.returned + L.qty);
    cogs += unitCost * base; gross += L.qty * it.price; disc += share;
    items.push({ productId: p.id, name: p.name, unit: it.unit, factor: it.factor, qty: L.qty, price: it.price, baseQty: base, cost: r2(unitCost * base), disc: share, cond: L.cond });
  }
  if (!items.length) throw new Error('حدد كمية المرتجع');
  gross = r2(gross); disc = r2(disc);
  const total = r2(gross - disc);
  if (mode === 'credit' && !party) throw new Error('لا يوجد طرف لتسوية الحساب');
  await S.invoices.put(inv);
  const ret = { no, type: kind + '_return', date: now(), ref: inv.no, partyId: inv.partyId, partyName: inv.partyName, items, subtotal: gross, discount: disc, total, cogs: r2(cogs), mode };
  ret.id = await S.invoices.add(ret);
  if (mode === 'credit') await ledger(S, party, kind + '_return', no, -total);
  else await cashMove(S, kind === 'sale' ? 'out' : 'in', total, kind + '_return', no);
  return ret;
});

export const damage = d => tx(ALL, async S => {
  const m = await costing(S), p = await S.products.get(d.productId);
  const u = unitsOf(p)[d.unitIdx || 0], base = r3(d.qty * u.factor);
  if (!(base > 0)) throw new Error('كمية غير صحيحة');
  if (p.qty + 1e-9 < base) throw new Error('المخزون غير كافٍ');
  const c = await consume(S, p, base);
  p.qty = r3(p.qty - base); await S.products.put(p);
  await S.damages.add({ date: now(), productId: p.id, name: p.name, qty: base, cost: r2(m === 'fifo' ? c.fifo : c.wac), reason: d.reason || 'تالف' });
  await move(S, p.id, -base, 'damage');
});

export const adjustStock = (id, newBase) => tx(ALL, async S => {
  const m = await costing(S), p = await S.products.get(id), diff = r3(newBase - p.qty);
  if (diff > 0) await addLayer(S, p, diff, p.avgCost || 0, 'adjust');
  else if (diff < 0) {
    const c = await consume(S, p, -diff);
    p.qty = r3(newBase); await S.products.put(p);
    await S.damages.add({ date: now(), productId: p.id, name: p.name, qty: -diff, cost: r2(m === 'fifo' ? c.fifo : c.wac), reason: 'عجز جرد' });
  }
  if (diff) await move(S, id, diff, 'adjust');
});

export const payParty = (partyId, amount, note = '') => tx(ALL, async S => {
  const p = await S.parties.get(partyId); amount = r2(amount);
  if (!(amount > 0)) throw new Error('مبلغ غير صحيح');
  await ledger(S, p, 'payment', '', -amount, note);
  await cashMove(S, p.type === 'customer' ? 'in' : 'out', amount, 'payment', '', (note + ' ' + p.name).trim());
});

export const addCash = d => tx(ALL, async S => {
  if (!(+d.amount > 0)) throw new Error('مبلغ غير صحيح');
  await cashMove(S, d.dir, +d.amount, d.kind, '', d.note, d.cat);
});
