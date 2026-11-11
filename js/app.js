import { $, $$, ic, logo, BRAND, esc, initTheme, applyTheme, toggleTheme, closeSheet, toast, Install } from './ui.js';
import * as Auth from './auth.js';
import { requireLogin } from './pages/login.js';
import { scanBarcode } from './scanner.js';
import { ensureCategories } from './services.js';
import * as dashboard from './pages/dashboard.js';
import * as products from './pages/products.js';
import * as categories from './pages/categories.js';
import * as docs from './pages/docs.js';
import * as invoices from './pages/invoices.js';
import * as parties from './pages/parties.js';
import * as cash from './pages/cash.js';
import * as reports from './pages/reports.js';
import * as settings from './pages/settings.js';
import * as more from './pages/more.js';

const routes = { '': dashboard, pos: docs.pos, purchases: docs.purchases, 'purchase-new': docs.purchaseNew, products, categories, suppliers: parties.suppliers, customers: parties.customers, party: parties.party, invoices, cash, reports, settings, more };

// محتويات القائمة الجانبية (الثلاث شروط) — مقسمة حسب وظائف التطبيق
const MENU = [
  ['الرئيسية', [['', 'home', 'لوحة التحكم', 'g']]],
  ['المبيعات', [['pos', 'cart', 'نقطة البيع (الكاشير)', 'o'], ['invoices', 'receipt', 'سجل الفواتير والمرتجعات', 'b']]],
  ['المخزون', [['products', 'package', 'الأصناف والباركود', 'g'], ['categories', 'boxes', 'التصنيفات', 'p'], ['purchases', 'truck', 'المشتريات (الوارد)', 't'], ['@scan', 'scan', 'مسح باركود بالكاميرا', 'o']]],
  ['الحسابات', [['customers', 'users', 'العملاء', 'b'], ['suppliers', 'users', 'الموردون', 'a'], ['cash', 'banknote', 'الخزنة والمصروفات', 'g']]],
  ['التحليلات', [['reports', 'chart', 'التقارير وصافي الربح', 'p']]],
  ['النظام', [['settings', 'gear', 'الإعدادات والنسخ الاحتياطي', 't']]]
];
const TABS = [['', 'home', 'الرئيسية'], ['products', 'package', 'الأصناف'], ['pos', 'cart', 'الكاشير'], ['purchases', 'truck', 'الوارد']];
const GROUP = { 'purchase-new': 'purchases', party: 'customers' };
const IN_MORE = ['more', 'customers', 'suppliers', 'party', 'cash', 'reports', 'settings'];

