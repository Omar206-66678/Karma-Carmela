import { esc, money, fmtDate } from './core.js';
import { setting } from './db.js';

export const $ = (s, r = document) => r.querySelector(s);
export function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2800); }
export function sheet(html, mount) {
  const s = $('#sheet');
  s.innerHTML = `<div class="sheet-bg" data-close></div><div class="sheet-box"><button class="x" data-close>✕</button>${html}</div>`;
  s.classList.add('open');
  s.onclick = e => { if (e.target.dataset.close !== undefined) closeSheet(); };
  if (mount) mount(s.querySelector('.sheet-box'));
}
export const closeSheet = () => { const s = $('#sheet'); s.classList.remove('open'); s.innerHTML = ''; };

/** قراءة الباركود بالكاميرا (BarcodeDetector) — وقارئ الباركود الخارجي يكتب في حقل البحث مباشرة */
export async function scan(cb) {
  if (!('BarcodeDetector' in window)) return toast('المتصفح لا يدعم قراءة الباركود بالكاميرا. اكتب الرقم أو استخدم قارئ باركود');
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); } catch { return toast('تعذر فتح الكاميرا'); }
  const v = document.createElement('video'); v.srcObject = stream; v.setAttribute('playsinline', ''); await v.play();
  const box = document.createElement('div'); box.className = 'scanner'; box.append(v);
  const b = document.createElement('button'); b.textContent = 'إغلاق'; box.append(b); document.body.append(box);
  const det = new BarcodeDetector(); let on = true;
  const stop = () => { on = false; stream.getTracks().forEach(t => t.stop()); box.remove(); };
  b.onclick = stop;
  (async function loop() { while (on) { try { const r = await det.detect(v); if (r[0]) { stop(); cb(r[0].rawValue); return; } } catch {} await new Promise(r => setTimeout(r, 250)); } })();
}

export const coInfo = async () => ({ name: await setting('company', 'مخزن الجملة'), phone: await setting('phone', ''), address: await setting('address', ''), cur: await setting('currency', 'ج.م') });
const T = { sale: 'فاتورة بيع', purchase: 'فاتورة شراء', sale_return: 'مرتجع مبيعات', purchase_return: 'مرتجع مشتريات' };
export const typeName = t => T[t] || t;

export function invHtml(inv, co) {
  const rows = inv.items.map(i => `<tr><td>${esc(i.name)}</td><td>${i.qty} ${esc(i.unit)}</td><td>${money(i.price)}</td><td>${money(i.qty * i.price)}</td></tr>`).join('');
  const full = inv.type === 'sale' || inv.type === 'purchase';
  return `<div class="inv"><h2>${esc(co.name)}</h2><p>${esc(co.phone || '')} ${esc(co.address || '')}</p><h3>${T[inv.type]} ${inv.no}</h3><p>${fmtDate(inv.date)}${inv.partyName ? ' • ' + esc(inv.partyName) : ''}</p>
  <table><thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="tt">${inv.discount ? `<p>الخصم: ${money(inv.discount)}</p>` : ''}<p><b>الإجمالي: ${money(inv.total)} ${co.cur}</b></p>${full ? `<p>المدفوع: ${money(inv.paid)} • المتبقي: ${money(inv.due)}</p>` : ''}</div></div>`;
}
export function printDoc(html, mode = 'a4') {
  $('#printArea').innerHTML = html;
  document.body.className = mode;
  $('#pageStyle').textContent = mode === 'thermal' ? '@page{size:80mm auto;margin:3mm}' : '@page{size:A4;margin:12mm}';
  setTimeout(() => window.print(), 100);
}
addEventListener('afterprint', () => { document.body.className = ''; });
