import { summary, overview, range, nearExpiry, daily } from '../reports.js';
import { getAll } from '../db.js';
import { money, esc, formatQty, fmtDay, fmtTime, r2, fmtDate } from '../core.js';
import { $, ic, coInfo, logo } from '../ui.js';
import { showInvoice } from './invoices.js';
import { scanBarcode } from '../scanner.js';

export const title = 'لوحة التحكم';
export async function render(el) {
  const co = await coInfo();
  const [o, t, mo, ex, dy, inv] = await Promise.all([overview(), summary(...range('today')), summary(...range('month')), nearExpiry(30), daily(7), getAll('invoices')]);
  const m = n => `${money(n)}<i>${esc(co.cur)}</i>`;
  const today = new Date().toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const h = new Date().getHours(), greet = h < 12 ? 'صباح الخير' : h < 18 ? 'مساء الخير' : 'مساء النور';
  const recent = inv.filter(i => i.type === 'sale').slice(-5).reverse();
  const maxS = Math.max(1, ...dy.map(d => d.sales)), weekTotal = r2(dy.reduce((s, d) => s + d.sales, 0));
  const top = [...mo.top].sort((a, b) => b.rev - a.rev).slice(0, 5), topMax = Math.max(1, ...top.map(x => x.rev));
  const kpi = (tone, icon, label, val, sub) => `<div class="kpi ${tone}"><div class="top"><span class="ci sm ${tone}">${ic(icon, 20)}</span></div><div><small>${label}</small><b>${val}</b><em>${sub}</em></div></div>`;
  const SC = [['pos', 'cart', 'الكاشير', 'o'], ['products', 'package', 'الأصناف', 'g'], ['purchases', 'truck', 'الوارد', 't'], ['invoices', 'receipt', 'الفواتير', 'b'], ['customers', 'users', 'العملاء', 'p'], ['suppliers', 'users', 'الموردون', 'a'], ['cash', 'banknote', 'الخزنة', 'g'], ['reports', 'chart', 'التقارير', 'r']];

  el.innerHTML = `
  <section class="hero">
    <div class="ht"><div><small>${greet} — ${esc(co.name)}</small><h2>ملخص اليوم</h2><small>${today}</small></div><span class="bd glass">${ic('receipt', 14)} ${t.count} فاتورة</span></div>
    <div class="big">${money(t.sales - t.sret)}<i>${esc(co.cur)}</i></div><small>صافي مبيعات اليوم</small>
    <div class="mini"><div><small>صافي الربح</small><b>${money(t.net)}</b></div><div><small>مصروفات</small><b>${money(t.exp)}</b></div><div><small>رصيد الخزنة</small><b>${money(o.cash)}</b></div></div>
    <div class="acts"><a class="btn or" href="#/pos">${ic('cart', 19)} بيع جديد</a><a class="btn glass" href="#/purchase-new">${ic('truck', 19)} وارد جديد</a><button class="btn glass" id="hs">${ic('scan', 19)} مسح</button></div>
  </section>

  <div class="grid g4">
    ${kpi('b', 'trend', 'مبيعات الشهر', m(mo.sales - mo.sret), `${mo.count} فاتورة بيع`)}
    ${kpi('g', 'wallet', 'أرباح الشهر', m(mo.net), 'بعد المصروفات والتالف')}
    ${kpi('p', 'layers', 'قيمة المخزون', m(o.stockValue), `${o.products} صنف بالتكلفة`)}
    ${kpi('o', 'banknote', 'مشتريات الشهر', m(mo.purch), 'صافي بعد المرتجعات')}
    ${kpi('t', 'users', 'مستحق لنا', m(o.recv), 'عند العملاء')}
    ${kpi('r', 'truck', 'مستحق علينا', m(o.pay), 'للموردين')}
    ${kpi('a', 'alert', 'أصناف منخفضة', `${o.low.length}<i>صنف</i>`, 'تحتاج إعادة طلب')}
    ${kpi('r', 'clock', 'قرب الانتهاء', `${ex.length}<i>دفعة</i>`, 'خلال 30 يوماً')}
  </div>

  <div class="card"><div class="card-h"><h2>اختصارات سريعة</h2></div>
    <div class="shortcuts">${SC.map(([k, i, l, tn]) => `<a class="sc" href="#/${k}"><span class="ci ${tn}">${ic(i, 24)}</span>${l}</a>`).join('')}</div></div>

  <div class="card"><div class="card-h"><h2>المبيعات — آخر 7 أيام</h2><span class="bd ok">${money(weekTotal)} ${esc(co.cur)}</span></div>
    <div class="bars">${dy.map((d, i) => `<div class="bcol ${i === dy.length - 1 ? 'today' : ''}" title="${money(d.sales)}"><small>${d.sales ? money(d.sales) : ''}</small><span style="height:${Math.max(3, d.sales / maxS * 100)}%"></span><em>${d.label}</em></div>`).join('')}</div></div>

  <div class="grid cols2">
    <div class="card"><div class="card-h"><h2>الأكثر مبيعاً هذا الشهر</h2><a href="#/reports">التقارير ${ic('chev', 16)}</a></div>
      ${top.length ? top.map((x, i) => `<div style="margin-bottom:12px"><div class="row sb"><b>${i + 1}. ${esc(x.name)}</b><small>${money(x.rev)} ${esc(co.cur)}</small></div><div class="prog"><i style="width:${x.rev / topMax * 100}%"></i></div></div>`).join('') : '<p class="empty">لا توجد مبيعات بعد</p>'}</div>
    <div class="card"><div class="card-h"><h2>تنبيهات المخزون</h2><a href="#/products">الأصناف ${ic('chev', 16)}</a></div>
      <div class="list">${o.low.slice(0, 5).map(p => `<div class="it" style="cursor:default"><span class="av" style="background:var(--a-soft);color:var(--a)">${ic('alert', 20)}</span><div class="tx"><b class="trunc">${esc(p.name)}</b><small>حد التنبيه ${p.minStock || 0}</small></div><span class="bd ${p.qty > 0 ? 'warn' : 'bad'}">${formatQty(p.qty, p)}</span></div>`).join('')}
      ${ex.slice(0, 4).map(x => `<div class="it" style="cursor:default"><span class="av" style="background:var(--r-soft);color:var(--r)">${ic('clock', 20)}</span><div class="tx"><b class="trunc">${esc(x.p.name)}</b><small>ينتهي ${esc(x.exp)}</small></div><span class="bd ${x.expired ? 'bad' : 'warn'}">${x.expired ? 'منتهي' : 'قريباً'}</span></div>`).join('')}</div>
      ${!o.low.length && !ex.length ? '<p class="empty">لا توجد تنبيهات — كل شيء تمام</p>' : ''}</div>
  </div>

  <div class="card"><div class="card-h"><h2>أحدث فواتير البيع</h2><a href="#/invoices">الكل ${ic('chev', 16)}</a></div>
    <div class="list">${recent.map(i => `<button class="it" data-inv="${i.id}"><span class="av">${ic('receipt', 20)}</span><div class="tx"><b>${esc(i.no)} • ${esc(i.partyName || '')}</b><small>${fmtDate(i.date)} • ${esc(i.method || 'كاش')}</small></div><div class="end"><b>${money(i.total)} ${esc(co.cur)}</b>${i.due > 0 ? '<span class="bd warn">آجل</span>' : '<span class="bd ok">مدفوعة</span>'}</div></button>`).join('') || '<p class="empty">لا توجد فواتير بعد — ابدأ أول عملية بيع</p>'}</div></div>`;

  el.onclick = e => {
    const b = e.target.closest('[data-inv]'); if (b) return showInvoice(inv.find(i => i.id == b.dataset.inv));
    if (e.target.closest('#hs')) scanBarcode(code => { sessionStorage.setItem('preQ', code); location.hash = '#/products'; });
  };
}