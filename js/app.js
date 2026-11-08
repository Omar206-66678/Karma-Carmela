import { $, closeSheet } from './ui.js';
import { esc } from './core.js';
import * as home from './pages/home.js';
import * as products from './pages/products.js';
import * as parties from './pages/parties.js';
import * as docs from './pages/docs.js';
import * as finance from './pages/finance.js';
import * as settings from './pages/settings.js';

const routes = { '': home, sale: docs.sale, purchase: docs.purchase, invoices: docs.invoices, products, parties, cash: finance.cash, reports: finance.reports, more: settings.more, settings };

async function nav() {
  closeSheet();
  const k = location.hash.replace(/^#\/?/, '').split('?')[0];
  const r = routes[k] || routes[''];
  $('#title').textContent = r.title;
  $('#net').textContent = navigator.onLine ? '' : 'بدون إنترنت';
  document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.k.split(',').includes(k)));
  try { await r.render($('#view')); } catch (e) { $('#view').innerHTML = `<p class="err">${esc(e.message)}</p>`; }
  scrollTo(0, 0);
}
addEventListener('hashchange', nav);
nav();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); // يمنع المتصفح من مسح البيانات
addEventListener('online', () => { $('#net').textContent = ''; });
addEventListener('offline', () => { $('#net').textContent = 'بدون إنترنت'; });
