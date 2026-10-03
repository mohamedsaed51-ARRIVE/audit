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
        },
        {
          "key": "branch_id",
          "label": "معرّف الفرع (داخلي)",
          "formula": "branch_id_lookup",
          "source_field": "branch"
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
      "computed": [
        {
          "key": "branch_id",
          "label": "معرّف الفرع (داخلي)",
          "formula": "branch_id_lookup",
          "source_field": "branch"
        }
      ],
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
      "computed": [
        {
          "key": "branch_id",
          "label": "معرّف الفرع (داخلي)",
          "formula": "branch_id_lookup",
          "source_field": "branch"
        }
      ],
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
        },
        {
          "key": "from_branch_id",
          "label": "معرّف الفرع المحول (داخلي)",
          "formula": "branch_id_lookup",
          "source_field": "from_branch"
        },
        {
          "key": "to_branch_id",
          "label": "معرّف الفرع المستلم (داخلي)",
          "formula": "branch_id_lookup",
          "source_field": "to_branch"
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
        },
        {
          "key": "branch_id",
          "label": "معرّف الفرع (داخلي)",
          "formula": "branch_id_lookup",
          "source_field": "branch"
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
        },
        {
          "key": "branch_id",
          "label": "معرّف الفرع (داخلي)",
          "formula": "branch_id_lookup",
          "source_field": "branch"
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
        },
        {
          "key": "branch_id",
          "label": "معرّف الفرع (داخلي)",
          "formula": "branch_id_lookup",
          "source_field": "branch"
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
    "target_CaseAgeDays": 5,
    "auth_enabled": 0
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
  ],
  "role_permissions": {
    "Administrator": {
      "actions": [
        "save",
        "update",
        "viewSearch",
        "viewKpis",
        "viewReports",
        "viewAuditLog",
        "manageBranches",
        "manageEmployees",
        "manageSettings"
      ],
      "branchScope": "all",
      "canBeAssignedAllBranches": true,
      "pages": [
        "dashboard",
        "search",
        "reports",
        "settings"
      ]
    },
    "Audit Manager": {
      "actions": [
        "save",
        "update",
        "viewSearch",
        "viewKpis",
        "viewReports",
        "viewAuditLog"
      ],
      "branchScope": "own",
      "canBeAssignedAllBranches": true,
      "pages": [
        "dashboard",
        "search",
        "reports",
        "settings"
      ]
    },
    "Senior Auditor": {
      "actions": [
        "save",
        "update",
        "viewSearch",
        "viewKpis",
        "viewReports",
        "viewAuditLog"
      ],
      "branchScope": "own",
      "canBeAssignedAllBranches": false,
      "pages": [
        "dashboard",
        "search",
        "reports"
      ]
    },
    "Auditor": {
      "actions": [
        "save",
        "update",
        "viewSearch",
        "viewKpis"
      ],
      "branchScope": "own",
      "canBeAssignedAllBranches": false,
      "pages": [
        "dashboard",
        "search"
      ]
    },
    "Audit Viewer": {
      "actions": [
        "viewSearch",
        "viewKpis",
        "viewReports"
      ],
      "branchScope": "own",
      "canBeAssignedAllBranches": false,
      "pages": [
        "dashboard",
        "search",
        "reports"
      ]
    }
  }
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
  var branches = []; // [{id, name, active}] — Branches rows carry extra columns C (id) / D (status)
  var section = "lists";
  for (var r = 1; r < values.length; r++) {
    var a = values[r][0], b = values[r][1], c = values[r][2], d = values[r][3];
    if (a === "الأهداف الرقابية") { section = "targets"; continue; }
    if (a === "فئات عمر الحالات المتأخرة") { section = "buckets"; continue; }
    if (a === "من" && b === "إلى") continue;
    if (!a) continue;
    if (section === "lists") {
      if (a === "Branches") {
        // Backward-compatible: rows written before the Branch Management upgrade only have
        // columns A/B (name) — id/status are simply blank, and we treat blank status as "نشط".
        var bId = (c === "" || c === undefined || c === null) ? "" : String(c);
        var bActive = !(d === "معطل" || d === "inactive" || d === false);
        if (b !== "" && b !== undefined) {
          branches.push({ id: bId, name: b, active: bActive });
          // lists.Branches stays name-based (unchanged contract for _validate/dropdowns), but only
          // ACTIVE branches are offered/accepted for NEW records — a disabled branch simply stops
          // appearing here while every historical row that already used its name stays untouched.
          if (bActive) { lists[a] = lists[a] || []; lists[a].push(b); }
        }
        continue;
      }
      lists[a] = lists[a] || [];
      if (b !== "" && b !== undefined) lists[a].push(b);
    } else if (section === "targets") {
      targets[a] = b;
    } else if (section === "buckets") {
      ageBuckets.push({ from: a, to: b, label: c });
    }
  }
  return { lists: lists, targets: targets, ageBuckets: ageBuckets, branches: branches };
}

/** Looks up a branch's stable Branch ID by its display name, among ALL branches (active or not) —
 * used only to stamp new records with an id-at-entry snapshot; never used to gate validation
 * (that stays name/active-based via settings.lists.Branches, see _readSettings above). */
function _lookupBranchId(name, settings) {
  if (!name) return "";
  var match = (settings.branches || []).filter(function (b) { return b.name === name; })[0];
  return match ? match.id : "";
}

/** أداة معاينة/محاكاة (Preview/Simulation) هجرة أعمدة "الفرع" في التابات السبعة من الاسم النصي إلى
 * معرّف فرع ثابت (Branch ID) — للبند سادسًا من المواصفة. هذه الدالة للقراءة فقط بشكل مطلق: لا
 * تستدعي setValue/appendRow/insertRowBefore أو أي عملية كتابة على أي شيت إطلاقًا، ولا تُعدِّل بيانات
 * أي سجل قديم. هدفها الوحيد إنتاج تقرير يوضح: كم سجلًا يمكن ربطه بثقة بمعرّف فرع حالي، وكم سجلًا
 * غير قابل للربط (اسم فرع غير موجود ضمن قائمة الفروع الحالية)، وكم سجلًا يحتاج مراجعة يدوية (تكرار
 * اسم الفرع بين أكثر من فرع، أو معرّف فرع محفوظ لم يعد يطابق أي فرع حالي). القرار بتنفيذ ربط فعلي
 * لاحقًا (بكتابة معرّف الفرع داخل عمود مخصَّص في كل تاب) يبقى قرارًا إداريًا منفصلًا لم يُنفَّذ هنا.
 */
