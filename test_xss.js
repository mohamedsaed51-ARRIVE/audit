// إثبات فعلي عبر متصفح حقيقي أن إصلاح XSS (escapeHtml) يعمل: اسم فرع وملاحظة سجل يحتويان HTML/JS
// حيّ لا يُنفَّذان عند العرض، ويظهران كنص حرفي في الجدول بدل تنفيذهما كعناصر DOM.
//
// Level: Playwright/Sandbox (كل الملفات الأخرى في هذه الحزمة) — يثبت سلوك الواجهة الفعلي في متصفح
// حقيقي، وليس شيئًا عن Google Apps Script/Google Sheets حقيقيين.
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
  page.on('dialog', async d => { await d.accept(); });
  await page.exposeFunction('reportXssFired', () => { throw new Error('XSS payload executed — escaping failed'); });

  const mockSS = buildMockSpreadsheet(schema);
  const sandbox = buildSandbox(codeGsSource, mockSS);
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

  // قبل أي شيء: أي نافذة alert() حقيقية تُنفَّذ (وليست فقط سطرًا نصيًّا) تُلتقَط كخطأ فادح.
  await page.addInitScript(() => {
    window.__xssFired = false;
    const realAlert = window.alert;
    window.alert = function (msg) {
      if (typeof msg === 'string' && msg === 'XSS_PAYLOAD_FIRED') { window.__xssFired = true; return; }
      return realAlert.call(window, msg);
    };
  });

  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.fill('#cfgUrl', 'https://script.google.com/macros/s/TESTXSS/exec');
  await page.fill('#cfgUser', 'مستخدم اختبار');
  await page.click('text=حفظ والدخول');
  await page.waitForTimeout(300);
  await page.fill('#baFullName', 'مسؤول'); await page.fill('#baUsername', 'admxss'); await page.fill('#baPassword', 'Passw0rd!');
  await page.click("button[onclick='doBootstrapAdmin()']");
  await page.waitForTimeout(300);
  await page.fill('#loginUsername', 'admxss'); await page.fill('#loginPassword', 'Passw0rd!');
  await page.click("button[onclick='doLogin()']");
  await page.waitForSelector('#appShell:not(.hidden)');

  // ==================== 1) اسم فرع يحتوي HTML/JS حيّ ====================
  const payload = `<img src=x onerror="alert('XSS_PAYLOAD_FIRED')">"><svg onload="alert('XSS_PAYLOAD_FIRED')">`;
  await page.click("button[onclick=\"go('settings')\"]");
  await page.click("button[data-stab='branches']");
  await page.waitForTimeout(200);
  await page.fill('#newBranchName', payload);
  await page.click('#tab-settings >> text=➕ إضافة فرع');
  await page.waitForTimeout(400);
  const fired1 = await page.evaluate(() => window.__xssFired);
  check('[XSS] اسم فرع يحتوي <img onerror>/<svg onload> لا يُنفَّذ عند إضافته وعرضه في الجدول', fired1 === false, fired1);
  const branchRowTexts = await page.$$eval('#branchesTable tbody tr', rows => rows.map(r => r.textContent));
  const branchCellText = branchRowTexts.find(t => t.includes('onerror')) || '';
  check('[XSS] اسم الفرع يظهر كنص حرفي كاملًا في الجدول (لا عناصر <img>/<svg> فعلية داخل DOM)',
    branchCellText.includes('<img') && branchCellText.includes('<svg'), branchCellText);
  const hasRealImgTag = await page.$('#branchesTable img');
  check('[XSS] لا يوجد عنصر <img> فعلي واحد داخل جدول الفروع (الإدراج كان نصًّا وليس HTML منفَّذًا)', hasRealImgTag === null, !!hasRealImgTag);

  // ==================== 2) اسم موظف يحتوي HTML/JS حيّ (نفس نمط الفحص، شاشة مختلفة) ====================
  await page.click("button[data-stab='employees']");
  await page.waitForTimeout(200);
  await page.fill('#newEmpFullName', payload);
  await page.fill('#newEmpUsername', 'xsstestuser');
  await page.fill('#newEmpPassword', 'Passw0rd!');
  await page.selectOption('#newEmpRole', 'Audit Viewer');
  // Audit Viewer لم يعد يملك canBeAssignedAllBranches (قرار إداري) — لا خيار "كل الفروع" لهذا الدور.
  await page.check('#newEmpBranchesBox input[type=checkbox] >> nth=0');
  await page.click('#tab-settings >> text=➕ إضافة موظف');
  await page.waitForTimeout(400);
  const fired2 = await page.evaluate(() => window.__xssFired);
  check('[XSS] اسم موظف يحتوي <img onerror>/<svg onload> لا يُنفَّذ عند إضافته وعرضه في جدول الموظفين', fired2 === false, fired2);
  const empRowTexts = await page.$$eval('#employeesTable tbody tr', rows => rows.map(r => r.textContent));
  const empCellText = empRowTexts.find(t => t.includes('onerror')) || '';
  check('[XSS] اسم الموظف يظهر كنص حرفي في جدول الموظفين (لا عناصر HTML فعلية داخل DOM)',
    empCellText.includes('<img') && empCellText.includes('<svg'), empCellText);
  const hasRealImgTag2 = await page.$('#employeesTable img');
  check('[XSS] لا يوجد عنصر <img> فعلي واحد داخل جدول الموظفين', hasRealImgTag2 === null, !!hasRealImgTag2);

  console.log('\nJS errors captured:', errors.length ? JSON.stringify(errors, null, 2) : 'none');
  console.log(results.map(r => (r.pass ? 'PASS' : 'FAIL - ' + JSON.stringify(r.detail)) + ' - ' + r.name).join('\n'));
  const pass = results.filter(r => r.pass).length;
  console.log(`\n${pass} / ${results.length} اختبارًا ناجحًا (Playwright — متصفح حقيقي، إثبات إصلاح XSS)`);
  await browser.close();
  if (pass !== results.length || errors.length) process.exit(1);
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
