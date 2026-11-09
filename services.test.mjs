// تشغيل: node tests/services.test.mjs — يختبر المنطق المالي على قاعدة بيانات في الذاكرة
import fs from 'fs'; import os from 'os'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
const src = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'js'), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kk-'));
fs.cpSync(src, path.join(tmp, 'js'), { recursive: true }); fs.writeFileSync(path.join(tmp, 'package.json'), '{"type":"module"}');
fs.writeFileSync(path.join(tmp, 'js', 'db.js'), `
export const ALL=['products','categories','batches','parties','invoices','ledger','cash','moves','damages','settings'];
const data={};ALL.forEach(n=>data[n]={m:new Map(),id:0});const cl=v=>JSON.parse(JSON.stringify(v));
export async function tx(names,fn){const S={};names.forEach(n=>{const s=data[n],kp=n==='settings'?'key':'id';
 S[n]={get:async k=>{const v=s.m.get(k);return v?cl(v):undefined},put:async v=>{if(n!=='settings'&&v.id==null)v.id=++s.id;s.m.set(v[kp],cl(v));return v[kp]},add:async v=>{v.id=++s.id;s.m.set(v.id,cl(v));return v.id},all:async()=>[...s.m.values()].map(cl),del:async k=>{s.m.delete(k)},idx:async(i,k)=>[...s.m.values()].filter(x=>x[i]===k).map(cl)}});return fn(S)}
export const getAll=n=>tx([n],S=>S[n].all());export const get=(n,k)=>tx([n],S=>S[n].get(k));
export const setting=async(k,d)=>{const r=await get('settings',k);return r?r.value:d};`);
const sv = await import(pathToFileURL(path.join(tmp, 'js', 'services.js'))), db = await import(pathToFileURL(path.join(tmp, 'js', 'db.js'))), rp = await import(pathToFileURL(path.join(tmp, 'js', 'reports.js'))), core = await import(pathToFileURL(path.join(tmp, 'js', 'core.js')));
const eq = (a, b, m) => { if (Math.abs(a - b) > 0.011) throw new Error(`${m}: ${a} != ${b}`); console.log('ok', m, a); };
const p = await sv.saveProduct({ name: 'أرز', barcode: '1', units: [{ name: 'قطعة', factor: 1 }, { name: 'كرتونة', factor: 10 }], prices: { cost: 10, wholesale: 15, semi: 15, retail: 18 }, tiers: [] });
const pu = await sv.createPurchase({ items: [{ productId: p.id, unitIdx: 0, qty: 100, price: 10, exp: '2030-01-01' }], discount: 100, paid: 900 });
let P = (await db.getAll('products'))[0]; eq(P.avgCost, 9, 'متوسط التكلفة بعد خصم المورد'); eq(P.qty, 100, 'الكمية');
const sa = await sv.createSale({ items: [{ productId: p.id, unitIdx: 0, qty: 10, price: 15 }], discount: 15, method: 'انستاباي' });
eq(sa.total, 135, 'إجمالي البيع'); eq(sa.items[0].disc, 15, 'توزيع الخصم'); eq(sa.cogs, 90, 'COGS'); if (sa.method !== 'انستاباي') throw new Error('طريقة الدفع');
const rt = await sv.returnDoc('sale', sa.id, [{ idx: 0, qty: 5, cond: 'good' }], 'cash'); eq(rt.total, 67.5, 'مرتجع صافٍ');
const s = await rp.summary('0000', '9999'); eq(s.sales - s.sret, 67.5, 'صافي المبيعات'); eq(s.gross, 22.5, 'مجمل الربح');
const pr = await sv.returnDoc('purchase', pu.id, [{ idx: 0, qty: 20 }], 'cash'); eq(pr.total, 180, 'مرتجع مشتريات صافٍ');
P = (await db.getAll('products'))[0]; eq(P.qty, 75, 'المخزون النهائي'); eq(P.avgCost, 9, 'المتوسط ثابت');
try { await sv.createSale({ items: [{ productId: p.id, unitIdx: 0, qty: 1, price: 15 }], discount: 20 }); throw new Error('لم يُرفض'); } catch (e) { if (e.message === 'لم يُرفض') throw e; console.log('ok رفض الخصم الأكبر:', e.message); }
// أطراف وأرصدة
const c = await sv.saveParty({ type: 'customer', name: 'عميل', group: 'wholesale', creditLimit: 500, balance: 0 }, 100);
const sa2 = await sv.createSale({ partyId: c.id, items: [{ productId: p.id, unitIdx: 0, qty: 10, price: 15 }], paid: 0, method: 'آجل' });
let C = (await db.getAll('parties'))[0]; eq(C.balance, 250, 'رصيد العميل (افتتاحي 100 + آجل 150)');
await sv.payParty(c.id, 50, 'دفعة', 'كاش'); C = (await db.getAll('parties'))[0]; eq(C.balance, 200, 'بعد الدفعة');
// باركود داخلي صحيح
const bc = await sv.nextBarcode(); const B = await import(pathToFileURL(path.join(tmp, 'js', 'barcode.js'))); if (!B.validEAN(bc)) throw new Error('باركود داخلي غير صالح'); console.log('ok باركود داخلي', bc);
// تصنيفات
await sv.ensureCategories(); const cats = await db.getAll('categories'); if (cats.length < 5) throw new Error('التصنيفات'); console.log('ok تصنيفات', cats.length);
// تفقيط
for (const [n, e] of [[135, 'مائة وخمسة وثلاثون جنيه مصري'], [2500, 'ألفان وخمسمائة جنيه مصري'], [1250.5, 'ألف ومائتان وخمسون جنيه مصري وخمسون قرشًا']]) { const t = core.tafqeet(n); console.log(t === e ? 'ok' : 'تحقق يدوياً', n, '→', t); }
console.log('كل اختبارات الخدمات نجحت');
