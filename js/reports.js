import { getAll } from './db.js';
import { r2, dayKey } from './core.js';

export function range(k, a, b) {
  const s = new Date(); s.setHours(0, 0, 0, 0);
  let f = new Date(s), t = new Date(s);
  if (k === 'today') t.setDate(t.getDate() + 1);
  else if (k === 'week') { f.setDate(f.getDate() - 6); t.setDate(t.getDate() + 1); }
  else if (k === 'month') { f.setDate(1); t = new Date(f.getFullYear(), f.getMonth() + 1, 1); }
  else if (k === 'year') { f = new Date(f.getFullYear(), 0, 1); t = new Date(f.getFullYear() + 1, 0, 1); }
  else if (k === 'custom' && a && b) { f = new Date(a + 'T00:00'); t = new Date(b + 'T00:00'); t.setDate(t.getDate() + 1); }
  else { f = new Date(0); t = new Date(8.64e15); }
  return [f.toISOString(), t.toISOString()];
}
const inR = (d, f, t) => d >= f && d < t;
const sum = (a, fn) => r2(a.reduce((s, x) => s + fn(x), 0));

/** صافي الربح = المبيعات − المرتجعات − تكلفة البضاعة المباعة − المصروفات − التالف */
export async function summary(from, to) {
  const [inv, cash, dmg] = await Promise.all([getAll('invoices'), getAll('cash'), getAll('damages')]);
  const I = inv.filter(i => inR(i.date, from, to));
  const S = I.filter(i => i.type === 'sale'), R = I.filter(i => i.type === 'sale_return');
  const sales = sum(S, i => i.total), sret = sum(R, i => i.total);
  const cogs = r2(sum(S, i => i.cogs) - sum(R, i => i.cogs));
  const exp = sum(cash.filter(c => c.kind === 'expense' && inR(c.date, from, to)), c => c.amount);
  const dm = sum(dmg.filter(d => inR(d.date, from, to)), d => d.cost);
  const purch = r2(sum(I.filter(i => i.type === 'purchase'), i => i.total) - sum(I.filter(i => i.type === 'purchase_return'), i => i.total));
  const gross = r2(sales - sret - cogs), net = r2(gross - exp - dm);
  const st = {};
  for (const i of I) {
    const sg = i.type === 'sale' ? 1 : i.type === 'sale_return' ? -1 : 0;
    if (!sg) continue;
    for (const it of i.items) {
      const o = st[it.productId] || (st[it.productId] = { id: it.productId, name: it.name, qty: 0, rev: 0, profit: 0 });
      const n = it.qty * it.price - (it.disc || 0);
      o.qty += sg * it.baseQty; o.rev += sg * n; o.profit += sg * (n - it.cost);
    }
  }
  return { sales, sret, cogs, gross, exp, dmg: dm, net, purch, count: S.length, top: Object.values(st) };
}
export async function overview() {
  const [P, parties, cash] = await Promise.all([getAll('products'), getAll('parties'), getAll('cash')]);
  return {
    stockValue: sum(P, p => p.qty * (p.avgCost || 0)),
    recv: sum(parties.filter(x => x.type === 'customer' && x.balance > 0), x => x.balance),
    pay: sum(parties.filter(x => x.type === 'supplier' && x.balance > 0), x => x.balance),
    cash: sum(cash, c => c.dir === 'in' ? c.amount : -c.amount),
    low: P.filter(p => p.qty <= (p.minStock || 0)).sort((a, b) => a.qty - b.qty),
    products: P.length, P
  };
}
/** مبيعات وأرباح آخر n يوم */
export async function daily(n = 7) {
  const inv = await getAll('invoices'), out = [], map = {};
  for (let k = n - 1; k >= 0; k--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - k);
    const key = dayKey(d); map[key] = { key, label: d.toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'short' }), sales: 0, profit: 0 }; out.push(map[key]);
  }
  for (const i of inv) {
    const o = map[dayKey(i.date)]; if (!o) continue;
    if (i.type === 'sale') { o.sales += i.total; o.profit += i.total - i.cogs; }
    else if (i.type === 'sale_return') { o.sales -= i.total; o.profit -= i.total - i.cogs; }
  }
  out.forEach(o => { o.sales = r2(o.sales); o.profit = r2(o.profit); });
  return out;
}
/** دفعات قاربت على الانتهاء (أو منتهية) */
export async function nearExpiry(days = 30) {
  const [B, P] = await Promise.all([getAll('batches'), getAll('products')]);
  const lim = new Date(); lim.setDate(lim.getDate() + days); const L = dayKey(lim), today = dayKey(new Date());
  return B.filter(b => b.left > 0 && b.exp && b.exp <= L).map(b => ({ p: P.find(p => p.id === b.productId), exp: b.exp, left: b.left, expired: b.exp < today }))
    .filter(x => x.p).sort((a, b) => a.exp < b.exp ? -1 : 1);
}