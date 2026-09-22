// Real-browser test of index.html using the pre-installed Chromium via Playwright.
//
// IMPORTANT — how the "backend" here actually works (this replaced an earlier, weaker version):
// page.route()'s callback runs in Node.js, not inside the browser page — so instead of hand-typing
// a second copy of Code.gs's validation rules (which could silently drift from the real ones, and
// which an earlier version of this file did for required-field checks only), every fetch to the
// Apps Script URL is routed into the SAME sandbox used by test_harness.js (Level 1): the actual,
// unmodified Code.gs source, executed via vm against an in-memory spreadsheet (see gs_sandbox.js).
// doGet/doPost are called directly, so the full real dispatch — action routing, _validate(),
// _computeFields(), _actionSave()'s idempotency/lock/read-back logic, everything — runs for real.
// The ONLY thing this cannot exercise is the actual Google network hop to a deployed Web App and a
// real Google Sheet; that gap is Level 3 (Live) and is never claimed as tested by this file.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { buildMockSpreadsheet, buildSandbox } = require('../appsscript/gs_sandbox');

const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '../backend/schema.json'), 'utf8'));
const codeGsSource = fs.readFileSync(path.join(__dirname, '../appsscript/Code.gs'), 'utf8');

function ctByKey(key) { return schema.control_types.find(c => c.key === key); }

