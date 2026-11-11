// حساب المستخدم المحلي (يعمل بدون إنترنت): اسم مستخدم + كلمة سر + رمز استرداد.
// كلمة السر لا تُخزَّن أبداً — فقط ناتج PBKDF2-SHA256 (150 ألف دورة) مع ملح عشوائي.
// يُحفظ الحساب في localStorage منفصلاً عن بيانات المخزن، فلا يدخل في النسخ الاحتياطي ولا يُمسح بـ«مسح البيانات».
const K = 'kk-auth', KR = 'kk-remember', KF = 'kk-auth-fail', KS = 'kk-session', KL = 'kk-lock';
const ITER = 150000, enc = new TextEncoder();
const b64 = u => btoa(String.fromCharCode(...u));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const rnd = n => crypto.getRandomValues(new Uint8Array(n));
const norm = u => String(u || '').trim().toLowerCase();
const ls = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { } }, del: k => { try { localStorage.removeItem(k); } catch { } } };

async function pbkdf2(secret, salt) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER }, key, 256));
}
const sha = async s => new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)));
const same = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0; };
const rec = () => { try { return JSON.parse(ls.get(K)); } catch { return null; } };
const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => { const r = rnd(12); let s = ''; for (let i = 0; i < 12; i++) s += A[r[i] % A.length]; return s.match(/.{4}/g).join('-'); };
const normCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export const hasAccount = () => !!rec();
export const currentUser = () => (rec() || {}).user || '';
export const MIN_PASS = 6;
function checkNew(user, pass) {
  if (norm(user).length < 3) throw new Error('اسم المستخدم 3 أحرف على الأقل');
  if (String(pass || '').length < MIN_PASS) throw new Error(`كلمة السر ${MIN_PASS} أحرف على الأقل`);
}
async function build(user, pass, code, extra = {}) {
  const s1 = rnd(16), s2 = rnd(16);
  return { v: 1, user: norm(user), salt: b64(s1), hash: b64(await pbkdf2(pass, s1)), rsalt: b64(s2), rhash: b64(await pbkdf2(normCode(code), s2)), created: extra.created || Date.now() };
}

/** إنشاء الحساب (أول تشغيل). يرجع رمز الاسترداد ويجب عرضه للمستخدم مرة واحدة. */
export async function createAccount(user, pass) {
  if (hasAccount()) throw new Error('يوجد حساب بالفعل');
  checkNew(user, pass);
  const code = newCode();
  ls.set(K, JSON.stringify(await build(user, pass, code)));
  await openSession(false);
  return code;
}

// ---- حماية من التخمين: بعد 5 محاولات فاشلة ينتظر المستخدم وقتاً يتضاعف حتى 15 دقيقة ----
const fails = () => { try { return JSON.parse(ls.get(KF)) || { n: 0, until: 0 }; } catch { return { n: 0, until: 0 }; } };
export const lockLeft = () => Math.max(0, fails().until - Date.now());
function noteFail() {
  const f = fails(); f.n++;
  if (f.n >= 5) f.until = Date.now() + Math.min(900000, 30000 * 2 ** (f.n - 5));
  ls.set(KF, JSON.stringify(f));
}
const clearFails = () => ls.del(KF);
const waitMsg = () => { const s = Math.ceil(lockLeft() / 1000); return `محاولات كثيرة خاطئة — انتظري ${s >= 60 ? Math.ceil(s / 60) + ' دقيقة' : s + ' ثانية'}`; };