function _migrationPreviewBranches() {
  var settings = _readSettings();
  var branchByName = {}; // الاسم -> كل الفروع (نشطة أو معطَّلة) التي تحمل هذا الاسم بالضبط
  (settings.branches || []).forEach(function (b) {
    branchByName[b.name] = branchByName[b.name] || [];
    branchByName[b.name].push(b);
  });
  var validIds = {};
  (settings.branches || []).forEach(function (b) { validIds[b.id] = true; });

  var report = {
    generatedAt: new Date().toISOString(),
    mode: "PREVIEW_ONLY_NO_WRITES",
    tabs: [],
    totals: { total: 0, linked: 0, unlinked: 0, needsReview: 0, duplicateNameMatches: 0, unknownBranchName: 0 }
  };

  SCHEMA.control_types.forEach(function (ct) {
    var branchField = (ct.fields || []).find(function (f) { return f.key === "branch"; });
    if (!branchField) return; // هذا النوع من الرقابة لا يحتوي عمود فرع إطلاقًا (لا يخصّه هذا التقرير)
    var branchIdComputed = (ct.computed || []).find(function (c) {
      return c.formula === "branch_id_lookup" && c.source_field === "branch";
    });

    var data = _readAllRows(ct); // قراءة فقط — نفس الدالة المستخدمة في كل عمليات القراءة الأخرى
    var idxId = data.headers.indexOf(SCHEMA.system_columns[SYS.RECORD_ID].label);
    var idxBranch = data.headers.indexOf(branchField.label);
    var idxBranchId = branchIdComputed ? data.headers.indexOf(branchIdComputed.label) : -1;

    var t = {
      key: ct.key, name: ct.name, sheet: ct.sheet,
      total: 0, linked: 0, unlinked: 0, needsReview: 0, duplicateNameMatches: 0, unknownBranchName: 0,
      samples: { unlinked: [], needsReview: [] } // أول 20 حالة من كل نوع فقط، لتفادي تقرير ضخم بلا فائدة
    };

    data.rows.forEach(function (row) {
      t.total++;
      var recId = idxId !== -1 ? row[idxId] : "";
      var branchName = idxBranch !== -1 ? String(row[idxBranch] || "").trim() : "";
      var existingId = idxBranchId !== -1 ? String(row[idxBranchId] || "").trim() : "";

      if (existingId) {
        if (validIds[existingId]) { t.linked++; return; }
        t.needsReview++;
        if (t.samples.needsReview.length < 20) {
          t.samples.needsReview.push({ id: recId, branch: branchName, reason: "معرّف فرع محفوظ (" + existingId + ") لا يطابق أي فرع ضمن القائمة الحالية" });
        }
        return;
      }

      if (!branchName) {
        t.unlinked++;
        if (t.samples.unlinked.length < 20) t.samples.unlinked.push({ id: recId, branch: "", reason: "لا يوجد اسم فرع مسجَّل في هذا السجل" });
        return;
      }

      var matches = branchByName[branchName] || [];
      if (matches.length === 0) {
        t.unknownBranchName++; t.unlinked++;
        if (t.samples.unlinked.length < 20) t.samples.unlinked.push({ id: recId, branch: branchName, reason: "اسم الفرع غير موجود ضمن قائمة الفروع الحالية — يحتاج تعيين يدوي أو تصحيح اسم" });
      } else if (matches.length > 1) {
        t.duplicateNameMatches++; t.needsReview++;
        if (t.samples.needsReview.length < 20) t.samples.needsReview.push({ id: recId, branch: branchName, reason: "اسم الفرع يطابق " + matches.length + " فروع مختلفة بنفس الاسم — لا يمكن تحديد المعرّف الصحيح تلقائيًا" });
      } else {
        t.linked++; // اسم فريد يطابق فرعًا واحدًا بالضبط — قابل للربط بثقة، ولم يُكتَب شيء بعد
      }
    });

    Object.keys(report.totals).forEach(function (k) { report.totals[k] += t[k]; });
    report.tabs.push(t);
  });

  return report;
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
      case "branch_id_lookup":
        // Snapshots the CURRENT Branch ID for the branch name entered — never rewritten later, so
        // renaming/disabling a branch afterward cannot alter what an existing record points to.
        out[c.key] = _lookupBranchId(data[c.source_field], settings);
        break;
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
// عمليات القراءة العامة عمدًا (بلا Token) — "bootstrap" و"settings" فقط: بيانات وصفية غير حسّاسة
// (أسماء الفروع، الأهداف الرقمية، تعريف الحقول) يحتاجها حتى شاشة تسجيل الدخول نفسها كي تُرسَم قبل
// أي مصادقة. أي عملية تعيد سجلات تشغيلية فعلية (kpis/search/getRecord/reports) تتطلب Token صالحًا
// فور تفعيل auth_enabled=1 — هذا هو الإصلاح الأمني المطلوب: هذه العمليات كانت بلا أي حماية إطلاقًا.
var PUBLIC_READ_ACTIONS = { bootstrap: 1, settings: 1 };
var READ_ACTION_PERMISSION = { kpis: "viewKpis", search: "viewSearch", getRecord: "viewSearch", reports: "viewReports" };

function doGet(e) {
  return _respond(function () {
    var action = (e.parameter.action || "bootstrap");
    var session = null;
    if (!PUBLIC_READ_ACTIONS[action]) {
      var permNeeded = READ_ACTION_PERMISSION[action];
      if (!permNeeded) return { ok: false, error: "إجراء غير معروف (" + action + ") — لم يُنفَّذ أي شيء." };
      var auth = _requireAuth(e.parameter, permNeeded);
      if (!auth.ok) return auth;
      session = auth.session;
    }
    switch (action) {
      case "bootstrap": return _actionBootstrap();
      case "settings": return _actionSettings();
      case "kpis": return _actionKpis(e.parameter, session);
      case "search": return _actionSearch(e.parameter, session);
      case "getRecord": return _actionGetRecord(e.parameter, session);
      case "reports": return _actionReports(e.parameter, session);
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
      case "login": return _actionLogin(body);
      case "logout": return _actionLogout(body);
      case "bootstrapAdmin": return _actionBootstrapAdmin(body);
      case "listEmployees": return _actionListEmployees(body);
      case "addEmployee": return _actionAddEmployee(body);
      case "updateEmployee": return _actionUpdateEmployee(body);
      case "toggleEmployee": return _actionToggleEmployee(body);
      case "listBranches": return _actionListBranches(body);
      case "addBranch": return _actionAddBranch(body);
      case "renameBranch": return _actionRenameBranch(body);
      case "toggleBranch": return _actionToggleBranch(body);
      case "auditLog": return _actionAuditLog(body);
      case "migrationPreviewBranches": return _actionMigrationPreviewBranches(body);
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
    lists: s.lists, targets: s.targets,
    authEnabled: _authEnabled(),
    employeesBootstrapNeeded: _authEnabled() && _readEmployeesRaw().length === 0,
    // نفس مصفوفة SCHEMA.role_permissions المضمَّنة أعلاه — تُرسَل للواجهة كي تشتق منها عرض
    // التابات/الأزرار (تحسين تجربة استخدام فقط)، مصدرها الوحيد هو نفس الملف الذي يتحقق منه
    // Backend فعليًا، فلا يمكن أن تنحرف قائمة "ما تراه الواجهة" عمّا يفرضه الخادم فعلًا.
    rolePermissions: SCHEMA.role_permissions
  };
}

function _actionSettings() {
  var settings = _readSettings();
  return { ok: true, lists: settings.lists, targets: settings.targets, ageBuckets: settings.ageBuckets };
}

function _actionSave(body) {
  var auth = _requireAuth(body, "save");
  if (!auth.ok) return auth; // auth failures are never dedup-cached — a corrected retry must be re-checked

  var dup = _dedupCheck(body.clientRequestId);
  if (dup) return dup; // exact same request already processed — return the original result, don't insert again

  var ct = _ctByKey(body.type);
  if (!ct) { var r = { ok: false, error: "نوع رقابة غير معروف: " + body.type }; _dedupStore(body.clientRequestId, r); return r; }
  var data = body.data || {};
  var settings = _readSettings();
  data.__lists = settings.lists;
  var errors = _validate(ct, data);
  if (errors.length) { var rE = { ok: false, errors: errors }; _dedupStore(body.clientRequestId, rE); return rE; }
  var scopeErr = _checkBranchScope(auth.session, ct, data);
  if (scopeErr) { var rS = { ok: false, error: scopeErr }; _dedupStore(body.clientRequestId, rS); return rS; }

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
  _auditLog(auth.session ? auth.session.username : (body.user || "غير معروف"), "save", "نجاح",
    ct.key + " / " + id, _branchIdsOfRecord(ct, data, settings));
  _dedupStore(body.clientRequestId, result);
  return result;
}

function _actionUpdate(body) {
  var auth = _requireAuth(body, "update");
  if (!auth.ok) return auth;

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
  var cols = _allColumns(ct);

  // فحص نطاق الفرع على السجل *الحالي كما هو مخزَّن فعليًا*، وليس فقط على البيانات الجديدة المرسلة —
  // وإلا يستطيع دور "own" (Auditor/Senior Auditor) تعديل سجل لفرع آخر طالما ادّعى في data.branch
  // أنه فرعه هو؛ نفحص هنا القيمة المخزَّنة حاليًا في عمود الفرع بالسجل قبل السماح بأي تعديل عليه.
  var existingData = {};
  cols.forEach(function (c, i) { existingData[c.key] = values[rowIdx - 1][i]; });
  var scopeErrExisting = _checkBranchScope(auth.session, ct, existingData);
  if (scopeErrExisting) return { ok: false, error: "غير مصرح لك بتعديل هذا السجل — هو خارج نطاق فروعك." };

  var scopeErr0 = _checkBranchScope(auth.session, ct, data);
  if (scopeErr0) return { ok: false, error: scopeErr0 };
  var errors = _validate(ct, data);
  if (errors.length) return { ok: false, errors: errors };

  var computed = _computeFields(ct, data, settings);
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
  _auditLog(auth.session ? auth.session.username : (body.user || "غير معروف"), "update", "نجاح",
    ct.key + " / " + body.id, _branchIdsOfRecord(ct, data, settings));
  return { ok: true, recordId: body.id, message: "تم تعديل السجل رقم " + body.id + " بنجاح." };
}

function _actionGetRecord(p, session) {
  var ct = _ctByKey(p.type);
  if (!ct) return { ok: false, error: "نوع رقابة غير معروف" };
  var d = _readAllRows(ct);
  var colIdx = _colIndexByLabel(d.headers);
  var idIdx = d.headers.indexOf(SCHEMA.system_columns[SYS.RECORD_ID].label);
  for (var i = 0; i < d.rows.length; i++) {
    if (d.rows[i][idIdx] === p.id) {
      // نفس فحص نطاق الفرع المستخدَم في kpis/search/reports — لا يجوز لدور "own" جلب سجل بمعرفه
      // مباشرة (action=getRecord&id=...) للالتفاف حول تصفية القوائم في شاشة البحث.
      if (!_rowMatchesFilters(ct, d.headers, d.rows[i], colIdx, {}, session)) {
        return { ok: false, error: "غير مصرح لك بعرض هذا السجل — هو خارج نطاق فروعك." };
      }
      var rec = {};
      d.headers.forEach(function (h, j) { rec[h] = d.rows[i][j]; });
      return { ok: true, record: _formatRecordForClient(ct, rec) };
    }
  }
  return { ok: false, error: "السجل غير موجود: " + p.id };
}

/* ---------------- Unified filter engine (kpis / search / reports all use this) ---------------- */
/** session: جلسة المستخدم الحالية (أو null لو auth معطَّل) — هذا هو نقطة الاختناق الوحيدة لفرض
 * Branch Scope على كل شاشات القراءة الثلاث معًا (kpis/search/reports)، بحيث لا يمكن لدور "own"
 * (Auditor أو Senior Auditor) رؤية سجل فرع غير مصرَّح له به مهما كانت Parameters الطلب. */
function _rowMatchesFilters(ct, headers, row, colIdx, p, session) {
  function val(key) { var i = colIdx[key]; return i === undefined ? undefined : row[i]; }
  var filt = ct.filters || {};

  if (session && _branchScope(session.role) === "own" && session.branches !== "ALL") {
    var allowedIds = session.branches || [];
    var branchFieldKeys = ct.fields.filter(function (f) { return f.list === "Branches"; }).map(function (f) { return f.key; });
    var settingsForScope = _readSettings();
    var rowBranchIds = branchFieldKeys.map(function (fk) {
      var name = val(_fieldLabel(ct, fk));
      return name ? _lookupBranchId(name, settingsForScope) : null;
    }).filter(Boolean);
    // لا حقول فرع في هذا النوع أصلًا (لا يوجد حاليًا)، أو لم يُحدَّد فرع للسجل: يُستبعَد احتياطًا لدور "own"
    if (!rowBranchIds.length) return false;
    var withinScope = rowBranchIds.some(function (id) { return allowedIds.indexOf(id) !== -1; });
    if (!withinScope) return false;
  }

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

function _actionSearch(p, session) {
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
      if (!_rowMatchesFilters(ct, d.headers, row, colIdx, p, session)) return;
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

function _actionKpis(p, session) {
  var settings = _readSettings();
  var out = { ok: true, targets: settings.targets, filtersApplied: _describeFilters(p), byType: {} };
  var typeKeys = p.type ? [p.type] : SCHEMA.control_types.map(function (c) { return c.key; });
  SCHEMA.control_types.forEach(function (ct) {
    if (typeKeys.indexOf(ct.key) === -1) return; // "نوع الرقابة" filter narrows which cards are computed at all
    var d = _readAllRows(ct);
    var colIdx = _colIndexByLabel(d.headers);
    var rows = d.rows.filter(function (row) { return _rowMatchesFilters(ct, d.headers, row, colIdx, p, session); });
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
function _actionReports(p, session) {
  var settings = _readSettings();
  var current = _reportSnapshot(p, settings, session);
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
    result.previous = _reportSnapshot(pPrev, settings, session);
  }
  return result;
}

function _reportSnapshot(p, settings, session) {
  var byType = {}, byBranch = {}, openActions = [], grandTotal = 0;
  var confirmedViolations = 0, overdueCount = 0;

  SCHEMA.control_types.forEach(function (ct) {
    var d = _readAllRows(ct);
    var colIdx = _colIndexByLabel(d.headers);
    var rows = d.rows.filter(function (row) { return _rowMatchesFilters(ct, d.headers, row, colIdx, p, session); });
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

/* ===================================================================
 * ============  الإضافات الجديدة: الفروع + الموظفون + تسجيل الدخول  ============
 * ===================================================================
 * كل ما بهذا القسم إضافي (additive) بحت: لا يعدّل أي دالة أو جدول قديم بشكل هدّام،
 * ولا يُفعَّل فرض الصلاحيات (RBAC) إلا إذا كان الإعداد targets.auth_enabled = "1" في تاب
 * "الإعدادات" — القيمة الافتراضية عند عدم وجوده هي "معطّل"، أي النظام يعمل تمامًا كما كان
 * (لا شاشة دخول، لا فحص صلاحيات) حتى تُفعِّله أنت صراحةً بعد إنشاء حسابات الموظفين.
 *
 * أمان كلمات المرور: SHA-256 + Salt عشوائي لكل حساب (عبر Utilities.computeDigest) — هذا
 * أفضل بكثير من نص واضح، لكنه ليس bcrypt/Argon2 القياسي؛ مناسب لأداة داخلية بعدد موظفين
 * محدود، وليس بمستوى أمان بنكي. لا تُخزَّن أي كلمة مرور أو Hash في أي مكان بالواجهة أو GitHub.
 * =================================================================== */

// مصدر الحقيقة الوحيد لكل صلاحيات الأدوار: SCHEMA.role_permissions (مضمَّن من backend/schema.json —
// نفس الملف الذي تُبنى منه الاختبارات وتُشتق منه توثيقات الواجهة/الـREADME، فلا يوجد تعريف صلاحيات
// ثانٍ منفصل يمكن أن ينحرف عن هذا). كل إجراء غير مذكور ضمن "actions" لأي دور هنا (bootstrap مثلًا)
// يبقى متاحًا للجميع بعد تسجيل الدخول فقط عندما لا يُطلَب أي فحص صلاحية له صراحةً في الكود.
var ROLES = Object.keys(SCHEMA.role_permissions);

function _authEnabled() {
  var settings = _readSettings();
  var v = settings.targets["auth_enabled"];
  return v === "1" || v === 1 || v === true || v === "TRUE";
}

function _roleDef(role) { return SCHEMA.role_permissions[role] || null; }

function _hasPermission(role, action) {
  var def = _roleDef(role);
  return !!(def && def.actions.indexOf(action) !== -1);
}

/** "all" = يرى/يكتب كل الفروع بلا قيد. "own" = مقيَّد بالفروع المخصَّصة له في سجل الموظف فقط. */
function _branchScope(role) {
  var def = _roleDef(role);
  return def ? def.branchScope : "own";
}

function _canBeAssignedAllBranches(role) {
  var def = _roleDef(role);
  return !!(def && def.canBeAssignedAllBranches);
}

/* ---------------- تجزئة كلمات المرور (SHA-256 + Salt) ---------------- */
function _genSalt() { return Utilities.getUuid(); }

function _hashPassword(password, salt) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + ":" + salt);
  return digest.map(function (b) { return ((b & 0xff) < 16 ? "0" : "") + (b & 0xff).toString(16); }).join("");
}

/* ---------------- جلسات الدخول (Token عبر CacheService — 6 ساعات) ----------------
 * القيمة 21600 ثانية (6 ساعات) هي الحد الأقصى الموثَّق فعليًا الذي يقبله CacheService.put() في
 * Google Apps Script. القيمة السابقة (8 * 60 * 60 = 28800) كانت تتجاوز هذا الحد، وهو عطل حقيقي لم
 * يكتشفه أي من الاختبارات السابقة لأن محاكي الـ Sandbox (gs_sandbox.js) لا يفرض هذا القيد المنصوصي
 * لمنصة Google Apps Script الحقيقية. لا يوجد أي ضمان أن الجلسة ستبقى متاحة كامل الست ساعات — الكاش
 * قد يُفرَّغ قبل ذلك لأي سبب (إعادة نشر السكربت، حدود تنفيذ المنصة، ...)؛ أي فشل في قراءته يُعامَل
 * كجلسة غير صالحة (راجع _requireAuth أدناه) ويتطلب تسجيل دخول جديد، وليس ضمانًا بالفشل الآمن فقط. */
var SESSION_TTL_SECONDS = 21600;

function _sessionCreate(employee) {
  var token = Utilities.getUuid();
  var payload = {
    employeeId: employee.id, username: employee.username, fullName: employee.fullName,
    role: employee.role, branches: employee.branches // "ALL" أو مصفوفة Branch IDs
  };
  CacheService.getScriptCache().put("sess_" + token, JSON.stringify(payload), SESSION_TTL_SECONDS);
  return token;
}
function _sessionGet(token) {
  if (!token) return null;
  var raw = CacheService.getScriptCache().get("sess_" + token);
  return raw ? JSON.parse(raw) : null;
}
function _sessionDestroy(token) {
  if (token) CacheService.getScriptCache().remove("sess_" + token);
}

/** يتحقق من الجلسة والصلاحية لإجراء مُعطى. إن كان auth_enabled=false يمر الطلب دون فحص (سلوك
 * ما قبل هذه الإضافة تمامًا). عند التفعيل: يتطلب body.token صالحًا، ثم يُعيد قراءة حالة الموظف
 * *الحيّة* من الشيت (وليس الاعتماد على القيم المخزَّنة في الجلسة عند تسجيل الدخول) — فلو عطَّل
 * مسؤول حسابًا أو غيَّر دوره/فروعه أثناء أن الجلسة ما زالت سارية (حتى 8 ساعات)، يُطبَّق التغيير
 * فورًا على الطلب التالي بدل انتظار انتهاء صلاحية الـ Token القديم. */
function _requireAuth(body, action) {
  if (!_authEnabled()) return { ok: true, session: null };
  var cached = _sessionGet(body.token);
  if (!cached) return { ok: false, error: "الجلسة غير صالحة أو منتهية — يرجى تسجيل الدخول مرة أخرى." };

  var rows = _readEmployeesRaw();
  var liveRow = null;
  for (var i = 0; i < rows.length; i++) if (rows[i][EMP_COLS.ID] === cached.employeeId) { liveRow = rows[i]; break; }
  if (!liveRow) {
    _sessionDestroy(body.token);
    return { ok: false, error: "الحساب لم يعد موجودًا — يرجى تسجيل الدخول مرة أخرى." };
  }
  var live = _employeeFromRow(liveRow);
  if (live.status !== "نشط") {
    _sessionDestroy(body.token);
    return { ok: false, error: "تم تعطيل هذا الحساب — راجع مسؤول النظام." };
  }
  var session = { employeeId: live.id, username: live.username, fullName: live.fullName, role: live.role, branches: live.branches };
  if (!_hasPermission(session.role, action)) {
    return { ok: false, error: "غير مصرح لك بتنفيذ هذه العملية (الدور الحالي: " + session.role + ")." };
  }
  return { ok: true, session: session };
}

/** فحص نطاق الفرع عند الحفظ/التعديل: أي دور نطاقه "own" (Auditor أو Senior Auditor حاليًا) مقيَّد
 * بفروعه المخصَّصة فقط — مُشتق من SCHEMA.role_permissions وليس اسم دور مكتوبًا حرفيًا هنا، بحيث لا
 * يمكن لأي دور "own" تجاوز فرعه عبر تعديل Parameters في الطلب (يُتحقَّق من الفرع الفعلي في البيانات
 * المرسلة، وليس مما تدَّعيه الواجهة). */
function _checkBranchScope(session, ct, data) {
  if (!session) return null; // auth_enabled=false — لا قيد (سلوك ما قبل هذه الإضافة تمامًا)
  if (_branchScope(session.role) !== "own") return null;
  if (session.branches === "ALL") return null; // لا يُفترَض أن يحدث لدور "own" (canBeAssignedAllBranches=false)، فحص إضافي فقط
  var branchFields = ct.fields.filter(function (f) { return f.list === "Branches"; }).map(function (f) { return f.key; });
  var settings = _readSettings();
  var allowedIds = session.branches || [];
  var violated = branchFields.some(function (fk) {
    var branchId = _lookupBranchId(data[fk], settings);
    return branchId && allowedIds.indexOf(branchId) === -1;
  });
  if (violated) return "غير مصرح لك بإدخال أو تعديل سجلات لهذا الفرع — راجع مسؤول النظام.";
  return null;
}

/** يستخرج معرّفات الفروع الفعلية التي يشير إليها سجل بيانات مُدخَل (لأغراض تسجيل سجل العمليات بفرعه). */
function _branchIdsOfRecord(ct, data, settings) {
  var branchFields = ct.fields.filter(function (f) { return f.list === "Branches"; }).map(function (f) { return f.key; });
  var ids = branchFields.map(function (fk) { return _lookupBranchId(data[fk], settings); }).filter(Boolean);
  return ids;
}

/* ---------------- سجل العمليات (Audit Log) ---------------- */
/** branchIds: مصفوفة معرّفات الفروع التي تخص هذه العملية (سجل حفظ/تعديل له فرع واحد أو أكثر)، أو
 * مصفوفة فارغة/undefined لعملية لا تخص فرعًا بعينه (دخول/خروج/إدارة موظفين/فروع) — تُخزَّن كنص
 * مفصول بفواصل في عمود مضاف (append-only، لا يُغيّر الأعمدة القديمة) ليتمكن دور "Senior Auditor"
 * من رؤية سجل العمليات الخاص بفروعه فقط دون الحاجة لأي بنية إضافية أعقد. */
function _auditLog(username, action, result, details, branchIds) {
  var sh = _sheetOrNull("_AuditLog");
  if (!sh) return; // لا يمنع تنفيذ العملية نفسها لو كان التاب غير موجود بعد (قبل تشغيل الهجرة)
  sh.appendRow([
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"),
    username || "غير معروف", action, result, details || "",
    (branchIds && branchIds.length) ? branchIds.join(",") : ""
  ]);
}

/* ---------------- قراءة/كتابة الموظفين ---------------- */
var EMP_COLS = { ID: 0, FULLNAME: 1, USERNAME: 2, HASH: 3, SALT: 4, ROLE: 5, BRANCHES: 6, STATUS: 7,
  CREATED: 8, LASTLOGIN: 9, FAILCOUNT: 10, LASTFAIL: 11 };

function _readEmployeesRaw() {
  var sh = _sheetOrNull("الموظفون");
  if (!sh) return [];
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  return sh.getRange(2, 1, lastRow - 1, sh.getLastColumn()).getValues();
}
/** يحوّل القيمة الخام المخزَّنة في عمود "الفروع" بشيت الموظفين إلى قيمة نطاق فروع فعلية.
 * قاعدة صارمة واحدة (تماثل تمامًا قاعدة _resolveBranchAssignment في مسار الحفظ، لكن هنا على مسار
 * القراءة): القيمة الصريحة النصية "ALL" فقط تعني كل الفروع. أي شيء آخر — خلية فارغة تمامًا، أو
 * null/undefined (مثلًا لو حذف أحد عمود "الفروع" يدويًا مباشرة في Google Sheets متجاوزًا الواجهة
 * والـ Backend كليهما، أو تلف/نقص بيانات في صف قديم) — يُعامَل صراحة كـ"لا فروع مخصَّصة إطلاقًا"
 * (مصفوفة فارغة)، وليس "كل الفروع".
 * *** إصلاح أمني: كانت النسخة السابقة من هذه الدالة تُفسِّر الخلية الفارغة على أنها "ALL" — وهو بالضبط
 * نفس نوع "الافتراض الضمني لِـ ALL Branches" الذي أُزيل عمدًا من مسار الحفظ. هذا يضمن أن أي قيمة غير
 * متوقَّعة تُفشِل الوصول لبيانات الفروع (Fail-Closed عبر _rowMatchesFilters/_checkBranchScope/سجل
 * العمليات — جميعها تعامل مصفوفة فارغة كـ"لا تطابق أي فرع") بدل أن تمنحه بالخطأ (Fail-Open). ***
 * لا علاقة لهذه الدالة بحساب Administrator الأول (Bootstrap Admin) — ذاك الحساب الوحيد يُكتَب بالقيمة
 * الصريحة الحرفية "ALL" مباشرة عند إنشائه (_actionBootstrapAdmin)، وهو استثناء موثَّق ومقصود يخص إنشاء
 * أول حساب لتشغيل النظام فقط، ولا يمر عبر أي مسار "فارغ يعني ALL" إطلاقًا. */
function _parseStoredBranches(raw) {
  if (raw === "ALL") return "ALL";
  if (raw === undefined || raw === null || raw === "") return [];
  return String(raw).split(",").map(function (s) { return s.trim(); }).filter(function (s) { return s !== ""; });
}

function _employeeFromRow(r) {
  return {
    id: r[EMP_COLS.ID], fullName: r[EMP_COLS.FULLNAME], username: r[EMP_COLS.USERNAME],
    hash: r[EMP_COLS.HASH], salt: r[EMP_COLS.SALT], role: r[EMP_COLS.ROLE],
    branches: _parseStoredBranches(r[EMP_COLS.BRANCHES]),
    status: r[EMP_COLS.STATUS], createdAt: r[EMP_COLS.CREATED], lastLogin: r[EMP_COLS.LASTLOGIN],
    failCount: Number(r[EMP_COLS.FAILCOUNT] || 0), lastFail: r[EMP_COLS.LASTFAIL]
  };
}
function _findEmployeeRowIndex(username) {
  var rows = _readEmployeesRaw();
  for (var i = 0; i < rows.length; i++) if (rows[i][EMP_COLS.USERNAME] === username) return i + 2; // 1-based + header
  return -1;
}

var LOCKOUT_MAX_ATTEMPTS = 5;
var LOCKOUT_MINUTES = 15;

function _actionLogin(body) {
  var username = (body.username || "").trim();
  var password = body.password || "";
  if (!username || !password) return { ok: false, error: "الرجاء إدخال اسم المستخدم وكلمة المرور." };

  var rowIdx = _findEmployeeRowIndex(username);
  if (rowIdx === -1) {
    _auditLog(username, "login", "فشل", "مستخدم غير موجود");
    return { ok: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة." };
  }
  var sh = _sheet("الموظفون");
  var row = sh.getRange(rowIdx, 1, 1, sh.getLastColumn()).getValues()[0];
  var emp = _employeeFromRow(row);

  if (emp.status !== "نشط") {
    _auditLog(username, "login", "فشل", "حساب معطّل");
    return { ok: false, error: "هذا الحساب معطّل — راجع مسؤول النظام." };
  }
  // القفل المؤقت يُحسَب عبر CacheService (TTL ذاتي)، وليس بمقارنة تواريخ نصية مخزَّنة في الشيت —
  // مقارنة "الآن" بتاريخ نصي بصيغة "yyyy-MM-dd HH:mm:ss" بلا منطقة زمنية صريحة كانت تُنتج فرقًا
  // خاطئًا فور تحليل Date لنص كهذا كـ"توقيت محلي" بينما كُتب أصلًا بتوقيت UTC — اكتُشف هذا فعليًا
  // أثناء اختبار القفل (راجع docs/تقرير_الاختبارات_الجديدة.md) وأُصلح باستخدام Cache ذاتي الانتهاء.
  var lockKey = "lockout_" + username;
  var lockRaw = CacheService.getScriptCache().get(lockKey);
  var lockCount = lockRaw ? Number(lockRaw) : 0;
  if (lockCount >= LOCKOUT_MAX_ATTEMPTS) {
    _auditLog(username, "login", "فشل", "الحساب مقفل مؤقتًا بعد محاولات فاشلة متكررة");
    return { ok: false, error: "تم قفل الحساب مؤقتًا بعد محاولات فاشلة متكررة — أعد المحاولة بعد " + LOCKOUT_MINUTES + " دقيقة تقريبًا." };
  }

  var computedHash = _hashPassword(password, emp.salt);
  if (computedHash !== emp.hash) {
    var newFail = emp.failCount + 1;
    sh.getRange(rowIdx, EMP_COLS.FAILCOUNT + 1).setValue(newFail); // للعرض/التدقيق فقط
    sh.getRange(rowIdx, EMP_COLS.LASTFAIL + 1).setValue(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"));
    CacheService.getScriptCache().put(lockKey, String(lockCount + 1), LOCKOUT_MINUTES * 60); // القفل الفعلي
    _auditLog(username, "login", "فشل", "كلمة مرور غير صحيحة (المحاولة " + newFail + ")");
    return { ok: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة." };
  }

  // نجاح: صفّر عدّاد المحاولات الفاشلة (الشيت + القفل)، حدّث آخر تسجيل دخول، أصدر Token
  sh.getRange(rowIdx, EMP_COLS.FAILCOUNT + 1).setValue(0);
  sh.getRange(rowIdx, EMP_COLS.LASTLOGIN + 1).setValue(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"));
  CacheService.getScriptCache().remove(lockKey);
  var token = _sessionCreate(emp);
  _auditLog(username, "login", "نجاح", "الدور: " + emp.role);
  return { ok: true, token: token, employeeId: emp.id, fullName: emp.fullName, role: emp.role, branches: emp.branches };
}

function _actionLogout(body) {
  var session = _sessionGet(body.token);
  _sessionDestroy(body.token);
  if (session) _auditLog(session.username, "logout", "نجاح", "");
  return { ok: true };
}

/** يعمل فقط إذا كان تاب "الموظفون" فارغًا تمامًا — إنشاء أول حساب Administrator بأمان من الواجهة
 * دون الحاجة لتعديل الشيت يدويًا. يرفض العمل بعد وجود أي موظف واحد على الأقل. */
function _actionBootstrapAdmin(body) {
  var rows = _readEmployeesRaw();
  if (rows.length > 0) return { ok: false, error: "يوجد حساب موظف واحد على الأقل بالفعل — لا يمكن استخدام هذا الإجراء إلا عند بدء تشغيل النظام لأول مرة." };
  if (!body.username || !body.password || !body.fullName) return { ok: false, error: "الاسم الكامل واسم المستخدم وكلمة المرور كلها إلزامية." };
  if (String(body.password).length < 8) return { ok: false, error: "كلمة المرور يجب ألا تقل عن 8 أحرف." };
  var salt = _genSalt();
  var hash = _hashPassword(body.password, salt);
  var sh = _sheet("الموظفون");
  sh.appendRow(["EMP-0001", body.fullName, body.username, hash, salt, "Administrator", "ALL", "نشط",
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"), "", 0, ""]);
  _auditLog(body.username, "bootstrapAdmin", "نجاح", "أول حساب Administrator");
  return { ok: true, message: "تم إنشاء حساب المسؤول الأول بنجاح. سجّل الدخول به الآن." };
}

function _nextEmployeeId() {
  var rows = _readEmployeesRaw();
  var max = 0;
  rows.forEach(function (r) {
    var m = /EMP-(\d+)/.exec(r[EMP_COLS.ID] || "");
    if (m) max = Math.max(max, Number(m[1]));
  });
  return "EMP-" + String(max + 1).padStart(4, "0");
}

function _actionListEmployees(body) {
  var auth = _requireAuth(body, "manageEmployees"); if (!auth.ok) return auth;
  var rows = _readEmployeesRaw();
  return { ok: true, employees: rows.map(_employeeFromRow).map(function (e) {
    return { id: e.id, fullName: e.fullName, username: e.username, role: e.role, branches: e.branches,
      status: e.status, createdAt: e.createdAt, lastLogin: e.lastLogin }; // لا يُعاد الـ hash/salt أبدًا
  }) };
}

/** يحسم قيمة "نطاق الفروع" المطلوب تخزينها لموظف — إضافةً أو تعديلًا — بقاعدة واحدة صارمة:
 * لا يوجد أي fallback تلقائي إلى "كل الفروع" إطلاقًا. القيم المقبولة فقط:
 *   1) المصفوفة الصريحة لمعرّفات فروع (branches: ["BR-001", ...]) — يجب أن تكون غير فارغة، وكل
 *      معرّف فيها يجب أن يطابق فرعًا موجودًا فعلًا ضمن settings.branches (نشطًا أو معطَّلًا)، وإلا رُفض
 *      الطلب بالكامل مع تحديد المعرّف غير الصحيح — لا يُقبَل جزء من القائمة ويُرفض الباقي بصمت.
 *   2) القيمة النصية الصريحة "ALL" فقط — وليس مصفوفة فارغة، وليس undefined/null — وتُقبَل فقط إن كان
 *      الدور المستهدف يملك canBeAssignedAllBranches:true في مصفوفة الصلاحيات؛ أي طلب آخر لهذه القيمة
 *      من دور لا يملك هذا التفويض يُرفض صراحةً مهما كان منفِّذ الطلب (حتى Administrator نفسه لا يمنحها
 *      لدور غير مصرَّح له بها في المصفوفة).
 * أي قيمة أخرى (undefined، null, مصفوفة فارغة []، نص فارغ) تُرفض بخطأ صريح يطلب اختيارًا واعيًا —
 * لا تُفسَّر أبدًا على أنها "كل الفروع" ولا على أنها "بلا فروع" ضمنيًا.
 */
function _resolveBranchAssignment(role, branchesInput, settings) {
  var allowedAll = _canBeAssignedAllBranches(role);
  if (branchesInput === "ALL") {
    if (!allowedAll) return { ok: false, error: "الدور \"" + role + "\" غير مصرَّح له بمنح \"كل الفروع\" — يلزم تحديد فرع واحد أو أكثر صراحةً." };
    return { ok: true, value: "ALL" };
  }
  if (!Array.isArray(branchesInput) || branchesInput.length === 0) {
    var hint = allowedAll
      ? " أو اختيار \"كل الفروع\" صراحةً (بإرسال القيمة \"ALL\")."
      : " — هذا الدور لا يمكن أن يُسنَد له \"كل الفروع\" إطلاقًا.";
    return { ok: false, error: "يجب تحديد فرع واحد على الأقل" + hint };
  }
  var validIds = {};
  (settings.branches || []).forEach(function (b) { validIds[b.id] = true; });
  var unknown = branchesInput.filter(function (id) { return !validIds[String(id)]; });
  if (unknown.length) {
    return { ok: false, error: "معرّف فرع غير موجود ضمن الفروع الحالية: " + unknown.join(", ") };
  }
  // إزالة التكرار مع الحفاظ على الترتيب — لا يغيّر معنى النطاق، فقط ينظّف قيمة مُدخَلة مكرَّرة سهوًا.
  var seen = {}, clean = [];
  branchesInput.forEach(function (id) { var k = String(id); if (!seen[k]) { seen[k] = true; clean.push(k); } });
  return { ok: true, value: clean.join(",") };
}

/** تمثيل نصّي مختصر لنطاق فروع مخزَّن — لعرضه في سجل العمليات بصيغة قابلة للمقارنة قبل/بعد. */
function _branchScopeLabel(stored) {
  if (!stored) return "[]";
  if (stored === "ALL") return "ALL";
  return "[" + stored + "]";
}

function _actionAddEmployee(body) {
  var auth = _requireAuth(body, "manageEmployees"); if (!auth.ok) return auth;
  var d = body.data || {};
  if (!d.fullName || !d.username || !d.password || !d.role) return { ok: false, error: "الاسم الكامل واسم المستخدم وكلمة المرور والدور كلها إلزامية." };
  if (ROLES.indexOf(d.role) === -1) return { ok: false, error: "دور غير معروف: " + d.role };
  if (String(d.password).length < 8) return { ok: false, error: "كلمة المرور يجب ألا تقل عن 8 أحرف." };
  if (_findEmployeeRowIndex(d.username) !== -1) return { ok: false, error: "اسم المستخدم \"" + d.username + "\" مستخدَم بالفعل." };
  var settings = _readSettings();
  var branchRes = _resolveBranchAssignment(d.role, d.branches, settings);
  if (!branchRes.ok) return branchRes;
  var salt = _genSalt(), hash = _hashPassword(d.password, salt);
  var id = _nextEmployeeId();
  _sheet("الموظفون").appendRow([id, d.fullName, d.username, hash, salt, d.role, branchRes.value, "نشط",
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"), "", 0, ""]);
  _auditLog(auth.session ? auth.session.username : "system", "addEmployee", "نجاح", JSON.stringify({
    employeeId: id, username: d.username, role: d.role, branchScope: _branchScopeLabel(branchRes.value)
  }));
  return { ok: true, employeeId: id, message: "تم إضافة الموظف بنجاح." };
}

function _actionUpdateEmployee(body) {
  var auth = _requireAuth(body, "manageEmployees"); if (!auth.ok) return auth;
  var rowIdx = -1, rows = _readEmployeesRaw();
  for (var i = 0; i < rows.length; i++) if (rows[i][EMP_COLS.ID] === body.id) { rowIdx = i + 2; break; }
  if (rowIdx === -1) return { ok: false, error: "الموظف غير موجود: " + body.id };
  var d = body.data || {};

  // منع تصعيد الصلاحيات الذاتي: لا يمكن لأي مستخدم (حتى Administrator) تعديل دوره أو فروعه الخاصة
  // من هذه الشاشة — تعديل حساب الشخص لنفسه يمر دومًا، لكن تغيير الدور/نطاق الفروع يتطلب مسؤولًا آخر.
  if (auth.session && auth.session.employeeId === body.id && (d.role !== undefined || d.branches !== undefined)) {
    return { ok: false, error: "لا يمكنك تعديل دورك أو نطاق فروعك الخاص — يلزم مسؤول آخر لذلك." };
  }

  // ---- مرحلة التحقق بالكامل أولًا — بلا أي كتابة على الشيت بعد ----
  // ثغرة حقيقية كانت هنا: كل حقل كان يُكتَب فور المرور بشرطه (fullName ثم role ثم branches ثم
  // password)، فإن فشل التحقق من حقل لاحق (branches أو password) بعد نجاح حقل سابق (fullName/role)،
  // كانت الدالة تُرجع {ok:false} بينما التعديل الجزئي قد كُتب بالفعل فعليًا على الشيت — عملية "فاشلة"
  // ظاهريًا لكنها غيّرت بيانات حقيقية دون تسجيل نجاح ودون علم منفِّذ الطلب. أُصلحت بفصل كل التحقق قبل
  // أي setValue إطلاقًا: إما تنجح كل التعديلات المطلوبة معًا، أو لا يُكتب شيء إطلاقًا.
  var effectiveRole = rows[rowIdx - 2][EMP_COLS.ROLE];
  if (d.role !== undefined) {
    if (ROLES.indexOf(d.role) === -1) return { ok: false, error: "دور غير معروف: " + d.role };
    effectiveRole = d.role;
  }
  var settings = null, branchRes = null;
  if (d.branches !== undefined) {
    settings = _readSettings();
    branchRes = _resolveBranchAssignment(effectiveRole, d.branches, settings);
    if (!branchRes.ok) return branchRes;
  }
  if (d.password !== undefined) {
    if (String(d.password).length < 8) return { ok: false, error: "كلمة المرور يجب ألا تقل عن 8 أحرف." };
  }

  // ---- كل التحقق نجح — الآن فقط تبدأ الكتابة الفعلية ----
  var sh = _sheet("الموظفون");
  var oldRole = rows[rowIdx - 2][EMP_COLS.ROLE];
  var oldBranches = rows[rowIdx - 2][EMP_COLS.BRANCHES];
  if (d.fullName) sh.getRange(rowIdx, EMP_COLS.FULLNAME + 1).setValue(d.fullName);
  if (d.role !== undefined) sh.getRange(rowIdx, EMP_COLS.ROLE + 1).setValue(d.role);
  if (branchRes) sh.getRange(rowIdx, EMP_COLS.BRANCHES + 1).setValue(branchRes.value);
  if (d.password !== undefined) {
    var salt = _genSalt();
    sh.getRange(rowIdx, EMP_COLS.HASH + 1).setValue(_hashPassword(d.password, salt));
    sh.getRange(rowIdx, EMP_COLS.SALT + 1).setValue(salt);
  }

  // ---- سجل عمليات منظَّم: القيمة القديمة والجديدة لكل من الدور ونطاق الفروع فقط عند تغيّرهما فعليًا؛
  // كلمة المرور والـ hash/salt لا تظهر في السجل إطلاقًا مهما حدث. ----
  var changes = {};
  if (d.role !== undefined && d.role !== oldRole) changes.role = { oldValue: oldRole, newValue: d.role };
  if (branchRes && branchRes.value !== oldBranches) {
    changes.branchScope = { oldValue: _branchScopeLabel(oldBranches), newValue: _branchScopeLabel(branchRes.value) };
  }
  if (d.fullName && d.fullName !== rows[rowIdx - 2][EMP_COLS.FULLNAME]) changes.fullName = { oldValue: rows[rowIdx - 2][EMP_COLS.FULLNAME], newValue: d.fullName };
  if (d.password !== undefined) changes.password = "changed"; // لا قيمة فعلية إطلاقًا في السجل
  _auditLog(auth.session ? auth.session.username : "system", "updateEmployee", "نجاح",
    JSON.stringify({ employeeId: body.id, changes: changes }));
  return { ok: true, message: "تم تحديث بيانات الموظف بنجاح." };
}

function _actionToggleEmployee(body) {
  var auth = _requireAuth(body, "manageEmployees"); if (!auth.ok) return auth;
  var rowIdx = -1, rows = _readEmployeesRaw();
  for (var i = 0; i < rows.length; i++) if (rows[i][EMP_COLS.ID] === body.id) { rowIdx = i + 2; break; }
  if (rowIdx === -1) return { ok: false, error: "الموظف غير موجود: " + body.id };
  var newStatus = body.active ? "نشط" : "معطل";
  _sheet("الموظفون").getRange(rowIdx, EMP_COLS.STATUS + 1).setValue(newStatus);
  _auditLog(auth.session ? auth.session.username : "system", "toggleEmployee", "نجاح", body.id + " -> " + newStatus);
  return { ok: true, message: "تم تحديث حالة الموظف إلى: " + newStatus };
}

/* ---------------- إدارة الفروع ---------------- */
function _actionListBranches(body) {
  // ثغرة حقيقية كانت هنا: كل باقي عمليات إدارة الفروع (إضافة/تعديل اسم/تعطيل) تتحقق من
  // manageBranches، بينما "عرض" الفروع (بما فيها معرّفات الفروع الداخلية والفروع المعطَّلة —
  // وهي بيانات أوسع مما يُنشَر علنًا عبر settings/bootstrap) كانت بلا أي تحقق تفويض إطلاقًا.
  // تم إصلاحها لتُطابق بقية عمليات إدارة الفروع.
  var auth = _requireAuth(body, "manageBranches"); if (!auth.ok) return auth;
  var settings = _readSettings();
  return { ok: true, branches: settings.branches };
}

function _nextBranchId(settings) {
  var max = 0;
  (settings.branches || []).forEach(function (b) {
    var m = /BR-(\d+)/.exec(b.id || "");
    if (m) max = Math.max(max, Number(m[1]));
  });
  return "BR-" + String(max + 1).padStart(3, "0");
}

/** "الإعدادات" شيت مقسَّم لأقسام بالترتيب (قوائم ← الأهداف الرقابية ← فئات عمر الحالات المتأخرة).
 * إضافة فرع بـ appendRow() تضعه في آخر الشيت فعليًا (بعد كل الأقسام)، فيسيء _readSettings() تفسيره
 * كصف فئة عمر بدل صف قائمة — لذلك يجب إدراج صف الفرع الجديد قبل بداية قسم "الأهداف الرقابية" تحديدًا. */
function _listsSectionInsertRow() {
  var sh = _sheet("الإعدادات");
  var values = sh.getDataRange().getValues();
  for (var r = 1; r < values.length; r++) {
    if (values[r][0] === "الأهداف الرقابية") return r + 1; // رقم صف 1-based لهذا الصف نفسه
  }
  return sh.getLastRow() + 1; // احتياطي فقط إن لم يوجد القسم إطلاقًا
}

function _actionAddBranch(body) {
  var auth = _requireAuth(body, "manageBranches"); if (!auth.ok) return auth;
  var name = (body.name || "").trim();
  if (!name) return { ok: false, error: "اسم الفرع إلزامي." };
  var settings = _readSettings();
  if (settings.branches.some(function (b) { return b.name === name; })) {
    return { ok: false, error: "يوجد فرع بهذا الاسم بالفعل: " + name };
  }
  var id = _nextBranchId(settings);
  var sh = _sheet("الإعدادات");
  var insertAt = _listsSectionInsertRow();
  sh.insertRowBefore(insertAt);
  sh.getRange(insertAt, 1, 1, 4).setValues([["Branches", name, id, "نشط"]]);
  _auditLog(auth.session ? auth.session.username : "system", "addBranch", "نجاح", id + " / " + name);
  return { ok: true, branchId: id, message: "تم إضافة الفرع بنجاح." };
}

function _findBranchRowIndex(id) {
  var sh = _sheet("الإعدادات");
  var lastRow = sh.getLastRow();
  var values = sh.getRange(1, 1, lastRow, Math.max(4, sh.getLastColumn())).getValues();
  for (var r = 1; r < values.length; r++) {
    if (values[r][0] === "Branches" && String(values[r][2]) === String(id)) return r + 1;
  }
  return -1;
}

function _actionRenameBranch(body) {
  var auth = _requireAuth(body, "manageBranches"); if (!auth.ok) return auth;
  var newName = (body.name || "").trim();
  if (!newName) return { ok: false, error: "الاسم الجديد إلزامي." };
  var settings = _readSettings();
  if (settings.branches.some(function (b) { return b.name === newName && b.id !== body.id; })) {
    return { ok: false, error: "يوجد فرع آخر بهذا الاسم بالفعل: " + newName };
  }
  var rowIdx = _findBranchRowIndex(body.id);
  if (rowIdx === -1) return { ok: false, error: "الفرع غير موجود: " + body.id };
  // يُغيَّر اسم العرض فقط لهذا الصف في تاب "الإعدادات"؛ السجلات القديمة في التابات السبعة تحتفظ
  // بالاسم كما كان وقت إدخالها (لم يُعَد كتابتها) — التقارير التاريخية لا تتأثر ولا تُفقَد الروابط.
  _sheet("الإعدادات").getRange(rowIdx, 2).setValue(newName);
  _auditLog(auth.session ? auth.session.username : "system", "renameBranch", "نجاح", body.id + " -> " + newName);
  return { ok: true, message: "تم تعديل اسم الفرع. السجلات القديمة تبقى بالاسم السابق كما أُدخلت به وقتها." };
}

function _actionToggleBranch(body) {
  var auth = _requireAuth(body, "manageBranches"); if (!auth.ok) return auth;
  var rowIdx = _findBranchRowIndex(body.id);
  if (rowIdx === -1) return { ok: false, error: "الفرع غير موجود: " + body.id };
  var newStatus = body.active ? "نشط" : "معطل";
  _sheet("الإعدادات").getRange(rowIdx, 4).setValue(newStatus);
  _auditLog(auth.session ? auth.session.username : "system", "toggleBranch", "نجاح", body.id + " -> " + newStatus);
  return { ok: true, message: "تم تحديث حالة الفرع إلى: " + newStatus + ". لا تأثير على السجلات القديمة." };
}

/** نقطة الدخول عبر Backend لأداة معاينة هجرة الفروع — قراءة فقط، تتطلب manageBranches (Administrator
 * فقط حاليًا، بنفس صلاحية إضافة/تعديل الفروع) لأنها تكشف تفاصيل داخلية (معرّفات الفروع وأسماء غير
 * قابلة للربط) عبر كل التابات السبعة، وليست بيانات عامة. لا تُنفِّذ أي هجرة فعلية بحد ذاتها. */
function _actionMigrationPreviewBranches(body) {
  var auth = _requireAuth(body, "manageBranches"); if (!auth.ok) return auth;
  var report = _migrationPreviewBranches();
  _auditLog(auth.session ? auth.session.username : "system", "migrationPreviewBranches", "نجاح",
    "إجمالي=" + report.totals.total + " مرتبط=" + report.totals.linked + " غير مرتبط=" + report.totals.unlinked + " يحتاج مراجعة=" + report.totals.needsReview);
  return { ok: true, report: report };
}

function _actionAuditLog(body) {
  var auth = _requireAuth(body, "viewAuditLog"); if (!auth.ok) return auth;
  var sh = _sheetOrNull("_AuditLog");
  if (!sh) return { ok: true, entries: [] };
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return { ok: true, entries: [] };
  var rows = sh.getRange(2, 1, lastRow - 1, sh.getLastColumn()).getValues();
  var entries = rows.map(function (r) {
    return { at: r[0], username: r[1], action: r[2], result: r[3], details: r[4], branchIds: (r[5] || "").toString() };
  });
  // نطاق "own" (Senior Auditor/Auditor/Audit Viewer المقيَّدون بفرع): يرى فقط عمليات فروعه — عمليات لا تخص فرعًا بعينه (دخول/خروج/إدارة
  // موظفين/فروع) لا تظهر له إطلاقًا لأنها ليست "سجلات عمليات فرعه" أصلًا.
  if (auth.session && _branchScope(auth.session.role) === "own" && auth.session.branches !== "ALL") {
    var allowed = auth.session.branches || [];
    entries = entries.filter(function (e) {
      if (!e.branchIds) return false;
      var ids = e.branchIds.split(",");
      return ids.some(function (id) { return allowed.indexOf(id) !== -1; });
    });
  }
  entries.reverse(); // الأحدث أولًا
  return { ok: true, entries: entries.slice(0, 500) };
}
