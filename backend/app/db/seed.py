from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from app.core.security import get_password_hash
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
    ChatMessage, Notification, EmailLog,
    BackupRecord
)

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
    ("department_master", "delete", "department_master:delete", "Deactivate/delete departments"),

    ("city_master", "view", "city_master:view", "View cities/locations"),
    ("city_master", "add", "city_master:add", "Add cities/locations"),
    ("city_master", "update", "city_master:update", "Edit cities/locations"),
    ("city_master", "delete", "city_master:delete", "Deactivate/delete cities"),

    ("patient_category_master", "view", "patient_category_master:view", "View patient categories"),
    ("patient_category_master", "add", "patient_category_master:add", "Add patient categories"),
    ("patient_category_master", "update", "patient_category_master:update", "Edit patient categories"),
    ("patient_category_master", "delete", "patient_category_master:delete", "Deactivate/delete patient categories"),

    ("doctor_category_master", "view", "doctor_category_master:view", "View doctor categories"),
    ("doctor_category_master", "add", "doctor_category_master:add", "Add doctor categories"),
    ("doctor_category_master", "update", "doctor_category_master:update", "Edit doctor categories"),
    ("doctor_category_master", "delete", "doctor_category_master:delete", "Deactivate/delete doctor categories"),

    ("doctor_master", "view", "doctor_master:view", "View doctors"),
    ("doctor_master", "add", "doctor_master:add", "Add referring/reporting doctors"),
    ("doctor_master", "update", "doctor_master:update", "Edit doctors"),
    ("doctor_master", "delete", "doctor_master:delete", "Deactivate/delete doctors"),

    ("investigation_master", "view", "investigation_master:view", "View investigation catalogue"),
    ("investigation_master", "add", "investigation_master:add", "Add investigations"),
    ("investigation_master", "update", "investigation_master:update", "Edit investigations & prices"),
    ("investigation_master", "delete", "investigation_master:delete", "Deactivate/delete investigations"),

    ("other_charges_master", "view", "other_charges_master:view", "View other charge types"),
    ("other_charges_master", "add", "other_charges_master:add", "Add other charge types"),
    ("other_charges_master", "update", "other_charges_master:update", "Edit other charge types"),
    ("other_charges_master", "delete", "other_charges_master:delete", "Deactivate/delete other charge types"),

    ("template_master", "view", "template_master:view", "View email and report templates"),
    ("template_master", "add", "template_master:add", "Add email and report templates"),
    ("template_master", "update", "template_master:update", "Edit email and report templates"),
    ("template_master", "delete", "template_master:delete", "Deactivate/delete templates"),

    # Financial registers
    ("financial_registers", "view", "financial_registers:view", "View financial registers (bank, case, expense, petty cash)"),
    ("financial_registers", "add", "financial_registers:add", "Record financial ledger transactions"),
    ("financial_registers", "export", "financial_registers:export", "Export financial registers"),

    # Settings and Audit
    ("general_settings", "view", "general_settings:view", "View general application settings"),
    ("general_settings", "update", "general_settings:update", "Update application branding and settings"),
    ("audit_logs", "view", "audit_logs:view", "View audit trail and user activity"),

    # Analytics & Executive Dashboard
    ("analytics", "view", "analytics:view", "View executive dashboard analytics and graphs"),

    # Internal Staff Chat
    ("chat", "view", "chat:view", "Access internal staff chat and announcements"),
    ("chat", "send", "chat:send", "Send internal team chat messages"),

    # Direct Email Communication
    ("send_email", "view", "send_email:view", "View email communication logs"),
    ("send_email", "send", "send_email:send", "Compose and dispatch patient/doctor emails"),
]


