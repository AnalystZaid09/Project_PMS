from fastapi import APIRouter
from app.api.v1 import (
    audit_logs,
    auth,
    billing,
    branches,
    cases,
    clinical_reports,
    health,
    masters,
    patients,
    permissions,
    registers,
    reports,
    roles,
    settings,
    users,
    analytics,
    chat,
    notifications,
    emails,
    backups,
)

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(branches.router)
api_router.include_router(users.router)
api_router.include_router(roles.router)
api_router.include_router(permissions.router)
api_router.include_router(masters.router)
api_router.include_router(patients.router)
api_router.include_router(cases.router)
api_router.include_router(billing.router)
api_router.include_router(clinical_reports.router)
api_router.include_router(registers.router)
api_router.include_router(reports.router)
api_router.include_router(settings.router)
api_router.include_router(audit_logs.router)
api_router.include_router(analytics.router)
api_router.include_router(chat.router)
api_router.include_router(notifications.router)
api_router.include_router(emails.router)
api_router.include_router(backups.router)



