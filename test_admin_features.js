// Node-based tests for the NEW additive features: centralized Backend URL config (frontend-only,
// covered by test_dashboard.js instead — see there), Branches Management, Employees Management,
// and Apps Script-native Login/Logout/RBAC. Runs against the REAL appsscript/Code.gs source via the
// same gs_sandbox.js used by test_harness.js and test_dashboard.js — not a re-implementation.
//
// Level: Node.js / Sandbox — same caveat as test_harness.js applies: this proves the LOGIC in
// Code.gs is internally consistent and self-enforcing. It does NOT prove anything about a real
// deployed Google Apps Script Web App or a real Google Sheet (see docs/اختبار_Live_Integration.md).
const fs = require('fs');
const { buildMockSpreadsheet, buildSandbox: buildSandboxFromSource } = require('./gs_sandbox');

const codeGsSource = fs.readFileSync(__dirname + '/Code.gs', 'utf8');
function buildSandbox(mockSS) { return buildSandboxFromSource(codeGsSource, mockSS); }

function setAuthEnabled(mockSS, on) {
  const sh = mockSS._sheets["الإعدادات"];
  for (let r = 1; r < sh.rows.length; r++) {
    if (sh.rows[r][0] === "auth_enabled") { sh.rows[r][1] = on ? "1" : "0"; return; }
  }
  throw new Error("auth_enabled row not found in seeded settings — schema.json/build script drifted");
}

