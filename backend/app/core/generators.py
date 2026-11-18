from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.schema_all import Patient, Case


def generate_uhid(db: Session, organization_id: str) -> str:
    today_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    prefix = f"APX-PAT-{today_str}-"

    # Query current max for today or count
    count = db.query(func.count(Patient.id)).filter(
        Patient.organization_id == organization_id,
        Patient.patient_uhid.like(f"{prefix}%")
    ).scalar() or 0

    candidate_num = count + 1
    while True:
        candidate = f"{prefix}{candidate_num:04d}"
        exists = db.query(Patient.id).filter(Patient.patient_uhid == candidate).first()
        if not exists:
            return candidate
        candidate_num += 1


def generate_case_number(db: Session, organization_id: str) -> str:
    today_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    prefix = f"APX-CAS-{today_str}-"

    count = db.query(func.count(Case.id)).filter(
        Case.organization_id == organization_id,
        Case.case_number.like(f"{prefix}%")
    ).scalar() or 0

    candidate_num = count + 1
    while True:
        candidate = f"{prefix}{candidate_num:04d}"
        exists = db.query(Case.id).filter(Case.case_number == candidate).first()
        if not exists:
            return candidate
        candidate_num += 1
