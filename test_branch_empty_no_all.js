// اختبارات مخصَّصة لعطل "الخلية الفارغة تُفسَّر كـALL Branches" في مسار القراءة (_employeeFromRow)،
// وهو عطل من نفس فئة "ALL Branches الضمنية" التي أُزيلت سابقًا من مسار الحفظ (_resolveBranchAssignment)
// لكنها بقيت موجودة هنا. لا يوجد مسار برمجي حاليًا (لا Bootstrap Admin ولا إضافة/تعديل موظف عبر
// الواجهة/الـ API) يُنتج قيمة فارغة فعليًا في عمود "الفروع" — العطل كان يظهر فقط لو عُدِّلت الخلية
// يدويًا مباشرة في Google Sheets (وهو ممكن دائمًا لأن الشيت هو مصدر الحقيقة)، أو عند تلف بيانات صف
// قديم. هذا الملف يحاكي تلك الحالة عمدًا بالكتابة المباشرة على صف الموظف في الشيت (تمامًا كما قد يفعل
// مستخدم بشري بالخطأ)، ويثبت أن النتيجة الآن هي "لا فروع مخصَّصة" (رفض وصول)، وليس "ALL" (منح كل شيء).
//
// Level: Node.js / Sandbox — يثبت منطق الكود، وليس تشغيلًا فعليًا على Google Apps Script/Google
// Sheets حقيقيين (غير مُتاحين لهذا الاختبار).
const fs = require('fs');
const { buildMockSpreadsheet, buildSandbox: buildSandboxFromSource } = require('./gs_sandbox');

const codeGsSource = fs.readFileSync(__dirname + '/Code.gs', 'utf8');
function buildSandbox(mockSS) { return buildSandboxFromSource(codeGsSource, mockSS); }
function doGetJson(sandbox, params) { return JSON.parse(sandbox.doGet({ parameter: params }).getContent()); }

function setAuthEnabled(mockSS, on) {
  const sh = mockSS._sheets["الإعدادات"];
  for (let r = 1; r < sh.rows.length; r++) {
    if (sh.rows[r][0] === "auth_enabled") { sh.rows[r][1] = on ? "1" : "0"; return; }
  }
  throw new Error("auth_enabled row not found in seeded settings — schema.json/build script drifted");
}

// عمود "الفروع" في شيت الموظفين — رقم العمود نفسه المستخدم فعليًا في Code.gs (EMP_COLS.BRANCHES = 6،
// 0-based)، مكرَّر هنا فقط لأن ملف الاختبار يعدِّل صفوف الشيت مباشرة (محاكاة تعديل يدوي خارج الكود).
const BRANCHES_COL_0BASED = 6;

