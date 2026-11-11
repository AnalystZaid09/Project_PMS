# Patient Management System (PMS) — System Architecture

## 1. Architectural Style: Modular Monolith
The Patient Management System is architected as a modular monolith. It provides high cohesive business domain boundaries while maintaining simple transactional integrity, unified deployment, and direct relational foreign key enforcement.

```text
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                           │
│  React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui   │
│  TanStack Query (Cache) + React Hook Form + Zod             │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON REST API
┌──────────────────────────────▼──────────────────────────────┐
│                    FastAPI Gateway & Middleware             │
│  - JWT Bearer Authentication / Session Security             │
│  - RBAC Permission Enforcement Dependency                   │
│  - Organization & Branch Context Resolution                 │
│  - Audit Logging Middleware                                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                      Domain Services                        │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────────┐  │
│  │ Auth & RBAC   │ │ Master Data   │ │ Patient & Case    │  │
│  └───────────────┘ └───────────────┘ └───────────────────┘  │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────────┐  │
│  │ Billing & Reg │ │ Clinical Rep  │ │ Analytics & Audit │  │
│  └───────────────┘ └───────────────┘ └───────────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQLAlchemy 2.0 (Async/Sync)
┌──────────────────────────────▼──────────────────────────────┐
│                    PostgreSQL 16 Engine                     │
│  Relational Tables + Row-Level Indexing + JSONB Storage     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Multi-Tenancy & Scoping Enforcement
1. **Organization Isolation:** Every query on organization-owned data filters on `organization_id`. The `current_user.organization_id` is extracted strictly from the validated cryptographic JWT token and cannot be spoofed by client request parameters.
2. **Branch Scoping:** Operational records (patients, visits, cases, invoices, receipts, register logs) carry `branch_id`. When a user performs an operational request, the backend dependency validates that the user's `user_branch_access` includes the targeted branch. Super Admins possess wildcard access across branches.
3. **Role-Based Access Control (RBAC):**
   - Each user has one or more assigned `roles`.
   - Each role is linked to granular `permissions` (e.g. `patient_registration:add`, `users:update`, `financial_reports:view`).
   - Every API endpoint is decorated with `@require_permission("module:action")`.
   - The frontend consumes the user's permissions array from `/api/v1/auth/me` to conditionally render navigation items, action buttons, and route guards.

---

## 3. Data Protection & Clinical Governance
- **Zero AI Diagnosis Rule:** In accordance with clinical safety guidelines, AI models are never permitted to autonomously diagnose conditions, prescribe medications, or finalize medical reports.
- **Report Immutability:** Once a report is finalized by an authorized reviewer, the underlying database record is locked. Subsequent edits generate an amended version (`report_versions`) that logs the amendment author, timestamp, and clinical justification.
- **Safe Audit Logging:** All state changes (login, patient registration, payment creation, report status transitions) trigger asynchronous or inline writes to `audit_logs` capturing user ID, IP address, action, and JSON diffs, excluding sensitive credentials.
