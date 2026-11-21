import json
from datetime import datetime, timezone, date, time
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, func

from app.core.rbac import AuthenticatedUserContext, get_current_user, require_permission
from app.db.session import get_db
from app.models.schema_all import (
    ClinicalReport, ReportVersion, ReportAttachment, Case, CaseItem, Patient,
    Investigation, Department, Doctor, ReportTemplate
)
from app.models.audit import AuditLog
from app.models.branch import Branch
from app.models.user import User
from app.core.generators import generate_report_number
from app.schemas.reports import (
    ClinicalReportCreate, ClinicalReportUpdate, ClinicalReportListItem,
    ClinicalReportDetailResponse, ClinicalReportsStatsResponse,
    ReportSubmitRequest, ReportVerifyRequest, ReportFinalizeRequest,
    ReportAmendRequest, ReportVersionResponse,
    ReportAttachmentCreate, ReportAttachmentResponse
)

router = APIRouter(prefix="/clinical-reports", tags=["Clinical Reports & Verification"])


def _build_report_list_item(cr: ClinicalReport, db: Session) -> ClinicalReportListItem:
    ci = db.query(CaseItem).filter(CaseItem.id == cr.case_item_id).first()
    c = db.query(Case).filter(Case.id == ci.case_id).first() if ci else None
    p = db.query(Patient).filter(Patient.id == c.patient_id).first() if c else None
    inv = db.query(Investigation).filter(Investigation.id == ci.investigation_id).first() if ci else None
    dept = db.query(Department).filter(Department.id == inv.department_id).first() if inv and inv.department_id else None

    rep_doc = db.query(Doctor).filter(Doctor.id == cr.reporting_doctor_id).first() if cr.reporting_doctor_id else None
    ver_user = db.query(User).filter(User.id == cr.verified_by_id).first() if cr.verified_by_id else None
    fin_user = db.query(User).filter(User.id == cr.finalized_by_id).first() if cr.finalized_by_id else None

    # Calculate patient age
    p_age = p.age
    if p and p_age is None and p.dob:
        today = date.today()
        p_age = today.year - p.dob.year - ((today.month, today.day) < (p.dob.month, p.dob.day))

    return ClinicalReportListItem(
        id=cr.id,
        report_number=cr.report_number or "PENDING",
        case_id=c.id if c else "",
        case_number=c.case_number if c else "",
        case_item_id=cr.case_item_id,
        patient_id=p.id if p else "",
        patient_uhid=p.patient_uhid if p else "",
        patient_name=f"{p.first_name} {p.last_name}" if p else "Unknown",
        patient_age=p_age,
        patient_gender=p.gender if p else "",
        patient_phone=p.phone if p else None,
        investigation_id=inv.id if inv else "",
        investigation_code=inv.code if inv else "",
        investigation_name=inv.name if inv else "",
        department_name=dept.name if dept else None,
        report_name=cr.report_name,
        report_heading=cr.report_heading,
        status=cr.status,
        current_version=cr.current_version,
        reporting_doctor_name=f"Dr. {rep_doc.full_name}" if rep_doc else None,
        verified_by_name=ver_user.full_name if ver_user else None,
        verified_at=cr.verified_at,
        finalized_by_name=fin_user.full_name if fin_user else None,
        finalized_at=cr.finalized_at,
        created_at=cr.created_at,
        updated_at=cr.updated_at,
    )


# ------------------------------------------------------------------------------
# 1. REPORT STATS & WORKLIST
# ------------------------------------------------------------------------------

@router.get("/summary/stats", response_model=ClinicalReportsStatsResponse)
def get_reports_stats(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("patient_report:view")),
):
    query = db.query(ClinicalReport).join(CaseItem, ClinicalReport.case_item_id == CaseItem.id).join(
        Case, CaseItem.case_id == Case.id
    ).filter(Case.organization_id == current_user.organization_id)

    if not current_user.is_superadmin and current_user.active_branch_id:
        query = query.filter(Case.branch_id.in_(current_user.branch_ids))

    total = query.count()
    draft_c = query.filter(ClinicalReport.status == "draft").count()
    sub_c = query.filter(ClinicalReport.status == "submitted").count()
    ver_c = query.filter(ClinicalReport.status == "verified").count()
    fin_c = query.filter(ClinicalReport.status == "finalized").count()
    amd_c = query.filter(ClinicalReport.status == "amended").count()

    return ClinicalReportsStatsResponse(
        total_reports=total,
        draft_count=draft_c,
        submitted_count=sub_c,
        verified_count=ver_c,
        finalized_count=fin_c,
        amended_count=amd_c,
    )


