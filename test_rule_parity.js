// Frontend/Backend validation-rule PARITY test.
//
// The Dashboard (ARRIVE Dashboard.html) carries its own client-side copy of the business-rule
// checks (clientValidateRules()) so obviously-invalid data never leaves the browser. Code.gs
// carries the authoritative copy (_validate()). Both are hand-written JavaScript — nothing stops
// them from silently drifting apart over time (someone fixes a bug in one and forgets the other).
//
// This test does NOT just eyeball that the two look similar. It extracts the ACTUAL
// clientValidateRules() function source out of the real index.html file (regex, not a re-typed
// copy) and runs it, side by side, against the real Code.gs _validate() (via the same gs_sandbox.js
// used by test_harness.js and test_dashboard.js), across a shared table of scenarios covering every
// rule kind currently defined in schema.json. If the two implementations ever disagree on whether a
// given record is valid, this test fails — that is the whole point of it.
const fs = require('fs');
const path = require('path');
const { buildMockSpreadsheet, buildSandbox } = require('./gs_sandbox');

const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '../backend/schema.json'), 'utf8'));
const codeGsSource = fs.readFileSync(path.join(__dirname, '../appsscript/Code.gs'), 'utf8');
const dashboardSrc = fs.readFileSync(path.join(__dirname, '../dashboard/index.html'), 'utf8');

// Extract the exact clientValidateRules(...) { ... } function body from the live index.html —
// not a re-typed copy — so this test is void if that function is ever renamed or removed, rather
// than silently testing a stale snapshot.
const fnMatch = dashboardSrc.match(/function clientValidateRules\(ct, data\) \{[\s\S]*?\n\}\n/);
if (!fnMatch) {
  console.error('FATAL: could not find clientValidateRules() in ARRIVE Dashboard.html — parity test cannot run.');
  process.exit(1);
}
const clientValidateRules = new Function('ct', 'data', `
  ${fnMatch[0].replace(/^function clientValidateRules\(ct, data\) \{/, '').replace(/\}\s*$/, '')}
`);

function ctByKey(key) { return schema.control_types.find(c => c.key === key); }

// Runs Code.gs's REAL _validate() (via the sandbox) for a single control type + data payload, with
// list membership pre-populated exactly like _actionSave() does before calling _validate().
function backendValidate(sandbox, ctKey, data) {
  const ct = ctByKey(ctKey);
  const settings = sandbox._readSettings();
  const dataWithLists = Object.assign({}, data, { __lists: settings.lists });
  return sandbox._validate(ct, dataWithLists);
}

