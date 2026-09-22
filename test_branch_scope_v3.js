// اختبارات Sandbox جديدة لجولة V3: تغيير نطاق فروع Audit Manager من "all" الثابت إلى "own" القابل
// للتخصيص (لا يحصل على كل الفروع تلقائيًا بعد الآن — فقط بتفويض صريح canBeAssignedAllBranches)،
// سجل العمليات المنظَّم (JSON بالقيمة القديمة والجديدة) عند تعديل دور/نطاق فروع موظف، وإصلاح ثغرة
// الكتابة الجزئية في _actionUpdateEmployee (فشل التحقق من حقل متأخر كان لا يمنع كتابة حقل سابق).
//
// Level: Node.js / Sandbox — appsscript/Code.gs الفعلي عبر gs_sandbox.js عبر doGet/doPost، وليس
// Google Apps Script/Google Sheets حقيقيين.
const fs = require('fs');
const { buildMockSpreadsheet, buildSandbox: buildSandboxFromSource } = require('./gs_sandbox');

const codeGsSource = fs.readFileSync(__dirname + '/Code.gs', 'utf8');
function buildSandbox(mockSS) { return buildSandboxFromSource(codeGsSource, mockSS); }
function setAuthEnabled(mockSS, on) {
  const sh = mockSS._sheets["الإعدادات"];
  for (let r = 1; r < sh.rows.length; r++) if (sh.rows[r][0] === "auth_enabled") { sh.rows[r][1] = on ? "1" : "0"; return; }
}
function doGetJson(sandbox, params) { return JSON.parse(sandbox.doGet({ parameter: params }).getContent()); }
function doPostJson(sandbox, body) { return JSON.parse(sandbox.doPost({ postData: { contents: JSON.stringify(body) } }).getContent()); }

