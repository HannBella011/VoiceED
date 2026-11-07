from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import uuid

from app.database import get_db
from app.services import profile_service
from app.schemas import (
    UserResponse,
    UserUpdate,
    UserListResponse,
    AdminUserUpdate,
    PaginationParams,
    UserRole,
)
from app.routes.auth import get_current_active_user
from app.models import Profile, UserRole as UserRoleModel

router = APIRouter()


def require_super_admin(
    current_user: Profile = Depends(get_current_active_user),
) -> Profile:
    """Require super_admin role."""
    if not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin access required")
    return current_user


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: Profile = Depends(get_current_active_user),
):
    """Get current user profile."""
    return UserResponse(
        id=str(current_user.id),
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active,
        is_verified=bool(current_user.is_verified),
        email_verified=getattr(current_user, "_email_verified", None),
        theme=current_user.theme,
        gender=current_user.gender,
        birthday=current_user.birthday,
        school_id=current_user.school_id,
        avatar_url=current_user.avatar_url,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        last_login=current_user.last_login,
    )


@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    update: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    """Update current user profile."""
    update_data = update.model_dump(exclude_unset=True)
    user = await profile_service.update(db, current_user.id, update_data)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(
        id=str(user.id),
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        is_verified=bool(user.is_verified),
        theme=user.theme,
        gender=user.gender,
        birthday=user.birthday,
        school_id=user.school_id,
        avatar_url=user.avatar_url,
        created_at=user.created_at,
        updated_at=user.updated_at,
        last_login=user.last_login,
    )


# Retained paths delegate to the same guarded workflows as the new dashboard.
from fastapi import Query, Response
from app.schemas.accounts import AccountUpdate
from app.services import accounts


@router.get("/admin", response_model=UserListResponse)
async def admin_list_users(
    response: Response,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
    is_verified: Optional[bool] = None,
    search: str = Query("", max_length=200),
    db=Depends(get_db),
    current_user=Depends(require_super_admin),
):
    response.headers["Cache-Control"] = "private, no-store"
    return await accounts.list_users(
        db, page, limit, search, role.value if role else None, is_verified, is_active
    )


@router.patch("/admin/{user_id}", response_model=UserResponse)
async def admin_update_user(
    user_id: uuid.UUID,
    update: AccountUpdate,
    db=Depends(get_db),
    current_user=Depends(require_super_admin),
):
    return await accounts.update_account(db, user_id, update, current_user)


@router.delete("/admin/{user_id}")
async def admin_delete_user(
    user_id: uuid.UUID, current_user=Depends(require_super_admin)
):
    raise HTTPException(
        409,
        "Deactivate accounts through the superadministrator status workflow to preserve identity and audit history",
    )
