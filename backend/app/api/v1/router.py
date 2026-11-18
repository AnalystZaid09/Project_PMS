from fastapi import APIRouter
from app.api.v1 import (
    audit_logs,
    auth,
    branches,
    cases,
    health,
    masters,
    patients,
    permissions,
    roles,
    settings,
    users,
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
api_router.include_router(settings.router)
api_router.include_router(audit_logs.router)


