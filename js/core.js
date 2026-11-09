import { overview, summary, range } from '../reports.js';
import { getAll } from '../db.js';
import { money, esc } from '../core.js';
import { ic, head, coInfo } from '../ui.js';

export const title = 'المزيد';
export async function render(el) {
  const [co, o, mo, parties] = await Promise.all([coInfo(), overview(), summary(...range('month')), getAll('parties')]);
  const C = parties.filter(p => p.type === 'customer'), S = parties.filter(p => p.type === 'supplier');
  const m = n => `${money(n)} ${esc(co.cur)}`;
  const cards = [
    ['customers', 'users', 'b', 'العملاء', 'حسابات العملاء والمديونيات وكشوف الحساب', `${C.length} عميل`, `مستحق لنا ${m(o.recv)}`],
    ['suppliers', 'truck', 'a', 'الموردون', 'حسابات الموردين والمستحقات والدفعات', `${S.length} مورد`, `مستحق علينا ${m(o.pay)}`],
    ['cash', 'banknote', 'g', 'الخزنة والمصروفات', 'حركة النقدية والمصروفات اليومية والإيرادات', 'رصيد الخزنة', m(o.cash)],
    ['reports', 'chart', 'p', 'التقارير وصافي الربح', 'المبيعات والأرباح والأكثر مبيعاً وتصدير البيانات', 'صافي ربح الشهر', m(mo.net)],
    ['settings', 'gear', 't', 'الإعدادات والنسخ الاحتياطي', 'بيانات المنشأة والفواتير وتصدير واسترجاع النسخ', 'النسخ الاحتياطي', 'صدّر نسخة بشكل دوري']
  ];
  const extra = [['categories', 'boxes', 'التصنيفات', 'p'], ['invoices', 'receipt', 'سجل الفواتير', 'b'], ['purchases', 'truck', 'المشتريات', 't']];
  el.innerHTML = head('المزيد', 'الحسابات والتقارير والإعدادات', 'menu', '', 'g') +
    `<div class="mgrid">${cards.map(([k, i, tn, t, d, l, v]) => `<a class="mcard ${tn}" href="#/${k}"><div class="mc-top"><span class="ci ${tn}">${ic(i, 26)}</span>${ic('chev', 20, 'ch')}</div><h3>${t}</h3><p>${d}</p><div class="mc-ft"><small>${l}</small><b>${v}</b></div></a>`).join('')}</div>
    <div class="card"><div class="card-h"><h2>اختصارات أخرى</h2></div><div class="shortcuts" style="grid-template-columns:repeat(3,1fr)">${extra.map(([k, i, l, tn]) => `<a class="sc" href="#/${k}"><span class="ci ${tn}">${ic(i, 24)}</span>${l}</a>`).join('')}</div></div>`;
}