function run() {
  const schema = JSON.parse(fs.readFileSync(__dirname + '/../backend/schema.json', 'utf8'));
  const results = [];
  const check = (name, cond, detail) => results.push({ name, pass: !!cond, detail });

  // ==================== 1) الحالة الافتراضية: auth_enabled=0 — سلوك ما قبل هذه الإضافة تمامًا ====================
  {
    const mockSS = buildMockSpreadsheet(schema);
    const sandbox = buildSandbox(mockSS);
    const boot = sandbox._actionBootstrap();
    check("[Config] bootstrap يُبلغ authEnabled=false افتراضيًا (بلا هجرة/تفعيل يدوي)", boot.authEnabled === false, boot.authEnabled);
    const saveNoToken = sandbox._actionSave({ type: "Morning", data: {
      date: "2026-09-01", branch: "القاهرة الجديدة", auditor: "أحمد سالم", total_shipments: 10, matched_shipments: 10 }, user: "Test", clientRequestId: "admtest-1" });
    check("[Config] الحفظ بلا Token ينجح طالما auth_enabled=0 (لا كسر للسلوك الحالي)", saveNoToken.ok === true, saveNoToken);
  }

  // ==================== 2) تفعيل auth + Bootstrap Admin ====================
  const mockSS = buildMockSpreadsheet(schema);
  const sandbox = buildSandbox(mockSS);
  setAuthEnabled(mockSS, true);

  const bootAfterEnable = sandbox._actionBootstrap();
  check("[Auth] bootstrap يُبلغ authEnabled=true بعد التفعيل", bootAfterEnable.authEnabled === true, bootAfterEnable.authEnabled);
  check("[Auth] bootstrap يُبلغ employeesBootstrapNeeded=true (لا موظفين بعد)", bootAfterEnable.employeesBootstrapNeeded === true, bootAfterEnable);

  const saveBlocked = sandbox._actionSave({ type: "Morning", data: { date: "2026-09-01", branch: "القاهرة الجديدة", auditor: "أحمد سالم", total_shipments: 5, matched_shipments: 5 }, user: "X", clientRequestId: "admtest-2" });
  check("[Auth] الحفظ بلا Token يُرفض بعد تفعيل auth", saveBlocked.ok === false, saveBlocked);

  const bootstrapAdmin1 = sandbox._actionBootstrapAdmin({ fullName: "محمد سعيد", username: "msaid", password: "Passw0rd!" });
  check("[Bootstrap Admin] إنشاء أول حساب Administrator ينجح", bootstrapAdmin1.ok === true, bootstrapAdmin1);
  const bootstrapAdmin2 = sandbox._actionBootstrapAdmin({ fullName: "شخص آخر", username: "other", password: "Passw0rd!" });
  check("[Bootstrap Admin] يُرفض تنفيذه مرة ثانية بعد وجود موظف واحد", bootstrapAdmin2.ok === false, bootstrapAdmin2);

  // password/hash hygiene
  const empRows = mockSS._sheets["الموظفون"].rows;
  const adminRow = empRows[1];
  check("[أمان] كلمة المرور غير مخزَّنة كنص واضح في الشيت", adminRow.indexOf("Passw0rd!") === -1, adminRow);
  check("[أمان] الـ Hash المخزَّن مختلف تمامًا عن كلمة المرور الأصلية", adminRow[3] !== "Passw0rd!" && adminRow[3].length === 64, adminRow[3]);

  // ==================== 3) تسجيل الدخول: نجاح / فشل كلمة مرور / حساب معطّل / قفل بعد محاولات ====================
  const loginOk = sandbox._actionLogin({ username: "msaid", password: "Passw0rd!" });
  check("[Login] بيانات صحيحة تُصدر Token ودورًا صحيحًا", loginOk.ok === true && !!loginOk.token && loginOk.role === "Administrator", loginOk);
  const adminToken = loginOk.token;

  const loginWrongPw = sandbox._actionLogin({ username: "msaid", password: "غلط" });
  check("[Login] كلمة مرور خاطئة تُرفض برسالة عامة (لا تكشف أيهما خطأ)", loginWrongPw.ok === false && /غير صحيحة/.test(loginWrongPw.error), loginWrongPw);

  const loginNoUser = sandbox._actionLogin({ username: "لا_وجود", password: "أيًّا كان" });
  check("[Login] مستخدم غير موجود يُرفض بنفس الرسالة العامة", loginNoUser.ok === false, loginNoUser);

  // الحساب المعطَّل (نُنشئه أولًا كموظف فعّال ثم نعطّله)
  const addEmpForDisable = sandbox._actionAddEmployee({ token: adminToken, data: { fullName: "معطَّل للاختبار", username: "disabled1", password: "Passw0rd!", role: "Audit Viewer", branches: ["BR-001"] } });
  check("[Employees] إضافة موظف تنجح من Administrator", addEmpForDisable.ok === true, addEmpForDisable);
  const toggleOff = sandbox._actionToggleEmployee({ token: adminToken, id: addEmpForDisable.employeeId, active: false });
  check("[Employees] تعطيل الموظف ينجح", toggleOff.ok === true, toggleOff);
  const loginDisabled = sandbox._actionLogin({ username: "disabled1", password: "Passw0rd!" });
  check("[Login] رفض حساب معطَّل برسالة صريحة مختلفة عن رسالة كلمة المرور الخاطئة", loginDisabled.ok === false && /معطّل/.test(loginDisabled.error), loginDisabled);

  // قفل الحساب بعد 5 محاولات فاشلة متتالية (اختبار Negative-Control-style: نتحقق من العدّاد نفسه)
  const addEmpForLockout = sandbox._actionAddEmployee({ token: adminToken, data: { fullName: "قفل للاختبار", username: "locktest", password: "Passw0rd!", role: "Audit Viewer", branches: ["BR-001"] } });
  for (let i = 0; i < 5; i++) sandbox._actionLogin({ username: "locktest", password: "خطأ" + i });
  const loginLocked = sandbox._actionLogin({ username: "locktest", password: "Passw0rd!" }); // كلمة مرور صحيحة، لكن بعد القفل
  check("[Lockout] الحساب يُقفل مؤقتًا بعد 5 محاولات فاشلة حتى لو أُدخلت كلمة المرور الصحيحة لاحقًا", loginLocked.ok === false && /قفل/.test(loginLocked.error), loginLocked);

  // لا كلمة مرور مهما كانت صحتها تظهر داخل _AuditLog
  const auditRows = mockSS._sheets["_AuditLog"].rows;
  const anyPlaintextPw = auditRows.some(r => r.join(" ").includes("Passw0rd!"));
  check("[أمان] لا كلمة مرور تظهر نصًّا واضحًا داخل سجل العمليات (_AuditLog)", anyPlaintextPw === false, auditRows.length);

  // ==================== 4) صلاحيات الأدوار (RBAC مفروض في الـ Backend) ====================
  const auditorLogin = sandbox._actionAddEmployee({ token: adminToken, data: { fullName: "مدقق فرع", username: "auditor1", password: "Passw0rd!", role: "Auditor", branches: ["BR-001"] } });
  check("[Employees] إضافة مدقق مقيَّد بفرع BR-001 تنجح", auditorLogin.ok === true, auditorLogin);
  const auditorSession = sandbox._actionLogin({ username: "auditor1", password: "Passw0rd!" });
  const auditorToken = auditorSession.token;

  const auditorTriesManageEmployees = sandbox._actionListEmployees({ token: auditorToken });
  check("[RBAC] Auditor لا يملك صلاحية عرض/إدارة الموظفين (يُرفض من الـ Backend لا الواجهة فقط)", auditorTriesManageEmployees.ok === false, auditorTriesManageEmployees);

  const viewerLogin = sandbox._actionAddEmployee({ token: adminToken, data: { fullName: "مشاهد", username: "viewer1", password: "Passw0rd!", role: "Audit Viewer", branches: ["BR-001"] } });
  const viewerSession = sandbox._actionLogin({ username: "viewer1", password: "Passw0rd!" });
  const viewerTriesSave = sandbox._actionSave({ token: viewerSession.token, type: "Morning", data: { date: "2026-09-01", branch: "القاهرة الجديدة", auditor: "أحمد سالم", total_shipments: 5, matched_shipments: 5 }, user: "Audit Viewer", clientRequestId: "admtest-viewer-save" });
  check("[RBAC] Audit Viewer لا يملك صلاحية الحفظ (يُرفض من الـ Backend)", viewerTriesSave.ok === false, viewerTriesSave);

  const auditorSaveOwnBranch = sandbox._actionSave({ token: auditorToken, type: "Morning", data: { date: "2026-09-01", branch: "القاهرة الجديدة", auditor: "أحمد سالم", total_shipments: 5, matched_shipments: 5 }, user: "Auditor1", clientRequestId: "admtest-auditor-ok" });
  check("[RBAC] Auditor يستطيع الحفظ لفرعه المسموح به (القاهرة الجديدة = BR-001)", auditorSaveOwnBranch.ok === true, auditorSaveOwnBranch);

  const auditorSaveOtherBranch = sandbox._actionSave({ token: auditorToken, type: "Morning", data: { date: "2026-09-01", branch: "مدينة نصر", auditor: "أحمد سالم", total_shipments: 5, matched_shipments: 5 }, user: "Auditor1", clientRequestId: "admtest-auditor-blocked" });
  check("[RBAC] Auditor يُرفض عند محاولة الحفظ لفرع آخر غير المصرَّح به له", auditorSaveOtherBranch.ok === false, auditorSaveOtherBranch);

  // ==================== 5) إدارة الفروع: إضافة / منع تكرار / تعديل اسم / تعطيل ====================
  const addBranch = sandbox._actionAddBranch({ token: adminToken, name: "الغردقة" });
  check("[Branches] إضافة فرع جديد تنجح ويحصل على Branch ID", addBranch.ok === true && /^BR-\d+$/.test(addBranch.branchId), addBranch);

  const addDupBranch = sandbox._actionAddBranch({ token: adminToken, name: "الغردقة" });
  check("[Branches] منع تكرار اسم الفرع", addDupBranch.ok === false, addDupBranch);

  // سجل قديم بالاسم الأصلي قبل إعادة التسمية
  const preRenameSave = sandbox._actionSave({ token: adminToken, type: "Morning", data: { date: "2026-09-02", branch: "الغردقة", auditor: "أحمد سالم", total_shipments: 3, matched_shipments: 3 }, user: "X", clientRequestId: "admtest-branch-rename-1" });
  check("[Branches] حفظ سجل بالاسم قبل إعادة التسمية ينجح", preRenameSave.ok === true, preRenameSave);

  const renameBranch = sandbox._actionRenameBranch({ token: adminToken, id: addBranch.branchId, name: "الغردقة (البحر الأحمر)" });
  check("[Branches] إعادة تسمية الفرع تنجح", renameBranch.ok === true, renameBranch);

  const morningSheetAfterRename = mockSS._sheets["المطابقة الصباحية"];
  const headerRow = morningSheetAfterRename.rows[0];
  const branchColIdx = headerRow.indexOf("الفرع");
  const oldRow = morningSheetAfterRename.rows.find(r => r[branchColIdx] === "الغردقة");
  check("[Branches] السجل القديم يحتفظ بالاسم الأصلي \"الغردقة\" ولم يُعَد كتابته بعد إعادة التسمية",
    !!oldRow, { found: !!oldRow, allBranchValues: morningSheetAfterRename.rows.slice(1).map(r => r[branchColIdx]) });

  const bootAfterRename = sandbox._actionBootstrap();
  check("[Branches] القائمة المتاحة لسجلات جديدة تعرض الاسم الجديد فقط", bootAfterRename.lists.Branches.includes("الغردقة (البحر الأحمر)") && !bootAfterRename.lists.Branches.includes("الغردقة"), bootAfterRename.lists.Branches);

  const toggleBranchOff = sandbox._actionToggleBranch({ token: adminToken, id: addBranch.branchId, active: false });
  check("[Branches] تعطيل فرع ينجح", toggleBranchOff.ok === true, toggleBranchOff);
  const bootAfterDisableBranch = sandbox._actionBootstrap();
  check("[Branches] الفرع المعطَّل يختفي من قائمة الفروع المتاحة للسجلات الجديدة", !bootAfterDisableBranch.lists.Branches.includes("الغردقة (البحر الأحمر)"), bootAfterDisableBranch.lists.Branches);

  const saveRejectedDisabledBranch = sandbox._actionSave({ token: adminToken, type: "Morning", data: { date: "2026-09-03", branch: "الغردقة (البحر الأحمر)", auditor: "أحمد سالم", total_shipments: 1, matched_shipments: 1 }, user: "X", clientRequestId: "admtest-branch-disabled-reject" });
  check("[Branches] محاولة حفظ سجل جديد لفرع معطَّل تُرفض", saveRejectedDisabledBranch.ok === false, saveRejectedDisabledBranch);

  // branch_id snapshot على السجلات الجديدة
  const branchIdColIdx = headerRow.indexOf("معرّف الفرع (داخلي)");
  const newRowWithId = morningSheetAfterRename.rows.find(r => r[branchColIdx] === "القاهرة الجديدة" && r[branchIdColIdx]);
  check("[Branches] السجلات الجديدة تحمل معرّف الفرع (Branch ID) في عمود مضاف بجانب الاسم", !!newRowWithId, { branchIdColIdx, sample: newRowWithId });

  // ==================== 6) Logout ====================
  const logoutRes = sandbox._actionLogout({ token: adminToken });
  check("[Logout] تسجيل الخروج ينجح", logoutRes.ok === true, logoutRes);
  const saveAfterLogout = sandbox._actionSave({ token: adminToken, type: "Morning", data: { date: "2026-09-04", branch: "القاهرة الجديدة", auditor: "أحمد سالم", total_shipments: 1, matched_shipments: 1 }, user: "X", clientRequestId: "admtest-after-logout" });
  check("[Logout] الـ Token يصبح غير صالح بعد تسجيل الخروج", saveAfterLogout.ok === false, saveAfterLogout);

  // ---- summary ----
  console.log(results.map(r => (r.pass ? "PASS" : "FAIL - " + JSON.stringify(r.detail)) + " - " + r.name).join("\n"));
  const pass = results.filter(r => r.pass).length;
  console.log(`\n${pass} / ${results.length} اختبارًا ناجحًا (Sandbox — يشغّل appsscript/Code.gs الفعلي: تسجيل الدخول، الفروع، الموظفون، RBAC)`);
  if (pass !== results.length) process.exit(1);
}
run();