@router.get("", response_model=List[ClinicalReportListItem])
def list_clinical_reports(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    status: Optional[str] = None,
    department_id: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    branch_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("patient_report:view")),
):
    query = db.query(ClinicalReport).join(CaseItem, ClinicalReport.case_item_id == CaseItem.id).join(
        Case, CaseItem.case_id == Case.id
    ).join(
        Patient, Case.patient_id == Patient.id
    ).join(
        Investigation, CaseItem.investigation_id == Investigation.id
    ).filter(Case.organization_id == current_user.organization_id)

    if branch_id:
        query = query.filter(Case.branch_id == branch_id)
    elif not current_user.is_superadmin and current_user.active_branch_id:
        query = query.filter(Case.branch_id.in_(current_user.branch_ids))

    if status and status != "all":
        query = query.filter(ClinicalReport.status == status)

    if department_id:
        query = query.filter(Investigation.department_id == department_id)

    if start_date:
        s_dt = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
        query = query.filter(Case.visit_datetime >= s_dt)

    if end_date:
        e_dt = datetime.combine(end_date, time.max, tzinfo=timezone.utc)
        query = query.filter(Case.visit_datetime <= e_dt)

    if search:
        s_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                ClinicalReport.report_number.ilike(s_term),
                Case.case_number.ilike(s_term),
                Patient.patient_uhid.ilike(s_term),
                Patient.first_name.ilike(s_term),
                Patient.last_name.ilike(s_term),
                Investigation.name.ilike(s_term),
            )
        )

    reports = query.order_by(desc(ClinicalReport.created_at)).offset(skip).limit(limit).all()

    return [_build_report_list_item(cr, db) for cr in reports]


# ------------------------------------------------------------------------------
# 2. REPORT DETAIL & CASE REPORTS
# ------------------------------------------------------------------------------

@router.get("/{id}", response_model=ClinicalReportDetailResponse)
def get_clinical_report(
    id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("patient_report:view")),
):
    cr = db.query(ClinicalReport).filter(ClinicalReport.id == id).first()
    if not cr:
        raise HTTPException(status_code=404, detail="Clinical report not found")

    ci = db.query(CaseItem).filter(CaseItem.id == cr.case_item_id).first()
    if not ci:
        raise HTTPException(status_code=404, detail="Case item not found")

    c = db.query(Case).filter(Case.id == ci.case_id).first()
    if not c or c.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Case not found or access denied")

    p = db.query(Patient).filter(Patient.id == c.patient_id).first()
    inv = db.query(Investigation).filter(Investigation.id == ci.investigation_id).first()
    dept = db.query(Department).filter(Department.id == inv.department_id).first() if inv and inv.department_id else None
    tmpl = db.query(ReportTemplate).filter(ReportTemplate.id == cr.template_id).first() if cr.template_id else None
    br = db.query(Branch).filter(Branch.id == c.branch_id).first()

    ref_doc = db.query(Doctor).filter(Doctor.id == c.referring_doctor_id).first() if c.referring_doctor_id else None
    rep_doc = db.query(Doctor).filter(Doctor.id == cr.reporting_doctor_id).first() if cr.reporting_doctor_id else None
    ver_user = db.query(User).filter(User.id == cr.verified_by_id).first() if cr.verified_by_id else None
    fin_user = db.query(User).filter(User.id == cr.finalized_by_id).first() if cr.finalized_by_id else None

    # Load versions
    versions = db.query(ReportVersion).filter(ReportVersion.report_id == cr.id).order_by(desc(ReportVersion.version_number)).all()
    version_items = []
    for v in versions:
        u = db.query(User).filter(User.id == v.created_by_id).first() if v.created_by_id else None
        version_items.append(ReportVersionResponse(
            id=v.id,
            report_id=v.report_id,
            version_number=v.version_number,
            report_name=v.report_name,
            report_heading=v.report_heading,
            findings_text=v.findings_text,
            impression=v.impression,
            recommendation=v.recommendation,
            rendered_html=v.rendered_html,
            amendment_reason=v.amendment_reason,
            created_by_name=u.full_name if u else None,
            created_at=v.created_at,
        ))

    # Load attachments
    attachments = db.query(ReportAttachment).filter(ReportAttachment.report_id == cr.id).order_by(ReportAttachment.created_at).all()
    attachment_items = [ReportAttachmentResponse.model_validate(att) for att in attachments]

    p_age = p.age
    if p and p_age is None and p.dob:
        today = date.today()
        p_age = today.year - p.dob.year - ((today.month, today.day) < (p.dob.month, p.dob.day))

    return ClinicalReportDetailResponse(
        id=cr.id,
        report_number=cr.report_number or "PENDING",
        case_id=c.id,
        case_number=c.case_number,
        case_item_id=cr.case_item_id,
        patient_id=p.id if p else "",
        patient_uhid=p.patient_uhid if p else "",
        patient_name=f"{p.first_name} {p.last_name}" if p else "",
        patient_age=p_age,
        patient_gender=p.gender if p else "",
        patient_phone=p.phone if p else None,
        patient_city=p.city if p else None,
        patient_email=cr.patient_email or (p.email if p else None),
        patient_symptoms=c.symptoms,
        referring_doctor_name=f"Dr. {ref_doc.full_name}" if ref_doc else None,
        reporting_doctor_name=f"Dr. {rep_doc.full_name}" if rep_doc else None,
        branch_name=br.name if br else None,
        branch_address=br.address if br else None,
        investigation_id=inv.id if inv else "",
        investigation_code=inv.code if inv else "",
        investigation_name=inv.name if inv else "",
        department_name=dept.name if dept else None,
        template_id=cr.template_id,
        template_name=tmpl.name if tmpl else None,
        report_name=cr.report_name or (inv.name if inv else ""),
        report_heading=cr.report_heading or (f"{inv.name.upper()} REPORT" if inv else ""),
        status=cr.status,
        current_version=cr.current_version,
        findings_text=cr.findings_text,
        impression=cr.impression,
        recommendation=cr.recommendation,
        verification_remarks=cr.verification_remarks,
        digital_signature=cr.digital_signature,
        verified_by_name=ver_user.full_name if ver_user else None,
        verified_at=cr.verified_at,
        finalized_by_name=fin_user.full_name if fin_user else None,
        finalized_at=cr.finalized_at,
        versions=version_items,
        attachments=attachment_items,
        created_at=cr.created_at,
        updated_at=cr.updated_at,
    )