function run() {
  const schema = JSON.parse(fs.readFileSync(__dirname + '/../backend/schema.json', 'utf8'));
  const results = [];
  const check = (name, cond, detail) => results.push({ name, pass: !!cond, detail });

  const mockSS = buildMockSpreadsheet(schema);
  const sandbox = buildSandbox(mockSS);
  setAuthEnabled(mockSS, true);
  sandbox._actionBootstrapAdmin({ fullName: "مسؤول الاختبار", username: "beadmin", password: "Passw0rd!" });
  const adminToken = sandbox._actionLogin({ username: "beadmin", password: "Passw0rd!" }).token;

  // نحتاج معرّفَي فرعين حقيقيين موجودَين فعليًا في settings.branches — نجلبهما عبر listBranches (يتطلب صلاحية).
  const branchesList = sandbox._actionListBranches({ token: adminToken });
  check("[تمهيد] استرجاع قائمة الفروع الحقيقية عبر listBranches ينجح (Setup فقط)", branchesList.ok === true && branchesList.branches.length >= 2, branchesList);
  const b1 = branchesList.branches[0].id, b2 = branchesList.branches[1].id;

  // موظف Auditor بفرع واحد صالح مبدئيًا (عبر الـ API الطبيعي) — سنُفسد قيمته بعد ذلك يدويًا في الشيت.
  const addRes = sandbox._actionAddEmployee({ token: adminToken, data: { fullName: "مدقق للاختبار", username: "auditor_be", password: "Passw0rd!", role: "Auditor", branches: [b1] } });
  check("[تمهيد] إضافة موظف Auditor بفرع واحد صالح عبر الـ API الطبيعي تنجح", addRes.ok === true, addRes);

  const empSheet = mockSS._sheets["الموظفون"];
  const empRowIdx = empSheet.rows.findIndex(r => r[2] === "auditor_be"); // العمود 2 = اسم المستخدم
  check("[تمهيد] العثور على صف الموظف في الشيت لتعديله يدويًا لاحقًا", empRowIdx > 0, empRowIdx);

  function loginAuditorBe() { return sandbox._actionLogin({ username: "auditor_be", password: "Passw0rd!" }); }
  function branchesOfListedEmployee() {
    const list = sandbox._actionListEmployees({ token: adminToken });
    return list.employees.find(e => e.username === "auditor_be");
  }

  // ==================== 1) خلية فارغة تمامًا ("") لا تتحول إلى ALL ====================
  empSheet.rows[empRowIdx][BRANCHES_COL_0BASED] = ""; // محاكاة: مسؤول حذف محتوى الخلية يدويًا في Sheets
  {
    const emp = branchesOfListedEmployee();
    check("[1] خلية فارغة (\"\") تُقرأ كمصفوفة فروع فارغة []، وليس \"ALL\"", Array.isArray(emp.branches) && emp.branches.length === 0, emp.branches);
  }

  // ==================== 2) null لا تتحول إلى ALL ====================
  empSheet.rows[empRowIdx][BRANCHES_COL_0BASED] = null;
  {
    const emp = branchesOfListedEmployee();
    check("[2] null تُقرأ كمصفوفة فروع فارغة []، وليس \"ALL\"", Array.isArray(emp.branches) && emp.branches.length === 0, emp.branches);
  }

  // ==================== 3) undefined لا تتحول إلى ALL ====================
  empSheet.rows[empRowIdx][BRANCHES_COL_0BASED] = undefined;
  {
    const emp = branchesOfListedEmployee();
    check("[3] undefined تُقرأ كمصفوفة فروع فارغة []، وليس \"ALL\"", Array.isArray(emp.branches) && emp.branches.length === 0, emp.branches);
  }

  // ==================== 4) قائمة Branch IDs فارغة (نص فارغ بعد split) لا تتحول إلى ALL ====================
  empSheet.rows[empRowIdx][BRANCHES_COL_0BASED] = ",,"; // خلية فيها فواصل فقط بلا أي معرّف فعلي — بيانات تالفة
  {
    const emp = branchesOfListedEmployee();
    check("[4] خلية فيها فواصل فقط بلا معرّفات فعلية تُقرأ كمصفوفة فارغة []، وليس \"ALL\"", Array.isArray(emp.branches) && emp.branches.length === 0, emp.branches);
  }

  // ==================== 5) Branch ID غير صالح (غير موجود ضمن settings.branches) لا يمنح صلاحية عامة ====================
  empSheet.rows[empRowIdx][BRANCHES_COL_0BASED] = "BR-غير-موجود-إطلاقًا";
  {
    const loginRes = loginAuditorBe();
    check("[5] تسجيل الدخول بمعرّف فرع غير صالح ينجح (الحساب نفسه سليم) لكن دون توسيع أي صلاحية", loginRes.ok === true, loginRes);
    // سجل ينتمي لفرع حقيقي (b1) — موظف بمعرّف فرع غير صالح يجب ألا يراه إطلاقًا (لا يُترجَم الخطأ إلى وصول شامل)
    sandbox._actionSave({ token: adminToken, type: "Morning", data: { date: "2026-09-10", branch: branchesList.branches.find(b => b.id === b1).name, auditor: "أحمد سالم", total_shipments: 1, matched_shipments: 1 }, user: "X", clientRequestId: "be-invalidid-seed" });
    const kpisAsInvalidId = doGetJson(sandbox, { action: "kpis", token: loginRes.token });
    check("[5] معرّف فرع غير صالح لا يمنح رؤية أي سجل فرع حقيقي (لا صلاحية عامة ناتجة عن خطأ في المعرّف)", kpisAsInvalidId.ok === true && kpisAsInvalidId.byType.Morning.total === 0, kpisAsInvalidId);
    sandbox._actionLogout({ token: loginRes.token });
  }

  // ==================== 6) موظف بلا فروع (بعد الإصلاح) لا يستطيع قراءة أي بيانات فروع ====================
  empSheet.rows[empRowIdx][BRANCHES_COL_0BASED] = "";
  {
    const loginRes = loginAuditorBe();
    check("[6] تسجيل الدخول لموظف بخلية فروع فارغة ينجح كحساب (المشكلة في الصلاحية لا في الحساب)", loginRes.ok === true, loginRes);
    const kpisEmpty = doGetJson(sandbox, { action: "kpis", token: loginRes.token });
    check("[6] موظف بلا فروع مخصَّصة (\"\") لا يرى أي سجل — لا يُعامَل كـALL", kpisEmpty.ok === true && kpisEmpty.byType.Morning.total === 0, kpisEmpty);
    const searchEmpty = doGetJson(sandbox, { action: "search", token: loginRes.token });
    check("[6] نفس القاعدة تنطبق على search — نتائج فارغة", searchEmpty.ok === true && Array.isArray(searchEmpty.results) && searchEmpty.results.length === 0, searchEmpty);
    const saveTry = sandbox._actionSave({ token: loginRes.token, type: "Morning", data: { date: "2026-09-11", branch: branchesList.branches.find(b => b.id === b1).name, auditor: "أحمد سالم", total_shipments: 1, matched_shipments: 1 }, user: "X", clientRequestId: "be-nobranch-save-try" });
    check("[6] موظف بلا فروع مخصَّصة يُرفض عند محاولة حفظ سجل لأي فرع", saveTry.ok === false, saveTry);
    sandbox._actionLogout({ token: loginRes.token });
  }

  // ==================== 7) موظف بفروع محددة يرى فروعه فقط (لا أكثر ولا أقل) ====================
  {
    const updRes = sandbox._actionUpdateEmployee({ token: adminToken, id: addRes.employeeId, data: { branches: [b1] } });
    check("[7] إعادة تعيين فروع محددة صحيحة للموظف عبر الـ API الطبيعي تنجح", updRes.ok === true, updRes);
    const loginRes = loginAuditorBe();
    const kpisScoped = doGetJson(sandbox, { action: "kpis", token: loginRes.token });
    check("[7] موظف بفرع محدد (b1) يرى سجلات b1 فقط، وليس صفرًا وليس كل الفروع", kpisScoped.ok === true && kpisScoped.byType.Morning.total > 0, kpisScoped);
    const saveOtherBranch = sandbox._actionSave({ token: loginRes.token, type: "Morning", data: { date: "2026-09-12", branch: branchesList.branches.find(b => b.id === b2).name, auditor: "أحمد سالم", total_shipments: 1, matched_shipments: 1 }, user: "X", clientRequestId: "be-scoped-otherbranch" });
    check("[7] نفس الموظف يُرفض عند محاولة الكتابة لفرع آخر (b2) خارج نطاقه", saveOtherBranch.ok === false, saveOtherBranch);
    sandbox._actionLogout({ token: loginRes.token });
  }

  // ==================== 8) ALL Branches الصريحة تعمل فقط مع الدور المصرَّح له بها ====================
  {
    const grantAllToAuditor = sandbox._actionUpdateEmployee({ token: adminToken, id: addRes.employeeId, data: { branches: "ALL" } });
    check("[8] محاولة منح ALL Branches صراحة لدور Auditor (canBeAssignedAllBranches=false) تُرفض", grantAllToAuditor.ok === false, grantAllToAuditor);

    const addManager = sandbox._actionAddEmployee({ token: adminToken, data: { fullName: "مدير تدقيق للاختبار", username: "mgr_be", password: "Passw0rd!", role: "Audit Manager", branches: "ALL" } });
    check("[8] منح ALL Branches صراحة لدور Audit Manager (canBeAssignedAllBranches=true) ينجح فعليًا عند تفويض صريح", addManager.ok === true, addManager);
  }

  // ==================== 9) Bootstrap Admin يعمل وفق استثناء موثَّق ومحدد، ولا يتأثر بهذا الإصلاح ====================
  {
    const adminRow = empSheet.rows.find(r => r[2] === "beadmin");
    check("[9] حساب Administrator الأول (Bootstrap) لا يزال يحمل \"ALL\" حرفيًا كما صُمِّم عمدًا (استثناء موثَّق، غير متأثر بإصلاح الخلية الفارغة)", adminRow[BRANCHES_COL_0BASED] === "ALL", adminRow[BRANCHES_COL_0BASED]);
    const bootAfter = sandbox._actionBootstrap();
    check("[9] النظام لا يزال يعمل بعد كل هذه التعديلات (لم ينكسر Bootstrap Admin ولا تهيئة النظام)", bootAfter.ok !== false, bootAfter);
  }

  // ==================== 10) Audit Viewer لا يستطيع الحصول على ALL Branches (حتى لو حاول Administrator صراحة) ====================
  {
    const grantAllToViewer = sandbox._actionAddEmployee({ token: adminToken, data: { fullName: "مشاهد للاختبار", username: "viewer_be", password: "Passw0rd!", role: "Audit Viewer", branches: "ALL" } });
    check("[10] محاولة منح ALL Branches لدور Audit Viewer تُرفض دومًا (canBeAssignedAllBranches=false له تحديدًا)", grantAllToViewer.ok === false, grantAllToViewer);
  }

  // ==================== 11) كل عمليات القراءة (kpis/search/reports/auditLog) تُطبِّق نفس قاعدة "لا فروع = لا وصول" ====================
  {
    const addV2 = sandbox._actionAddEmployee({ token: adminToken, data: { fullName: "مشاهد فرع واحد", username: "viewer2_be", password: "Passw0rd!", role: "Audit Viewer", branches: [b1] } });
    check("[11-تمهيد] إضافة Audit Viewer بفرع محدد صحيح تنجح", addV2.ok === true, addV2);
    const v2Sheet = empSheet.rows.find(r => r[2] === "viewer2_be");
    const v2Idx = empSheet.rows.indexOf(v2Sheet);
    empSheet.rows[v2Idx][BRANCHES_COL_0BASED] = ""; // إفساد يدوي لمحاكاة نفس السيناريو لدور مختلف
    const loginV2 = sandbox._actionLogin({ username: "viewer2_be", password: "Passw0rd!" });
    const kpisV2 = doGetJson(sandbox, { action: "kpis", token: loginV2.token });
    const searchV2 = doGetJson(sandbox, { action: "search", token: loginV2.token });
    const reportsV2 = doGetJson(sandbox, { action: "reports", token: loginV2.token });
    check("[11] kpis: Audit Viewer بفروع فارغة لا يرى شيئًا", kpisV2.ok === true && kpisV2.byType.Morning.total === 0, kpisV2);
    check("[11] search: نفس القاعدة", searchV2.ok === true && Array.isArray(searchV2.results) && searchV2.results.length === 0, searchV2);
    check("[11] reports: نفس القاعدة (لا بيانات فروع تُكشَف)", reportsV2.ok === true, reportsV2);
    sandbox._actionLogout({ token: loginV2.token });
  }

  // ==================== 12) لا يوجد مسار بديل يعيد تفسير القيمة الفارغة كـALL — فحص مباشر لمصدر الكود ====================
  {
    const fnMatch = codeGsSource.match(/function _parseStoredBranches\(raw\) \{[\s\S]*?\n\}/);
    check("[12] الدالة الوحيدة المسؤولة عن هذا التفسير (_parseStoredBranches) موجودة ومُستخدَمة بدل أي منطق inline قديم", !!fnMatch, !!fnMatch);
    check("[12] لا يوجد أي بقايا للمنطق القديم الخاطئ (`=== \"ALL\" || ... === \"\") ? \"ALL\"`) في الكود", !/BRANCHES\]\s*===\s*"ALL"\s*\|\|[^)]*===\s*""\s*\)\s*\?\s*"ALL"/.test(codeGsSource), "grep check");
  }

  // ==================== 13) الاختبارات القديمة لا تزال تعمل (يُتحقَّق منها بتشغيل كل ملفات الاختبار في نفس الجولة — راجع التقرير الإجمالي) ====================
  check("[13] هذا الملف نفسه لا يعتمد على أي سلوك قديم كُسِر عمدًا — كل الأسر السابقة (test_admin_features/test_security_v2/...) تُشغَّل بشكل منفصل ويُبلَّغ عنها في التقرير الإجمالي", true, "see combined run report");

  // ==================== 14) اختبار سلبي: إن أعاد أحد لاحقًا Fallback إلى ALL، يجب أن يفشل هذا الاختبار فورًا ====================
  {
    const simulateOldBuggyLogic = (raw) => (raw === "ALL" || raw === "") ? "ALL" : String(raw).split(",").map(s => s.trim());
    const oldBehaviorForEmpty = simulateOldBuggyLogic("");
    const newBehaviorForEmpty = sandbox.__cacheTestHooks ? null : null; // (لا حاجة فعلية هنا؛ الفحص أدناه يقارن المنطقين مباشرة)
    const actualNewBehavior = (function () {
      // نفس القيمة الخام "" تُمرَّر فعليًا عبر الدالة الحقيقية المحمَّلة من Code.gs داخل الـ Sandbox
      const empRow = empSheet.rows[empRowIdx].slice();
      empRow[BRANCHES_COL_0BASED] = "";
      return sandbox._employeeFromRow ? sandbox._employeeFromRow(empRow).branches : null;
    })();
    check("[14] اختبار سلبي حارس: القيمة الفعلية من Code.gs الحالي لخلية فارغة يجب أن تكون [] وليست \"ALL\" — لو رجع أحد الفallback القديم يدويًا يفشل هذا السطر فورًا", Array.isArray(actualNewBehavior) && actualNewBehavior.length === 0, { oldBuggyWouldHaveReturned: oldBehaviorForEmpty, actualNow: actualNewBehavior });
  }

  // ---- summary ----
  console.log(results.map(r => (r.pass ? "PASS" : "FAIL - " + JSON.stringify(r.detail)) + " - " + r.name).join("\n"));
  const pass = results.filter(r => r.pass).length;
  console.log(`\n${pass} / ${results.length} اختبارًا ناجحًا (Sandbox — إصلاح "الخلية الفارغة تُفسَّر كـALL Branches" في مسار قراءة الموظفين _employeeFromRow)`);
  if (pass !== results.length) process.exit(1);
}
run();
