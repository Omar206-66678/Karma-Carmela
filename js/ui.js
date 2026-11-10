import { esc, money, fmtDay, fmtTime, tafqeet } from './core.js';
import { setting } from './db.js';
import { barcodeSvg } from './barcode.js';

export { esc };
export const BRAND = 'كارمه كارميلا';
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ===== الأيقونات (خطّية موحّدة 24px) =====
const P = {
  home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  package: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7"/><path d="m7.5 4.27 9 5.15"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
  boxes: '<path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z"/><path d="m7 16.5-4.74-2.85"/><path d="m7 16.5 5-3"/><path d="M7 16.5v5.17"/><path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z"/><path d="m17 16.5-5-3"/><path d="m17 16.5 4.74-2.85"/><path d="M17 16.5v5.17"/><path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z"/><path d="M12 8 7.26 5.15"/><path d="m12 8 4.74-2.85"/><path d="M12 13.5V8"/>',
  banknote: '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
  gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>', minus: '<path d="M5 12h14"/>', x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
  pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
  save: '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  store: '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/>',
  undo: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  keyboard: '<path d="M10 8h.01"/><path d="M12 12h.01"/><path d="M14 8h.01"/><path d="M16 12h.01"/><path d="M18 8h.01"/><path d="M6 8h.01"/><path d="M7 16h10"/><path d="M8 12h.01"/><rect width="20" height="16" x="2" y="4" rx="2"/>',
  check: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  printer: '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  menu: '<line x1="4" x2="20" y1="7" y2="7"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="14" y1="17" y2="17"/>',
  chev: '<path d="m15 18-6-6 6-6"/>',
  trend: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
  dots: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  wifi: '<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/>',
  list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>'
};
export const ic = (n, s = 20, cls = '') => `<svg class="ic ${cls}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

/** شعار «كارمه كارميلا»: مكعب مخزون ثلاثي الأبعاد + بطاقة سعر برتقالية بخطوط باركود (التدرجات معرّفة في index.html) */
export const logo = (s = 40) => `<svg class="logo" width="${s}" height="${s}" viewBox="0 0 48 48" role="img" aria-label="${BRAND}"><rect width="48" height="48" rx="14" fill="url(#kkG)"/><rect x=".75" y=".75" width="46.5" height="46.5" rx="13.25" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="1.5"/><path d="M24 8.5 37.5 16.2 24 24 10.5 16.2z" fill="#fff"/><path d="M10.5 16.2 24 24v15.5L10.5 31.8z" fill="#fff" fill-opacity=".72"/><path d="M37.5 16.2 24 24v15.5l13.5-7.7z" fill="#fff" fill-opacity=".46"/><rect x="25" y="28.5" width="15" height="11" rx="3.4" fill="url(#kkO)" stroke="#0F5132" stroke-width="1.6"/><path d="M28.5 31.5v5M31.5 31.5v5M34.5 31.5v5M37 31.5v5" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/></svg>`;

// ===== الثيم =====
export function initTheme() {
  const saved = localStorage.getItem('kk-theme');
  applyTheme(saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
}
export function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = t === 'dark' ? '#0C1511' : '#0F5132';
  const b = $('#theme'); if (b) { b.innerHTML = ic(t === 'dark' ? 'sun' : 'moon', 21); b.title = t === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'; }
}
export function toggleTheme() {
  const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('kk-theme', t); applyTheme(t);
}

// ===== مكوّنات عامة =====
export function toast(m, kind = 'ok') {
  const t = $('#toast'); t.className = kind;
  t.innerHTML = `${ic(kind === 'ok' ? 'check' : 'alert', 20)}<p>${esc(m)}</p>`;
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 3200);
}
export function sheet(html, mount, cls = '') {
  const s = $('#sheet');
  s.innerHTML = `<div class="sh-bg" data-close></div><div class="sh-box ${cls}"><div class="sh-grip"></div>${html}</div>`;
  s.classList.add('open');
  s.onclick = e => { if (e.target.closest('[data-close]')) closeSheet(); };
  if (mount) mount(s.querySelector('.sh-box'));
}
export const closeSheet = () => { const s = $('#sheet'); s.classList.remove('open'); s.innerHTML = ''; };
export const sheetHead = (title, sub = '') => `<div class="sh-hd"><div><h3>${title}</h3>${sub ? `<small>${sub}</small>` : ''}</div><button class="ibtn" data-close aria-label="إغلاق">${ic('x', 20)}</button></div>`;

/** ترويسة الصفحة: أيقونة ملوّنة + عنوان + وصف + زر إجراء */
export const head = (title, sub, icon, action = '', tone = 'g') =>
  `<div class="phead"><div class="ptit"><span class="ci ${tone}">${ic(icon, 22)}</span><div><h1>${title}</h1><p>${sub || ''}</p></div></div>${action}</div>`;
/** صندوق بحث مع زر قارئ الباركود بالكاميرا */
export const searchBox = (id, ph, scanId = id + 'Scan') =>
  `<div class="sbox"><span class="sico">${ic('search', 19)}</span><input id="${id}" type="search" placeholder="${ph}" autocomplete="off" enterkeyhint="search"><button class="sscan" id="${scanId}" type="button" aria-label="مسح باركود بالكاميرا" title="مسح باركود بالكاميرا">${ic('scan', 21)}</button></div>`;

export async function coInfo() {
  const g = (k, d) => setting(k, d);
  const [name, tag, phone, address, cur, cashier, footer] = await Promise.all([g('company', BRAND), g('tagline', 'لإدارة وتجارة السلع الغذائية'), g('phone', ''), g('address', ''), g('currency', 'ج.م'), g('cashier', ''), g('footer', 'شكراً لتعاملكم معنا')]);
  return { name, tag, phone, address, cur, cashier, footer };
}
/** تنزيل ملف: يفتح نافذة فيها زر تنزيل حقيقي (يعمل على كل الموبايلات) + مشاركة + نسخ كخيار احتياطي */
export function download(name, text, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([text], { type: mime }), url = URL.createObjectURL(blob);
  const file = typeof File === 'function' ? new File([blob], name, { type: mime.split(';')[0] }) : null;
  const canShare = !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
  const kb = Math.max(1, Math.round(blob.size / 1024));
  sheet(`${sheetHead('الملف جاهز', esc(name))}<p class="muted">الحجم: ${kb} KB</p>
    <a class="btn full lg" id="dl" href="${url}" download="${esc(name)}">${ic('download', 20)} تنزيل الملف</a>
    ${canShare ? `<button class="btn out full" id="sh">${ic('upload', 19)} مشاركة / حفظ في الملفات</button>` : ''}
    <button class="btn out full" id="cpy">${ic('copy', 19)} نسخ المحتوى</button>
    <small class="muted">إن لم يبدأ التنزيل: اضغط «مشاركة» أو «نسخ المحتوى» والصقه في ملف نصي.</small>`,
    box => {
      $('#dl', box).onclick = () => toast('بدأ التنزيل — راجع مجلد التنزيلات');
      const sh = $('#sh', box); if (sh) sh.onclick = () => navigator.share({ files: [file], title: name }).catch(() => { });
      $('#cpy', box).onclick = () => copyText(text);
    });
  setTimeout(() => URL.revokeObjectURL(url), 300000);
}
export async function copyText(t) {
  try { await navigator.clipboard.writeText(t); toast('تم النسخ'); }
  catch { const x = document.createElement('textarea'); x.value = t; x.style.cssText = 'position:fixed;opacity:0'; document.body.append(x); x.select(); try { document.execCommand('copy'); toast('تم النسخ'); } catch { toast('انسخ النص يدوياً', 'err'); } x.remove(); }
}

// ===== الفواتير =====
const TN = { sale: 'فاتورة بيع', purchase: 'فاتورة شراء', sale_return: 'مرتجع مبيعات', purchase_return: 'مرتجع مشتريات' };
export const typeName = t => TN[t] || t;

export function invoiceHtml(inv, co) {
  const full = inv.type === 'sale' || inv.type === 'purchase', isP = inv.type.startsWith('purchase');
  const rows = inv.items.map((i, n) => `<tr class="${n % 2 ? 'alt' : ''}"><td class="c">${n + 1}</td><td><b>${esc(i.name)}</b>${i.barcode ? `<small dir="ltr">${esc(i.barcode)}</small>` : ''}</td><td class="c">${i.qty} ${esc(i.unit)}</td><td class="c">${money(i.price)}</td><td class="c"><b>${money(i.qty * i.price)}</b></td></tr>`).join('');
  const dash = v => v ? esc(v) : '—';
  return `<article class="paper" dir="rtl"><div class="hd">${logo(54)}<h3>${esc(co.name)}</h3><p><b>${esc(co.tag)}</b></p><p class="mu">${[co.address, co.phone ? 'تليفون: <span dir="ltr">' + esc(co.phone) + '</span>' : ''].filter(Boolean).map((x, i) => i ? x : esc(x)).join(' • ')}</p></div><hr>
  <div class="bar">${typeName(inv.type)}</div>
  <table><tbody><tr><td><b>رقم الفاتورة: </b>${esc(inv.no)}</td><td><b>${isP ? 'المورد' : 'العميل'}: </b>${esc(inv.partyName || '—')}</td></tr>
  <tr><td><b>التاريخ: </b>${fmtDay(inv.date)}</td><td><b>التليفون: </b><span dir="ltr">${dash(inv.partyPhone)}</span></td></tr>
  <tr><td><b>الوقت: </b>${fmtTime(inv.date)}</td><td><b>العنوان: </b>${dash(inv.partyAddress)}</td></tr>
  <tr><td><b>${full ? 'الكاشير' : 'المرجع'}: </b>${esc(full ? (inv.cashier || '—') : (inv.ref || '—'))}</td><td><b>${full ? 'طريقة الدفع' : 'التسوية'}: </b>${esc(full ? (inv.method || 'كاش') : (inv.mode === 'credit' ? 'على الحساب' : 'نقدي'))}</td></tr></tbody></table>
  <table><thead><tr><th>م</th><th>الصنف</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="tot"><table><tbody><tr><td><b>الإجمالي الفرعي</b></td><td class="l"><b>${money(inv.subtotal ?? inv.total)}</b></td></tr>${inv.discount ? `<tr><td><b>الخصم</b></td><td class="l"><b>${money(inv.discount)}</b></td></tr>` : ''}${full ? `<tr><td><b>المدفوع</b></td><td class="l"><b>${money(inv.paid)}</b></td></tr><tr><td><b>المتبقي</b></td><td class="l"><b>${money(inv.due)}</b></td></tr>` : ''}<tr class="grand"><td>الإجمالي النهائي</td><td class="l">${money(inv.total)} ${esc(co.cur)}</td></tr></tbody></table></div>
  <p class="words">فقط ${tafqeet(inv.total)} لا غير</p>
  ${inv.note ? `<p class="words">ملاحظة: ${esc(inv.note)}</p>` : ''}
  <div class="sig"><div>${isP ? 'توقيع المورد' : 'توقيع البائع'}<br><br>___________</div><div>${isP ? 'توقيع المستلم' : 'توقيع العميل'}<br><br>___________</div></div>
  <div class="ft"><p>${esc(co.footer)}${co.phone ? ' - للاستفسار: <span dir="ltr">' + esc(co.phone) + '</span>' : ''}</p>${barcodeSvg(inv.no, { h: 34, mod: 1.6, text: true })}</div></article>`;
}
export function invoiceText(inv, co) {
  const lines = inv.items.map(i => `${i.name} × ${i.qty} ${i.unit} × ${money(i.price)} = ${money(i.qty * i.price)} ${co.cur}`);
  return [`*${co.name}*`, `${typeName(inv.type)} ${inv.no}`, `التاريخ: ${fmtDay(inv.date)} ${fmtTime(inv.date)}`, `${inv.type.startsWith('purchase') ? 'المورد' : 'العميل'}: ${inv.partyName || '—'}`, '', ...lines, '',
    inv.discount ? `الخصم: ${money(inv.discount)} ${co.cur}` : '', `الإجمالي: ${money(inv.total)} ${co.cur}`, inv.due ? `المتبقي: ${money(inv.due)} ${co.cur}` : '', `فقط ${tafqeet(inv.total)} لا غير`, '', co.footer].filter(x => x !== '').join('\n');
}
export function printDoc(html, mode = 'a4') {
  $('#printArea').innerHTML = html;
  document.body.classList.remove('thermal', 'a4'); document.body.classList.add(mode);
  $('#pageStyle').textContent = mode === 'thermal' ? '@page{size:80mm auto;margin:3mm}' : '@page{size:A4;margin:12mm}';
  setTimeout(() => window.print(), 120);
}
addEventListener('afterprint', () => document.body.classList.remove('thermal', 'a4')); 