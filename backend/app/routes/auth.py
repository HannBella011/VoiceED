from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, Header
from fastapi.security import OAuth2PasswordBearer
from gotrue.errors import AuthApiError
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr, Field
from datetime import timedelta, datetime, timezone
import hashlib
import hmac
from typing import Optional
import uuid

from app.database import get_db
from app.services import auth_service, profile_service
from app.config import settings
from app.models import Profile, UserRole, ApiSession
from app.schemas import (
    UserResponse,
    Token,
    RegisterRequest,
    CompleteProfileRequest,
    Gender,
)

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    profile_complete: bool = True


class RegistrationResponse(BaseModel):
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


async def get_current_user(
    token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
) -> Profile:
    """Validate the API session established after Supabase authentication."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decode the API access token
        payload = auth_service.decode_token(token)
        user_id: str = payload.get("sub")
        if user_id is None or payload.get("type") != "access":
            raise credentials_exception
        identity = uuid.UUID(user_id)
    except (ValueError, TypeError, AttributeError):
        raise credentials_exception

    await auth_service.active_api_session(db, payload)
    # Get profile from local database
    profile = await profile_service.get_by_id(db, identity)
    if profile is None:
        raise credentials_exception
    profile._email_verified = payload.get("email_verified")
    return profile


async def get_current_active_user(
    current_user: Profile = Depends(get_current_user),
) -> Profile:
    """Get current active user."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def get_current_admin_user(
    current_user: Profile = Depends(get_current_active_user),
) -> Profile:
    """Get current user and verify admin role."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


async def get_current_super_admin_user(
    current_user: Profile = Depends(get_current_active_user),
) -> Profile:
    """Get current user and verify super admin role."""
    if not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin access required")
    return current_user


@router.post("/login", response_model=TokenResponse)
async def login(
    response: Response, form_data: LoginRequest, db: AsyncSession = Depends(get_db)
):
    """Login endpoint - uses Supabase Auth."""
    # Authenticate with Supabase
    try:
        supabase_user = await auth_service.sign_in(form_data.email, form_data.password)
    except (AuthApiError, ValueError) as exc:
        raise HTTPException(
            status_code=401, detail="Invalid email or password, or email not confirmed"
        ) from exc
    if not supabase_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Ensure profile exists in local database
    profile = await profile_service.ensure_profile_exists(
        db,
        supabase_user,
        {
            "username": (
                supabase_user.user_metadata.get("username")
                if supabase_user.user_metadata
                else None
            ),
            "full_name": (
                supabase_user.user_metadata.get("full_name")
                if supabase_user.user_metadata
                else None
            ),
        },
    )

    # Update last login
    profile.last_login = datetime.utcnow()
    await db.commit()
    # Reload database-generated fields before serializing the async ORM object.
    await db.refresh(profile)

    # Create tokens (local JWT for API access)
    access_token, refresh_token = await auth_service.issue_api_session(
        db, profile, bool(supabase_user.email_confirmed_at)
    )

    # Set refresh token in httpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.REFRESH_COOKIE_SECURE,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=str(profile.id),
            username=profile.username,
            email=profile.email,
            full_name=profile.full_name,
            role=profile.role,
            is_active=profile.is_active,
            is_verified=bool(getattr(profile, "is_verified", False)),
            email_verified=bool(supabase_user.email_confirmed_at),
            theme=getattr(profile, "theme", "blue"),
            created_at=profile.created_at,
            updated_at=profile.updated_at,
            gender=profile.gender,
            birthday=profile.birthday,
            school_id=profile.school_id,
            avatar_url=profile.avatar_url,
            last_login=profile.last_login,
        ),
        profile_complete=bool(
            profile.username
            and profile.full_name
            and profile.birthday
            and profile.school_id
        ),
    )


@router.post(
    "/register",
    response_model=RegistrationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    response: Response, user_data: RegisterRequest, db: AsyncSession = Depends(get_db)
):
    """Register a new user via Supabase Auth."""
    user_data.username = user_data.display_name or user_data.username
    if user_data.birthday:
        try:
            datetime.fromisoformat(user_data.birthday.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid birthday format")

    # Check if username exists locally
    if user_data.username:
        existing_user = await profile_service.get_by_username(db, user_data.username)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered",
            )

    # Check if email exists locally
    existing_email = await profile_service.get_by_email(db, user_data.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    # Check if school_id exists locally
    if user_data.school_id:
        existing_school_id = await db.execute(
            select(Profile).where(Profile.school_id == user_data.school_id)
        )
        if existing_school_id.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="School ID already registered",
            )

    # Register with Supabase Auth
    metadata = {}
    if user_data.username:
        metadata["username"] = user_data.username
    if user_data.full_name:
        metadata["full_name"] = user_data.full_name
    if user_data.display_name:
        metadata["display_name"] = user_data.display_name
    if user_data.birthday:
        metadata["birthday"] = user_data.birthday
    if user_data.school_id:
        metadata["school_id"] = user_data.school_id

    supabase_user = await auth_service.sign_up(
        user_data.email, user_data.password, metadata
    )
    if not supabase_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Registration failed"
        )

    # Create local profile
    profile = await profile_service.ensure_profile_exists(db, supabase_user, metadata)

    return RegistrationResponse(
        user=UserResponse(
            id=str(profile.id),
            username=profile.username,
            email=profile.email,
            full_name=profile.full_name,
            role=profile.role,
            is_active=profile.is_active,
            is_verified=bool(getattr(profile, "is_verified", False)),
            email_verified=bool(supabase_user.email_confirmed_at),
            theme=getattr(profile, "theme", "blue"),
            created_at=profile.created_at,
            updated_at=profile.updated_at,
            gender=profile.gender,
            birthday=profile.birthday,
            school_id=profile.school_id,
            avatar_url=profile.avatar_url,
            last_login=profile.last_login,
        )
    )


@router.post("/logout")
async def logout(
    response: Response,
    current_user: Profile = Depends(get_current_active_user),
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    """Revoke this API session and clear its refresh cookie."""
    session = await auth_service.active_api_session(
        db, auth_service.decode_token(token), lock=True
    )
    session.revoked_at = datetime.now(timezone.utc)
    await db.commit()
    # Sign out from Supabase (optional - would need access token)
    response.delete_cookie(key="refresh_token")
    return {"message": "Successfully logged out"}


@router.post("/refresh", response_model=Token)
async def refresh_token(
    response: Response, request: Request, db: AsyncSession = Depends(get_db)
):
    """Refresh access token using refresh token from cookie."""
    # Get refresh token from cookie
    refresh_token = request.cookies.get("refresh_token")

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = auth_service.decode_token(refresh_token)
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")

        if user_id is None or token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    session = await auth_service.active_api_session(db, payload, lock=True)
    if not hmac.compare_digest(
        session.refresh_hash, hashlib.sha256(refresh_token.encode()).hexdigest()
    ):
        raise HTTPException(401, "Refresh token already used or revoked")
    # Verify profile exists
    profile = await profile_service.get_by_id(db, session.user_id)
    if not profile or not profile.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create new tokens
    claims = {
        "sub": str(profile.id),
        "sid": str(session.id),
        "email_verified": payload.get("email_verified"),
    }
    new_access_token = auth_service.create_access_token(data=claims)
    new_refresh_token = auth_service.create_refresh_token(
        data={**claims, "jti": uuid.uuid4().hex}
    )
    session.refresh_hash = hashlib.sha256(new_refresh_token.encode()).hexdigest()
    await db.commit()

    # Set new refresh token in httpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=settings.REFRESH_COOKIE_SECURE,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    return Token(access_token=new_access_token, token_type="bearer")


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: Profile = Depends(get_current_active_user)):
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
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        gender=current_user.gender,
        birthday=current_user.birthday,
        school_id=current_user.school_id,
        avatar_url=current_user.avatar_url,
        last_login=current_user.last_login,
    )


class ProfileUpdateRequest(BaseModel):
    model_config = {"extra": "forbid"}
    theme: Optional[str] = None
    """Request model for updating profile fields."""
    full_name: Optional[str] = Field(None, max_length=255)
    username: Optional[str] = Field(None, min_length=1, max_length=50)
    gender: Optional[Gender] = None
    birthday: Optional[str] = None
    school_id: Optional[str] = Field(None, min_length=1, max_length=50)
    avatar_url: Optional[str] = Field(None, max_length=500)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    response: Response,
    profile_data: ProfileUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    """Update current user's profile."""
    if "theme" in profile_data.model_fields_set:
        if profile_data.theme not in {
            "blue",
            "purple",
            "red",
            "green",
            "orange",
            "pink",
        }:
            raise HTTPException(status_code=422, detail="Invalid theme")
        current_user.theme = profile_data.theme
    # Check if username is being changed and if it's already taken
    if profile_data.username and profile_data.username != current_user.username:
        existing_user = await profile_service.get_by_username(db, profile_data.username)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken"
            )
        current_user.username = profile_data.username

    # Update other fields
    if profile_data.full_name is not None:
        current_user.full_name = profile_data.full_name

    if "gender" in profile_data.model_fields_set:
        current_user.gender = profile_data.gender

    if profile_data.birthday is not None:
        try:
            current_user.birthday = datetime.fromisoformat(
                profile_data.birthday.replace("Z", "+00:00")
            ).replace(tzinfo=None)
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid birthday format",
            )

    if profile_data.school_id is not None:
        # Check if school_id is already taken by another user
        existing_school_id = await db.execute(
            select(Profile).where(Profile.school_id == profile_data.school_id)
        )
        school_profile = existing_school_id.scalar_one_or_none()
        if school_profile and school_profile.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="School ID already registered",
            )
        current_user.school_id = profile_data.school_id

    if profile_data.avatar_url is not None:
        current_user.avatar_url = profile_data.avatar_url

    current_user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(current_user)

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
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        gender=current_user.gender,
        birthday=current_user.birthday,
        school_id=current_user.school_id,
        avatar_url=current_user.avatar_url,
        last_login=current_user.last_login,
    )


