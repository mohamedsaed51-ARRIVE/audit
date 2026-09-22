// Real-browser (Playwright) tests for the NEW Settings hub: Login/Logout, Branches Management,
// Employees Management — driven through the ACTUAL dashboard/index.html UI, routed into the same
// real appsscript/Code.gs (via gs_sandbox.js) as test_dashboard.js. Kept in its own file so the
// existing, already-verified test_dashboard.js (65/65) stays completely untouched.
//
// Level: same caveat as every other file here — Sandbox-backed browser test, NOT a real Google
// Apps Script Web App / Google Sheets connection (see docs/اختبار_Live_Integration.md).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { buildMockSpreadsheet, buildSandbox } = require('../appsscript/gs_sandbox');

const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '../backend/schema.json'), 'utf8'));
const codeGsSource = fs.readFileSync(path.join(__dirname, '../appsscript/Code.gs'), 'utf8');

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('dialog', async d => { await d.accept(); }); // bootstrapAdmin/add/toggle flows use alert()/confirm()

  const mockSS = buildMockSpreadsheet(schema);
  const sandbox = buildSandbox(codeGsSource, mockSS);
  // فعِّل نظام تسجيل الدخول قبل فتح الصفحة — تمامًا كما يفعله مسؤول النظام يدويًا في تاب "الإعدادات"
  for (const row of mockSS._sheets["الإعدادات"].rows) if (row[0] === "auth_enabled") row[1] = "1";

  await page.route('**/macros/**', async (route) => {
    const req = route.request();
    if (req.method() === 'GET') {
      const url = new URL(req.url()); const params = {};
      url.searchParams.forEach((v, k) => { params[k] = v; });
      return route.fulfill({ contentType: 'application/json', body: sandbox.doGet({ parameter: params }).getContent() });
    }
    return route.fulfill({ contentType: 'application/json', body: sandbox.doPost({ postData: { contents: req.postData() } }).getContent() });
  });

  const results = [];
  const check = (name, cond, detail) => results.push({ name, pass: !!cond, detail });

  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.fill('#cfgUrl', 'https://script.google.com/macros/s/TESTADMINUI/exec');
  await page.fill('#cfgUser', 'مستخدم مؤقت');
  await page.click('text=حفظ والدخول');
  await page.waitForTimeout(300);

  // ==================== 1) أول تشغيل: يجب أن تظهر شاشة "إنشاء أول حساب مسؤول" ====================
  check('[First-run] شاشة تسجيل الدخول تظهر بدل الشاشة الرئيسية طالما auth مفعَّل ولا يوجد Token',
    await page.isVisible('#loginScreen'), 'ok');
  check('[First-run] صندوق إنشاء أول حساب Administrator يظهر (لا موظفين بعد)',
    await page.isVisible('#loginBootstrapBox'), 'ok');

  await page.fill('#baFullName', 'محمد سعيد');
  await page.fill('#baUsername', 'msaid');
  await page.fill('#baPassword', 'Passw0rd!');
  await page.click("button[onclick='doBootstrapAdmin()']");
  await page.waitForTimeout(300);
  check('[First-run] بعد إنشاء الحساب الأول تظهر شاشة الدخول العادية', await page.isVisible('#loginNormalBox'), 'ok');

  // ==================== 2) كلمة مرور خاطئة تُرفض من الواجهة ====================
  await page.fill('#loginUsername', 'msaid');
  await page.fill('#loginPassword', 'كلمة_خاطئة');
  await page.click("button[onclick='doLogin()']");
  await page.waitForTimeout(300);
  const wrongPwMsg = await page.textContent('#loginErr');
  check('[Login UI] كلمة مرور خاطئة تُظهر رسالة خطأ في الواجهة ولا تفتح Dashboard',
    (await page.isVisible('#loginErr')) && !(await page.isVisible('#appShell')), wrongPwMsg);

  // ==================== 3) تسجيل دخول صحيح يفتح Dashboard ====================
  await page.fill('#loginPassword', 'Passw0rd!');
  await page.click("button[onclick='doLogin()']");
  await page.waitForSelector('#appShell:not(.hidden)');
  check('[Login UI] بيانات صحيحة تفتح Dashboard فعليًا', await page.isVisible('#appShell'), 'ok');
  check('[Login UI] زر تسجيل الخروج يظهر بعد الدخول (auth مفعَّل)', await page.isVisible('#logoutBtn'), 'ok');

  // Token لا يُخزَّن أبدًا في localStorage — فحص مباشر
  const localStorageDump = await page.evaluate(() => JSON.stringify(localStorage));
  check('[أمان] لا يوجد أي Token في localStorage (يبقى في الذاكرة فقط)', !localStorageDump.includes('token') && !/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(localStorageDump), localStorageDump);

  // ==================== 4) إدارة الفروع عبر الواجهة الحقيقية ====================
  await page.click("button[onclick=\"go('settings')\"]");
  await page.click("button[data-stab='branches']");
  await page.waitForTimeout(200);
  await page.fill('#newBranchName', 'الأقصر');
  await page.click('#tab-settings >> text=➕ إضافة فرع');
  await page.waitForTimeout(300);
  let branchRows = await page.$$eval('#branchesTable tbody tr', rows => rows.map(r => r.textContent));
  check('[Branches UI] الفرع الجديد يظهر في الجدول بعد الإضافة', branchRows.some(t => t.includes('الأقصر')), branchRows);

  await page.fill('#newBranchName', 'الأقصر');
  await page.click('#tab-settings >> text=➕ إضافة فرع');
  await page.waitForTimeout(300);
  const branchMsg = await page.textContent('#branchMsg');
  check('[Branches UI] منع تكرار اسم الفرع من الواجهة أيضًا', branchMsg.includes('بالفعل'), branchMsg);

  await page.click('#branchesTable tbody tr:has-text("الأقصر") >> text=⏸️ تعطيل');
  await page.waitForTimeout(300);
  branchRows = await page.$$eval('#branchesTable tbody tr', rows => rows.map(r => r.textContent));
  check('[Branches UI] تعطيل فرع من الواجهة يُحدِّث حالته إلى "معطل" في الجدول', branchRows.some(t => t.includes('الأقصر') && t.includes('معطل')), branchRows);

  // ==================== 5) إدارة الموظفين عبر الواجهة الحقيقية ====================
  await page.click("button[data-stab='employees']");
  await page.waitForTimeout(200);
  await page.fill('#newEmpFullName', 'موظف تجريبي');
  await page.fill('#newEmpUsername', 'tempuser1');
  await page.fill('#newEmpPassword', 'Passw0rd!');
  await page.selectOption('#newEmpRole', 'Audit Viewer');
  // Audit Viewer لم يعد يملك canBeAssignedAllBranches (قرار إداري: لا سيناريو فعلي يبرر رؤية دور
  // "عرض فقط" لكل الفروع معًا) — فلا يظهر خيار "كل الفروع" إطلاقًا لهذا الدور؛ يلزم تحديد فرع محدد.
  await page.check('#newEmpBranchesBox input[type=checkbox] >> nth=0');
  await page.click('#tab-settings >> text=➕ إضافة موظف');
  await page.waitForTimeout(300);
  let empRows = await page.$$eval('#employeesTable tbody tr', rows => rows.map(r => r.textContent));
  check('[Employees UI] الموظف الجديد يظهر في الجدول بعد الإضافة', empRows.some(t => t.includes('tempuser1')), empRows);

  await page.fill('#newEmpUsername', 'tempuser1'); // نفس اسم المستخدم مجددًا
  await page.fill('#newEmpFullName', 'شخص آخر'); await page.fill('#newEmpPassword', 'Passw0rd!');
  await page.selectOption('#newEmpRole', 'Audit Viewer');
  await page.check('#newEmpBranchesBox input[type=checkbox] >> nth=0'); // النموذج يُفرَّغ بعد كل إضافة ناجحة
  await page.click('#tab-settings >> text=➕ إضافة موظف');
  await page.waitForTimeout(300);
  const empMsg = await page.textContent('#empMsg');
  check('[Employees UI] منع تكرار اسم المستخدم من الواجهة أيضًا', empMsg.includes('مستخدَم بالفعل'), empMsg);

  await page.click('#employeesTable tbody tr:has-text("tempuser1") >> text=⏸️ تعطيل');
  await page.waitForTimeout(300);
  empRows = await page.$$eval('#employeesTable tbody tr', rows => rows.map(r => r.textContent));
  check('[Employees UI] تعطيل موظف من الواجهة يُحدِّث حالته إلى "معطل"', empRows.some(t => t.includes('tempuser1') && t.includes('معطل')), empRows);

  // ==================== 6) حساب معطَّل يُرفض تسجيل دخوله فعليًا (من الواجهة) ====================
  await page.click('#logoutBtn');
  await page.waitForSelector('#loginScreen:not(.hidden)');
  await page.fill('#loginUsername', 'tempuser1');
  await page.fill('#loginPassword', 'Passw0rd!');
  await page.click("button[onclick='doLogin()']");
  await page.waitForTimeout(300);
  const disabledMsg = await page.textContent('#loginErr');
  check('[Login UI] حساب معطَّل من الإعدادات يُرفض دخوله فعليًا عبر الواجهة، برسالة مختلفة عن كلمة مرور خاطئة',
    disabledMsg.includes('معطّل'), disabledMsg);

  // ==================== 7) سجل العمليات يعرض عمليات تمت فعليًا خلال هذا الاختبار ====================
  await page.fill('#loginUsername', 'msaid'); await page.fill('#loginPassword', 'Passw0rd!');
  await page.click("button[onclick='doLogin()']");
  await page.waitForSelector('#appShell:not(.hidden)');
  await page.click("button[onclick=\"go('settings')\"]");
  await page.click("button[data-stab='audit']");
  await page.waitForTimeout(300);
  const auditRows = await page.$$eval('#auditTable tbody tr', rows => rows.map(r => r.textContent));
  check('[Audit Log UI] سجل العمليات يعرض عملية إضافة الفرع/الموظف فعليًا (وليس جدولًا فارغًا)',
    auditRows.some(t => t.includes('addBranch') || t.includes('addEmployee')), auditRows.length);

  console.log('\nJS errors captured:', errors.length ? JSON.stringify(errors, null, 2) : 'none');
  console.log(results.map(r => (r.pass ? 'PASS' : 'FAIL - ' + JSON.stringify(r.detail)) + ' - ' + r.name).join('\n'));
  const pass = results.filter(r => r.pass).length;
  console.log(`\n${pass} / ${results.length} اختبارًا ناجحًا (Playwright — متصفح حقيقي، واجهة الإعدادات الجديدة كاملة)`);
  await browser.close();
  if (pass !== results.length || errors.length) process.exit(1);
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