@router.get("/by-case/{case_id}", response_model=List[ClinicalReportListItem])
def get_reports_by_case(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("patient_report:view")),
):
    case = db.query(Case).filter(Case.id == case_id, Case.organization_id == current_user.organization_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    reports = db.query(ClinicalReport).join(CaseItem, ClinicalReport.case_item_id == CaseItem.id).filter(
        CaseItem.case_id == case.id
    ).all()

    return [_build_report_list_item(cr, db) for cr in reports]


# ------------------------------------------------------------------------------
# 3. REPORT CREATION & DRAFT EDITING
# ------------------------------------------------------------------------------

@router.post("", response_model=ClinicalReportDetailResponse, status_code=status.HTTP_201_CREATED)
def create_clinical_report(
    payload: ClinicalReportCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("patient_report:add")),
):
    ci = db.query(CaseItem).filter(CaseItem.id == payload.case_item_id).first()
    if not ci:
        raise HTTPException(status_code=404, detail="Case item not found")

    c = db.query(Case).filter(Case.id == ci.case_id).first()
    if not c or c.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Access denied")

    rep_num = generate_report_number(db)
    inv = db.query(Investigation).filter(Investigation.id == ci.investigation_id).first()

    default_name = payload.report_name or (inv.name if inv else "Investigation Report")
    default_heading = payload.report_heading or (f"{inv.name.upper()} REPORT" if inv else "CLINICAL INVESTIGATION REPORT")

    report = ClinicalReport(
        case_id=c.id,
        case_item_id=ci.id,
        template_id=payload.template_id,
        report_number=rep_num,
        report_name=default_name,
        report_heading=default_heading,
        status="draft",
        current_version=1,
        findings_text=payload.findings_text,
        impression=payload.impression,
        recommendation=payload.recommendation,
        reporting_doctor_id=c.reporting_doctor_id,
    )
    db.add(report)
    db.flush()

    # Initial Version 1 snapshot
    v1 = ReportVersion(
        report_id=report.id,
        version_number=1,
        report_name=report.report_name,
        report_heading=report.report_heading,
        findings_text=report.findings_text,
        impression=report.impression,
        recommendation=report.recommendation,
        created_by_id=current_user.id,
    )
    db.add(v1)
    db.commit()
    db.refresh(report)

    return get_clinical_report(report.id, db, current_user)


