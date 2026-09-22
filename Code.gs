const SCHEMA = {
  "control_types": [
    {
      "key": "Morning",
      "name": "المطابقة الصباحية",
      "sheet": "المطابقة الصباحية",
      "id_prefix": "MM",
      "fields": [
        {
          "key": "date",
          "label": "التاريخ",
          "type": "date",
          "required": true
        },
        {
          "key": "time",
          "label": "وقت المطابقة",
          "type": "time",
          "required": false
        },
        {
          "key": "branch",
          "label": "الفرع",
          "type": "list",
          "list": "Branches",
          "required": true
        },
        {
          "key": "auditor",
          "label": "اسم المدقق",
          "type": "list",
          "list": "Auditors",
          "required": true
        },
        {
          "key": "total_shipments",
          "label": "إجمالي الشحنات",
          "type": "number",
          "required": true
        },
        {
          "key": "matched_shipments",
          "label": "شحنات مطابقة",
          "type": "number",
          "required": true
        },
        {
          "key": "unmatched_shipments",
          "label": "شحنات غير مطابقة",
          "type": "number",
          "required": false
        },
        {
          "key": "not_found_shipments",
          "label": "شحنات لم يتم العثور عليها",
          "type": "number",
          "required": false
        },
        {
          "key": "error_shipments",
          "label": "شحنات بها أخطاء",
          "type": "number",
          "required": false
        },
        {
          "key": "issue_type",
          "label": "نوع المشكلة",
          "type": "list",
          "list": "IssueTypes",
          "required": false
        },
        {
          "key": "issue_detail",
          "label": "تفاصيل المشكلة",
          "type": "text",
          "required": false
        },
        {
          "key": "owner",
          "label": "المسؤول عن الإجراء",
          "type": "list",
          "list": "Users",
          "required": false
        },
        {
          "key": "status",
          "label": "حالة المتابعة",
          "type": "list",
          "list": "FollowupStatus",
          "required": false
        },
        {
          "key": "close_date",
          "label": "تاريخ الإغلاق",
          "type": "date",
          "required": false
        },
        {
          "key": "notes",
          "label": "ملاحظات",
          "type": "text",
          "required": false
        }
      ],
      "computed": [
        {
          "key": "match_pct",
          "label": "نسبة المطابقة",
          "formula": "matched_shipments/total_shipments",
          "format": "percent1"
        },
        {
          "key": "count_check",
          "label": "تحقق الأعداد",
          "formula": "count_check_morning"
        },
        {
          "key": "count_diff",
          "label": "الفرق عن الإجمالي (محسوب)",
          "formula": "morning_count_diff"
        }
      ],
      "filters": {
        "date": "date",
        "branch": [
          "branch"
        ],
        "auditor": "auditor",
        "owner": [
          "owner"
        ],
        "status": [
          "status"
        ],
        "priority": null
      },
      "validation_rules": [
        {
          "rule": "morning_count_reconciliation",
          "message": "مجموع (شحنات مطابقة + غير مطابقة + لم يتم العثور عليها + بها أخطاء) لا يساوي إجمالي الشحنات — راجع الأعداد قبل الحفظ."
        },
        {
          "rule": "closed_requires_close_date",
          "message": "الحالة \"مغلقة\" تتطلب تسجيل تاريخ الإغلاق."
        },
        {
          "rule": "open_excludes_close_date",
          "message": "الحالة \"مفتوحة\" لا يجب أن يكون لها تاريخ إغلاق مسجَّل — امسح تاريخ الإغلاق أو غيّر الحالة إلى \"مغلقة\"."
        },
        {
          "rule": "close_date_not_before_base",
          "baseField": "date",
          "message": "تاريخ الإغلاق لا يمكن أن يكون قبل تاريخ المطابقة نفسه."
        }
      ]
    },
    {
      "key": "Returns",
      "name": "مطابقة المرتجعات",
      "sheet": "مطابقة المرتجعات",
      "id_prefix": "RM",
      "fields": [
        {
          "key": "date",
          "label": "التاريخ",
          "type": "date",
          "required": true
        },
        {
          "key": "branch",
          "label": "الفرع",
          "type": "list",
          "list": "Branches",
          "required": true
        },
        {
          "key": "awb",
          "label": "رقم البوليصة",
          "type": "text",
          "required": true
        },
        {
          "key": "merchant",
          "label": "المرسل / التاجر",
          "type": "text",
          "required": false
        },
        {
          "key": "customer",
          "label": "العميل",
          "type": "text",
          "required": false
        },
        {
          "key": "return_reason",
          "label": "سبب المرتجع",
          "type": "text",
          "required": false
        },
        {
          "key": "return_log_date",
          "label": "تاريخ تسجيل المرتجع",
          "type": "date",
          "required": false
        },
        {
          "key": "return_arrival_date",
          "label": "تاريخ وصول المرتجع",
          "type": "date",
          "required": false
        },
        {
          "key": "match_status",
          "label": "حالة المطابقة",
          "type": "list",
          "list": "MatchStatus",
          "required": true
        },
        {
          "key": "review_result",
          "label": "نتيجة المراجعة",
          "type": "list",
          "list": "ReviewResultStatus",
          "required": false
        },
        {
          "key": "system_status",
          "label": "حالة الشحنة بالنظام",
          "type": "text",
          "required": false
        },
        {
          "key": "actual_status",
          "label": "الحالة الفعلية",
          "type": "text",
          "required": false
        },
        {
          "key": "mismatch_reason",
          "label": "سبب عدم المطابقة",
          "type": "text",
          "required": false
        },
        {
          "key": "owner",
          "label": "مسؤول المتابعة",
          "type": "list",
          "list": "Users",
          "required": false
        },
        {
          "key": "status",
          "label": "حالة الإغلاق",
          "type": "list",
          "list": "FollowupStatus",
          "required": false
        },
        {
          "key": "close_date",
          "label": "تاريخ الإغلاق",
          "type": "date",
          "required": false
        },
        {
          "key": "notes",
          "label": "ملاحظات",
          "type": "text",
          "required": false
        }
      ],
      "computed": [],
      "filters": {
        "date": "date",
        "branch": [
          "branch"
        ],
        "auditor": null,
        "owner": [
          "owner"
        ],
        "status": [
          "status",
          "match_status"
        ],
        "priority": null
      },
      "validation_rules": [
        {
          "rule": "closed_requires_close_date",
          "message": "الحالة \"مغلقة\" تتطلب تسجيل تاريخ الإغلاق."
        },
        {
          "rule": "open_excludes_close_date",
          "message": "الحالة \"مفتوحة\" لا يجب أن يكون لها تاريخ إغلاق مسجَّل — امسح تاريخ الإغلاق أو غيّر الحالة إلى \"مغلقة\"."
        },
        {
          "rule": "close_date_not_before_base",
          "baseField": "date",
          "message": "تاريخ الإغلاق لا يمكن أن يكون قبل تاريخ السجل نفسه."
        }
      ]
    },
    {
      "key": "Scrub",
      "name": "مسح الحالات",
      "sheet": "مسح الحالات",
      "id_prefix": "SC",
      "fields": [
        {
          "key": "date",
          "label": "التاريخ",
          "type": "date",
          "required": true
        },
        {
          "key": "time",
          "label": "وقت العملية",
          "type": "time",
          "required": false
        },
        {
          "key": "awb",
          "label": "رقم البوليصة",
          "type": "text",
          "required": true
        },
        {
          "key": "branch",
          "label": "الفرع",
          "type": "list",
          "list": "Branches",
          "required": true
        },
        {
          "key": "user",
          "label": "المستخدم",
          "type": "list",
          "list": "Users",
          "required": true
        },
        {
          "key": "status_before",
          "label": "الحالة قبل التعديل",
          "type": "text",
          "required": false
        },
        {
          "key": "status_after",
          "label": "الحالة بعد التعديل",
          "type": "text",
          "required": false
        },
        {
          "key": "op_type",
          "label": "نوع العملية",
          "type": "list",
          "list_inline": [
            "مسح",
            "تعديل"
          ],
          "required": false
        },
        {
          "key": "reason",
          "label": "سبب المسح أو التعديل",
          "type": "text",
          "required": false
        },
        {
          "key": "has_approval",
          "label": "هل توجد موافقة؟",
          "type": "list",
          "list": "YesNo",
          "required": true
        },
        {
          "key": "approval_ref",
          "label": "مرجع الموافقة",
          "type": "text",
          "required": false
        },
        {
          "key": "review_result",
          "label": "نتيجة المراجعة",
          "type": "list",
          "list": "ReviewResultStatus",
          "required": false
        },
        {
          "key": "violation_type",
          "label": "تصنيف المخالفة",
          "type": "list",
          "list": "ViolationTypes",
          "required": false
        },
        {
          "key": "required_action",
          "label": "الإجراء المطلوب",
          "type": "text",
          "required": false
        },
        {
          "key": "owner",
          "label": "المسؤول عن المتابعة",
          "type": "list",
          "list": "Users",
          "required": false
        },
        {
          "key": "status",
          "label": "حالة المتابعة",
          "type": "list",
          "list": "FollowupStatus",
          "required": false
        },
        {
          "key": "close_date",
          "label": "تاريخ الإغلاق",
          "type": "date",
          "required": false
        },
        {
          "key": "notes",
          "label": "ملاحظات",
          "type": "text",
          "required": false
        }
      ],
      "computed": [],
      "filters": {
        "date": "date",
        "branch": [
          "branch"
        ],
        "auditor": "user",
        "owner": [
          "owner"
        ],
        "status": [
          "status",
          "review_result"
        ],
        "priority": null
      },
      "validation_rules": [
        {
          "rule": "closed_requires_close_date",
          "message": "الحالة \"مغلقة\" تتطلب تسجيل تاريخ الإغلاق."
        },
        {
          "rule": "open_excludes_close_date",
          "message": "الحالة \"مفتوحة\" لا يجب أن يكون لها تاريخ إغلاق مسجَّل — امسح تاريخ الإغلاق أو غيّر الحالة إلى \"مغلقة\"."
        },
        {
          "rule": "close_date_not_before_base",
          "baseField": "date",
          "message": "تاريخ الإغلاق لا يمكن أن يكون قبل تاريخ السجل نفسه."
        }
      ]
    },
    {
      "key": "Transfer",
      "name": "التحويلات",
      "sheet": "التحويلات",
      "id_prefix": "TR",
      "fields": [
        {
          "key": "date",
          "label": "تاريخ التحويل",
          "type": "date",
          "required": true
        },
        {
          "key": "transfer_no",
          "label": "رقم التحويل",
          "type": "text",
          "required": true
        },
        {
          "key": "awb",
          "label": "رقم البوليصة",
          "type": "text",
          "required": false
        },
        {
          "key": "from_branch",
          "label": "الفرع المحول",
          "type": "list",
          "list": "Branches",
          "required": true
        },
        {
          "key": "to_branch",
          "label": "الفرع المستلم",
          "type": "list",
          "list": "Branches",
          "required": true
        },
        {
          "key": "owner",
          "label": "مسؤول التحويل",
          "type": "list",
          "list": "Users",
          "required": false
        },
        {
          "key": "send_dt",
          "label": "تاريخ ووقت الإرسال",
          "type": "datetime",
          "required": false
        },
        {
          "key": "receive_dt",
          "label": "تاريخ ووقت الاستلام",
          "type": "datetime",
          "required": false
        },
        {
          "key": "status",
          "label": "حالة التحويل",
          "type": "list",
          "list": "TransferStatus",
          "required": true
        },
        {
          "key": "confirmed",
          "label": "هل تم التأكيد؟",
          "type": "list",
          "list": "YesNo",
          "required": false
        },
        {
          "key": "confirm_method",
          "label": "وسيلة التأكيد",
          "type": "text",
          "required": false
        },
        {
          "key": "confirm_time",
          "label": "وقت التأكيد",
          "type": "time",
          "required": false
        },
        {
          "key": "has_issue",
          "label": "وجود مشكلة",
          "type": "list",
          "list": "YesNo",
          "required": false
        },
        {
          "key": "issue_type",
          "label": "نوع المشكلة",
          "type": "list",
          "list": "IssueTypes",
          "required": false
        },
        {
          "key": "issue_owner",
          "label": "المسؤول عن المتابعة",
          "type": "list",
          "list": "Users",
          "required": false
        },
        {
          "key": "close_status",
          "label": "حالة الإغلاق",
          "type": "list",
          "list": "FollowupStatus",
          "required": false
        },
        {
          "key": "notes",
          "label": "ملاحظات",
          "type": "text",
          "required": false
        }
      ],
      "computed": [
        {
          "key": "duration_to_receive_hrs",
          "label": "مدة الوصول (ساعة)",
          "formula": "duration_hours(receive_dt, send_dt)"
        },
        {
          "key": "confirm_duration_hrs",
          "label": "مدة تأكيد التحويل (ساعة)",
          "formula": "confirm_duration_hours"
        },
        {
          "key": "sla_status",
          "label": "حالة الالتزام الزمني بالتأكيد (محسوبة)",
          "formula": "transfer_sla"
        }
      ],
      "validation_rules": [
        {
          "rule": "receive_after_send",
          "message": "وقت الاستلام لا يمكن أن يسبق وقت الإرسال لنفس السطر"
        }
      ],
      "filters": {
        "date": "date",
        "branch": [
          "from_branch",
          "to_branch"
        ],
        "auditor": null,
        "owner": [
          "owner",
          "issue_owner"
        ],
        "status": [
          "status",
          "close_status"
        ],
        "priority": null
      }
    },
    {
      "key": "Issues",
      "name": "المشاكل اليومية",
      "sheet": "المشاكل اليومية",
      "id_prefix": "DI",
      "fields": [
        {
          "key": "detect_date",
          "label": "تاريخ الاكتشاف",
          "type": "date",
          "required": true
        },
        {
          "key": "detect_time",
          "label": "وقت الاكتشاف",
          "type": "time",
          "required": false
        },
        {
          "key": "branch",
          "label": "الفرع",
          "type": "list",
          "list": "Branches",
          "required": true
        },
        {
          "key": "department",
          "label": "القسم",
          "type": "text",
          "required": false
        },
        {
          "key": "source",
          "label": "مصدر اكتشاف المشكلة",
          "type": "text",
          "required": false
        },
        {
          "key": "issue_type",
          "label": "نوع المشكلة",
          "type": "list",
          "list": "IssueTypes",
          "required": true
        },
        {
          "key": "description",
          "label": "وصف المشكلة",
          "type": "text",
          "required": true
        },
        {
          "key": "awb",
          "label": "رقم البوليصة إن وجد",
          "type": "text",
          "required": false
        },
        {
          "key": "affected_count",
          "label": "عدد الحالات المتأثرة",
          "type": "number",
          "required": false
        },
        {
          "key": "priority",
          "label": "درجة الأولوية",
          "type": "list",
          "list": "PriorityLevels",
          "required": true
        },
        {
          "key": "owner",
          "label": "المسؤول عن الحل",
          "type": "list",
          "list": "Users",
          "required": true
        },
        {
          "key": "required_action",
          "label": "الإجراء المطلوب",
          "type": "text",
          "required": false
        },
        {
          "key": "due_date",
          "label": "تاريخ الاستحقاق",
          "type": "date",
          "required": false
        },
        {
          "key": "status",
          "label": "حالة المشكلة",
          "type": "list",
          "list": "FollowupStatus",
          "required": true
        },
        {
          "key": "close_date",
          "label": "تاريخ الإغلاق",
          "type": "date",
          "required": false
        },
        {
          "key": "delay_reason",
          "label": "سبب التأخير",
          "type": "text",
          "required": false
        },
        {
          "key": "corrective_action",
          "label": "الإجراء التصحيحي",
          "type": "text",
          "required": false
        },
        {
          "key": "preventive_action",
          "label": "الإجراء الوقائي",
          "type": "text",
          "required": false
        },
        {
          "key": "auditor_notes",
          "label": "ملاحظات المدقق",
          "type": "text",
          "required": false
        }
      ],
      "computed": [
        {
          "key": "close_duration_days",
          "label": "مدة الإغلاق (أيام)",
          "formula": "close_duration_days"
        },
        {
          "key": "delay_alert",
          "label": "تنبيه التأخر",
          "formula": "issue_delay_alert"
        },
        {
          "key": "close_classification",
          "label": "تصنيف الإغلاق (محسوب)",
          "formula": "issue_close_classification"
        }
      ],
      "filters": {
        "date": "detect_date",
        "branch": [
          "branch"
        ],
        "auditor": null,
        "owner": [
          "owner"
        ],
        "status": [
          "status"
        ],
        "priority": "priority"
      },
      "validation_rules": [
        {
          "rule": "closed_requires_close_date",
          "message": "الحالة \"مغلقة\" تتطلب تسجيل تاريخ الإغلاق."
        },
        {
          "rule": "late_requires_delay_reason",
          "message": "الحالة \"متأخرة\" تتطلب تسجيل سبب التأخير."
        },
        {
          "rule": "open_excludes_close_date",
          "message": "الحالة \"مفتوحة\" لا يجب أن يكون لها تاريخ إغلاق مسجَّل — امسح تاريخ الإغلاق أو غيّر الحالة إلى \"مغلقة\"."
        },
        {
          "rule": "close_date_not_before_base",
          "baseField": "detect_date",
          "message": "تاريخ الإغلاق لا يمكن أن يكون قبل تاريخ رصد المشكلة."
        }
      ]
    },
    {
      "key": "Penalty",
      "name": "الجزاءات",
      "sheet": "الجزاءات",
      "id_prefix": "PN",
      "fields": [
        {
          "key": "log_date",
          "label": "تاريخ تسجيل المخالفة",
          "type": "date",
          "required": true
        },
        {
          "key": "approve_date",
          "label": "تاريخ اعتماد الجزاء",
          "type": "date",
          "required": false
        },
        {
          "key": "branch",
          "label": "الفرع",
          "type": "list",
          "list": "Branches",
          "required": true
        },
        {
          "key": "employee",
          "label": "اسم الموظف",
          "type": "text",
          "required": true
        },
        {
          "key": "employee_id",
          "label": "الرقم الوظيفي إن وجد",
          "type": "text",
          "required": false
        },
        {
          "key": "violation_type",
          "label": "نوع المخالفة",
          "type": "list",
          "list": "ViolationTypes",
          "required": true
        },
        {
          "key": "description",
          "label": "وصف المخالفة",
          "type": "text",
          "required": false
        },
        {
          "key": "ref",
          "label": "مرجع المشكلة أو البوليصة",
          "type": "text",
          "required": false
        },
        {
          "key": "severity",
          "label": "درجة المخالفة",
          "type": "list",
          "list": "PriorityLevels",
          "required": false
        },
        {
          "key": "reviewed",
          "label": "هل تمت المراجعة؟",
          "type": "list",
          "list": "YesNo",
          "required": true
        },
        {
          "key": "review_decision",
          "label": "قرار المراجعة",
          "type": "list",
          "list": "ReviewResultStatus",
          "required": false
        },
        {
          "key": "penalty_type",
          "label": "نوع الجزاء المعتمد",
          "type": "list",
          "list": "PenaltyTypes",
          "required": false
        },
        {
          "key": "penalty_value",
          "label": "قيمة الجزاء",
          "type": "number",
          "required": false
        },
        {
          "key": "approver",
          "label": "جهة الاعتماد",
          "type": "text",
          "required": false
        },
        {
          "key": "status",
          "label": "حالة الجزاء",
          "type": "list",
          "list": "PenaltyCaseStatus",
          "required": true
        },
        {
          "key": "execute_date",
          "label": "تاريخ التنفيذ",
          "type": "date",
          "required": false
        },
        {
          "key": "appeal_status",
          "label": "حالة التظلم إن وجد",
          "type": "text",
          "required": false
        },
        {
          "key": "notes",
          "label": "ملاحظات",
          "type": "text",
          "required": false
        }
      ],
      "computed": [
        {
          "key": "approved_value",
          "label": "القيمة المعتمدة (محسوبة)",
          "formula": "approved_value"
        },
        {
          "key": "executed_value",
          "label": "القيمة المنفذة فعليًا (محسوبة)",
          "formula": "executed_value"
        }
      ],
      "validation_rules": [
        {
          "rule": "no_approve_before_review",
          "message": "لا يمكن اعتماد أو تنفيذ جزاء قبل اكتمال المراجعة (هل تمت المراجعة؟ = نعم)"
        },
        {
          "rule": "executed_requires_execute_date",
          "message": "حالة الجزاء \"منفذة\" تتطلب تسجيل تاريخ التنفيذ."
        }
      ],
      "filters": {
        "date": "log_date",
        "branch": [
          "branch"
        ],
        "auditor": null,
        "owner": [
          "approver"
        ],
        "status": [
          "status",
          "review_decision"
        ],
        "priority": "severity"
      }
    },
    {
      "key": "Overdue",
      "name": "الحالات المتأخرة",
      "sheet": "الحالات المتأخرة",
      "id_prefix": "DC",
      "fields": [
        {
          "key": "detect_date",
          "label": "تاريخ الرصد",
          "type": "date",
          "required": true
        },
        {
          "key": "awb",
          "label": "رقم البوليصة",
          "type": "text",
          "required": true
        },
        {
          "key": "branch",
          "label": "الفرع",
          "type": "list",
          "list": "Branches",
          "required": true
        },
        {
          "key": "governorate",
          "label": "المحافظة / المنطقة",
          "type": "list",
          "list": "Governorates",
          "required": false
        },
        {
          "key": "sender",
          "label": "المرسل",
          "type": "text",
          "required": false
        },
        {
          "key": "shipment_status",
          "label": "حالة الشحنة",
          "type": "text",
          "required": false
        },
        {
          "key": "created_date",
          "label": "تاريخ إنشاء الطلب",
          "type": "date",
          "required": true
        },
        {
          "key": "delay_reason",
          "label": "سبب التأخير",
          "type": "text",
          "required": false
        },
        {
          "key": "owner",
          "label": "المسؤول عن المتابعة",
          "type": "list",
          "list": "Users",
          "required": false
        },
        {
          "key": "required_action",
          "label": "الإجراء المطلوب",
          "type": "text",
          "required": false
        },
        {
          "key": "status",
          "label": "حالة الإجراء",
          "type": "list",
          "list": "FollowupStatus",
          "required": false
        },
        {
          "key": "close_date",
          "label": "تاريخ الإغلاق",
          "type": "date",
          "required": false
        },
        {
          "key": "notes",
          "label": "ملاحظات",
          "type": "text",
          "required": false
        }
      ],
      "computed": [
        {
          "key": "age_days",
          "label": "عمر الطلب بالأيام (من تاريخ إنشاء الطلب)",
          "formula": "age_days"
        },
        {
          "key": "case_age_days",
          "label": "عمر الحالة بالأيام (من تاريخ الرصد)",
          "formula": "case_age_days"
        },
        {
          "key": "days_since_update",
          "label": "مدة عدم التحديث بالأيام",
          "formula": "days_since_update"
        },
        {
          "key": "target_age",
          "label": "الحد المستهدف (من الإعدادات)",
          "formula": "target_CaseAgeDays"
        },
        {
          "key": "overdue_days",
          "label": "عدد أيام التجاوز بعد الاستحقاق",
          "formula": "overdue_days"
        },
        {
          "key": "delay_class",
          "label": "تصنيف التأخير",
          "formula": "delay_classification"
        }
      ],
      "filters": {
        "date": "detect_date",
        "branch": [
          "branch"
        ],
        "auditor": null,
        "owner": [
          "owner"
        ],
        "status": [
          "status",
          "delay_class"
        ],
        "priority": null
      },
      "validation_rules": [
        {
          "rule": "closed_requires_close_date",
          "message": "الحالة \"مغلقة\" تتطلب تسجيل تاريخ الإغلاق."
        },
        {
          "rule": "open_excludes_close_date",
          "message": "الحالة \"مفتوحة\" لا يجب أن يكون لها تاريخ إغلاق مسجَّل — امسح تاريخ الإغلاق أو غيّر الحالة إلى \"مغلقة\"."
        },
        {
          "rule": "close_date_not_before_base",
          "baseField": "detect_date",
          "message": "تاريخ الإغلاق لا يمكن أن يكون قبل تاريخ رصد الحالة."
        }
      ]
    }
  ],
  "lists": {
    "Branches": [
      "القاهرة الجديدة",
      "مدينة نصر",
      "المعادي",
      "6 أكتوبر",
      "الشيخ زايد",
      "الإسكندرية - سموحة",
      "الإسكندرية - محرم بك",
      "المنصورة",
      "طنطا",
      "الزقازيق",
      "أسيوط",
      "المنيا",
      "بني سويف",
      "الفيوم",
      "دمياط"
    ],
    "Governorates": [
      "القاهرة",
      "الجيزة",
      "الإسكندرية",
      "الدقهلية",
      "الغربية",
      "الشرقية",
      "أسيوط",
      "المنيا",
      "بني سويف",
      "الفيوم",
      "دمياط"
    ],
    "Auditors": [
      "أحمد سالم",
      "منى عبد الله",
      "كريم فتحي",
      "هبة الشريف",
      "محمد سعيد"
    ],
    "Users": [
      "أحمد سالم",
      "منى عبد الله",
      "كريم فتحي",
      "هبة الشريف",
      "محمد سعيد",
      "مسؤول الفرع",
      "مسؤول الوردية"
    ],
    "IssueTypes": [
      "خطأ في البيانات",
      "شحنة مفقودة",
      "تأخير تسليم",
      "سوء تعامل مع العميل",
      "خلل في النظام",
      "مخالفة إجراء",
      "أخرى"
    ],
    "FollowupStatus": [
      "مفتوحة",
      "قيد المتابعة",
      "مغلقة",
      "متأخرة"
    ],
    "PriorityLevels": [
      "منخفضة",
      "متوسطة",
      "عالية",
      "حرجة"
    ],
    "ViolationTypes": [
      "تعديل حالة بدون صلاحية",
      "عدم اتباع إجراء",
      "تأخير غير مبرر",
      "خطأ متكرر",
      "تلاعب في البيانات",
      "أخرى"
    ],
    "TransferStatus": [
      "تم الإرسال",
      "تم الاستلام",
      "تم التأكيد",
      "متأخر",
      "به مشكلة",
      "مغلق"
    ],
    "PenaltyTypes": [
      "تنبيه شفهي",
      "إنذار كتابي",
      "خصم مالي",
      "إيقاف عن العمل",
      "إنهاء خدمة"
    ],
    "YesNo": [
      "نعم",
      "لا"
    ],
    "MatchStatus": [
      "مطابق",
      "غير مطابق"
    ],
    "ReviewResultStatus": [
      "قيد المراجعة",
      "مصرح به",
      "مخالفة مؤكدة"
    ],
    "PenaltyCaseStatus": [
      "مسجلة",
      "قيد المراجعة",
      "معتمدة",
      "منفذة",
      "متظلم عليها"
    ]
  },
  "targets": {
    "target_MorningMatchPct": 98,
    "target_ReturnsMatchPct": 97,
    "target_TransferConfirmHrs": 24,
    "target_IssueCloseDays": 3,
    "target_CaseAgeDays": 5
  },
  "age_buckets": [
    [
      0,
      5,
      "0–5 أيام"
    ],
    [
      6,
      10,
      "6–10 أيام"
    ],
    [
      11,
      15,
      "11–15 يومًا"
    ],
    [
      16,
      20,
      "16–20 يومًا"
    ],
    [
      21,
      99999,
      "أكثر من 20 يومًا"
    ]
  ],
  "system_columns": [
    {
      "key": "record_id",
      "label": "رقم السجل"
    },
    {
      "key": "entry_date",
      "label": "تاريخ الإدخال"
    },
    {
      "key": "entry_time",
      "label": "وقت الإدخال"
    },
    {
      "key": "entered_by",
      "label": "المستخدم (مُدخل السجل)"
    },
    {
      "key": "last_modified",
      "label": "آخر تعديل"
    },
    {
      "key": "modified_by",
      "label": "المستخدم المعدّل"
    }
  ]
};
/* ===================================================================
 * ARRIVE Audit Control Tower — Backend (Google Apps Script)
 * Bound to the Google Sheet that holds the 7 activity tables + الإعدادات + _Sequence.
 *
 * API (action names match the Dashboard exactly — keep both in sync):
 *   GET  ?action=bootstrap                          -> lists + targets + control-type field defs
 *   GET  ?action=settings                           -> lists + targets only (same data, narrower endpoint)
 *   GET  ?action=kpis&<filters>                      -> computed KPIs, filtered
 *   GET  ?action=search&<filters>&page=&pageSize=    -> paginated record search
 *   GET  ?action=getRecord&type=&id=                 -> single record detail
 *   GET  ?action=reports&<filters>&comparePrev=1     -> management reports (+ optional prior-period comparison)
 *   POST {action:"save", type, data, user, clientRequestId}
 *   POST {action:"update", type, id, data, user, expectedValues?}
 *
 * <filters> (all optional, applied consistently across kpis/search/reports):
 *   dateFrom, dateTo (yyyy-MM-dd), branch, type, auditor, owner, status, priority
 *
 * Every response is one of:
 *   {ok:true,  ...}                       on real success only (never ok:true unless the write actually happened)
 *   {ok:false, error:"..."} or {errors:[...]}   on failure, with a message safe to show an end user
 * =================================================================== */

