// اختبارات Sandbox جديدة لجولة التطوير الحالية: حماية عمليات القراءة (doGet)، توحيد مصفوفة
// الصلاحيات (SCHEMA.role_permissions)، دور Senior Auditor (موظف تدقيق مكلَّف بفرع/فروع محددة —
// إعادة تسمية لِـ "Branch Manager" السابق دون أي تغيير في الصلاحيات الفعلية)، منع تصعيد الصلاحيات الذاتي،
// منع إسناد "كل الفروع" لأدوار غير مصرَّح لها، إعادة التحقق من حالة الحساب الحيّة عند كل طلب
// (وليس فقط عند تسجيل الدخول)، وسجل العمليات المُصفَّى بالفرع.
//
// Level: Node.js / Sandbox — يشغّل appsscript/Code.gs الفعلي عبر gs_sandbox.js عبر doGet/doPost
// تمامًا كما يستدعيهما Web App حقيقي (وليس استدعاء دوال داخلية مباشرة)، لكن الاتصال نفسه محاكى في
// الذاكرة — لا يثبت شيئًا عن Google Apps Script/Google Sheets حقيقيين (راجع اختبار_Live_Integration.md).
const fs = require('fs');
const { buildMockSpreadsheet, buildSandbox: buildSandboxFromSource } = require('./gs_sandbox');

const codeGsSource = fs.readFileSync(__dirname + '/Code.gs', 'utf8');
function buildSandbox(mockSS) { return buildSandboxFromSource(codeGsSource, mockSS); }

