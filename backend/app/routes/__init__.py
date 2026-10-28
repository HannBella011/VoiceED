from fastapi import APIRouter

from app.routes import auth, users, reports, wellness, inspire, share


api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(wellness.router, prefix="/wellness", tags=["wellness"])
api_router.include_router(inspire.router, prefix="/inspire", tags=["inspire"])
api_router.include_router(share.router, prefix="/share", tags=["share"])