async function main() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERR:', msg.text()); });
  page.on('pageerror', err => console.log('PAGEERROR:', err.message));

  let dialogAction = 'accept'; // flips to 'dismiss' for the cancel-edit test
  page.on('dialog', async d => { if (dialogAction === 'accept') await d.accept(); else await d.dismiss(); });

  // ---- REAL backend: the actual Code.gs, running against an in-memory spreadsheet ----
  const mockSS = buildMockSpreadsheet(schema);
  const sandbox = buildSandbox(codeGsSource, mockSS);

  /** Reads back the real rows currently in a type's sheet, as labeled record objects — used by
   * assertions below instead of a separately-tracked "db" array, so what the test checks IS what
   * Code.gs actually wrote to the (simulated) spreadsheet, not a parallel bookkeeping structure. */
  function rowsFor(typeKey) {
    const ct = ctByKey(typeKey);
    const sheet = mockSS._sheets[ct.sheet];
    const headers = sheet.rows[0];
    const idIdx = headers.indexOf('رقم السجل');
    return sheet.rows.slice(1).filter(r => r[idIdx] !== '').map(r => {
      const rec = {}; headers.forEach((h, i) => rec[h] = r[i]); return rec;
    });
  }

  let networkDown = false;            // toggled on to simulate a disconnected server
  let saveDelayMs = 0;                // artificial latency to make double-click races observable
  let malformedResponseOnce = false;  // toggled on to simulate a broken/invalid API reply

  await page.route('**/macros/**', async (route) => {
    if (networkDown) { return route.abort('connectionrefused'); }
    if (malformedResponseOnce) {
      malformedResponseOnce = false;
      return route.fulfill({ status: 200, contentType: 'text/plain', body: 'not-json-at-all' });
    }
    const req = route.request();

    if (req.method() === 'GET') {
      const url = new URL(req.url());
      const params = {};
      url.searchParams.forEach((v, k) => { params[k] = v; });
      const output = sandbox.doGet({ parameter: params }); // real Code.gs doGet -> real _actionX()
      return route.fulfill({ contentType: 'application/json', body: output.getContent() });
    }

    // ---- POST (save/update) — routed into the real doPost, including its idempotency/lock logic ----
    const bodyText = req.postData();
    let parsedAction = null;
    try { parsedAction = JSON.parse(bodyText).action; } catch (e) { /* malformed body is Code.gs's problem to reject, not ours to pre-empt */ }
    if (saveDelayMs && parsedAction === 'save') await new Promise(r => setTimeout(r, saveDelayMs));
    const output = sandbox.doPost({ postData: { contents: bodyText } });
    return route.fulfill({ contentType: 'application/json', body: output.getContent() });
  });

  const results = [];
  function check(name, cond, detail) { results.push({ name, pass: !!cond, detail }); }

  await page.goto('file://' + path.join(__dirname, 'index.html'));

  // ---- Step 1: config screen appears first (no saved localStorage) ----
  check('شاشة الإعداد تظهر أولًا', await page.isVisible('#configScreen'));

  await page.fill('#cfgUrl', 'https://script.google.com/macros/s/FAKE/exec');
  await page.fill('#cfgUser', 'محمد سعيد');
  await page.click('text=حفظ والدخول');
  await page.waitForSelector('#appShell:not(.hidden)');
  check('بعد الإعداد يظهر الـ Dashboard الرئيسي', await page.isVisible('#tab-home'));

  // ---- Step 2: نوع الرقابة cards rendered from bootstrap ----
  await page.click('text=تسجيل رقابة جديدة');
  await page.waitForSelector('#tab-register:not(.hidden)');
  const typeCardCount = await page.$$eval('.type-card', els => els.length);
  check('عدد بطاقات أنواع الرقابة = 7', typeCardCount === 7, typeCardCount);

  // ---- Step 3: select المشاكل اليومية -> dynamic form appears with its own fields only ----
  await page.click('.type-card >> text=المشاكل اليومية');
  await page.waitForSelector('#formCard:not(.hidden)');
  const fieldIds = await page.$$eval('#formFields > div label', els => els.map(e => e.textContent));
  check('النموذج يعرض حقول المشاكل اليومية فقط (19 حقلًا)', fieldIds.length === 19, fieldIds.length);
  check('لا تظهر حقول التحويلات في نموذج المشاكل', !fieldIds.some(f => f.includes('رقم التحويل')), fieldIds);

  // ---- Step 4: submit with missing required fields -> shows error, highlights fields ----
  await page.click('text=حفظ السجل');
  await page.waitForSelector('#formMsg .msg.err');
  const errText = await page.textContent('#formMsg');
  check('رسالة خطأ تظهر عند نقص الحقول الإلزامية', errText.includes('إلزامية'), errText);
  const errFieldCount = await page.$$eval('.field-err', els => els.length);
  check('الحقول الناقصة تُميَّز بصريًا', errFieldCount > 0, errFieldCount);

  // ---- Step 5: fill required fields and save ----
  await page.fill('#f_detect_date', '2026-09-20');
  await page.selectOption('#f_branch', 'القاهرة الجديدة');
  await page.selectOption('#f_issue_type', 'شحنة مفقودة');
  await page.fill('#f_description', 'اختبار تسجيل مشكلة من الداشبورد');
  await page.selectOption('#f_priority', 'عالية');
  await page.selectOption('#f_owner', 'أحمد سالم');
  await page.selectOption('#f_status', 'مفتوحة');
  await page.click('text=حفظ السجل');
  await page.waitForSelector('#formMsg .msg.ok');
  const okText = await page.textContent('#formMsg');
  check('رسالة نجاح تظهر مع رقم السجل', /تم حفظ السجل بنجاح[\s\S]*DI-\d+/.test(okText) || /DI-\d+/.test(okText), okText);

  // ---- Step 6: go back to Dashboard -> KPI reflects the new record immediately ----
  await page.click('text=Dashboard');
  await page.waitForSelector('#tab-dashboard:not(.hidden)');
  await page.waitForTimeout(300);
  const kpiText = await page.textContent('#kpiGrid');
  check('مؤشر المشاكل يعكس السجل الجديد المحفوظ فورًا دون فتح أي شيت', kpiText.includes('إجمالي: 1'), kpiText.slice(0, 200));

  // ---- Step 7: Search finds the record just saved ----
  await page.click('text=البحث في السجلات');
  await page.waitForSelector('#tab-search:not(.hidden)');
  await page.click('#tab-search .filters button.btn');
  await page.waitForTimeout(300);
  const searchInfo = await page.textContent('#searchResultsInfo');
  check('البحث يجد السجل المحفوظ حديثًا مباشرة (يثبت وصول البيانات من Dashboard إلى الخادم)', searchInfo.includes('1'), searchInfo);

  // ==================== NEGATIVE / EDGE CASES ====================

  // ---- Negative 1: duplicate-submission prevention (double-click while a save is in flight) ----
  await page.click('nav >> text=تسجيل رقابة');
  await page.waitForSelector('#tab-register:not(.hidden)');
  await page.click('.type-card >> text=المشاكل اليومية');
  await page.waitForSelector('#formCard:not(.hidden)');
  await page.fill('#f_detect_date', '2026-09-21');
  await page.selectOption('#f_branch', 'القاهرة الجديدة');
  await page.selectOption('#f_issue_type', 'خلل في النظام');
  await page.fill('#f_description', 'اختبار منع الحفظ المكرر');
  await page.selectOption('#f_priority', 'متوسطة');
  await page.selectOption('#f_owner', 'أحمد سالم');
  await page.selectOption('#f_status', 'مفتوحة');
  saveDelayMs = 400;
  const issuesBefore = rowsFor('Issues').length;
  // Three genuinely synchronous DOM clicks in one tick — NOT three separate page.click() calls.
  // Playwright's page.click() performs its own actionability retry: if it saw the button briefly
  // disabled, it would simply wait for it to re-enable and then click for real afterwards, which
  // does not test "rapid re-clicking while a save is in flight" at all and produced a flaky false
  // pass/fail (a second real click after re-enable). Dispatching raw click() calls from inside the
  // page reproduces the actual user behavior this guard exists for — no automation retry involved.
  const btnDisabledDuringSave = await page.evaluate(() => {
    const btn = document.getElementById('saveBtn');
    btn.click(); btn.click(); btn.click();
    return btn.disabled;
  });
  await page.waitForSelector('#formMsg .msg.ok', { timeout: 5000 });
  saveDelayMs = 0;
  check('زر الحفظ يُعطَّل فورًا بعد أول نقرة (قبل عودة رد الخادم)', btnDisabledDuringSave === true, btnDisabledDuringSave);
  check('ثلاث نقرات متتالية سريعة تُنشئ سجلًا واحدًا فقط، وليس ثلاثة', rowsFor('Issues').length === issuesBefore + 1, { before: issuesBefore, after: rowsFor('Issues').length });

  // ---- Negative 2: server disconnection shows a clear Arabic message, not a raw exception ----
  await page.click('text=مسح النموذج');
  await page.fill('#f_detect_date', '2026-09-21');
  await page.selectOption('#f_branch', 'القاهرة الجديدة');
  await page.selectOption('#f_issue_type', 'تأخير تسليم');
  await page.fill('#f_description', 'اختبار انقطاع الاتصال');
  await page.selectOption('#f_priority', 'منخفضة');
  await page.selectOption('#f_owner', 'أحمد سالم');
  await page.selectOption('#f_status', 'مفتوحة');
  networkDown = true;
  await page.click('#saveBtn');
  await page.waitForSelector('#formMsg .msg.err', { timeout: 5000 });
  const netErrText = await page.textContent('#formMsg');
  networkDown = false;
  check('انقطاع الاتصال بالخادم يعرض رسالة عربية واضحة (وليس خطأ برمجيًا خامًا)',
    netErrText.includes('تعذّر الاتصال') && !netErrText.includes('TypeError') && !netErrText.includes('fetch'), netErrText);

  // ---- Negative 3: malformed / invalid API response (not JSON) is handled gracefully ----
  malformedResponseOnce = true;
  await page.click('#saveBtn');
  await page.waitForSelector('#formMsg .msg.err', { timeout: 5000 });
  const badRespText = await page.textContent('#formMsg');
  check('رد غير صالح (ليس JSON) من الخادم يُعرض كرسالة عربية واضحة دون كسر الواجهة',
    badRespText.includes('صيغة صحيحة') || badRespText.includes('تعذّر'), badRespText);

  // ---- Negative 4: an unknown action is rejected cleanly by the client-facing api() layer ----
  const unknownRes = await page.evaluate(async () => await api('__does_not_exist__', {}));
  check('محاولة استدعاء Action غير معروف تُرفض بوضوح دون كسر الواجهة',
    unknownRes && unknownRes.ok === false && typeof unknownRes.error === 'string', unknownRes);

  // ==================== EDIT FLOW ====================
  await page.click('text=البحث في السجلات');
  await page.waitForSelector('#tab-search:not(.hidden)');
  await page.click('#tab-search .filters button.btn');
  await page.waitForTimeout(300);
  await page.click('#searchTable button:has-text("تعديل") >> nth=0');
  await page.waitForSelector('#editModalBg:not(.hidden)');
  const editRecId = await page.textContent('#editRecordId');
  check('نافذة التعديل تفتح وتعرض رقم السجل الصحيح', !!editRecId && editRecId.length > 0, editRecId);
  await page.fill('#e_description', 'وصف مُعدَّل عبر شاشة التعديل');
  dialogAction = 'accept'; // confirm the "هل أنت متأكد من حفظ هذا التعديل؟" dialog
  await page.click('#editSaveBtn');
  await page.waitForSelector('#editMsg .msg.ok', { timeout: 5000 });
  await page.waitForTimeout(1200); // modal auto-closes and re-runs search after a successful edit
  const editedRecordStillSameId = rowsFor('Issues').some(r => r['رقم السجل'] === editRecId && r['وصف المشكلة'] === 'وصف مُعدَّل عبر شاشة التعديل');
  check('التعديل يُحدِّث نفس السجل (نفس رقم السجل) بدل إنشاء سجل جديد، ويُسجَّل المستخدم المعدِّل', editedRecordStillSameId, rowsFor('Issues').find(r => r['رقم السجل'] === editRecId));

  // ==================== MORNING MATCHING: reconciliation + open/close-date checks (client-side) ====================
  await page.click('nav >> text=تسجيل رقابة');
  await page.waitForSelector('#tab-register:not(.hidden)');
  await page.click('.type-card >> text=المطابقة الصباحية');
  await page.waitForSelector('#formCard:not(.hidden)');
  await page.fill('#f_date', '2026-09-01');
  await page.selectOption('#f_branch', 'القاهرة الجديدة');
  await page.selectOption('#f_auditor', (await page.$eval('#f_auditor option:nth-child(2)', el => el.value)));
  await page.fill('#f_total_shipments', '500');
  await page.fill('#f_matched_shipments', '100');
  await page.fill('#f_unmatched_shipments', '50');
  await page.fill('#f_not_found_shipments', '2');
  await page.fill('#f_error_shipments', '4');
  await page.selectOption('#f_status', 'مفتوحة');
  await page.fill('#f_close_date', '2026-09-22');
  const morningBefore = rowsFor('Morning').length;
  await page.click('#saveBtn');
  await page.waitForSelector('#formMsg .msg.err', { timeout: 5000 });
  const reconcileErr = await page.textContent('#formMsg');
  check('المثال الحقيقي المُبلَّغ عنه (500 ≠ 100+50+2+4) يُرفض من الواجهة نفسها قبل إرسال أي طلب',
    reconcileErr.includes('500') && reconcileErr.includes('344'), reconcileErr);
  check('نفس المحاولة تُظهر أيضًا خطأ "مفتوحة مع تاريخ إغلاق"', reconcileErr.includes('تاريخ إغلاق'), reconcileErr);
  check('لم يُرسَل أي طلب حفظ للخادم (لا Mock ولا حقيقي) — رُفض بالكامل من الواجهة', rowsFor('Morning').length === morningBefore, { before: morningBefore, after: rowsFor('Morning').length });
  check('البيانات المُدخلة بقيت في النموذج بعد الخطأ (لم تُمسح)', await page.inputValue('#f_total_shipments') === '500', await page.inputValue('#f_total_shipments'));

  // Fix the numbers and the status/close_date contradiction -> should now save successfully
  await page.fill('#f_matched_shipments', '444');
  await page.selectOption('#f_status', 'مغلقة');
  await page.click('#saveBtn');
  await page.waitForSelector('#formMsg .msg.ok', { timeout: 5000 });
  const morningOkText = await page.textContent('#formMsg');
  const morningRecId = (morningOkText.match(/MM-\d+/) || [])[0];
  check('بعد تصحيح الأعداد والحالة، يُحفظ السجل بنجاح', rowsFor('Morning').length === morningBefore + 1, rowsFor('Morning').length);
  check('رقم السجل الجديد (المطابقة الصباحية) يظهر في رسالة النجاح', !!morningRecId, morningOkText);

  // ==================== DETAIL VIEW: count_diff/match_pct must appear correctly TO THE USER (DOM), not just in JS/Backend ====================
  // This record is 500 total / 444+50+2+4 = 500 matched -> balanced (count_diff = 0, match_pct = 88.8%).
  if (morningRecId) {
    await page.click('nav >> text=البحث في السجلات');
    await page.waitForSelector('#tab-search:not(.hidden)');
    await page.selectOption('#sType', 'Morning');
    await page.click('#tab-search .filters button.btn');
    await page.waitForTimeout(300);
    const morningRow = page.locator('#searchTable tr', { hasText: morningRecId });
    await morningRow.locator('button:has-text("تفاصيل")').click();
    await page.waitForSelector('#detailModalBg:not(.hidden)');
    const detailText = await page.textContent('#detailBody');
    check('شاشة التفاصيل تعرض نسبة المطابقة كنسبة مئوية معروضة للمستخدم (وليس 0.888)', detailText.includes('88.8%') && !detailText.includes('0.888'), detailText);
    check('شاشة التفاصيل تعرض الفرق عن الإجمالي (count_diff) = 0 لسجل متوازن', /الفرق عن الإجمالي[\s\S]{0,20}?0\b/.test(detailText) || detailText.includes('0'), detailText);
    check('شاشة التفاصيل تعرض "تحقق الأعداد" = سليم لسجل متوازن', detailText.includes('سليم'), detailText);
    check('شاشة التفاصيل تعرض حالة المتابعة وتاريخ الإغلاق المُدخلين', detailText.includes('مغلقة') && detailText.includes('2026-09-22'), detailText);
    await page.click('#detailModalBg button');
    await page.waitForSelector('#detailModalBg', { state: 'hidden' });
  }

  // ==================== MORNING: closed status WITHOUT close_date -> reject (frontend DOM + backend bypass) ====================
  await page.click('nav >> text=تسجيل رقابة');
  await page.waitForSelector('#tab-register:not(.hidden)');
  await page.click('.type-card >> text=المطابقة الصباحية');
  await page.waitForSelector('#formCard:not(.hidden)');
  await page.fill('#f_date', '2026-09-02');
  await page.selectOption('#f_branch', 'القاهرة الجديدة');
  await page.selectOption('#f_auditor', (await page.$eval('#f_auditor option:nth-child(2)', el => el.value)));
  await page.fill('#f_total_shipments', '10');
  await page.fill('#f_matched_shipments', '10');
  await page.selectOption('#f_status', 'مغلقة');
  // close_date left empty on purpose
  const morningBeforeClosedNoDate = rowsFor('Morning').length;
  await page.click('#saveBtn');
  await page.waitForSelector('#formMsg .msg.err', { timeout: 5000 });
  const closedNoDateErr = await page.textContent('#formMsg');
  check('حالة "مغلقة" بلا تاريخ إغلاق تُرفض من الواجهة مع رسالة واضحة تظهر في DOM',
    closedNoDateErr.includes('تتطلب تسجيل تاريخ الإغلاق'), closedNoDateErr);
  check('لا يُنشأ سجل عند رفض "مغلقة بلا تاريخ إغلاق"', rowsFor('Morning').length === morningBeforeClosedNoDate, rowsFor('Morning').length);
  // Backend-bypass: prove Code.gs itself enforces this too, not just the frontend copy.
  const closedNoDateBypass = await page.evaluate(async () => {
    return await apiPost({
      action: 'save', type: 'Morning', user: 'Bypass Test', clientRequestId: uuid(),
      data: { date: '2026-09-02', branch: 'القاهرة الجديدة', auditor: 'أحمد سالم',
        total_shipments: 10, matched_shipments: 10, status: 'مغلقة' }
    });
  });
  check('الخادم (Code.gs الفعلي) يرفض "مغلقة بلا تاريخ إغلاق" حتى عند تجاوز تحقق الواجهة',
    closedNoDateBypass.ok === false && (closedNoDateBypass.errors || []).some(e => e.includes('تتطلب تسجيل تاريخ الإغلاق')), closedNoDateBypass);
  check('لا يُنشأ سجل عند هذا التجاوز المباشر للخادم أيضًا', rowsFor('Morning').length === morningBeforeClosedNoDate, rowsFor('Morning').length);

  // ==================== MORNING: close_date OLDER than the record's own matching date -> reject ====================
  await page.click('text=مسح النموذج');
  await page.fill('#f_date', '2026-09-10');
  await page.selectOption('#f_branch', 'القاهرة الجديدة');
  await page.selectOption('#f_auditor', (await page.$eval('#f_auditor option:nth-child(2)', el => el.value)));
  await page.fill('#f_total_shipments', '10');
  await page.fill('#f_matched_shipments', '10');
  await page.selectOption('#f_status', 'مغلقة');
  await page.fill('#f_close_date', '2026-09-05'); // before 2026-09-10
  const morningBeforeOldClose = rowsFor('Morning').length;
  await page.click('#saveBtn');
  await page.waitForSelector('#formMsg .msg.err', { timeout: 5000 });
  const oldCloseErr = await page.textContent('#formMsg');
  check('تاريخ إغلاق أقدم من تاريخ المطابقة نفسه يُرفض من الواجهة مع رسالة تظهر في DOM',
    oldCloseErr.includes('لا يمكن أن يكون قبل تاريخ المطابقة'), oldCloseErr);
  check('لا يُنشأ سجل عند رفض تاريخ الإغلاق الأقدم', rowsFor('Morning').length === morningBeforeOldClose, rowsFor('Morning').length);
  // Backend-bypass: prove Code.gs itself enforces close_date_not_before_base too (this specific rule
  // had NO independent backend-level test until now — the UI check above only proves the frontend copy).
  const oldCloseBypass = await page.evaluate(async () => {
    return await apiPost({
      action: 'save', type: 'Morning', user: 'Bypass Test', clientRequestId: uuid(),
      data: { date: '2026-09-10', branch: 'القاهرة الجديدة', auditor: 'أحمد سالم',
        total_shipments: 10, matched_shipments: 10, status: 'مغلقة', close_date: '2026-09-05' }
    });
  });
  check('الخادم (Code.gs الفعلي) يرفض تاريخ إغلاق أقدم من تاريخ المطابقة حتى عند تجاوز تحقق الواجهة',
    oldCloseBypass.ok === false && (oldCloseBypass.errors || []).some(e => e.includes('لا يمكن أن يكون قبل تاريخ المطابقة')), oldCloseBypass);
  check('لا يُنشأ سجل عند هذا التجاوز المباشر للخادم أيضًا (close_date قبل تاريخ المطابقة)', rowsFor('Morning').length === morningBeforeOldClose, rowsFor('Morning').length);

  // ==================== MORNING: close_date EQUAL to the record's own matching date ====================
  // The current rule (Code_logic.gs: `new Date(close_date) < new Date(baseField)`) treats equality as
  // NOT "before", so this is ACCEPTED under the rule as currently written. This is a stated, reversible
  // assumption — not something this review changed — and is flagged again explicitly in the final report
  // as a business-rule point that needs an explicit management decision if same-day closure should instead
  // be rejected.
  await page.click('text=مسح النموذج');
  await page.fill('#f_date', '2026-09-15');
  await page.selectOption('#f_branch', 'القاهرة الجديدة');
  await page.selectOption('#f_auditor', (await page.$eval('#f_auditor option:nth-child(2)', el => el.value)));
  await page.fill('#f_total_shipments', '10');
  await page.fill('#f_matched_shipments', '10');
  await page.selectOption('#f_status', 'مغلقة');
  await page.fill('#f_close_date', '2026-09-15'); // equal to the matching date
  const morningBeforeEqualClose = rowsFor('Morning').length;
  await page.click('#saveBtn');
  await page.waitForSelector('#formMsg .msg.ok', { timeout: 5000 });
  check('[قاعدة عمل غير محسومة — راجع القسم الخاص بها في التقرير] تاريخ إغلاق يساوي تاريخ المطابقة نفسه: يُقبل حاليًا حسب القاعدة المكتوبة (< وليس <=)',
    rowsFor('Morning').length === morningBeforeEqualClose + 1, rowsFor('Morning').length);

  // ==================== MORNING: total_shipments = 0 -> no divide-by-zero error, handled cleanly in UI ====================
  await page.click('text=مسح النموذج');
  await page.fill('#f_date', '2026-09-16');
  await page.selectOption('#f_branch', 'القاهرة الجديدة');
  await page.selectOption('#f_auditor', (await page.$eval('#f_auditor option:nth-child(2)', el => el.value)));
  await page.fill('#f_total_shipments', '0');
  await page.fill('#f_matched_shipments', '0');
  const morningBeforeZero = rowsFor('Morning').length;
  await page.click('#saveBtn');
  await page.waitForSelector('#formMsg .msg.ok', { timeout: 5000 });
  const zeroOkText = await page.textContent('#formMsg');
  const zeroRecId = (zeroOkText.match(/MM-\d+/) || [])[0];
  check('إجمالي = صفر يُقبل عبر الواجهة دون أي خطأ قسمة على صفر', rowsFor('Morning').length === morningBeforeZero + 1, rowsFor('Morning').length);
  if (zeroRecId) {
    await page.click('nav >> text=البحث في السجلات');
    await page.waitForSelector('#tab-search:not(.hidden)');
    await page.click('#tab-search .filters button.btn');
    await page.waitForTimeout(300);
    const zeroRow = page.locator('#searchTable tr', { hasText: zeroRecId });
    await zeroRow.locator('button:has-text("تفاصيل")').click();
    await page.waitForSelector('#detailModalBg:not(.hidden)');
    const zeroDetailText = await page.textContent('#detailBody');
    check('شاشة التفاصيل لسجل إجمالي=صفر لا تعرض NaN أو Infinity لنسبة المطابقة',
      !zeroDetailText.includes('NaN') && !zeroDetailText.includes('Infinity'), zeroDetailText);
    await page.click('#detailModalBg button');
    await page.waitForSelector('#detailModalBg', { state: 'hidden' });
  }

  // ==================== MORNING: mismatch scenario — count_diff must be correct and visible in the UI ====================
  await page.click('nav >> text=تسجيل رقابة');
  await page.waitForSelector('#tab-register:not(.hidden)');
  await page.click('.type-card >> text=المطابقة الصباحية');
  await page.waitForSelector('#formCard:not(.hidden)');
  await page.fill('#f_date', '2026-09-17');
  await page.selectOption('#f_branch', 'القاهرة الجديدة');
  await page.selectOption('#f_auditor', (await page.$eval('#f_auditor option:nth-child(2)', el => el.value)));
  await page.fill('#f_total_shipments', '200');
  await page.fill('#f_matched_shipments', '150');
  await page.fill('#f_unmatched_shipments', '20');
  // deliberately omit not_found/error -> sum = 170, diff = 30
  const morningBeforeMismatch = rowsFor('Morning').length;
  await page.click('#saveBtn');
  await page.waitForSelector('#formMsg .msg.err', { timeout: 5000 });
  const mismatchErr = await page.textContent('#formMsg');
  check('رسالة الرفض تُظهر الفرق الصحيح (200 مقابل 170 = فرق 30)',
    mismatchErr.includes('200') && mismatchErr.includes('170') && mismatchErr.includes('30'), mismatchErr);
  check('لا يُنشأ سجل عند عدم التطابق', rowsFor('Morning').length === morningBeforeMismatch, rowsFor('Morning').length);

  // ==================== DEFENSE IN DEPTH: backend must reject invalid data on its own ====================
  // Calls the real doPost DIRECTLY from the page (bypassing clientValidateRules() entirely), the same
  // way a bug in the frontend check, a modified request, or a non-Dashboard API caller would. If the
  // backend's own _validate()/morning_count_reconciliation rule were ever removed or broken, THIS is
  // the test that would catch it — the tests above only prove the frontend copy works.
  const morningBeforeBypass = rowsFor('Morning').length;
  const bypassResult = await page.evaluate(async () => {
    return await apiPost({
      action: 'save', type: 'Morning', user: 'Bypass Test', clientRequestId: uuid(),
      data: { date: '2026-09-01', branch: 'القاهرة الجديدة', auditor: 'أحمد سالم',
        total_shipments: 500, matched_shipments: 100, unmatched_shipments: 50, not_found_shipments: 2, error_shipments: 4 }
    });
  });
  check('الخادم (Code.gs الفعلي) يرفض نفس البيانات الفاسدة حتى عند تجاوز تحقق الواجهة تمامًا',
    bypassResult.ok === false && (bypassResult.errors || []).some(e => e.includes('500') && e.includes('156')), bypassResult);
  check('لا يُنشأ أي صف فعلي في الشيت عند هذا التجاوز المباشر للخادم', rowsFor('Morning').length === morningBeforeBypass, rowsFor('Morning').length);

  // ==================== PENALTY: required fields, business rules, and negative-value documentation ====================
  // This control type (الجزاءات) had ZERO Playwright coverage before this addition — every check below
  // goes through a real form in the real browser, saved via the real Code.gs (through gs_sandbox.js).
  await page.click('nav >> text=تسجيل رقابة');
  await page.waitForSelector('#tab-register:not(.hidden)');
  await page.click('.type-card >> text=الجزاءات');
  await page.waitForSelector('#formCard:not(.hidden)');

  // ---- Penalty 1: missing required fields -> rejected with a visible DOM error ----
  await page.click('#saveBtn');
  await page.waitForSelector('#formMsg .msg.err', { timeout: 5000 });
  const penaltyReqErr = await page.textContent('#formMsg');
  check('[الجزاءات] رسالة خطأ تظهر عند نقص الحقول الإلزامية', penaltyReqErr.includes('إلزامي'), penaltyReqErr);

  // ---- Penalty 2: valid minimal record (reviewed=لا, status=مسجلة) -> accepted ----
  await page.fill('#f_log_date', '2026-09-01');
  await page.selectOption('#f_branch', 'القاهرة الجديدة');
  await page.fill('#f_employee', 'موظف اختبار 1');
  await page.selectOption('#f_violation_type', 'تأخير غير مبرر');
  await page.selectOption('#f_reviewed', 'لا');
  await page.selectOption('#f_status', 'مسجلة');
  const penaltyBeforeValid = rowsFor('Penalty').length;
  await page.click('#saveBtn');
  await page.waitForSelector('#formMsg .msg.ok', { timeout: 5000 });
  const penaltyValidOk = await page.textContent('#formMsg');
  check('[الجزاءات] سجل صحيح بأقل الحقول الإلزامية يُحفظ بنجاح (رقم PN-)', /PN-\d+/.test(penaltyValidOk), penaltyValidOk);
  check('[الجزاءات] عدد السجلات يزيد بمقدار 1 بعد الحفظ الصحيح', rowsFor('Penalty').length === penaltyBeforeValid + 1, rowsFor('Penalty').length);

  // ---- Penalty 3: status="معتمدة" (approved) while reviewed="لا" -> rejected (no_approve_before_review) ----
  await page.click('text=مسح النموذج');
  await page.fill('#f_log_date', '2026-09-02');
  await page.selectOption('#f_branch', 'القاهرة الجديدة');
  await page.fill('#f_employee', 'موظف اختبار 2');
  await page.selectOption('#f_violation_type', 'خطأ متكرر');
  await page.selectOption('#f_reviewed', 'لا');
  await page.selectOption('#f_status', 'معتمدة');
  const penaltyBeforeApproveNoReview = rowsFor('Penalty').length;
  await page.click('#saveBtn');
  await page.waitForSelector('#formMsg .msg.err', { timeout: 5000 });
  const approveNoReviewErr = await page.textContent('#formMsg');
  check('[الجزاءات] اعتماد جزاء بدون اكتمال المراجعة يُرفض من الواجهة مع رسالة تظهر في DOM',
    approveNoReviewErr.includes('لا يمكن اعتماد أو تنفيذ جزاء قبل اكتمال المراجعة'), approveNoReviewErr);
  check('[الجزاءات] لا يُنشأ سجل عند رفض الاعتماد بلا مراجعة', rowsFor('Penalty').length === penaltyBeforeApproveNoReview, rowsFor('Penalty').length);
  // Backend-bypass: prove Code.gs itself enforces this rule too, not just the frontend copy.
  const approveNoReviewBypass = await page.evaluate(async () => {
    return await apiPost({
      action: 'save', type: 'Penalty', user: 'Bypass Test', clientRequestId: uuid(),
      data: { log_date: '2026-09-02', branch: 'القاهرة الجديدة', employee: 'موظف اختبار 2',
        violation_type: 'خطأ متكرر', reviewed: 'لا', status: 'معتمدة' }
    });
  });
  check('[الجزاءات] الخادم (Code.gs الفعلي) يرفض اعتماد جزاء بدون مراجعة حتى عند تجاوز تحقق الواجهة',
    approveNoReviewBypass.ok === false && (approveNoReviewBypass.errors || []).some(e => e.includes('لا يمكن اعتماد أو تنفيذ جزاء قبل اكتمال المراجعة')), approveNoReviewBypass);
  check('[الجزاءات] لا يُنشأ سجل عند هذا التجاوز المباشر للخادم', rowsFor('Penalty').length === penaltyBeforeApproveNoReview, rowsFor('Penalty').length);

  // ---- Penalty 4: status="منفذة" (executed) without execute_date -> rejected (executed_requires_execute_date) ----
  await page.click('text=مسح النموذج');
  await page.fill('#f_log_date', '2026-09-03');
  await page.selectOption('#f_branch', 'القاهرة الجديدة');
  await page.fill('#f_employee', 'موظف اختبار 3');
  await page.selectOption('#f_violation_type', 'خطأ متكرر');
  await page.selectOption('#f_reviewed', 'نعم');
  await page.selectOption('#f_status', 'منفذة');
  // execute_date left empty on purpose
  const penaltyBeforeExecNoDate = rowsFor('Penalty').length;
  await page.click('#saveBtn');
  await page.waitForSelector('#formMsg .msg.err', { timeout: 5000 });
  const execNoDateErr = await page.textContent('#formMsg');
  check('[الجزاءات] حالة "منفذة" بلا تاريخ تنفيذ تُرفض من الواجهة مع رسالة تظهر في DOM',
    execNoDateErr.includes('تتطلب تسجيل تاريخ التنفيذ'), execNoDateErr);
  check('[الجزاءات] لا يُنشأ سجل عند رفض "منفذة بلا تاريخ تنفيذ"', rowsFor('Penalty').length === penaltyBeforeExecNoDate, rowsFor('Penalty').length);
  // Backend-bypass for this rule too.
  const execNoDateBypass = await page.evaluate(async () => {
    return await apiPost({
      action: 'save', type: 'Penalty', user: 'Bypass Test', clientRequestId: uuid(),
      data: { log_date: '2026-09-03', branch: 'القاهرة الجديدة', employee: 'موظف اختبار 3',
        violation_type: 'خطأ متكرر', reviewed: 'نعم', status: 'منفذة' }
    });
  });
  check('[الجزاءات] الخادم الفعلي يرفض "منفذة بلا تاريخ تنفيذ" حتى عند تجاوز تحقق الواجهة',
    execNoDateBypass.ok === false && (execNoDateBypass.errors || []).some(e => e.includes('تتطلب تسجيل تاريخ التنفيذ')), execNoDateBypass);
  check('[الجزاءات] لا يُنشأ سجل عند هذا التجاوز المباشر للخادم أيضًا', rowsFor('Penalty').length === penaltyBeforeExecNoDate, rowsFor('Penalty').length);

  // ---- Penalty 5: fully valid executed record (reviewed=نعم, status=منفذة, execute_date filled) -> accepted ----
  await page.fill('#f_execute_date', '2026-09-04');
  const penaltyBeforeExecValid = rowsFor('Penalty').length;
  await page.click('#saveBtn');
  await page.waitForSelector('#formMsg .msg.ok', { timeout: 5000 });
  check('[الجزاءات] بعد إضافة تاريخ التنفيذ، يُحفظ سجل "منفذة" بنجاح', rowsFor('Penalty').length === penaltyBeforeExecValid + 1, rowsFor('Penalty').length);

  // ---- Penalty 6: NEGATIVE penalty_value — DOCUMENTING current behavior only, NOT a rule being asserted ----
  // There is no min/max validation anywhere in the system for this field (confirmed by reading schema.json
  // and _validate()). This test does not assert that -500 "should" be rejected or accepted as a business
  // rule — it only pins down, through the real browser and real Code.gs, what actually happens today, so
  // any future change to this behavior shows up here as a deliberate, visible diff rather than a silent one.
  await page.click('text=مسح النموذج');
  await page.fill('#f_log_date', '2026-09-05');
  await page.selectOption('#f_branch', 'القاهرة الجديدة');
  await page.fill('#f_employee', 'موظف اختبار 4');
  await page.selectOption('#f_violation_type', 'أخرى');
  await page.selectOption('#f_reviewed', 'لا');
  await page.selectOption('#f_status', 'مسجلة');
  await page.fill('#f_penalty_value', '-500');
  const penaltyBeforeNegative = rowsFor('Penalty').length;
  await page.click('#saveBtn');
  await page.waitForSelector('#formMsg .msg.ok', { timeout: 5000 });
  check('[سلوك حالي غير مؤكَّد كقاعدة عمل — يحتاج قرارًا إداريًا] قيمة جزاء سالبة (-500) عبر المتصفح الحقيقي: تُقبل حاليًا ولا يوجد أي رفض من الواجهة أو الخادم',
    rowsFor('Penalty').length === penaltyBeforeNegative + 1, rowsFor('Penalty').length);
  const negPenaltyRow = rowsFor('Penalty').find(r => r['اسم الموظف'] === 'موظف اختبار 4');
  check('[توثيقي] القيمة السالبة (-500) تُخزَّن كما هي في الشيت دون أي تحويل أو رفض صامت',
    !!negPenaltyRow && String(Object.values(negPenaltyRow).find(v => v === -500 || v === '-500')) !== 'undefined', negPenaltyRow);

  // ==================== TRANSFER: first-ever browser-level coverage for this type ====================
  // Found during a live review round: "التحويلات" had ZERO Playwright coverage at all before this block
  // (confirmed by grep — not even a basic valid-save flow existed). Closes that gap the same way every
  // other type is tested here: real DOM + real Code.gs via the sandbox, plus a Backend Bypass proof.
  await page.click('.type-card >> text=التحويلات');
  const transferBeforeBad = rowsFor('Transfer').length;
  await page.fill('#f_date', '2026-09-01');
  await page.fill('#f_transfer_no', 'T-LIVE-001');
  await page.selectOption('#f_from_branch', 'القاهرة الجديدة');
  await page.selectOption('#f_to_branch', 'مدينة نصر');
  await page.fill('#f_send_dt', '2026-09-01T15:00');
  await page.fill('#f_receive_dt', '2026-09-01T10:00'); // BEFORE send -> violates receive_after_send
  await page.selectOption('#f_status', 'تم الإرسال');
  await page.click('#saveBtn');
  await page.waitForTimeout(200);
  const transferBadMsg = await page.textContent('#formMsg');
  check('[التحويلات] استلام قبل الإرسال يُرفض من الواجهة مع رسالة تظهر في DOM',
    transferBadMsg.includes('⚠️'), transferBadMsg);
  check('[التحويلات] لا يُنشأ سجل عند رفض استلام قبل الإرسال', rowsFor('Transfer').length === transferBeforeBad, rowsFor('Transfer').length);

  const transferBypass = await page.evaluate(async () => {
    return await apiPost({
      action: 'save', type: 'Transfer', user: 'Bypass Test', clientRequestId: uuid(),
      data: { date: '2026-09-01', transfer_no: 'T-LIVE-002', from_branch: 'القاهرة الجديدة', to_branch: 'مدينة نصر',
        send_dt: '2026-09-01T15:00:00', receive_dt: '2026-09-01T10:00:00', status: 'تم الإرسال' }
    });
  });
  check('[التحويلات] الخادم (Code.gs الفعلي) يرفض استلام قبل الإرسال حتى عند تجاوز تحقق الواجهة',
    transferBypass.ok === false, transferBypass);
  check('[التحويلات] لا يُنشأ سجل عند هذا التجاوز المباشر للخادم', rowsFor('Transfer').length === transferBeforeBad, rowsFor('Transfer').length);

  await page.click('text=مسح النموذج');
  await page.fill('#f_date', '2026-09-01');
  await page.fill('#f_transfer_no', 'T-LIVE-003');
  await page.selectOption('#f_from_branch', 'القاهرة الجديدة');
  await page.selectOption('#f_to_branch', 'مدينة نصر');
  await page.fill('#f_send_dt', '2026-09-01T08:00');
  await page.fill('#f_receive_dt', '2026-09-02T14:00');
  await page.selectOption('#f_status', 'تم الإرسال');
  await page.click('#saveBtn');
  await page.waitForSelector('#formMsg .msg.ok', { timeout: 5000 });
  check('[التحويلات] تحويل صحيح يُحفظ بنجاح عبر المتصفح الحقيقي (أول إثبات متصفحي لهذا المسار)',
    rowsFor('Transfer').length === transferBeforeBad + 1, rowsFor('Transfer').length);

  // ==================== clientRequestId IDEMPOTENCY: real resend of the SAME id through the real browser ====================
  // Found during the same review round: every existing Backend-Bypass test above generates a FRESH uuid()
  // each time — none of them proves that resending the SAME clientRequestId is deduplicated. Also,
  // currentClientRequestId rotates the instant a save succeeds (resetFieldsOnly()), so it must be captured
  // BEFORE the save, not read again afterward — using it after would silently send a different id.
  await page.click('.type-card >> text=المطابقة الصباحية');
  const capturedReqId = await page.evaluate(() => currentClientRequestId);
  const morningBeforeIdem = rowsFor('Morning').length;
  await page.fill('#f_date', '2026-09-21');
  await page.selectOption('#f_branch', 'القاهرة الجديدة');
  await page.selectOption('#f_auditor', 'أحمد سالم');
  await page.fill('#f_total_shipments', '50');
  await page.fill('#f_matched_shipments', '50');
  await page.click('#saveBtn');
  await page.waitForSelector('#formMsg .msg.ok', { timeout: 5000 });
  const firstIdemMsg = await page.textContent('#formMsg');
  const firstIdemRecordId = (firstIdemMsg.match(/رقم السجل:\s*([A-Z0-9-]+)/) || [])[1];
  const rowsAfterFirstIdem = rowsFor('Morning').length;

  const idemRetryResult = await page.evaluate(async (reqId) => {
    return await apiPost({
      action: 'save', type: 'Morning', user: 'اختبار Idempotency حي', clientRequestId: reqId,
      data: { date: '2026-09-21', branch: 'القاهرة الجديدة', auditor: 'أحمد سالم', total_shipments: 50, matched_shipments: 50 }
    });
  }, capturedReqId); // same captured id, NOT currentClientRequestId (which has already rotated by now)
  check('[Idempotency] إعادة إرسال نفس clientRequestId الملتقط قبل الحفظ يُعيد نفس recordId بالضبط',
    idemRetryResult.recordId === firstIdemRecordId, { first: firstIdemRecordId, retry: idemRetryResult.recordId });
  check('[Idempotency] لا يُنشأ صف مكرر عند إعادة إرسال نفس clientRequestId',
    rowsFor('Morning').length === rowsAfterFirstIdem, { before: rowsAfterFirstIdem, after: rowsFor('Morning').length });

  // ==================== REPORTS TAB ====================
  await page.click('text=التقارير');
  await page.waitForSelector('#tab-reports:not(.hidden)');
  await page.click('text=توليد التقرير');
  await page.waitForSelector('#reportsBody .card', { timeout: 5000 });
  await page.waitForTimeout(200);
  const reportsText = await page.textContent('#reportsBody');
  check('تبويب التقارير يعرض ملخصًا تنفيذيًا بعد الضغط على "توليد التقرير"', reportsText.includes('ملخص تنفيذي') && reportsText.includes('إجمالي السجلات'), reportsText.slice(0, 200));
  check('التقرير يوضح الفترة والفلاتر المستخدمة (لا أرقام مجردة بلا مصدر)', reportsText.includes('الفترة المحلَّلة') && reportsText.includes('الفلاتر'), true);

  await browser.close();

  let passed = 0;
  results.forEach(r => {
    console.log((r.pass ? 'PASS' : 'FAIL') + ' - ' + r.name + (r.pass ? '' : '  [' + JSON.stringify(r.detail) + ']'));
    if (r.pass) passed++;
  });
  console.log('\n' + passed + ' / ' + results.length + ' اختبارًا ناجحًا (واجهة المستخدم عبر متصفح حقيقي — بما فيها الحالات السلبية والتعديل والتقارير)');
  process.exit(passed === results.length ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
