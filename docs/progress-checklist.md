# PMS Implementation Progress Checklist

| Phase | Description | Status | Deliverables & Exit Criteria |
|---|---|---|---|
| **Phase 0** | Discovery and Project Foundation | ✅ **Completed** | Repo structure, React+Vite+TS+Tailwind, FastAPI+SQLAlchemy, Docker Compose, Env, Health Check |
| **Phase 1** | Authentication, Org, Branches & RBAC | ✅ **Completed** | JWT Auth, Org/Branch scoping, Users, Roles, Permissions matrix, Protected routes, RBAC tests (15/15 passed) |
| **Phase 2** | Master Data Management | ✅ **Completed** | Departments, Cities, Categories, Doctors, Tariffs, Investigations, Charges, Templates (27/27 tests passed) |
| **Phase 3** | Patient & Case Workflow | ✅ **Completed** | Duplicate check, Patient Profile & Timeline, 5-Step Case Wizard, Tariffs, Ancillary Charges, Case Register (35/35 tests passed) |
| **Phase 4** | Billing & Financial Registers | ✅ **Completed** | Server-side invoice calc, receipts, split payments, refunds, cash/bank ledgers, charges reports (45/45 tests passed) |
| **Phase 5** | Reports & Verification Workflow | ✅ **Completed** | Clinical editor, hierarchical template tree, multi-status lifecycle, versioning, branded report print, referring & reporting doctor reports (54/54 tests passed) |
| **Phase 6** | Analytics, Communication & Audit | ✅ **Completed** | Real-time executive dashboard, SVG analytics charts, internal staff chat, in-app notification center, direct email dispatcher, enhanced audit trail (62/62 tests passed) |
| **Phase 7** | Backup, Hardening & Deployment | 📋 Planned | Backup/restore script, security audit, E2E tests, production containerization |

---

## Phase 0 & Phase 1 Detailed Checklist

### Phase 0: Project Foundation
- [x] Reference screenshots reviewed and catalogued (`PMS.zip` / `PMS/` directory, 46 screenshots).
- [x] Architecture blueprint and planned file structure documented in `docs/architecture.md`.
- [x] Comprehensive database schema documented in `docs/database-schema.md`.
- [x] Open clinical and operational questions catalogued in `docs/open-questions.md`.
- [x] Backend FastAPI application with SQLAlchemy 2, Pydantic v2, CORS, and health endpoints.
- [x] Frontend React + TypeScript + Vite + Tailwind CSS + shadcn/ui components configured and compiled.
- [x] Docker Compose environment (`docker-compose.yml`) for PostgreSQL 16, backend, frontend, and redis.
- [x] Environment configuration templates (`.env.example`).
- [x] Phase 0 test verification (Backend health check, DB connection).

### Phase 1: Authentication, Organization, Branches & RBAC
- [x] Organization & Branch database entities and scoping rules (`Organization`, `Branch`).
- [x] User, Role, Permission, UserBranchAccess, Session, and AuditLog data models.
- [x] Granular RBAC permission enforcement middleware (`require_permission`, `require_branch_access`).
- [x] Authentication endpoints: `/login`, `/me`, `/switch-branch`, `/change-password`, `/logout`.
- [x] Organization & Branch endpoints: list, create, update, deactivate, switch active branch (`/branches`).
- [x] User & Role endpoints: user management, role assignment, permissions matrix (`Permission.png`).
- [x] Audit logging engine for login, user creation, role changes, and data modifications (`AuditLog`).
- [x] Synthetic seed data: Default organization, 5 branches, 9 roles, and seed users with distinct roles.
- [x] Frontend modern healthcare SaaS layout:
  - Collapsible sidebar with role-aware navigation
  - Top header with active branch switcher (`3. Apex Kampala Medical Centre`), user profile, theme toggle
  - Login screen with synthetic demo account auto-selector
  - User management screen (`/admin/users`) with search, role badges, active toggle (`Users.png`)
  - Roles & Permissions screen (`/admin/permissions`) with granular permission matrix (`Permission.png`)
  - Branches screen (`/admin/branches`) with search, export, active toggle (`Branch.png`)
  - General Settings screen (`/admin/settings`) with App Name, logo, favicon (`general_settings.png`)
  - Audit activity logs screen (`/admin/audit-logs`) (`nineth_tab_user_activity.png`)
