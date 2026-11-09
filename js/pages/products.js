import { getAll } from '../db.js';
import { money, esc, formatQty, unitsOf, baseName, parseUnits, parseTiers, unitsText, tiersText, matchP, bcKey, stockStatus, r2 } from '../core.js';
import { $, ic, sheet, closeSheet, sheetHead, toast, head, searchBox, coInfo, printDoc } from '../ui.js';
import { scanBarcode } from '../scanner.js';
import { barcodeSvg } from '../barcode.js';
import { saveProduct, deleteProduct, damage, adjustStock, nextBarcode } from '../services.js';

export const title = 'الأصناف';
const v = id => $('#' + id).value.trim();

export async function render(el) {
  const [P, C, co] = await Promise.all([getAll('products'), getAll('categories'), coInfo()]);
  let cat = 'الكل', q = sessionStorage.getItem('preQ') || ''; sessionStorage.removeItem('preQ');
  const icon = n => (C.find(c => c.name === n) || {}).icon || '📦';
  const value = r2(P.reduce((s, p) => s + p.qty * (p.avgCost || 0), 0));
  el.innerHTML = head('الأصناف', `${P.length} صنف • قيمة المخزون ${money(value)} ${esc(co.cur)}`, 'package', `<button class="btn" id="add">${ic('plus', 19)} صنف جديد</button>`)
    + searchBox('s', 'ابحث بالاسم أو التصنيف أو الباركود…') + '<div class="chips" id="chips"></div><div class="pgrid" id="grid"></div>';
  $('#s', el).value = q;

  const draw = () => {
    const names = ['الكل', ...C.map(c => c.name)];
    $('#chips', el).innerHTML = names.map(n => `<button class="chip ${n === cat ? 'on' : ''}" data-cat="${esc(n)}">${n === 'الكل' ? '' : icon(n) + ' '}${esc(n)}</button>`).join('');
    const L = P.filter(p => (cat === 'الكل' || p.category === cat) && matchP(p, q)), k = bcKey(q);
    $('#grid', el).innerHTML = L.map(p => {
      const st = stockStatus(p), hit = k && bcKey(p.barcode) === k;
      return `<div class="pc ${hit ? 'hit' : ''}" data-id="${p.id}"><div class="ph"><div class="row" style="min-width:0"><span class="av">${icon(p.category)}</span><div style="min-width:0"><div class="nm">${esc(p.name)}</div><small class="trunc" style="display:block">${esc(p.category || '')}${p.barcode ? ' • ' + esc(p.barcode) : ''}</small></div></div><span class="bd ${st.cls}">${st.label}</span></div>
      <div class="pr"><b>${money(p.prices.wholesale)} <small>${esc(co.cur)}/${esc(baseName(p))}</small></b></div><div class="row sb"><small>المخزون</small><b>${formatQty(p.qty, p)}</b></div>
      <div class="acts"><button class="btn sm" data-act="cart">${ic('cart', 17)} للسلة</button><button class="btn out sm" data-act="more">تفاصيل</button><button class="ibtn" data-act="edit" aria-label="تعديل">${ic('pencil', 18)}</button><button class="ibtn" data-act="del" aria-label="حذف" style="color:var(--r)">${ic('trash', 18)}</button></div></div>`;
    }).join('') || `<div class="card" style="grid-column:1/-1"><p class="empty">لا توجد أصناف مطابقة</p>${/^\d{6,}$/.test(q) ? `<button class="btn full" data-newbc="${esc(q)}">${ic('plus', 19)} إضافة صنف بهذا الباركود</button>` : ''}</div>`;
  };
  draw();
  $('#s', el).oninput = e => { q = e.target.value; draw(); };
  $('#s', el).onkeydown = e => { if (e.key === 'Enter') { const L = P.filter(p => matchP(p, q)); if (L.length === 1) detail(L[0]); } };
  $('#sScan', el).onclick = () => scanBarcode(code => { q = code; $('#s', el).value = code; draw(); const p = P.find(x => bcKey(x.barcode) === bcKey(code)); if (p) toast('تم العثور على: ' + p.name); else toast('باركود غير مسجل — يمكنك إضافته كصنف جديد', 'err'); });
  $('#add', el).onclick = () => form();
  el.onclick = async e => {
    const ch = e.target.closest('[data-cat]'); if (ch) { cat = ch.dataset.cat; return draw(); }
    const nb = e.target.closest('[data-newbc]'); if (nb) return form(null, nb.dataset.newbc);
    const card = e.target.closest('.pc'); const b = e.target.closest('[data-act]'); if (!card || !b) return;
    const p = P.find(x => x.id == card.dataset.id), a = b.dataset.act;
    if (a === 'cart') { sessionStorage.setItem('preAdd', p.id); location.hash = '#/pos'; }
    else if (a === 'more') detail(p); else if (a === 'edit') form(p);
    else if (a === 'del' && confirm(`حذف الصنف «${p.name}» نهائياً؟ (الفواتير القديمة تبقى كما هي)`)) { await deleteProduct(p.id); toast('تم حذف الصنف'); render(el); }
  };

  function detail(p) {
    const pr = p.prices, st = stockStatus(p);
    sheet(`${sheetHead(esc(p.name), esc(p.category || ''))}
      <div class="card" style="margin:0"><div class="kv"><span>الحالة</span><span class="bd ${st.cls}">${st.label}</span></div><div class="kv"><span>المخزون</span><b>${formatQty(p.qty, p)}</b></div><div class="kv"><span>متوسط التكلفة (لكل ${esc(baseName(p))})</span><b>${money(p.avgCost)}</b></div>
      <div class="kv"><span>تكلفة / جملة / نصف / قطاعي</span><b>${money(pr.cost)} / ${money(pr.wholesale)} / ${money(pr.semi)} / ${money(pr.retail)}</b></div><div class="kv"><span>حد التنبيه</span><b>${p.minStock || 0}</b></div>${p.barcode ? `<div class="kv"><span>الباركود</span><b dir="ltr">${esc(p.barcode)}</b></div>` : ''}</div>
      <div class="fieldgrid"><button class="btn" id="ed">${ic('pencil', 18)} تعديل</button><button class="btn out" id="lb">${ic('tag', 18)} ملصق باركود</button><button class="btn out" id="dm">${ic('trash', 18)} تسجيل تالف</button><button class="btn out" id="ad">${ic('list', 18)} جرد</button></div>`,
      b => { $('#ed', b).onclick = () => form(p); $('#lb', b).onclick = () => label(p); $('#dm', b).onclick = () => dmg(p); $('#ad', b).onclick = () => adj(p); });
  }
  function label(p) {
    if (!p.barcode) return toast('لا يوجد باركود لهذا الصنف — عدّله وولّد باركود', 'err');
    sheet(`${sheetHead('ملصق باركود', esc(p.name))}<div class="card" style="margin:0;text-align:center;background:#fff;color:#000"><b style="color:#000">${esc(p.name)}</b>${barcodeSvg(p.barcode, { h: 70, mod: 2.4 })}<b style="color:#000">${money(p.prices.retail || p.prices.wholesale)} ${esc(co.cur)}</b></div>
      <label>عدد الملصقات<input id="n" type="number" value="12" min="1" max="120" inputmode="numeric"></label><button class="btn or full lg" id="go">${ic('printer', 20)} طباعة</button>`,
      b => $('#go', b).onclick = () => {
        const n = Math.min(120, Math.max(1, +$('#n', b).value || 1));
        printDoc(`<div class="labels">${Array.from({ length: n }, () => `<div class="lbl"><b>${esc(p.name)}</b>${barcodeSvg(p.barcode, { h: 44, mod: 1.8 })}<div class="pr">${money(p.prices.retail || p.prices.wholesale)} ${esc(co.cur)}</div></div>`).join('')}</div>`, 'a4');
      });
  }
  function form(p, bc = '') {
    const n = !p; p = p || { prices: {}, units: [], barcode: bc };
    sheet(`${sheetHead(n ? 'صنف جديد' : 'تعديل صنف')}
      <label>اسم الصنف<input id="f_name" value="${esc(p.name || '')}"></label>
      <label>الباركود<div class="row"><input id="f_bc" inputmode="numeric" dir="ltr" value="${esc(p.barcode || '')}"><button class="ibtn" id="f_sc" type="button" aria-label="مسح">${ic('scan', 20)}</button><button class="ibtn" id="f_gen" type="button" aria-label="توليد باركود" title="توليد باركود داخلي">${ic('tag', 20)}</button></div></label>
      <label>التصنيف<select id="f_cat">${[...C.map(c => c.name)].map(c => `<option ${c === (p.category || 'عام') ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
      <div class="fieldgrid"><label>الوحدة الأساسية<input id="f_base" value="${esc(p.id ? baseName(p) : 'قطعة')}" placeholder="قطعة / كيلو"></label><label>وحدات أكبر<input id="f_units" value="${esc(p.id ? unitsText(p) : '')}" placeholder="كرتونة=24, دستة=12"></label></div>
      <b>الأسعار (لكل وحدة أساسية)</b>
      <div class="fieldgrid"><label>تكلفة<input id="f_cost" type="number" step="any" inputmode="decimal" value="${p.prices.cost || ''}"></label><label>جملة<input id="f_wh" type="number" step="any" inputmode="decimal" value="${p.prices.wholesale || ''}"></label><label>نصف جملة<input id="f_semi" type="number" step="any" inputmode="decimal" value="${p.prices.semi || ''}"></label><label>قطاعي<input id="f_rt" type="number" step="any" inputmode="decimal" value="${p.prices.retail || ''}"></label></div>
      <label>شرائح الكمية (من كمية=سعر الوحدة الأساسية)<input id="f_tiers" value="${esc(tiersText(p))}" placeholder="48=4.5, 240=4.2"></label>
      <label>حد التنبيه (بالوحدة الأساسية)<input id="f_min" type="number" step="any" inputmode="decimal" value="${p.minStock || ''}"></label>
      ${n ? `<div class="fieldgrid"><label>رصيد افتتاحي<input id="f_open" type="number" step="any" inputmode="decimal"></label><label>تكلفة الرصيد (للأساسية)<input id="f_ocost" type="number" step="any" inputmode="decimal"></label></div>` : ''}
      <button class="btn full lg" id="f_save">${ic('save', 20)} حفظ</button>`,
      b => {
        $('#f_sc', b).onclick = () => scanBarcode(c => $('#f_bc', b).value = c);
        $('#f_gen', b).onclick = async () => { $('#f_bc', b).value = await nextBarcode(); };
        $('#f_save', b).onclick = async () => {
          try {
            if (!v('f_name')) throw new Error('اكتب اسم الصنف');
            const base = v('f_base') || 'قطعة';
            const np = { ...p, name: v('f_name'), barcode: v('f_bc'), category: v('f_cat'), baseUnit: base, units: parseUnits(v('f_units'), base), minStock: +v('f_min') || 0, tiers: parseTiers(v('f_tiers')), prices: { cost: +v('f_cost') || 0, wholesale: +v('f_wh') || 0, semi: +v('f_semi') || +v('f_wh') || 0, retail: +v('f_rt') || 0 } };
            await saveProduct(np, n ? +v('f_open') || 0 : 0, n ? +v('f_ocost') || +v('f_cost') || 0 : 0);
            toast('تم حفظ الصنف'); closeSheet(); render(el);
          } catch (e) { toast(e.message, 'err'); }
        };
      });
  }
  const unitSel = p => `<select id="u">${unitsOf(p).map((u, i) => `<option value="${i}">${esc(u.name)}</option>`).join('')}</select>`;
  function dmg(p) {
    sheet(`${sheetHead('تسجيل تالف', esc(p.name))}<label>الوحدة${unitSel(p)}</label><label>الكمية<input id="q" type="number" step="any" inputmode="decimal"></label><label>السبب<input id="r" placeholder="انتهاء صلاحية / كسر / تلف"></label><button class="btn red full lg" id="go">تسجيل</button>`,
      b => $('#go', b).onclick = async () => { try { await damage({ productId: p.id, unitIdx: +$('#u', b).value, qty: +$('#q', b).value, reason: $('#r', b).value }); toast('تم تسجيل التالف'); closeSheet(); render(el); } catch (e) { toast(e.message, 'err'); } });
  }
  function adj(p) {
    sheet(`${sheetHead('جرد', esc(p.name))}<p>الرصيد الحالي: <b>${formatQty(p.qty, p)}</b> (${p.qty} ${esc(baseName(p))})</p><label>الرصيد الفعلي (بالوحدة الأساسية)<input id="q" type="number" step="any" inputmode="decimal" value="${p.qty}"></label><button class="btn full lg" id="go">تسوية الرصيد</button>`,
      b => $('#go', b).onclick = async () => { try { const q = +$('#q', b).value; if (!(q >= 0)) throw new Error('رقم غير صحيح'); await adjustStock(p.id, q); toast('تمت التسوية'); closeSheet(); render(el); } catch (e) { toast(e.message, 'err'); } });
  }
}
