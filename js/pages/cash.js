import { getAll } from '../db.js';
import { esc, money, fmtDate } from '../core.js';
import { $, ic, sheet, closeSheet, sheetHead, toast, head, coInfo } from '../ui.js';
import { range } from '../reports.js';
import { addCash } from '../services.js';

export const title = 'الخزنة';
const KINDS = { sale: 'مبيعات', purchase: 'مشتريات', payment: 'دفعة', expense: 'مصروف', income: 'إيراد آخر', sale_return: 'مرتجع مبيعات', purchase_return: 'مرتجع مشتريات' };
const CATS = ['كهرباء', 'إيجار', 'أجور عمالة', 'نثرية', 'نقل وشحن', 'صيانة', 'أخرى'];
const METH = ['كاش', 'انستاباي', 'فودافون كاش'];

export async function render(el) {
  const [co, all0] = await Promise.all([coInfo(), getAll('cash')]), all = [...all0].reverse();
  const bal = all.reduce((s, c) => s + (c.dir === 'in' ? c.amount : -c.amount), 0);
  el.innerHTML = head('الخزنة والمصروفات', 'حركات النقدية الواردة والمنصرفة', 'banknote', `<button class="btn" id="add">${ic('plus', 19)} حركة جديدة</button>`, 'g') +
    `<div class="grid g3"><div class="kpi"><div class="top"><span class="ci sm g">${ic('wallet', 20)}</span></div><div><small>رصيد الخزنة</small><b>${money(bal)}<i>${esc(co.cur)}</i></b></div></div>
    <div class="kpi b"><div class="top"><span class="ci sm b">${ic('download', 20)}</span></div><div><small>وارد الفترة</small><b class="pos" id="i">0</b></div></div>
    <div class="kpi r"><div class="top"><span class="ci sm r">${ic('upload', 20)}</span></div><div><small>منصرف الفترة</small><b class="neg" id="o">0</b></div></div></div>
    <label class="mb">الفترة<select id="rg"><option value="today">اليوم</option><option value="week">آخر 7 أيام</option><option value="month">هذا الشهر</option><option value="year">هذا العام</option><option value="all">الكل</option></select></label><div class="list" id="l"></div>`;
  const draw = () => {
    const [f, t] = range($('#rg', el).value), L = all.filter(c => c.date >= f && c.date < t);
    const i = L.filter(c => c.dir === 'in').reduce((s, c) => s + c.amount, 0), o = L.filter(c => c.dir === 'out').reduce((s, c) => s + c.amount, 0);
    $('#i', el).textContent = money(i); $('#o', el).textContent = money(o);
    $('#l', el).innerHTML = L.slice(0, 300).map(c => `<div class="it" style="cursor:default"><span class="av" style="${c.dir === 'in' ? '' : 'background:var(--r-soft);color:var(--r)'}">${ic(c.dir === 'in' ? 'download' : 'upload', 20)}</span><div class="tx"><b>${KINDS[c.kind] || c.kind}${c.cat ? ' • ' + esc(c.cat) : ''}</b><small>${fmtDate(c.date)} ${esc(c.ref || '')} ${esc(c.note || '')}${c.method ? ' • ' + esc(c.method) : ''}</small></div><b class="${c.dir === 'in' ? 'pos' : 'neg'}">${c.dir === 'in' ? '+' : '−'}${money(c.amount)}</b></div>`).join('') || '<p class="empty">لا توجد حركات</p>';
  };
  $('#rg', el).value = 'month'; draw(); $('#rg', el).onchange = draw;
  $('#add', el).onclick = () => sheet(`${sheetHead('حركة خزنة')}<label>النوع<select id="k"><option value="expense">مصروف</option><option value="income">إيراد آخر</option></select></label>
    <label>البند<select id="c">${CATS.map(c => `<option>${c}</option>`).join('')}</select></label><label>المبلغ<input id="a" type="number" step="any" inputmode="decimal"></label><label>طريقة الدفع<select id="m">${METH.map(c => `<option>${c}</option>`).join('')}</select></label><label>ملاحظة<input id="n"></label><button class="btn full lg" id="go">${ic('save', 20)} حفظ</button>`,
    b => $('#go', b).onclick = async () => {
      try { const k = $('#k', b).value; await addCash({ dir: k === 'expense' ? 'out' : 'in', kind: k, cat: $('#c', b).value, amount: $('#a', b).value, note: $('#n', b).value, method: $('#m', b).value }); toast('تم الحفظ'); closeSheet(); render(el); } catch (e) { toast(e.message, 'err'); }
    });
}