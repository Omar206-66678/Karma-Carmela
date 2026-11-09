import { getAll } from '../db.js';
import { money, esc, r2 } from '../core.js';
import { $, ic, sheet, closeSheet, sheetHead, toast, head, coInfo } from '../ui.js';
import { saveCategory, deleteCategory } from '../services.js';

export const title = 'التصنيفات';
const EMO = ['🌾', '🫒', '🍝', '🥛', '🥤', '🥫', '🧂', '🧴', '🍞', '🧀', '🥚', '🍬', '☕', '🍚', '🥩', '📦'];
export async function render(el) {
  const [C, P, co] = await Promise.all([getAll('categories'), getAll('products'), coInfo()]);
  el.innerHTML = head('التصنيفات', `${C.length} تصنيف`, 'boxes', `<button class="btn" id="add">${ic('plus', 19)} تصنيف جديد</button>`, 'p') +
    `<div class="pgrid">${C.map(c => {
      const L = P.filter(p => p.category === c.name), val = r2(L.reduce((s, p) => s + p.qty * (p.avgCost || 0), 0));
      return `<div class="pc" data-id="${c.id}"><div class="row"><span class="av" style="font-size:24px;width:52px;height:52px">${esc(c.icon || '📦')}</span><div><div class="nm">${esc(c.name)}</div><small>${L.length} صنف • مخزون ${money(val)} ${esc(co.cur)}</small></div></div>
      <div class="acts"><button class="btn out sm" data-act="edit">${ic('pencil', 17)} تعديل</button><button class="btn out sm" data-act="del" style="color:var(--r)">${ic('trash', 17)} حذف</button></div></div>`;
    }).join('') || '<p class="empty">لا توجد تصنيفات</p>'}</div>`;
  const form = c => {
    c = c || { icon: '📦' };
    sheet(`${sheetHead(c.id ? 'تعديل تصنيف' : 'تصنيف جديد')}<label>اسم التصنيف<input id="n" value="${esc(c.name || '')}"></label><label>الأيقونة<input id="i" value="${esc(c.icon || '📦')}" maxlength="4" style="font-size:24px;text-align:center"></label>
      <div class="chips" style="flex-wrap:wrap">${EMO.map(e => `<button class="chip" data-e="${e}" style="font-size:20px;padding:0 12px">${e}</button>`).join('')}</div><button class="btn full lg" id="go">حفظ</button>`,
      b => {
        b.onclick = e => { const x = e.target.closest('[data-e]'); if (x) $('#i', b).value = x.dataset.e; };
        $('#go', b).onclick = async () => { try { await saveCategory({ ...c, name: $('#n', b).value, icon: $('#i', b).value || '📦' }); toast('تم الحفظ'); closeSheet(); render(el); } catch (e) { toast(e.message, 'err'); } };
      });
  };
  $('#add', el).onclick = () => form();
  el.onclick = async e => {
    const b = e.target.closest('[data-act]'), card = e.target.closest('.pc'); if (!b || !card) return;
    const c = C.find(x => x.id == card.dataset.id);
    if (b.dataset.act === 'edit') form(c);
    else if (confirm(`حذف تصنيف «${c.name}»؟ ستنتقل أصنافه إلى «عام».`)) { await deleteCategory(c.id); toast('تم الحذف'); render(el); }
  };
}
