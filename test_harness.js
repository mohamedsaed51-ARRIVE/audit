// Node-based unit test harness for Code.gs business logic (Level 1 — "اختبار الكود").
// Mocks the Google Apps Script runtime (SpreadsheetApp, LockService, CacheService, Utilities,
// Session, ContentService) with an in-memory spreadsheet, so the ACTUAL functions in Code.gs
// run unmodified and get genuinely exercised — not re-implemented in the test.
//
// The mock runtime itself lives in gs_sandbox.js and is SHARED with dashboard/test_dashboard.js
// (the Playwright browser suite), so both test levels run against literally the same Code.gs
// execution, not two independently-typed re-implementations of the validation rules that could
// silently drift apart.
const fs = require('fs');
const { buildMockSpreadsheet, buildSandbox: buildSandboxFromSource } = require('./gs_sandbox');

const schemaSrc = fs.readFileSync(__dirname + '/Code.gs', 'utf8');
function buildSandbox(schema, mockSS) { return buildSandboxFromSource(schemaSrc, mockSS); }

function runHarness() {
  const schema = JSON.parse(fs.readFileSync(__dirname + '/../backend/schema.json', 'utf8'));
  const results = [];
  function check(name, cond, detail) { results.push({ name, pass: !!cond, detail }); }

  let mockSS = buildMockSpreadsheet(schema);
  let sandbox = buildSandbox(schema, mockSS);

  // ---- bootstrap / settings ----
  const boot = sandbox._actionBootstrap();
  check("bootstrap يعيد 7 أنواع رقابة", boot.controlTypes.length === 7, boot.controlTypes.map(c=>c.key));
  check("bootstrap يعيد قوائم الفروع (15 فرعًا)", boot.lists.Branches.length === 15, boot.lists.Branches.length);
  check("bootstrap يعيد filters لكل نوع", boot.controlTypes.every(c => !!c.filters), boot.controlTypes.map(c=>c.filters));
  const bootMorning = boot.controlTypes.find(c => c.key === "Morning");
  check("bootstrap يعيد validationRules للمطابقة الصباحية (نفس قواعد الخادم، للتحقق في الواجهة أيضًا)",
    Array.isArray(bootMorning.validationRules) && bootMorning.validationRules.some(r => r.rule === "morning_count_reconciliation"),
    bootMorning.validationRules);
  const settingsOnly = sandbox._actionSettings();
  check("settings مستقل يعيد نفس القوائم والأهداف", settingsOnly.targets.target_MorningMatchPct === 98, settingsOnly.targets);

  // ---- missing required field ----
  const badSave = sandbox._actionSave({ type: "Morning", data: { date: "2026-09-01" }, user: "Test" });
  check("رفض الحفظ عند نقص حقل إلزامي، ok:false", badSave.ok === false && badSave.errors.length > 0, badSave);

  // ---- invalid date / invalid number ----
  const badDate = sandbox._actionSave({ type: "Morning", data: {
    date: "ليس تاريخًا", branch: "القاهرة الجديدة", auditor: "أحمد سالم", total_shipments: 10, matched_shipments: 9 }, user: "Test" });
  check("رفض تاريخ غير صحيح", badDate.ok === false && badDate.errors.some(e => e.includes("تاريخًا صحيحًا")), badDate);

  const badNum = sandbox._actionSave({ type: "Morning", data: {
    date: "2026-09-01", branch: "القاهرة الجديدة", auditor: "أحمد سالم", total_shipments: "عشرة", matched_shipments: 9 }, user: "Test" });
  check("رفض قيمة رقمية غير صحيحة", badNum.ok === false && badNum.errors.some(e => e.includes("رقمًا")), badNum);

  // ---- value not in restricted list ----
  const badList = sandbox._actionSave({ type: "Morning", data: {
    date: "2026-09-01", branch: "فرع غير موجود بالإعدادات", auditor: "أحمد سالم", total_shipments: 10, matched_shipments: 9 }, user: "Test" });
  check("رفض قيمة غير موجودة في قائمة مقيدة (الفرع)", badList.ok === false && badList.errors.some(e => e.includes("غير موجودة في القائمة")), badList);

  // ---- unknown control type ----
  const badType = sandbox._actionSave({ type: "NotAType", data: {}, user: "Test" });
  check("رفض نوع رقابة غير معروف", badType.ok === false, badType);

  // ---- valid save + verify write actually happened (read-back) ----
  const save1 = sandbox._actionSave({
    type: "Morning", clientRequestId: "req-1",
    data: { date: "2026-09-01", branch: "القاهرة الجديدة", auditor: "أحمد سالم",
      total_shipments: 100, matched_shipments: 95, unmatched_shipments: 3, not_found_shipments: 1, error_shipments: 1 },
    user: "Mohamed"
  });
  check("حفظ سجل صحيح ينجح برقم متسلسل", save1.ok === true && save1.recordId === "MM-000001", save1);
  const morningSheet = mockSS._sheets["المطابقة الصباحية"];
  check("لم يُستبدل أي شيء — صف جديد فقط أُضيف", morningSheet.rows.length === 2, morningSheet.rows.length);

  // ---- idempotency: resubmitting the SAME clientRequestId must NOT create a second row ----
  const save1Retry = sandbox._actionSave({
    type: "Morning", clientRequestId: "req-1",
    data: { date: "2026-09-01", branch: "القاهرة الجديدة", auditor: "أحمد سالم",
      total_shipments: 100, matched_shipments: 95, unmatched_shipments: 3, not_found_shipments: 1, error_shipments: 1 },
    user: "Mohamed"
  });
  check("إعادة إرسال نفس الطلب (clientRequestId) لا تُنشئ سجلًا مكررًا", morningSheet.rows.length === 2 && save1Retry.recordId === save1.recordId, { rows: morningSheet.rows.length, retryId: save1Retry.recordId });

  // ---- second distinct save gets a new sequential ID ----
  const save2 = sandbox._actionSave({
    type: "Morning", clientRequestId: "req-2",
    data: { date: "2026-09-02", branch: "مدينة نصر", auditor: "منى عبد الله",
      total_shipments: 50, matched_shipments: 40, unmatched_shipments: 5, not_found_shipments: 3, error_shipments: 2 },
    user: "Mohamed"
  });
  check("سجل ثانٍ مستقل يحصل على ID جديد فريد", save2.recordId === "MM-000002", save2.recordId);

  // ==================== Morning matching: reconciliation + percentage + open/close-date fixes ====================
  // Reproduces the user's exact reported example: total=500, matched=100, unmatched=50, not_found=2, error=4
  // (sum=156, diff=-344) with status "مفتوحة" AND a close_date filled in — both should now be rejected.
  const badRealExample = sandbox._actionSave({ type: "Morning", data: {
    date: "2026-09-01", branch: "القاهرة الجديدة", auditor: "أحمد سالم",
    total_shipments: 500, matched_shipments: 100, unmatched_shipments: 50, not_found_shipments: 2, error_shipments: 4,
    status: "مفتوحة", close_date: "2026-09-22" }, user: "Test" });
  check("المثال الحقيقي المُبلَّغ عنه (مجموع 156 ≠ إجمالي 500) يُرفض الآن بدل أن يُحفظ", badRealExample.ok === false, badRealExample);
  check("رسالة الرفض توضح الإجمالي والمجموع والفرق بالأرقام", badRealExample.ok === false &&
    badRealExample.errors.some(e => e.includes("500") && e.includes("156") && e.includes("344")), badRealExample.errors);
  check("نفس السجل يُرفض أيضًا بسبب حالة \"مفتوحة\" مع تاريخ إغلاق موجود", badRealExample.ok === false &&
    badRealExample.errors.some(e => e.includes("مفتوحة") && e.includes("تاريخ إغلاق")), badRealExample.errors);
  check("لم يُنشأ أي صف في الشيت بسبب فشل التحقق (لا حفظ جزئي)", morningSheet.rows.length === 3, morningSheet.rows.length);

  // Fixing the reconciliation but leaving status "مفتوحة" + close_date -> still rejected by the OTHER rule alone
  const badOpenWithClose = sandbox._actionSave({ type: "Morning", data: {
    date: "2026-09-01", branch: "القاهرة الجديدة", auditor: "أحمد سالم",
    total_shipments: 500, matched_shipments: 444, unmatched_shipments: 50, not_found_shipments: 2, error_shipments: 4,
    status: "مفتوحة", close_date: "2026-09-22" }, user: "Test" });
  check("حالة \"مفتوحة\" مع تاريخ إغلاق تُرفض حتى مع أعداد متوازنة", badOpenWithClose.ok === false &&
    badOpenWithClose.errors.some(e => e.includes("تاريخ إغلاق")), badOpenWithClose.errors);

  // Closed without a close_date -> rejected (rule now applied to Morning too, not just Issues)
  const badClosedNoDate = sandbox._actionSave({ type: "Morning", data: {
    date: "2026-09-01", branch: "القاهرة الجديدة", auditor: "أحمد سالم",
    total_shipments: 10, matched_shipments: 10, status: "مغلقة" }, user: "Test" });
  check("حالة \"مغلقة\" بلا تاريخ إغلاق تُرفض (مطبَّقة الآن على المطابقة الصباحية)", badClosedNoDate.ok === false &&
    badClosedNoDate.errors.some(e => e.includes("تتطلب تسجيل تاريخ الإغلاق")), badClosedNoDate.errors);

  // close_date before the record's own date -> rejected
  const badCloseBeforeBase = sandbox._actionSave({ type: "Morning", data: {
    date: "2026-09-10", branch: "القاهرة الجديدة", auditor: "أحمد سالم",
    total_shipments: 10, matched_shipments: 10, status: "مغلقة", close_date: "2026-09-05" }, user: "Test" });
  check("تاريخ إغلاق قبل تاريخ السجل نفسه يُرفض", badCloseBeforeBase.ok === false &&
    badCloseBeforeBase.errors.some(e => e.includes("لا يمكن أن يكون قبل")), badCloseBeforeBase.errors);

  // Correct, fully consistent record: balanced counts + closed WITH a valid close_date on/after the base date
  const goodMorningClosed = sandbox._actionSave({ type: "Morning", clientRequestId: "req-good-closed", data: {
    date: "2026-09-10", branch: "القاهرة الجديدة", auditor: "أحمد سالم",
    total_shipments: 500, matched_shipments: 444, unmatched_shipments: 50, not_found_shipments: 2, error_shipments: 4,
    status: "مغلقة", close_date: "2026-09-12" }, user: "Test" });
  check("سجل صحيح (أعداد متوازنة + إغلاق صحيح) يُحفظ بنجاح", goodMorningClosed.ok === true, goodMorningClosed);

  // total_shipments = 0 (not empty, but zero) -> percentage guarded (no divide-by-zero), reconciliation skipped
  const zeroTotal = sandbox._actionSave({ type: "Morning", clientRequestId: "req-zero-total", data: {
    date: "2026-09-11", branch: "القاهرة الجديدة", auditor: "أحمد سالم", total_shipments: 0, matched_shipments: 0 }, user: "Test" });
  check("إجمالي الشحنات = صفر لا يسبب خطأ قسمة، والحفظ يمر", zeroTotal.ok === true, zeroTotal);
  const zeroTotalRow = mockSS._sheets["المطابقة الصباحية"].rows[mockSS._sheets["المطابقة الصباحية"].rows.length - 1];
  const zeroTotalHeaders = mockSS._sheets["المطابقة الصباحية"].rows[0];
  const pctColIdx = zeroTotalHeaders.indexOf("نسبة المطابقة");
  check("نسبة المطابقة عند إجمالي صفر تبقى فارغة (وليس NaN/Infinity)", zeroTotalRow[pctColIdx] === "", zeroTotalRow[pctColIdx]);

  // Percentage formatting: stored as a real fraction in the cell, WITH an actual "0.0%" number format applied
  const pctFraction = goodMorningClosed.ok ? mockSS._sheets["المطابقة الصباحية"].rows.find(r => r[0] === goodMorningClosed.recordId)[pctColIdx] : null;
  check("النسبة تُخزَّن كرقم كسري صحيح في الشيت (444/500 = 0.888)", Math.abs(pctFraction - 0.888) < 0.0001, pctFraction);
  const pctCellFormat = mockSS._sheets["المطابقة الصباحية"].formats[
    (mockSS._sheets["المطابقة الصباحية"].rows.findIndex(r => r[0] === goodMorningClosed.recordId) + 1) + ',' + (pctColIdx + 1)
  ];
  check("تنسيق الخلية الفعلي في الشيت هو نسبة مئوية (0.0%) — وليس رقمًا خامًا", pctCellFormat === "0.0%", pctCellFormat);

  // API-facing display: getRecord must return the percentage as "88.8%", not the raw 0.888
  const goodRec = sandbox._actionGetRecord({ type: "Morning", id: goodMorningClosed.recordId });
  check("الواجهة (getRecord) تعرض النسبة كـ 88.8% وليس 0.888", goodRec.record["نسبة المطابقة"] === "88.8%", goodRec.record["نسبة المطابقة"]);

  // Duplicate-save prevention re-verified specifically for this fixed record (same clientRequestId twice)
  const rowCountBeforeRetry = mockSS._sheets["المطابقة الصباحية"].rows.length;
  const goodMorningRetry = sandbox._actionSave({ type: "Morning", clientRequestId: "req-good-closed", data: {
    date: "2026-09-10", branch: "القاهرة الجديدة", auditor: "أحمد سالم",
    total_shipments: 500, matched_shipments: 444, unmatched_shipments: 50, not_found_shipments: 2, error_shipments: 4,
    status: "مغلقة", close_date: "2026-09-12" }, user: "Test" });
  check("إعادة إرسال نفس clientRequestId لسجل المطابقة الصباحية لا يُنشئ صفًا إضافيًا",
    mockSS._sheets["المطابقة الصباحية"].rows.length === rowCountBeforeRetry && goodMorningRetry.recordId === goodMorningClosed.recordId,
    { before: rowCountBeforeRetry, after: mockSS._sheets["المطابقة الصباحية"].rows.length });

  // ---- Negative numbers in count fields: DOCUMENTING current behavior, NOT changing it. -----------------
  // No field in schema.json declares a min/max, and _validate()'s only numeric check is isNaN(Number(v)),
  // which a negative number passes. This is a genuine, reported gap (see final report §4) — these tests
  // exist so the current behavior is pinned down precisely and any future change to it is a deliberate,
  // visible diff here, not a silent regression.
  const negBalanced = sandbox._actionSave({ type: "Morning", clientRequestId: "req-neg-balanced", data: {
    date: "2026-09-13", branch: "القاهرة الجديدة", auditor: "أحمد سالم", total_shipments: -10, matched_shipments: -10 }, user: "Test" });
  check("[سلوك حالي غير مؤكَّد كقاعدة عمل] إجمالي وشحنات مطابقة سالبتان ومتوازنتان (-10 = -10): يُقبل حاليًا لأن (total > 0) شرط لتفعيل فحص التسوية أصلًا",
    negBalanced.ok === true, negBalanced);
  const negUnbalancedButArithmeticallyEqual = sandbox._actionSave({ type: "Morning", clientRequestId: "req-neg-mixed", data: {
    date: "2026-09-14", branch: "القاهرة الجديدة", auditor: "أحمد سالم",
    total_shipments: 100, matched_shipments: -5, unmatched_shipments: 105 }, user: "Test" });
  check("[سلوك حالي غير مؤكَّد كقاعدة عمل] شحنات مطابقة سالبة (-5) مع أعداد أخرى توازن الإجمالي حسابيًا: يُقبل حاليًا لأن القاعدة تتحقق من مجموع جبري فقط، لا من صحة كل حقل منفردًا",
    negUnbalancedButArithmeticallyEqual.ok === true, negUnbalancedButArithmeticallyEqual);
  const negPenalty = sandbox._actionSave({ type: "Penalty", clientRequestId: "req-neg-penalty", data: {
    log_date: "2026-09-01", branch: "القاهرة الجديدة", employee: "موظف اختبار", violation_type: "تأخير غير مبرر",
    penalty_value: -500, reviewed: "لا", status: "قيد المراجعة" }, user: "Test" });
  check("[سلوك حالي غير مؤكَّد كقاعدة عمل] قيمة جزاء سالبة (-500 جنيه): تُقبل حاليًا — لا يوجد أي تحقق من الإشارة في هذا الحقل",
    negPenalty.ok === true, negPenalty);

  // ---- Negative numbers: the 3 remaining count fields that had NO direct test until now (unmatched/not_found/error). ----
  // Each is tested individually (negative value in ONLY that field, others zero/positive) so the result is
  // attributable to that specific field, not to an arithmetic coincidence across several fields at once.
  const negUnmatchedOnly = sandbox._actionSave({ type: "Morning", clientRequestId: "req-neg-unmatched", data: {
    date: "2026-09-18", branch: "القاهرة الجديدة", auditor: "أحمد سالم",
    total_shipments: 0, matched_shipments: 0, unmatched_shipments: -3, not_found_shipments: 3 }, user: "Test" });
  check("[سلوك حالي غير مؤكَّد كقاعدة عمل — يحتاج قرارًا إداريًا] شحنات غير مطابقة سالبة (-3) بمفردها، ضمن مجموع يوازن صفر جبريًا: تُقبل حاليًا",
    negUnmatchedOnly.ok === true, negUnmatchedOnly);
  const negNotFoundOnly = sandbox._actionSave({ type: "Morning", clientRequestId: "req-neg-notfound", data: {
    date: "2026-09-19", branch: "القاهرة الجديدة", auditor: "أحمد سالم",
    total_shipments: 0, matched_shipments: 0, not_found_shipments: -2, error_shipments: 2 }, user: "Test" });
  check("[سلوك حالي غير مؤكَّد كقاعدة عمل — يحتاج قرارًا إداريًا] شحنات لم يتم العثور عليها سالبة (-2) بمفردها: تُقبل حاليًا",
    negNotFoundOnly.ok === true, negNotFoundOnly);
  const negErrorOnly = sandbox._actionSave({ type: "Morning", clientRequestId: "req-neg-error", data: {
    date: "2026-09-20", branch: "القاهرة الجديدة", auditor: "أحمد سالم",
    total_shipments: 0, matched_shipments: 0, unmatched_shipments: 2, error_shipments: -2 }, user: "Test" });
  check("[سلوك حالي غير مؤكَّد كقاعدة عمل — يحتاج قرارًا إداريًا] شحنات بها أخطاء سالبة (-2) بمفردها: تُقبل حاليًا",
    negErrorOnly.ok === true, negErrorOnly);

  // ---- close_date_not_before_base via the FULL _actionSave path — REINFORCING coverage. ----
  // CORRECTION to earlier review rounds: this file already had a test for this exact rule via the full
  // _actionSave path ("تاريخ إغلاق قبل تاريخ السجل نفسه يُرفض" above — a pre-existing test, not added in
  // this round). An earlier review incorrectly stated this rule was untested via _actionSave in this file;
  // that was a genuine research mistake (a grep for the rule's literal name missed the existing test's
  // differently-worded check string), not a fabricated claim, and it is corrected here explicitly. This
  // additional scenario is kept anyway because it adds something the pre-existing test did not have: an
  // explicit assertion that no row is left behind in the sheet after the rejection.
  const morningRowsBeforeOldClose = mockSS._sheets["المطابقة الصباحية"].rows.length;
  const oldCloseFullSave = sandbox._actionSave({ type: "Morning", clientRequestId: "req-old-close-actionsave", data: {
    date: "2026-09-21", branch: "القاهرة الجديدة", auditor: "أحمد سالم", total_shipments: 10, matched_shipments: 10,
    status: "مغلقة", close_date: "2026-09-15" }, user: "Test" }); // close_date before date -> must be rejected
  check("[اختبار قاعدة فعلية — تعزيز تغطية موجودة مسبقًا] close_date_not_before_base عبر مسار _actionSave الكامل، مع تأكيد صريح على عدم إنشاء صف",
    oldCloseFullSave.ok === false && oldCloseFullSave.errors.some(e => e.includes("لا يمكن أن يكون قبل تاريخ المطابقة")), oldCloseFullSave);
  check("[اختبار قاعدة فعلية] لا يُنشأ أي صف في الشيت الفعلي عند هذا الرفض عبر _actionSave",
    mockSS._sheets["المطابقة الصباحية"].rows.length === morningRowsBeforeOldClose, mockSS._sheets["المطابقة الصباحية"].rows.length);

  // ---- Unknown Action via the REAL doGet/doPost dispatcher (not an internal _actionX call). -------------
  // Every other check in this file calls sandbox._actionX(...) directly, which never exercises doGet/doPost
  // themselves (action-string routing, JSON parsing). This is the first and only test in this file that
  // does — it proves the public entry points reject an unrecognized action cleanly.
  const unknownActionPost = sandbox.doPost({ postData: { contents: JSON.stringify({ action: "__does_not_exist__", type: "Morning", data: {} }) } });
  const unknownActionResult = JSON.parse(unknownActionPost.getContent());
  check("[اختبار قاعدة فعلية] doPost الحقيقي يرفض Action غير معروف بوضوح (ok:false)",
    unknownActionResult.ok === false && typeof unknownActionResult.error === "string", unknownActionResult);
  const unknownActionGet = sandbox.doGet({ parameter: { action: "__does_not_exist__" } });
  const unknownActionGetResult = JSON.parse(unknownActionGet.getContent());
  check("[اختبار قاعدة فعلية] doGet الحقيقي يرفض Action غير معروف بوضوح (ok:false)",
    unknownActionGetResult.ok === false && typeof unknownActionGetResult.error === "string", unknownActionGetResult);

  // ---- Transfer: receive before send rejected; confirm-duration vs receive-duration are DIFFERENT metrics ----
  const badTransfer = sandbox._actionSave({ type: "Transfer", data: {
    date: "2026-09-01", transfer_no: "T1", from_branch: "القاهرة الجديدة", to_branch: "مدينة نصر",
    send_dt: "2026-09-01T15:00:00", receive_dt: "2026-09-01T10:00:00", status: "تم الإرسال" }, user: "M" });
  check("رفض استلام قبل الإرسال", badTransfer.ok === false, badTransfer);

  const goodTransfer = sandbox._actionSave({ type: "Transfer", data: {
    date: "2026-09-01", transfer_no: "T2", from_branch: "القاهرة الجديدة", to_branch: "مدينة نصر",
    send_dt: "2026-09-01T08:00:00", receive_dt: "2026-09-02T14:00:00", confirm_time: "10:00:00", status: "تم التأكيد" }, user: "M" });
  check("حفظ تحويل صحيح", goodTransfer.ok === true, goodTransfer);
  const trSheet = mockSS._sheets["التحويلات"];
  const trHeaders = trSheet.rows[0], trRow = trSheet.rows[1];
  const receiveDur = trRow[trHeaders.indexOf("مدة الوصول (ساعة)")];
  const confirmDur = trRow[trHeaders.indexOf("مدة تأكيد التحويل (ساعة)")];
  check("مدة الوصول (30 ساعة) محسوبة من send/receive", Math.abs(receiveDur - 30) < 0.01, receiveDur);
  check("مدة التأكيد (2 ساعة) محسوبة بشكل مستقل عن مدة الوصول", Math.abs(confirmDur - 2) < 0.01, confirmDur);
  check("مدة الوصول ومدة التأكيد رقمان مختلفان (لا مؤشر واحد لحسابين)", receiveDur !== confirmDur, { receiveDur, confirmDur });
  const slaVal = trRow[trHeaders.indexOf("حالة الالتزام الزمني بالتأكيد (محسوبة)")];
  check("SLA التحويل يُحسب من مدة التأكيد (2<=24) وليس مدة الوصول (30>24)", slaVal.includes("ضمن الهدف"), slaVal);

  // ---- Penalty: no approve before review; executed requires execute_date ----
  const badPenalty = sandbox._actionSave({ type: "Penalty", data: {
    log_date: "2026-09-01", branch: "القاهرة الجديدة", employee: "موظف 1",
    violation_type: "تأخير غير مبرر", reviewed: "لا", status: "معتمدة" }, user: "M" });
  check("رفض اعتماد جزاء قبل اكتمال المراجعة", badPenalty.ok === false, badPenalty);

  const badExecPenalty = sandbox._actionSave({ type: "Penalty", data: {
    log_date: "2026-09-01", branch: "القاهرة الجديدة", employee: "موظف 1",
    violation_type: "تأخير غير مبرر", reviewed: "نعم", status: "منفذة" }, user: "M" });
  check("رفض حالة \"منفذة\" بدون تاريخ تنفيذ", badExecPenalty.ok === false && badExecPenalty.errors.some(e => e.includes("تاريخ التنفيذ")), badExecPenalty);

  const goodPenalty = sandbox._actionSave({ type: "Penalty", data: {
    log_date: "2026-09-01", branch: "القاهرة الجديدة", employee: "موظف 1",
    violation_type: "تأخير غير مبرر", reviewed: "نعم", status: "منفذة", execute_date: "2026-09-05", penalty_value: 500 }, user: "M" });
  check("حفظ جزاء صحيح بعد استيفاء الشروط", goodPenalty.ok === true, goodPenalty);

  // ---- Issues: closed requires close_date; late requires delay_reason ----
  const badClosedIssue = sandbox._actionSave({ type: "Issues", data: {
    detect_date: "2026-09-01", branch: "المعادي", issue_type: "شحنة مفقودة",
    description: "اختبار", priority: "عالية", owner: "أحمد سالم", status: "مغلقة" }, user: "M" });
  check("رفض حالة \"مغلقة\" بدون تاريخ إغلاق", badClosedIssue.ok === false && badClosedIssue.errors.some(e => e.includes("تاريخ الإغلاق")), badClosedIssue);

  const badLateIssue = sandbox._actionSave({ type: "Issues", data: {
    detect_date: "2026-09-01", branch: "المعادي", issue_type: "شحنة مفقودة",
    description: "اختبار", priority: "عالية", owner: "أحمد سالم", status: "متأخرة" }, user: "M" });
  check("رفض حالة \"متأخرة\" بدون سبب تأخير", badLateIssue.ok === false && badLateIssue.errors.some(e => e.includes("سبب التأخير")), badLateIssue);

  const goodIssue = sandbox._actionSave({ type: "Issues", data: {
    detect_date: "2026-09-01", branch: "المعادي", issue_type: "شحنة مفقودة",
    description: "اختبار", priority: "عالية", owner: "أحمد سالم", status: "مغلقة", close_date: "2026-09-02" }, user: "M" });
  check("حفظ مشكلة مغلقة صحيحة بعد استيفاء الشرط", goodIssue.ok === true, goodIssue);

  // ---- update in place (audit trail, no duplicate row) ----
  const upd = sandbox._actionUpdate({ type: "Morning", id: "MM-000001", data: {
    date: "2026-09-01", branch: "القاهرة الجديدة", auditor: "أحمد سالم",
    total_shipments: 100, matched_shipments: 98, unmatched_shipments: 1, not_found_shipments: 1, error_shipments: 0 }, user: "Supervisor" });
  check("تعديل السجل ينجح", upd.ok === true, upd);
  const headers1 = morningSheet.rows[0], rowAfter = morningSheet.rows[1];
  check("القيمة المعدَّلة انعكست فعليًا في الشيت", rowAfter[headers1.indexOf("شحنات مطابقة")] === 98, rowAfter[headers1.indexOf("شحنات مطابقة")]);
  check("رقم السجل الأصلي محتفَظ به (لا صف جديد)", morningSheet.rows.length === 10, morningSheet.rows.length);
  check("تسجيل المستخدم المعدِّل ووقت التعديل", rowAfter[headers1.indexOf("المستخدم المعدّل")] === "Supervisor", rowAfter[headers1.indexOf("المستخدم المعدّل")]);

  // ---- update of nonexistent record ----
  const updBad = sandbox._actionUpdate({ type: "Morning", id: "MM-999999", data: { date: "2026-09-01" }, user: "X" });
  check("تعديل سجل غير موجود يُرفض بوضوح", updBad.ok === false, updBad);

  // ---- getRecord ----
  const rec = sandbox._actionGetRecord({ type: "Morning", id: "MM-000002" });
  check("getRecord يعيد السجل الصحيح", rec.ok === true && rec.record["الفرع"] === "مدينة نصر", rec);
  const recBad = sandbox._actionGetRecord({ type: "Morning", id: "MM-NOPE" });
  check("getRecord لسجل غير موجود يرجع ok:false", recBad.ok === false, recBad);

  // ---- unified filters: kpis/search honor date + branch consistently ----
  const kpisFiltered = sandbox._actionKpis({ branch: "مدينة نصر" });
  check("فلتر الفرع يقلّص KPI المطابقة الصباحية لسجل واحد فقط", kpisFiltered.byType.Morning.total === 1, kpisFiltered.byType.Morning.total);
  const kpisDateFiltered = sandbox._actionKpis({ dateFrom: "2026-09-02", dateTo: "2026-09-02" });
  check("فلتر التاريخ (يوم محدد) يعزل سجل 2026-09-02 فقط", kpisDateFiltered.byType.Morning.total === 1, kpisDateFiltered.byType.Morning.total);
  check("filtersApplied موجود وواضح في رد KPIs", typeof kpisFiltered.filtersApplied === "string" && kpisFiltered.filtersApplied.includes("مدينة نصر"), kpisFiltered.filtersApplied);

  const kpisTypeFiltered = sandbox._actionKpis({ type: "Morning" });
  check("فلتر نوع الرقابة في KPIs يقتصر على النوع المختار فقط (Bug تم إصلاحه)",
    Object.keys(kpisTypeFiltered.byType).length === 1 && !!kpisTypeFiltered.byType.Morning && !kpisTypeFiltered.byType.Overdue,
    Object.keys(kpisTypeFiltered.byType));

  const searchFiltered = sandbox._actionSearch({ type: "Morning", branch: "مدينة نصر" });
  check("البحث يطبّق نفس فلتر الفرع", searchFiltered.count === 1, searchFiltered.count);

  // ---- pagination ----
  for (let i = 0; i < 30; i++) {
    sandbox._actionSave({ type: "Scrub", clientRequestId: "scrub-" + i, data: {
      date: "2026-09-01", awb: "AWB" + i, branch: "طنطا", user: "كريم فتحي", has_approval: "نعم" }, user: "LoadTest" });
  }
  const page1 = sandbox._actionSearch({ type: "Scrub", page: 1, pageSize: 10 });
  const page2 = sandbox._actionSearch({ type: "Scrub", page: 2, pageSize: 10 });
  check("Pagination: الصفحة الأولى 10 نتائج من إجمالي 30", page1.results.length === 10 && page1.count === 30 && page1.totalPages === 3, { len: page1.results.length, count: page1.count, totalPages: page1.totalPages });
  check("Pagination: الصفحة الثانية نتائج مختلفة عن الأولى", page1.results[0].record["رقم السجل"] !== page2.results[0].record["رقم السجل"], { p1: page1.results[0].record["رقم السجل"], p2: page2.results[0].record["رقم السجل"] });

  // ---- reports ----
  const rep = sandbox._actionReports({});
  check("reports يعيد إجماليًا عامًا ومصفوفة توزيع حسب النوع", rep.ok === true && rep.current.grandTotal > 0 && rep.current.byType.Morning.count === 9, rep.current.grandTotal);
  check("reports يحسب المخالفات المؤكدة من مسح الحالات فقط", typeof rep.current.confirmedViolations === "number", rep.current.confirmedViolations);

  // ---- large volume (1000+ records): no fixed-range cap, still consistent ----
  for (let i = 0; i < 1000; i++) {
    sandbox._actionSave({ type: "Overdue", clientRequestId: "od-" + i, data: {
      detect_date: "2026-09-20", awb: "OD" + i, branch: "طنطا", created_date: "2026-08-25" }, user: "LoadTest" });
  }
  const kpisBig = sandbox._actionKpis({});
  check("النظام يستمر بعد 1000+ سجل إضافي (لا سقف ثابت 1204)", kpisBig.byType.Overdue.total === 1000, kpisBig.byType.Overdue.total);
  const searchBig = sandbox._actionSearch({ type: "Overdue", q: "OD999", pageSize: 5 });
  check("البحث يجد سجلًا محددًا وسط 1000 سجل", searchBig.results.length === 1, searchBig.results.length);

  // ---- report ----
  let passed = 0;
  results.forEach(r => {
    console.log((r.pass ? 'PASS' : 'FAIL') + ' - ' + r.name + (r.pass ? '' : '  [' + JSON.stringify(r.detail) + ']'));
    if (r.pass) passed++;
  });
  console.log('\n' + passed + ' / ' + results.length + ' اختبارًا ناجحًا (مستوى الكود — Node.js يشغّل Code.gs فعليًا بمحاكاة)');
  process.exit(passed === results.length ? 0 : 1);
}

runHarness();