var SYS = { RECORD_ID: 0, ENTRY_DATE: 1, ENTRY_TIME: 2, ENTERED_BY: 3, LAST_MOD: 4, MOD_BY: 5 };

function _ss() { return SpreadsheetApp.getActiveSpreadsheet(); }

function _ctByKey(key) {
  return SCHEMA.control_types.find(function (c) { return c.key === key; });
}

function _allColumns(ct) {
  var sys = SCHEMA.system_columns;
  return [sys[0], sys[1], sys[2], sys[3]]
    .concat(ct.fields)
    .concat(ct.computed || [])
    .concat([sys[4], sys[5]]);
}

function _sheetOrNull(name) { return _ss().getSheetByName(name); }
function _sheet(name) {
  var sh = _sheetOrNull(name);
  if (!sh) throw new Error("تعذّر الوصول إلى الشيت \"" + name + "\" — تأكد أنه لم يُحذف أو يُعاد تسميته.");
  return sh;
}

function _headerIndexMap(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) throw new Error("الشيت \"" + sheet.getName() + "\" لا يحتوي على أعمدة (Headers) — لا يمكن القراءة أو الكتابة.");
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = {};
  headers.forEach(function (h, i) { if (h !== "") map[h] = i; });
  return map;
}

/** Reads only the rows that actually exist (getLastRow), never a fixed range — supports unlimited growth. */
function _readAllRows(ct) {
  var sheet = _sheet(ct.sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { headers: sheet.getLastColumn() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [], rows: [] };
  var lastCol = sheet.getLastColumn();
  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0];
  var idIdx = headers.indexOf(SCHEMA.system_columns[SYS.RECORD_ID].label);
  var rows = values.slice(1).filter(function (r) { return idIdx === -1 || r[idIdx] !== ""; });
  return { headers: headers, rows: rows };
}

