// دوال مساعدة: تقريب، تنسيق، وحدات، شرائح أسعار، تفقيط
export const r2 = n => Math.round((+n || 0) * 100) / 100;
export const r3 = n => Math.round((+n || 0) * 1000) / 1000;
export const r4 = n => Math.round((+n || 0) * 10000) / 10000;
export const money = n => r2(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
export const fmtDate = d => new Date(d).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
export const fmtDay = d => new Date(d).toLocaleDateString('en-GB');
export const fmtTime = d => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
export const dayKey = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const METHODS = ['كاش', 'انستاباي', 'فودافون كاش', 'آجل'];
export const GROUPS = { wholesale: 'جملة', semi: 'نصف جملة', retail: 'قطاعي' };

// وحدات الصنف: [{name:'قطعة',factor:1},{name:'كرتونة',factor:24}] — الكمية تُخزَّن دائماً بالوحدة الأساسية
export const unitsOf = p => (p.units && p.units.length) ? p.units : [{ name: p.baseUnit || 'قطعة', factor: 1 }];
export const baseName = p => (unitsOf(p).find(u => u.factor === 1) || unitsOf(p)[0]).name;
/** تحويل تلقائي: 50 قطعة → "2 كرتونة + 2 قطعة" */
export function formatQty(base, p) {
  const us = [...unitsOf(p)].sort((a, b) => b.factor - a.factor);
  let left = r3(base); const parts = [];
  for (const u of us) {
    if (u.factor <= 1) continue;
    const n = Math.floor(left / u.factor + 1e-9);
    if (n > 0) { parts.push(`${n} ${u.name}`); left = r3(left - n * u.factor); }
  }
  if (left > 0 || !parts.length) parts.push(`${left} ${baseName(p)}`);
  return parts.join(' + ');
}
/** سعر الوحدة الأساسية حسب مجموعة العميل + شرائح الكمية */
export function priceFor(p, group, baseQty) {
  const pr = p.prices || {};
  let price = pr[group] || pr.wholesale || pr.retail || 0;
  if (group !== 'retail') {
    const t = (p.tiers || []).filter(t => baseQty >= t.min).sort((a, b) => b.min - a.min)[0];
    if (t) price = t.price;
  }
  return price;
}
export const parseUnits = (s, base) => {
  const us = [{ name: base || 'قطعة', factor: 1 }];
  (s || '').split(/[,،\n]/).forEach(x => { const [n, f] = x.split('=').map(y => y.trim()); if (n && +f > 1) us.push({ name: n, factor: +f }); });
  return us;
};
export const unitsText = p => unitsOf(p).filter(u => u.factor !== 1).map(u => `${u.name}=${u.factor}`).join(', ');
export const parseTiers = s => (s || '').split(/[,،\n]/).map(x => x.split('=').map(y => +y.trim())).filter(([m, pr]) => m > 0 && pr > 0).map(([min, price]) => ({ min, price }));
export const tiersText = p => (p.tiers || []).map(t => `${t.min}=${t.price}`).join(', ');

/** وصف رصيد الطرف: العميل الموجب = عليه، المورد الموجب = له، والسالب عكس ذلك */
export const balanceLabel = (p, bal = p.balance || 0) => p.type === 'customer' ? (bal >= 0 ? 'عليه' : 'له') : (bal >= 0 ? 'له' : 'عليه');

/** مفتاح مقارنة الباركود: غير حساس للحالة ويتجاهل الأصفار البادئة (UPC-A = EAN-13 بصفر) */
export const bcKey = s => String(s ?? '').trim().toLowerCase().replace(/^0+(?=\d)/, '');
export function matchP(p, q) {
  q = (q || '').trim().toLowerCase(); if (!q) return true;
  const k = bcKey(q);
  return p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q) || (!!k && bcKey(p.barcode).includes(k));
}
export function stockStatus(p) {
  if (!(p.qty > 0)) return { label: 'نافد', cls: 'bad' };
  if (p.qty <= (p.minStock || 0)) return { label: 'منخفض', cls: 'warn' };
  return { label: 'متوفر', cls: 'ok' };
}

// ===== تفقيط المبلغ بالعربية =====
const ONES = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
const TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const HUND = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
function below1000(n) {
  const h = Math.floor(n / 100), r = n % 100, p = [];
  if (h) p.push(HUND[h]);
  if (r) { if (r < 20) p.push(ONES[r]); else { const o = r % 10, t = Math.floor(r / 10); p.push(o ? ONES[o] + ' و' + TENS[t] : TENS[t]); } }
  return p.join(' و');
}
const grp = (n, one, two, few, many) => n === 1 ? one : n === 2 ? two : n <= 10 ? below1000(n) + ' ' + few : below1000(n) + ' ' + many;
export function words(n) {
  n = Math.floor(n); if (n === 0) return 'صفر';
  const parts = [], bil = Math.floor(n / 1e9), mil = Math.floor(n / 1e6) % 1000, th = Math.floor(n / 1e3) % 1000, r = n % 1000;
  if (bil) parts.push(grp(bil, 'مليار', 'ملياران', 'مليارات', 'مليارًا'));
  if (mil) parts.push(grp(mil, 'مليون', 'مليونان', 'ملايين', 'مليونًا'));
  if (th) parts.push(grp(th, 'ألف', 'ألفان', 'آلاف', 'ألفًا'));
  if (r) parts.push(below1000(r));
  return parts.join(' و');
}
export function tafqeet(amount) {
  const a = r2(Math.abs(amount)), pounds = Math.floor(a), piast = Math.round((a - pounds) * 100);
  let s = words(pounds) + ' جنيه مصري';
  if (piast) s += ' و' + words(piast) + ' قرشًا';
  return s;
}
export const csv = rows => '\ufeff' + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');