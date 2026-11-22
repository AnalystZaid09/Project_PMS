"""
Clean Database Utility — Apex Health Diagnostics PMS
Purges synthetic and dummy records from the database to enable clean end-to-end testing from scratch.
"""

import os
import sys
import argparse
from datetime import datetime

# Set up path to backend
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.db.session import SessionLocal, engine, Base
from app.models.organization import Organization
from app.models.branch import Branch
from app.models.role import Role, Permission, role_permissions
from app.models.user import User, UserRole, UserBranchAccess
from app.models.settings import SystemSetting
from app.models.schema_all import (
    Department, City, PatientCategory, DoctorCategory, Doctor, DoctorInvestigationRate,
    InvestigationCategory, Investigation, InvestigationBranchPrice,
    OtherChargeType, EmailTemplate, ReportTemplate,
    Patient, Case, CaseItem, CaseOtherCharge, ClinicalReport, ReportVersion, ReportAttachment,
    Invoice, Payment, FinancialRegister,
    ChatMessage, Notification, EmailLog, BackupRecord
)
from app.core.security import get_password_hash
from app.db.seed import PERMISSIONS_DEFINITION


def purge_storage_files():
    """Removes uploaded scan attachments and generated reports from disk storage."""
    storage_dirs = [
        os.path.join(BASE_DIR, "storage", "uploads"),
        os.path.join(BASE_DIR, "storage", "reports"),
    ]
    removed_count = 0
    for s_dir in storage_dirs:
        if os.path.exists(s_dir):
            for fname in os.listdir(s_dir):
                fpath = os.path.join(s_dir, fname)
                if os.path.isfile(fpath) and not fname.startswith(".git"):
                    try:
                        os.remove(fpath)
                        removed_count += 1
                    except Exception as e:
                        print(f"  [!] Could not delete file {fpath}: {e}")
    print(f"  [*] Purged {removed_count} physical storage files from storage/uploads and storage/reports.")