let cur = '';
function shell() {
  const item = ([k, i, l, t]) => k === '@scan'
    ? `<button class="dw-it" data-scan><span class="ci sm ${t}">${ic(i, 20)}</span><span class="t">${l}</span>${ic('chev', 18, 'ch')}</button>`
    : `<a class="dw-it" href="#/${k}" data-k="${k}"><span class="ci sm ${t}">${ic(i, 20)}</span><span class="t">${l}</span>${ic('chev', 18, 'ch')}</a>`;
  $('#app').innerHTML = `
  <header id="top"><div class="hrow">
    <a class="brand" href="#/" aria-label="${BRAND}">${logo(44)}<div class="bn"><b>${BRAND}</b><small>إدارة المخزن والمبيعات</small></div></a>
    <div class="hacts"><button class="ibtn" id="theme" aria-label="تغيير الثيم"></button><button class="ibtn" id="menu" aria-label="القائمة">${ic('menu', 22)}</button></div>
  </div></header>
  <div id="upd" hidden><span>يوجد تحديث جديد جاهز</span><button id="updgo">تحديث الآن</button></div>
  <main id="view"></main>
  <nav id="tabs"><div class="in">
    ${TABS.slice(0, 2).map(([k, i, l]) => `<a href="#/${k}" data-k="${k}">${ic(i, 22)}<span>${l}</span><i class="pip"></i></a>`).join('')}
    <a class="mid" href="#/pos" data-k="pos" aria-label="الكاشير"><span class="circ">${ic('cart', 28)}</span><span class="lb">الكاشير</span></a>
    <a href="#/purchases" data-k="purchases">${ic('truck', 22)}<span>الوارد</span><i class="pip"></i></a>
    <a href="#/more" id="more" data-k="more">${ic('menu', 22)}<span>المزيد</span><i class="pip"></i></a>
  </div></nav>
  <div id="drawer"><div class="dw-bg" data-dw></div><aside class="dw-panel" role="dialog" aria-label="القائمة">
    <div class="dw-hd">${logo(46)}<div><b>${BRAND}</b><small>نظام المخزن والمبيعات</small></div><button class="ibtn" data-dw aria-label="إغلاق">${ic('x', 20)}</button></div>
    <div class="dw-body">${MENU.map(([t, items]) => `<div class="dw-sec">${t}</div>${items.map(item).join('')}`).join('')}</div>
    <div class="dw-ft"><div class="dw-user">${ic('user', 18)}<b>${esc(Auth.currentUser())}</b></div><div class="dw-st" id="dws"><i></i><span id="dwt">يعمل بدون إنترنت • البيانات محفوظة على جهازك</span></div><button class="btn or full" id="inst" hidden>${ic('download', 19)} تثبيت التطبيق على الجهاز</button><a class="btn soft full" href="#/settings">${ic('gear', 19)} الإعدادات والنسخ الاحتياطي</a><button class="btn out full" id="lo" style="color:var(--r)">${ic('logout', 19)} تسجيل الخروج</button></div>
  </aside></div>`;
  applyTheme(document.documentElement.dataset.theme || 'light');
  $('#theme').onclick = toggleTheme;
  $('#menu').onclick = openDrawer;
  $('#drawer').onclick = e => {
    if (e.target.closest('[data-dw]')) return closeDrawer();
    if (e.target.closest('a.dw-it')) return closeDrawer();
    if (e.target.closest('[data-scan]')) { closeDrawer(); doScan(); }
    if (e.target.closest('#lo')) { Auth.logout(); location.reload(); }
    if (e.target.closest('#inst') && Install.ev) installApp();
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
  $('#updgo').onclick = () => location.reload();
  if (Install.ev) $('#inst').hidden = false;
  netStatus();
}
const openDrawer = () => $('#drawer').classList.add('open');
const closeDrawer = () => $('#drawer').classList.remove('open');
function netStatus() {
  const on = navigator.onLine, s = $('#dws'); if (!s) return;
  s.classList.toggle('off', !on);
  $('#dwt').textContent = on ? 'متصل • البيانات محفوظة على جهازك' : 'بدون إنترنت • التطبيق يعمل بشكل كامل';
}
addEventListener('online', netStatus); addEventListener('offline', netStatus);

function doScan() {
  scanBarcode(code => {
    const r = routes[cur];
    if (r && r.onScan) return r.onScan(code);
    sessionStorage.setItem('preQ', code);
    if (cur === 'products') nav(); else location.hash = '#/products';
  });
}

async function nav() {
  closeSheet(); closeDrawer();
  const m = location.hash.replace(/^#\/?/, '').split('?')[0].split('/'), name = m[0] || '', arg = m[1];
  cur = routes[name] ? name : ''; const r = routes[cur];
  const grp = GROUP[cur] || cur;
  $$('#tabs [data-k],#drawer a.dw-it').forEach(a => a.classList.toggle('on', a.dataset.k === grp));
  $('#more').classList.toggle('on', IN_MORE.includes(cur));
  document.title = `${BRAND} — ${r.title}`;
  const v = $('#view'); v.onclick = v.onchange = v.oninput = v.onkeydown = null;
  try { await r.render(v, arg); } catch (e) { console.error(e); v.innerHTML = `<p class="err">${esc(e.message)}</p>`; }
  scrollTo(0, 0);
}
addEventListener('hashchange', nav);

// ---- التثبيت كتطبيق (أندرويد / كمبيوتر) ----
addEventListener('beforeinstallprompt', e => { e.preventDefault(); Install.ev = e; const b = $('#inst'); if (b) b.hidden = false; });
addEventListener('appinstalled', () => { Install.ev = null; const b = $('#inst'); if (b) b.hidden = true; toast('تم تثبيت التطبيق'); });
async function installApp() {
  const e = Install.ev; if (!e) return;
  e.prompt(); await e.userChoice.catch(() => { }); Install.ev = null; const b = $('#inst'); if (b) b.hidden = true;
}
// ---- التحديثات: يفحص السيرفر دورياً وعند العودة للتطبيق، ويعرض شريط «تحديث الآن» ----
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  let first = !navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(reg => {
    setInterval(() => reg.update().catch(() => { }), 30 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => { }); });
  }).catch(() => { });
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (first) { first = false; return; } const u = $('#upd'); if (u) u.hidden = false; });
}
async function start() {
  initTheme();
  await requireLogin();
  shell();
  Auth.startIdleWatch(() => location.reload());
  await ensureCategories().catch(() => { });
  await nav();
  registerSW();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
}
start();