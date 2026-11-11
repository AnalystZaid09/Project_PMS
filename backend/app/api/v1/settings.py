from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.audit import log_audit_event
from app.core.rbac import AuthenticatedUserContext, require_permission
from app.db.session import get_db
from app.models.organization import Organization
from app.models.settings import SystemSetting
from app.schemas.settings import SystemSettingResponse, SystemSettingUpdate

router = APIRouter(prefix="/settings", tags=["System Settings"])


@router.get("/general", response_model=SystemSettingResponse)
def get_general_settings(
    current_user: AuthenticatedUserContext = Depends(require_permission("general_settings:view")),
    db: Session = Depends(get_db)
):
    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    app_name_setting = db.query(SystemSetting).filter(
        SystemSetting.organization_id == current_user.organization_id,
        SystemSetting.setting_key == "app_name"
    ).first()

    return SystemSettingResponse(
        app_name=app_name_setting.setting_value if app_name_setting else (org.name if org else "PMS"),
        logo_url=org.logo_url if org else None,
        favicon_url=org.favicon_url if org else None,
        currency_code=org.currency_code if org else "INR",
        currency_symbol=org.currency_symbol if org else "₹",
        timezone=org.timezone if org else "Asia/Kolkata",
        date_format=org.date_format if org else "DD/MM/YYYY",
    )


@router.put("/general", response_model=SystemSettingResponse)
def update_general_settings(
    update_in: SystemSettingUpdate,
    current_user: AuthenticatedUserContext = Depends(require_permission("general_settings:update")),
    db: Session = Depends(get_db)
):
    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    if org:
        if update_in.logo_url is not None:
            org.logo_url = update_in.logo_url
        if update_in.favicon_url is not None:
            org.favicon_url = update_in.favicon_url
        db.commit()

    # Update app_name setting
    setting = db.query(SystemSetting).filter(
        SystemSetting.organization_id == current_user.organization_id,
        SystemSetting.setting_key == "app_name"
    ).first()
    if not setting:
        setting = SystemSetting(
            organization_id=current_user.organization_id,
            setting_key="app_name",
            setting_value=update_in.app_name,
            category="general"
        )
        db.add(setting)
    else:
        setting.setting_value = update_in.app_name

    db.commit()

    log_audit_event(
        db=db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="GENERAL_SETTINGS_UPDATED",
        entity_type="organization",
        entity_id=current_user.organization_id,
        changes=update_in.model_dump()
    )

    return get_general_settings(current_user, db)
