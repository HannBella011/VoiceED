from fastapi import APIRouter

from app.routes import (
    auth,
    users,
    reports,
    wellness,
    inspire,
    share,
    tracking,
    messages,
    dashboard,
    admin,
    super_admin,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(wellness.router, prefix="/wellness", tags=["wellness"])
api_router.include_router(inspire.router, prefix="/inspire", tags=["inspire"])
api_router.include_router(share.router, prefix="/share", tags=["share"])
api_router.include_router(tracking.router, prefix="/tracking", tags=["tracking"])

api_router.include_router(messages.router, prefix="/messages", tags=["messages"])

api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(
    super_admin.router, prefix="/super", tags=["superadministrator"]
)