/* ---------------- Settings lists / targets (read from الإعدادات) ---------------- */
function _readSettings() {
  var sh = _sheet("الإعدادات");
  var values = sh.getDataRange().getValues();
  var lists = {}, targets = {}, ageBuckets = [];
  var section = "lists";
  for (var r = 1; r < values.length; r++) {
    var a = values[r][0], b = values[r][1], c = values[r][2];
    if (a === "الأهداف الرقابية") { section = "targets"; continue; }
    if (a === "فئات عمر الحالات المتأخرة") { section = "buckets"; continue; }
    if (a === "من" && b === "إلى") continue;
    if (!a) continue;
    if (section === "lists") {
      lists[a] = lists[a] || [];
      if (b !== "" && b !== undefined) lists[a].push(b);
    } else if (section === "targets") {
      targets[a] = b;
    } else if (section === "buckets") {
      ageBuckets.push({ from: a, to: b, label: c });
    }
  }
  return { lists: lists, targets: targets, ageBuckets: ageBuckets };
}

/* ---------------- ID generation (race-safe via LockService + _Sequence) ---------------- */
function _nextId(ctKey, prefix) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = _sheet("_Sequence");
    var values = sh.getDataRange().getValues();
    var rowIdx = -1;
    for (var i = 1; i < values.length; i++) if (values[i][0] === ctKey) { rowIdx = i + 1; break; }
    if (rowIdx === -1) throw new Error("لا يوجد عداد أرقام مسجَّل لنوع الرقابة: " + ctKey);
    var next = (sh.getRange(rowIdx, 2).getValue() || 0) + 1;
    sh.getRange(rowIdx, 2).setValue(next);
    return prefix + "-" + ("000000" + next).slice(-6);
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- Idempotency (prevents duplicate saves from double-clicks / retries) ---------------- */
function _dedupCheck(clientRequestId) {
  if (!clientRequestId) return null; // dashboard always sends one; a direct API caller that omits it loses this protection
  var cache = CacheService.getScriptCache();
  var existing = cache.get("req_" + clientRequestId);
  return existing ? JSON.parse(existing) : null;
}
function _dedupStore(clientRequestId, result) {
  if (!clientRequestId) return;
  CacheService.getScriptCache().put("req_" + clientRequestId, JSON.stringify(result), 21600); // 6h
}