- [x] Automated tests (15/15 passed):
  - Receptionist forbidden from viewing admin endpoints (Users, Roles, Settings)
  - Admin authorized to manage users, branches, and permissions
  - Password hashing and JWT security
  - Login success and rejection on invalid credentials
  - Database connectivity and health check

### Phase 2: Master Data Management
- [x] Reference screenshot inspection and user journey mappings:
  - `PMS/Third_Tab/Department.png` -> Departments master management
  - `PMS/Third_Tab/City.png` -> City and location master management
  - `PMS/Third_Tab/Doctor_Category.png` & `Category.png` -> Doctor categories master
  - `PMS/Third_Tab/Pateint_Master.png` / Blueprint -> Patient categories & tariff discounts
  - `PMS/Third_Tab/Add_New.png` -> Complete doctor registration directory
  - `PMS/Third_Tab/Add_Refer_Doctor.png` & `Add_Reporting_Doctor.png` -> Doctor tariff & investigation commission charts
  - `PMS/Third_Tab/Investigation_Master.png` -> Investigation & test catalogue
  - `PMS/Third_Tab/Investigation_Charges.png` -> Branch-specific pricing overrides
  - `PMS/Third_Tab/email_template.png` -> Dynamic token email templates
  - Blueprint Master Data Section 5.10 -> Other charge types (Ancillary fees)
  - Blueprint Section 3 -> Department report templates
- [x] Relational Database Modelling & Alembic Migrations:
  - Created `002_master_data.py` Alembic migration covering all 12 master entities.
  - Organization multi-tenancy scoping enforced on every master table.
  - Referential integrity safety: prevented destructive deletion when records are referenced by doctors, investigations, or cases; prompted deactivation instead.
- [x] Comprehensive Backend API Endpoints (`/api/v1`):
  - `/departments` (GET, POST, PUT, DELETE, PATCH toggle-status)
  - `/cities` (GET, POST, PUT, DELETE, PATCH toggle-status)
  - `/patient-categories` (GET, POST, PUT, DELETE, PATCH toggle-status)
  - `/doctor-categories` (GET, POST, PUT, DELETE, PATCH toggle-status)
  - `/doctors` (GET, POST, PUT, DELETE, PATCH toggle-status, filter by `doctor_type`, `department_id`, `category_id`)
  - `/doctor-rates` (GET, POST, DELETE per investigation rates)
  - `/investigations` (GET, POST, PUT, DELETE, PATCH toggle-status, filter by `department_id`, `category_id`)
  - `/investigation-charges` (GET, POST, DELETE branch price overrides)
  - `/other-charges` (GET, POST, PUT, DELETE, PATCH toggle-status)
  - `/email-templates` (GET, POST, PUT, DELETE, PATCH toggle-status)
  - `/report-templates` (GET, POST, PUT, DELETE, PATCH toggle-status)
- [x] Synthetic Development Data Seeding:
  - Enriched `backend/app/db/seed.py` with 8 cities, 6 departments, 5 patient categories, 6 doctor categories, 6 doctors with credentials, 6 investigation categories, 10 diagnostic investigations with prices and TATs, branch tariffs, doctor rates, 5 other charge types, 3 email templates, and 3 report templates.
- [x] Production Frontend Master Screens (`frontend/src/features/masters/`):
  - `DepartmentsPage.tsx`
  - `CitiesPage.tsx`
  - `PatientCategoriesPage.tsx`
  - `DoctorCategoriesPage.tsx`
  - `DoctorsPage.tsx`
  - `DoctorRatesPage.tsx`
  - `InvestigationsPage.tsx`
  - `InvestigationChargesPage.tsx`
  - `OtherChargesPage.tsx`
  - `EmailTemplatesPage.tsx`
  - `ReportTemplatesPage.tsx`
  - Every screen features: responsive layout, search filter, page size selector, CSV/Excel export, active/inactive switch, add/edit modal dialog with validation, deletion confirmation, and loading/empty/error states.
