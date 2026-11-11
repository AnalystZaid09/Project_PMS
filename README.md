# Patient Management System (PMS)

A modern, secure, enterprise-grade healthcare SaaS platform for clinics, hospitals, diagnostic labs, and multi-branch healthcare organizations. Built in accordance with `PMS-APPLICATION-BLUEPRINT.md` and informed by the operational workflows from the PMS screenshot reference library.

---

## 1. Technology Choices

| Layer | Technology | Purpose & Rationale |
|---|---|---|
| **Frontend** | React 18 + TypeScript + Vite | Component-based, typed UI with instant HMR and build performance |
| **Styling** | Tailwind CSS + shadcn/ui tokens | Clean healthcare design tokens, accessible components, responsive layouts |
| **State & Data** | TanStack Query + React Hook Form + Axios | Reliable server-state caching and form validation |
| **Backend** | Python 3.10+ + FastAPI | High-performance asynchronous REST API, OpenAPI docs, typed Pydantic v2 schemas |
| **ORM & Migrations**| SQLAlchemy 2.0 + Alembic | Relational integrity, declarative models, and schema migrations |
| **Database** | PostgreSQL 16 (production/docker) & SQLite (zero-config local dev) | ACID compliance, JSONB auditing, transactional safety |
| **Authentication** | JWT Bearer Tokens + Passlib (Bcrypt) | Stateless cryptographically signed sessions with claims |
| **Infrastructure** | Docker + Docker Compose | One-command containerized local development and production deployment |

---

## 2. Roadmap & Current Implementation Status

| Phase | Description | Status | Reference Screenshots | Exit Criteria |
|---|---|---|---|---|
| **Phase 0** | Discovery & Project Foundation | ✅ **Completed** | Blueprint, `PMS_Dashboard.png` | Backend + Frontend build, DB connected, health endpoint verified |
| **Phase 1** | Auth, Org, Branches & RBAC | ✅ **Completed** | `Users.png`, `Permission.png`, `Branch.png`, `general_settings.png` | Granular RBAC, branch isolation, protected routes, all tests passing (15/15) |
| **Phase 2** | Master Data Management | 📋 Planned | `Department.png`, `Doctor_Category.png`, `City.png`, `Investigation_Master.png` | Masters CRUD, active toggles, validation |
| **Phase 3** | Patient & Case Workflow | 📋 Planned | `New_Patient.png`, `Investigation.png`, `Symtoms.png`, `Patient_Record.png` | Duplicate check, multi-step case wizard |
| **Phase 4** | Billing & Financial Registers | 📋 Planned | `Other_Charges.png`, `case_register.png`, `bank_register.png`, `expense_register.png` | Server-calculated invoices, receipts, ledgers |
| **Phase 5** | Reports & Clinical Verification | 📋 Planned | `Patient_Report.png`, `Patient_Report_Main.png`, `report_doctor_report.png` | Report drafts, reviewer approval, branded PDF |
| **Phase 6** | Analytics, Communication & Audit | 📋 Planned | `PMS_Dashboard.png`, `seventh_tab_chat.png`, `nineth_tab_user_activity.png` | Real-time analytics, messaging, audit trail |
| **Phase 7** | Hardening & Production Deploy | 📋 Planned | `eight_tab_create_backups.png` | Automated backups, security tests, Docker production release |

---

## 3. Synthetic Seed Accounts & Credentials

For testing and demonstration, realistic synthetic accounts are pre-seeded in `backend/app/db/seed.py`:

| Role | Username | Full Name | Primary Branch | Access Scope |
|---|---|---|---|---|
| **Super Admin** | `superadmin` | System Superadmin | All Branches | Full global wildcard access across all branches |
| **Admin** | `admin` | Sampada Yeshvikar | 1. Medicare Imaging Centre | Organization Admin, user management, general settings |
| **Receptionist** | `receptionist` | Neha Patel | 1. Medicare Imaging Centre | Patient registration, case registration (Admin screens forbidden) |
| **Reporting Doctor** | `drgaur` | Dr. Chandraprakash Gaur | All Branches | Clinical report review, verification, doctor reports |
| **Accountant** | `accountant` | Naseha Imroze | 1. Medicare Imaging Centre | Financial registers, vouchers, charges reports |
| **Report Writer** | `writer` | Darshan Kandoi | 1. Medicare Imaging Centre | Draft report entry, investigation catalogue view |

> **Password for all development test accounts:** `Admin@123`

---

## 4. Quick Start & Setup Guide

### Option A: Docker Compose (PostgreSQL 16 + Redis + Backend + Frontend)
```bash
# 1. Start all infrastructure containers
docker compose up -d

# 2. Access the applications:
# Frontend: http://localhost:3000
# Backend API Docs: http://localhost:8000/docs
# Health Check: http://localhost:8000/api/v1/health
```

