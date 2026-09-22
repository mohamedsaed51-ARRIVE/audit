// اختبارات مخصَّصة لعطل/إصلاح SESSION_TTL_SECONDS (Google Apps Script CacheService الحقيقي يرفض
// أي put() بمدة انتهاء صلاحية تتجاوز 21600 ثانية/6 ساعات — القيمة السابقة 8*60*60=28800 كانت تتجاوز
// هذا الحد الحقيقي، ولم يكتشفها أي من الاختبارات الـ272 السابقة لأن محاكي gs_sandbox.js لم يكن يفرض
// هذا القيد إطلاقًا. تم تحديث gs_sandbox.js في نفس هذه الجولة ليفرض هذا الحد فعليًا (يرمي خطأً عند
// تجاوزه، تمامًا كما تفعل منصة Google Apps Script الحقيقية)، مما يجعل هذا الملف حارسًا دائمًا ضد
// تكرار هذا النوع من العطل مستقبلًا: أي رفع لاحق لـ SESSION_TTL_SECONDS فوق 21600 سيُسقِط فورًا كل
// اختبار يستدعي تسجيل الدخول عبر كل ملفات الاختبار، وليس هذا الملف فقط.
//
// Level: Node.js / Sandbox — يثبت منطق الكود والمحاكاة المحدَّثة للحد الحقيقي، وليس تشغيلًا فعليًا
// على Google Apps Script/Google Sheets حقيقيين (غير مُتاحين لهذا الاختبار — راجع
// docs/security-risk-report.md لحالة التحقق الحقيقي).
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