/* ---------------- Validation ---------------- */
function _isValidDate(v) { var d = new Date(v); return v && !isNaN(d.getTime()); }

/* Morning matching reconciliation: "شحنات مطابقة/غير مطابقة/لم يتم العثور عليها/بها أخطاء" are treated as
 * mutually exclusive buckets that must partition "إجمالي الشحنات" exactly (this was already the intent
 * baked into the pre-existing count_check_morning computed field — we're now enforcing it, not inventing it).
 * Shared by _validate (to block the save) and _computeFields (to show the actual sum/diff), so there is
 * exactly one place that defines "the sum" — never two competing implementations. */
function _morningCounts(data) {
  var total = Number(data.total_shipments) || 0;
  var sum = (Number(data.matched_shipments) || 0) + (Number(data.unmatched_shipments) || 0) +
            (Number(data.not_found_shipments) || 0) + (Number(data.error_shipments) || 0);
  return { total: total, sum: sum, diff: total - sum };
}

function _validate(ct, data) {
  var errors = [];

  ct.fields.forEach(function (f) {
    var v = data[f.key];
    if (f.required && (v === undefined || v === null || v === "")) {
      errors.push("الحقل \"" + f.label + "\" إلزامي.");
      return;
    }
    if (v === undefined || v === null || v === "") return;
    if ((f.type === "date" || f.type === "datetime") && !_isValidDate(v)) {
      errors.push("قيمة \"" + f.label + "\" ليست تاريخًا صحيحًا.");
    }
    if (f.type === "number" && isNaN(Number(v))) {
      errors.push("قيمة \"" + f.label + "\" يجب أن تكون رقمًا.");
    }
    if (f.type === "list" && f.list) {
      var allowed = (data.__lists && data.__lists[f.list]) || null;
      if (allowed && allowed.indexOf(v) === -1) {
        errors.push("قيمة \"" + f.label + "\" (" + v + ") غير موجودة في القائمة المعتمدة.");
      }
    }
    if (f.type === "list_inline" && f.list_inline && f.list_inline.indexOf(v) === -1) {
      errors.push("قيمة \"" + f.label + "\" غير مسموحة.");
    }
  });

  (ct.validation_rules || []).forEach(function (rule) {
    switch (rule.rule) {
      case "receive_after_send":
        if (data.send_dt && data.receive_dt && new Date(data.receive_dt) < new Date(data.send_dt)) errors.push(rule.message);
        break;
      case "no_approve_before_review":
        if ((data.status === "معتمدة" || data.status === "منفذة") && data.reviewed !== "نعم") errors.push(rule.message);
        break;
      case "closed_requires_close_date":
        if (data.status === "مغلقة" && !data.close_date) errors.push(rule.message);
        break;
      case "late_requires_delay_reason":
        if (data.status === "متأخرة" && !data.delay_reason) errors.push(rule.message);
        break;
      case "executed_requires_execute_date":
        if (data.status === "منفذة" && !data.execute_date) errors.push(rule.message);
        break;
      case "morning_count_reconciliation": {
        // Only checked once total is actually a number and non-empty — an empty/zero total is its own
        // separate concern (handled by the "required" check and the percentage's own zero-guard).
        if (data.total_shipments !== "" && data.total_shipments != null && !isNaN(Number(data.total_shipments))) {
          var mc = _morningCounts(data);
          if (mc.total > 0 && mc.diff !== 0) {
            errors.push(rule.message + " (الإجمالي المُدخل: " + mc.total + "، مجموع الفئات الأربع: " + mc.sum +
              "، الفرق: " + mc.diff + ")");
          }
        }
        break;
      }
      case "open_excludes_close_date":
        if (data.status === "مفتوحة" && data.close_date) errors.push(rule.message);
        break;
      case "close_date_not_before_base":
        if (data.close_date && data[rule.baseField] && _isValidDate(data.close_date) && _isValidDate(data[rule.baseField]) &&
            new Date(data.close_date) < new Date(data[rule.baseField])) {
          errors.push(rule.message);
        }
        break;
    }
  });
  return errors;
}

