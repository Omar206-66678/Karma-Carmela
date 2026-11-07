import { summary, overview, range } from '../reports.js';
import { money, esc, formatQty } from '../core.js';
import { setting } from '../db.js';
export const title = 'الرئيسية';
export async function render(el) {
  const cur = await setting('currency', 'ج.م');
  const [o, t] = await Promise.all([overview(), summary(...range('today'))]);
  const m = n => `${money(n)} <small style="display:inline">${cur}</small>`;
  el.innerHTML = `<div class="grid">
    <div class="stat g"><small>رصيد الخزنة</small><b>${m(o.cash)}</b></div>
    <div class="stat p"><small>مبيعات اليوم (${t.count} فاتورة)</small><b>${m(t.sales - t.sret)}</b></div>
    <div class="stat ${t.net >= 0 ? 'g' : 'r'}"><small>صافي ربح اليوم</small><b>${m(t.net)}</b></div>
    <div class="stat"><small>قيمة المخزون (بالتكلفة)</small><b>${m(o.stockValue)}</b></div>
    <div class="stat o"><small>مستحق لنا عند العملاء</small><b>${m(o.recv)}</b></div>
    <div class="stat r"><small>مستحق علينا للموردين</small><b>${m(o.pay)}</b></div></div>
    <div class="row" style="margin-bottom:10px"><a class="btn full" style="text-align:center;text-decoration:none" href="#/sale">🛒 بيع جديد</a><a class="btn alt full" style="text-align:center;text-decoration:none" href="#/purchase">📥 وارد جديد</a></div>
    <h3>⚠️ أصناف قاربت على النفاد (${o.low.length})</h3>
    <div class="list">${o.low.slice(0, 10).map(p => `<div class="item"><b>${esc(p.name)}</b><span class="badge warn">${formatQty(p.qty, p)}</span></div>`).join('') || '<p class="empty">لا توجد تنبيهات 👍</p>'}</div>`;
  $('#net').textContent = o.products + ' صنف';
}