function run() {
  const schema = JSON.parse(fs.readFileSync(__dirname + '/../backend/schema.json', 'utf8'));
  const results = [];
  const check = (name, cond, detail) => results.push({ name, pass: !!cond, detail });

  // ==================== 1) القيمة الثابتة نفسها في مصدر Code.gs ====================
  {
    const m = codeGsSource.match(/var\s+SESSION_TTL_SECONDS\s*=\s*([0-9]+)\s*;/);
    check("[الثابت] SESSION_TTL_SECONDS موجود بصيغة رقمية صريحة في Code.gs", !!m, m);
    const value = m ? Number(m[1]) : null;
    check("[الثابت] قيمة SESSION_TTL_SECONDS = 21600 (6 ساعات) بالضبط", value === 21600, value);
    check("[الثابت] القيمة لا تتجاوز الحد الحقيقي الموثَّق لـ CacheService.put() (21600)", value !== null && value <= 21600, value);
  }

  // ==================== 2) لا يوجد أي مسار يسمح للـ Frontend/الطلب بتعديل مدة الجلسة ====================
  {
    const noOverridePatterns = [/body\.ttl/i, /body\.sessionDuration/i, /body\.sessionTtl/i, /body\.expiresIn/i, /params\.ttl/i];
    const found = noOverridePatterns.filter(p => p.test(codeGsSource));
    check("[أمان] لا يقرأ Code.gs أي قيمة TTL/مدة جلسة من جسم الطلب (body) — القيمة ثابتة في الكود فقط", found.length === 0, found.map(String));
  }

  // ==================== 3) المحاكي (gs_sandbox.js) يفرض فعليًا الحد الحقيقي 21600 ====================
  const mockSS0 = buildMockSpreadsheet(schema);
  const sandbox0 = buildSandbox(mockSS0);
  {
    let threw = null;
    try { sandbox0.CacheService.getScriptCache().put("k_over_limit", "v", 21601); }
    catch (e) { threw = e; }
    check("[محاكاة الحد الحقيقي] put() بمدة 21601 ثانية (فوق الحد) يرمي خطأً — يحاكي رفض Google Apps Script الفعلي", !!threw, threw && threw.message);

    let threwOk = null;
    try { sandbox0.CacheService.getScriptCache().put("k_at_limit", "v", 21600); }
    catch (e) { threwOk = e; }
    check("[محاكاة الحد الحقيقي] put() بمدة 21600 ثانية بالضبط (الحد الأقصى) يُقبَل دون خطأ", threwOk === null, threwOk && threwOk.message);

    let threwLow = null;
    try { sandbox0.CacheService.getScriptCache().put("k_zero", "v", 0); }
    catch (e) { threwLow = e; }
    check("[محاكاة الحد الحقيقي] put() بمدة 0 (أقل من الحد الأدنى 1) يرمي خطأً أيضًا", !!threwLow, threwLow && threwLow.message);
  }

  // ==================== 4) تسجيل الدخول الفعلي يمرِّر بالضبط SESSION_TTL_SECONDS إلى CacheService ====================
  const mockSS = buildMockSpreadsheet(schema);
  const sandbox = buildSandbox(mockSS);
  setAuthEnabled(mockSS, true);
  sandbox._actionBootstrapAdmin({ fullName: "مسؤول الاختبار", username: "ttladmin", password: "Passw0rd!" });
  const login = sandbox._actionLogin({ username: "ttladmin", password: "Passw0rd!" });
  check("[تسجيل الدخول] ينجح ويُصدر Token فعليًا (بعد إصلاح TTL — لم يعد يرمي خطأ تجاوز الحد)", login.ok === true && !!login.token, login);
  const cacheKey = "sess_" + login.token;
  const rawEntry = sandbox.__cacheTestHooks.getRawEntry(cacheKey);
  check("[تسجيل الدخول] جلسة المستخدم فعليًا مخزَّنة في الكاش تحت مفتاح sess_<token>", !!rawEntry, cacheKey);
  check("[تسجيل الدخول] مدة انتهاء الجلسة المخزَّنة فعليًا = 21600 ثانية بالضبط (لا قيمة أخرى، ولا قيمة قادمة من الطلب)", rawEntry && rawEntry.ttlSeconds === 21600, rawEntry && rawEntry.ttlSeconds);

  // ==================== 5) لا كلمة مرور ولا Hash داخل بيانات الجلسة المخزَّنة في الكاش ====================
  {
    const stored = JSON.parse(rawEntry.v);
    check("[أمان] بيانات الجلسة في الكاش لا تحتوي حقل كلمة مرور/Hash/Salt إطلاقًا", !('password' in stored) && !('hash' in stored) && !('salt' in stored), Object.keys(stored));
  }

  // ==================== 6) Token غير صحيح (عشوائي) يُرفض ====================
  const bogusTokenTry = sandbox._actionSave({ token: "توكن-عشوائي-غير-موجود-إطلاقًا", type: "Morning",
    data: { date: "2026-09-05", branch: "القاهرة الجديدة", auditor: "أحمد سالم", total_shipments: 1, matched_shipments: 1 },
    user: "X", clientRequestId: "ttl-bogus-token" });
  check("[Token غير صحيح] طلب بـ Token عشوائي غير موجود في الكاش يُرفض", bogusTokenTry.ok === false, bogusTokenTry);

  // ==================== 7) Token فارغ/مفقود يُرفض ====================
  const missingTokenTry = sandbox._actionSave({ type: "Morning",
    data: { date: "2026-09-05", branch: "القاهرة الجديدة", auditor: "أحمد سالم", total_shipments: 1, matched_shipments: 1 },
    user: "X", clientRequestId: "ttl-missing-token" });
  check("[Token مفقود] طلب بلا Token إطلاقًا (وauth مفعَّل) يُرفض", missingTokenTry.ok === false, missingTokenTry);

  // ==================== 8) انتهاء صلاحية الكاش (محاكاة) يُبطل الجلسة ويتطلب دخولًا جديدًا ====================
  {
    const preExpiry = doGetJson(sandbox, { action: "kpis", token: login.token });
    check("[قبل الانتهاء] الجلسة صالحة وتُنفِّذ عملية محمية بنجاح", preExpiry.ok === true, preExpiry);

    sandbox.__cacheTestHooks.expireAllCacheEntries(); // محاكاة انتهاء/تفريغ الكاش فعليًا (وليس فقط انتظار وقت)
    const afterExpiry = doGetJson(sandbox, { action: "kpis", token: login.token });
    check("[بعد انتهاء الكاش] نفس الـ Token يُرفض فورًا بعد انتهاء/فقدان الجلسة من الكاش", afterExpiry.ok === false, afterExpiry);
    check("[بعد انتهاء الكاش] رسالة الرفض تطلب تسجيل دخول جديد بوضوح", afterExpiry.ok === false && /تسجيل الدخول/.test(afterExpiry.error || ""), afterExpiry.error);
  }

  // ==================== 9) Logout يُبطل الجلسة فورًا (لا ينتظر انتهاء الـ 6 ساعات) ====================
  const login2 = sandbox._actionLogin({ username: "ttladmin", password: "Passw0rd!" });
  check("[دخول جديد] تسجيل دخول ثانٍ بعد انتهاء الجلسة الأولى ينجح (المستخدم اضطُر لإعادة الدخول كما هو متوقَّع)", login2.ok === true && !!login2.token, login2);
  const logoutRes = sandbox._actionLogout({ token: login2.token });
  check("[Logout] تسجيل الخروج ينجح", logoutRes.ok === true, logoutRes);
  const afterLogoutTry = doGetJson(sandbox, { action: "kpis", token: login2.token });
  check("[Logout] نفس الـ Token يُرفض فورًا بعد Logout رغم عدم انتهاء الـ 6 ساعات نظريًا", afterLogoutTry.ok === false, afterLogoutTry);

  // ==================== 10) فشل قراءة الجلسة يمنع الوصول للعمليات المحمية دون استثناء (لا Fail-Open) ====================
  {
    const noSessionActions = [
      () => sandbox._actionSave({ token: "غير موجود", type: "Morning", data: { date: "2026-09-06", branch: "القاهرة الجديدة", auditor: "أحمد", total_shipments: 1, matched_shipments: 1 }, user: "X", clientRequestId: "ttl-denyall-1" }),
      () => doGetJson(sandbox, { action: "kpis", token: "غير موجود" }),
      () => sandbox._actionListBranches({ token: "غير موجود" }),
    ];
    const allDenied = noSessionActions.every(fn => fn().ok === false);
    check("[لا Fail-Open] كل العمليات المحمية المختبَرة تُرفض عند Token غير صالح — لا استثناء يمر بالخطأ", allDenied, "checked 3 protected actions");
  }

  // ---- summary ----
  console.log(results.map(r => (r.pass ? "PASS" : "FAIL - " + JSON.stringify(r.detail)) + " - " + r.name).join("\n"));
  const pass = results.filter(r => r.pass).length;
  console.log(`\n${pass} / ${results.length} اختبارًا ناجحًا (Sandbox — SESSION_TTL_SECONDS، انتهاء/فقدان الجلسة، Logout، رفض Token غير صحيح — يحاكي الآن حد CacheService الحقيقي 21600 ثانية فعليًا)`);
  if (pass !== results.length) process.exit(1);
}
run();