/* ---------------- Computed fields (server-side; single source of truth per metric) ---------------- */
function _computeFields(ct, data, settings) {
  var out = {};
  (ct.computed || []).forEach(function (c) {
    switch (c.formula) {
      case "count_check_morning": {
        if (data.total_shipments === "" || data.total_shipments == null) { out[c.key] = ""; break; }
        out[c.key] = (_morningCounts(data).diff === 0) ? "سليم" : "غير متطابق";
        break;
      }
      case "morning_count_diff": {
        if (data.total_shipments === "" || data.total_shipments == null) { out[c.key] = ""; break; }
        out[c.key] = _morningCounts(data).diff;
        break;
      }
      case "matched_shipments/total_shipments": {
        // Divide-by-zero guard: an empty/zero total yields "" (never NaN or Infinity), never a hardcoded 0.
        var t = Number(data.total_shipments);
        out[c.key] = (!t) ? "" : Number(data.matched_shipments) / t; // stored as a fraction (0.2) — the
        // sheet cell gets an explicit 0.0% number format (see _applyComputedFormats) so it DISPLAYS as
        // "20.0%" while the underlying value stays a normal number Sheets/Apps Script can compute with.
        break;
      }
      case "duration_hours(receive_dt, send_dt)":
        out[c.key] = (data.send_dt && data.receive_dt) ? (new Date(data.receive_dt) - new Date(data.send_dt)) / 3600000 : "";
        break;
      case "confirm_duration_hours": {
        // confirm_time has no date of its own: assume same calendar day as send_dt (or next day if the
        // clock time is earlier than send's clock time, i.e. confirmation happened after midnight).
        if (data.send_dt && data.confirm_time) {
          var sendDt = new Date(data.send_dt);
          var confParts = String(data.confirm_time).split(":");
          var confDt = new Date(sendDt.getFullYear(), sendDt.getMonth(), sendDt.getDate(),
            Number(confParts[0]) || 0, Number(confParts[1]) || 0, Number(confParts[2]) || 0);
          if (confDt < sendDt) confDt.setDate(confDt.getDate() + 1);
          out[c.key] = (confDt - sendDt) / 3600000;
        } else out[c.key] = "";
        break;
      }
      case "transfer_sla": {
        var dur = out["confirm_duration_hrs"];
        var target = settings.targets["target_TransferConfirmHrs"];
        out[c.key] = (dur === "" || dur === undefined) ? "" :
          (dur <= target ? "✓ ضمن الهدف (محسوب على مدة التأكيد)" : "✗ متجاوز (محسوب على مدة التأكيد)");
        break;
      }
      case "close_duration_days":
        out[c.key] = (data.status === "مغلقة" && data.close_date && data.detect_date)
          ? Math.round((new Date(data.close_date) - new Date(data.detect_date)) / 86400000) : "";
        break;
      case "issue_delay_alert":
        out[c.key] = (data.status !== "مغلقة" && data.due_date)
          ? (new Date() > new Date(data.due_date) ? "متأخر" : "ضمن الموعد") : "";
        break;
      case "issue_close_classification":
        if (data.status === "مغلقة") {
          out[c.key] = (data.close_date && data.due_date)
            ? (new Date(data.close_date) <= new Date(data.due_date) ? "مغلقة في الموعد" : "مغلقة بعد الموعد")
            : "مغلقة (تاريخ استحقاق غير مسجل)";
        } else {
          out[c.key] = (out["delay_alert"] === "متأخر") ? "مفتوحة ومتأخرة" : "مفتوحة ضمن الموعد";
        }
        break;
      case "approved_value":
        out[c.key] = (data.status === "معتمدة" || data.status === "منفذة") ? (Number(data.penalty_value) || 0) : "";
        break;
      case "executed_value":
        out[c.key] = (data.status === "منفذة") ? (Number(data.penalty_value) || 0) : "";
        break;
      case "age_days": // عمر الطلب: من تاريخ إنشاء الطلب
        out[c.key] = data.created_date ? Math.round((new Date() - new Date(data.created_date)) / 86400000) : "";
        break;
      case "case_age_days": // عمر الحالة: من تاريخ رصدها في هذا النظام (مختلف عن عمر الطلب نفسه)
        out[c.key] = data.detect_date ? Math.round((new Date() - new Date(data.detect_date)) / 86400000) : "";
        break;
      case "days_since_update": // منفصل عن عمر الطلب/الحالة: منذ آخر مرة عُدِّل فيها هذا السجل تحديدًا
        out[c.key] = data.__lastModified ? Math.round((new Date() - new Date(data.__lastModified)) / 86400000)
                    : (data.__entryDate ? Math.round((new Date() - new Date(data.__entryDate)) / 86400000) : "");
        break;
      case "target_CaseAgeDays":
        out[c.key] = settings.targets["target_CaseAgeDays"];
        break;
      case "overdue_days": { // التأخير بعد الاستحقاق فقط — لا يُخلط بعمر الطلب نفسه
        var age = out["age_days"], tgt = settings.targets["target_CaseAgeDays"];
        out[c.key] = (age === "" || age === undefined) ? "" : Math.max(0, age - tgt);
        break;
      }
      case "delay_classification": {
        var od = out["overdue_days"];
        if (od === "" || od === undefined) { out[c.key] = ""; break; }
        var bucket = settings.ageBuckets.find(function (bk) { return od >= bk.from && od <= bk.to; });
        out[c.key] = bucket ? bucket.label : "";
        break;
      }
      default:
        out[c.key] = "";
    }
  });
  return out;
}

