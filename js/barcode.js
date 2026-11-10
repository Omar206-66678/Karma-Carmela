// توليد الباركود: EAN-13 / EAN-8 / Code128 (Set B) — رسم SVG حقيقي قابل للمسح
export const L_CODES = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
export const R_CODES = L_CODES.map(s => [...s].map(b => b === '1' ? '0' : '1').join(''));
export const G_CODES = R_CODES.map(s => [...s].reverse().join(''));
export const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
// أنماط Code128 (عرض الأعمدة والمسافات بالتناوب) — 0..105 رموز، 106 = Stop
export const C128 = ['212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412', '211214', '211232', '2331112'];

export const ean13Check = d12 => { let s = 0; for (let i = 0; i < 12; i++) s += +d12[i] * (i % 2 ? 3 : 1); return (10 - s % 10) % 10; };
export const ean8Check = d7 => { let s = 0; for (let i = 0; i < 7; i++) s += +d7[i] * (i % 2 ? 1 : 3); return (10 - s % 10) % 10; };
export function validEAN(c) {
  c = String(c);
  if (/^\d{13}$/.test(c)) return ean13Check(c.slice(0, 12)) === +c[12];
  if (/^\d{8}$/.test(c)) return ean8Check(c.slice(0, 7)) === +c[7];
  return false;
}
export function ean13Bits(code) {
  const p = PARITY[+code[0]]; let b = '101';
  for (let i = 1; i < 7; i++) b += (p[i - 1] === 'L' ? L_CODES : G_CODES)[+code[i]];
  b += '01010';
  for (let i = 7; i < 13; i++) b += R_CODES[+code[i]];
  return b + '101';
}
export function ean8Bits(code) {
  let b = '101';
  for (let i = 0; i < 4; i++) b += L_CODES[+code[i]];
  b += '01010';
  for (let i = 4; i < 8; i++) b += R_CODES[+code[i]];
  return b + '101';
}
export function code128Bits(text) {
  const vals = [104];
  for (const ch of String(text)) { const v = ch.charCodeAt(0) - 32; if (v < 0 || v > 95) throw new Error('حرف غير مدعوم في الباركود'); vals.push(v); }
  let sum = 104; for (let i = 1; i < vals.length; i++) sum += vals[i] * i;
  vals.push(sum % 103, 106);
  let bits = '', dark = true;
  for (const v of vals) for (const w of C128[v]) { bits += (dark ? '1' : '0').repeat(+w); dark = !dark; }
  return bits;
}
export function barcodeBits(code) {
  code = String(code);
  if (/^\d{13}$/.test(code) && validEAN(code)) return ean13Bits(code);
  if (/^\d{8}$/.test(code) && validEAN(code)) return ean8Bits(code);
  return code128Bits(code);
}
/** SVG جاهز للعرض والطباعة (خلفية بيضاء دائماً لضمان قابلية المسح) */
export function barcodeSvg(code, { h = 56, mod = 2, text = true, quiet = 10 } = {}) {
  code = String(code); const bits = barcodeBits(code);
  const w = (bits.length + quiet * 2) * mod, th = text ? 16 : 0; let rects = '';
  for (let i = 0; i < bits.length;) {
    if (bits[i] === '1') { let j = i; while (bits[j] === '1') j++; rects += `<rect x="${(quiet + i) * mod}" y="0" width="${(j - i) * mod}" height="${h}"/>`; i = j; } else i++;
  }
  const label = text ? `<text x="${w / 2}" y="${h + 13}" text-anchor="middle" font-family="monospace" font-size="12" fill="#000">${code.replace(/[<&>]/g, '')}</text>` : '';
  return `<svg class="bcsvg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h + th}" preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges"><rect width="${w}" height="${h + th}" fill="#fff"/><g fill="#000">${rects}</g>${label}</svg>`;
}
export const makeEAN13 = body12 => body12 + ean13Check(body12);