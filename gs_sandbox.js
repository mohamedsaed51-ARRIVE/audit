// Shared Google Apps Script runtime mock, used by BOTH test_harness.js (Level 1 — Node unit tests)
// AND dashboard/test_dashboard.js (Level 2 — Playwright browser tests routing through this same
// sandbox instead of a hand-written imitation of Code.gs's rules).
//
// Why this file exists: a Playwright test's page.route() callback runs in Node.js, not inside the
// browser page — so it CAN load and execute the real Code.gs source via vm, exactly like the Node
// unit tests do. Routing the browser suite's mocked network layer through the SAME sandbox means
// the browser tests exercise Code.gs's actual _validate()/_computeFields()/_actionSave() etc., not
// a second, independently-typed copy of the business rules that could silently drift from the real
// one. Only the real Google Sheets/Apps Script network hop itself is not exercised by either test —
// that gap is Level 3 (Live), documented separately as not executed from this environment.
const vm = require('vm');
const crypto = require('crypto');

class Sheet {
  constructor(name, headers) { this.name = name; this.rows = [headers.slice()]; this.formats = {}; /* "r,c" -> format string, mirrors real Sheets cell number formats */ }
  getLastColumn() { return this.rows[0].length; }
  getLastRow() { return this.rows.length; }
  getRange(r, c, numRows, numCols) {
    numRows = numRows || 1; numCols = numCols || 1;
    const self = this;
    return {
      getValues() {
        const out = [];
        for (let i = 0; i < numRows; i++) {
          const row = [];
          for (let j = 0; j < numCols; j++) row.push(self.rows[r - 1 + i] ? self.rows[r - 1 + i][c - 1 + j] : undefined);
          out.push(row);
        }
        return out;
      },
      getValue() { return self.rows[r - 1][c - 1]; },
      setValue(v) { self.rows[r - 1][c - 1] = v; },
      setValues(vals) { // real Apps Script Range.setValues([[...]]) — writes a 2D block starting at (r,c)
        for (let i = 0; i < vals.length; i++) for (let j = 0; j < vals[i].length; j++) {
          if (!self.rows[r - 1 + i]) self.rows[r - 1 + i] = [];
          self.rows[r - 1 + i][c - 1 + j] = vals[i][j];
        }
      },
      setNumberFormat(fmt) { self.formats[r + ',' + c] = fmt; return this; }, // real Apps Script Range API
    };
  }
  getDataRange() { return this.getRange(1, 1, this.rows.length, this.rows[0].length); }
  appendRow(row) { this.rows.push(row.slice()); }
  // real Apps Script Sheet.insertRowBefore(rowPosition) — shifts rowPosition and everything after it down by one
  insertRowBefore(rowPosition) { this.rows.splice(rowPosition - 1, 0, new Array(this.rows[0].length).fill("")); }
}

function buildMockSpreadsheet(schema) {
  const sheets = {};
  schema.control_types.forEach(ct => {
    const sys = schema.system_columns;
    const headers = [sys[0], sys[1], sys[2], sys[3]].concat(ct.fields).concat(ct.computed || []).concat([sys[4], sys[5]]).map(c => c.label);
    sheets[ct.sheet] = new Sheet(ct.sheet, headers);
  });
  const settingsRows = [["نوع القائمة", "القيمة", "المعرّف", "الحالة"]];
  Object.entries(schema.lists).forEach(([k, vals]) => vals.forEach((v, i) => {
    if (k === "Branches") settingsRows.push([k, v, "BR-" + String(i + 1).padStart(3, "0"), "نشط"]);
    else settingsRows.push([k, v, "", ""]);
  }));
  settingsRows.push(["الأهداف الرقابية", "", "", ""]);
  Object.entries(schema.targets).forEach(([k, v]) => settingsRows.push([k, v, "", ""]));
  settingsRows.push(["فئات عمر الحالات المتأخرة", "", "", ""]);
  settingsRows.push(["من", "إلى", "التصنيف", ""]);
  schema.age_buckets.forEach(([a, b, label]) => settingsRows.push([a, b, label, ""]));
  const settingsSheet = new Sheet("الإعدادات", settingsRows[0]);
  settingsSheet.rows = settingsRows;
  sheets["الإعدادات"] = settingsSheet;

  const seqSheet = new Sheet("_Sequence", ["نوع الرقابة", "آخر رقم مستخدم"]);
  schema.control_types.forEach(ct => seqSheet.appendRow([ct.key, 0]));
  sheets["_Sequence"] = seqSheet;

  (schema.admin_sheets || []).forEach(as => {
    sheets[as.sheet] = new Sheet(as.sheet, as.headers.slice());
  });

  return { getSheetByName: (name) => sheets[name] || null, _sheets: sheets };
}

