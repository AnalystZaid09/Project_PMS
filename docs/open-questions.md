# Open Clinical and Operational Questions

This document tracks clinical, operational, and regulatory questions that require confirmation by clinical and business stakeholders.
**Policy:** In accordance with clinical safety guidelines, Antigravity does **not** invent clinical rules or hardcode unverified clinical workflows. Configurable defaults are provided.

---

## 1. Clinical Scope & Facility Type
- **Question:** Is the deployment intended for a single specialty clinic, a polyclinic, a diagnostic/pathology lab, a radiology imaging center, or a combined multi-specialty hospital?
- **Current Default:** Designed as a multi-specialty diagnostic and clinical management center supporting pathology, radiology, consultations, and day procedures.
- **Configurability:** Service types, departments, and sample collection workflows can be enabled or disabled via Master Data.

## 2. Patient Identity & Demographics
- **Question:** Which patient demographic fields are legally or operationally mandatory in the target jurisdiction?
  - Specifically: National Identification Number / Aadhaar / Social Security Number?
  - Is age stored canonically as Date of Birth, or calculated at registration and stored with a timestamp?
  - Are gender designations binary (Male, Female) or inclusive of Third Gender / Other?
- **Current Default:** Date of birth is canonical (`dob: date`), age is computed dynamically; gender accepts `male`, `female`, `other`, `undisclosed`. National ID is optional with a configurable label.

## 3. Medical Reporting & Doctor Sign-Off
- **Question:** What is the legal signature requirement for clinical reports?
  - Is a digital cryptographic signature (e.g., PKCS#7 / USB token) required, or is an uploaded authorized digital signature image with audit trail sufficient?
  - Can a resident/junior doctor prepare a report and sign it as "Preliminary", or can only a registered consultant sign and release?
- **Current Default:** Preliminary drafts can be saved by Report Writers; only designated `Reporting Doctor` / `Reviewer` roles can execute the `verify` and `finalize` transitions. Finalized reports are cryptographically hashed and version-locked. Amendments generate new version records (`v1`, `v2`, etc.) with mandatory amendment reasons.
- **Safety Restriction:** Under no circumstances will AI generate automated diagnoses or auto-finalize medical reports.

## 4. Laboratory Sample Tracking
- **Question:** Is full barcoded sample accessioning, tube tracking, and lab analyzer interfacing (HL7/ASTM) required in Phase 3, or will investigations move directly from "ordered" to "in progress" to "report preparation"?
- **Current Default:** The system supports both direct service fulfillment and optional sample tracking (`sample_collected`, `sample_received`, `analyzing`). Analyzer interface hooks will be pluggable.

## 5. Billing, Taxation, and Tariffs
- **Question:** What tax regime applies (e.g. GST in India with healthcare exemption on diagnostic tests, VAT in East Africa, or municipal cess)?
- **Question:** Are prices branch-dependent, doctor-dependent, or insurance/corporate-tier dependent?
- **Current Default:** Base catalogue prices can be overridden per branch via `investigation_branch_prices`. Tax is configurable per item and default tax rate is 0% (healthcare exemption default).

## 6. Doctor Commissions / Referral Incentives
- **Question:** The legacy screenshots show referring doctor reports with amount figures. Are doctor referral percentages / incentive calculations operationalized in PMS, or are they tracked strictly for reporting?
- **Current Default:** Referral doctor attribution is recorded on cases and invoices for clinical provenance and audit reporting. Financial commission pay-out logic is isolated in financial registers with restricted accountant access.

## 7. Data Privacy & Retention Policy
- **Question:** What is the statutory medical record retention period (e.g., 3 years for outpatient, 7 years for diagnostic reports, 18 years for minors under certain regulations)?
- **Question:** Who has authorization to permanently delete or anonymize patient data upon request?
- **Current Default:** Soft deletion only (`is_active = false`), append-only audit logs, and private access-controlled document storage. No operational records are physically dropped from the database.

