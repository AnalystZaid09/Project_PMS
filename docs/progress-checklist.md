# PMS Implementation Progress Checklist

| Phase | Description | Status | Deliverables & Exit Criteria |
|---|---|---|---|
| **Phase 0** | Discovery and Project Foundation | ✅ **Completed** | Repo structure, React+Vite+TS+Tailwind, FastAPI+SQLAlchemy, Docker Compose, Env, Health Check |
| **Phase 1** | Authentication, Org, Branches & RBAC | ✅ **Completed** | JWT Auth, Org/Branch scoping, Users, Roles, Permissions matrix, Protected routes, RBAC tests (15/15 passed) |
| **Phase 2** | Master Data Management | ✅ **Completed** | Departments, Cities, Categories, Doctors, Tariffs, Investigations, Charges, Templates (27/27 tests passed) |
| **Phase 3** | Patient & Case Workflow | 📋 Planned | Patient registration, duplicate check, Case wizard, service items, symptoms |
| **Phase 4** | Billing & Financial Registers | 📋 Planned | Server-side invoice calc, receipts, split payments, refunds, cash/bank ledgers |
| **Phase 5** | Reports & Verification Workflow | 📋 Planned | Template editor, review/finalize lifecycle, versioning, branded PDF |
| **Phase 6** | Analytics, Communication & Audit | 📋 Planned | Dashboard KPIs, internal chat, email templates, audit trail |
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
