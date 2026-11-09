// قارئ الباركود بالكاميرا: BarcodeDetector (إن وُجد) + فك داخلي يعمل على كل المتصفحات
import { decodeGray } from './decoder.js';
import { ic } from './ui.js';

function beep() {
  try {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
    const c = new A(), o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination); o.type = 'sine'; o.frequency.value = 880; g.gain.value = 0.12;
    o.start(); o.stop(c.currentTime + 0.14); setTimeout(() => c.close(), 400);
  } catch { }
  try { navigator.vibrate && navigator.vibrate(120); } catch { }
}

/**
 * يفتح نافذة المسح. onCode(code) تُستدعى عند قراءة باركود.
 * continuous=true: تبقى الكاميرا مفتوحة لمسح عدة أصناف متتالية (مناسب لنقطة البيع).
 */
export function scanBarcode(onCode, { continuous = false } = {}) {
  const ov = document.createElement('div'); ov.className = 'scn';
  ov.innerHTML = `<div class="scn-box">
    <div class="scn-hd"><div><h2>${continuous ? 'مسح مستمر' : 'مسح باركود'}</h2><small>EAN-13 • EAN-8 • UPC • Code128 • QR</small></div><button class="ibtn" id="scx" aria-label="إغلاق">${ic('x', 20)}</button></div>
    <div class="scn-vid"><video playsinline muted autoplay></video><div class="scn-ring"><i></i><i></i><i></i><i></i></div><div class="scn-line"></div><div class="scn-msg" id="scm">جارٍ تشغيل الكاميرا…</div></div>
    <div class="scn-bd">
      <div id="scl" class="scn-last" hidden></div>
      <button class="btn out full" id="sct" hidden>${ic('zap', 18)} تشغيل الكشاف</button>
      <label>إدخال يدوي أو قارئ USB<div class="row"><input id="scin" dir="ltr" inputmode="numeric" autocomplete="off" placeholder="6221000000011"><button class="btn" id="scok">${ic('keyboard', 18)} إدخال</button></div></label>
      <small class="muted">ضع الباركود داخل الإطار على بعد 10–20 سم وبإضاءة جيدة. يعمل أيضاً مقلوباً أو عمودياً.</small>
    </div></div>`;
  document.body.append(ov);
  const $ = s => ov.querySelector(s), vid = $('video'), msg = $('#scm');
  let alive = true, stream = null, detector = null, tick = 0, prev = null, lastCode = '', lastAt = 0, timer = 0;
  const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });

  const close = () => {
    if (!alive) return; alive = false; clearTimeout(timer);
    try { stream && stream.getTracks().forEach(t => t.stop()); } catch { }
    document.removeEventListener('keydown', onKey); ov.remove();
  };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  $('#scx').onclick = close;

  const accept = (code, force) => {
    const now = Date.now();
    if (!force && code === lastCode && now - lastAt < 1500) return;
    lastCode = code; lastAt = now; beep();
    if (continuous) {
      const l = $('#scl'); l.hidden = false; l.innerHTML = `${ic('check', 18)} <b dir="ltr">${code.replace(/[<&>]/g, '')}</b>`;
      onCode(code);
    } else { close(); onCode(code); }
  };
  const manual = () => { const i = $('#scin'), v = i.value.trim(); if (!v) return; i.value = ''; accept(v, true); };
  $('#scok').onclick = manual;
  $('#scin').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); manual(); } };

  async function loop() {
    if (!alive) return;
    const t0 = performance.now();
    if (vid.readyState >= 2 && vid.videoWidth) {
      let res = null;
      if (detector) { try { const r = await detector.detect(vid); if (r && r[0] && r[0].rawValue) res = r[0].rawValue; } catch { } }
      if (!res && alive && (!detector || tick % 2 === 0)) {
        const sc = Math.min(1, 960 / vid.videoWidth);
        cv.width = Math.round(vid.videoWidth * sc); cv.height = Math.round(vid.videoHeight * sc);
        cx.drawImage(vid, 0, 0, cv.width, cv.height);
        const px = cx.getImageData(0, 0, cv.width, cv.height).data, g = new Uint8Array(cv.width * cv.height);
        for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = (px[j] * 77 + px[j + 1] * 150 + px[j + 2] * 29) >> 8;
        const r = decodeGray(g, cv.width, cv.height);
        if (r && (r.count >= 2 || r.text === prev)) res = r.text;
        prev = r ? r.text : null;
      }
      tick++;
      if (res && alive) accept(res);
    }
    if (alive) timer = setTimeout(loop, Math.max(0, 90 - (performance.now() - t0)));
  }

  (async () => {
    try {
      if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('insecure');
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      if (!alive) { stream.getTracks().forEach(t => t.stop()); return; }
      vid.srcObject = stream; await vid.play().catch(() => { });
      const tr = stream.getVideoTracks()[0], caps = (tr.getCapabilities && tr.getCapabilities()) || {};
      if (caps.focusMode && caps.focusMode.includes('continuous')) tr.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => { });
      if (caps.torch) {
        const b = $('#sct'); b.hidden = false; let on = false;
        b.onclick = async () => { on = !on; try { await tr.applyConstraints({ advanced: [{ torch: on }] }); b.classList.toggle('on', on); } catch { } };
      }
      if ('BarcodeDetector' in window) {
        try {
          const sup = await window.BarcodeDetector.getSupportedFormats();
          const f = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'itf', 'codabar', 'qr_code'].filter(x => sup.includes(x));
          detector = new window.BarcodeDetector(f.length ? { formats: f } : undefined);
        } catch { detector = null; }
      }
      msg.hidden = true; loop();
    } catch (e) {
      msg.hidden = false;
      msg.textContent = e.message === 'insecure' ? 'الكاميرا تعمل فقط عبر اتصال آمن (https) — جرّب من رابط GitHub Pages أو استخدم الإدخال اليدوي.'
        : e.name === 'NotAllowedError' ? 'تم رفض إذن الكاميرا — فعّله من إعدادات المتصفح ثم أعد المحاولة.'
          : 'تعذّر تشغيل الكاميرا — استخدم الإدخال اليدوي.';
    }
  })();
  return close;
}