- [x] Routing & Navigation:
  - Integrated all master routes in `frontend/src/routes/AppRoutes.tsx` with RBAC permissions.
  - Expanded sidebar navigation in `frontend/src/layouts/Sidebar.tsx` under "Services & Tests" and "Master Data".
- [x] Automated Acceptance & Unit Testing:
  - Automated tests in `backend/tests/test_masters.py` covering CRUD, duplicates, tariff rates, branch prices, and RBAC rejection.
  - Overall test suite: **27 passed** (100% pass rate).
  - TypeScript & Vite build: **0 errors** (`dist` bundle generated in 35s).

---

### Phase 3: Patient & Case Workflow
- [x] Reference Screenshot Mappings & Clinical Requirements:
  - `PMS/New_Patentient/New_Patient.png` -> Step 1: Referring Doctor, City, Faculty/Specialty filter, Patient Selection.
  - `PMS/New_Patentient/Investigation.png` -> Step 2: Investigation & Price Calculation, Regular vs Emergency tariffs, Patient Category discount, Department filter, Live tariff calculation.
  - `PMS/New_Patentient/Reporting_Doctor.png` -> Step 3: Reporting Doctor assignment (Radiologist, Pathologist, Consulting Physician, Specialists).
  - `PMS/New_Patentient/Other_Charges.png` -> Step 4: Ancillary Charges (Disposables, Contrast media, Sterile Syringes, Procedural Fees).
  - `PMS/New_Patentient/Symtoms.png` -> Step 5: Clinical Symptoms, Prescribing Notes, Priority (Normal, Urgent, Emergency), Final Summary & Registration.
  - `PMS/New_Patentient/Patient_Record.png` & `PMS_Patient_Registration.png` -> Patient cases list, date range filters, search, Excel export, status badges, case breakdown modal.
- [x] Relational Database Modelling & Alembic Migrations:
  - Authored `003_patient_and_case.py` Alembic migration.
  - Updated `Patient`: `age`, `blood_group`, `national_id`.
  - Updated `Case`: `radiologist_id`, `pathologist_id`, `physician_id`, `other_doctor_id`, `total_charges`, `discount_total`, `tax_total`, `net_amount`, `case_category` (`regular`/`emergency`), `patient_category_id`, `created_by_id`.
  - Updated `CaseItem`: `quantity`.
  - Created `CaseOtherCharge`: Ancillary procedural line items.