function setAuthEnabled(mockSS, on) {
  const sh = mockSS._sheets["الإعدادات"];
  for (let r = 1; r < sh.rows.length; r++) if (sh.rows[r][0] === "auth_enabled") { sh.rows[r][1] = on ? "1" : "0"; return; }
  throw new Error("auth_enabled row not found");
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

  // ==================== 0) bootstrap/settings يبقيان عامَّين (بيانات وصفية غير حسّاسة فقط) ====================
  const bootNoToken = doGetJson(sandbox, { action: "bootstrap" });
  check("[عام] bootstrap يعمل بلا Token (بيانات وصفية فقط، شاشة الدخول تحتاجه)", bootNoToken.ok === true, bootNoToken);
  const settingsNoToken = doGetJson(sandbox, { action: "settings" });
  check("[عام] settings يعمل بلا Token (نفس البيانات الوصفية غير الحساسة)", settingsNoToken.ok === true, settingsNoToken);
  check("[توحيد] bootstrap يُرجع rolePermissions مطابقة لمصفوفة SCHEMA (مصدر وحيد للواجهة والخادم)",
    bootNoToken.rolePermissions && bootNoToken.rolePermissions["Senior Auditor"] && bootNoToken.rolePermissions["Senior Auditor"].branchScope === "own", bootNoToken.rolePermissions);

  // ==================== 1) عمليات القراءة الحساسة تُرفض تمامًا بلا Token ====================
  ["kpis", "search", "getRecord", "reports"].forEach(action => {
    const r = doGetJson(sandbox, { action, type: "Morning", id: "x" });
    check("[حماية القراءة] " + action + " يُرفض تمامًا بلا Token متى auth_enabled=1", r.ok === false, r);
  });

  // ==================== 2) Token غير صحيح ====================
  const badToken = doGetJson(sandbox, { action: "kpis", token: "not-a-real-token-at-all" });
  check("[حماية القراءة] Token غير صحيح/غير موجود يُرفض", badToken.ok === false, badToken);

  // إعداد: مسؤول أول + فرعان + Auditor لفرع واحد + Senior Auditor لفرع آخر + Audit Viewer عام (بتفويض صريح لكل الفروع)
  const admin = sandbox._actionBootstrapAdmin({ fullName: "مسؤول", username: "admin1", password: "Passw0rd!" });
  const adminToken = doPostJson(sandbox, { action: "login", username: "admin1", password: "Passw0rd!" }).token;
  const b1 = doPostJson(sandbox, { action: "addBranch", token: adminToken, name: "فرع اختبار الأمان - القاهرة" });
  const b2 = doPostJson(sandbox, { action: "addBranch", token: adminToken, name: "فرع اختبار الأمان - الغردقة" });

  // ==================== 3) منع إسناد "كل الفروع" لأدوار غير مصرَّح لها ====================
  const auditorNoBranches = doPostJson(sandbox, { action: "addEmployee", token: adminToken,
    data: { fullName: "مدقق بلا فرع", username: "auditorX", password: "Passw0rd!", role: "Auditor" } });
  check("[صلاحيات] إضافة Auditor بلا تحديد فرع تُرفض (لا يُسنَد له ALL ضمنيًا)", auditorNoBranches.ok === false, auditorNoBranches);
  const bmNoBranches = doPostJson(sandbox, { action: "addEmployee", token: adminToken,
    data: { fullName: "مدقق أول بلا فرع", username: "bmX", password: "Passw0rd!", role: "Senior Auditor" } });
  check("[صلاحيات] إضافة Senior Auditor بلا تحديد فرع تُرفض (لا يُسنَد له ALL ضمنيًا)", bmNoBranches.ok === false, bmNoBranches);
  const bmEmptyArray = doPostJson(sandbox, { action: "addEmployee", token: adminToken,
    data: { fullName: "مدقق أول بقائمة فارغة", username: "bmEmptyArr", password: "Passw0rd!", role: "Senior Auditor", branches: [] } });
  check("[صلاحيات] قائمة فروع فارغة [] صراحةً تُرفض أيضًا (لا تُفسَّر كـ ALL ولا كحذف القيد)", bmEmptyArray.ok === false, bmEmptyArray);
  const bmUnknownBranch = doPostJson(sandbox, { action: "addEmployee", token: adminToken,
    data: { fullName: "مدقق أول بفرع وهمي", username: "bmUnknown", password: "Passw0rd!", role: "Senior Auditor", branches: ["BR-NOT-REAL-999"] } });
  check("[صلاحيات] معرّف فرع غير موجود ضمن الفروع الحالية يُرفض", bmUnknownBranch.ok === false, bmUnknownBranch);

  const auditor = doPostJson(sandbox, { action: "addEmployee", token: adminToken,
    data: { fullName: "مدقق القاهرة", username: "auditor1", password: "Passw0rd!", role: "Auditor", branches: [b1.branchId] } });
  const bm = doPostJson(sandbox, { action: "addEmployee", token: adminToken,
    data: { fullName: "مدقق أول - الغردقة", username: "bm1", password: "Passw0rd!", role: "Senior Auditor", branches: [b2.branchId] } });
  const viewerNoChoice = doPostJson(sandbox, { action: "addEmployee", token: adminToken,
    data: { fullName: "محاولة مشاهد بلا اختيار", username: "viewerNoChoice", password: "Passw0rd!", role: "Audit Viewer" } });
  check("[صلاحيات] إضافة Audit Viewer بلا تحديد فرع وبلا \"ALL\" صريحة تُرفض — لا fallback تلقائي حتى لدور يسمح له بكل الفروع", viewerNoChoice.ok === false, viewerNoChoice);
  // قرار إداري لاحق (هذه الجولة): Audit Viewer لم يعد يملك canBeAssignedAllBranches — لا سيناريو
  // فعلي وُجد يبرر منح دور "عرض فقط" رؤية كل الفروع معًا (Administrator/Audit Manager يغطيان ذلك).
  const viewerAllRejected = doPostJson(sandbox, { action: "addEmployee", token: adminToken,
    data: { fullName: "محاولة مشاهد بكل الفروع", username: "viewerAllTry", password: "Passw0rd!", role: "Audit Viewer", branches: "ALL" } });
  check("[صلاحيات] إضافة Audit Viewer بـ branches:\"ALL\" تُرفض الآن — الدور لم يعد يملك canBeAssignedAllBranches", viewerAllRejected.ok === false, viewerAllRejected);
  const viewerScoped = doPostJson(sandbox, { action: "addEmployee", token: adminToken,
    data: { fullName: "مشاهد فرع واحد", username: "viewerScoped", password: "Passw0rd!", role: "Audit Viewer", branches: [b1.branchId] } });
  check("[صلاحيات] إضافة Audit Viewer بفرع محدد واحد فقط تنجح (النطاق حسب التكليف فقط الآن)", viewerScoped.ok === true, viewerScoped);

  const auditorToken = doPostJson(sandbox, { action: "login", username: "auditor1", password: "Passw0rd!" }).token;
  const bmToken = doPostJson(sandbox, { action: "login", username: "bm1", password: "Passw0rd!" }).token;
  const viewerToken = doPostJson(sandbox, { action: "login", username: "viewerScoped", password: "Passw0rd!" }).token;

  // سجلات فعلية: واحد بفرع القاهرة الجديدة (فرع Auditor)، وواحد بفرع الغردقة (فرع Branch Manager)
  const saveCairo = doPostJson(sandbox, { action: "save", token: auditorToken, clientRequestId: "sec-1",
    type: "Morning", data: { date: "2026-09-01", branch: "فرع اختبار الأمان - القاهرة", auditor: "أحمد سالم", total_shipments: 10, matched_shipments: 10 }, user: "auditor1" });
  check("[Senior Auditor/Auditor] Auditor يحفظ سجلًا لفرعه بنجاح", saveCairo.ok === true, saveCairo);
  const saveHurghadaByBM = doPostJson(sandbox, { action: "save", token: bmToken, clientRequestId: "sec-2",
    type: "Morning", data: { date: "2026-09-01", branch: "فرع اختبار الأمان - الغردقة", auditor: "منى عبد الله", total_shipments: 5, matched_shipments: 5 }, user: "bm1" });
  check("[Senior Auditor] Senior Auditor يحفظ سجلًا لفرعه بنجاح (صلاحية save/update كما طُلب)", saveHurghadaByBM.ok === true, saveHurghadaByBM);

  // ==================== 4) Branch Scope على القراءة: كل دور "own" يرى فرعه فقط ====================
  const searchByAuditor = doGetJson(sandbox, { action: "search", token: auditorToken, type: "Morning" });
  check("[Branch Scope] Auditor يرى سجلات فرعه فقط في البحث", searchByAuditor.ok && searchByAuditor.count === 1, searchByAuditor);
  const searchByBM = doGetJson(sandbox, { action: "search", token: bmToken, type: "Morning" });
  check("[Branch Scope] Senior Auditor يرى سجلات فرعه فقط في البحث (لا يرى سجل القاهرة)", searchByBM.ok && searchByBM.count === 1 && searchByBM.results[0].record["الفرع"] === "فرع اختبار الأمان - الغردقة", searchByBM);
  const searchByAdmin = doGetJson(sandbox, { action: "search", token: adminToken, type: "Morning" });
  check("[Branch Scope] Administrator يرى كل الفروع (لا قيد نطاق)", searchByAdmin.ok && searchByAdmin.count === 2, searchByAdmin);

  const kpisByBM = doGetJson(sandbox, { action: "kpis", token: bmToken, type: "Morning" });
  check("[Branch Scope] Senior Auditor: KPIs محسوبة على فرعه فقط (إجمالي=5 وليس 10+5)", kpisByBM.ok && kpisByBM.byType.Morning.total === 1, kpisByBM);

  // Auditor لا يملك صلاحية "viewReports" أصلًا في مصفوفة الأدوار (تاب التقارير غير مسموح له) —
  // هذا رفض صحيح ومقصود، وليس فحص Branch Scope؛ Senior Auditor هو من يملك هذه الصلاحية (نطاقه فقط).
  const reportsByAuditor = doGetJson(sandbox, { action: "reports", token: auditorToken });
  check("[Authorization] Auditor يُرفض عند محاولة فتح التقارير (لا يملك صلاحية viewReports أصلًا)", reportsByAuditor.ok === false, reportsByAuditor);
  const reportsByBM = doGetJson(sandbox, { action: "reports", token: bmToken });
  check("[Branch Scope] التقارير لدور Senior Auditor مقيَّدة بفرعه فقط", reportsByBM.ok && reportsByBM.current.byType.Morning.count === 1, reportsByBM.current && reportsByBM.current.byType.Morning);

  // getRecord: محاولة جلب سجل الغردقة عبر Auditor مقيَّد بالقاهرة فقط — يجب أن تُرفض حتى بالمعرف المباشر
  const cairoRecId = saveCairo.recordId, hurghadaRecId = saveHurghadaByBM.recordId;
  const getForeignByAuditor = doGetJson(sandbox, { action: "getRecord", token: auditorToken, type: "Morning", id: hurghadaRecId });
  check("[Branch Scope] getRecord بمعرّف مباشر لسجل فرع آخر يُرفض حتى لو عرف المستخدم المعرّف (لا التفاف حول القوائم)", getForeignByAuditor.ok === false, getForeignByAuditor);
  const getOwnByAuditor = doGetJson(sandbox, { action: "getRecord", token: auditorToken, type: "Morning", id: cairoRecId });
  check("[Branch Scope] getRecord لسجل فرعه الخاص ينجح", getOwnByAuditor.ok === true, getOwnByAuditor);

  // ==================== 5) منع تعديل سجل خارج النطاق حتى عبر تجاوز Backend مباشرةً (لا فرق) ====================
  const updateForeignByBM = doPostJson(sandbox, { action: "update", token: bmToken, id: cairoRecId,
    type: "Morning", data: { date: "2026-09-01", branch: "فرع اختبار الأمان - الغردقة", auditor: "محاولة استيلاء", total_shipments: 99, matched_shipments: 99 }, user: "bm1" });
  check("[Authorization] Senior Auditor يُرفض عند محاولة \"تعديل\" سجل يخص فرعًا آخر حتى بادّعاء فرعه في البيانات الجديدة",
    updateForeignByBM.ok === false, updateForeignByBM);

  // ==================== 6) Audit Viewer: قراءة فقط، بلا كتابة ====================
  const viewerSave = doPostJson(sandbox, { action: "save", token: viewerToken, clientRequestId: "sec-3",
    type: "Morning", data: { date: "2026-09-01", branch: "القاهرة الجديدة", auditor: "أحمد سالم", total_shipments: 1, matched_shipments: 1 }, user: "viewer1" });
  check("[Authorization] Audit Viewer يُرفض عند محاولة الحفظ", viewerSave.ok === false, viewerSave);
  const viewerSearch = doGetJson(sandbox, { action: "search", token: viewerToken, type: "Morning" });
  check("[Authorization] Audit Viewer يستطيع القراءة (search) — الدور للعرض فقط وليس بلا صلاحية إطلاقًا", viewerSearch.ok === true, viewerSearch);

  // ==================== 7) Senior Auditor: ممنوع من إدارة الفروع/الموظفين تمامًا ====================
  const bmManageBranches = doPostJson(sandbox, { action: "addBranch", token: bmToken, name: "فرع جديد من BM" });
  check("[Authorization] Senior Auditor يُرفض عند محاولة إدارة الفروع", bmManageBranches.ok === false, bmManageBranches);
  const bmManageEmployees = doPostJson(sandbox, { action: "addEmployee", token: bmToken,
    data: { fullName: "محاولة", username: "sneaky1", password: "Passw0rd!", role: "Audit Viewer", branches: [b1.branchId] } });
  check("[Authorization] Senior Auditor يُرفض عند محاولة إدارة الموظفين (لا يمكنه إنشاء أي حساب، فضلًا عن Administrator)", bmManageEmployees.ok === false, bmManageEmployees);

  // ==================== 8) سجل العمليات مُصفًّى بالفرع لدور Senior Auditor ====================
  const auditLogByBM = doPostJson(sandbox, { action: "auditLog", token: bmToken });
  check("[Audit Log] Senior Auditor يرى فقط عمليات فرعه (سجل الحفظ بفرع الغردقة)",
    auditLogByBM.ok && auditLogByBM.entries.every(e => e.action !== "save" || (e.branchIds || "").indexOf(b2.branchId) !== -1), auditLogByBM);
  check("[Audit Log] Senior Auditor لا يرى عملية الحفظ الخاصة بفرع القاهرة", auditLogByBM.ok && !auditLogByBM.entries.some(e => e.details && e.details.indexOf(cairoRecId) !== -1), auditLogByBM.entries);
  const auditLogByAdmin = doPostJson(sandbox, { action: "auditLog", token: adminToken });
  check("[Audit Log] Administrator يرى كل العمليات من كل الفروع بلا تصفية", auditLogByAdmin.ok && auditLogByAdmin.entries.some(e => e.details && e.details.indexOf(cairoRecId) !== -1) && auditLogByAdmin.entries.some(e => e.details && e.details.indexOf(hurghadaRecId) !== -1), auditLogByAdmin.entries.length);

  // ==================== 9) منع تصعيد الصلاحيات الذاتي ====================
  const selfRoleEdit = doPostJson(sandbox, { action: "updateEmployee", token: bmToken, id: bm.employeeId, data: { role: "Administrator" } });
  check("[أمان] مستخدم لا يستطيع تعديل دوره الخاص (حتى لمحاولة تصعيد لنفسه)", selfRoleEdit.ok === false, selfRoleEdit);
  const selfBranchEdit = doPostJson(sandbox, { action: "updateEmployee", token: adminToken, id: admin.employeeId, data: { branches: [b1.branchId] } });
  // ملاحظة: الفحص هنا يمر عبر منفذ Administrator نفسه (auth.session.employeeId === body.id) — حتى Administrator لا يعدّل فروعه/دوره الخاص من هذه الشاشة.
  check("[أمان] حتى Administrator لا يستطيع تعديل نطاق فروعه الخاص من نفس الحساب", selfBranchEdit.ok === false, selfBranchEdit);

  // ==================== 10) تعطيل حساب يُبطل الجلسة الحالية فورًا (وليس بعد انتهاء الـ 6 ساعات) ====================
  const toggleOffBM = doPostJson(sandbox, { action: "toggleEmployee", token: adminToken, id: bm.employeeId, active: false });
  check("[أمان] تعطيل حساب Senior Auditor من Administrator ينجح", toggleOffBM.ok === true, toggleOffBM);
  const bmAfterDisable = doGetJson(sandbox, { action: "search", token: bmToken, type: "Morning" });
  check("[أمان] Token صادر قبل التعطيل يُرفض فورًا في أول طلب تالٍ — لا ينتظر انتهاء صلاحية الجلسة", bmAfterDisable.ok === false, bmAfterDisable);

  console.log(results.map(r => (r.pass ? 'PASS' : 'FAIL - ' + JSON.stringify(r.detail)) + ' - ' + r.name).join('\n'));
  const pass = results.filter(r => r.pass).length;
  console.log(`\n${pass} / ${results.length} اختبارًا ناجحًا (Sandbox — حماية القراءة + Senior Auditor + منع تصعيد الصلاحيات + إبطال الجلسة الفوري)`);
  if (pass !== results.length) process.exit(1);
}
run();