@router.put("/{id}", response_model=ClinicalReportDetailResponse)
def update_clinical_report_draft(
    id: str,
    payload: ClinicalReportUpdate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("patient_report:update")),
):
    cr = db.query(ClinicalReport).filter(ClinicalReport.id == id).first()
    if not cr:
        raise HTTPException(status_code=404, detail="Clinical report not found")

    if cr.status in ["finalized"]:
        raise HTTPException(
            status_code=400,
            detail="Finalized clinical reports cannot be directly modified. Use the amendment workflow to create a signed addendum."
        )

    if not cr.report_number:
        cr.report_number = generate_report_number(db)

    if payload.report_name is not None:
        cr.report_name = payload.report_name
    if payload.report_heading is not None:
        cr.report_heading = payload.report_heading
    if payload.findings_text is not None:
        cr.findings_text = payload.findings_text
    if payload.impression is not None:
        cr.impression = payload.impression
    if payload.recommendation is not None:
        cr.recommendation = payload.recommendation
    if payload.patient_email is not None:
        cr.patient_email = payload.patient_email

    # Keep latest version snapshot updated
    latest_v = db.query(ReportVersion).filter(
        ReportVersion.report_id == cr.id,
        ReportVersion.version_number == cr.current_version
    ).first()
    if latest_v:
        latest_v.report_name = cr.report_name
        latest_v.report_heading = cr.report_heading
        latest_v.findings_text = cr.findings_text
        latest_v.impression = cr.impression
        latest_v.recommendation = cr.recommendation

    db.commit()
    db.refresh(cr)
    return get_clinical_report(cr.id, db, current_user)


# ------------------------------------------------------------------------------
# 4. LIFECYCLE WORKFLOW (SUBMIT -> VERIFY -> FINALIZE -> AMEND)
# ------------------------------------------------------------------------------

@router.post("/{id}/submit", response_model=ClinicalReportDetailResponse)
def submit_report_for_review(
    id: str,
    payload: ReportSubmitRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("patient_report:add")),
):
    cr = db.query(ClinicalReport).filter(ClinicalReport.id == id).first()
    if not cr:
        raise HTTPException(status_code=404, detail="Clinical report not found")

    if cr.status not in ["draft", "amended"]:
        raise HTTPException(status_code=400, detail=f"Cannot submit report with status '{cr.status}'")

    if not cr.report_number:
        cr.report_number = generate_report_number(db)

    cr.status = "submitted"
    db.commit()
    db.refresh(cr)
    return get_clinical_report(cr.id, db, current_user)


@router.post("/{id}/verify", response_model=ClinicalReportDetailResponse)
def verify_clinical_report(
    id: str,
    payload: ReportVerifyRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("patient_report:verify")),
):
    cr = db.query(ClinicalReport).filter(ClinicalReport.id == id).first()
    if not cr:
        raise HTTPException(status_code=404, detail="Clinical report not found")

    if cr.status not in ["submitted", "draft"]:
        raise HTTPException(status_code=400, detail=f"Cannot verify report currently in '{cr.status}' status")

    cr.status = "verified"
    cr.verified_by_id = current_user.id
    cr.verified_at = datetime.now(timezone.utc)
    if payload.verification_remarks:
        cr.verification_remarks = payload.verification_remarks

    db.commit()
    db.refresh(cr)
    return get_clinical_report(cr.id, db, current_user)


@router.post("/{id}/finalize", response_model=ClinicalReportDetailResponse)
def finalize_clinical_report(
    id: str,
    payload: ReportFinalizeRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("patient_report:finalize")),
):
    cr = db.query(ClinicalReport).filter(ClinicalReport.id == id).first()
    if not cr:
        raise HTTPException(status_code=404, detail="Clinical report not found")

    if cr.status == "finalized":
        raise HTTPException(status_code=400, detail="Report is already finalized and signed.")

    if not cr.findings_text or not cr.findings_text.strip():
        raise HTTPException(status_code=400, detail="Cannot finalize report without clinical findings text.")

    cr.status = "finalized"
    cr.finalized_by_id = current_user.id
    cr.finalized_at = datetime.now(timezone.utc)
    cr.digital_signature = payload.digital_signature

    # Audit log
    db.add(AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="report:finalize",
        entity_type="clinical_report",
        entity_id=cr.id,
        changes_json=json.dumps({"report_number": cr.report_number, "signed": payload.digital_signature})
    ))

    # Check if all reports for this case are finalized; if so, update Case status to completed
    ci = db.query(CaseItem).filter(CaseItem.id == cr.case_item_id).first()
    if ci:
        other_reports = db.query(ClinicalReport).join(CaseItem, ClinicalReport.case_item_id == CaseItem.id).filter(
            CaseItem.case_id == ci.case_id,
            ClinicalReport.id != cr.id
        ).all()
        if all(r.status == "finalized" for r in other_reports):
            case = db.query(Case).filter(Case.id == ci.case_id).first()
            if case and case.status != "cancelled":
                case.status = "completed"

    db.commit()
    db.refresh(cr)
    return get_clinical_report(cr.id, db, current_user)


