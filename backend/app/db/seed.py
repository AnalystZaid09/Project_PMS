from sqlalchemy.orm import Session
from app.core.security import get_password_hash
from app.models.organization import Organization
from app.models.branch import Branch
from app.models.role import Role, Permission, role_permissions
from app.models.user import User, UserRole, UserBranchAccess
from app.models.settings import SystemSetting

DEFAULT_PASSWORD = "Admin@123"

PERMISSIONS_DEFINITION = [
    # Form: Patient Registration
    ("patient_registration", "view", "patient_registration:view", "View patient registration records"),
    ("patient_registration", "add", "patient_registration:add", "Register new patients"),
    ("patient_registration", "update", "patient_registration:update", "Update existing patient details"),
    ("patient_registration", "export", "patient_registration:export", "Export patient lists to Excel/CSV"),
    
    # Form: Patient Report
    ("patient_report", "view", "patient_report:view", "View clinical investigation reports"),
    ("patient_report", "add", "patient_report:add", "Create and draft investigation reports"),
    ("patient_report", "update", "patient_report:update", "Edit draft reports"),
    ("patient_report", "delete", "patient_report:delete", "Delete unverified draft reports"),
    ("patient_report", "verify", "patient_report:verify", "Review and verify clinical reports"),
    ("patient_report", "finalize", "patient_report:finalize", "Finalize and lock clinical reports"),
    
    # Form: Cases
    ("delete_case", "view", "delete_case:view", "View cancelled/deleted cases"),
    ("delete_case", "delete", "delete_case:delete", "Cancel or delete patient cases"),
    ("view_patient_history", "view", "view_patient_history:view", "Access comprehensive patient history"),
    
    # Reports
    ("other_charges_report", "view", "other_charges_report:view", "View other charges reports"),
    ("other_charges_report", "print", "other_charges_report:print", "Print other charges report"),
    ("other_charges_report", "export", "other_charges_report:export", "Export other charges report"),
    ("charges_report", "view", "charges_report:view", "View investigation charges report"),
    ("charges_report", "print", "charges_report:print", "Print investigation charges report"),
    ("charges_report", "export", "charges_report:export", "Export investigation charges report"),
    
    # Master Data
    ("user_master", "view", "user_master:view", "View users list"),
    ("user_master", "add", "user_master:add", "Create new system users"),
    ("user_master", "update", "user_master:update", "Edit system users"),
    ("user_master", "delete", "user_master:delete", "Deactivate/delete users"),
    
    ("user_right", "view", "user_right:view", "View roles and permission matrices"),
    ("user_right", "add", "user_right:add", "Create roles and permissions"),
    ("user_right", "update", "user_right:update", "Modify role permissions matrix"),
    ("user_right", "delete", "user_right:delete", "Delete custom roles"),
    
    ("branch_master", "view", "branch_master:view", "View branch list"),
    ("branch_master", "add", "branch_master:add", "Create new branches"),
    ("branch_master", "update", "branch_master:update", "Edit branch details"),
    ("branch_master", "delete", "branch_master:delete", "Deactivate branches"),

    ("department_master", "view", "department_master:view", "View departments"),
    ("department_master", "add", "department_master:add", "Add departments"),
    ("department_master", "update", "department_master:update", "Edit departments"),

    ("doctor_master", "view", "doctor_master:view", "View doctors"),
    ("doctor_master", "add", "doctor_master:add", "Add referring/reporting doctors"),
    ("doctor_master", "update", "doctor_master:update", "Edit doctors"),

    ("investigation_master", "view", "investigation_master:view", "View investigation catalogue"),
    ("investigation_master", "add", "investigation_master:add", "Add investigations"),
    ("investigation_master", "update", "investigation_master:update", "Edit investigations & prices"),

    # Financial registers
    ("financial_registers", "view", "financial_registers:view", "View financial registers (bank, case, expense, petty cash)"),
    ("financial_registers", "add", "financial_registers:add", "Record financial ledger transactions"),
    ("financial_registers", "export", "financial_registers:export", "Export financial registers"),

    # Settings and Audit
    ("general_settings", "view", "general_settings:view", "View general application settings"),
    ("general_settings", "update", "general_settings:update", "Update application branding and settings"),
    ("audit_logs", "view", "audit_logs:view", "View audit trail and user activity"),
]


