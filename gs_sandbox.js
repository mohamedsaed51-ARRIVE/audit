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
      setNumberFormat(fmt) { self.formats[r + ',' + c] = fmt; return this; }, // real Apps Script Range API
    };
  }
  getDataRange() { return this.getRange(1, 1, this.rows.length, this.rows[0].length); }
  appendRow(row) { this.rows.push(row.slice()); }
}

function buildMockSpreadsheet(schema) {
  const sheets = {};
  schema.control_types.forEach(ct => {
    const sys = schema.system_columns;
    const headers = [sys[0], sys[1], sys[2], sys[3]].concat(ct.fields).concat(ct.computed || []).concat([sys[4], sys[5]]).map(c => c.label);
    sheets[ct.sheet] = new Sheet(ct.sheet, headers);
  });
  const settingsRows = [["نوع القائمة", "القيمة", ""]];
  Object.entries(schema.lists).forEach(([k, vals]) => vals.forEach(v => settingsRows.push([k, v, ""])));
  settingsRows.push(["الأهداف الرقابية", "", ""]);
  Object.entries(schema.targets).forEach(([k, v]) => settingsRows.push([k, v, ""]));
  settingsRows.push(["فئات عمر الحالات المتأخرة", "", ""]);
  settingsRows.push(["من", "إلى", "التصنيف"]);
  schema.age_buckets.forEach(([a, b, label]) => settingsRows.push([a, b, label]));
  const settingsSheet = new Sheet("الإعدادات", settingsRows[0]);
  settingsSheet.rows = settingsRows;
  sheets["الإعدادات"] = settingsSheet;

  const seqSheet = new Sheet("_Sequence", ["نوع الرقابة", "آخر رقم مستخدم"]);
  schema.control_types.forEach(ct => seqSheet.appendRow([ct.key, 0]));
  sheets["_Sequence"] = seqSheet;

  return { getSheetByName: (name) => sheets[name] || null, _sheets: sheets };
}

/** codeGsSource: the verbatim text of Code.gs (read by the caller) — never re-typed rule logic. */
function buildSandbox(codeGsSource, mockSS) {
  const cacheStore = {};
  const sandbox = {
    console,
    SpreadsheetApp: { getActiveSpreadsheet: () => mockSS, flush: () => {} },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    CacheService: { getScriptCache: () => ({
      get: (k) => (k in cacheStore ? cacheStore[k] : null),
      put: (k, v) => { cacheStore[k] = v; },
    })},
    Utilities: {
      formatDate: (d, tz, fmt) => {
        if (fmt === "yyyy-MM-dd") return d.toISOString().slice(0, 10);
        if (fmt === "HH:mm:ss") return d.toISOString().slice(11, 19);
        if (fmt === "yyyy-MM-dd HH:mm:ss") return d.toISOString().slice(0, 19).replace('T', ' ');
        return d.toString();
      },
    },
    Session: { getScriptTimeZone: () => "UTC" },
    ContentService: {
      MimeType: { JSON: "JSON" },
      createTextOutput: (s) => ({ setMimeType: () => ({ getContent: () => s }) }),
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(codeGsSource, sandbox);
  return sandbox;
}

module.exports = { Sheet, buildMockSpreadsheet, buildSandbox };