- [x] Backend API Endpoints (`backend/app/api/v1/patients.py` & `backend/app/api/v1/cases.py`):
  - `POST /patients/check-duplicates`: Warning check for matches on phone, full name, or DOB without silently merging records.
  - `GET /patients`: List patients with multi-field search (UHID, name, phone, city) and branch scoping.
  - `POST /patients`: Register patient with auto-generated unique UHID (`APX-PAT-YYYYMMDD-XXXX`), age computation, and audit logging.
  - `GET /patients/{id}`: Detailed demographics.
  - `PUT /patients/{id}`: Update demographics and contact information.
  - `GET /patients/{id}/profile`: Patient profile with visit counters, cumulative billing, and chronological timeline of clinical encounters.
  - `GET /cases/stats/summary`: Case counters (total today, emergency cases, pending reports, completed cases, today's revenue).
  - `GET /cases`: Clinical cases register with date range filter, search, branch filter, doctor filter, and status filter.
  - `POST /cases`: 5-step case registration wizard with server-side price calculation, branch tariffs, patient category discounts, ancillary charges, draft report stubs, and audit logging.
  - `GET /cases/{id}`: Full case breakdown with line-item test prices, ancillary charges, and assigned doctors.
  - `PUT /cases/{id}`: Update case priority, notes, doctor assignments, or status.
  - `DELETE /cases/{id}`: Case cancellation guard preventing deletion if clinical reports have already been finalized or payments recorded.
- [x] Synthetic Clinical Seed Data:
  - Seeded 5 diverse synthetic patients (`Rajesh Mehta`, `Ananya Deshmukh`, `Kavita Iyer`, `Aditya Verma`, `Sunil Patil`) with blood groups, contact details, and category associations.
  - Seeded 5 clinical cases spanning Pathology and Radiology departments with calculated net tariffs and draft report containers.
- [x] Frontend Clinical SaaS Screens (`frontend/src/features/patients/`):
  - `CasesListPage.tsx`: Quick statistics cards, date range picker, search, status filter, export to CSV, case breakdown modal preview, cancel case modal dialog.
  - `CaseRegistrationWizard.tsx`: 5-step interactive stepper with live patient search/inline registration, referring doctor filters, investigation catalogue with live price math and category discounts, reporting doctor assignments, ancillary charges table, priority level, clinical notes, and registration success screen with print slip actions.
  - `PatientsListPage.tsx`: Patient directory with search, CSV export, view timeline, and book case shortcuts.
  - `PatientRegistrationModal.tsx`: Real-time duplicate warning alert banner with "Use This Patient" or "Acknowledge Separate Patient" options.
  - `PatientProfilePage.tsx`: Patient overview card, cumulative billing stats, interactive vertical clinical timeline, and case history table.
- [x] Routing & Navigation:
  - Mounted `/cases`, `/cases/new`, `/patients`, `/patients/:id` with permission gates in `frontend/src/routes/AppRoutes.tsx`.
  - Updated `Sidebar.tsx` navigation under "Patients & Cases" and "Registers".
- [x] Automated Acceptance & Unit Testing:
  - 8 automated tests in `backend/tests/test_patients_cases.py` verifying duplicate checks, UHID generation, server calculation math, date filters, timeline events, and cancellation guards.
  - Total test suite: **35 passed** (100% pass rate).
  - TypeScript & Vite build: **0 errors** cleanly bundled in production mode.

---

### Phase 4: Billing & Financial Registers
- [x] Reference Screenshot Mappings & Requirements:
  - `PMS/Fourth_Tab/case_register.png` -> Case Register screen with chronological case transactions, receipt numbers, patient names, charges, date range filters, export to Excel, and summary footer (`COUNT = <n>`, `SUM = <total>`).
  - `PMS/Fourth_Tab/bank_register.png` -> Bank Register screen with serial numbers, dates, cheque numbers, particulars, amounts, debit/credit flow, regular/emergency badges, cash/cheque indicators, remarks, add modal, and summary footer (`COUNT`, `CREDIT`, `DEBIT`, `NET`).
  - `PMS/Fourth_Tab/expense_register.png` -> Expense Register screen with operating expense vouchers, vendor bills, utility payments, due/paid status, add modal, and summary footer (`COUNT`, `SUM`).
  - `PMS/Fourth_Tab/petty_cash.png` -> Petty Cash Register screen with daily petty cash float, supplies, conveyance reimbursements, credit/debit indicators, add modal, and summary footer (`COUNT`, `CREDIT FLOAT`, `DEBIT OUTFLOW`, `NET BALANCE`).
  - `PMS/Fourth_Tab/date_wise_register.png` -> Date Wise Register screen with daily total reconciliation, case count, sequential start and end receipt numbers (`START AT`, `RECEIPTNOEND`), date range filters, export to Excel, and summary footer.
  - `PMS/Second_Tab/Charges_Report.png` -> Charges Report with date filters, Department dropdown, Faculty/Doctor dropdown, Misc checkbox, printable view, and export to Excel.
  - `PMS/Second_Tab/Other_Charges_Report.png` -> Other Charges Report with date filters, Category dropdown, printable view, and export to Excel.
  - Core Blueprint Billing Section -> Automated invoice creation upon case registration, server-side tariff computation, split payment collection (Cash, Card, UPI, Cheque, Bank Transfer), receipts generation (`APX-REC-YYYYMMDD-XXXX`), partial payments, and refund processing.
- [x] Relational Database Modelling & Alembic Migrations:
  - Authored `004_billing_and_finance.py` Alembic migration.
  - Updated `Invoice` and `Payment` models with structured financial fields.
  - Extended `FinancialRegister` model with `serial_no`, `transaction_date`, `cheque_no`, `particulars`, `amount`, `direction`, `debit_or_credit`, `regular_or_emergency`, `by_cash_or_cheque`, `due_or_paid`, `patient_name`, `case_number`, `receipt_number`, and `remark`.
  - Sequential unique generators: `generate_invoice_number` (`APX-INV-YYYYMMDD-XXXX`) and `generate_receipt_number` (`APX-REC-YYYYMMDD-XXXX`).
- [x] Backend API Endpoints (`backend/app/api/v1/billing.py`, `registers.py`, `reports.py`):
  - `GET /invoices`: Invoices list with search (invoice #, case #, patient, UHID), status filter, and date filters.
  - `GET /invoices/{id}`: Full invoice details with itemized investigations, ancillary charges, and payment receipt history.
  - `GET /invoices/by-case/{case_id}`: Look up invoice by clinical case ID.
  - `GET /invoices/summary/stats`: Executive KPI metrics (Total Invoices, Paid, Unpaid, Partial, Total Billed, Total Collected, Total Due).
  - `POST /invoices/{id}/payments`: Server-side payment collection with balance updates, receipt generation, and append-only financial ledger logging (case and bank registers).
  - `POST /invoices/{id}/refund`: Controlled patient refunds with validation against collected amounts, reason requirement, and audit trails.
  - `GET /registers/case`: Chronological case register with aggregated count and charge totals.
  - `GET /registers/bank` & `POST /registers/bank`: Bank register read and manual voucher creation.
  - `GET /registers/expense` & `POST /registers/expense`: Operational expense register and voucher creation.
  - `GET /registers/petty-cash` & `POST /registers/petty-cash`: Petty cash register with float replenishment and disbursement tracking.
  - `GET /registers/date-wise`: Daily aggregated collections with starting and ending receipt numbers.
  - `GET /reports/charges`: Investigation revenue partitioned by faculty and department.
  - `GET /reports/other-charges`: Ancillary charge collections by category.
- [x] Synthetic Seed Data:
  - Pre-seeded 5 clinical invoices matching the registered cases.
  - Seeded payments (cash, UPI, card) with generated receipt numbers.
  - Seeded bank register deposits and clearing entries.
  - Seeded operational expense vouchers (biomedical waste disposal, clinical gloves/consumables, equipment calibration, generator diesel, facility maintenance).
  - Seeded petty cash disbursements and float top-ups.
- [x] Production Frontend Financial SaaS Screens:
  - `InvoicesListPage.tsx` (`/billing` & `/billing/payments`): KPI cards, search, date range filters, status badges, payment collection modal with mode selection, refund modal with validation, and printable tax invoice & receipt preview dialog with "Apex Health Diagnostics" branding.
  - `CaseRegisterPage.tsx` (`/registers/case`): Exact layout of `case_register.png` with date filters, search, Excel export, and summary footer.
  - `BankRegisterPage.tsx` (`/registers/bank`): Exact layout of `bank_register.png` with Add Entry modal, direction filters, Excel export, and summary footer.
  - `ExpenseRegisterPage.tsx` (`/registers/expense`): Exact layout of `expense_register.png` with Add Voucher modal, due/paid status, Excel export, and summary footer.
  - `PettyCashPage.tsx` (`/registers/petty-cash`): Exact layout of `petty_cash.png` with Add Entry modal, flow filters, Excel export, and summary footer.
  - `DateWiseRegisterPage.tsx` (`/registers/date-wise`): Exact layout of `date_wise_register.png` with date range filters, daily totals, start/end receipts, Excel export, and summary footer.
  - `ChargesReportPage.tsx` (`/reports/charges`): Exact layout of `Charges_Report.png` with department filter, doctor filter, misc filter, print trigger, and Excel export.
  - `OtherChargesReportPage.tsx` (`/reports/other-charges`): Exact layout of `Other_Charges_Report.png` with category filter, print trigger, and Excel export.
  - `exportUtils.ts`: Excel-compatible CSV export helper with UTF-8 BOM.
- [x] Routing & Navigation:
  - Mounted all billing, registers, and reports routes in `frontend/src/routes/AppRoutes.tsx` with RBAC permissions (`financial_registers:view`, `charges_report:view`, `other_charges_report:view`).
  - Updated `Sidebar.tsx` navigation under "Billing & Finance", "Registers", and "Reports & Analytics".
- [x] Automated Acceptance & Unit Testing:
  - 10 automated backend tests in `backend/tests/test_billing_registers.py` verifying invoice auto-creation, payment collection, receipts, refund guards, register aggregation math, date-wise receipt ranges, and charges reports.
  - Total test suite: **45 passed** (100% pass rate in 30.73s).
  - TypeScript & Vite build: **0 errors** cleanly bundled in production mode.

---

### Phase 5: Reports & Verification Workflow
- [x] Reference Screenshot Mappings & Requirements:
  - `PMS/New_Patentient/Patient_Report.png`, `Patient_Report_Main.png`, `Pateint_Report_Main2.png`, `Pateint_Report_Main3.png` -> Clinical Report Editor with hierarchical template tree library (Radiology, Sonogram, CT, MRI, Pathology), patient demographics banner, email dispatch, scan attachments with thumbnail preview cards, case investigations table, formatting toolbar, findings textarea, impression, recommendations, and status workflow transitions.
  - `PMS/Fifth_Tab/refering_doctor_report.png` -> Referring Doctor Report with sub-tabs ("Referring Doctor" / "All Doctor's"), Category, Doctor, Department, date filters, Commission calculated toggle, Print, Export to Excel, and summary footer (`TOTAL CASES`, `TOTAL BILLED`, `TOTAL COMMISSION`).
  - `PMS/Fifth_Tab/report_doctor_report.png` -> Reporting Doctor Report with sub-tabs ("Reporting Doctor" / "All Doctor's"), Category, Doctor, Department, date filters, Print, Export to Excel, and summary footer (`TOTAL CASES`, `TOTAL BILLED`, `TOTAL REPORTING FEES`).
  - Branded Diagnostic Report (`ReportPrintPreviewModal.tsx`) -> Clinic letterhead ("Apex Health Diagnostics"), patient demographics, findings, impression, recommendations, attachment thumbnails, doctor digital signature verification block, safety disclaimers, and print action.
  - Clinical Reports Directory & Worklist (`ClinicalReportsListPage.tsx`) -> KPI counters (Total, Draft, Submitted, Verified, Finalized, Amended), department and date filters, data table with direct editor and print preview actions.
- [x] Relational Database Modelling & Alembic Migrations:
  - Authored `005_clinical_reports_workflow.py` Alembic migration.
  - Extended `ClinicalReport` model with `case_id`, `report_number`, `report_name`, `report_heading`, `findings_text`, `impression`, `recommendation`, `verification_remarks`, `digital_signature`, `patient_email`.
  - Extended `ReportVersion` with complete snapshot fields (`report_name`, `report_heading`, `findings_text`, `impression`, `recommendation`).
  - Created `ReportAttachment` model for scan/image uploads.
  - Sequential unique generator: `generate_report_number` (`APX-REP-YYYYMMDD-XXXX`).
- [x] Multi-Status Clinical Governance Lifecycle:
  - Enforced transitions: `draft` -> `submitted` -> `verified` (doctor) -> `finalized` (doctor lock + digital sign-off) -> `amended` (addendum version with explicit medical change reason).
  - Prohibited automated AI diagnostic finalization: reports require mandatory human specialist review.
  - Finalized lock guard: reports marked finalized cannot be directly edited; subsequent edits require creating a versioned amendment with clinical reasoning.
  - Auto-case completion: when all clinical reports for a case are finalized, the case status is automatically advanced to `completed`.
- [x] Backend API Endpoints (`backend/app/api/v1/clinical_reports.py` & `reports.py`):
  - `GET /clinical-reports/summary/stats`: Executive counters for draft, submitted, verified, finalized, and amended reports.
  - `GET /clinical-reports`: Clinical reports worklist with filters by department, status, date range, and search.
  - `GET /clinical-reports/{id}` & `GET /clinical-reports/by-case/{case_id}`: Comprehensive report details including version history snapshots and scan attachments.
  - `POST /clinical-reports` & `PUT /clinical-reports/{id}`: Create and edit draft reports.
  - `POST /clinical-reports/{id}/submit`: Advance report to submitted review status.
  - `POST /clinical-reports/{id}/verify`: Doctor verification with clinical remarks.
  - `POST /clinical-reports/{id}/finalize`: Doctor finalization and digital lock with cryptographic sign-off flag.
  - `POST /clinical-reports/{id}/amend`: Create amendment addendum with version increment and audit logging.
  - `POST /clinical-reports/{id}/attachments` & `DELETE /clinical-reports/{id}/attachments/{att_id}`: Manage diagnostic scan attachments.
  - `POST /clinical-reports/{id}/send-email`: Dispatch verified/finalized diagnostic report notification to patient/doctor email.
  - `GET /reports/referring-doctor`: Referring doctor commission report.
  - `GET /reports/reporting-doctor`: Reporting doctor tariff and fee audit report.
- [x] Synthetic Clinical Seed Data:
  - Seeded clinical reports across diverse modalities (Ultrasound Abdomen & Pelvis, Digital Chest X-Ray PA View, Complete Blood Count with ESR, Liver Function Test, CT Brain Non-Contrast).
  - Seeded version history snapshots and sample diagnostic scan attachments.
- [x] Production Frontend Clinical SaaS Screens:
  - `PatientReportEditorPage.tsx` (`/reports/editor/:id`): Clinical report workstation matching `Patient_Report.png` and variants.
  - `ClinicalReportsListPage.tsx` (`/reports/clinical`): Worklist directory with KPI status cards and quick navigation.
  - `ReferringDoctorReportPage.tsx` (`/reports/referring-doctor`): Matching `refering_doctor_report.png`.
  - `ReportingDoctorReportPage.tsx` (`/reports/reporting-doctor`): Matching `report_doctor_report.png`.
  - `ReportPrintPreviewModal.tsx`: Branded printable letterhead with digital doctor signature stamp and safety notices.
- [x] Routing & Navigation:
  - Mounted `/reports/clinical`, `/reports/editor/:id`, `/reports/referring-doctor`, and `/reports/reporting-doctor` in `frontend/src/routes/AppRoutes.tsx`.
  - Updated `Sidebar.tsx` navigation under "Reports & Analytics".
- [x] Automated Acceptance & Unit Testing:
  - 9 automated backend tests in `backend/tests/test_clinical_reports.py` verifying draft updates, submit/verify/finalize transitions, finalized lock rejection, amendment versioning, and email dispatch.
  - Total test suite: **54 passed** (100% pass rate in 12.50s).
  - TypeScript & Vite build: **0 errors** cleanly bundled in production mode (`dist/assets/index-*.js`).

---

### Phase 6: Analytics, Communication & Audit
- [x] Reference Screenshot Mappings & Requirements:
  - `PMS_Dashboard.png` & `PMS/Third_Tab/graph.png` -> Real-time executive clinical dashboard with period filtering (Today, This Week, This Month, All Time), 3 major KPI cards (Registration, Reports, Revenue) with sub-card filters, quick metrics strip (Unique Patients, Emergency Cases, Pending Sign-offs, Cumulative Revenue), 14-day interactive SVG Revenue & Collections Velocity Chart with hover tooltips, Department Workload & Revenue Distribution bar visualization, Emergency Cases in progress action queue, and Pending Doctor Verifications queue.
  - `PMS/seventh_tab_chat.png` -> Internal Clinical Team Messenger with channels (`#general`, `#clinical-updates`, `#billing`), colleague direct messages (DMs) with real-time online presence dots and unread counters, message stream with avatar circles, sender role badges, timestamps, case reference pill tags (`#APX-CAS-...`), clinical case tagging helper, and reactive 5-second polling synchronization.
  - `PMS/Third_Tab/send_email.png` & `email_template.png` -> Direct Email Dispatcher modal with template selection, dynamic variable interpolation (`{{patient_name}}`, `{{case_number}}`, `{{report_number}}`), recipient email validation, subject and body preview, and Outbound Email Logs page (`EmailLogsPage.tsx`) tracking transmission records with status badges (`sent`, `delivered`, `failed`).
  - `PMS/nineth_tab_user_activity.png` -> Advanced Compliance Audit Trail (`AuditLogsPage.tsx`) with domain summary cards (Total Events, User Logins, Clinical Events, Financial Logs, Master Changes), multi-field filters (Operator User, Action Category, Target Entity, Date From, Date To, Search keyword), and interactive state mutation diff modal inspecting structured JSON before/after snapshots.
  - Real-time In-App Notification Center (`Header.tsx`) -> Interactive bell icon displaying unread badge count, notification dropdown with alert type icons (urgent, clinical, info), direct link navigation, and single/all mark-as-read actions.
- [x] Relational Database Modelling & Alembic Migrations:
  - Authored `006_analytics_communication_audit.py` Alembic migration.
  - Created `ChatMessage` model (organization, branch, sender, recipient, channel, content, case_id, report_id, is_read).
  - Created `Notification` model (organization, user_id, title, message, notification_type, link_url, is_read).
  - Created `EmailLog` model (organization, branch, sender_id, recipient_email, recipient_name, subject, body, template_id, case_id, report_id, status, error_message).
  - Exported all models in `backend/app/models/__init__.py`.
- [x] Backend API Endpoints (`backend/app/api/v1/analytics.py`, `chat.py`, `notifications.py`, `emails.py`, `audit_logs.py`):
  - `GET /analytics/dashboard`: Aggregated executive KPIs, 14-day revenue/collection trends, department distribution, priority breakdown, top investigations, emergency queue, and pending verifications.
  - `GET /chat/channels`: Available team channels with unread status and latest message snippets.
  - `GET /chat/users`: Colleague directory with online status and unread counters for 1-to-1 DMs.
  - `GET /chat/messages`: Fetch conversation stream for a channel or colleague DM thread.
  - `POST /chat/messages`: Send team chat message with optional case/report reference and automatic DM notification generation.
  - `POST /chat/mark-read`: Mark thread messages as read.
  - `GET /notifications`: Fetch user notification feed and unread count.
  - `POST /notifications/{id}/read` & `POST /notifications/read-all`: Mark notification(s) as read.
  - `GET /emails/logs`: List outbound email records with date range and status filters.
  - `POST /emails/send`: Direct email dispatcher with address validation and audit logging.
  - `GET /audit-logs/stats`: Domain breakdown counters for compliance inspection.
  - `GET /audit-logs`: Advanced multi-field filtered activity log search.
- [x] Synthetic Development Data Seeding:
  - Enriched `backend/app/db/seed.py` with Phase 6 permissions (`analytics:view`, `chat:view`, `chat:send`, `send_email:view`, `send_email:send`).
  - Seeded sample team chat messages across `#general`, `#clinical-updates`, `#billing`, and direct staff DMs.
  - Seeded emergency case and report review notifications.
  - Seeded sample outbound patient email notifications.
- [x] Production Frontend SaaS Screens:
  - `DashboardPage.tsx` (`/dashboard`): Dynamic executive analytics workstation matching `PMS_Dashboard.png` and `graph.png`.
  - `InternalChatPage.tsx` (`/communication/chat`): Team messenger matching `seventh_tab_chat.png`.
  - `SendEmailModal.tsx` & `EmailLogsPage.tsx` (`/communication/emails`): Email dispatcher and logs matching `send_email.png`.
  - `AuditLogsPage.tsx` (`/admin/audit-logs`): Upgraded audit trail matching `nineth_tab_user_activity.png`.
  - `Header.tsx`: Real-time notification bell and alert popover.
- [x] Routing & Navigation:
  - Mounted `/communication/chat` and `/communication/emails` in `frontend/src/routes/AppRoutes.tsx`.
  - Added "Communication" section in `Sidebar.tsx`.
- [x] Automated Acceptance & Unit Testing:
  - 8 automated backend tests in `backend/tests/test_analytics_communication_audit.py` verifying dashboard analytics calculations, channel/DM messaging, notification lifecycles, email validation and logging, and audit stats.
  - Total test suite: **62 passed** (100% pass rate in 14.51s).
  - TypeScript & Vite build: **0 errors** cleanly bundled in production mode (`dist/assets/index-*.js`).
