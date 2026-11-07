import { getAll } from '../db.js';
import { esc, money, formatQty, unitsOf, baseName, parseUnits, parseTiers, unitsText, tiersText, r2 } from '../core.js';
import { sheet, closeSheet, toast, scan, $ } from '../ui.js';
import { saveProduct, damage, adjustStock } from '../services.js';
export const title = 'الأصناف';
const refresh = () => render($('#view'));
const v = id => $('#' + id).value.trim();

export async function render(el) {
  const P = await getAll('products');
  el.innerHTML = `<input id="s" class="search" placeholder="بحث بالاسم / الباركود / التصنيف"><div id="list" class="list"></div><button class="fab" id="add">＋</button>`;
  const draw = () => {
    const q = $('#s', el).value.trim().toLowerCase();
    $('#list', el).innerHTML = P.filter(p => !q || [p.name, p.barcode, p.category].join(' ').toLowerCase().includes(q)).map(p =>
      `<div class="item" data-id="${p.id}"><div><b>${esc(p.name)}</b><small>${esc(p.category || '')}${p.barcode ? ' • ' + esc(p.barcode) : ''}</small></div>
      <div class="end"><span class="badge ${p.qty <= (p.minStock || 0) ? 'warn' : ''}">${formatQty(p.qty, p)}</span><small>جملة ${money(p.prices.wholesale)}</small></div></div>`).join('') || '<p class="empty">لا توجد أصناف — اضغط ＋ للإضافة</p>';
  };
  draw();
  $('#s', el).oninput = draw;
  $('#add', el).onclick = () => form();
  $('#list', el).onclick = e => { const it = e.target.closest('.item'); if (it) detail(P.find(p => p.id == it.dataset.id)); };
}

function detail(p) {
  const pr = p.prices;
  sheet(`<h3>${esc(p.name)}</h3>
    <div class="card"><div class="row sb"><span>المخزون</span><b>${formatQty(p.qty, p)}</b></div>
    <div class="row sb"><span>متوسط التكلفة (لكل ${esc(baseName(p))})</span><b>${money(p.avgCost)}</b></div>
    <div class="row sb"><span>تكلفة / جملة / نصف / قطاعي</span><b>${money(pr.cost)} / ${money(pr.wholesale)} / ${money(pr.semi)} / ${money(pr.retail)}</b></div>
    <div class="row sb"><span>الحد الأدنى</span><b>${p.minStock || 0}</b></div></div>
    <div class="row"><button class="btn full" id="ed">✏️ تعديل</button><button class="btn alt full" id="dm">🗑 تالف</button><button class="btn alt full" id="ad">📋 جرد</button></div>`,
    b => {
      $('#ed', b).onclick = () => form(p);
      $('#dm', b).onclick = () => dmg(p);
      $('#ad', b).onclick = () => adj(p);
    });
}

