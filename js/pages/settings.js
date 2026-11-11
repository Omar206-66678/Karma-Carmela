import { setting, setSetting, exportAll, importAll, resetAll, validateBackup, get } from '../db.js';
import { $, ic, toast, head, download, BRAND, esc, Install } from '../ui.js';
import * as Auth from '../auth.js';
import { saveProduct, saveParty, createPurchase, ensureCategories } from '../services.js';
import { makeEAN13 } from '../barcode.js';
import { dayKey } from '../core.js';

export const title = 'الإعدادات';
export async function render(el) {
  const g = (k, d) => setting(k, d);
  const [co, tag, ph, ad, cu, ca, ft, cs] = await Promise.all([g('company', BRAND), g('tagline', 'لإدارة وتجارة السلع الغذائية'), g('phone', ''), g('address', ''), g('currency', 'ج.م'), g('cashier', ''), g('footer', 'شكراً لتعاملكم معنا'), g('costing', 'wac')]);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const f = (id, l, v, extra = '') => `<label>${l}<input id="${id}" value="${esc(v)}" ${extra}></label>`;
  el.innerHTML = head('الإعدادات', 'بيانات المنشأة والنسخ الاحتياطي', 'gear', '', 't') +
    `<div class="card"><div class="card-h"><h2>بيانات المنشأة (تظهر في الفواتير)</h2></div><div class="gap">${f('co', 'اسم المنشأة', co)}${f('tag', 'الوصف', tag)}<div class="fieldgrid">${f('ph', 'الهاتف', ph, 'dir="ltr" inputmode="tel"')}${f('cu', 'العملة', cu)}</div>${f('ad', 'العنوان', ad)}${f('ca', 'اسم الكاشير', ca)}${f('ft', 'نص أسفل الفاتورة', ft)}
    <label>طريقة حساب التكلفة<select id="cs"><option value="wac" ${cs === 'wac' ? 'selected' : ''}>المتوسط المرجح</option><option value="fifo" ${cs === 'fifo' ? 'selected' : ''}>حسب الدفعة (الأقرب انتهاءً ثم الأقدم)</option></select></label>
    <button class="btn full lg" id="sv">${ic('save', 20)} حفظ الإعدادات</button></div></div>
    <div class="card"><div class="card-h"><h2>الحساب والأمان</h2><span class="bd ok">${ic('user', 14)} ${esc(Auth.currentUser())}</span></div><div class="gap">
    <label>اسم المستخدم<input id="au" value="${esc(Auth.currentUser())}" autocomplete="username" autocapitalize="none"></label>
    <label>كلمة السر الحالية (مطلوبة للتغيير)<input id="ac" type="password" autocomplete="current-password"></label>
    <label>كلمة سر جديدة (اتركيها فارغة إن لم ترغبي بتغييرها)<input id="an" type="password" autocomplete="new-password"></label>
    <label>القفل التلقائي عند الخمول<select id="al"><option value="0">بدون</option><option value="5">بعد 5 دقائق</option><option value="15">بعد 15 دقيقة</option><option value="30">بعد 30 دقيقة</option><option value="60">بعد ساعة</option></select></label>
    <div class="fieldgrid"><button class="btn" id="asv">${ic('save', 19)} حفظ بيانات الدخول</button><button class="btn out" id="alo">${ic('logout', 19)} تسجيل الخروج</button></div>
    <small class="muted">الحساب يحمي الدخول للتطبيق على هذا الجهاز. بيانات المخزن غير مشفّرة، فاحتفظي بقفل شاشة للجهاز أيضاً.</small></div></div>
    <div class="card"><div class="card-h"><h2>التثبيت والتحديثات</h2><span class="bd ${standalone ? 'ok' : 'info'}">${standalone ? 'مثبّت' : 'يعمل كموقع'}</span></div>
    <p class="muted mb">ثبّتيه كتطبيق ليعمل بدون إنترنت، ويبقى مرتبطاً بالموقع فتصله التحديثات الجديدة تلقائياً كلما فُتح الإنترنت.</p>
    ${Install.ev ? `<button class="btn or full lg mb" id="ins">${ic('download', 20)} تثبيت التطبيق الآن</button>` : ''}
    <div class="list"><div class="it" style="cursor:default"><span class="av">${ic('phone', 20)}</span><div class="tx"><b>أندرويد (Chrome)</b><small>القائمة ⋮ ← «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»</small></div></div>
    <div class="it" style="cursor:default"><span class="av">${ic('monitor', 20)}</span><div class="tx"><b>ويندوز / ماك (Chrome أو Edge)</b><small>أيقونة التثبيت في شريط العنوان ← «تثبيت»</small></div></div>
    <div class="it" style="cursor:default"><span class="av">${ic('phone', 20)}</span><div class="tx"><b>آيفون (Safari)</b><small>زر المشاركة ← «إضافة إلى الشاشة الرئيسية»</small></div></div></div></div>
    <div class="card"><div class="card-h"><h2>النسخ الاحتياطي</h2></div><p class="muted mb">البيانات محفوظة على جهازك فقط. صدّر نسخة بشكل دوري.</p><div class="fieldgrid"><button class="btn out" id="ex">${ic('download', 19)} تصدير نسخة</button><label class="btn out" style="margin:0">${ic('upload', 19)} استرجاع نسخة<input type="file" id="im" accept=".json" hidden></label></div></div>
    <div class="card"><div class="card-h"><h2>أدوات</h2></div><div class="fieldgrid"><button class="btn soft" id="demo">${ic('layers', 19)} بيانات تجريبية</button><button class="btn red" id="rs">${ic('trash', 19)} مسح كل البيانات</button></div></div>`;
  $('#sv', el).onclick = async () => { for (const [k, i] of [['company', 'co'], ['tagline', 'tag'], ['phone', 'ph'], ['address', 'ad'], ['currency', 'cu'], ['cashier', 'ca'], ['footer', 'ft'], ['costing', 'cs']]) await setSetting(k, $('#' + i, el).value.trim()); toast('تم حفظ الإعدادات'); };
  $('#al', el).value = String(Auth.getAutoLock());
  $('#al', el).onchange = e => { Auth.setAutoLock(e.target.value); toast('تم ضبط القفل التلقائي'); };
  $('#asv', el).onclick = async () => { try { await Auth.changeCredentials($('#ac', el).value, $('#au', el).value, $('#an', el).value); $('#ac', el).value = ''; $('#an', el).value = ''; toast('تم حفظ بيانات الدخول'); } catch (e) { toast(e.message, 'err'); } };
  $('#alo', el).onclick = () => { Auth.logout(); location.reload(); };
  const ins = $('#ins', el); if (ins) ins.onclick = async () => { Install.ev.prompt(); await Install.ev.userChoice.catch(() => { }); Install.ev = null; ins.hidden = true; };
  $('#ex', el).onclick = async () => download(`karma-camilla-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(await exportAll()), 'application/json');
  $('#im', el).onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      let data; try { data = JSON.parse(await file.text()); } catch { throw new Error('ملف غير صالح: ليس بصيغة JSON'); }
      validateBackup(data);
      if (!confirm('سيتم استبدال كل البيانات الحالية. متابعة؟')) return;
      await importAll(data); toast('تم الاسترجاع'); setTimeout(() => location.reload(), 600);
    } catch (err) { toast(err.message || 'ملف غير صالح', 'err'); } finally { e.target.value = ''; }
  };
  $('#rs', el).onclick = async () => { if (confirm('حذف كل البيانات نهائياً؟') && confirm('تأكيد أخير: لا يمكن التراجع!')) { await resetAll(); await ensureCategories(); toast('تم المسح'); setTimeout(() => location.reload(), 600); } };
  $('#demo', el).onclick = async () => {
    const mk = (name, cat, bc, big, f, cost, wh, rt, open) => saveProduct({ name, category: cat, barcode: makeEAN13(bc), baseUnit: 'قطعة', units: [{ name: 'قطعة', factor: 1 }, { name: big, factor: f }], minStock: f * 2, tiers: [], prices: { cost, wholesale: wh, semi: +(wh * 1.05).toFixed(2), retail: rt } }, open, cost);
    try {
      const A = await mk('أرز مصري 1 كجم', 'حبوب وبقوليات', '622100000001', 'كرتونة', 12, 30, 34, 40, 120);
      await mk('سكر أبيض 1 كجم', 'حبوب وبقوليات', '622100000002', 'كرتونة', 10, 28, 31, 36, 100);
      await mk('زيت عباد الشمس 1 لتر', 'زيوت', '622100000003', 'كرتونة', 12, 60, 66, 75, 96);
      await mk('مكرونة قلم 400 جم', 'مكرونة', '622100000004', 'كرتونة', 20, 9, 10.5, 13, 200);
      const L = await mk('لبن كامل الدسم 1 لتر', 'ألبان', '622100000005', 'كرتونة', 12, 34, 38, 44, 8);
      await saveParty({ type: 'customer', name: 'سوبر ماركت النور', phone: '01000000000', address: 'سوهاج', group: 'wholesale', creditLimit: 50000, balance: 0 });
      const s = await saveParty({ type: 'supplier', name: 'شركة التوريدات الغذائية', phone: '01111111111', address: 'القاهرة', balance: 0 });
      const d = new Date(); d.setDate(d.getDate() + 12);
      await createPurchase({ partyId: s.id, method: 'كاش', items: [{ productId: L.id, unitIdx: 1, qty: 3, price: 34 * 12, exp: dayKey(d) }] });
      toast('تمت إضافة البيانات التجريبية');
    } catch (e) { toast(e.message, 'err'); }
  };
}