/** codeGsSource: the verbatim text of Code.gs (read by the caller) — never re-typed rule logic. */
/** الحد الأقصى الحقيقي والموثَّق لِـ CacheService.put() في Google Apps Script الفعلي —
 * القيمة المرجعية الوحيدة لفحص أي TTL يمرَّر للكاش عبر هذا الـ Sandbox. */
const REAL_CACHE_MAX_TTL_SECONDS = 21600;
const REAL_CACHE_MIN_TTL_SECONDS = 1;

function buildSandbox(codeGsSource, mockSS) {
  // كل قيمة مخزَّنة: { v: <القيمة>, expiresAt: <مللي ثانية Date.now() + ttl>|Infinity, ttlSeconds }
  // — يُحاكي انتهاء صلاحية الكاش الحقيقي زمنيًا (وليس افتراضًا بأنه لا ينتهي أبدًا كما كان سابقًا)،
  // ويرفض أي put() بقيمة TTL تتجاوز الحد الحقيقي 21600 ثانية أو أقل من 1 — تمامًا كما يفعل
  // Google Apps Script الحقيقي (سبب اكتشاف عطل SESSION_TTL_SECONDS الذي كان يتجاوز هذا الحد سابقًا).
  const cacheStore = {};
  function cacheGet(k) {
    const entry = cacheStore[k];
    if (!entry) return null;
    if (entry.expiresAt !== Infinity && Date.now() > entry.expiresAt) { delete cacheStore[k]; return null; }
    return entry.v;
  }
  function cachePut(k, v, ttlSeconds) {
    if (ttlSeconds !== undefined && ttlSeconds !== null) {
      if (ttlSeconds > REAL_CACHE_MAX_TTL_SECONDS || ttlSeconds < REAL_CACHE_MIN_TTL_SECONDS) {
        throw new Error(
          "CacheService.put(): expirationInSeconds (" + ttlSeconds + ") يجب أن يكون بين " +
          REAL_CACHE_MIN_TTL_SECONDS + " و" + REAL_CACHE_MAX_TTL_SECONDS +
          " — هذا هو الحد الحقيقي الموثَّق لِـ Google Apps Script CacheService."
        );
      }
    }
    cacheStore[k] = { v: v, ttlSeconds: ttlSeconds, expiresAt: (ttlSeconds !== undefined && ttlSeconds !== null) ? (Date.now() + ttlSeconds * 1000) : Infinity };
  }
  const sandbox = {
    console,
    SpreadsheetApp: { getActiveSpreadsheet: () => mockSS, flush: () => {} },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    CacheService: { getScriptCache: () => ({
      get: cacheGet,
      put: cachePut,
      remove: (k) => { delete cacheStore[k]; },
    })},
    Utilities: {
      formatDate: (d, tz, fmt) => {
        if (fmt === "yyyy-MM-dd") return d.toISOString().slice(0, 10);
        if (fmt === "HH:mm:ss") return d.toISOString().slice(11, 19);
        if (fmt === "yyyy-MM-dd HH:mm:ss") return d.toISOString().slice(0, 19).replace('T', ' ');
        return d.toString();
      },
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      // Mirrors real Apps Script Utilities.computeDigest: returns a signed byte array (-128..127),
      // which Code.gs's _hashPassword masks back to unsigned bytes before hex-encoding — same as prod.
      computeDigest: (algo, str) => {
        const buf = crypto.createHash('sha256').update(String(str), 'utf8').digest();
        return Array.from(buf).map(b => (b > 127 ? b - 256 : b));
      },
      getUuid: () => crypto.randomUUID(),
    },
    Session: { getScriptTimeZone: () => "UTC" },
    ContentService: {
      MimeType: { JSON: "JSON" },
      createTextOutput: (s) => ({ setMimeType: () => ({ getContent: () => s }) }),
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(codeGsSource, sandbox);
  // أدوات اختبار فقط — لا يستخدمها كود Code.gs نفسه إطلاقًا، فقط ملفات الاختبار للتحقق من TTL
  // الفعلي المخزَّن ولمحاكاة انتهاء الكاش (Cache Expiry) بشكل حتمي دون انتظار وقت حقيقي.
  sandbox.__cacheTestHooks = {
    getRawEntry: (k) => (cacheStore[k] ? Object.assign({}, cacheStore[k]) : null),
    expireAllCacheEntries: () => { Object.keys(cacheStore).forEach((k) => { cacheStore[k].expiresAt = -1; }); },
    maxTtlSeconds: REAL_CACHE_MAX_TTL_SECONDS,
  };
  return sandbox;
}

module.exports = { Sheet, buildMockSpreadsheet, buildSandbox };
