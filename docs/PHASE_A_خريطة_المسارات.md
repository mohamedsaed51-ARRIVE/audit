# خريطة المسارات بعد إعادة التنظيم (Phase A)

الملفات المذكورة في `CHANGELOG.md` بمسارات قديمة (`backend/` و`appsscript/` و`dashboard/`) هي سجل تاريخي ولم تُعدَّل. المقابل الحالي:

| المسار القديم (كما في CHANGELOG) | المسار الحالي |
|---|---|
| `backend/schema.json` | `app/schema.json` |
| `backend/build_backend.py` | `app/build_backend.py` |
| `backend/ARRIVE_Backend.xlsx` | `data/ARRIVE_Backend.xlsx` |
| `appsscript/Code.gs` | `app/Code.gs` |
| `dashboard/index.html` | `app/index.html` |
| `appsscript/test_*.js` و`appsscript/gs_sandbox.js` | `tests/` |
| `dashboard/test_*.js` | `tests/` |

حالة البيانات: راجع `data/README.md`.