const scenarios = [
  { ct: 'Morning', label: 'أعداد متوازنة، حالة مفتوحة بلا تاريخ إغلاق', data: {
    date: '2026-09-01', branch: 'القاهرة الجديدة', auditor: 'أحمد سالم', total_shipments: 100,
    matched_shipments: 100, status: 'مفتوحة' } },
  { ct: 'Morning', label: 'المثال الحقيقي المُبلَّغ عنه (500/100/50/2/4، مفتوحة+تاريخ إغلاق)', data: {
    date: '2026-09-01', branch: 'القاهرة الجديدة', auditor: 'أحمد سالم', total_shipments: 500,
    matched_shipments: 100, unmatched_shipments: 50, not_found_shipments: 2, error_shipments: 4,
    status: 'مفتوحة', close_date: '2026-09-22' } },
  { ct: 'Morning', label: 'أعداد متوازنة تمامًا (500 = 444+50+2+4)', data: {
    date: '2026-09-01', branch: 'القاهرة الجديدة', auditor: 'أحمد سالم', total_shipments: 500,
    matched_shipments: 444, unmatched_shipments: 50, not_found_shipments: 2, error_shipments: 4 } },
  { ct: 'Morning', label: 'إجمالي صفر مع كل الفئات صفر (لا رفض تسوية)', data: {
    date: '2026-09-01', branch: 'القاهرة الجديدة', auditor: 'أحمد سالم', total_shipments: 0, matched_shipments: 0 } },
  { ct: 'Morning', label: 'حالة مغلقة بلا تاريخ إغلاق', data: {
    date: '2026-09-01', branch: 'القاهرة الجديدة', auditor: 'أحمد سالم', total_shipments: 10,
    matched_shipments: 10, status: 'مغلقة' } },
  { ct: 'Morning', label: 'حالة مغلقة مع تاريخ إغلاق صحيح', data: {
    date: '2026-09-01', branch: 'القاهرة الجديدة', auditor: 'أحمد سالم', total_shipments: 10,
    matched_shipments: 10, status: 'مغلقة', close_date: '2026-09-05' } },
  { ct: 'Morning', label: 'تاريخ إغلاق قبل تاريخ السجل نفسه', data: {
    date: '2026-09-10', branch: 'القاهرة الجديدة', auditor: 'أحمد سالم', total_shipments: 10,
    matched_shipments: 10, status: 'مغلقة', close_date: '2026-09-05' } },
  { ct: 'Morning', label: 'تاريخ إغلاق يساوي تاريخ السجل (حد فاصل — يجب القبول، وليس الرفض)', data: {
    date: '2026-09-10', branch: 'القاهرة الجديدة', auditor: 'أحمد سالم', total_shipments: 10,
    matched_shipments: 10, status: 'مغلقة', close_date: '2026-09-10' } },
  { ct: 'Issues', label: 'حالة مغلقة بلا تاريخ إغلاق (نوع آخر بنفس القاعدة)', data: {
    detect_date: '2026-09-01', branch: 'المعادي', issue_type: 'شحنة مفقودة', description: 'اختبار',
    priority: 'عالية', owner: 'أحمد سالم', status: 'مغلقة' } },
  { ct: 'Issues', label: 'حالة متأخرة بلا سبب تأخير', data: {
    detect_date: '2026-09-01', branch: 'المعادي', issue_type: 'شحنة مفقودة', description: 'اختبار',
    priority: 'عالية', owner: 'أحمد سالم', status: 'متأخرة' } },
  { ct: 'Transfer', label: 'استلام قبل الإرسال', data: {
    date: '2026-09-01', transfer_no: 'T1', from_branch: 'القاهرة الجديدة', to_branch: 'مدينة نصر',
    send_dt: '2026-09-01T15:00:00', receive_dt: '2026-09-01T10:00:00', status: 'تم الإرسال' } },
  { ct: 'Penalty', label: 'اعتماد جزاء قبل اكتمال المراجعة', data: {
    log_date: '2026-09-01', branch: 'القاهرة الجديدة', employee: 'موظف 1', violation_type: 'تأخير غير مبرر',
    reviewed: 'لا', status: 'معتمدة' } },
  { ct: 'Penalty', label: 'حالة منفذة بدون تاريخ تنفيذ', data: {
    log_date: '2026-09-01', branch: 'القاهرة الجديدة', employee: 'موظف 1', violation_type: 'تأخير غير مبرر',
    reviewed: 'نعم', status: 'منفذة' } },
  // Negative-number scenarios — NOT a rule change. There is no min/max validation anywhere in the
  // system for these fields today (confirmed by reading schema.json and _validate()), so both sides
  // currently ACCEPT these. This scenario exists to guarantee that stays true of BOTH copies together —
  // if one side is ever given a sign check and the other isn't, this test starts failing immediately.
  { ct: 'Morning', label: '[سلوك حالي غير مؤكَّد كقاعدة عمل] إجمالي وشحنات مطابقة سالبتان ومتوازنتان (-10 = -10)', data: {
    date: '2026-09-01', branch: 'القاهرة الجديدة', auditor: 'أحمد سالم', total_shipments: -10, matched_shipments: -10 } },
];

function main() {
  const mockSS = buildMockSpreadsheet(schema);
  const sandbox = buildSandbox(codeGsSource, mockSS);
  const boot = sandbox._actionBootstrap();

  let pass = 0, fail = 0;
  scenarios.forEach(sc => {
    const ctBoot = boot.controlTypes.find(c => c.key === sc.ct); // exactly what the real bootstrap ships to the browser
    const backendErrors = backendValidate(sandbox, sc.ct, sc.data)
      .filter(e => !e.includes('إلزامي')); // rule-based errors only — required-field checks are a separate, already-parity-guaranteed mechanism (same field list from schema)
    const frontendErrors = clientValidateRules(ctBoot, sc.data);

    const backendRejects = backendErrors.length > 0;
    const frontendRejects = frontendErrors.length > 0;
    const agree = backendRejects === frontendRejects;

    console.log((agree ? 'PASS' : 'FAIL') + ` - [${sc.ct}] ${sc.label}`);
    if (!agree) {
      console.log('    الخادم (Code.gs):', backendErrors);
      console.log('    الواجهة (index.html):', frontendErrors);
      fail++;
    } else {
      pass++;
    }
  });

  console.log(`\n${pass} / ${scenarios.length} سيناريو متطابق بين الواجهة والخادم (اختبار توافق القواعد — لا تكرار غير متزامن)`);
  process.exit(fail === 0 ? 0 : 1);
}

main();
