import { getAll } from '../db.js';
import { esc, money, fmtDate, formatQty } from '../core.js';
import { $, sheet, closeSheet, toast, coInfo, printDoc } from '../ui.js';
import { summary, range } from '../reports.js';
import { addCash } from '../services.js';

const KINDS = { sale: 'مبيعات', purchase: 'مشتريات', payment: 'دفعة', expense: 'مصروف', income: 'إيراد آخر', sale_return: 'مرتجع مبيعات', purchase_return: 'مرتجع مشتريات' };
const CATS = ['كهرباء', 'إيجار', 'أجور عمالة', 'نثرية', 'نقل وشحن', 'صيانة', 'أخرى'];
const RANGES = `<option value="today">اليوم</option><option value="week">آخر 7 أيام</option><option value="month">هذا الشهر</option><option value="year">هذا العام</option><option value="all">الكل</option><option value="custom">فترة محددة</option>`;

export const cash = {
  title: 'الخزنة',
  async render(el) {
    const { cur } = await coInfo(), all = (await getAll('cash')).reverse();
    el.innerHTML = `<div class="grid"><div class="stat g"><small>رصيد الخزنة</small><b id="bal"></b></div><div class="stat"><small>وارد / منصرف (الفترة)</small><b id="io"></b></div></div>
      <select id="rg" style="margin-bottom:10px">${RANGES.replace('<option value="custom">فترة محددة</option>', '')}</select><div id="list" class="list"></div><button class="fab" id="add">＋</button>`;
    $('#rg', el).value = 'today';
    const bal = all.reduce((s, c) => s + (c.dir === 'in' ? c.amount : -c.amount), 0);
    const draw = () => {
      const [f, t] = range($('#rg', el).value), L = all.filter(c => c.date >= f && c.date < t);
      const i = L.filter(c => c.dir === 'in').reduce((s, c) => s + c.amount, 0), o = L.filter(c => c.dir === 'out').reduce((s, c) => s + c.amount, 0);
      $('#bal', el).textContent = `${money(bal)} ${cur}`; $('#io', el).innerHTML = `<span class="pos">${money(i)}</span> / <span class="neg">${money(o)}</span>`;
      $('#list', el).innerHTML = L.map(c => `<div class="item" style="cursor:default"><div><b>${KINDS[c.kind] || c.kind}${c.cat ? ' • ' + esc(c.cat) : ''}</b><small>${fmtDate(c.date)} ${esc(c.ref || '')} ${esc(c.note || '')}</small></div><b class="${c.dir === 'in' ? 'pos' : 'neg'}">${c.dir === 'in' ? '+' : '−'}${money(c.amount)}</b></div>`).join('') || '<p class="empty">لا توجد حركات</p>';
    };
    draw(); $('#rg', el).onchange = draw;
    $('#add', el).onclick = () => sheet(`<h3>حركة خزنة</h3><label>النوع<select id="k"><option value="expense">مصروف</option><option value="income">إيراد آخر</option></select></label>
      <label>البند<select id="c">${CATS.map(c => `<option>${c}</option>`).join('')}</select></label><label>المبلغ<input id="a" type="number" step="any" inputmode="decimal"></label><label>ملاحظة<input id="n"></label><button class="btn full" id="go">حفظ</button>`,
      b => $('#go', b).onclick = async () => {
        try { const k = $('#k', b).value; await addCash({ dir: k === 'expense' ? 'out' : 'in', kind: k, cat: $('#c', b).value, amount: $('#a', b).value, note: $('#n', b).value }); toast('تم ✓'); closeSheet(); cash.render(el); } catch (e) { toast(e.message); }
      });
  }
};

export const reports = {
  title: 'التقارير وصافي الربح',
  async render(el) {
    const co = await coInfo(), P = await getAll('products'), cur = co.cur;
    el.innerHTML = `<select id="rg" style="margin-bottom:8px">${RANGES}</select><div class="row" id="cu" style="display:none;margin-bottom:8px"><input type="date" id="a"><input type="date" id="b"></div><div id="out"></div>`;
    $('#rg', el).value = 'month';
    const draw = async () => {
      const k = $('#rg', el).value; $('#cu', el).style.display = k === 'custom' ? 'flex' : 'none';
      const s = await summary(...range(k, $('#a', el).value, $('#b', el).value)), m = n => `${money(n)} ${cur}`;
      const pn = id => P.find(p => p.id === id);
      const top = (arr, key, fmt) => arr.sort((x, y) => y[key] - x[key]).slice(0, 8).map(x => `<div class="item" style="cursor:default"><b>${esc(x.name)}</b><span>${fmt(x)}</span></div>`).join('') || '<p class="empty">لا توجد مبيعات</p>';
      $('#out', el).innerHTML = `<div class="card">
        <div class="row sb"><span>إجمالي المبيعات</span><b>${m(s.sales)}</b></div><div class="row sb"><span>− مرتجعات المبيعات</span><b>${m(s.sret)}</b></div>
        <div class="row sb"><span>− تكلفة البضاعة المباعة (COGS)</span><b>${m(s.cogs)}</b></div><div class="row sb"><span>= مجمل الربح</span><b>${m(s.gross)}</b></div>
        <div class="row sb"><span>− مصروفات تشغيلية</span><b>${m(s.exp)}</b></div><div class="row sb"><span>− تالف وعجز جرد</span><b>${m(s.dmg)}</b></div>
        <div class="row sb big"><span>صافي الربح</span><b class="${s.net >= 0 ? 'pos' : 'neg'}">${m(s.net)}</b></div></div>
        <h3>🔥 الأكثر مبيعاً</h3><div class="list">${top([...s.top], 'qty', x => { const p = pn(x.id); return p ? formatQty(x.qty, p) : x.qty; })}</div>
        <h3>💰 الأعلى ربحية</h3><div class="list">${top([...s.top], 'profit', x => m(x.profit))}</div>`;
    };
    el.onchange = draw; draw();
  }
};
