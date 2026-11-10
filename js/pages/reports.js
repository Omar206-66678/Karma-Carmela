import { getAll } from '../db.js';
import { esc, money, formatQty, r2, csv } from '../core.js';
import { $, ic, head, coInfo, download } from '../ui.js';
import { summary, range, daily } from '../reports.js';

export const title = 'التقارير';
const RANGES = '<option value="today">اليوم</option><option value="week">آخر 7 أيام</option><option value="month">هذا الشهر</option><option value="year">هذا العام</option><option value="all">الكل</option><option value="custom">فترة محددة</option>';
export async function render(el) {
  const [co, P, C, dy] = await Promise.all([coInfo(), getAll('products'), getAll('categories'), daily(7)]), cur = co.cur;
  el.innerHTML = head('التقارير وصافي الربح', 'تحليل المبيعات والأرباح والمخزون', 'chart', '', 'p') +
    `<select id="rg" class="mb">${RANGES}</select><div class="fieldgrid mb" id="cu" style="display:none"><input type="date" id="a"><input type="date" id="b"></div><div id="out"></div>
    <div class="card"><div class="card-h"><h2>المخزون حسب التصنيف</h2></div>${C.map(c => { const L = P.filter(p => p.category === c.name), v = r2(L.reduce((s, p) => s + p.qty * (p.avgCost || 0), 0)); return `<div class="kv"><span>${esc(c.icon || '')} ${esc(c.name)} <small>(${L.length})</small></span><b>${money(v)} ${esc(cur)}</b></div>`; }).join('') || '<p class="empty">لا توجد بيانات</p>'}</div>
    <div class="card"><div class="card-h"><h2>تصدير البيانات</h2></div><div class="fieldgrid"><button class="btn out" id="xp">${ic('download', 18)} الأصناف (CSV)</button><button class="btn out" id="xs">${ic('download', 18)} الفواتير (CSV)</button></div></div>`;
  $('#rg', el).value = 'month';
  const draw = async () => {
    const k = $('#rg', el).value; $('#cu', el).style.display = k === 'custom' ? 'grid' : 'none';
    const s = await summary(...range(k, $('#a', el).value, $('#b', el).value)), m = n => `${money(n)} ${esc(cur)}`;
    const top = (arr, key, fmt) => [...arr].sort((x, y) => y[key] - x[key]).slice(0, 8).filter(x => x[key] > 0).map((x, i) => `<div class="it" style="cursor:default"><span class="av">${i + 1}</span><div class="tx"><b class="trunc">${esc(x.name)}</b></div><b>${fmt(x)}</b></div>`).join('') || '<p class="empty">لا توجد مبيعات</p>';
    const row = (l, v, cls = '') => `<div class="kv"><span>${l}</span><b class="${cls}">${v}</b></div>`;
    $('#out', el).innerHTML = `<div class="card"><div class="card-h"><h2>قائمة الأرباح والخسائر</h2><span class="bd ${s.net >= 0 ? 'ok' : 'bad'}">${s.net >= 0 ? 'ربح' : 'خسارة'}</span></div>
      ${row('إجمالي المبيعات', m(s.sales))}${row('− مرتجعات المبيعات', m(s.sret))}${row('− تكلفة البضاعة المباعة', m(s.cogs))}${row('= مجمل الربح', m(s.gross))}${row('− مصروفات تشغيلية', m(s.exp))}${row('− تالف وعجز جرد', m(s.dmg))}
      <div class="trow big"><span>صافي الربح</span><b class="${s.net >= 0 ? 'pos' : 'neg'}">${m(s.net)}</b></div></div>
      <div class="card"><div class="card-h"><h2>المبيعات — آخر 7 أيام</h2></div><div class="bars">${(() => { const mx = Math.max(1, ...dy.map(d => d.sales)); return dy.map((d, i) => `<div class="bcol ${i === dy.length - 1 ? 'today' : ''}"><small>${d.sales ? money(d.sales) : ''}</small><span style="height:${Math.max(3, d.sales / mx * 100)}%"></span><em>${d.label}</em></div>`).join(''); })()}</div></div>
      <div class="card"><div class="card-h"><h2>الأكثر مبيعاً</h2></div><div class="list">${top(s.top, 'qty', x => { const p = P.find(q => q.id === x.id); return p ? formatQty(x.qty, p) : x.qty; })}</div></div>
      <div class="card"><div class="card-h"><h2>الأعلى ربحية</h2></div><div class="list">${top(s.top, 'profit', x => m(x.profit))}</div></div>`;
  };
  el.onchange = e => { if (['rg', 'a', 'b'].includes(e.target.id)) draw(); };
  el.onclick = async e => {
    if (e.target.closest('#xp')) download('products.csv', csv([['الاسم', 'الباركود', 'التصنيف', 'الكمية (أساسية)', 'متوسط التكلفة', 'جملة', 'قطاعي'], ...P.map(p => [p.name, p.barcode, p.category, p.qty, p.avgCost, p.prices.wholesale, p.prices.retail])]));
    if (e.target.closest('#xs')) { const I = await getAll('invoices'); download('invoices.csv', csv([['الرقم', 'النوع', 'التاريخ', 'الطرف', 'الإجمالي', 'المدفوع', 'المتبقي', 'طريقة الدفع'], ...I.map(i => [i.no, i.type, i.date, i.partyName, i.total, i.paid ?? '', i.due ?? '', i.method || ''])])); }
  };
  draw();
}