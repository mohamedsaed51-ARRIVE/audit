// Real-browser test: عند غياب arrive_api_url من localStorage يجب أن يكون API_URL فارغًا، وتظهر شاشة الإعداد،
// ولا يُرسَل أي طلب إلى script.google.com / googleusercontent. كل الطلبات غير file:// تُحجَب هنا ولا تخرج
// من الجهاز (لا اتصال بأي Web App أو Google Sheet حقيقي).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PAGES = [
  { label: 'app/index.html', file: path.join(__dirname, '../app/index.html') },
  { label: 'index.html (الجذر)', file: path.join(__dirname, '../index.html') },
];

async function main() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const results = [];
  const check = (name, cond, detail) => results.push({ name, pass: !!cond, detail });
  const jsErrors = [];

  for (const p of PAGES) {
    const page = await browser.newPage();
    page.on('pageerror', err => jsErrors.push(p.label + ': ' + err.message));
    const appsScriptRequests = [];
    await page.route('**/*', route => {
      const u = route.request().url();
      if (u.startsWith('file:')) return route.continue();
      if (/script\.google(usercontent)?\.com/.test(u)) appsScriptRequests.push(u);
      return route.abort(); // لا شيء يخرج من الجهاز (الخطوط/الأيقونات الخارجية تُحجَب أيضًا)
    });

    await page.goto('file://' + p.file);
    await page.waitForTimeout(500); // مهلة لأي طلب init() تلقائي لو كان سيحدث

    const stored = await page.evaluate(() => localStorage.getItem('arrive_api_url'));
    check(`[${p.label}] نقطة التحقق: لا يوجد arrive_api_url في localStorage`, stored === null, stored);
    check(`[${p.label}] API_URL فارغ عند غياب arrive_api_url`, (await page.evaluate(() => API_URL)) === '');
    check(`[${p.label}] شاشة الإعداد ظاهرة`, await page.isVisible('#configScreen'));
    check(`[${p.label}] واجهة التطبيق الرئيسية مخفية`, !(await page.isVisible('#appShell')));
    check(`[${p.label}] صفر طلبات إلى Google Apps Script`, appsScriptRequests.length === 0, appsScriptRequests);
    check(`[${p.label}] المصدر لا يحتوي رابط /macros/s/ حقيقيًا مضمّنًا`,
      !/script\.google\.com\/macros\/s\/(?!XXXX)[A-Za-z0-9_-]{20,}/.test(fs.readFileSync(p.file, 'utf8')));
    await page.close();
  }

  console.log('\nJS errors captured:', jsErrors.length ? JSON.stringify(jsErrors, null, 2) : 'none');
  console.log(results.map(r => (r.pass ? 'PASS' : 'FAIL - ' + JSON.stringify(r.detail)) + ' - ' + r.name).join('\n'));
  const pass = results.filter(r => r.pass).length;
  console.log(`\n${pass} / ${results.length} اختبارًا ناجحًا (Playwright — بلا أي اتصال خارجي، الرابط الافتراضي فارغ)`);
  await browser.close();
  if (pass !== results.length || jsErrors.length) process.exit(1);
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