/* ---------------- doGet / doPost ---------------- */
function doGet(e) {
  return _respond(function () {
    var action = (e.parameter.action || "bootstrap");
    switch (action) {
      case "bootstrap": return _actionBootstrap();
      case "settings": return _actionSettings();
      case "kpis": return _actionKpis(e.parameter);
      case "search": return _actionSearch(e.parameter);
      case "getRecord": return _actionGetRecord(e.parameter);
      case "reports": return _actionReports(e.parameter);
      default: return { ok: false, error: "إجراء غير معروف (" + action + ") — لم يُنفَّذ أي شيء." };
    }
  });
}

function doPost(e) {
  return _respond(function () {
    var body;
    try { body = JSON.parse(e.postData.contents); }
    catch (err) { return { ok: false, error: "تعذّر قراءة بيانات الطلب — تأكد أن الواجهة والخادم من نفس الإصدار." }; }
    switch (body.action) {
      case "save": return _actionSave(body);
      case "update": return _actionUpdate(body);
      default: return { ok: false, error: "إجراء غير معروف (" + body.action + ") — لم يُنفَّذ أي شيء." };
    }
  });
}

function _respond(fn) {
  var result;
  try { result = fn(); }
  catch (err) { result = { ok: false, error: "خطأ داخلي في الخادم: " + String(err && err.message || err) }; }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function _actionBootstrap() {
  var s = _actionSettings();
  return {
    ok: true,
    controlTypes: SCHEMA.control_types.map(function (ct) {
      // validationRules ships to the Dashboard too, so the client-side pre-submit check mirrors the
      // exact same rule set the server enforces — one rule definition, not two independently written ones.
      return { key: ct.key, name: ct.name, fields: ct.fields, filters: ct.filters, validationRules: ct.validation_rules || [] };
    }),
    lists: s.lists, targets: s.targets
  };
}

function _actionSettings() {
  var settings = _readSettings();
  return { ok: true, lists: settings.lists, targets: settings.targets, ageBuckets: settings.ageBuckets };
}

function _actionSave(body) {
  var dup = _dedupCheck(body.clientRequestId);
  if (dup) return dup; // exact same request already processed — return the original result, don't insert again

  var ct = _ctByKey(body.type);
  if (!ct) { var r = { ok: false, error: "نوع رقابة غير معروف: " + body.type }; _dedupStore(body.clientRequestId, r); return r; }
  var data = body.data || {};
  var settings = _readSettings();
  data.__lists = settings.lists;
  var errors = _validate(ct, data);
  if (errors.length) { var rE = { ok: false, errors: errors }; _dedupStore(body.clientRequestId, rE); return rE; }

  var computed = _computeFields(ct, data, settings);
  var id = _nextId(ct.key, ct.id_prefix);
  var now = new Date();
  var sheet = _sheet(ct.sheet);
  var cols = _allColumns(ct);
  var row = cols.map(function (c) {
    switch (c.key) {
      case "record_id": return id;
      case "entry_date": return Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd");
      case "entry_time": return Utilities.formatDate(now, Session.getScriptTimeZone(), "HH:mm:ss");
      case "entered_by": return body.user || "غير معروف";
      case "last_modified": return "";
      case "modified_by": return "";
      default:
        if (data.hasOwnProperty(c.key)) return data[c.key];
        if (computed.hasOwnProperty(c.key)) return computed[c.key];
        return "";
    }
  });
  sheet.appendRow(row);
  var newRowIdx = sheet.getLastRow();
  _applyComputedFormats(sheet, newRowIdx, ct);
  SpreadsheetApp.flush();
  // Read the row back to prove the write actually landed before claiming success.
  var lastRow = sheet.getLastRow();
  var verifyId = sheet.getRange(lastRow, 1).getValue();
  if (verifyId !== id) {
    var rF = { ok: false, error: "تم إرسال الحفظ لكن التحقق من وصول البيانات فشل — أعد المحاولة أو راجع الشيت يدويًا." };
    _dedupStore(body.clientRequestId, rF); return rF;
  }
  var result = {
    ok: true, recordId: id, type: ct.key, typeName: ct.name, sheet: ct.sheet,
    savedAt: Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"),
    message: "تم حفظ السجل رقم " + id + " بنجاح."
  };
  _dedupStore(body.clientRequestId, result);
  return result;
}

function _actionUpdate(body) {
  var ct = _ctByKey(body.type);
  if (!ct) return { ok: false, error: "نوع رقابة غير معروف: " + body.type };
  var sheet = _sheet(ct.sheet);
  var map = _headerIndexMap(sheet);
  var idCol = map[SCHEMA.system_columns[SYS.RECORD_ID].label];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: false, error: "لا توجد سجلات في هذا الجدول بعد." };
  var values = sheet.getRange(1, 1, lastRow, sheet.getLastColumn()).getValues();
  var rowIdx = -1;
  for (var i = 1; i < values.length; i++) if (values[i][idCol] === body.id) { rowIdx = i + 1; break; }
  if (rowIdx === -1) return { ok: false, error: "السجل غير موجود: " + body.id };

  var data = body.data || {};
  var settings = _readSettings();
  data.__lists = settings.lists;
  var errors = _validate(ct, data);
  if (errors.length) return { ok: false, errors: errors };

  var computed = _computeFields(ct, data, settings);
  var cols = _allColumns(ct);
  var lastModCol = map[SCHEMA.system_columns[SYS.LAST_MOD].label];
  var modByCol = map[SCHEMA.system_columns[SYS.MOD_BY].label];
  var skip = { record_id: 1, entry_date: 1, entry_time: 1, entered_by: 1, last_modified: 1, modified_by: 1 };

  cols.forEach(function (c, i) {
    if (skip[c.key]) return;
    var val = data.hasOwnProperty(c.key) ? data[c.key] : (computed.hasOwnProperty(c.key) ? computed[c.key] : "");
    sheet.getRange(rowIdx, i + 1).setValue(val);
  });
  sheet.getRange(rowIdx, lastModCol + 1).setValue(new Date());
  sheet.getRange(rowIdx, modByCol + 1).setValue(body.user || "غير معروف");
  _applyComputedFormats(sheet, rowIdx, ct);
  SpreadsheetApp.flush();
  return { ok: true, recordId: body.id, message: "تم تعديل السجل رقم " + body.id + " بنجاح." };
}