class RecoveryRequest(BaseModel):
    email: EmailStr


class ResetRequest(BaseModel):
    token_hash: str
    new_password: str


@router.post("/forgot-password")
async def forgot_password(data: RecoveryRequest):
    success = await auth_service.reset_password_email(data.email)
    if not success:
        raise HTTPException(503, "Unable to request recovery right now")
    return {
        "message": "If that email is registered, a password reset link will be sent"
    }


@router.post("/reset-password")
async def reset_password(data: ResetRequest, db: AsyncSession = Depends(get_db)):
    if len(data.new_password) < 8:
        raise HTTPException(422, "Password must be at least 8 characters long")
    try:
        recovered = await auth_service.recover_password(
            data.token_hash, data.new_password
        )
        await db.execute(
            update(ApiSession)
            .where(
                ApiSession.user_id == uuid.UUID(recovered.id),
                ApiSession.revoked_at.is_(None),
            )
            .values(revoked_at=datetime.now(timezone.utc))
        )
        await db.commit()
    except Exception:
        raise HTTPException(400, "Invalid or expired recovery link")
    return {"message": "Password updated successfully"}


class OAuthCallbackRequest(BaseModel):
    """Request model for OAuth callback - receives Supabase access token from frontend."""

    provider: str = "google"


@router.post("/callback", response_model=TokenResponse)
async def oauth_callback(
    response: Response,
    request: OAuthCallbackRequest,
    db: AsyncSession = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    """Handle OAuth callback from frontend - exchange Supabase session for local tokens."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    supabase_access_token = authorization.replace("Bearer ", "")

    # Verify the token with Supabase and get user info
    supabase_user = await auth_service.get_user(supabase_access_token)
    if not supabase_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Supabase session",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Ensure profile exists in local database
    metadata = {}
    if supabase_user.user_metadata:
        metadata["username"] = supabase_user.user_metadata.get("username")
        metadata["full_name"] = supabase_user.user_metadata.get("full_name")

    profile = await profile_service.ensure_profile_exists(db, supabase_user, metadata)

    # Check if profile is complete (has required fields)
    profile_complete = bool(
        profile.username
        and profile.full_name
        and profile.birthday
        and profile.school_id
    )

    # Update last login
    profile.last_login = datetime.utcnow()
    await db.commit()
    # Reload database-generated fields before serializing the async ORM object.
    await db.refresh(profile)

    # Create tokens (local JWT for API access)
    access_token, refresh_token = await auth_service.issue_api_session(
        db, profile, bool(supabase_user.email_confirmed_at)
    )

    # Set refresh token in httpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.REFRESH_COOKIE_SECURE,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=str(profile.id),
            username=profile.username,
            email=profile.email,
            full_name=profile.full_name,
            role=profile.role,
            is_active=profile.is_active,
            is_verified=bool(getattr(profile, "is_verified", False)),
            email_verified=bool(supabase_user.email_confirmed_at),
            theme=getattr(profile, "theme", "blue"),
            created_at=profile.created_at,
            updated_at=profile.updated_at,
            gender=profile.gender,
            birthday=profile.birthday,
            school_id=profile.school_id,
            avatar_url=profile.avatar_url,
            last_login=profile.last_login,
        ),
        profile_complete=profile_complete,
    )


@router.post("/complete-profile", response_model=TokenResponse)
async def complete_profile(
    response: Response,
    profile_data: CompleteProfileRequest,
    db: AsyncSession = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    """Complete profile for first-time Google OAuth users."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    supabase_access_token = authorization.replace("Bearer ", "")

    # Verify the token with Supabase and get user info
    supabase_user = await auth_service.get_user(supabase_access_token)
    if not supabase_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Supabase session",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get existing profile
    profile = await profile_service.get_by_id(db, uuid.UUID(supabase_user.id))
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )

    # Check if display_name (username) is already taken
    if profile_data.display_name:
        existing_user = await profile_service.get_by_username(
            db, profile_data.display_name
        )
        if existing_user and existing_user.id != profile.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Display name already taken",
            )
        profile.username = profile_data.display_name

    # Update profile fields
    if profile_data.birthday:
        try:
            profile.birthday = datetime.fromisoformat(
                profile_data.birthday.replace("Z", "+00:00")
            ).replace(tzinfo=None)
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid birthday format",
            )

    if profile_data.school_id:
        existing_school_id = await db.execute(
            select(Profile).where(Profile.school_id == profile_data.school_id)
        )
        school_profile = existing_school_id.scalar_one_or_none()
        if school_profile and school_profile.id != profile.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="School ID already registered",
            )
        profile.school_id = profile_data.school_id

    if profile_data.gender:
        profile.gender = profile_data.gender

    profile.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(profile)

    # Update last login
    profile.last_login = datetime.utcnow()
    await db.commit()
    # Reload database-generated fields before serializing the async ORM object.
    await db.refresh(profile)

    # Create tokens
    access_token, refresh_token = await auth_service.issue_api_session(
        db, profile, bool(supabase_user.email_confirmed_at)
    )

    # Set refresh token in httpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.REFRESH_COOKIE_SECURE,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=str(profile.id),
            username=profile.username,
            email=profile.email,
            full_name=profile.full_name,
            role=profile.role,
            is_active=profile.is_active,
            is_verified=bool(getattr(profile, "is_verified", False)),
            email_verified=bool(supabase_user.email_confirmed_at),
            theme=getattr(profile, "theme", "blue"),
            created_at=profile.created_at,
            updated_at=profile.updated_at,
            gender=profile.gender,
            birthday=profile.birthday,
            school_id=profile.school_id,
            avatar_url=profile.avatar_url,
            last_login=profile.last_login,
        ),
        profile_complete=True,
    )


@router.post("/revoke-sessions")
async def revoke_sessions(
    authorization: Optional[str] = Header(None), db: AsyncSession = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Supabase session required")
    identity = await auth_service.get_user(authorization[7:])
    if identity is None:
        raise HTTPException(401, "Invalid Supabase session")
    await db.execute(
        update(ApiSession)
        .where(
            ApiSession.user_id == uuid.UUID(identity.id),
            ApiSession.revoked_at.is_(None),
        )
        .values(revoked_at=datetime.now(timezone.utc))
    )
    await db.commit()
    return {"message": "API sessions revoked"}