def clean_database(full_scratch: bool = True):
    print("=" * 70)
    print("APEX HEALTH PMS — DATABASE PURGE & CLEAN-STATE INITIALIZER")
    print("=" * 70)
    print(f"Execution Mode: {'FULL SCRATCH (Admin + Employee Test Setup)' if full_scratch else 'TRANSACTIONS ONLY'}")
    print(f"Timestamp:      {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("-" * 70)

    db = SessionLocal()
    try:
        # 1. Purge Operational Transactions (Reverse FK dependency order)
        print("[1/5] Purging operational transactions and clinical records...")
        
        # Financial ledgers & billing
        del_payments = db.query(Payment).delete()
        del_invoices = db.query(Invoice).delete()
        del_registers = db.query(FinancialRegister).delete()

        # Clinical reports & attachments
        del_attachments = db.query(ReportAttachment).delete()
        del_versions = db.query(ReportVersion).delete()
        del_reports = db.query(ClinicalReport).delete()

        # Case items & encounters
        del_case_charges = db.query(CaseOtherCharge).delete()
        del_case_items = db.query(CaseItem).delete()
        del_cases = db.query(Case).delete()

        # Patients
        del_patients = db.query(Patient).delete()

        # Communications & Notifications
        del_chat = db.query(ChatMessage).delete()
        del_notifs = db.query(Notification).delete()
        del_emails = db.query(EmailLog).delete()

        db.commit()

        print(f"  ✔ Removed {del_patients} Patients")
        print(f"  ✔ Removed {del_cases} Cases ({del_case_items} Case Items, {del_case_charges} Other Charges)")
        print(f"  ✔ Removed {del_reports} Clinical Reports ({del_versions} Versions, {del_attachments} Attachments)")
        print(f"  ✔ Removed {del_invoices} Invoices and {del_payments} Payments")
        print(f"  ✔ Removed {del_registers} Financial Register Ledgers")
        print(f"  ✔ Removed {del_chat} Chat Messages, {del_notifs} Notifications, {del_emails} Email Logs")

        # 2. Storage file purge
        print("\n[2/5] Cleaning physical storage directories...")
        purge_storage_files()

        # 3. If Full Scratch: Clean Masters, Doctors, and Non-Superadmin Users
        if full_scratch:
            print("\n[3/5] Purging synthetic master catalogues, doctors, and demo users...")

            # Clean Doctor rates and doctors
            del_doc_rates = db.query(DoctorInvestigationRate).delete()
            del_docs = db.query(Doctor).delete()
            del_doc_cats = db.query(DoctorCategory).delete()

            # Clean Investigation prices and investigations
            del_inv_prices = db.query(InvestigationBranchPrice).delete()
            del_invs = db.query(Investigation).delete()
            del_inv_cats = db.query(InvestigationCategory).delete()

            # Clean Charges and Templates
            del_charges = db.query(OtherChargeType).delete()
            del_rep_tmpls = db.query(ReportTemplate).delete()
            del_email_tmpls = db.query(EmailTemplate).delete()

            # Clean Patient Categories, Departments, Cities
            del_pat_cats = db.query(PatientCategory).delete()
            del_depts = db.query(Department).delete()
            del_cities = db.query(City).delete()

            # Clean non-superadmin users
            non_super_users = db.query(User).filter(User.is_superadmin == False).all()
            user_count = len(non_super_users)
            for u in non_super_users:
                db.query(UserRole).filter(UserRole.user_id == u.id).delete()
                db.query(UserBranchAccess).filter(UserBranchAccess.user_id == u.id).delete()
                db.delete(u)

            # Clean secondary branches (keep Branch 1 as root facility)
            sec_branches = db.query(Branch).filter(Branch.branch_code != "1").all()
            for b in sec_branches:
                db.delete(b)

            db.commit()

            print(f"  ✔ Removed {del_docs} Doctors and {del_doc_rates} Doctor Rates")
            print(f"  ✔ Removed {del_invs} Investigations and {del_inv_prices} Branch Prices")
            print(f"  ✔ Removed {del_depts} Departments, {del_cities} Cities, {del_pat_cats} Patient Categories")
            print(f"  ✔ Removed {del_charges} Other Charge Types and {del_rep_tmpls} Report Templates")
            print(f"  ✔ Removed {user_count} Non-Superadmin User Accounts")
            print(f"  ✔ Preserved Branch 1 ('1. Apex Central Diagnostic Hospital') as root facility")
        else:
            print("\n[3/5] Skipping master data purge (--transactions-only requested). Masters preserved.")

        # 4. Verify & Ensure Super Admin & Core System Integrity
        print("\n[4/5] Verifying Super Admin and Core Security Architecture...")
        org = db.query(Organization).filter(Organization.code == "APEX").first()
        if not org:
            org = Organization(
                name="Apex Health Diagnostics",
                code="APEX",
                contact_email="contact@apexhealth.org",
                contact_phone="+91 265 2500000",
                website="https://apexhealth.org",
                currency_code="INR",
                currency_symbol="₹",
                timezone="Asia/Kolkata",
                date_format="DD/MM/YYYY",
                is_active=True,
            )
            db.add(org)
            db.commit()
            db.refresh(org)

        # Ensure Branch 1 exists
        branch1 = db.query(Branch).filter(Branch.organization_id == org.id, Branch.branch_code == "1").first()
        if not branch1:
            branch1 = Branch(
                organization_id=org.id,
                branch_code="1",
                name="1. Apex Central Diagnostic Hospital",
                country="India",
                state="Gujarat",
                city="Vadodara",
                phone="+91 265 2500001",
                email="central@apexhealth.org",
                is_active=True,
            )
            db.add(branch1)
            db.commit()
            db.refresh(branch1)

        # Ensure Superadmin user exists
        pw_hash = get_password_hash("Admin@123")
        superadmin = db.query(User).filter(User.username == "superadmin").first()
        if not superadmin:
            superadmin = User(
                organization_id=org.id,
                default_branch_id=branch1.id,
                username="superadmin",
                email="superadmin@apexhealth.org",
                full_name="Global System Admin",
                password_hash=pw_hash,
                is_email_verified=True,
                is_active=True,
                is_superadmin=True,
            )
            db.add(superadmin)
            db.commit()
            db.refresh(superadmin)
        else:
            superadmin.password_hash = pw_hash
            superadmin.is_active = True
            superadmin.is_superadmin = True
            superadmin.default_branch_id = branch1.id
            db.commit()

        # Link Superadmin to Super Admin role and Branch 1
        super_role = db.query(Role).filter(Role.slug == "super-admin").first()
        if super_role:
            ur = db.query(UserRole).filter(UserRole.user_id == superadmin.id, UserRole.role_id == super_role.id).first()
            if not ur:
                db.add(UserRole(user_id=superadmin.id, role_id=super_role.id))

        uba = db.query(UserBranchAccess).filter(UserBranchAccess.user_id == superadmin.id, UserBranchAccess.branch_id == branch1.id).first()
        if not uba:
            db.add(UserBranchAccess(user_id=superadmin.id, branch_id=branch1.id, is_default=True))
        db.commit()

        print(f"  ✔ Organization: {org.name} ({org.code})")
        print(f"  ✔ Super Admin:  {superadmin.username} ({superadmin.email}) [Active: {superadmin.is_active}]")
        print(f"  ✔ Root Branch:  {branch1.name} (Code: {branch1.branch_code})")
        print(f"  ✔ Password:     Admin@123")

        # 5. Inventory Verification Summary
        print("\n[5/5] Final Clean Database Record Inventory:")
        print("-" * 50)
        print(f"  Patients:            {db.query(Patient).count()}")
        print(f"  Cases:               {db.query(Case).count()}")
        print(f"  Invoices:            {db.query(Invoice).count()}")
        print(f"  Clinical Reports:    {db.query(ClinicalReport).count()}")
        print(f"  Financial Registers: {db.query(FinancialRegister).count()}")
        print(f"  Doctors:             {db.query(Doctor).count()}")
        print(f"  Investigations:      {db.query(Investigation).count()}")
        print(f"  Departments:         {db.query(Department).count()}")
        print(f"  Users:               {db.query(User).count()} ({[u.username for u in db.query(User).all()]})")
        print(f"  Branches:            {db.query(Branch).count()}")
        print("-" * 50)
        print("✔ DATABASE IS NOW IN A PRISTINE CLEAN STATE READY FOR TESTING!")
        print("=" * 70)

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Database clean failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Clean dummy data from Apex Health PMS database.")
    parser.add_argument(
        "--transactions-only",
        action="store_true",
        help="Only purge patient cases, invoices, reports, and financial registers. Keep masters and doctors."
    )
    args = parser.parse_args()
    clean_database(full_scratch=not args.transactions_only)