function run() {
  const schema = JSON.parse(fs.readFileSync(__dirname + '/../backend/schema.json', 'utf8'));
  const results = [];
  const check = (name, cond, detail) => results.push({ name, pass: !!cond, detail });

  const mockSS = buildMockSpreadsheet(schema);
  const sandbox = buildSandbox(mockSS);
  setAuthEnabled(mockSS, true);

  const admin = sandbox._actionBootstrapAdmin({ fullName: "مسؤول", username: "admin1", password: "Passw0rd!" });
  const adminToken = doPostJson(sandbox, { action: "login", username: "admin1", password: "Passw0rd!" }).token;
  const b1 = doPostJson(sandbox, { action: "addBranch", token: adminToken, name: "فرع V3 - الإسكندرية" });
  const b2 = doPostJson(sandbox, { action: "addBranch", token: adminToken, name: "فرع V3 - المنصورة" });

  // ==================== 1) Audit Manager لم يعد يحصل على "كل الفروع" تلقائيًا ====================
  const amNoBranches = doPostJson(sandbox, { action: "addEmployee", token: adminToken,
    data: { fullName: "مدير تدقيق بلا فرع", username: "amNoBr", password: "Passw0rd!", role: "Audit Manager" } });
  check("[Audit Manager] إضافة Audit Manager بلا فروع وبلا ALL صريحة تُرفض — لم يعد نطاقه \"all\" ثابتًا في الدور",
    amNoBranches.ok === false, amNoBranches);

  const amScoped = doPostJson(sandbox, { action: "addEmployee", token: adminToken,
    data: { fullName: "مدير تدقيق فرعي", username: "amScoped", password: "Passw0rd!", role: "Audit Manager", branches: [b1.branchId] } });
  check("[Audit Manager] إضافة Audit Manager بفرع محدد واحد تنجح", amScoped.ok === true, amScoped);
  const amAll = doPostJson(sandbox, { action: "addEmployee", token: adminToken,
    data: { fullName: "مدير تدقيق عام", username: "amAll", password: "Passw0rd!", role: "Audit Manager", branches: "ALL" } });
  check("[Audit Manager] إضافة Audit Manager بـ ALL الصريحة تنجح (الدور يملك canBeAssignedAllBranches)", amAll.ok === true, amAll);

  // سجلات فعلية في فرعين مختلفين
  const saveAlex = doPostJson(sandbox, { action: "save", token: adminToken, clientRequestId: "v3-1",
    type: "Morning", data: { date: "2026-09-01", branch: "فرع V3 - الإسكندرية", auditor: "أحمد سالم", total_shipments: 10, matched_shipments: 10 }, user: "admin1" });
  const saveMansoura = doPostJson(sandbox, { action: "save", token: adminToken, clientRequestId: "v3-2",
    type: "Morning", data: { date: "2026-09-01", branch: "فرع V3 - المنصورة", auditor: "منى عبد الله", total_shipments: 7, matched_shipments: 7 }, user: "admin1" });
  check("[إعداد] حفظ سجلين في فرعين مختلفين نجح", saveAlex.ok && saveMansoura.ok, { saveAlex, saveMansoura });

  const amScopedToken = doPostJson(sandbox, { action: "login", username: "amScoped", password: "Passw0rd!" }).token;
  const amAllToken = doPostJson(sandbox, { action: "login", username: "amAll", password: "Passw0rd!" }).token;

  const searchByScopedAM = doGetJson(sandbox, { action: "search", token: amScopedToken, type: "Morning" });
  check("[Branch Scope] Audit Manager المقيَّد بفرع الإسكندرية يرى سجل هذا الفرع فقط (وليس كل السجلات)",
    searchByScopedAM.ok && searchByScopedAM.count === 1 && searchByScopedAM.results[0].record["الفرع"] === "فرع V3 - الإسكندرية", searchByScopedAM);
  const searchByAllAM = doGetJson(sandbox, { action: "search", token: amAllToken, type: "Morning" });
  check("[Branch Scope] Audit Manager صاحب ALL الصريحة يرى كل السجلات من كل الفروع", searchByAllAM.ok && searchByAllAM.count === 2, searchByAllAM);

  const reportsByScopedAM = doGetJson(sandbox, { action: "reports", token: amScopedToken });
  check("[Branch Scope] تقارير Audit Manager المقيَّد بفرع تعرض فرعه فقط (وليس كل الفروع تلقائيًا كما كان سابقًا)",
    reportsByScopedAM.ok && reportsByScopedAM.current.byType.Morning.count === 1, reportsByScopedAM.current && reportsByScopedAM.current.byType.Morning);

  // ==================== 2) سجل العمليات المنظَّم عند تعديل موظف (دور + نطاق فروع معًا) ====================
  const beforeChanges = { role: "Audit Manager", branches: [b1.branchId] };
  const updateBoth = doPostJson(sandbox, { action: "updateEmployee", token: adminToken, id: amScoped.employeeId,
    data: { role: "Auditor", branches: [b2.branchId] } });
  check("[تعديل موظف] تعديل الدور ونطاق الفروع معًا لموظف آخر (ليس نفس المنفِّذ) ينجح", updateBoth.ok === true, updateBoth);

  const auditAfterUpdate = doPostJson(sandbox, { action: "auditLog", token: adminToken });
  const updateEntry = (auditAfterUpdate.entries || []).find(e => e.action === "updateEmployee" && e.details && e.details.indexOf(amScoped.employeeId) !== -1);
  check("[سجل العمليات المنظَّم] يوجد قيد updateEmployee لهذا الموظف في سجل العمليات", !!updateEntry, auditAfterUpdate.entries);
  let parsedDetails = null;
  try { parsedDetails = updateEntry && JSON.parse(updateEntry.details); } catch (e) { /* يبقى null */ }
  check("[سجل العمليات المنظَّم] تفاصيل القيد JSON صالح ويحتوي employeeId وchanges", !!(parsedDetails && parsedDetails.employeeId === amScoped.employeeId && parsedDetails.changes), parsedDetails);
  check("[سجل العمليات المنظَّم] تغيّر الدور مسجَّل بالقيمة القديمة والجديدة معًا (Audit Manager -> Auditor)",
    !!(parsedDetails && parsedDetails.changes.role && parsedDetails.changes.role.oldValue === "Audit Manager" && parsedDetails.changes.role.newValue === "Auditor"),
    parsedDetails && parsedDetails.changes.role);
  check("[سجل العمليات المنظَّم] تغيّر نطاق الفروع مسجَّل بـ Branch ID القديم والجديد معًا، وليس اسم الفرع",
    !!(parsedDetails && parsedDetails.changes.branchScope &&
       parsedDetails.changes.branchScope.oldValue === "[" + b1.branchId + "]" &&
       parsedDetails.changes.branchScope.newValue === "[" + b2.branchId + "]"),
    parsedDetails && parsedDetails.changes.branchScope);
  check("[سجل العمليات المنظَّم] لا كلمة مرور ولا hash/salt يظهران داخل تفاصيل القيد", updateEntry && updateEntry.details.indexOf("Passw0rd") === -1, updateEntry);

  // ==================== 3) تعديل حقل واحد فقط (الاسم) لا يُنتج سجل تغييرات لدور/فروع وهميين ====================
  const nameOnlyUpdate = doPostJson(sandbox, { action: "updateEmployee", token: adminToken, id: amAll.employeeId, data: { fullName: "مدير تدقيق عام (مُحدَّث)" } });
  check("[تعديل موظف] تعديل الاسم فقط ينجح", nameOnlyUpdate.ok === true, nameOnlyUpdate);
  const auditAfterNameOnly = doPostJson(sandbox, { action: "auditLog", token: adminToken });
  const nameOnlyEntry = (auditAfterNameOnly.entries || []).filter(e => e.action === "updateEmployee" && e.details.indexOf(amAll.employeeId) !== -1).pop();
  let nameOnlyParsed = null; try { nameOnlyParsed = JSON.parse(nameOnlyEntry.details); } catch (e) {}
  check("[سجل العمليات المنظَّم] تعديل الاسم فقط لا يُدرج changes.role أو changes.branchScope وهميين",
    !!(nameOnlyParsed && !nameOnlyParsed.changes.role && !nameOnlyParsed.changes.branchScope && nameOnlyParsed.changes.fullName), nameOnlyParsed);

  // ==================== 4) إصلاح ثغرة الكتابة الجزئية: فشل تحقق نطاق الفروع يجب ألا يكتب الدور الجديد ====================
  const empBeforePartial = doPostJson(sandbox, { action: "addEmployee", token: adminToken,
    data: { fullName: "قبل المحاولة الجزئية", username: "partialTest", password: "Passw0rd!", role: "Auditor", branches: [b1.branchId] } });
  const partialAttempt = doPostJson(sandbox, { action: "updateEmployee", token: adminToken, id: empBeforePartial.employeeId,
    data: { role: "Senior Auditor", branches: [] } }); // دور جديد صالح + نطاق فروع فارغ غير صالح لهذا الدور
  check("[لا كتابة جزئية] طلب فيه دور جديد صالح لكن نطاق فروع غير صالح يُرفض بالكامل", partialAttempt.ok === false, partialAttempt);
  const empAfterPartial = doPostJson(sandbox, { action: "listEmployees", token: adminToken }).employees.find(e => e.id === empBeforePartial.employeeId);
  check("[لا كتابة جزئية] الدور القديم (Auditor) بقي كما هو ولم يتغيّر جزئيًا رغم فشل نطاق الفروع فقط",
    empAfterPartial && empAfterPartial.role === "Auditor", empAfterPartial);

  // ==================== 5) فشل تعديل الموظف الأساسي لا يُنشئ قيد "نجاح" مضلِّلًا في سجل العمليات ====================
  const auditBeforeFail = doPostJson(sandbox, { action: "auditLog", token: adminToken }).entries.length;
  doPostJson(sandbox, { action: "updateEmployee", token: adminToken, id: "EMP-NOT-REAL-ID", data: { fullName: "لا يوجد" } });
  const auditAfterFail = doPostJson(sandbox, { action: "auditLog", token: adminToken }).entries.length;
  check("[سجل العمليات] محاولة تعديل موظف غير موجود (فشل) لا تُضيف أي قيد جديد لسجل العمليات", auditAfterFail === auditBeforeFail, { before: auditBeforeFail, after: auditAfterFail });

  console.log(results.map(r => (r.pass ? 'PASS' : 'FAIL - ' + JSON.stringify(r.detail)) + ' - ' + r.name).join('\n'));
  const pass = results.filter(r => r.pass).length;
  console.log(`\n${pass} / ${results.length} اختبارًا ناجحًا (Sandbox — Audit Manager own-scope + سجل عمليات منظَّم + إصلاح الكتابة الجزئية)`);
  if (pass !== results.length) process.exit(1);
}
run();
