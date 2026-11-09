// فك الباركود من صورة رمادية (بدون مكتبات): EAN-13 / UPC-A / EAN-8 / Code128 — أفقي ورأسي ومقلوب
import { L_CODES, G_CODES, R_CODES, PARITY, C128, validEAN } from './barcode.js';

const runsOf = bits => { const o = []; let c = bits[0], n = 0; for (const b of bits) { if (b === c) n++; else { o.push(n); c = b; n = 1; } } o.push(n); return o; };
const LP = L_CODES.map(runsOf), GP = G_CODES.map(runsOf), RP = R_CODES.map(runsOf);
const CP = C128.map(s => [...s].map(Number));
const LG = [['L', LP], ['G', GP]], LO = [['L', LP]], RO = [['R', RP]];

function digit(runs, k, tabs) {
  const T = runs[k] + runs[k + 1] + runs[k + 2] + runs[k + 3]; if (!(T > 0)) return null;
  const f = 7 / T; let best = null;
  for (const [name, tab] of tabs) for (let d = 0; d < 10; d++) {
    const p = tab[d]; let e = 0;
    for (let j = 0; j < 4; j++) { const x = runs[k + j] * f - p[j]; e += x * x; }
    if (!best || e < best.e) best = { d, set: name, e };
  }
  return best && best.e < 0.9 ? best : null;
}
const guard = (runs, i, n, m) => { for (let j = 0; j < n; j++) { const r = runs[i + j] / m; if (r < 0.45 || r > 1.9) return false; } return true; };

function decodeEAN13(runs, i) {
  if (i + 59 > runs.length) return null;
  const m = (runs[i] + runs[i + 1] + runs[i + 2]) / 3;
  if (!guard(runs, i, 3, m) || (i > 0 && runs[i - 1] < m * 3) || !guard(runs, i + 27, 5, m) || !guard(runs, i + 56, 3, m)) return null;
  let par = '', d = '';
  for (let k = 0; k < 6; k++) { const r = digit(runs, i + 3 + k * 4, LG); if (!r) return null; par += r.set; d += r.d; }
  const first = PARITY.indexOf(par); if (first < 0) return null;
  for (let k = 0; k < 6; k++) { const r = digit(runs, i + 32 + k * 4, RO); if (!r) return null; d += r.d; }
  const code = first + d; return validEAN(code) ? { text: code, format: 'ean_13' } : null;
}
function decodeEAN8(runs, i) {
  if (i + 43 > runs.length) return null;
  const m = (runs[i] + runs[i + 1] + runs[i + 2]) / 3;
  if (!guard(runs, i, 3, m) || (i > 0 && runs[i - 1] < m * 3) || !guard(runs, i + 19, 5, m) || !guard(runs, i + 40, 3, m)) return null;
  let d = '';
  for (let k = 0; k < 4; k++) { const r = digit(runs, i + 3 + k * 4, LO); if (!r) return null; d += r.d; }
  for (let k = 0; k < 4; k++) { const r = digit(runs, i + 24 + k * 4, RO); if (!r) return null; d += r.d; }
  return validEAN(d) ? { text: d, format: 'ean_8' } : null;
}
function match128(runs, k, n) {
  let T = 0; for (let j = 0; j < n; j++) T += runs[k + j];
  if (!(T > 0)) return null;
  const f = (n === 7 ? 13 : 11) / T; let best = null;
  for (let v = n === 7 ? 106 : 0; v <= (n === 7 ? 106 : 105); v++) {
    const p = CP[v]; let e = 0;
    for (let j = 0; j < n; j++) { const x = runs[k + j] * f - p[j]; e += x * x; }
    if (!best || e < best.e) best = { v, e };
  }
  return best && best.e < (n === 7 ? 0.6 : 0.9) ? best : null;
}
function decode128(runs, i) {
  if (i + 13 > runs.length) return null;
  const st = match128(runs, i, 6); if (!st || st.v < 103 || st.v > 105) return null;
  const m = (runs[i] + runs[i + 1] + runs[i + 2] + runs[i + 3] + runs[i + 4] + runs[i + 5]) / 11;
  if (i > 0 && runs[i - 1] < m * 3) return null;
  const vals = [st.v]; let k = i + 6;
  for (; ;) {
    if (k + 7 <= runs.length && match128(runs, k, 7)) break;
    if (k + 6 > runs.length || vals.length > 80) return null;
    const s = match128(runs, k, 6); if (!s) return null;
    vals.push(s.v); k += 6;
  }
  if (vals.length < 4) return null;
  const check = vals.pop(); let sum = vals[0];
  for (let j = 1; j < vals.length; j++) sum += vals[j] * j;
  if (sum % 103 !== check) return null;
  let set = { 103: 'A', 104: 'B', 105: 'C' }[vals[0]], out = '';
  for (let j = 1; j < vals.length; j++) {
    const v = vals[j];
    if (set === 'C') { if (v < 100) out += String(v).padStart(2, '0'); else if (v === 100) set = 'B'; else if (v === 101) set = 'A'; }
    else if (v < 96) out += set === 'A' ? (v < 64 ? String.fromCharCode(v + 32) : '') : String.fromCharCode(v + 32);
    else if (v === 99) set = 'C'; else if (set === 'A' && v === 100) set = 'B'; else if (set === 'B' && v === 101) set = 'A';
  }
  return out.length >= 2 ? { text: out, format: 'code_128' } : null;
}