function _actionGetRecord(p) {
  var ct = _ctByKey(p.type);
  if (!ct) return { ok: false, error: "نوع رقابة غير معروف" };
  var d = _readAllRows(ct);
  var idIdx = d.headers.indexOf(SCHEMA.system_columns[SYS.RECORD_ID].label);
  for (var i = 0; i < d.rows.length; i++) {
    if (d.rows[i][idIdx] === p.id) {
      var rec = {};
      d.headers.forEach(function (h, j) { rec[h] = d.rows[i][j]; });
      return { ok: true, record: _formatRecordForClient(ct, rec) };
    }
  }
  return { ok: false, error: "السجل غير موجود: " + p.id };
}

/* ---------------- Unified filter engine (kpis / search / reports all use this) ---------------- */
function _rowMatchesFilters(ct, headers, row, colIdx, p) {
  function val(key) { var i = colIdx[key]; return i === undefined ? undefined : row[i]; }
  var filt = ct.filters || {};

  if (p.dateFrom || p.dateTo) {
    var dateKey = filt.date;
    var raw = dateKey && val(_fieldLabel(ct, dateKey));
    if (raw) {
      var d = new Date(raw);
      if (p.dateFrom && d < new Date(p.dateFrom)) return false;
      if (p.dateTo && d > new Date(p.dateTo + "T23:59:59")) return false;
    } else if (p.dateFrom || p.dateTo) {
      return false; // no date on this record but a date filter was requested
    }
  }
  if (p.branch && filt.branch && filt.branch.length) {
    var branchOk = filt.branch.some(function (k) { return val(_fieldLabel(ct, k)) === p.branch; });
    if (!branchOk) return false;
  }
  if (p.auditor && filt.auditor) {
    if (val(_fieldLabel(ct, filt.auditor)) !== p.auditor) return false;
  }
  if (p.owner && filt.owner && filt.owner.length) {
    var ownerOk = filt.owner.some(function (k) { return val(_fieldLabel(ct, k)) === p.owner; });
    if (!ownerOk) return false;
  }
  if (p.status && filt.status && filt.status.length) {
    var statusOk = filt.status.some(function (k) { return val(_fieldLabel(ct, k)) === p.status; });
    if (!statusOk) return false;
  }
  if (p.priority && filt.priority) {
    if (val(_fieldLabel(ct, filt.priority)) !== p.priority) return false;
  }
  return true;
}

function _fieldLabelCache() { return {}; }
var _labelCache = {};
function _fieldLabel(ct, key) {
  var cacheKey = ct.key + "." + key;
  if (_labelCache[cacheKey]) return _labelCache[cacheKey];
  var all = _allColumns(ct);
  var f = all.find(function (c) { return c.key === key; });
  var label = f ? f.label : key;
  _labelCache[cacheKey] = label;
  return label;
}

/* Applies a real Sheets number format (not just a stored value) to any computed column whose schema
 * entry declares one — e.g. match_pct is stored as the fraction 0.2 but displayed as "20.0%" in the
 * spreadsheet itself, not just in the Dashboard. Called once per save/update; safe to call even when a
 * type has no formatted computed fields (loop body just won't run). */
function _applyComputedFormats(sheet, rowIdx, ct) {
  var cols = _allColumns(ct);
  var numFmt = { percent1: "0.0%" };
  (ct.computed || []).forEach(function (c) {
    if (!c.format || !numFmt[c.format]) return;
    var colIdx = cols.findIndex(function (col) { return col.key === c.key; });
    if (colIdx === -1) return;
    sheet.getRange(rowIdx, colIdx + 1).setNumberFormat(numFmt[c.format]);
  });
}

/* For any record object heading to the Dashboard (search/getRecord), render a schema-flagged percent
 * computed field as "20.0%" instead of the raw fraction 0.2 stored in the cell — this only affects what
 * the API returns to the client; the cell itself keeps the real number (formatted natively, see above). */
function _formatRecordForClient(ct, rec) {
  (ct.computed || []).forEach(function (c) {
    if (c.format !== "percent1") return;
    var v = rec[c.label];
    if (typeof v === "number") rec[c.label] = (v * 100).toFixed(1) + "%";
  });
  return rec;
}

function _colIndexByLabel(headers) {
  var map = {};
  headers.forEach(function (h, i) { map[h] = i; });
  return map;
}

function _actionSearch(p) {
  var typeKeys = p.type ? [p.type] : SCHEMA.control_types.map(function (c) { return c.key; });
  var q = (p.q || "").toString().trim();
  var page = Math.max(1, parseInt(p.page, 10) || 1);
  var pageSize = Math.min(100, Math.max(1, parseInt(p.pageSize, 10) || 25));

  var all = [];
  typeKeys.forEach(function (key) {
    var ct = _ctByKey(key);
    if (!ct) return;
    var d = _readAllRows(ct);
    var colIdx = _colIndexByLabel(d.headers);
    d.rows.forEach(function (row) {
      if (!_rowMatchesFilters(ct, d.headers, row, colIdx, p)) return;
      var rec = {};
      d.headers.forEach(function (h, j) { rec[h] = row[j]; });
      if (q && JSON.stringify(rec).indexOf(q) === -1) return;
      all.push({ type: key, typeName: ct.name, record: _formatRecordForClient(ct, rec) });
    });
  });

  var total = all.length;
  var start = (page - 1) * pageSize;
  var pageItems = all.slice(start, start + pageSize);
  return {
    ok: true, count: total, page: page, pageSize: pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    results: pageItems
  };
}

function _actionKpis(p) {
  var settings = _readSettings();
  var out = { ok: true, targets: settings.targets, filtersApplied: _describeFilters(p), byType: {} };
  var typeKeys = p.type ? [p.type] : SCHEMA.control_types.map(function (c) { return c.key; });
  SCHEMA.control_types.forEach(function (ct) {
    if (typeKeys.indexOf(ct.key) === -1) return; // "نوع الرقابة" filter narrows which cards are computed at all
    var d = _readAllRows(ct);
    var colIdx = _colIndexByLabel(d.headers);
    var rows = d.rows.filter(function (row) { return _rowMatchesFilters(ct, d.headers, row, colIdx, p); });
    out.byType[ct.key] = _aggregateType(ct, d.headers, rows, settings);
  });
  return out;
}

