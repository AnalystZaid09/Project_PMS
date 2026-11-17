# Patient Management System (PMS) — Apex Health Diagnostics

A modern, secure, enterprise-grade healthcare SaaS platform for clinics, hospitals, diagnostic labs, and multi-branch healthcare organizations. Built in accordance with `PMS-APPLICATION-BLUEPRINT.md` with an independent, clean healthcare company identity.

---

## 1. Company Identity & Organization Branding

- **Organization Name:** Apex Health Diagnostics
- **Organization Code:** `APEX`
- **Application Title:** Apex Health PMS / Apex PMS
- **Website:** https://apexhealth.org
- **Contact:** contact@apexhealth.org | +91 265 2500000
- **Operational Currency:** INR (₹) | Configurable per deployment
- **Branches:** Multi-facility diagnostic network across 5 operational regional hubs

---

## 2. Technology Choices

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

## 3. Synthetic Seed Accounts & Credentials

For testing and demonstration, fresh synthetic personas are pre-seeded with zero legacy references:

| Role | Username | Full Name | Primary Branch | Access Scope |
|---|---|---|---|---|
| **Super Admin** | `superadmin` | Global System Admin | All Branches | Full global wildcard access across all branches |
| **Admin** | `admin` | Sarah Jenkins | 1. Apex Central Diagnostic Hospital | Full Organization Admin, users, branches, settings |
| **Receptionist** | `receptionist` | Emily Watson | 1. Apex Central Diagnostic Hospital | Patient registration, case registration (Admin screens forbidden) |
| **Reporting Doctor** | `drmarcus` | Dr. Marcus Vance, MD | All Branches | Clinical report review, verification, doctor reports |
| **Accountant** | `accountant` | David Miller | 1. Apex Central Diagnostic Hospital | Financial registers, vouchers, charges reports |
| **Report Writer** | `writer` | Alex Rivera | 1. Apex Central Diagnostic Hospital | Draft report entry, investigation catalogue view |

> **Password for all development test accounts:** `Admin@123`

---

## 4. Operational Branches

| Code | Branch Name | Country | State | City | Contact Email |
|---|---|---|---|---|---|
| **1** | `1. Apex Central Diagnostic Hospital` | India | Gujarat | Vadodara | central@apexhealth.org |
| **2** | `2. Apex Westside Imaging Centre` | India | Gujarat | Halol | westside@apexhealth.org |
| **8** | `3. Apex Kampala Medical Centre` | Uganda | Central | Kampala | kampala@apexhealth.org |
| **10** | `4. Apex Atlantic Diagnostic Centre` | Ghana | Central | Cape Coast | atlantic@apexhealth.org |
| **12** | `5. Apex Coastal Health Facility` | Kenya | Coast | Mombasa | coastal@apexhealth.org |

---

## 5. Quick Start & Setup Guide

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
The database (`pms.db`) is automatically initialized and seeded on first boot.

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

## 6. Verification & Automated Tests

Run the backend Pytest test suite:
```powershell
python -m pytest backend/tests -v
```

All **27 automated tests** pass with 100% success rate:
- Health checks and DB connection
- JWT Bearer authentication and token claim validation
- Password hashing security (Bcrypt)
- Branch catalog, creation, and status toggles
- Multi-branch scoping validation
- Granular RBAC enforcement (Receptionist forbidden from `/api/v1/users`, `/api/v1/roles`, `/api/v1/settings`, and master creation)
- Department Master CRUD, code uniqueness, and deletion safety checks
- City / Location Master listing, filtering, and creation
- Patient Category Master with discount percentages
- Doctor Category Master
- Doctor Master directory with referring/reporting filters
- Doctor Tariff & Investigation Commission rates
- Investigation Master catalogue with codes, departments, turnaround times (TAT)
- Branch-specific Investigation Charges overrides
- Other Charge Types (administrative, nursing, triage, PPE)
- Email and clinical report templates with dynamic placeholders

Build the frontend bundle:
```powershell
cd frontend
npm run build
```
Result: `dist/` production assets cleanly generated with zero TypeScript or Vite errors.

---

## 7. Clinical Safety Notice
Under no circumstances does this software generate automated medical diagnoses, clinical interpretations, or autonomously finalize clinical reports. All clinical investigations and reports require mandatory manual review and verification by an authorized consultant.
