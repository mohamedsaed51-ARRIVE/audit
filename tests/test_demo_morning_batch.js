// Real-browser test: حفظ دفعة المطابقة الصباحية (saveMorningBatch) في وضع ?demo=1 باستخدام دالة الحفظ التجريبية
// المضمَّنة في app/index.html نفسها (mockApiPost) — بلا استبدال apiPost بنسخة محاكاة داخل الاختبار.
// لا يوجد أي اتصال خارجي: كل ما ليس file:// يُحجَب، ويُتحقَّق من عدم خروج أي طلب إلى script.google.com.
// سبب وجوده: كانت mockApiPost ترمي TypeError لأن بيانات MOCK لا تحتوي المصفوفة computed، فيظهر "تعذّر الاتصال".
const { chromium } = require('playwright');
const path = require('path');

const PAGES = [
  { label: 'app/index.html', file: path.join(__dirname, '../app/index.html') },
  { label: 'index.html (الجذر)', file: path.join(__dirname, '../index.html') },
];
const BR_A = 'المعادي', BR_B = 'المنصورة';

async function main() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const results = [];
  const check = (name, cond, detail) => results.push({ name, pass: !!cond, detail });
  const jsErrors = [];

  for (const p of PAGES) {
    const L = `[${p.label}]`;
    const page = await browser.newPage();
    page.on('pageerror', err => jsErrors.push(p.label + ': ' + err.message));
    const external = [];
    await page.route('**/*', route => {
      const u = route.request().url();
      if (u.startsWith('file:')) return route.continue();
      external.push(u);
      return route.abort();
    });
    await page.goto('file://' + p.file + '?demo=1');
    await page.waitForSelector('#appShell:not(.hidden)');

    // الدالة المستخدمة هي mockApiPost الأصلية (لم تُستبدل)، ولا يوجد أي اعتراض للاستدعاءات هنا.
    check(`${L} apiPost هي دالة الحفظ التجريبية الأصلية (mockApiPost) وليست نسخة محاكاة`, await page.evaluate(() => window.apiPost.name) === 'mockApiPost');

    // ---- (1) استدعاء مباشر لدالة الحفظ التجريبية ----
    const direct = await page.evaluate(async ([a, b]) => {
      try {
        return await apiPost({ action: 'saveMorningBatch', type: 'MorningPickup', clientRequestId: 'demo-direct-1', rows: [
          { branch: a, data: { matching_date: '2026-09-20', branch_notification_time: '09:30', sent_shipments: '10', received_shipments: '7', receiver_employee: 'أحمد سالم' } },
          { branch: b, data: { matching_date: '2026-09-20', branch_notification_time: '09:40', sent_shipments: '4', received_shipments: '0' } },
        ] });
      } catch (e) { return { threw: e.message }; }
    }, [BR_A, BR_B]);
    check(`${L} saveMorningBatch لا يرمي استثناء`, !direct.threw, direct.threw);
    check(`${L} الاستجابة ok=true مع Batch ID وسجلين وفرعين`,
      direct.ok === true && !!direct.batchId && Array.isArray(direct.recordIds) && direct.recordIds.length === 2 &&
      JSON.stringify(direct.branches) === JSON.stringify([BR_A, BR_B]), JSON.stringify(direct).slice(0, 300));
    check(`${L} أرقام السجلات المُعادة تحمل البادئة PKM- للبيك أب وتختلف عن بعضها`,
      (direct.recordIds || []).every(id => /^PKM-\d+$/.test(id)) && new Set(direct.recordIds || []).size === 2, direct.recordIds);

    // ---- (2) نوع غير صالح لهذه العملية يُرفض بوضوح ----
    const bad = await page.evaluate(async () => await apiPost({ action: 'saveMorningBatch', type: 'Issues', rows: [], clientRequestId: 'x' }));
    check(`${L} نوع غير صالح لـ saveMorningBatch يُرفض (ok=false) دون استثناء`, bad.ok === false && typeof bad.error === 'string', bad);

    // ---- (3) المسار الكامل من الواجهة (نقر فعلي) بدون أي استبدال لـ apiPost ----
    await page.click('nav >> text=تسجيل رقابة');
    await page.click('.type-card >> text=المطابقة الصباحية - مرتجعات');
    await page.waitForSelector('#mnBranchChips');
    await page.check(`#mnBranchChips input[data-branch="${BR_A}"]`);
    const fid = async k => '#' + await page.evaluate(n => mnSafeId(n), BR_A) + '_' + k;
    await page.fill(await fid('matching_date'), '2026-09-21');
    await page.fill(await fid('branch_notification_time'), '10:15');
    await page.fill(await fid('sent_shipments'), '4');
    await page.fill(await fid('received_shipments'), '0');
    await page.click('#saveBtn');
    await page.waitForSelector('#formMsg .msg.ok, #formMsg .msg.err', { timeout: 5000 });
    const uiMsg = await page.textContent('#formMsg');
    check(`${L} الحفظ من الواجهة (مرتجعات) ينجح: "تم حفظ 1 سجل بنجاح" مع رقم RTM- وBatch ID`,
      uiMsg.includes('تم حفظ 1 سجل بنجاح') && /RTM-\d+/.test(uiMsg) && uiMsg.includes('Batch ID'), uiMsg);
    check(`${L} لا تظهر رسالة "تعذّر الاتصال" بعد الحفظ`, !uiMsg.includes('تعذّر الاتصال'), uiMsg);
    check(`${L} بعد النجاح صُفِّرت البطاقات والاختيارات`,
      (await page.$$('#mnBranchCards .branch-card')).length === 0 && (await page.$$('#mnBranchChips input:checked')).length === 0);

    check(`${L} صفر طلبات خارجية (لا script.google.com ولا غيره سوى ما حُجب)`, !external.some(u => /script\.google(usercontent)?\.com/.test(u)), external);
    await page.close();
  }

  console.log('\nJS errors captured:', jsErrors.length ? JSON.stringify(jsErrors, null, 2) : 'none');
  console.log(results.map(r => (r.pass ? 'PASS' : 'FAIL - ' + JSON.stringify(r.detail)) + ' - ' + r.name).join('\n'));
  const pass = results.filter(r => r.pass).length;
  console.log(`\n${pass} / ${results.length} اختبارًا ناجحًا (Playwright — saveMorningBatch الفعلي في وضع ?demo=1، بلا اتصال خارجي)`);
  await browser.close();
  if (pass !== results.length || jsErrors.length) process.exit(1);
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
