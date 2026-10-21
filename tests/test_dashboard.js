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
const { buildMockSpreadsheet, buildSandbox } = require('./gs_sandbox');

const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '../app/schema.json'), 'utf8'));
const codeGsSource = fs.readFileSync(path.join(__dirname, '../app/Code.gs'), 'utf8');

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

  // لا يخرج أي طلب من الجهاز: أي شيء ليس file:// (الخطوط/الأيقونات الخارجية) يُحجَب. يُسجَّل هذا المسار قبل مسار
  // **/macros/** لأن Playwright يعطي الأولوية للمسار الأحدث تسجيلًا، فيبقى مسار Apps Script الوهمي هو الأعلى.
  await page.route(url => !url.href.startsWith('file:'), route => route.abort());

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

  await page.goto('file://' + path.join(__dirname, '../app/index.html'));

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
  // Code.gs يعرّف 7 أنواع، لكن الواجهة تُخفي Morning وReturns عمدًا من هذه الشاشة (REGISTER_SCREEN_HIDDEN_TYPES) فتظهر 5 بطاقات.
  check('عدد بطاقات أنواع الرقابة = 5 (7 أنواع في الخادم، النوعان القديمان Morning/Returns مخفيان عمدًا)', typeCardCount === 5, typeCardCount);

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
  await page.click('nav >> text=لوحة المتابعة');
  await page.waitForSelector('#tab-dashboard:not(.hidden)');
  await page.waitForTimeout(300);
  const kpiText = await page.textContent('#kpiGrid');
  check('مؤشر المشاكل يعكس السجل الجديد المحفوظ فورًا دون فتح أي شيت', /المشاكل[^\d]*1\s*إجمالي/.test(kpiText), kpiText.slice(0, 200));

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

  // ==================== MORNING (القديم) — فحوصات الخادم الفعلي (Code.gs) عبر apiPost مباشرة ====================
  // ملاحظة توثيقية: النوعان القديمان Morning/Returns أُخفيا عمدًا من شاشة "تسجيل رقابة"
  // (REGISTER_SCREEN_HIDDEN_TYPES في app/index.html) واستُبدلا بمسار الدفعات MorningPickup/MorningReturns.
  // لذلك لم تعد سيناريوهات "تعبئة نموذج المطابقة الصباحية القديم من الواجهة" قابلة للتنفيذ، وأُزيلت من هذا
  // الملف: (رفض 500≠100+50+2+4 من الواجهة، بقاء البيانات بعد الخطأ، رفض مغلقة بلا تاريخ، تاريخ إغلاق أقدم،
  // إجمالي=0، رسالة الفرق 200/170) — كلها كانت تمر عبر #f_total_shipments/#f_matched_shipments وهي
  // حقول لا يعرضها مسار الدفعات. ما بقي هنا هو ما يزال صالحًا: Code.gs لا يزال يعرّف النوع Morning
  // ويتحقق منه، ولذلك تُختبر قواعده بالاستدعاء المباشر (وهو ما كانت اختبارات "تجاوز الواجهة" تفعله أصلًا)،
  // مع إبقاء فحص شاشة التفاصيل (DOM) لسجلات Morning القائمة. مسار الدفعات الجديد يُختبر في القسم التالي.
  const saveMorningDirect = (data, extra) => page.evaluate(async ([d, e]) => {
    return await apiPost(Object.assign({ action: 'save', type: 'Morning', user: 'Direct API Test', clientRequestId: uuid(), data: d }, e || {}));
  }, [data, extra || null]);
  const mBase = { branch: 'القاهرة الجديدة', auditor: 'أحمد سالم' };

  // (1) أعداد غير متطابقة: 500 ≠ 100+50+2+4 -> يرفضه الخادم نفسه
  const morningBeforeBypass = rowsFor('Morning').length;
  const bypassResult = await saveMorningDirect(Object.assign({ date: '2026-09-01', total_shipments: 500, matched_shipments: 100, unmatched_shipments: 50, not_found_shipments: 2, error_shipments: 4 }, mBase));
  check('الخادم (Code.gs الفعلي) يرفض 500 ≠ 100+50+2+4 (الإجمالي والمجموع 156 يظهران في الرسالة)',
    bypassResult.ok === false && (bypassResult.errors || []).some(e => e.includes('500') && e.includes('156')), bypassResult);
  check('لا يُنشأ أي صف فعلي في الشيت عند رفض الأعداد غير المتطابقة', rowsFor('Morning').length === morningBeforeBypass, rowsFor('Morning').length);

  // (2) سجل متوازن ومغلق بتاريخ إغلاق صحيح -> يُقبل، ثم تُفحص شاشة التفاصيل في DOM
  const balancedRes = await saveMorningDirect(Object.assign({ date: '2026-09-01', total_shipments: 500, matched_shipments: 444, unmatched_shipments: 50, not_found_shipments: 2, error_shipments: 4, status: 'مغلقة', close_date: '2026-09-22' }, mBase));
  const morningRecId = balancedRes.recordId;
  check('سجل متوازن (500 = 444+50+2+4) مغلق بتاريخ إغلاق صحيح يُقبل من الخادم', balancedRes.ok === true && /^MM-\d+/.test(morningRecId || ''), balancedRes);

  // ---- شاشة التفاصيل: count_diff/match_pct يجب أن تظهر صحيحة للمستخدم في DOM (500 إجمالي، مطابق 88.8%) ----
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
    check('شاشة التفاصيل تعرض الفرق عن الإجمالي (count_diff) = 0 لسجل متوازن', /الفرق عن الإجمالي[\s\S]{0,20}?0\b/.test(detailText), detailText);
    check('شاشة التفاصيل تعرض "تحقق الأعداد" = سليم لسجل متوازن', detailText.includes('سليم'), detailText);
    check('شاشة التفاصيل تعرض حالة المتابعة وتاريخ الإغلاق المُدخلين', detailText.includes('مغلقة') && detailText.includes('2026-09-22'), detailText);
    await page.click('#detailModalBg button');
    await page.waitForSelector('#detailModalBg', { state: 'hidden' });
  }

  // (3) "مغلقة" بلا تاريخ إغلاق -> يرفضه الخادم
  const morningBeforeClosedNoDate = rowsFor('Morning').length;
  const closedNoDateBypass = await saveMorningDirect(Object.assign({ date: '2026-09-02', total_shipments: 10, matched_shipments: 10, status: 'مغلقة' }, mBase));
  check('الخادم (Code.gs الفعلي) يرفض "مغلقة بلا تاريخ إغلاق"',
    closedNoDateBypass.ok === false && (closedNoDateBypass.errors || []).some(e => e.includes('تتطلب تسجيل تاريخ الإغلاق')), closedNoDateBypass);
  check('لا يُنشأ سجل عند رفض "مغلقة بلا تاريخ إغلاق"', rowsFor('Morning').length === morningBeforeClosedNoDate, rowsFor('Morning').length);

  // (4) تاريخ إغلاق أقدم من تاريخ المطابقة -> يرفضه الخادم
  const morningBeforeOldClose = rowsFor('Morning').length;
  const oldCloseBypass = await saveMorningDirect(Object.assign({ date: '2026-09-10', total_shipments: 10, matched_shipments: 10, status: 'مغلقة', close_date: '2026-09-05' }, mBase));
  check('الخادم (Code.gs الفعلي) يرفض تاريخ إغلاق أقدم من تاريخ المطابقة',
    oldCloseBypass.ok === false && (oldCloseBypass.errors || []).some(e => e.includes('لا يمكن أن يكون قبل تاريخ المطابقة')), oldCloseBypass);
  check('لا يُنشأ سجل عند رفض تاريخ الإغلاق الأقدم', rowsFor('Morning').length === morningBeforeOldClose, rowsFor('Morning').length);

  // (5) تاريخ إغلاق يساوي تاريخ المطابقة: القاعدة الحالية (`new Date(close_date) < new Date(baseField)`) لا تعدّ
  // المساواة "قبل"، فيُقبل. افتراض مُعلَن وقابل للعكس وليس قرارًا جديدًا — يحتاج قرار إدارة صريح لو أُريد رفض الإغلاق في نفس اليوم.
  const morningBeforeEqualClose = rowsFor('Morning').length;
  const equalCloseRes = await saveMorningDirect(Object.assign({ date: '2026-09-15', total_shipments: 10, matched_shipments: 10, status: 'مغلقة', close_date: '2026-09-15' }, mBase));
  check('[قاعدة عمل غير محسومة — تحتاج قرار إدارة] تاريخ إغلاق يساوي تاريخ المطابقة يُقبل حاليًا حسب القاعدة المكتوبة',
    equalCloseRes.ok === true && rowsFor('Morning').length === morningBeforeEqualClose + 1, equalCloseRes);

  // (6) إجمالي = صفر -> يُقبل دون خطأ قسمة على صفر، وشاشة التفاصيل لا تعرض NaN/Infinity
  const zeroRes = await saveMorningDirect(Object.assign({ date: '2026-09-16', total_shipments: 0, matched_shipments: 0 }, mBase));
  check('إجمالي = صفر يُقبل من الخادم دون خطأ قسمة على صفر', zeroRes.ok === true, zeroRes);
  if (zeroRes.recordId) {
    await page.click('nav >> text=البحث في السجلات');
    await page.waitForSelector('#tab-search:not(.hidden)');
    await page.click('#tab-search .filters button.btn');
    await page.waitForTimeout(300);
    const zeroRow = page.locator('#searchTable tr', { hasText: zeroRes.recordId });
    await zeroRow.locator('button:has-text("تفاصيل")').click();
    await page.waitForSelector('#detailModalBg:not(.hidden)');
    const zeroDetailText = await page.textContent('#detailBody');
    check('شاشة التفاصيل لسجل إجمالي=صفر لا تعرض NaN أو Infinity لنسبة المطابقة',
      !zeroDetailText.includes('NaN') && !zeroDetailText.includes('Infinity'), zeroDetailText);
    await page.click('#detailModalBg button');
    await page.waitForSelector('#detailModalBg', { state: 'hidden' });
  }

  // (7) عدم تطابق 200 مقابل 150+20 = 170 -> يرفضه الخادم ويُظهر الرقمين في الرسالة
  const morningBeforeMismatch = rowsFor('Morning').length;
  const mismatchRes = await saveMorningDirect(Object.assign({ date: '2026-09-17', total_shipments: 200, matched_shipments: 150, unmatched_shipments: 20 }, mBase));
  check('رسالة رفض الخادم تُظهر الإجمالي 200 ومجموع الفئات 170',
    mismatchRes.ok === false && (mismatchRes.errors || []).some(e => e.includes('200') && e.includes('170')), mismatchRes);
  check('لا يُنشأ سجل عند عدم التطابق', rowsFor('Morning').length === morningBeforeMismatch, rowsFor('Morning').length);

  // ==================== المطابقة الصباحية الجديدة (MorningPickup / MorningReturns) — مسار الدفعات في الواجهة ====================
  // نطاق هذا القسم (مهم): Code.gs وapp/schema.json في هذا المستودع لا يعرّفان MorningPickup/MorningReturns ولا
  // الإجراءين saveMorningBatch وmyBranches (لا وجود لها في الملفين). لذلك لا يمكن اختبار سلوك الخادم لهذا المسار هنا،
  // ولم يُفترض أي سلوك له. يُختبر هنا سلوك الواجهة فقط (app/index.html) فوق طبقة النقل التجريبية المضمَّنة في الصفحة
  // نفسها (?demo=1 — لا fetch ولا أي طلب شبكة)، مع التقاط حمولة saveMorningBatch المُرسَلة وحجب كل ما ليس file://.
  // أي استجابة نجاح/رفض/انقطاع تُحاكى هنا في الاختبار فقط لفحص كيف تتصرف الواجهة؛ وليست دليلًا على سلوك الخادم.
  // ملاحظة اكتُشفت أثناء كتابة القسم: دالة الحفظ التجريبية المضمَّنة (mockApiPost / saveMorningBatch في app/index.html)
  // ترمي TypeError لأن تعريف MorningPickup في بيانات MOCK لا يحتوي مصفوفة `computed` (ct2.computed.find)، فيظهر
  // للمستخدم في وضع ?demo=1 رسالة "تعذّر الاتصال" عند حفظ دفعة. هذا عيب في وضع التجربة فقط، لم يُعدَّل لأن
  // كود التطبيق خارج نطاق هذه المهمة؛ لذلك يُحاكى النجاح هنا داخل الاختبار.
  const mPage = await browser.newPage();
  mPage.on('console', msg => { if (msg.type() === 'error' && !/ERR_FAILED|net::ERR/.test(msg.text())) console.log('MORNING-PAGE CONSOLE ERR:', msg.text()); });
  mPage.on('pageerror', err => console.log('MORNING-PAGE PAGEERROR:', err.message));
  let mDialog = 'accept';
  mPage.on('dialog', async d => { if (mDialog === 'accept') await d.accept(); else await d.dismiss(); });
  const mExternal = [];
  await mPage.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith('file:')) return route.continue();
    mExternal.push(u);
    return route.abort();
  });
  await mPage.goto('file://' + path.join(__dirname, '../app/index.html') + '?demo=1');
  await mPage.waitForSelector('#appShell:not(.hidden)');
  // التقاط كل استدعاءات apiPost + إمكانية محاكاة رفض/انقطاع (في الاختبار فقط)
  await mPage.evaluate(() => {
    window.__calls = []; window.__mode = 'ok';
    window.apiPost = async (body) => {
      window.__calls.push(JSON.parse(JSON.stringify(body)));
      if (window.__mode === 'reject') return { ok: false, errors: ['فرع غير مصرَّح به (محاكاة اختبار)'] };
      if (window.__mode === 'throw') throw new Error('network down (محاكاة اختبار)');
      // استجابة نجاح مُحاكاة داخل الاختبار بالشكل الذي تقرأه الواجهة فقط (ok/batchId/recordIds/branches/savedAt).
      // لا تُستخدم دالة الحفظ التجريبية المضمَّنة في الصفحة لأنها تنهار مع هذا النوع (انظر الملاحظة أعلاه).
      return { ok: true, batchId: 'TEST-BATCH-0001', recordIds: body.rows.map((r, i) => 'T-' + (i + 1)), branches: body.rows.map(r => r.branch), savedAt: '2026-09-20 10:00' };
    };
  });
  const batchCalls = () => mPage.evaluate(() => window.__calls.filter(c => c.action === 'saveMorningBatch'));
  const fid = async (branch, key) => '#' + await mPage.evaluate(n => mnSafeId(n), branch) + '_' + key;
  const chip = b => `#mnBranchChips input[data-branch="${b}"]`;
  const BR_A = 'القاهرة الجديدة', BR_B = 'مدينة نصر';
  const PICKUP = 'المطابقة الصباحية - بيك أب', RETURNS = 'المطابقة الصباحية - مرتجعات';

  await mPage.click('nav >> text=تسجيل رقابة');
  await mPage.waitForSelector('#tab-register:not(.hidden)');
  const cardNames = await mPage.$$eval('.type-card', els => els.map(e => e.textContent.trim()));
  check('[الدفعات] بطاقتا الأنواع الجديدة تظهران في شاشة التسجيل', cardNames.includes(PICKUP) && cardNames.includes(RETURNS), cardNames);
  check('[الدفعات] النوعان القديمان (المطابقة الصباحية / مطابقة المرتجعات) مخفيان من شاشة التسجيل',
    !cardNames.includes('المطابقة الصباحية') && !cardNames.includes('مطابقة المرتجعات'), cardNames);

  await mPage.click(`.type-card >> text=${PICKUP}`);
  await mPage.waitForSelector('#mnBranchChips');
  check('[الدفعات] قائمة الفروع المسموح بها تُحمَّل (myBranches) وتظهر كخانات اختيار', (await mPage.$$('#mnBranchChips input[type=checkbox]')).length >= 2);
  check('[الدفعات] لا فرع مختار افتراضيًا ولا بطاقات', (await mPage.$$('#mnBranchCards .branch-card')).length === 0);

  await mPage.check(chip(BR_A));
  await mPage.check(chip(BR_B));
  check('[الدفعات] اختيار فرعين ينشئ بطاقتين مستقلتين', (await mPage.$$('#mnBranchCards .branch-card')).length === 2);
  check('[الدفعات] ملخص الدفعة يذكر 2 سجل مستقل', (await mPage.textContent('#mnBatchSummary')).includes('2 سجل مستقل'));
  const cardHtml = await mPage.innerHTML('#mnBranchCards');
  check('[الدفعات] الحقول التي يديرها الخادم (batch_id / matching_type / deadline_snapshot / auditor_name) لا تُعرض للإدخال',
    !/_(batch_id|matching_type|deadline_snapshot|auditor_name)"/.test(cardHtml), cardHtml.slice(0, 200));

  // ---- (1) حقول إلزامية ناقصة في فرع واحد: يُرفض قبل أي طلب، وبيانات الفرع الآخر باقية ----
  await mPage.fill(await fid(BR_A, 'matching_date'), '2026-09-20');
  await mPage.fill(await fid(BR_A, 'branch_notification_time'), '09:30');
  await mPage.fill(await fid(BR_A, 'sent_shipments'), '10');
  await mPage.fill(await fid(BR_A, 'received_shipments'), '10');
  await mPage.selectOption(await fid(BR_A, 'receiver_employee'), 'أحمد سالم');
  await mPage.click('#saveBtn');
  const missMsg = await mPage.textContent('#formMsg');
  check('[الدفعات] نقص حقول إلزامية في فرع واحد يُرفض ويُسمّي الفرع والحقل',
    missMsg.includes(`فرع "${BR_B}"`) && missMsg.includes('تاريخ المطابقة') && missMsg.includes('الشحنات المرسلة') && !missMsg.includes(`فرع "${BR_A}"`), missMsg);
  check('[الدفعات] لم يُرسَل أي طلب saveMorningBatch عند النقص', (await batchCalls()).length === 0);
  check('[الدفعات] بيانات الفرع المكتمل بقيت كما هي بعد الرفض', await mPage.inputValue(await fid(BR_A, 'sent_shipments')) === '10');

  // ---- (2) عرض الفرق لحظيًا (للعرض فقط) والتحذير البصري عند المستلم > المرسل ----
  check('[الدفعات] الفرق المعروض = 0 عندما المرسل = المستلم = 10', await mPage.inputValue(await fid(BR_A, 'sent_shipments').then(s => s.replace(/sent_shipments$/, 'diffDisplay'))) === '0');
  await mPage.fill(await fid(BR_B, 'matching_date'), '2026-09-20');
  await mPage.fill(await fid(BR_B, 'branch_notification_time'), '12:30'); // بعد الموعد 11:00 (BOOT.targets.morning_matching_deadline)
  await mPage.fill(await fid(BR_B, 'sent_shipments'), '12');
  await mPage.fill(await fid(BR_B, 'received_shipments'), '15');
  const diffSel = (await fid(BR_B, 'sent_shipments')).replace(/sent_shipments$/, 'diffDisplay');
  check('[الدفعات] الفرق = -3 عندما المستلم (15) > المرسل (12) مع تحذير بصري (diff-negative)',
    await mPage.inputValue(diffSel) === '-3' && await mPage.$eval(diffSel, el => el.classList.contains('diff-negative')), await mPage.inputValue(diffSel));

  // ---- (3) قواعد الأعمال في الواجهة (تحقق سريع فقط؛ الخادم هو المرجع) ----
  await mPage.click('#saveBtn');
  const rulesMsg = await mPage.textContent('#formMsg');
  check('[الدفعات] مستلمة > 0 بلا موظف استلام تُرفض لفرع "مدينة نصر" فقط', rulesMsg.includes(`فرع "${BR_B}"`) && rulesMsg.includes('موظف الاستلام إلزامي'), rulesMsg);
  check('[الدفعات] تبليغ بعد الموعد (12:30 > 11:00) بلا سبب تأخير يُرفض', rulesMsg.includes('سبب التأخير إلزامي'), rulesMsg);
  check('[الدفعات] رسالة الرفض لا تذكر الفرع المكتمل', !rulesMsg.includes(`فرع "${BR_A}"`), rulesMsg);
  check('[الدفعات] لا طلب حفظ بعد رفض القواعد', (await batchCalls()).length === 0);

  await mPage.selectOption(await fid(BR_B, 'receiver_employee'), 'منى عبد الله');
  await mPage.fill(await fid(BR_B, 'delay_reason'), 'تأخر وصول الشحنات');
  await mPage.selectOption(await fid(BR_B, 'status'), 'مغلقة');
  await mPage.click('#saveBtn');
  check('[الدفعات] حالة "مغلقة" بلا تاريخ إغلاق تُرفض', (await mPage.textContent('#formMsg')).includes('تتطلب تسجيل تاريخ الإغلاق'));
  await mPage.fill(await fid(BR_B, 'close_date'), '2026-09-01');
  await mPage.click('#saveBtn');
  check('[الدفعات] تاريخ إغلاق أقدم من تاريخ المطابقة يُرفض', (await mPage.textContent('#formMsg')).includes('لا يمكن أن يكون قبل تاريخ المطابقة'));
  await mPage.fill(await fid(BR_B, 'close_date'), '');
  await mPage.selectOption(await fid(BR_B, 'status'), 'مفتوحة');
  await mPage.fill(await fid(BR_B, 'close_date'), '2026-09-21');
  await mPage.click('#saveBtn');
  check('[الدفعات] حالة "مفتوحة" مع تاريخ إغلاق تُرفض', (await mPage.textContent('#formMsg')).includes('"مفتوحة" لا يجب أن يكون لها تاريخ إغلاق'));
  await mPage.fill(await fid(BR_B, 'close_date'), '');
  await mPage.fill(await fid(BR_B, 'sent_shipments'), '-1');
  await mPage.click('#saveBtn');
  check('[الدفعات] عدد شحنات سالب يُرفض (رقم صحيح غير سالب)', (await mPage.textContent('#formMsg')).includes('رقمًا صحيحًا غير سالب'));
  await mPage.fill(await fid(BR_B, 'sent_shipments'), '2.5');
  await mPage.click('#saveBtn');
  check('[الدفعات] عدد شحنات كسري يُرفض', (await mPage.textContent('#formMsg')).includes('رقمًا صحيحًا غير سالب'));
  check('[الدفعات] ما زال لا يوجد أي طلب saveMorningBatch بعد كل حالات الرفض في الواجهة', (await batchCalls()).length === 0);
  await mPage.fill(await fid(BR_B, 'sent_shipments'), '12');

  // ---- (4) رفض الخادم (محاكى في الاختبار) وانقطاع الشبكة: لا مسح للبيانات، ولا يتغيّر clientRequestId ----
  const reqIdBefore = await mPage.evaluate(() => mnBatchRequestId);
  await mPage.evaluate(() => { window.__mode = 'reject'; });
  await mPage.click('#saveBtn');
  await mPage.waitForSelector('#formMsg .msg.err');
  const rejectMsg = await mPage.textContent('#formMsg');
  check('[الدفعات] رفض الخادم (محاكى) يُعرض كفشل كامل "لم يُحفظ أي سجل" مع سبب الرفض',
    rejectMsg.includes('فشلت عملية الحفظ الجماعي بالكامل') && rejectMsg.includes('فرع غير مصرَّح به'), rejectMsg);
  check('[الدفعات] بعد الرفض: البطاقتان وبياناتهما باقيتان', (await mPage.$$('#mnBranchCards .branch-card')).length === 2 && await mPage.inputValue(await fid(BR_A, 'sent_shipments')) === '10');
  await mPage.evaluate(() => { window.__mode = 'throw'; });
  await mPage.click('#saveBtn');
  await mPage.waitForSelector('#formMsg .msg.err');
  check('[الدفعات] انقطاع الشبكة يُعرض برسالة واضحة دون افتراض نجاح جزئي', (await mPage.textContent('#formMsg')).includes('لم يُحفظ أي سجل'));
  check('[الدفعات] clientRequestId لم يتغيّر بعد الفشل (إعادة المحاولة آمنة من التكرار)', await mPage.evaluate(() => mnBatchRequestId) === reqIdBefore);
  check('[الدفعات] زر الحفظ عاد مفعّلًا بعد الفشل', !(await mPage.$eval('#saveBtn', b => b.disabled)));

  // ---- (5) تغيير النوع أثناء وجود بيانات غير محفوظة يطلب تأكيدًا ----
  mDialog = 'dismiss';
  await mPage.click(`.type-card >> text=${RETURNS}`);
  check('[الدفعات] رفض تأكيد تغيير النوع يُبقي النوع الحالي (بيك أب) والبيانات', await mPage.evaluate(() => mnCurrentType) === 'MorningPickup' && (await mPage.$$('#mnBranchCards .branch-card')).length === 2);
  mDialog = 'accept';

  // ---- (6) حفظ ناجح بنقرتين متتاليتين في نفس اللحظة: طلب واحد فقط، ورسالة نجاح كاملة ثم تصفير ----
  await mPage.evaluate(() => { window.__mode = 'ok'; window.__calls.length = 0; });
  await mPage.evaluate(() => { submitMorningBatch(); submitMorningBatch(); });
  await mPage.waitForSelector('#formMsg .msg.ok');
  const okCalls = await batchCalls();
  check('[الدفعات] نقرتان متتاليتان ترسلان طلب saveMorningBatch واحدًا فقط (حارس الإرسال المكرر)', okCalls.length === 1, okCalls.length);
  const sent = okCalls[0] || { rows: [] };
  check('[الدفعات] الحمولة: type=MorningPickup وصفّان (فرع لكل صف) وclientRequestId هو المعروض قبل الحفظ',
    sent.type === 'MorningPickup' && sent.rows.length === 2 && sent.rows.map(r => r.branch).sort().join('|') === [BR_A, BR_B].sort().join('|') && sent.clientRequestId === reqIdBefore, JSON.stringify(sent).slice(0, 300));
  const forbiddenKeys = ['batch_id', 'matching_type', 'deadline_snapshot', 'auditor_name', 'branch'];
  check('[الدفعات] الحمولة لا تتضمن batch_id ولا matching_type ولا deadline_snapshot ولا auditor_name (يُنشئها الخادم)',
    !('batch_id' in sent) && sent.rows.every(r => forbiddenKeys.every(k => !(k in r.data))), JSON.stringify(sent.rows.map(r => Object.keys(r.data))));
  const rowA = sent.rows.find(r => r.branch === BR_A) || { data: {} };
  check('[الدفعات] قيم الفرع الأول في الحمولة صحيحة (تاريخ، وقت، مرسل، مستلم، موظف استلام)',
    rowA.data.matching_date === '2026-09-20' && rowA.data.branch_notification_time === '09:30' && rowA.data.sent_shipments === '10' && rowA.data.received_shipments === '10' && rowA.data.receiver_employee === 'أحمد سالم', JSON.stringify(rowA.data));
  const okMsg = await mPage.textContent('#formMsg');
  check('[الدفعات] رسالة النجاح تعرض ما أعاده الخادم (محاكى): 2 سجل، أرقام السجلات، Batch ID، وقت الحفظ', okMsg.includes('تم حفظ 2 سجل بنجاح') && okMsg.includes('T-1، T-2') && okMsg.includes('TEST-BATCH-0001') && okMsg.includes('2026-09-20 10:00'), okMsg);
  check('[الدفعات] بعد النجاح: الخانات والبطاقات صُفِّرت ورسالة النجاح باقية', (await mPage.$$('#mnBranchCards .branch-card')).length === 0 && (await mPage.$$('#mnBranchChips input:checked')).length === 0);
  check('[الدفعات] clientRequestId تجدّد بعد النجاح (دفعة منطقية جديدة)', await mPage.evaluate(() => mnBatchRequestId) !== reqIdBefore);

  // ---- (7) اختيار فرع واحد على الأقل مطلوب ----
  await mPage.click('#saveBtn');
  check('[الدفعات] الحفظ بلا أي فرع مختار يُرفض برسالة "اختر فرعًا واحدًا على الأقل"', (await mPage.textContent('#formMsg')).includes('اختر فرعًا واحدًا على الأقل'));

  // ---- (8) النوع الثاني (مرتجعات): type=MorningReturns وحمولة صف واحد ----
  await mPage.evaluate(() => { window.__calls.length = 0; });
  await mPage.click(`.type-card >> text=${RETURNS}`);
  await mPage.waitForSelector('#mnBranchChips');
  await mPage.check(chip(BR_A));
  await mPage.fill(await fid(BR_A, 'matching_date'), '2026-09-21');
  await mPage.fill(await fid(BR_A, 'branch_notification_time'), '10:15');
  await mPage.fill(await fid(BR_A, 'sent_shipments'), '4');
  await mPage.fill(await fid(BR_A, 'received_shipments'), '0'); // 0 مستلم: لا يُشترط موظف استلام
  await mPage.click('#saveBtn');
  await mPage.waitForSelector('#formMsg .msg.ok');
  const retCalls = await batchCalls();
  check('[الدفعات] مرتجعات: type=MorningReturns وصف واحد، ومستلم=0 لا يتطلب موظف استلام',
    retCalls.length === 1 && retCalls[0].type === 'MorningReturns' && retCalls[0].rows.length === 1 && (await mPage.textContent('#formMsg')).includes('تم حفظ 1 سجل بنجاح'), JSON.stringify(retCalls).slice(0, 200));

  // ---- (9) لا اتصال خارجي ولا طلب إلى Google Apps Script طوال القسم ----
  check('[الدفعات] صفر طلبات إلى script.google.com طوال القسم (وضع تجريبي محلي)', !mExternal.some(u => /script\.google(usercontent)?\.com/.test(u)), mExternal);
  await mPage.close();

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
    transferBadMsg.includes('لا يمكن أن يسبق وقت الإرسال'), transferBadMsg);
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

  // ==================== clientRequestId IDEMPOTENCY: إعادة إرسال نفس المعرّف إلى Code.gs الفعلي ====================
  // كان الاختبار يلتقط currentClientRequestId من نموذج المطابقة الصباحية القديم في الواجهة؛ ذلك النموذج لم يعد
  // متاحًا (انظر ملاحظة قسم Morning أعلاه)، فيُولَّد المعرّف الآن مباشرة ويُرسَل مرتين إلى الخادم الفعلي.
  const idemId = await page.evaluate(() => uuid());
  const idemBody = { date: '2026-09-21', branch: 'القاهرة الجديدة', auditor: 'أحمد سالم', total_shipments: 50, matched_shipments: 50 };
  const morningBeforeIdem = rowsFor('Morning').length;
  const idemFirst = await saveMorningDirect(idemBody, { clientRequestId: idemId });
  const rowsAfterFirstIdem = rowsFor('Morning').length;
  const idemRetryResult = await saveMorningDirect(idemBody, { clientRequestId: idemId });
  check('[Idempotency] الإرسال الأول ينشئ سجلًا واحدًا', idemFirst.ok === true && rowsAfterFirstIdem === morningBeforeIdem + 1, idemFirst);
  check('[Idempotency] إعادة إرسال نفس clientRequestId تُعيد نفس recordId بالضبط',
    idemRetryResult.recordId === idemFirst.recordId, { first: idemFirst.recordId, retry: idemRetryResult.recordId });
  check('[Idempotency] لا يُنشأ صف مكرر عند إعادة إرسال نفس clientRequestId',
    rowsFor('Morning').length === rowsAfterFirstIdem, { before: rowsAfterFirstIdem, after: rowsFor('Morning').length });

  // ==================== REPORTS TAB ====================
  await page.click('text=التقارير');
  await page.waitForSelector('#tab-reports:not(.hidden)');
  await page.click('text=توليد التقرير');
  await page.waitForSelector('#reportsBody .card', { timeout: 5000 });
  await page.waitForTimeout(200);
  const reportsText = await page.textContent('#reportsBody');
  check('تبويب التقارير يعرض ملخصًا تنفيذيًا بعد الضغط على "توليد التقرير"', reportsText.includes('الملخص التنفيذي') && reportsText.includes('إجمالي السجلات'), reportsText.slice(0, 200));
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