function toRuns(row) {
  const n = row.length; if (n < 40) return null;
  const s = new Float32Array(n); s[0] = row[0]; s[n - 1] = row[n - 1];
  for (let i = 1; i < n - 1; i++) s[i] = (row[i - 1] + 2 * row[i] + row[i + 1]) / 4;
  const blk = Math.max(6, Math.round(n / 40)), nb = Math.ceil(n / blk);
  const bmin = new Float32Array(nb).fill(255), bmax = new Float32Array(nb);
  for (let i = 0; i < n; i++) { const b = (i / blk) | 0; if (s[i] < bmin[b]) bmin[b] = s[i]; if (s[i] > bmax[b]) bmax[b] = s[i]; }
  const thr = new Float32Array(nb), ok = new Uint8Array(nb);
  for (let b = 0; b < nb; b++) {
    let lo = 255, hi = 0;
    for (let k = Math.max(0, b - 3); k <= Math.min(nb - 1, b + 3); k++) { if (bmin[k] < lo) lo = bmin[k]; if (bmax[k] > hi) hi = bmax[k]; }
    thr[b] = (lo + hi) / 2; ok[b] = hi - lo >= 40 ? 1 : 0;
  }
  const runs = []; let cur = -1, len = 0, first = 0;
  for (let i = 0; i < n; i++) {
    const b = (i / blk) | 0, d = ok[b] && s[i] < thr[b] ? 1 : 0;
    if (cur < 0) { cur = d; first = d; len = 1; } else if (d === cur) len++; else { runs.push(len); cur = d; len = 1; }
  }
  runs.push(len);
  return { runs, firstDark: first === 1 };
}
function tryRuns(runs, firstDark) {
  for (let i = firstDark ? 0 : 1; i < runs.length; i += 2) {
    const r = decodeEAN13(runs, i) || decodeEAN8(runs, i) || decode128(runs, i);
    if (r) return r;
  }
  return null;
}
/** فك سطر واحد من البيكسلات (قيم 0..255) */
export function decodeRow(row) {
  const t = toRuns(row); if (!t || t.runs.length < 20) return null;
  const r = tryRuns(t.runs, t.firstDark); if (r) return r;
  const lastDark = t.runs.length % 2 ? t.firstDark : !t.firstDark;   // الباركود مقلوب 180°
  return tryRuns([...t.runs].reverse(), lastDark);
}
/** فك إطار كامل: يمسح عدة صفوف وأعمدة في المنتصف ويرجع الأكثر تكراراً {text,format,count} */
export function decodeGray(gray, w, h, opts = {}) {
  const N = opts.rows || 21, found = new Map();
  const note = r => { if (r) { const o = found.get(r.text); if (o) o.count++; else found.set(r.text, { ...r, count: 1 }); } };
  const y0 = Math.floor(h * 0.2), y1 = Math.ceil(h * 0.8);
  for (let k = 0; k < N; k++) { const y = Math.round(y0 + (y1 - y0) * k / (N - 1)); note(decodeRow(gray.subarray(y * w, (y + 1) * w))); }
  if (!opts.noVertical) {
    const col = new Uint8Array(h), x0 = Math.floor(w * 0.2), x1 = Math.ceil(w * 0.8);
    for (let k = 0; k < N; k++) {
      const x = Math.round(x0 + (x1 - x0) * k / (N - 1));
      for (let y = 0; y < h; y++) col[y] = gray[y * w + x];
      note(decodeRow(col));
    }
  }
  let best = null; for (const v of found.values()) if (!best || v.count > best.count) best = v;
  return best;
}