### Option B: Local Direct Execution

#### 1. Backend API (FastAPI)
```bash
cd backend

# Create virtual environment (optional)
python -m venv .venv
# On Windows: .venv\Scripts\activate
# On Linux/macOS: source .venv/bin/activate

# Install dependencies
pip install -e .

# Run the backend server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The database (`pms.db`) is automatically initialized and seeded with default branches, roles, permissions, and users on first boot.

#### 2. Frontend (React + Vite)
```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
# Server starts at http://localhost:3000 (proxies /api to http://127.0.0.1:8000)

# Build for production
npm run build
```

---

## 5. Verification & Automated Tests

Run the backend Pytest test suite:
```bash
python -m pytest backend/tests -v
```

### Test Coverage Highlights
- `test_root_endpoint`: Root `/` metadata check.
- `test_health_check_endpoint`: `/api/v1/health` verifying database connectivity.
- `test_login_success`: JWT authentication and claims verification.
- `test_login_invalid_password`: 401 Unauthorized rejection on bad password.
- `test_login_nonexistent_user`: 401 Unauthorized on non-existent username.
- `test_get_current_user_me`: Authenticated profile `/api/v1/auth/me`.
- `test_change_password`: Password update and cryptographic hash change.
- `test_list_branches_authenticated`: Branch catalogue listing.
- `test_list_branches_unauthenticated`: 401 Unauthorized rejection when missing Bearer token.
- `test_create_and_toggle_branch`: Branch creation and active/inactive toggle.
- `test_receptionist_forbidden_from_admin_users`: Verifies Acceptance Criteria #1 (Receptionist receives 403 Forbidden on `/api/v1/users`).
- `test_receptionist_forbidden_from_roles_permissions`: Verifies Acceptance Criteria #1 (Receptionist receives 403 Forbidden on `/api/v1/roles`).
- `test_receptionist_forbidden_from_general_settings`: Verifies Acceptance Criteria #1 (Receptionist receives 403 Forbidden on `/api/v1/settings/general`).
- `test_admin_allowed_on_admin_users`: Verifies Admin access on `/api/v1/users`.
- `test_admin_allowed_on_roles`: Verifies Admin access on `/api/v1/roles`.

---

## 6. Project Directory Structure

```text
PMS_Project/
├── frontend/                     # React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
│   ├── src/
│   │   ├── app/context/          # AuthContext (JWT, active branch, RBAC helpers)
│   │   ├── components/           # UI primitives (button, input, card, badge, switch, dialog)
│   │   ├── layouts/              # AppLayout, Header (branch switcher), Sidebar (role-aware)
│   │   ├── features/
│   │   │   ├── auth/             # LoginPage with development quick-login buttons
│   │   │   ├── dashboard/        # DashboardPage (KPI cards matching PMS_Dashboard.png)
│   │   │   └── admin/
│   │   │       ├── users/        # UsersPage (Users.png table, status toggle, modal)
│   │   │       ├── roles/        # PermissionsPage (Permission.png matrix table)
│   │   │       ├── branches/     # BranchesPage (Branch.png table, export, modal)
│   │   │       ├── settings/     # SettingsPage (general_settings.png form)
│   │   │       └── audit/        # AuditLogsPage (nineth_tab_user_activity.png)
│   │   ├── routes/               # ProtectedRoute (RBAC route guard), AppRoutes
│   │   └── types/                # TypeScript interface contracts
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── backend/                      # Python FastAPI + SQLAlchemy 2 + Alembic
│   ├── app/
│   │   ├── api/v1/               # Versioned REST endpoints (auth, branches, users, roles, etc.)
│   │   ├── core/                 # Config, security, RBAC dependencies, audit logger
│   │   ├── db/                   # Engine session, seed data
│   │   ├── models/               # SQLAlchemy models (organizations, branches, users, roles, etc.)
│   │   ├── schemas/              # Pydantic v2 schemas
│   │   └── main.py               # FastAPI application entrypoint with automatic seed
│   ├── alembic/                  # Database migration scripts
│   ├── tests/                    # Pytest test suite (15 automated test cases)
│   └── pyproject.toml
├── docs/
│   ├── architecture.md           # Architectural blueprint & security boundaries
│   ├── database-schema.md        # Full entity specifications and ERD
│   ├── open-questions.md         # Clinical & operational decisions tracking
│   └── progress-checklist.md     # Phase-by-phase implementation checklist
├── PMS/                          # 46 reference screenshots from legacy PMS
├── docker-compose.yml            # Container stack configuration
├── .env.example                  # Environment configuration templates
└── README.md                     # Project documentation
```

---

## 7. Clinical Safety Notice
Under no circumstances does this software generate automated medical diagnoses, clinical interpretations, or autonomously finalize clinical reports. All clinical investigations and reports require mandatory manual review and verification by an authorized consultant.
