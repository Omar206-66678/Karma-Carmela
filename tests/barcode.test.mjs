// تشغيل: node tests/barcode.test.mjs  — يختبر توليد الباركود وفكّه من صورة مُحاكاة (ضبابية + ضوضاء + مقلوب + عمودي)
import * as B from '../js/barcode.js';
import { decodeGray } from '../js/decoder.js';
B.C128.forEach((s, i) => { const t = [...s].reduce((a, b) => a + +b, 0); if (t !== (i === 106 ? 13 : 11)) throw new Error('جدول Code128 خاطئ عند ' + i); });
function render(bits, { mod = 3, quiet = 14, h = 120, noise = 10, rev = false, vertical = false } = {}) {
  const b = rev ? [...bits].reverse().join('') : bits, W = (b.length + quiet * 2) * mod + 80, H = h + 60, img = new Uint8Array(W * H).fill(235);
  for (let y = 30; y < 30 + h; y++) for (let i = 0; i < b.length; i++) if (b[i] === '1') for (let m = 0; m < mod; m++) img[y * W + 40 + quiet * mod + i * mod + m] = 25;
  const o = img.slice(); for (let y = 0; y < H; y++) for (let x = 1; x < W - 1; x++) img[y * W + x] = (o[y * W + x - 1] + o[y * W + x] + o[y * W + x + 1]) / 3 | 0;
  for (let i = 0; i < img.length; i++) img[i] = Math.max(0, Math.min(255, img[i] + (Math.random() - .5) * noise * 2));
  if (!vertical) return { g: img, w: W, h: H };
  const t = new Uint8Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) t[x * H + y] = img[y * W + x]; return { g: t, w: H, h: W };
}
const codes = [B.makeEAN13('622100000001'), B.makeEAN13('200000000001'), '4006381333931', '96385074', 'S00012', 'PO-184', '1234567890'];
let fails = 0, n = 0;
for (const code of codes) for (const opt of [{}, { rev: true }, { vertical: true }, { mod: 4 }, { mod: 5, noise: 20 }]) {
  n++; const r = render(B.barcodeBits(code), opt), d = decodeGray(r.g, r.w, r.h);
  if (!d || d.text !== code) { fails++; console.log('FAIL', code, JSON.stringify(opt), d && d.text); }
}
const noise = decodeGray(new Uint8Array(600 * 200).map(() => Math.random() * 255), 600, 200);
if (noise) { fails++; console.log('قراءة خاطئة من ضوضاء:', noise.text); }
console.log(fails ? `فشل ${fails} من ${n}` : `نجحت كل الحالات (${n}) + لا قراءات خاطئة من الضوضاء`);
process.exit(fails ? 1 : 0);
