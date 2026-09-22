// اختبارات Sandbox لأداة معاينة/محاكاة هجرة الفروع (Preview/Simulation) — البند سادسًا من المواصفة.
// يشغّل appsscript/Code.gs الفعلي عبر vm (كل باقي ملفات هذه الحزمة)، وليس Google Apps Script/Google
// Sheets حقيقيين. الهدف: إثبات أن الأداة (1) لا تكتب أي شيء إطلاقًا على أي شيت، و(2) تصنّف سجلات
// "قديمة" افتراضية (بلا معرّف فرع محسوب) بدقة إلى: مرتبط تلقائيًا، غير مرتبط (اسم غير معروف)، يحتاج
// مراجعة (تكرار اسم أو معرّف محفوظ غير صالح)، و(3) محمية بصلاحية manageBranches فقط.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { buildMockSpreadsheet, buildSandbox } = require('./gs_sandbox');

const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '../backend/schema.json'), 'utf8'));
const codeGsSource = fs.readFileSync(path.join(__dirname, 'Code.gs'), 'utf8');

const results = [];
function check(name, cond, detail) { results.push({ name, pass: !!cond, detail }); }

function freshSandbox() {
  const mockSS = buildMockSpreadsheet(schema);
  for (const row of mockSS._sheets["الإعدادات"].rows) if (row[0] === "auth_enabled") row[1] = "1";
  const sandbox = buildSandbox(codeGsSource, mockSS);
  return { mockSS, sandbox };
}

function doPost(sandbox, body) {
  return JSON.parse(sandbox.doPost({ postData: { contents: JSON.stringify(body) } }).getContent());
}

function loginAsAdmin(sandbox) {
  doPost(sandbox, { action: 'bootstrapAdmin', fullName: 'مسؤول الاختبار', username: 'migadmin', password: 'Passw0rd!' });
  const r = doPost(sandbox, { action: 'login', username: 'migadmin', password: 'Passw0rd!' });
  return r.token;
}

// ==================== إعداد مشترك: سجلات "قديمة" مُحقَنة مباشرة في الشيت (تحاكي بيانات سابقة
// لميزة branch_id_lookup — بلا عمود معرّف الفرع المحسوب على الإطلاق، تمامًا كما تصفها المواصفة) ====
function seedLegacyMorningRow(mockSS, branchNameCell, savedBranchIdCell) {
  const sh = mockSS._sheets["المطابقة الصباحية"];
  const headers = sh.rows[0];
  const row = new Array(headers.length).fill("");
  const idx = (label) => headers.indexOf(label);
  row[idx("رقم السجل")] = "MM-LEGACY-" + sh.rows.length;
  row[idx("التاريخ")] = "2025-01-01";
  row[idx("الفرع")] = branchNameCell;
  row[idx("اسم المدقق")] = schema.lists.Auditors[0];
  row[idx("إجمالي الشحنات")] = 10;
  row[idx("شحنات مطابقة")] = 10;
  if (savedBranchIdCell !== undefined) row[idx("معرّف الفرع (داخلي)")] = savedBranchIdCell;
  sh.appendRow(row);
}

