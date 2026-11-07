// طبقة التخزين المحلي: IndexedDB (تعمل بدون إنترنت) + معاملات ذرية (ACID)
const NAME = 'wms', VER = 1;
const STORES = {
  products: ['barcode'], batches: ['productId'], parties: ['type'],
  invoices: ['type', 'date'], ledger: ['partyId'], cash: ['date'],
  moves: ['productId'], damages: ['date']
};
export const ALL = [...Object.keys(STORES), 'settings'];
let dbp;
export const open = () => dbp || (dbp = new Promise((res, rej) => {
  const r = indexedDB.open(NAME, VER);
  r.onupgradeneeded = () => {
    const d = r.result;
    for (const [n, idx] of Object.entries(STORES)) {
      const s = d.createObjectStore(n, { keyPath: 'id', autoIncrement: true });
      idx.forEach(i => s.createIndex(i, i));
    }
    d.createObjectStore('settings', { keyPath: 'key' });
  };
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
}));
const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

/** تنفيذ مجموعة عمليات كوحدة واحدة: إما تنجح كلها أو تُلغى كلها عند أي خطأ */
export async function tx(names, fn, mode = 'readwrite') {
  const db = await open();
  const t = db.transaction(names, mode);
  const S = {};
  names.forEach(n => {
    const s = t.objectStore(n);
    S[n] = {
      get: k => req(s.get(k)), put: v => req(s.put(v)), add: v => req(s.add(v)),
      all: () => req(s.getAll()), del: k => req(s.delete(k)), clear: () => req(s.clear()),
      idx: (i, k) => req(s.index(i).getAll(k))
    };
  });
  const done = new Promise((res, rej) => {
    t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('تم إلغاء العملية'));
  });
  done.catch(() => {});
  try { const out = await fn(S); await done; return out; }
  catch (e) { try { t.abort(); } catch (_) {} throw e; }
}
export const getAll = n => tx([n], S => S[n].all(), 'readonly');
export const get = (n, k) => tx([n], S => S[n].get(k), 'readonly');
export const put = (n, v) => { if (!v.id && n !== 'settings') delete v.id; return tx([n], S => S[n].put(v)); };
export const del = (n, k) => tx([n], S => S[n].del(k));
export const setting = async (k, d) => { const r = await get('settings', k); return r ? r.value : d; };
export const setSetting = (k, v) => put('settings', { key: k, value: v });
export async function exportAll() { const o = {}; for (const n of ALL) o[n] = await getAll(n); return o; }
export const importAll = o => tx(ALL, async S => { for (const n of ALL) { await S[n].clear(); for (const v of o[n] || []) await S[n].put(v); } });
export const resetAll = () => tx(ALL, async S => { for (const n of ALL) await S[n].clear(); });