function form(p) {
  const n = !p; p = p || { prices: {}, units: [] };
  sheet(`<h3>${n ? 'صنف جديد' : 'تعديل صنف'}</h3>
    <label>اسم الصنف<input id="f_name" value="${esc(p.name || '')}"></label>
    <label>الباركود<div class="row"><input id="f_bc" inputmode="numeric" value="${esc(p.barcode || '')}"><button class="btn ic" id="f_sc" type="button">📷</button></div></label>
    <label>التصنيف<input id="f_cat" value="${esc(p.category || '')}" placeholder="مثال: زيوت، أرز، سكر"></label>
    <label>الوحدة الأساسية (أصغر وحدة)<input id="f_base" value="${esc(p.id ? baseName(p) : 'قطعة')}" placeholder="قطعة / كيلو"></label>
    <label>وحدات أكبر (اسم=عدد الوحدات الأساسية)<input id="f_units" value="${esc(p.id ? unitsText(p) : '')}" placeholder="كرتونة=24, دستة=12"></label>
    <b>الأسعار (لكل وحدة أساسية)</b>
    <div class="row"><label style="flex:1">تكلفة<input id="f_cost" type="number" step="any" inputmode="decimal" value="${p.prices.cost || ''}"></label><label style="flex:1">جملة<input id="f_wh" type="number" step="any" inputmode="decimal" value="${p.prices.wholesale || ''}"></label></div>
    <div class="row"><label style="flex:1">نصف جملة<input id="f_semi" type="number" step="any" inputmode="decimal" value="${p.prices.semi || ''}"></label><label style="flex:1">قطاعي<input id="f_rt" type="number" step="any" inputmode="decimal" value="${p.prices.retail || ''}"></label></div>
    <label>شرائح الكمية (من كمية=سعر الوحدة الأساسية)<input id="f_tiers" value="${esc(tiersText(p))}" placeholder="48=4.5, 240=4.2"></label>
    <label>حد التنبيه (بالوحدة الأساسية)<input id="f_min" type="number" step="any" inputmode="decimal" value="${p.minStock || ''}"></label>
    ${n ? `<div class="row"><label style="flex:1">رصيد افتتاحي<input id="f_open" type="number" step="any" inputmode="decimal"></label><label style="flex:1">تكلفة الرصيد (للوحدة الأساسية)<input id="f_ocost" type="number" step="any" inputmode="decimal"></label></div>` : ''}
    <button class="btn full" id="f_save">حفظ</button>`,
    b => {
      $('#f_sc', b).onclick = () => scan(c => $('#f_bc', b).value = c);
      $('#f_save', b).onclick = async () => {
        try {
          if (!v('f_name')) throw new Error('اكتب اسم الصنف');
          const base = v('f_base') || 'قطعة';
          const np = { ...p, name: v('f_name'), barcode: v('f_bc'), category: v('f_cat'), baseUnit: base, units: parseUnits(v('f_units'), base), minStock: +v('f_min') || 0, tiers: parseTiers(v('f_tiers')),
            prices: { cost: +v('f_cost') || 0, wholesale: +v('f_wh') || 0, semi: +v('f_semi') || +v('f_wh') || 0, retail: +v('f_rt') || 0 } };
          await saveProduct(np, n ? +v('f_open') || 0 : 0, n ? +v('f_ocost') || +v('f_cost') || 0 : 0);
          toast('تم الحفظ ✓'); closeSheet(); refresh();
        } catch (e) { toast(e.message); }
      };
    });
}

function unitSel(p) { return `<select id="u">${unitsOf(p).map((u, i) => `<option value="${i}">${esc(u.name)}</option>`).join('')}</select>`; }
function dmg(p) {
  sheet(`<h3>تسجيل تالف: ${esc(p.name)}</h3><label>الوحدة${unitSel(p)}</label><label>الكمية<input id="q" type="number" step="any" inputmode="decimal"></label><label>السبب<input id="r" placeholder="انتهاء صلاحية / كسر / تلف"></label><button class="btn bad full" id="go">تسجيل</button>`,
    b => $('#go', b).onclick = async () => {
      try { await damage({ productId: p.id, unitIdx: +$('#u', b).value, qty: +$('#q', b).value, reason: $('#r', b).value }); toast('تم تسجيل التالف'); closeSheet(); refresh(); } catch (e) { toast(e.message); }
    });
}
function adj(p) {
  sheet(`<h3>جرد: ${esc(p.name)}</h3><p>الرصيد الحالي: ${formatQty(p.qty, p)} (${p.qty} ${esc(baseName(p))})</p><label>الرصيد الفعلي (بالوحدة الأساسية)<input id="q" type="number" step="any" inputmode="decimal" value="${p.qty}"></label><button class="btn full" id="go">تسوية الرصيد</button>`,
    b => $('#go', b).onclick = async () => {
      try { const q = +$('#q', b).value; if (!(q >= 0)) throw new Error('رقم غير صحيح'); await adjustStock(p.id, q); toast('تمت التسوية'); closeSheet(); refresh(); } catch (e) { toast(e.message); }
    });
}
