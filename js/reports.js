import { getAll } from './db.js';
import { r2 } from './core.js';

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
  const gross = r2(sales - sret - cogs), net = r2(gross - exp - dm);
  const st = {};
  for (const i of I) {
    const sg = i.type === 'sale' ? 1 : i.type === 'sale_return' ? -1 : 0;
    if (!sg) continue;
    for (const it of i.items) {
      const o = st[it.productId] || (st[it.productId] = { id: it.productId, name: it.name, qty: 0, rev: 0, profit: 0 });
      const net = it.qty * it.price - (it.disc || 0);
      o.qty += sg * it.baseQty; o.rev += sg * net; o.profit += sg * (net - it.cost);
    }
  }
  return { sales, sret, cogs, gross, exp, dmg: dm, net, count: S.length, top: Object.values(st) };
}

export async function overview() {
  const [P, parties, cash] = await Promise.all([getAll('products'), getAll('parties'), getAll('cash')]);
  return {
    stockValue: sum(P, p => p.qty * (p.avgCost || 0)),
    recv: sum(parties.filter(x => x.type === 'customer' && x.balance > 0), x => x.balance),
    pay: sum(parties.filter(x => x.type === 'supplier' && x.balance > 0), x => x.balance),
    cash: sum(cash, c => c.dir === 'in' ? c.amount : -c.amount),
    low: P.filter(p => p.qty <= (p.minStock || 0)).sort((a, b) => a.qty - b.qty),
    products: P.length
  };
}