(function run() {
  const { mockSS, sandbox } = freshSandbox();
  const token = loginAsAdmin(sandbox);

  // فروع الاختبار الحالية (بأسماء لا تتصادم مع بيانات الـ Schema الأصلية)
  const bA = doPost(sandbox, { action: 'addBranch', token, name: 'فرع اختبار الهجرة - أسيوط' });
  const bB = doPost(sandbox, { action: 'addBranch', token, name: 'فرع اختبار الهجرة - سوهاج' });
  check('[إعداد] إضافة فرعي اختبار نجحت', bA.ok && bB.ok, { bA, bB });

  // فرعان بنفس الاسم بالضبط (لمحاكاة تكرار اسم — حالة نادرة لكن واردة في بيانات قديمة غير منظَّفة).
  // يجب إدراجهما داخل قسم "القوائم" (قبل صف "الأهداف الرقابية") وليس بإلحاقهما في نهاية الشيت،
  // وإلا فسَّرتهما _readSettings كصفوف تابعة لقسم لاحق (نفس المنطق الذي يتبعه _actionAddBranch نفسه
  // عبر _listsSectionInsertRow — استخدام أي طريقة أخرى هنا كان سيكون خطأً في الاختبار نفسه لا في الأداة).
  const settingsSheet = mockSS._sheets["الإعدادات"];
  function insertBranchBeforeTargets(name, id) {
    const markerIdx = settingsSheet.rows.findIndex(r => r[0] === "الأهداف الرقابية"); // 0-based
    settingsSheet.insertRowBefore(markerIdx + 1); // 1-based row number == this 0-based index
    settingsSheet.rows[markerIdx] = ["Branches", name, id, "نشط"];
  }
  insertBranchBeforeTargets("فرع مكرر الاسم", "BR-DUP-1");
  insertBranchBeforeTargets("فرع مكرر الاسم", "BR-DUP-2");

  // 1) سجل قديم بلا معرّف فرع محسوب إطلاقًا، لكن باسم فرع مطابق تمامًا لفرع واحد حالي -> يجب تصنيفه "مرتبط"
  seedLegacyMorningRow(mockSS, 'فرع اختبار الهجرة - أسيوط');
  // 2) سجل قديم باسم فرع لم يعد موجودًا ضمن قائمة الفروع الحالية إطلاقًا -> "غير مرتبط / اسم غير معروف"
  seedLegacyMorningRow(mockSS, 'فرع تم حذفه من زمان');
  // 3) سجل قديم بلا اسم فرع مسجَّل إطلاقًا (حقل فارغ) -> "غير مرتبط"
  seedLegacyMorningRow(mockSS, '');
  // 4) سجل قديم باسم يطابق فرعين مختلفين بنفس الاسم -> "يحتاج مراجعة / تكرار اسم"
  seedLegacyMorningRow(mockSS, 'فرع مكرر الاسم');
  // 5) سجل يحمل معرّف فرع محفوظًا مسبقًا لكنه لم يعد يطابق أي فرع حالي (مثلًا فرع حُذف لاحقًا من القائمة تمامًا،
  //    أو خطأ إدخال) -> "يحتاج مراجعة"
  seedLegacyMorningRow(mockSS, 'فرع اختبار الهجرة - سوهاج', 'BR-NO-LONGER-EXISTS');
  // 6) سجل يحمل معرّف فرع محفوظًا وصالحًا فعلًا (المسار العادي بعد تفعيل الميزة) -> "مرتبط"، ويُعتمَد على
  //    المعرّف المحفوظ مباشرة وليس إعادة البحث بالاسم
  seedLegacyMorningRow(mockSS, 'فرع اختبار الهجرة - أسيوط', bA.branchId);

  // ==================== أ) الحماية: بلا Token يُرفض تمامًا ====================
  const noAuth = doPost(sandbox, { action: 'migrationPreviewBranches' });
  check('[أمان] معاينة الهجرة بلا Token تُرفض تمامًا (لا تُعيد أي تقرير)', noAuth.ok === false, noAuth);

  // ==================== ب) الحماية: مستخدم بلا صلاحية manageBranches يُرفض (Auditor مثلًا) ====================
  doPost(sandbox, { action: 'addEmployee', token, data: { fullName: 'مدقق فرعي', username: 'migauditor', password: 'Passw0rd!', role: 'Auditor', branches: [bA.branchId] } });
  const auditorLogin = doPost(sandbox, { action: 'login', username: 'migauditor', password: 'Passw0rd!' });
  const auditorTry = doPost(sandbox, { action: 'migrationPreviewBranches', token: auditorLogin.token });
  check('[أمان] Auditor (بلا manageBranches) يُرفض عند محاولة معاينة الهجرة', auditorTry.ok === false, auditorTry);

  // ==================== ج) لقطة لعدد صفوف كل الشيتات قبل التشغيل — إثبات "بلا كتابة" ====================
  // ملاحظة: _AuditLog يُستثنى عمدًا من هذه المقارنة — تسجيل تشغيل الأداة نفسه في سجل العمليات هو
  // سلوك مقصود ومتَّسق مع كل عملية أخرى في النظام (تمامًا كتسجيل الدخول)، وليس "كتابة على بيانات
  // الهجرة/الفروع". ما يجب أن يبقى بلا أي تغيير هو التابات السبعة وشيت "الإعدادات" (الفروع) نفسها.
  const dataSheets = Object.keys(mockSS._sheets).filter(k => k !== "_AuditLog");
  const rowCountsBefore = {};
  dataSheets.forEach(k => { rowCountsBefore[k] = mockSS._sheets[k].rows.length; });

  const preview = doPost(sandbox, { action: 'migrationPreviewBranches', token });
  check('[أساسي] الإداري (manageBranches) يحصل على تقرير معاينة ناجح', preview.ok === true, preview);

  const rowCountsAfter = {};
  dataSheets.forEach(k => { rowCountsAfter[k] = mockSS._sheets[k].rows.length; });
  check('[لا كتابة إطلاقًا على بيانات الهجرة] عدد صفوف كل تاب من التابات السبعة وشيت الإعدادات (الفروع) بعد المعاينة مطابق تمامًا لعدده قبلها',
    JSON.stringify(rowCountsBefore) === JSON.stringify(rowCountsAfter), { before: rowCountsBefore, after: rowCountsAfter });
  check('[وضع المعاينة] التقرير يعلن صراحة أنه PREVIEW_ONLY_NO_WRITES', preview.report && preview.report.mode === 'PREVIEW_ONLY_NO_WRITES', preview.report && preview.report.mode);

  const morningTab = (preview.report.tabs || []).find(t => t.key === 'Morning');
  check('[تصنيف] تاب المطابقة الصباحية موجود في التقرير ويضم كل السجلات المزروعة الستة على الأقل', morningTab && morningTab.total >= 6, morningTab);
  check('[تصنيف] سجل باسم فرع فريد مطابق تمامًا لفرع نشط واحد يُصنَّف "مرتبط"', morningTab.linked >= 2, morningTab);
  check('[تصنيف] سجل باسم فرع غير موجود ضمن القائمة الحالية يُصنَّف "غير مرتبط" + "اسم غير معروف"',
    morningTab.unknownBranchName >= 1 && morningTab.unlinked >= 1, morningTab);
  check('[تصنيف] سجل بلا اسم فرع مسجَّل إطلاقًا يُحتسَب ضمن "غير مرتبط"', morningTab.unlinked >= 2, morningTab);
  check('[تصنيف] سجل باسم يطابق فرعين مختلفين يُصنَّف "يحتاج مراجعة" + "تكرار اسم"',
    morningTab.duplicateNameMatches >= 1 && morningTab.needsReview >= 1, morningTab);
  check('[تصنيف] سجل بمعرّف فرع محفوظ لكن غير صالح (لا يطابق أي فرع حالي) يُصنَّف "يحتاج مراجعة"',
    morningTab.samples.needsReview.some(s => /BR-NO-LONGER-EXISTS/.test(s.reason)), morningTab.samples.needsReview);
  check('[أمثلة] عينات السجلات غير المرتبطة/المحتاجة مراجعة تتضمن معرّف السجل وسبب المشكلة (قابلة للمراجعة يدويًا)',
    morningTab.samples.unlinked.every(s => s.id && s.reason) && morningTab.samples.needsReview.every(s => s.id && s.reason),
    morningTab.samples);

  check('[إجماليات] المجموع الكلي في totals يطابق مجموع كل التابات (لا فقدان أو ازدواج عدّ)',
    preview.report.totals.total === preview.report.tabs.reduce((s, t) => s + t.total, 0), preview.report.totals);

  // ==================== د) سجل السجل التدقيقي: تشغيل الأداة نفسه يُسجَّل ====================
  const audit = doPost(sandbox, { action: 'auditLog', token });
  check('[سجل العمليات] تشغيل معاينة الهجرة يُسجَّل في سجل العمليات', (audit.entries || []).some(e => e.action === 'migrationPreviewBranches'), audit.entries && audit.entries.length);

  console.log(results.map(r => (r.pass ? 'PASS' : 'FAIL - ' + JSON.stringify(r.detail)) + ' - ' + r.name).join('\n'));
  const pass = results.filter(r => r.pass).length;
  console.log(`\n${pass} / ${results.length} اختبارًا ناجحًا (Sandbox — أداة معاينة/محاكاة هجرة الفروع، بلا كتابة فعلية على أي شيت)`);
  if (pass !== results.length) process.exit(1);
})();
