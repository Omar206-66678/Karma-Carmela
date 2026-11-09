import { setting, setSetting, exportAll, importAll, resetAll, validateBackup } from '../db.js';
import { esc } from '../core.js';
import { $, toast } from '../ui.js';
import { saveProduct } from '../services.js';
import { put } from '../db.js';

export const more = {
  title: 'المزيد',
  render(el) {
    el.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <a href="#/invoices" style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-card); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); text-decoration: none; color: var(--text-main); box-shadow: var(--shadow-card); transition: var(--transition);">
          <div style="display: flex; align-items: center; gap: 14px;">
            <span style="font-size: 22px; background: var(--primary-light); width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px;">🧾</span>
            <div>
              <div style="font-weight: 600; font-size: 15px;">الفواتير والمرتجعات</div>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">استعراض ومتابعة فواتير البيع والشراء</div>
            </div>
          </div>
          <span style="color: var(--text-muted); font-size: 14px;">◀</span>
        </a>

        <a href="#/parties" style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-card); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); text-decoration: none; color: var(--text-main); box-shadow: var(--shadow-card); transition: var(--transition);">
          <div style="display: flex; align-items: center; gap: 14px;">
            <span style="font-size: 22px; background: var(--primary-light); width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px;">👥</span>
            <div>
              <div style="font-weight: 600; font-size: 15px;">العملاء والموردون</div>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">إدارة حسابات وأرصدة الأطراف</div>
            </div>
          </div>
          <span style="color: var(--text-muted); font-size: 14px;">◀</span>
        </a>

        <a href="#/cash" style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-card); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); text-decoration: none; color: var(--text-main); box-shadow: var(--shadow-card); transition: var(--transition);">
          <div style="display: flex; align-items: center; gap: 14px;">
            <span style="font-size: 22px; background: var(--primary-light); width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px;">💰</span>
            <div>
              <div style="font-weight: 600; font-size: 15px;">الخزنة والمصروفات</div>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">حركات النقدية، الوارد، والمصروفات</div>
            </div>
          </div>
          <span style="color: var(--text-muted); font-size: 14px;">◀</span>
        </a>

        <a href="#/reports" style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-card); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); text-decoration: none; color: var(--text-main); box-shadow: var(--shadow-card); transition: var(--transition);">
          <div style="display: flex; align-items: center; gap: 14px;">
            <span style="font-size: 22px; background: var(--primary-light); width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px;">📊</span>
            <div>
              <div style="font-weight: 600; font-size: 15px;">التقارير وصافي الربح</div>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">تقارير الأداء المالي والمخزون</div>
            </div>
          </div>
          <span style="color: var(--text-muted); font-size: 14px;">◀</span>
        </a>

        <a href="#/settings" style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-card); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); text-decoration: none; color: var(--text-main); box-shadow: var(--shadow-card); transition: var(--transition);">
          <div style="display: flex; align-items: center; gap: 14px;">
            <span style="font-size: 22px; background: var(--primary-light); width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px;">⚙️</span>
            <div>
              <div style="font-weight: 600; font-size: 15px;">الإعدادات والنسخ الاحتياطي</div>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">إعدادات المنشأة والبيانات</div>
            </div>
          </div>
          <span style="color: var(--text-muted); font-size: 14px;">◀</span>
        </a>
      </div>
    `;
  }
};

export const title = 'الإعدادات';
export async function render(el) {
  const g = (k, d) => setting(k, d);
  const [co, ph, ad, cu, cs] = await Promise.all([g('company', 'مخزن الجملة'), g('phone', ''), g('address', ''), g('currency', 'ج.م'), g('costing', 'wac')]);
  
  el.innerHTML = `
    <div class="card">
      <h3 style="margin-bottom: 14px; font-size: 16px; color: var(--text-main);">🏢 بيانات المنشأة والنظام</h3>
      <label>اسم المنشأة<input id="co" value="${esc(co)}"></label>
      <label>الهاتف<input id="ph" value="${esc(ph)}"></label>
      <label>العنوان<input id="ad" value="${esc(ad)}"></label>
      <label>العملة<input id="cu" value="${esc(cu)}"></label>
      <label>طريقة حساب التكلفة
        <select id="cs">
          <option value="wac" ${cs === 'wac' ? 'selected' : ''}>المتوسط المرجح (Weighted Average)</option>
          <option value="fifo" ${cs === 'fifo' ? 'selected' : ''}>الأول دخولاً أول خروجاً (FIFO) — حسب الشحنة</option>
        </select>
      </label>
      <button class="btn full" id="sv">حفظ الإعدادات</button>
    </div>

    <div class="card">
      <h3 style="margin-bottom: 6px; font-size: 16px; color: var(--text-main);">💾 النسخ الاحتياطي والأمان</h3>
      <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 14px;">البيانات محفوظة على الجهاز فقط. صدّر نسخة بشكل دوري لضمان الأمان.</p>
      <button class="btn alt full" id="ex">⬇️ تصدير نسخة احتياطية</button>
      <label class="btn alt full" style="text-align:center; display:block; cursor:pointer; margin-top: 10px;">⬆️ استرجاع نسخة<input type="file" id="im" accept=".json" hidden></label>
    </div>

    <div class="card">
      <h3 style="margin-bottom: 10px; font-size: 16px; color: var(--text-main);">🛠️ أدوات النظام</h3>
      <button class="btn alt full" id="demo" style="margin-bottom: 10px;">🧪 إضافة بيانات تجريبية</button>
      <button class="btn bad full" id="rs">🗑 مسح كل البيانات</button>
    </div>
  `;

  $('#sv', el).onclick = async () => { 
    for (const [k, i] of [['company', 'co'], ['phone', 'ph'], ['address', 'ad'], ['currency', 'cu'], ['costing', 'cs']]) {
      await setSetting(k, $('#' + i, el).value.trim()); 
    }
    toast('تم الحفظ ✓'); 
  };

  $('#ex', el).onclick = async () => {
    const a = document.createElement('a'); 
    a.href = URL.createObjectURL(new Blob([JSON.stringify(await exportAll())], { type: 'application/json' }));
    a.download = `wms-backup-${new Date().toISOString().slice(0, 10)}.json`; 
    a.click();
  };

  $('#im', el).onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      let data; 
      try { data = JSON.parse(await f.text()); } catch { throw new Error('ملف غير صالح: ليس بصيغة JSON'); }
      validateBackup(data);
      if (!confirm('سيتم استبدال كل البيانات الحالية. متابعة؟')) return;
      await importAll(data); 
      toast('تم الاسترجاع ✓'); 
      location.hash = '#/'; 
      location.reload();
    } catch (err) { 
      toast(err.message || 'ملف غير صالح'); 
    } finally { 
      e.target.value = ''; 
    }
  };

  $('#rs', el).onclick = async () => { 
    if (confirm('حذف كل البيانات نهائياً؟') && confirm('تأكيد أخير: لا يمكن التراجع!')) { 
      await resetAll(); 
      toast('تم المسح'); 
      location.hash = '#/'; 
    } 
  };

  $('#demo', el).onclick = async () => {
    const mk = (name, cat, bc, big, f, cost, wh, rt, open) => saveProduct({ name, category: cat, barcode: bc, baseUnit: 'قطعة', units: [{ name: 'قطعة', factor: 1 }, { name: big, factor: f }], minStock: f * 2, tiers: [], prices: { cost, wholesale: wh, semi: +(wh * 1.05).toFixed(2), retail: rt } }, open, cost);
    try {
      await mk('أرز 1 كجم', 'حبوب', '6221000000011', 'كرتونة', 12, 30, 34, 40, 120);
      await mk('سكر 1 كجم', 'حبوب', '6221000000028', 'كرتونة', 10, 28, 31, 36, 100);
      await mk('زيت عباد 1 لتر', 'زيوت', '6221000000035', 'كرتونة', 12, 60, 66, 75, 96);
      await mk('مكرونة 400 جم', 'معلبات', '6221000000042', 'كرتونة', 20, 9, 10.5, 13, 200);
      await put('parties', { type: 'customer', name: 'سوبر ماركت النور', phone: '01000000000', group: 'wholesale', creditLimit: 50000, balance: 0 });
      await put('parties', { type: 'supplier', name: 'شركة التوريدات الغذائية', phone: '01111111111', balance: 0 });
      toast('تمت إضافة البيانات التجريبية ✓');
    } catch (e) { 
      toast(e.message); 
    }
  };
}