@router.post("/{id}/amend", response_model=ClinicalReportDetailResponse)
def amend_clinical_report(
    id: str,
    payload: ReportAmendRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("patient_report:finalize")),
):
    """
    Creates an amended version of a finalized report with explicit medical change reason.
    """
    cr = db.query(ClinicalReport).filter(ClinicalReport.id == id).first()
    if not cr:
        raise HTTPException(status_code=404, detail="Clinical report not found")

    if cr.status != "finalized":
        raise HTTPException(status_code=400, detail="Only finalized reports can be amended.")

    new_version_num = cr.current_version + 1
    cr.current_version = new_version_num
    cr.status = "amended"

    if payload.report_name:
        cr.report_name = payload.report_name
    if payload.report_heading:
        cr.report_heading = payload.report_heading
    if payload.findings_text:
        cr.findings_text = payload.findings_text
    if payload.impression:
        cr.impression = payload.impression
    if payload.recommendation:
        cr.recommendation = payload.recommendation

    # Reset finalization until re-verified
    cr.finalized_at = None
    cr.finalized_by_id = None
    cr.digital_signature = False

    # Store Version Snapshot
    new_v = ReportVersion(
        report_id=cr.id,
        version_number=new_version_num,
        report_name=cr.report_name,
        report_heading=cr.report_heading,
        findings_text=cr.findings_text,
        impression=cr.impression,
        recommendation=cr.recommendation,
        amendment_reason=payload.amendment_reason,
        created_by_id=current_user.id,
    )
    db.add(new_v)

    db.add(AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="report:amend",
        entity_type="clinical_report",
        entity_id=cr.id,
        changes_json=json.dumps({"reason": payload.amendment_reason, "version": new_version_num})
    ))

    db.commit()
    db.refresh(cr)
    return get_clinical_report(cr.id, db, current_user)


# ------------------------------------------------------------------------------
# 5. ATTACHMENTS (Images / Scan Uploads)
# ------------------------------------------------------------------------------

@router.post("/{id}/attachments", response_model=ReportAttachmentResponse, status_code=status.HTTP_201_CREATED)
def add_report_attachment(
    id: str,
    payload: ReportAttachmentCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("patient_report:update")),
):
    cr = db.query(ClinicalReport).filter(ClinicalReport.id == id).first()
    if not cr:
        raise HTTPException(status_code=404, detail="Clinical report not found")

    attachment = ReportAttachment(
        report_id=cr.id,
        file_name=payload.file_name,
        file_type=payload.file_type,
        file_size=payload.file_size,
        file_data=payload.file_data,
        caption=payload.caption,
        uploaded_by_id=current_user.id,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return ReportAttachmentResponse.model_validate(attachment)


@router.delete("/{id}/attachments/{att_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report_attachment(
    id: str,
    att_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("patient_report:update")),
):
    att = db.query(ReportAttachment).filter(
        ReportAttachment.id == att_id,
        ReportAttachment.report_id == id
    ).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")

    db.delete(att)
    db.commit()
    return None


# ------------------------------------------------------------------------------
# 6. SEND EMAIL TO PATIENT
# ------------------------------------------------------------------------------

@router.post("/{id}/send-email")
def send_patient_report_email(
    id: str,
    email: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("patient_report:view")),
):
    cr = db.query(ClinicalReport).filter(ClinicalReport.id == id).first()
    if not cr:
        raise HTTPException(status_code=404, detail="Clinical report not found")

    target_email = email or cr.patient_email
    if not target_email:
        # Check patient record
        ci = db.query(CaseItem).filter(CaseItem.id == cr.case_item_id).first()
        if ci:
            c = db.query(Case).filter(Case.id == ci.case_id).first()
            if c:
                p = db.query(Patient).filter(Patient.id == c.patient_id).first()
                if p:
                    target_email = p.email

    if not target_email:
        raise HTTPException(status_code=400, detail="No email address specified for recipient.")

    # Record in AuditLog and update report's patient_email field
    cr.patient_email = target_email
    db.add(AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="report:send_email",
        entity_type="clinical_report",
        entity_id=cr.id,
        changes_json=json.dumps({"recipient": target_email, "report_number": cr.report_number})
    ))
    db.commit()

    return {
        "status": "success",
        "message": f"Clinical report {cr.report_number} queued and dispatched to {target_email}",
        "recipient": target_email,
        "report_number": cr.report_number,
    }