function _describeFilters(p) {
  var parts = [];
  if (p.dateFrom || p.dateTo) parts.push("الفترة: " + (p.dateFrom || "بداية البيانات") + " → " + (p.dateTo || "اليوم"));
  if (p.branch) parts.push("الفرع: " + p.branch);
  if (p.type) parts.push("نوع الرقابة: " + p.type);
  if (p.auditor) parts.push("المدقق/المستخدم: " + p.auditor);
  if (p.owner) parts.push("المسؤول: " + p.owner);
  if (p.status) parts.push("الحالة: " + p.status);
  if (p.priority) parts.push("الأولوية: " + p.priority);
  return parts.length ? parts.join(" | ") : "بدون فلاتر (كل البيانات)";
}

function _aggregateType(ct, headers, rows, settings) {
  var total = rows.length;
  var agg = { total: total };
  function idx(label) { return headers.indexOf(label); }
  function count(label, value) { var i = idx(label); if (i === -1) return 0; return rows.filter(function (r) { return r[i] === value; }).length; }

  if (ct.key === "Morning") {
    agg.matched = rows.reduce(function (s, r) { return s + (Number(r[idx("شحنات مطابقة")]) || 0); }, 0);
    var totalShip = rows.reduce(function (s, r) { return s + (Number(r[idx("إجمالي الشحنات")]) || 0); }, 0);
    agg.matchPct = totalShip ? (agg.matched / totalShip * 100) : null;
    agg.target = settings.targets["target_MorningMatchPct"];
  } else if (ct.key === "Returns") {
    agg.matched = count("حالة المطابقة", "مطابق");
    agg.unmatched = count("حالة المطابقة", "غير مطابق");
    agg.matchPct = total ? (agg.matched / total * 100) : null;
    agg.target = settings.targets["target_ReturnsMatchPct"];
  } else if (ct.key === "Scrub") {
    agg.underReview = count("نتيجة المراجعة", "قيد المراجعة");
    agg.authorized = count("نتيجة المراجعة", "مصرح به");
    agg.confirmedViolations = count("نتيجة المراجعة", "مخالفة مؤكدة");
  } else if (ct.key === "Transfer") {
    agg.confirmed = rows.filter(function (r) { return r[idx("هل تم التأكيد؟")] === "نعم"; }).length;
    var slaIdx = idx("حالة الالتزام الزمني بالتأكيد (محسوبة)");
    agg.late = rows.filter(function (r) { return (r[slaIdx] || "").toString().indexOf("متجاوز") !== -1; }).length;
    agg.compliancePct = total ? ((total - agg.late) / total * 100) : null;
    agg.target = settings.targets["target_TransferConfirmHrs"];
  } else if (ct.key === "Issues") {
    agg.open = count("حالة المشكلة", "مفتوحة") + count("حالة المشكلة", "قيد المتابعة");
    agg.closed = count("حالة المشكلة", "مغلقة");
    var clsIdx = idx("تصنيف الإغلاق (محسوب)");
    var onTime = rows.filter(function (r) { return r[clsIdx] === "مغلقة في الموعد"; }).length;
    agg.late = rows.filter(function (r) { return (r[idx("تنبيه التأخر")] || "") === "متأخر"; }).length;
    agg.onTimeClosePct = agg.closed ? (onTime / agg.closed * 100) : null;
    agg.target = settings.targets["target_IssueCloseDays"];
  } else if (ct.key === "Penalty") {
    agg.violations = total;
    agg.approved = count("حالة الجزاء", "معتمدة");
    agg.executed = count("حالة الجزاء", "منفذة");
    var valIdx = idx("القيمة المنفذة فعليًا (محسوبة)");
    agg.totalValue = rows.reduce(function (s, r) { return s + (Number(r[valIdx]) || 0); }, 0);
  } else if (ct.key === "Overdue") {
    var odIdx = idx("عدد أيام التجاوز بعد الاستحقاق");
    agg.withinTarget = rows.filter(function (r) { return (Number(r[odIdx]) || 0) <= 0; }).length;
    agg.overdue = total - agg.withinTarget;
    agg.over15 = rows.filter(function (r) { return (Number(r[odIdx]) || 0) > 15; }).length;
    agg.over20 = rows.filter(function (r) { return (Number(r[odIdx]) || 0) > 20; }).length;
    agg.targetDays = settings.targets["target_CaseAgeDays"];
  }
  return agg;
}

/* ---------------- Reports (executive summary + breakdowns + optional period comparison) ---------------- */
function _actionReports(p) {
  var settings = _readSettings();
  var current = _reportSnapshot(p, settings);
  var result = {
    ok: true,
    period: { dateFrom: p.dateFrom || null, dateTo: p.dateTo || null },
    filtersApplied: _describeFilters(p),
    generatedAt: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"),
    current: current
  };
  if (p.comparePrev === "1" && p.dateFrom && p.dateTo) {
    var from = new Date(p.dateFrom), to = new Date(p.dateTo);
    var spanDays = Math.max(1, Math.round((to - from) / 86400000) + 1);
    var prevTo = new Date(from); prevTo.setDate(prevTo.getDate() - 1);
    var prevFrom = new Date(prevTo); prevFrom.setDate(prevFrom.getDate() - spanDays + 1);
    var pPrev = Object.assign({}, p, {
      dateFrom: Utilities.formatDate(prevFrom, Session.getScriptTimeZone(), "yyyy-MM-dd"),
      dateTo: Utilities.formatDate(prevTo, Session.getScriptTimeZone(), "yyyy-MM-dd"),
    });
    result.previousPeriod = { dateFrom: pPrev.dateFrom, dateTo: pPrev.dateTo };
    result.previous = _reportSnapshot(pPrev, settings);
  }
  return result;
}

function _reportSnapshot(p, settings) {
  var byType = {}, byBranch = {}, openActions = [], grandTotal = 0;
  var confirmedViolations = 0, overdueCount = 0;

  SCHEMA.control_types.forEach(function (ct) {
    var d = _readAllRows(ct);
    var colIdx = _colIndexByLabel(d.headers);
    var rows = d.rows.filter(function (row) { return _rowMatchesFilters(ct, d.headers, row, colIdx, p); });
    byType[ct.key] = { name: ct.name, count: rows.length };
    grandTotal += rows.length;

    var branchCols = (ct.filters && ct.filters.branch) || [];
    branchCols.forEach(function (bk) {
      var label = _fieldLabel(ct, bk);
      var i = d.headers.indexOf(label);
      if (i === -1) return;
      rows.forEach(function (r) {
        var b = r[i]; if (!b) return;
        byBranch[b] = (byBranch[b] || 0) + 1;
      });
    });

    var agg = _aggregateType(ct, d.headers, rows, settings);
    if (ct.key === "Scrub") confirmedViolations += agg.confirmedViolations || 0;
    if (ct.key === "Overdue") overdueCount += agg.overdue || 0;

    // "open / not-yet-closed actions with an owner" — for the "لم تُغلق" + "المسؤول عن كل إجراء" report
    var ownerCols = (ct.filters && ct.filters.owner) || [];
    var statusCols = (ct.filters && ct.filters.status) || [];
    if (ownerCols.length && statusCols.length) {
      var ownerLabel = _fieldLabel(ct, ownerCols[0]);
      var statusLabel = _fieldLabel(ct, statusCols[0]);
      var oi = d.headers.indexOf(ownerLabel), si = d.headers.indexOf(statusLabel);
      var idIdx = d.headers.indexOf(SCHEMA.system_columns[SYS.RECORD_ID].label);
      if (oi !== -1 && si !== -1) {
        rows.forEach(function (r) {
          var status = r[si];
          if (status && status !== "مغلقة" && status !== "منفذة" && status !== "معتمدة") {
            openActions.push({ type: ct.name, recordId: r[idIdx], owner: r[oi] || "—", status: status });
          }
        });
      }
    }
  });

  return {
    grandTotal: grandTotal,
    byType: byType,
    byBranch: byBranch,
    confirmedViolations: confirmedViolations,
    overdueCount: overdueCount,
    openActions: openActions.slice(0, 500), // cap payload size; report screen paginates further client-side if needed
    openActionsTotal: openActions.length
  };
}