async function openSession(remember) {
  const tok = b64(rnd(24));
  try { sessionStorage.setItem(KS, tok); } catch { }
  const r = rec();
  if (remember && r) { r.rem = { h: b64(await sha(tok)), exp: Date.now() + 30 * 864e5 }; ls.set(K, JSON.stringify(r)); ls.set(KR, tok); }
  else { if (r && r.rem) { delete r.rem; ls.set(K, JSON.stringify(r)); } ls.del(KR); }
}
export async function login(user, pass, remember = false) {
  const r = rec(); if (!r) throw new Error('لا يوجد حساب');
  if (lockLeft() > 0) throw new Error(waitMsg());
  const h = await pbkdf2(String(pass || ''), unb64(r.salt));          // يُحسب دائماً لتجنب كشف صحة الاسم بالزمن
  if (norm(user) !== r.user || !same(h, unb64(r.hash))) { noteFail(); throw new Error(lockLeft() > 0 ? waitMsg() : 'اسم المستخدم أو كلمة السر غير صحيحة'); }
  clearFails(); await openSession(remember); return true;
}
/** استعادة الجلسة عند فتح التطبيق: جلسة الصفحة، أو «تذكرني» (30 يوماً) */
export async function restore() {
  const r = rec(); if (!r) return false;
  try { if (sessionStorage.getItem(KS)) return true; } catch { }
  const t = ls.get(KR); if (!t || !r.rem || r.rem.exp < Date.now()) return false;
  if (same(await sha(t), unb64(r.rem.h))) { try { sessionStorage.setItem(KS, t); } catch { } return true; }
  return false;
}
export function logout() { try { sessionStorage.removeItem(KS); } catch { } ls.del(KR); const r = rec(); if (r && r.rem) { delete r.rem; ls.set(K, JSON.stringify(r)); } }

/** تغيير اسم المستخدم و/أو كلمة السر (يتطلب كلمة السر الحالية) */
export async function changeCredentials(curPass, newUser, newPass) {
  const r = rec(); if (!r) throw new Error('لا يوجد حساب');
  if (!same(await pbkdf2(String(curPass || ''), unb64(r.salt)), unb64(r.hash))) throw new Error('كلمة السر الحالية غير صحيحة');
  const user = newUser && norm(newUser) ? newUser : r.user, pass = newPass ? newPass : null;
  if (norm(user).length < 3) throw new Error('اسم المستخدم 3 أحرف على الأقل');
  if (pass !== null && pass.length < MIN_PASS) throw new Error(`كلمة السر ${MIN_PASS} أحرف على الأقل`);
  r.user = norm(user);
  if (pass !== null) { const s = rnd(16); r.salt = b64(s); r.hash = b64(await pbkdf2(pass, s)); }
  delete r.rem; ls.del(KR); ls.set(K, JSON.stringify(r)); return true;
}
/** نسيان كلمة السر: رمز الاسترداد + كلمة سر جديدة. يرجع رمز استرداد جديداً (القديم يبطل). */
export async function resetWithCode(code, newPass) {
  const r = rec(); if (!r) throw new Error('لا يوجد حساب');
  if (lockLeft() > 0) throw new Error(waitMsg());
  if (String(newPass || '').length < MIN_PASS) throw new Error(`كلمة السر ${MIN_PASS} أحرف على الأقل`);
  if (!same(await pbkdf2(normCode(code), unb64(r.rsalt)), unb64(r.rhash))) { noteFail(); throw new Error(lockLeft() > 0 ? waitMsg() : 'رمز الاسترداد غير صحيح'); }
  const nc = newCode(); ls.set(K, JSON.stringify(await build(r.user, newPass, nc, { created: r.created })));
  clearFails(); await openSession(false); return nc;
}

// ---- القفل التلقائي عند الخمول ----
export const getAutoLock = () => +ls.get(KL) || 0;
export const setAutoLock = m => ls.set(KL, String(+m || 0));
export function startIdleWatch(onLock) {
  let last = Date.now(), hiddenAt = 0;
  const touch = () => { last = Date.now(); };
  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(e => addEventListener(e, touch, { passive: true }));
  const check = () => { const m = getAutoLock(); if (m > 0 && Date.now() - last > m * 60000) { logout(); onLock(); } };
  setInterval(check, 15000);
  document.addEventListener('visibilitychange', () => {
    const m = getAutoLock();
    if (document.hidden) hiddenAt = Date.now();
    else if (m > 0 && hiddenAt && Date.now() - hiddenAt > m * 60000) { logout(); onLock(); } else touch();
  });
}
