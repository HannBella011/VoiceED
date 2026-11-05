from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import uuid

from app.database import get_db
from app.services import profile_service
from app.schemas import UserResponse, UserUpdate, UserListResponse, AdminUserUpdate, PaginationParams, UserRole
from app.routes.auth import get_current_active_user
from app.models import Profile, UserRole as UserRoleModel

router = APIRouter()


def require_super_admin(current_user: Profile = Depends(get_current_active_user)) -> Profile:
    """Require super_admin role."""
    if not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin access required")
    return current_user


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: Profile = Depends(get_current_active_user)
):
    """Get current user profile."""
    return UserResponse(
        id=str(current_user.id),
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        gender=current_user.gender,
        birthday=current_user.birthday,
        avatar_url=current_user.avatar_url,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        last_login=current_user.last_login
    )


@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    update: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user)
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
        is_verified=user.is_verified,
        gender=user.gender,
        birthday=user.birthday,
        avatar_url=user.avatar_url,
        created_at=user.created_at,
        updated_at=user.updated_at,
        last_login=user.last_login
    )


# Admin routes for user management (super admin only)
@router.get("/admin", response_model=UserListResponse)
async def admin_list_users(
    page: int = 1,
    limit: int = 20,
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(require_super_admin)
):
    """List all users (super admin only)."""
    users, total = await profile_service.list_profiles(db, page, limit, role, is_active)
    total_pages = (total + limit - 1) // limit
    
    return UserListResponse(
        items=[
            UserResponse(
                id=str(u.id),
                username=u.username,
                email=u.email,
                full_name=u.full_name,
                role=u.role,
                is_active=u.is_active,
                is_verified=u.is_verified,
                gender=u.gender,
                birthday=u.birthday,
                avatar_url=u.avatar_url,
                created_at=u.created_at,
                updated_at=u.updated_at,
                last_login=u.last_login
            ) for u in users
        ],
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )


@router.patch("/admin/{user_id}", response_model=UserResponse)
async def admin_update_user(
    user_id: str,
    update: AdminUserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(require_super_admin)
):
    """Update user role or status (super admin only)."""
    update_data = update.model_dump(exclude_unset=True)
    
    # Prevent self-demotion
    if str(user_id) == str(current_user.id) and "role" in update_data:
        if update_data["role"] != UserRole.SUPER_ADMIN:
            raise HTTPException(status_code=400, detail="Cannot change your own super admin role")
    
    user = await profile_service.update(db, uuid.UUID(user_id), update_data)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=str(user.id),
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        is_verified=user.is_verified,
        gender=user.gender,
        birthday=user.birthday,
        avatar_url=user.avatar_url,
        created_at=user.created_at,
        updated_at=user.updated_at,
        last_login=user.last_login
    )


@router.delete("/admin/{user_id}")
async def admin_delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(require_super_admin)
):
    """Delete a user (super admin only)."""
    if str(user_id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    success = await profile_service.delete(db, uuid.UUID(user_id))
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}