def seed_database(db: Session, include_demo_data: bool = True):
    # 1. Organization - Fresh company identity
    org = db.query(Organization).filter(Organization.code == "APEX").first()
    if not org:
        # Also clean up any legacy organization record if exists
        old_org = db.query(Organization).filter(Organization.code == "NEXUS").first()
        if old_org:
            old_org.code = "APEX"
            old_org.name = "Apex Health Diagnostics"
            old_org.contact_email = "contact@apexhealth.org"
            old_org.website = "https://apexhealth.org"
            org = old_org
        else:
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

    # 2. Branches - Completely new, modern facility names
    branches_data = [
        ("1", "1. Apex Central Diagnostic Hospital", "India", "Gujarat", "Vadodara", "+91 265 2500001", "central@apexhealth.org"),
    ]
    if include_demo_data:
        branches_data.extend([
            ("2", "2. Apex Westside Imaging Centre", "India", "Gujarat", "Halol", "+91 267 2500002", "westside@apexhealth.org"),
            ("8", "3. Apex Kampala Medical Centre", "Uganda", "Central", "Kampala", "+256 41 5500008", "kampala@apexhealth.org"),
            ("10", "4. Apex Atlantic Diagnostic Centre", "Ghana", "Central", "Cape Coast", "+233 33 5500010", "atlantic@apexhealth.org"),
            ("12", "5. Apex Coastal Health Facility", "Kenya", "Coast", "Mombasa", "+254 41 5500012", "coastal@apexhealth.org"),
        ])

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
        else:
            b.name = name
            b.country = country
            b.state = state
            b.city = city
            b.phone = phone
            b.email = email
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
            "analytics:view", "chat:view", "chat:send", "send_email:view", "send_email:send",
        ]),
        ("Billing Executive", "billing-executive", "Front desk billing, payment collection, and charges reports", True, [
            "patient_registration:view", "patient_registration:add", "patient_registration:update",
            "charges_report:view", "charges_report:print", "charges_report:export",
            "other_charges_report:view", "other_charges_report:print", "other_charges_report:export",
            "financial_registers:view", "financial_registers:add",
            "analytics:view", "chat:view", "chat:send", "send_email:view", "send_email:send",
        ]),
        ("Report Writer", "report-writer", "Prepares and drafts clinical diagnostic investigation reports", True, [
            "patient_report:view", "patient_report:add", "patient_report:update", "view_patient_history:view",
            "investigation_master:view", "analytics:view", "chat:view", "chat:send",
        ]),
        ("Reporting Doctor", "reporting-doctor", "Reviewing consultant who verifies and finalizes clinical reports", True, [
            "patient_report:view", "patient_report:update", "patient_report:verify", "patient_report:finalize",
            "view_patient_history:view", "charges_report:view", "analytics:view", "chat:view", "chat:send",
            "send_email:view", "send_email:send",
        ]),
        ("Accountant", "accountant", "Financial registers, vouchers, and revenue reports", True, [
            "charges_report:view", "charges_report:print", "charges_report:export",
            "other_charges_report:view", "other_charges_report:print", "other_charges_report:export",
            "financial_registers:view", "financial_registers:add", "financial_registers:export",
            "analytics:view", "chat:view", "chat:send",
        ]),
        ("Auditor", "auditor", "Read-only access for compliance and inspection", True, [
            "patient_registration:view", "patient_report:view", "charges_report:view", "other_charges_report:view",
            "financial_registers:view", "audit_logs:view", "user_master:view", "branch_master:view",
            "analytics:view", "chat:view",
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

    # 5. Synthetic Users - Distinct, professional personas with zero legacy company references
    users_data = [
        ("superadmin", "superadmin@apexhealth.org", "Global System Admin", True, ["super-admin"], list(branches.values())),
    ]
    if include_demo_data:
        users_data.extend([
            ("admin", "sarah.jenkins@apexhealth.org", "Sarah Jenkins", False, ["admin"], list(branches.values())),
            ("receptionist", "emily.watson@apexhealth.org", "Emily Watson", False, ["receptionist"], [branches["1"], branches["2"]] if "2" in branches else [branches["1"]]),
            ("drmarcus", "dr.vance@apexhealth.org", "Dr. Marcus Vance, MD", False, ["reporting-doctor"], list(branches.values())),
            ("accountant", "david.miller@apexhealth.org", "David Miller", False, ["accountant"], [branches["1"]]),
            ("writer", "alex.rivera@apexhealth.org", "Alex Rivera", False, ["report-writer"], [branches["1"], branches["2"]] if "2" in branches else [branches["1"]]),
        ])

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
        else:
            # Update existing record to new names and ensure superadmin password is valid
            u.full_name = full_name
            u.email = email
            if username == "superadmin":
                u.password_hash = pw_hash
                u.is_active = True
            db.commit()

    # 6. General system settings
    settings_data = [
        ("app_name", "Apex Health PMS", "general", "Application display title"),
        ("app_logo", "", "general", "URL to company logo"),
        ("app_favicon", "", "general", "URL to company favicon"),
        ("patient_id_prefix", "APX-PAT", "numbering", "Patient UHID prefix"),
        ("case_id_prefix", "APX-CAS", "numbering", "Case encounter prefix"),
        ("invoice_id_prefix", "APX-INV", "numbering", "Invoice receipt prefix"),
    ]
    for key, val, cat, desc in settings_data:
        s = db.query(SystemSetting).filter(SystemSetting.organization_id == org.id, SystemSetting.setting_key == key).first()
        if not s:
            s = SystemSetting(organization_id=org.id, setting_key=key, setting_value=val, category=cat, description=desc)
            db.add(s)
        else:
            s.setting_value = val
    db.commit()

    # 7. Master Data Seeding (Phase 2)
    if include_demo_data:
        _seed_master_data(db, org, branches)
    else:
        db.commit()
        return


def _seed_master_data(db: Session, org: Organization, branches: dict):
    # Cities
    cities_data = [
        ("Vadodara", "Gujarat", "India"),
        ("Halol", "Gujarat", "India"),
        ("Ahmedabad", "Gujarat", "India"),
        ("Kampala", "Central", "Uganda"),
        ("Jinja", "Eastern", "Uganda"),
        ("Iganga", "Eastern", "Uganda"),
        ("Cape Coast", "Central", "Ghana"),
        ("Mombasa", "Coast", "Kenya"),
    ]
    for name, state, country in cities_data:
        c = db.query(City).filter(City.name == name, City.country == country).first()
        if not c:
            db.add(City(name=name, state=state, country=country, is_active=True))
    db.commit()

    # Departments
    depts_data = [
        ("Pathology", "PATH", "Clinical pathology, blood sciences, histology and cytology"),
        ("Radiology & Imaging", "RAD", "Digital radiography, CT scanning and MRI diagnostic imaging"),
        ("Cardiology", "CARD", "Non-invasive and diagnostic cardiovascular investigations"),
        ("Ultrasonography", "USG", "High-resolution 3D/4D diagnostic ultrasound and color Doppler"),
        ("Biochemistry & Hematology", "BIO", "Automated routine and special biochemistry analyzers"),
        ("General Medicine", "GEN", "General consultation and preventative health screening"),
    ]
    departments = {}
    for name, code, desc in depts_data:
        dept = db.query(Department).filter(Department.organization_id == org.id, Department.code == code).first()
        if not dept:
            dept = Department(organization_id=org.id, name=name, code=code, description=desc, is_active=True)
            db.add(dept)
            db.commit()
            db.refresh(dept)
        departments[code] = dept

    # Patient Categories
    patient_cats = [
        ("General / Walk-in", 0.0),
        ("Senior Citizen", 10.0),
        ("Corporate Insurance Partner", 15.0),
        ("Staff & Dependents", 25.0),
        ("Subsidized Healthcare Scheme", 30.0),
    ]
    for name, disc in patient_cats:
        pc = db.query(PatientCategory).filter(PatientCategory.organization_id == org.id, PatientCategory.name == name).first()
        if not pc:
            db.add(PatientCategory(organization_id=org.id, name=name, discount_percentage=disc, is_active=True))
    db.commit()

    # Doctor Categories
    doc_cats_data = [
        "Consultant Radiologist",
        "Consultant Pathologist",
        "Interventional Cardiologist",
        "Consultant Physician",
        "Consultant Sonologist",
        "General Practitioner",
    ]
    doc_categories = {}
    for name in doc_cats_data:
        dc = db.query(DoctorCategory).filter(DoctorCategory.organization_id == org.id, DoctorCategory.name == name).first()
        if not dc:
            dc = DoctorCategory(organization_id=org.id, name=name, is_active=True)
            db.add(dc)
            db.commit()
            db.refresh(dc)
        doc_categories[name] = dc

    # Doctors
    doctors_data = [
        ("Dr. Marcus Vance", "Consultant Radiologist", "RAD", "MBBS, MD Radio-Diagnosis", "+91 98250 11001", "dr.vance@apexhealth.org", "both", 15.0, "Apex Tower, Sayajigunj", "Vadodara"),
        ("Dr. Elena Rostova", "Consultant Pathologist", "PATH", "MBBS, MD Pathology", "+91 98250 11002", "dr.rostova@apexhealth.org", "both", 12.0, "Health Arcade, Race Course", "Vadodara"),
        ("Dr. Rajesh Gupta", "Interventional Cardiologist", "CARD", "MBBS, MD, DM Cardiology", "+91 98250 11003", "dr.gupta@apexhealth.org", "both", 15.0, "Alkapuri Diagnostics Plaza", "Vadodara"),
        ("Dr. Amanda Brooks", "General Practitioner", "GEN", "MBBS, DNB Family Medicine", "+91 98250 11004", "dr.brooks@apexhealth.org", "referring", 10.0, "Near Clock Tower", "Halol"),
        ("Dr. Kwame Mensah", "Consultant Physician", "GEN", "MBChB, FWACP Internal Medicine", "+256 701 55001", "dr.mensah@apexhealth.org", "referring", 10.0, "Victoria Clinic Road", "Kampala"),
        ("Dr. Zainab Al-Mansoor", "Consultant Sonologist", "USG", "MBBS, DMRD Ultrasound", "+254 711 55002", "dr.almansoor@apexhealth.org", "both", 12.0, "Coastline Health Hub", "Mombasa"),
    ]
    doctors = {}
    for name, cat_name, dept_code, qual, phone, email, dtype, comm, addr, city in doctors_data:
        doc = db.query(Doctor).filter(Doctor.organization_id == org.id, Doctor.full_name == name).first()
        if not doc:
            doc = Doctor(
                organization_id=org.id,
                category_id=doc_categories[cat_name].id if cat_name in doc_categories else None,
                department_id=departments[dept_code].id if dept_code in departments else None,
                full_name=name,
                qualification=qual,
                phone=phone,
                email=email,
                doctor_type=dtype,
                commission_rate=comm,
                address_line1=addr,
                city=city,
                is_active=True,
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)
        doctors[name] = doc

    # Investigation Categories
    inv_cats_data = [
        ("Clinical Pathology & Blood", "LAB-BLD"),
        ("Digital Radiography / X-Ray", "RAD-XRAY"),
        ("Diagnostic Ultrasound & Doppler", "USG-SCAN"),
        ("Advanced Computed Tomography", "RAD-CT"),
        ("Magnetic Resonance Imaging", "RAD-MRI"),
        ("Non-Invasive Cardiology", "CARD-TEST"),
    ]
    inv_categories = {}
    for name, code in inv_cats_data:
        ic = db.query(InvestigationCategory).filter(InvestigationCategory.organization_id == org.id, InvestigationCategory.code == code).first()
        if not ic:
            ic = InvestigationCategory(organization_id=org.id, name=name, code=code, is_active=True)
            db.add(ic)
            db.commit()
            db.refresh(ic)
        inv_categories[code] = ic

    # Report Templates
    report_templates_data = [
        ("Standard Pathology Laboratory Report", "PATH", '{"sections": ["specimen", "parameters", "findings", "notes"]}', "The specimen was examined according to clinical laboratory standard procedures."),
        ("Standard Digital Radiology Report", "RAD", '{"sections": ["technique", "findings", "impression"]}', "CLINICAL INDICATION:\nTECHNIQUE: Standard multi-projection digital radiography.\nFINDINGS: Normal bone density, articular spaces preserved.\nIMPRESSION: No acute radiographic abnormality demonstrated."),
        ("Standard Ultrasound Abdomen & Pelvis Report", "USG", '{"sections": ["liver", "gallbladder", "pancreas", "spleen", "kidneys", "bladder", "impression"]}', "FINDINGS:\nLiver: Normal size and parenchymal echotexture.\nGallbladder: Normal wall thickness, no calculus.\nKidneys: Bilateral normal cortical thickness.\nIMPRESSION: Normal scan."),
    ]
    report_templates = {}
    for name, dept_code, schema_json, def_text in report_templates_data:
        rt = db.query(ReportTemplate).filter(ReportTemplate.organization_id == org.id, ReportTemplate.name == name).first()
        if not rt:
            rt = ReportTemplate(
                organization_id=org.id,
                name=name,
                department_id=departments[dept_code].id if dept_code in departments else None,
                schema_json=schema_json,
                default_text=def_text,
                is_active=True
            )
            db.add(rt)
            db.commit()
            db.refresh(rt)
        report_templates[name] = rt

    # Investigations Catalogue
    invs_data = [
        ("CBC-01", "Complete Blood Count with ESR", "LAB-BLD", "PATH", Decimal("450.00"), Decimal("600.00"), 12, "Standard Pathology Laboratory Report"),
        ("LIP-02", "Comprehensive Lipid Profile", "LAB-BLD", "PATH", Decimal("850.00"), Decimal("1100.00"), 24, "Standard Pathology Laboratory Report"),
        ("LFT-03", "Liver Function Test (LFT)", "LAB-BLD", "PATH", Decimal("750.00"), Decimal("950.00"), 24, "Standard Pathology Laboratory Report"),
        ("KFT-04", "Kidney Function Test (KFT)", "LAB-BLD", "PATH", Decimal("700.00"), Decimal("900.00"), 24, "Standard Pathology Laboratory Report"),
        ("XRAY-01", "Digital Chest X-Ray PA View", "RAD-XRAY", "RAD", Decimal("500.00"), Decimal("700.00"), 6, "Standard Digital Radiology Report"),
        ("XRAY-02", "Lumbar Spine X-Ray AP/LAT", "RAD-XRAY", "RAD", Decimal("800.00"), Decimal("1050.00"), 6, "Standard Digital Radiology Report"),
        ("USG-01", "Ultrasound Whole Abdomen & Pelvis", "USG-SCAN", "USG", Decimal("1500.00"), Decimal("2000.00"), 12, "Standard Ultrasound Abdomen & Pelvis Report"),
        ("ECG-01", "12-Lead Electrocardiogram (ECG)", "CARD-TEST", "CARD", Decimal("350.00"), Decimal("500.00"), 2, None),
        ("CT-01", "CT Brain Non-Contrast", "RAD-CT", "RAD", Decimal("3200.00"), Decimal("4200.00"), 12, "Standard Digital Radiology Report"),
        ("MRI-01", "MRI Lumbo-Sacral Spine", "RAD-MRI", "RAD", Decimal("6500.00"), Decimal("8000.00"), 24, "Standard Digital Radiology Report"),
    ]
    investigations = {}
    for code, name, cat_code, dept_code, reg_price, emg_price, tat, tmpl_name in invs_data:
        inv = db.query(Investigation).filter(Investigation.organization_id == org.id, Investigation.code == code).first()
        tmpl_id = report_templates[tmpl_name].id if tmpl_name and tmpl_name in report_templates else None
        if not inv:
            inv = Investigation(
                organization_id=org.id,
                category_id=inv_categories[cat_code].id if cat_code in inv_categories else None,
                department_id=departments[dept_code].id if dept_code in departments else None,
                code=code,
                name=name,
                description=f"Standard diagnostic service for {name}",
                default_price=reg_price,
                emergency_price=emg_price,
                turnaround_hours=tat,
                template_id=tmpl_id,
                is_active=True,
            )
            db.add(inv)
            db.commit()
            db.refresh(inv)
        investigations[code] = inv

    # Branch Price Overrides (e.g. branch 8 Kampala has branch-specific tariff)
    if "8" in branches and "XRAY-01" in investigations:
        b_kampala = branches["8"]
        bp = db.query(InvestigationBranchPrice).filter(
            InvestigationBranchPrice.investigation_id == investigations["XRAY-01"].id,
            InvestigationBranchPrice.branch_id == b_kampala.id
        ).first()
        if not bp:
            bp = InvestigationBranchPrice(
                investigation_id=investigations["XRAY-01"].id,
                branch_id=b_kampala.id,
                price=Decimal("65000.00"),
                emergency_price=Decimal("75000.00"),
            )
            db.add(bp)
            db.commit()

    # Doctor Rates (for Dr. Marcus Vance & Dr. Elena Rostova)
    if "Dr. Marcus Vance" in doctors and "XRAY-01" in investigations:
        dr_marcus = doctors["Dr. Marcus Vance"]
        inv_xray = investigations["XRAY-01"]
        dr_rate = db.query(DoctorInvestigationRate).filter(
            DoctorInvestigationRate.doctor_id == dr_marcus.id,
            DoctorInvestigationRate.investigation_id == inv_xray.id,
            DoctorInvestigationRate.rate_type == "reporting"
        ).first()
        if not dr_rate:
            db.add(DoctorInvestigationRate(
                doctor_id=dr_marcus.id,
                investigation_id=inv_xray.id,
                rate_type="reporting",
                regular_fixed=Decimal("150.00"),
                regular_percentage=0.0,
                emergency_fixed=Decimal("200.00"),
                emergency_percentage=0.0,
            ))
            db.commit()

    # Other Charge Types
    other_charges_data = [
        ("Registration & Patient Smart Card", "REG-FEE", Decimal("100.00"), False),
        ("Emergency Triage & Fast-Track Fee", "EMG-FEE", Decimal("300.00"), False),
        ("Nursing & Sterile Blood Sampling", "NUR-FEE", Decimal("150.00"), False),
        ("Disposable Kit & Sterile Consumables", "PPE-FEE", Decimal("200.00"), True),
        ("Ambulance Emergency Transfer", "AMB-FEE", Decimal("1200.00"), False),
    ]
    for name, code, amt, tax in other_charges_data:
        oc = db.query(OtherChargeType).filter(OtherChargeType.organization_id == org.id, OtherChargeType.code == code).first()
        if not oc:
            db.add(OtherChargeType(
                organization_id=org.id,
                name=name,
                code=code,
                default_amount=amt,
                is_taxable=tax,
                is_active=True
            ))
    db.commit()

    # Email Templates
    email_templates_data = [
        (
            "Patient Registration Welcome",
            "Welcome to Apex Health Diagnostics - UHID {{patient_uhid}}",
            "Dear {{patient_name}},\n\nThank you for choosing Apex Health Diagnostics. Your patient registration is confirmed with UHID: {{patient_uhid}}.\n\nYou can access your test updates and diagnostic history at any time.\n\nWarm regards,\nApex Health Diagnostics"
        ),
        (
            "Diagnostic Report Verified Notification",
            "Your Diagnostic Test Report is Ready (Case #{{case_number}})",
            "Dear {{patient_name}},\n\nYour clinical diagnostic report for Case #{{case_number}} has been verified by our medical specialists and is ready for collection or online viewing.\n\nThank you,\nApex Health Diagnostics"
        ),
        (
            "Appointment & Investigation Reminder",
            "Upcoming Test Reminder - Apex Health Diagnostics",
            "Dear {{patient_name}},\n\nThis is a friendly reminder for your scheduled diagnostic test on {{appointment_date}} at {{branch_name}}.\nPlease follow any pre-test fasting instructions provided.\n\nRegards,\nApex Health Team"
        ),
    ]
    for name, subj, body in email_templates_data:
        et = db.query(EmailTemplate).filter(EmailTemplate.organization_id == org.id, EmailTemplate.name == name).first()
        if not et:
            db.add(EmailTemplate(
                organization_id=org.id,
                name=name,
                subject=subj,
                body=body,
                is_active=True
            ))
    db.commit()

    # --------------------------------------------------------------------------
    # Synthetic Patients & Cases Seed Data
    # --------------------------------------------------------------------------
    branch_id = branches.get("1").id if "1" in branches else list(branches.values())[0].id

    # Categories lookup
    senior_cat = db.query(PatientCategory).filter(PatientCategory.organization_id == org.id, PatientCategory.name.like("%Senior%")).first()
    corp_cat = db.query(PatientCategory).filter(PatientCategory.organization_id == org.id, PatientCategory.name.like("%Corporate%")).first()

    # Doctors lookup
    doc_trivedi = db.query(Doctor).filter(Doctor.organization_id == org.id, Doctor.full_name.like("%Trivedi%")).first()
    doc_kulkarni = db.query(Doctor).filter(Doctor.organization_id == org.id, Doctor.full_name.like("%Kulkarni%")).first()
    doc_nair = db.query(Doctor).filter(Doctor.organization_id == org.id, Doctor.full_name.like("%Nair%")).first()
    doc_merchant = db.query(Doctor).filter(Doctor.organization_id == org.id, Doctor.full_name.like("%Merchant%")).first()

    # Investigations lookup
    inv_cbc = db.query(Investigation).filter(Investigation.organization_id == org.id, Investigation.code == "CBC-01").first()
    inv_lft = db.query(Investigation).filter(Investigation.organization_id == org.id, Investigation.code == "LFT-03").first()
    inv_cxr = db.query(Investigation).filter(Investigation.organization_id == org.id, Investigation.code == "XRAY-01").first()
    inv_mri = db.query(Investigation).filter(Investigation.organization_id == org.id, Investigation.code == "MRI-01").first()
    inv_usg = db.query(Investigation).filter(Investigation.organization_id == org.id, Investigation.code == "USG-01").first()

    # Other charges lookup
    charge_reg = db.query(OtherChargeType).filter(OtherChargeType.organization_id == org.id, OtherChargeType.code == "REG-FEE").first()
    charge_kit = db.query(OtherChargeType).filter(OtherChargeType.organization_id == org.id, OtherChargeType.code == "PPE-FEE").first()

    synthetic_patients = [
        ("Rajesh", "Mehta", "1972-04-12", 54, "male", "B+", "+91-9820123456", "rajesh.mehta@example.com", "402 Sea Pearl, Worli", "Mumbai", senior_cat.id if senior_cat else None),
        ("Ananya", "Deshmukh", "1998-09-21", 28, "female", "O+", "+91-9820234567", "ananya.d@example.com", "12 Koregaon Park", "Pune", corp_cat.id if corp_cat else None),
        ("Kavita", "Iyer", "1964-11-05", 62, "female", "A+", "+91-9820345678", "kavita.iyer@example.com", "804 Palm Beach Road", "Navi Mumbai", senior_cat.id if senior_cat else None),
        ("Aditya", "Verma", "1991-07-18", 35, "male", "AB+", "+91-9820456789", "aditya.v@example.com", "55 Hiranandani Estate", "Thane", None),
        ("Sunil", "Patil", "1984-02-28", 42, "male", "O-", "+91-9820567890", "sunil.patil@example.com", "101 Station Road", "Kalyan", None),
    ]

    patient_records = []
    idx = 1
    today_str = datetime.now(timezone.utc).strftime("%Y%m%d")

    for fn, ln, dob_s, age, gen, bg, ph, em, addr, city, cat_id in synthetic_patients:
        existing_p = db.query(Patient).filter(Patient.organization_id == org.id, Patient.phone == ph).first()
        if not existing_p:
            uhid = f"APX-PAT-{today_str}-{idx:04d}"
            p = Patient(
                organization_id=org.id,
                branch_id=branch_id,
                patient_uhid=uhid,
                first_name=fn,
                last_name=ln,
                dob=datetime.strptime(dob_s, "%Y-%m-%d").date(),
                age=age,
                gender=gen,
                blood_group=bg,
                phone=ph,
                email=em,
                address=addr,
                city=city,
                category_id=cat_id,
                is_active=True
            )
            db.add(p)
            db.commit()
            db.refresh(p)
            patient_records.append(p)
            idx += 1
        else:
            patient_records.append(existing_p)

    # Synthetic Cases
    cases_config = [
        (
            0, # Rajesh Mehta
            doc_trivedi.id if doc_trivedi else None,
            doc_nair.id if doc_nair else None,
            [inv_cxr, inv_cbc],
            "in_progress",
            "normal",
            "regular",
            "Persistent cough, fever for 4 days",
            "Rule out pneumonia or lower respiratory tract infection"
        ),
        (
            1, # Ananya Deshmukh
            doc_kulkarni.id if doc_kulkarni else None,
            doc_nair.id if doc_nair else None,
            [inv_cbc, inv_lft],
            "report_pending",
            "normal",
            "regular",
            "Annual corporate health checkup, mild fatigue",
            "Routine screening panel"
        ),
        (
            2, # Kavita Iyer
            doc_trivedi.id if doc_trivedi else None,
            doc_merchant.id if doc_merchant else None,
            [inv_mri],
            "registered",
            "emergency",
            "emergency",
            "Severe episodic migraine with visual aura and vertigo",
            "Stat neuroimaging MRI brain with contrast"
        ),
        (
            3, # Aditya Verma
            doc_kulkarni.id if doc_kulkarni else None,
            doc_merchant.id if doc_merchant else None,
            [inv_usg],
            "completed",
            "normal",
            "regular",
            "Right upper quadrant abdominal pain post-prandial",
            "Evaluate for cholelithiasis or biliary sludge"
        ),
        (
            4, # Sunil Patil
            None,
            doc_nair.id if doc_nair else None,
            [inv_cbc],
            "registered",
            "normal",
            "regular",
            "General health evaluation and fatigue",
            "Routine baseline complete blood count"
        ),
    ]

    c_idx = 1
    for p_idx, ref_id, rep_id, inv_list, c_status, c_priority, c_cat, symp, notes in cases_config:
        pat = patient_records[p_idx]
        case_no = f"APX-CAS-{today_str}-{c_idx:04d}"
        c_idx += 1

        existing_c = db.query(Case).filter(Case.organization_id == org.id, Case.case_number == case_no).first()
        if not existing_c:
            # Calculate tariffs
            gross = Decimal("0.00")
            disc = Decimal("0.00")

            # Check senior discount
            cat_disc_pct = Decimal("0.00")
            if pat.category_id:
                p_cat = db.query(PatientCategory).filter(PatientCategory.id == pat.category_id).first()
                if p_cat and p_cat.discount_percentage:
                    cat_disc_pct = Decimal(str(p_cat.discount_percentage))

            valid_invs = [i for i in inv_list if i is not None]
            for inv_idx, inv in enumerate(valid_invs, start=1):
                price = inv.emergency_price if c_cat == "emergency" and inv.emergency_price > 0 else inv.default_price
                gross += price
                if cat_disc_pct > 0:
                    disc += round(price * (cat_disc_pct / Decimal("100.00")), 2)

            net = gross - disc

            case_obj = Case(
                organization_id=org.id,
                branch_id=branch_id,
                case_number=case_no,
                patient_id=pat.id,
                referring_doctor_id=ref_id,
                reporting_doctor_id=rep_id,
                visit_datetime=datetime.now(timezone.utc),
                status=c_status,
                priority=c_priority,
                case_category=c_cat,
                patient_category_id=pat.category_id,
                symptoms=symp,
                clinical_notes=notes,
                total_charges=gross,
                discount_total=disc,
                tax_total=Decimal("0.00"),
                net_amount=net,
            )
            db.add(case_obj)
            db.flush()

            for inv_idx, inv in enumerate(valid_invs, start=1):
                price = inv.emergency_price if c_cat == "emergency" and inv.emergency_price > 0 else inv.default_price
                item_disc = round(price * (cat_disc_pct / Decimal("100.00")), 2) if cat_disc_pct > 0 else Decimal("0.00")
                ci = CaseItem(
                    case_id=case_obj.id,
                    investigation_id=inv.id,
                    quantity=1,
                    price=price,
                    discount_amount=item_disc,
                    tax_amount=Decimal("0.00"),
                    final_price=price - item_disc,
                    status="completed" if c_status == "completed" else "pending",
                )
                db.add(ci)
                db.flush()

                # Clinical report container with rich findings
                rep_status = "finalized" if c_status == "completed" else ("submitted" if c_status == "report_pending" else "draft")
                findings_sample = (
                    "CLINICAL FINDINGS:\n"
                    "Lumbosacral spine demonstrates preserved vertebral body heights.\n"
                    "Mild degenerative osteophytic spurring noted at L3-L5 anterior margins.\n"
                    "Intervertebral disc space narrowing visualized at L4-L5 level.\n"
                    "No acute fracture, subluxation, or destructive bony lesion identified."
                    if "X-Ray" in inv.name or "Lumbosacral" in inv.name or "Chest" in inv.name
                    else (
                        "HEMATOLOGY PARAMETERS:\n"
                        "Hemoglobin: 13.8 g/dL (Reference: 12.0 - 16.0)\n"
                        "Total Leucocyte Count (WBC): 7,400 /mcL (Reference: 4,000 - 11,000)\n"
                        "Platelet Count: 245,000 /mcL (Reference: 150,000 - 450,000)\n"
                        "RBC Indices: Normocytic normochromic red cell morphology."
                    )
                )
                impression_sample = (
                    "Degenerative disc disease with mild spondylosis at L3-L5. Correlate clinically with nerve root radiculopathy."
                    if "X-Ray" in inv.name or "Lumbosacral" in inv.name or "Chest" in inv.name
                    else "Normal complete blood count profile within adult physiological limits."
                )
                recommendation_sample = "Clinical correlation recommended. Lumbar spine MRI advised if radicular neurological deficits persist."

                cr_obj = ClinicalReport(
                    case_id=case_obj.id,
                    case_item_id=ci.id,
                    report_number=f"APX-REP-{today_str}-{(c_idx - 1) * 10 + inv_idx:04d}",
                    report_name=f"{inv.name} - Diagnostic Study",
                    report_heading=f"{inv.name.upper()} EXAMINATION",
                    status=rep_status,
                    current_version=1,
                    findings_text=findings_sample,
                    impression=impression_sample,
                    recommendation=recommendation_sample,
                    reporting_doctor_id=rep_id,
                    digital_signature=True if rep_status == "finalized" else False,
                    patient_email=pat.email or "patient@example.com",
                    created_at=case_obj.visit_datetime,
                )
                db.add(cr_obj)
                db.flush()

                # Version 1
                db.add(ReportVersion(
                    report_id=cr_obj.id,
                    version_number=1,
                    report_name=cr_obj.report_name,
                    report_heading=cr_obj.report_heading,
                    findings_text=cr_obj.findings_text,
                    impression=cr_obj.impression,
                    recommendation=cr_obj.recommendation,
                    created_at=case_obj.visit_datetime,
                ))

                # Add sample attachment for radiology studies
                if "X-Ray" in inv.name or "Chest" in inv.name or "Lumbosacral" in inv.name:
                    db.add(ReportAttachment(
                        report_id=cr_obj.id,
                        file_name=f"{pat.first_name.upper()}_{pat.last_name.upper()}_SCAN_01.png",
                        file_type="image/png",
                        file_size=122880,
                        file_data="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
                        caption="Lumbosacral Digital Radiograph (AP & Lateral View)",
                        created_at=case_obj.visit_datetime,
                    ))

            # Automatically create Invoice for the case
            inv_no = f"APX-INV-{today_str}-{c_idx-1:04d}"
            existing_inv = db.query(Invoice).filter(Invoice.invoice_number == inv_no).first()
            if not existing_inv:
                is_paid = c_status in ["completed", "report_pending"]
                paid_amt = net if is_paid else Decimal("0.00")
                bal = Decimal("0.00") if is_paid else net
                inv_status = "paid" if is_paid else "unpaid"

                invoice = Invoice(
                    organization_id=org.id,
                    branch_id=branch_id,
                    case_id=case_obj.id,
                    invoice_number=inv_no,
                    subtotal=gross,
                    discount_total=disc,
                    tax_total=Decimal("0.00"),
                    grand_total=net,
                    paid_amount=paid_amt,
                    outstanding_balance=bal,
                    payment_status=inv_status,
                )
                db.add(invoice)
                db.flush()

                if is_paid:
                    rec_no = f"APX-REC-{today_str}-{c_idx-1:04d}"
                    pm = Payment(
                        invoice_id=invoice.id,
                        organization_id=org.id,
                        branch_id=branch_id,
                        receipt_number=rec_no,
                        amount=paid_amt,
                        payment_mode="card" if p_idx % 2 == 0 else "cash",
                        reference_number=f"TXN-{today_str}-{c_idx-1:04d}",
                        is_refund=False,
                        notes="Diagnostic billing settlement at reception",
                    )
                    db.add(pm)

                    # Add to Case Register
                    db.add(FinancialRegister(
                        organization_id=org.id,
                        branch_id=branch_id,
                        register_type="case",
                        serial_no=c_idx - 1,
                        transaction_date=datetime.now(timezone.utc),
                        particulars=f"Case fee collection ({case_obj.case_number})",
                        amount=paid_amt,
                        direction="credit",
                        regular_or_emergency=c_cat,
                        payment_mode="card" if p_idx % 2 == 0 else "cash",
                        due_or_paid="paid",
                        patient_name=f"{pat.first_name} {pat.last_name}",
                        case_number=case_obj.case_number,
                        receipt_number=rec_no,
                        reference_type="payment",
                        reference_id=pm.id,
                        remark="Standard diagnostic examination collection",
                    ))

                    # If card/online, also add to Bank Register
                    if p_idx % 2 == 0:
                        db.add(FinancialRegister(
                            organization_id=org.id,
                            branch_id=branch_id,
                            register_type="bank",
                            serial_no=c_idx - 1,
                            transaction_date=datetime.now(timezone.utc),
                            cheque_no=f"POS-CARD-{c_idx-1:04d}",
                            particulars=f"POS Settlement ({pat.first_name} {pat.last_name})",
                            amount=paid_amt,
                            direction="credit",
                            regular_or_emergency=c_cat,
                            payment_mode="card",
                            due_or_paid="paid",
                            patient_name=f"{pat.first_name} {pat.last_name}",
                            case_number=case_obj.case_number,
                            receipt_number=rec_no,
                            reference_type="payment",
                            reference_id=pm.id,
                            remark="Electronic merchant bank card settlement",
                        ))

            db.commit()

    # --------------------------------------------------------------------------
    # Additional Financial Registers Seeding (Bank, Expense, Petty Cash)
    # --------------------------------------------------------------------------
    # 1. Bank Register entries
    bank_samples = [
        ("CHQ-88201", "Direct Deposit - BlueCross Insurance Claims Reimbursement", Decimal("45000.00"), "credit", "regular", "cheque", "paid", "Quarterly panel claims settlement"),
        ("NEFT-99120", "Diagnostic Equipment Maintenance - Siemens Healthcare", Decimal("18500.00"), "debit", "regular", "online", "paid", "Annual AMC for X-Ray and Ultrasound machines"),
        ("CHQ-88205", "Doctor Professional Referral Fees Payout", Decimal("12500.00"), "debit", "regular", "cheque", "paid", "Monthly consulting doctor fees"),
    ]
    for b_idx, (chq, part, amt, direction, reg_emg, mode, due_paid, remark) in enumerate(bank_samples, start=10):
        exists = db.query(FinancialRegister).filter(
            FinancialRegister.organization_id == org.id,
            FinancialRegister.register_type == "bank",
            FinancialRegister.cheque_no == chq
        ).first()
        if not exists:
            db.add(FinancialRegister(
                organization_id=org.id,
                branch_id=branch_id,
                register_type="bank",
                serial_no=b_idx,
                transaction_date=datetime.now(timezone.utc),
                cheque_no=chq,
                particulars=part,
                amount=amt,
                direction=direction,
                regular_or_emergency=reg_emg,
                payment_mode=mode,
                due_or_paid=due_paid,
                remark=remark,
            ))

    # 2. Expense Register entries
    expense_samples = [
        ("CHQ-77101", "Biomedical Waste Disposal & Incineration Services", Decimal("3500.00"), "debit", "regular", "cheque", "paid", "Monthly hazardous clinical waste compliance"),
        ("CASH-VOUCH-01", "Laboratory Reagents & Control Sera - Roche Diagnostics", Decimal("14200.00"), "debit", "regular", "cash", "paid", "Biochemistry and hematology reagent kits"),
        ("CHQ-77104", "Electric Utility & Backup Generator Fuel", Decimal("8900.00"), "debit", "regular", "cheque", "paid", "Facility utilities and power maintenance"),
        ("INV-DUE-99", "Stationery, Thermal Printer Rolls & Barcode Labels", Decimal("2400.00"), "debit", "regular", "cash", "due", "Pending vendor invoice approval"),
    ]
    for e_idx, (chq, part, amt, direction, reg_emg, mode, due_paid, remark) in enumerate(expense_samples, start=1):
        exists = db.query(FinancialRegister).filter(
            FinancialRegister.organization_id == org.id,
            FinancialRegister.register_type == "expense",
            FinancialRegister.particulars == part
        ).first()
        if not exists:
            db.add(FinancialRegister(
                organization_id=org.id,
                branch_id=branch_id,
                register_type="expense",
                serial_no=e_idx,
                transaction_date=datetime.now(timezone.utc),
                cheque_no=chq,
                particulars=part,
                amount=amt,
                direction=direction,
                regular_or_emergency=reg_emg,
                payment_mode=mode,
                due_or_paid=due_paid,
                remark=remark,
            ))

    # 3. Petty Cash Register entries
    petty_cash_samples = [
        ("Petty Cash Replenishment from Main Vault", Decimal("5000.00"), "credit", "cash", "paid", "Weekly receptionist float replenishment"),
        ("Urgent Courier for Histopathology Biopsy Samples", Decimal("450.00"), "debit", "cash", "paid", "Sent to reference laboratory via fast courier"),
        ("Drinking Water Dispenser Refill Cans", Decimal("600.00"), "debit", "cash", "paid", "Patient waiting lounge supplies"),
        ("Emergency Cleaning & Disinfection Supplies", Decimal("850.00"), "debit", "cash", "paid", "Sanitizers, sterile gloves and alcohol wipes"),
    ]
    for p_idx, (part, amt, direction, mode, due_paid, remark) in enumerate(petty_cash_samples, start=1):
        exists = db.query(FinancialRegister).filter(
            FinancialRegister.organization_id == org.id,
            FinancialRegister.register_type == "petty_cash",
            FinancialRegister.particulars == part
        ).first()
        if not exists:
            db.add(FinancialRegister(
                organization_id=org.id,
                branch_id=branch_id,
                register_type="petty_cash",
                serial_no=p_idx,
                transaction_date=datetime.now(timezone.utc),
                particulars=part,
                amount=amt,
                direction=direction,
                payment_mode=mode,
                due_or_paid=due_paid,
                remark=remark,
            ))

    # 4. Phase 6: Sample Chat Messages, Notifications & Email Logs
    admin_u = db.query(User).filter(User.username == "admin").first()
    doc_u = db.query(User).filter(User.username == "drmarcus").first()
    recep_u = db.query(User).filter(User.username == "receptionist").first()
    writer_u = db.query(User).filter(User.username == "writer").first()

    first_case = db.query(Case).filter(Case.organization_id == org.id).first()
    first_report = db.query(ClinicalReport).join(Case, ClinicalReport.case_id == Case.id).filter(Case.organization_id == org.id).first()

    if admin_u and doc_u and recep_u and writer_u:
        # Sample Chat Messages
        chat_count = db.query(ChatMessage).filter(ChatMessage.organization_id == org.id).count()
        if chat_count == 0:
            sample_messages = [
                (admin_u.id, None, "general", "Welcome to Apex Health Diagnostics PMS. System migration to Phase 6 operational.", None, None),
                (recep_u.id, None, "general", "Front desk active. Today's morning OPD registration is running smoothly across all branches.", None, None),
                (doc_u.id, None, "clinical-updates", "Reviewing urgent abdominal scans for today. Please flag any emergency contrast studies.", first_case.id if first_case else None, None),
                (writer_u.id, None, "clinical-updates", "Report drafted for complete blood count and submitted for doctor sign-off.", first_case.id if first_case else None, first_report.id if first_report else None),
                (recep_u.id, None, "billing", "Split payment collected via UPI and cash for patient registration.", first_case.id if first_case else None, None),
                # Direct Message between receptionist and doctor
                (recep_u.id, doc_u.id, None, "Dr. Marcus, patient Ananya Deshmukh is waiting for ultrasound scan.", first_case.id if first_case else None, None),
                (doc_u.id, recep_u.id, None, "Acknowledged Emily, preparing sonography room 2 now.", first_case.id if first_case else None, None),
            ]
            for s_id, r_id, chn, cnt, c_id, rep_id in sample_messages:
                db.add(ChatMessage(
                    organization_id=org.id,
                    branch_id=branch_id,
                    sender_id=s_id,
                    recipient_id=r_id,
                    channel=chn,
                    content=cnt,
                    case_id=c_id,
                    report_id=rep_id,
                    is_read=False,
                ))

        # Sample Notifications
        notif_count = db.query(Notification).filter(Notification.organization_id == org.id).count()
        if notif_count == 0:
            db.add(Notification(
                organization_id=org.id,
                user_id=doc_u.id,
                title="Emergency Case Assigned",
                message="Emergency ultrasound scan registered for patient Kavita Iyer.",
                notification_type="urgent",
                link_url="/cases",
                is_read=False,
            ))
            db.add(Notification(
                organization_id=org.id,
                user_id=doc_u.id,
                title="Diagnostic Report Pending Review",
                message="Complete Blood Count report drafted by Alex Rivera awaiting doctor verification.",
                notification_type="clinical",
                link_url="/reports/clinical",
                is_read=False,
            ))
            db.add(Notification(
                organization_id=org.id,
                user_id=recep_u.id,
                title="Diagnostic Report Finalized",
                message="Digital Chest X-Ray report finalized and signed off by Dr. Marcus Vance. Ready for delivery.",
                notification_type="info",
                link_url="/reports/clinical",
                is_read=False,
            ))

        # Sample Email Logs
        email_count = db.query(EmailLog).filter(EmailLog.organization_id == org.id).count()
        if email_count == 0:
            db.add(EmailLog(
                organization_id=org.id,
                branch_id=branch_id,
                sender_id=doc_u.id,
                recipient_email="rajesh.mehta@example.com",
                recipient_name="Rajesh Mehta",
                subject="Your Diagnostic Test Report is Ready (Case #APX-CAS-20261120-0001)",
                body="Dear Rajesh Mehta,\n\nYour clinical diagnostic report has been verified by our medical specialists and is ready for online viewing.\n\nThank you,\nApex Health Diagnostics",
                case_id=first_case.id if first_case else None,
                report_id=first_report.id if first_report else None,
                status="delivered",
            ))
            db.add(EmailLog(
                organization_id=org.id,
                branch_id=branch_id,
                sender_id=recep_u.id,
                recipient_email="dr.sharma@apollo.org",
                recipient_name="Dr. Vikram Sharma",
                subject="Clinical Referral Summary (Patient: Ananya Deshmukh)",
                body="Dear Dr. Vikram Sharma,\n\nHere is the diagnostic study summary for patient Ananya Deshmukh referred to Apex Central Diagnostic Hospital.",
                case_id=first_case.id if first_case else None,
                status="sent",
            ))

        # Sample Initial Backup Snapshot (Phase 7)
        backup_count = db.query(BackupRecord).filter(BackupRecord.organization_id == org.id).count()
        if backup_count == 0:
            db.add(BackupRecord(
                organization_id=org.id,
                filename="apex_db_baseline_snapshot.db",
                file_path="storage/backups/apex_db_baseline_snapshot.db",
                file_size_bytes=1048576,
                file_size_human="1.05 MB",
                backup_type="database_dump",
                status="completed",
                checksum_sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                created_by_id=admin_u.id,
                notes="Initial system deployment baseline snapshot",
            ))

    db.commit()

