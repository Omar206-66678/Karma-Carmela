// شاشات الدخول: إنشاء الحساب (أول تشغيل) • تسجيل الدخول • نسيت كلمة السر • رمز الاسترداد
import * as Auth from '../auth.js';
import { $, ic, logo, BRAND, esc, copyText } from '../ui.js';

const frame = (inner, sub) => `<div class="auth"><form class="auth-card" id="af" autocomplete="on" novalidate>
  <div class="auth-top">${logo(76)}<h1>${BRAND}</h1><p>${sub}</p></div>${inner}</form></div>`;
const pw = (id, label, ac) => `<label>${label}<div class="pw"><input id="${id}" type="password" autocomplete="${ac}" autocapitalize="none" spellcheck="false"><button type="button" class="eye" data-eye="${id}" aria-label="إظهار كلمة السر">${ic('eye', 20)}</button></div></label>`;
const user = (v = '') => `<label>اسم المستخدم<input id="u" value="${esc(v)}" autocomplete="username" autocapitalize="none" spellcheck="false"></label>`;
const err = () => '<div class="auth-err" id="ae" role="alert"></div>';

function wire(onSubmit) {
  const f = $('#af'), btn = f.querySelector('button[type=submit]'), ae = $('#ae');
  f.onclick = e => {
    const b = e.target.closest('[data-eye]'); if (!b) return;
    const i = $('#' + b.dataset.eye), show = i.type === 'password'; i.type = show ? 'text' : 'password'; b.innerHTML = ic(show ? 'eyeoff' : 'eye', 20);
  };
  f.onsubmit = async e => {
    e.preventDefault(); ae.textContent = ''; btn.disabled = true; const t = btn.innerHTML; btn.innerHTML = 'لحظة…';
    try { await onSubmit(); } catch (x) { ae.textContent = x.message || 'حدث خطأ'; btn.disabled = false; btn.innerHTML = t; }
  };
}

function setupScreen(done) {
  $('#app').innerHTML = frame(`<p class="auth-note">أول تشغيل: أنشئي حساب المدير. بياناتك تُحفظ على هذا الجهاز فقط ويعمل التطبيق بدون إنترنت.</p>
    ${user()}${pw('p1', 'كلمة السر (6 أحرف على الأقل)', 'new-password')}${pw('p2', 'تأكيد كلمة السر', 'new-password')}${err()}
    <button class="btn or full lg" type="submit">${ic('lock', 20)} إنشاء الحساب</button>`, 'إنشاء حساب المدير');
  wire(async () => {
    if ($('#p1').value !== $('#p2').value) throw new Error('كلمتا السر غير متطابقتين');
    recoveryScreen(await Auth.createAccount($('#u').value, $('#p1').value), done, 'أنشأتِ الحساب بنجاح');
  });
}

function recoveryScreen(code, done, title) {
  $('#app').innerHTML = frame(`<p class="auth-note"><b>${title}.</b> هذا <b>رمز الاسترداد</b> — الوسيلة الوحيدة لاستعادة الدخول إن نسيتِ كلمة السر. يظهر مرة واحدة فقط، احفظيه في مكان آمن (صوّريه أو اكتبيه).</p>
    <div class="rc" id="rc">${esc(code)}</div><button type="button" class="btn out full" id="cp">${ic('copy', 19)} نسخ الرمز</button>
    <label class="chk"><input type="checkbox" id="sv"> حفظتُ رمز الاسترداد في مكان آمن</label>${err()}
    <button class="btn full lg" type="submit" disabled id="go">متابعة إلى التطبيق</button>`, 'رمز الاسترداد');
  $('#cp').onclick = () => copyText(code);
  $('#sv').onchange = e => { $('#go').disabled = !e.target.checked; };
  const f = $('#af'); f.onsubmit = e => { e.preventDefault(); if ($('#sv').checked) done(); };
}

function loginScreen(done) {
  $('#app').innerHTML = frame(`${user(Auth.currentUser())}${pw('p', 'كلمة السر', 'current-password')}
    <label class="chk"><input type="checkbox" id="rm"> تذكرني على هذا الجهاز (30 يوماً)</label>${err()}
    <button class="btn or full lg" type="submit" id="go">${ic('lock', 20)} دخول</button>
    <button type="button" class="lnk center" id="fg">نسيت كلمة السر؟</button>`, 'سجّلي الدخول للمتابعة');
  wire(async () => { await Auth.login($('#u').value, $('#p').value, $('#rm').checked); done(); });
  $('#fg').onclick = () => forgotScreen(done);
  (Auth.currentUser() ? $('#p') : $('#u')).focus();
}

function forgotScreen(done) {
  $('#app').innerHTML = frame(`<p class="auth-note">أدخلي رمز الاسترداد الذي حفظتِه عند إنشاء الحساب، ثم اختاري كلمة سر جديدة.</p>
    <label>رمز الاسترداد<input id="rcode" dir="ltr" autocomplete="off" autocapitalize="characters" placeholder="XXXX-XXXX-XXXX" spellcheck="false"></label>
    ${pw('p1', 'كلمة السر الجديدة', 'new-password')}${pw('p2', 'تأكيد كلمة السر', 'new-password')}${err()}
    <button class="btn or full lg" type="submit">تعيين كلمة السر</button><button type="button" class="lnk center" id="bk">رجوع</button>`, 'استعادة الدخول');
  wire(async () => {
    if ($('#p1').value !== $('#p2').value) throw new Error('كلمتا السر غير متطابقتين');
    recoveryScreen(await Auth.resetWithCode($('#rcode').value, $('#p1').value), done, 'تم تعيين كلمة السر. هذا رمز استرداد جديد (القديم لم يعد صالحاً)');
  });
  $('#bk').onclick = () => loginScreen(done);
}

/** يعرض شاشة الدخول عند الحاجة ويكتمل (resolve) بعد نجاح الدخول */
export function requireLogin() {
  return new Promise(async resolve => {
    if (Auth.hasAccount() && await Auth.restore()) return resolve();
    Auth.hasAccount() ? loginScreen(resolve) : setupScreen(resolve);
  });
}