def seed_database(db: Session):
    # 1. Organization
    org = db.query(Organization).filter(Organization.code == "NEXUS").first()
    if not org:
        org = Organization(
            name="Nexus Health Diagnostics",
            code="NEXUS",
            contact_email="admin@nexushealth.org",
            contact_phone="+91 265 2345678",
            website="https://nexushealth.org",
            currency_code="INR",
            currency_symbol="₹",
            timezone="Asia/Kolkata",
            date_format="DD/MM/YYYY",
            is_active=True,
        )
        db.add(org)
        db.commit()
        db.refresh(org)

    # 2. Branches
    branches_data = [
        ("1", "1. Medicare Imaging Centre", "India", "Gujarat", "Vadodara", "+91 265 210001", "vadodara@nexushealth.org"),
        ("2", "2. Med Eva Diagnostic Centre", "India", "Gujarat", "Halol", "+91 267 210002", "halol@nexushealth.org"),
        ("8", "3. Medicare Kampala Diagnostic Centre", "Uganda", "Central", "Deuba", "+256 41 410008", "kampala@nexushealth.org"),
        ("10", "4. Amic Medicare Diagnostic Centre", "Ghana", "Central", "Cape Coast", "+233 33 210010", "ghana@nexushealth.org"),
        ("12", "5. Alfamed Diagnostic Centre", "Kenya", "Coast", "Mombasa", "+254 41 210012", "mombasa@nexushealth.org"),
    ]

    branches = {}
    for code, name, country, state, city, phone, email in branches_data:
        b = db.query(Branch).filter(Branch.organization_id == org.id, Branch.branch_code == code).first()
        if not b:
            b = Branch(
                organization_id=org.id,
                branch_code=code,
                name=name,
                country=country,
                state=state,
                city=city,
                phone=phone,
                email=email,
                is_active=True,
            )
            db.add(b)
            db.commit()
            db.refresh(b)
        branches[code] = b

    default_branch = branches["1"]

    # 3. Permissions
    permissions_dict = {}
    for module, action, code, desc in PERMISSIONS_DEFINITION:
        p = db.query(Permission).filter(Permission.code == code).first()
        if not p:
            p = Permission(module=module, action=action, code=code, description=desc)
            db.add(p)
            db.commit()
            db.refresh(p)
        permissions_dict[code] = p

    # 4. Roles
    roles_config = [
        ("Super Admin", "super-admin", "Full global system access across all organizations and branches", True, list(permissions_dict.keys())),
        ("Admin", "admin", "Full organization administrator with user and settings control", True, list(permissions_dict.keys())),
        ("Branch Admin", "branch-admin", "Branch level administrator managing staff and local operations", True, [
            c for c in permissions_dict.keys() if not c.startswith("general_settings")
        ]),
        ("Receptionist", "receptionist", "Front desk registration, case booking, and patient history", True, [
            "patient_registration:view", "patient_registration:add", "patient_registration:update", "patient_registration:export",
            "view_patient_history:view", "charges_report:view", "charges_report:print",
        ]),
        ("Billing Executive", "billing-executive", "Front desk billing, payment collection, and charges reports", True, [
            "patient_registration:view", "patient_registration:add", "patient_registration:update",
            "charges_report:view", "charges_report:print", "charges_report:export",
            "other_charges_report:view", "other_charges_report:print", "other_charges_report:export",
            "financial_registers:view", "financial_registers:add",
        ]),
        ("Report Writer", "report-writer", "Prepares and drafts clinical diagnostic investigation reports", True, [
            "patient_report:view", "patient_report:add", "patient_report:update", "view_patient_history:view",
            "investigation_master:view",
        ]),
        ("Reporting Doctor", "reporting-doctor", "Reviewing consultant who verifies and finalizes clinical reports", True, [
            "patient_report:view", "patient_report:update", "patient_report:verify", "patient_report:finalize",
            "view_patient_history:view", "charges_report:view",
        ]),
        ("Accountant", "accountant", "Financial registers, vouchers, and revenue reports", True, [
            "charges_report:view", "charges_report:print", "charges_report:export",
            "other_charges_report:view", "other_charges_report:print", "other_charges_report:export",
            "financial_registers:view", "financial_registers:add", "financial_registers:export",
        ]),
        ("Auditor", "auditor", "Read-only access for compliance and inspection", True, [
            "patient_registration:view", "patient_report:view", "charges_report:view", "other_charges_report:view",
            "financial_registers:view", "audit_logs:view", "user_master:view", "branch_master:view",
        ]),
    ]

    roles = {}
    for r_name, slug, desc, is_sys, p_codes in roles_config:
        r = db.query(Role).filter(Role.slug == slug).first()
        if not r:
            r = Role(organization_id=org.id, name=r_name, slug=slug, description=desc, is_system=is_sys)
            db.add(r)
            db.commit()
            db.refresh(r)
        
        # Link permissions
        target_perms = [permissions_dict[c] for c in p_codes if c in permissions_dict]
        r.permissions = target_perms
        db.commit()
        roles[slug] = r

    # 5. Synthetic Users
    users_data = [
        ("superadmin", "superadmin@nexushealth.org", "System Superadmin", True, ["super-admin"], list(branches.values())),
        ("admin", "admin@nexushealth.org", "Sampada Yeshvikar", False, ["admin"], list(branches.values())),
        ("receptionist", "receptionist@nexushealth.org", "Neha Patel", False, ["receptionist"], [branches["1"], branches["2"]]),
        ("drgaur", "drgaur@nexushealth.org", "Dr. Chandraprakash Gaur", False, ["reporting-doctor"], list(branches.values())),
        ("accountant", "naseha@nexushealth.org", "Naseha Imroze", False, ["accountant"], [branches["1"]]),
        ("writer", "darshan@nexushealth.org", "Darshan Kandoi", False, ["report-writer"], [branches["1"], branches["2"]]),
    ]

    pw_hash = get_password_hash(DEFAULT_PASSWORD)

    for username, email, full_name, is_super, r_slugs, user_branches in users_data:
        u = db.query(User).filter(User.username == username).first()
        if not u:
            u = User(
                organization_id=org.id,
                default_branch_id=user_branches[0].id if user_branches else default_branch.id,
                username=username,
                email=email,
                full_name=full_name,
                password_hash=pw_hash,
                is_email_verified=True,
                is_active=True,
                is_superadmin=is_super,
            )
            db.add(u)
            db.commit()
            db.refresh(u)

            # Assign roles
            for slug in r_slugs:
                ur = UserRole(user_id=u.id, role_id=roles[slug].id)
                db.add(ur)

            # Assign branch access
            for idx, b in enumerate(user_branches):
                uba = UserBranchAccess(user_id=u.id, branch_id=b.id, is_default=(idx == 0))
                db.add(uba)

            db.commit()

    # 6. General system settings
    settings_data = [
        ("app_name", "Nexus Health PMS", "general", "Application display title"),
        ("app_logo", "", "general", "URL to company logo"),
        ("app_favicon", "", "general", "URL to company favicon"),
        ("patient_id_prefix", "PAT", "numbering", "Patient UHID prefix"),
        ("case_id_prefix", "CAS", "numbering", "Case encounter prefix"),
        ("invoice_id_prefix", "INV", "numbering", "Invoice receipt prefix"),
    ]
    for key, val, cat, desc in settings_data:
        s = db.query(SystemSetting).filter(SystemSetting.organization_id == org.id, SystemSetting.setting_key == key).first()
        if not s:
            s = SystemSetting(organization_id=org.id, setting_key=key, setting_value=val, category=cat, description=desc)
            db.add(s)
    db.commit()
