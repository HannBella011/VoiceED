# VoiceED Backend - Services Package
# Business logic services compatible with Supabase

"""
Services module for VoiceED backend.

This module contains business logic separated from routes:
- Supabase client (auth, database, storage)
- Authentication service (Supabase Auth integration)
- Profile service (profile management, preferences)
- Report service (CRUD, workflow, notifications)
- Wellness service (tips, resources, journal)
- Inspire service (stories, quotes, moderation)
- Share service (materials, uploads, downloads)
- Email service (notifications, verification)
- File storage service (Supabase Storage)
- Tracking service (tracking code generation)
"""

from datetime import datetime, timedelta, timezone
import hashlib
from typing import Optional, List, BinaryIO
from passlib.context import CryptContext
from jose import jwt, JWTError
from supabase import create_client, Client
from gotrue import AsyncGoTrueClient
from gotrue.types import User as SupabaseUser
from app.config import settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from starlette.concurrency import run_in_threadpool
from app.models import (
    Profile,
    Report,
    ReportAttachment,
    ReportTimeline,
    ReportTimelineAttachment,
    JournalEntry,
    WellnessTip,
    InspireStory,
    InspireQuote,
    SharedMaterial,
    ApiSession,
    UserRole,
    ReportStatus,
    ReportCategory,
)
import os
import uuid
import secrets
import string
import aiofiles
from pathlib import Path


# Password hashing (kept for any legacy needs)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ============================================================================
# Supabase Client Service
# ============================================================================


class SupabaseService:
    """Singleton Supabase client for auth, database, and storage."""

    _instance: Optional["SupabaseService"] = None
    _client: Optional[Client] = None
    _auth_client: Optional[AsyncGoTrueClient] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if self._client is None:
            self._init_client()

    def _init_client(self):
        """Initialize Supabase client."""
        # Check if we have valid Supabase credentials (not placeholders)
        url = settings.SUPABASE_URL
        key = settings.SUPABASE_SERVICE_ROLE_KEY

        if (
            url
            and key
            and not url.startswith("https://your-project")
            and not key.startswith("your-")
        ):
            try:
                self._client = create_client(url, key)
                # For auth operations
                self._auth_client = AsyncGoTrueClient(
                    url=f"{url}/auth/v1", headers={"apikey": key}
                )
            except Exception as e:
                print(f"[Supabase] Failed to initialize client: {e}")
                self._client = None
                self._auth_client = None
        else:
            print(
                "[Supabase] Warning: SUPABASE_URL or SERVICE_ROLE_KEY not configured or using placeholder values"
            )

    @property
    def client(self) -> Optional[Client]:
        return self._client

    @property
    def auth(self) -> Optional[AsyncGoTrueClient]:
        return self._auth_client

    def get_storage_bucket(self, bucket: Optional[str] = None):
        """Get Supabase Storage bucket."""
        if not self._client:
            return None
        bucket_name = bucket or settings.SUPABASE_STORAGE_BUCKET
        return self._client.storage.from_(bucket_name)


supabase_service = SupabaseService()


# ============================================================================
# Authentication Service (Supabase Auth)
# ============================================================================


class AuthService:
    """Handle authentication logic using Supabase Auth."""

    def __init__(self):
        self.supabase = supabase_service

    async def sign_up(
        self, email: str, password: str, metadata: dict = None
    ) -> SupabaseUser:
        """Register a new user with Supabase Auth."""
        if not self.supabase.auth:
            raise ValueError("Supabase Auth not configured")

        response = await self.supabase.auth.sign_up(
            {"email": email, "password": password, "options": {"data": metadata or {}}}
        )

        if response.user is None:
            raise ValueError("Failed to create user")

        return response.user

    async def sign_in(self, email: str, password: str) -> SupabaseUser:
        """Sign in a user with Supabase Auth."""
        if not self.supabase.auth:
            raise ValueError("Supabase Auth not configured")

        response = await self.supabase.auth.sign_in_with_password(
            {"email": email, "password": password}
        )

        if response.user is None:
            raise ValueError("Invalid credentials")

        return response.user

    async def sign_out(self, access_token: str) -> bool:
        """Sign out a user."""
        if not self.supabase.auth:
            raise ValueError("Supabase Auth not configured")

        try:
            await self.supabase.auth.sign_out(access_token)
            return True
        except Exception:
            return False

    async def refresh_session(self, refresh_token: str):
        """Refresh access token using refresh token."""
        if not self.supabase.auth:
            raise ValueError("Supabase Auth not configured")

        response = await self.supabase.auth.refresh_session(refresh_token)
        return response.session

    async def get_user(self, access_token: str) -> Optional[SupabaseUser]:
        """Get user from access token."""
        if not self.supabase.auth:
            raise ValueError("Supabase Auth not configured")

        try:
            response = await self.supabase.auth.get_user(access_token)
            return response.user
        except Exception:
            return None

    async def reset_password_email(self, email: str) -> bool:
        """Send password reset email."""
        if not self.supabase.auth:
            raise ValueError("Supabase Auth not configured")

        try:
            await self.supabase.auth.reset_password_for_email(
                email,
                {"redirect_to": f"{settings.FRONTEND_URL.rstrip('/')}/reset-password"},
            )
            return True
        except Exception:
            return False

    async def recover_password(self, token_hash: str, new_password: str):
        # Never mutate a shared server Auth session or accept an arbitrary access token.
        client = AsyncGoTrueClient(
            url=f"{settings.SUPABASE_URL}/auth/v1",
            headers={"apiKey": settings.SUPABASE_ANON_KEY},
            auto_refresh_token=False,
            persist_session=False,
        )
        try:
            result = await client.verify_otp(
                {"token_hash": token_hash, "type": "recovery"}
            )
            if not result.session or not result.user:
                raise ValueError("Invalid recovery link")
            response = await client.update_user({"password": new_password})
            await client.sign_out()
            return response.user
        finally:
            await client.close()

    async def issue_api_session(self, db, profile, email_verified=None):
        if not profile.is_active:
            raise HTTPException(403, "Inactive account")
        identity = uuid.uuid4()
        data = {
            "sub": str(profile.id),
            "sid": str(identity),
            "email_verified": email_verified,
        }
        refresh = self.create_refresh_token({**data, "jti": uuid.uuid4().hex})
        db.add(
            ApiSession(
                id=identity,
                user_id=profile.id,
                refresh_hash=hashlib.sha256(refresh.encode()).hexdigest(),
                expires_at=datetime.now(timezone.utc)
                + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            )
        )
        await db.commit()
        return self.create_access_token(data), refresh

    async def active_api_session(self, db, payload, lock=False):
        try:
            identity = uuid.UUID(payload["sid"])
            owner = uuid.UUID(payload["sub"])
        except (ValueError, KeyError, TypeError, AttributeError):
            raise HTTPException(401, "Invalid API session")
        query = select(ApiSession).where(
            ApiSession.id == identity,
            ApiSession.user_id == owner,
            ApiSession.revoked_at.is_(None),
            ApiSession.expires_at > datetime.now(timezone.utc),
        )
        if lock:
            query = query.with_for_update()
        session = await db.scalar(query)
        if session is None:
            raise HTTPException(401, "API session expired or revoked")
        return session

    # Legacy methods for compatibility
    def hash_password(self, password: str) -> str:
        return pwd_context.hash(password)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    def create_access_token(
        self, data: dict, expires_delta: Optional[timedelta] = None
    ) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(
                minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
            )
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(
            to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
        )
        return encoded_jwt

    def create_refresh_token(self, data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(
            to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
        )
        return encoded_jwt

    def decode_token(self, token: str) -> dict:
        try:
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
            )
            return payload
        except JWTError:
            raise ValueError("Invalid token")


# ============================================================================
# Profile Service
# ============================================================================


class ProfileService:
    """Handle profile-related business logic."""

    async def get_by_id(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> Optional[Profile]:
        result = await db.execute(select(Profile).where(Profile.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[Profile]:
        result = await db.execute(select(Profile).where(Profile.email == email))
        return result.scalar_one_or_none()

    async def get_by_username(
        self, db: AsyncSession, username: str
    ) -> Optional[Profile]:
        result = await db.execute(select(Profile).where(Profile.username == username))
        return result.scalar_one_or_none()

    async def create(self, db: AsyncSession, profile_data: dict) -> Profile:
        profile = Profile(**profile_data)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
        return profile

    async def update(
        self, db: AsyncSession, user_id: uuid.UUID, data: dict
    ) -> Optional[Profile]:
        profile = await self.get_by_id(db, user_id)
        if not profile:
            return None
        for key, value in data.items():
            setattr(profile, key, value)
        profile.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(profile)
        return profile

    async def delete(self, db: AsyncSession, user_id: uuid.UUID) -> bool:
        profile = await self.get_by_id(db, user_id)
        if not profile:
            return False
        await db.delete(profile)
        await db.commit()
        return True

    async def list_profiles(
        self,
        db: AsyncSession,
        page: int = 1,
        limit: int = 20,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None,
    ) -> tuple[List[Profile], int]:
        query = select(Profile)
        if role:
            query = query.where(Profile.role == role)
        if is_active is not None:
            query = query.where(Profile.is_active == is_active)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar_one()

        query = (
            query.offset((page - 1) * limit)
            .limit(limit)
            .order_by(Profile.created_at.desc())
        )
        result = await db.execute(query)
        profiles = result.scalars().all()

        return profiles, total

    async def ensure_profile_exists(
        self, db: AsyncSession, supabase_user: SupabaseUser, metadata: dict = None
    ) -> Profile:
        """Ensure a profile exists for a Supabase Auth user.
        
            Creates profile if it doesn't exist, updates email/username if changed.
            """
        metadata = dict(metadata or {})
        if not metadata.get("username") and metadata.get("display_name"):
            metadata["username"] = metadata["display_name"]
        if metadata.get("birthday"):
            birthday_value = metadata["birthday"]
            if isinstance(birthday_value, str):
                birthday_value = datetime.fromisoformat(
                    birthday_value.replace("Z", "+00:00")
                )
            metadata["birthday"] = birthday_value.replace(tzinfo=None)
        profile = await self.get_by_id(db, uuid.UUID(supabase_user.id))

        if profile:
            # Update email/username if changed
            updated = False
            if profile.email != supabase_user.email:
                profile.email = supabase_user.email
                updated = True
            # Existing application profile fields are authoritative; Auth metadata is onboarding input only.
            if updated:
                profile.updated_at = datetime.utcnow()
                await db.commit()
                await db.refresh(profile)
            return profile

        # Create new profile
        username = metadata.get("username") if metadata else None
        if not username:
            # Generate username from email
            username = supabase_user.email.split("@")[0]
            # Ensure uniqueness
            base_username = username
            counter = 1
            while await self.get_by_username(db, username):
                username = f"{base_username}{counter}"
                counter += 1

        birthday = metadata.get("birthday")

        profile = await self.create(
            db,
            {
                "id": uuid.UUID(supabase_user.id),
                "username": username,
                "email": supabase_user.email,
                "full_name": metadata.get("full_name") if metadata else None,
                "role": UserRole.STUDENT,
                "birthday": birthday,
                "school_id": metadata.get("school_id") if metadata else None,
                "gender": metadata.get("gender") if metadata else None,
            },
        )
        return profile


# ============================================================================
# Tracking Service
# ============================================================================


class TrackingService:
    """Generate and manage tracking codes."""

    TRACKING_CODE_PREFIX = "VED"
    CODE_PATTERN = r"^VED-[A-Z0-9]{4}-[A-Z0-9]{4}$"

    def generate_tracking_code(self) -> str:
        """Generate a unique, collision-resistant tracking code.
        
        Format: VED-XXXX-XXXX where X is alphanumeric (A-Z, 0-9)
        Uses cryptographically secure random generation.
        """
        alphabet = string.ascii_uppercase + string.digits
        # Remove similar-looking characters: O, 0, I, 1, L
        alphabet = "".join(c for c in alphabet if c not in "O0I1L")

        part1 = "".join(secrets.choice(alphabet) for _ in range(4))
        part2 = "".join(secrets.choice(alphabet) for _ in range(4))

        return f"{self.TRACKING_CODE_PREFIX}-{part1}-{part2}"

    async def ensure_unique_tracking_code(
        self, db: AsyncSession, max_attempts: int = 10
    ) -> str:
        """Generate a tracking code guaranteed to be unique in the database."""
        for _ in range(max_attempts):
            code = self.generate_tracking_code()
            result = await db.execute(
                select(Report).where(Report.tracking_code == code)
            )
            if not result.scalar_one_or_none():
                return code
        raise HTTPException(
            503, "Could not allocate a tracking code; retry this submission"
        )


# ============================================================================
# File Storage Service (Supabase Storage)
# ============================================================================


class FileStorageService:
    """Handle file uploads, validation, and storage using Supabase Storage."""

    # Allowed file types for report attachments
    ALLOWED_MIME_TYPES = {
        "image/png",
        "image/jpeg",
        "image/jpg",
        "application/pdf",
    }

    ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".pdf"}

    MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB

    def __init__(self):
        self.supabase = supabase_service
        self.bucket_name = settings.REPORT_STORAGE_BUCKET

    def validate_file(
        self, filename: str, mime_type: str, file_size: int
    ) -> tuple[bool, Optional[str]]:
        """Validate file extension, MIME type, and size.
        
        Returns (is_valid, error_message)
        """
        # Check file size
        if file_size > self.MAX_FILE_SIZE:
            return False, f"File size exceeds maximum allowed (25 MB)"

        # Check extension
        ext = Path(filename).suffix.lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            return (
                False,
                f"File type '{ext}' not allowed. Allowed: {', '.join(self.ALLOWED_EXTENSIONS)}",
            )

        # Check MIME type
        if file_size <= 0:
            return False, "File is empty"
        expected = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".pdf": "application/pdf",
        }
        if mime_type != expected.get(ext):
            return False, f"MIME type '{mime_type}' not allowed"

        return True, None

    def generate_stored_filename(self, original_filename: str) -> str:
        """Generate a unique stored filename using UUID."""
        ext = Path(original_filename).suffix.lower()
        unique_id = uuid.uuid4().hex
        return f"{unique_id}{ext}"

    async def upload_file(
        self,
        file_content: bytes,
        original_filename: str,
        report_id: int,
        folder: str = "reports",
    ) -> tuple[str, str, int]:
        """Upload file to Supabase Storage and return (stored_filename, file_path, file_size)."""
        if not self.supabase.client:
            raise ValueError("Supabase Storage not configured")

        stored_filename = self.generate_stored_filename(original_filename)
        file_path = f"{folder}/{report_id}/{stored_filename}"
        file_size = len(file_content)

        # Upload to Supabase Storage
        bucket = self.supabase.get_storage_bucket(self.bucket_name)
        if not bucket:
            raise ValueError("Storage bucket not available")

        # Upload file
        response = bucket.upload(
            path=file_path,
            file=file_content,
            file_options={
                "content-type": {
                    ".png": "image/png",
                    ".jpg": "image/jpeg",
                    ".jpeg": "image/jpeg",
                    ".pdf": "application/pdf",
                }[Path(original_filename).suffix.lower()]
            },
        )

        if hasattr(response, "error") and response.error:
            raise ValueError(f"Upload failed: {response.error}")

        return stored_filename, file_path, file_size

    async def delete_file(self, file_path: str, bucket: Optional[str] = None) -> bool:
        """Delete a file from Supabase Storage."""
        if not self.supabase.client:
            return False

        try:
            bucket_client = self.supabase.get_storage_bucket(bucket or self.bucket_name)
            if not bucket_client:
                return False

            response = bucket_client.remove([file_path])
            return True
        except Exception:
            return False

    def get_file_url(self, file_path: str, bucket: Optional[str] = None) -> str:
        """Get the public URL for a file in Supabase Storage."""
        if not self.supabase.client:
            return ""

        bucket_client = self.supabase.get_storage_bucket(bucket or self.bucket_name)
        if not bucket_client:
            return ""

        try:
            response = bucket_client.get_public_url(file_path)
            return response
        except Exception:
            return ""

    def get_signed_url(
        self, file_path: str, expires_in: int = 3600, bucket: Optional[str] = None
    ) -> str:
        """Get a signed URL for private file access."""
        if not self.supabase.client:
            return ""

        bucket_client = self.supabase.get_storage_bucket(bucket or self.bucket_name)
        if not bucket_client:
            return ""

        try:
            response = bucket_client.create_signed_url(file_path, expires_in)
            return response.get("signedURL", "")
        except Exception:
            return ""


# ============================================================================
# Email Service
# ============================================================================


class EmailService:
    """Handle email notifications."""

    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.EMAILS_FROM_EMAIL
        self.from_name = settings.EMAILS_FROM_NAME

    def is_configured(self) -> bool:
        """Check if email is configured."""
        return all(
            [
                self.smtp_host,
                self.smtp_port,
                self.smtp_user,
                self.smtp_password,
                self.from_email,
            ]
        )

    def _get_email_template(
        self,
        tracking_code: str,
        report_title: str,
        submission_date: datetime,
        tracking_url: str,
        is_anonymous: bool,
    ) -> str:
        """Generate HTML email template for report submission."""
        from html import escape

        report_title = escape(report_title)
        tracking_url = escape(tracking_url, quote=True)
        logo_url = escape(
            f"{settings.FRONTEND_URL.rstrip('/')}/logo%20for%20blue.png", quote=True
        )
        anonymity_note = ""
        if is_anonymous:
            anonymity_note = """
            <p style="color: #666; font-style: italic;">
                This report was submitted anonymously. Your identity is not associated with this report.
            </p>
            """

        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <!-- Header -->
            <div style="text-align: center; padding: 30px 0; border-bottom: 2px solid #e0e0e0;">
                <img src="{logo_url}" width="72" height="72" alt="VoiceED logo" />
                <h1 style="margin: 0; color: #2c3e50; font-size: 28px;">VoiceED</h1>
                <p style="margin: 10px 0 0; color: #7f8c8d; font-size: 16px;">Where Every Student's Voice Matters</p>
            </div>
            
            <!-- Body -->
            <div style="padding: 30px 0;">
                <h2 style="color: #2c3e50; font-size: 22px;">Report Submitted Successfully</h2>
                
                <p>Thank you for submitting a report through VoiceED. Your report has been received and is now being reviewed by our team.</p>
                
                {anonymity_note}
                
                <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; font-weight: 600; color: #555; width: 150px;">Tracking Code:</td>
                            <td style="padding: 8px 0; font-family: monospace; font-size: 16px; color: #2c3e50; font-weight: bold;">{tracking_code}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: 600; color: #555;">Report Title:</td>
                            <td style="padding: 8px 0; color: #333;">{report_title}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: 600; color: #555;">Submitted:</td>
                            <td style="padding: 8px 0; color: #333;">{submission_date.strftime('%B %d, %Y at %I:%M %p')}</td>
                        </tr>
                    </table>
                </div>
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{tracking_url}" style="display: inline-block; background: #3498db; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600;">
                        Track Your Report
                    </a>
                </p>
                
                <p style="color: #7f8c8d; font-size: 14px;">
                    <strong>Save your tracking code.</strong> You will need it to check the status of your report. 
                    If you provided an email, you will receive updates at this address.
                </p>
            </div>
            
            <!-- Footer -->
            <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center; color: #95a5a6; font-size: 12px;">
                <p style="margin: 0 0 10px;">
                    <strong>VoiceED</strong> — Student Safety Reporting Platform
                </p>
                <p style="margin: 0 0 10px;">
                    This is an automated message. Please do not reply to this email.
                </p>
                <p style="margin: 0;">
                    <strong>Confidentiality Notice:</strong> This email and any attachments are confidential 
                    and intended solely for the recipient. If you received this in error, please delete it immediately.
                </p>
            </div>
        </body>
        </html>
        """

    def _get_status_update_template(
        self,
        tracking_code: str,
        report_title: str,
        new_status: ReportStatus,
        remarks: Optional[str],
        tracking_url: str,
    ) -> str:
        """Generate HTML email template for status updates."""
        status_labels = {
            ReportStatus.SUBMITTED: "Submitted",
            ReportStatus.UNDER_REVIEW: "Under Review",
            ReportStatus.ASSIGNED: "Assigned",
            ReportStatus.IN_PROGRESS: "In Progress",
            ReportStatus.AWAITING_ADDITIONAL_INFO: "Awaiting Additional Information",
            ReportStatus.RESOLVED: "Resolved",
            ReportStatus.CLOSED: "Closed",
        }

        status_colors = {
            ReportStatus.SUBMITTED: "#3498db",
            ReportStatus.UNDER_REVIEW: "#f39c12",
            ReportStatus.ASSIGNED: "#9b59b6",
            ReportStatus.IN_PROGRESS: "#2980b9",
            ReportStatus.AWAITING_ADDITIONAL_INFO: "#e67e22",
            ReportStatus.RESOLVED: "#27ae60",
            ReportStatus.CLOSED: "#7f8c8d",
        }

        color = status_colors.get(new_status, "#3498db")
        label = status_labels.get(new_status, new_status.value)

        remarks_html = ""
        if remarks:
            remarks_html = f"""
            <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid {color};">
                <p style="margin: 0 0 10px; font-weight: 600; color: #555;">Administrator Remarks:</p>
                <p style="margin: 0; color: #333;">{remarks}</p>
            </div>
            """

        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <!-- Header -->
            <div style="text-align: center; padding: 30px 0; border-bottom: 2px solid #e0e0e0;">
                <h1 style="margin: 0; color: #2c3e50; font-size: 28px;">VoiceED</h1>
                <p style="margin: 10px 0 0; color: #7f8c8d; font-size: 16px;">Your Voice, Your Safety, Our Priority</p>
            </div>
            
            <!-- Body -->
            <div style="padding: 30px 0;">
                <h2 style="color: #2c3e50; font-size: 22px;">Report Status Update</h2>
                
                <p>Your report <strong>"{report_title}"</strong> (Tracking: <code>{tracking_code}</code>) has been updated.</p>
                
                <div style="text-align: center; margin: 25px 0;">
                    <span style="display: inline-block; background: {color}; color: white; padding: 10px 24px; border-radius: 20px; font-weight: 600; font-size: 16px;">
                        {label}
                    </span>
                </div>
                
                {remarks_html}
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{tracking_url}" style="display: inline-block; background: #3498db; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600;">
                        View Report Details
                    </a>
                </p>
            </div>
            
            <!-- Footer -->
            <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center; color: #95a5a6; font-size: 12px;">
                <p style="margin: 0 0 10px;">
                    <strong>VoiceED</strong> — Student Safety Reporting Platform
                </p>
                <p style="margin: 0;">
                    <strong>Confidentiality Notice:</strong> This email and any attachments are confidential 
                    and intended solely for the recipient.
                </p>
            </div>
        </body>
        </html>
        """

    async def send_report_confirmation(
        self,
        to_email: str,
        tracking_code: str,
        report_title: str,
        submission_date: datetime,
        tracking_url: str,
        is_anonymous: bool = False,
    ) -> bool:
        """Send report submission confirmation email."""
        if not self.is_configured():
            print("[Email] Notification delivery is not configured")
            return False

        html_content = self._get_email_template(
            tracking_code, report_title, submission_date, tracking_url, is_anonymous
        )

        return await self._send_email(
            to_email, f"VoiceED Report Confirmation - {tracking_code}", html_content
        )

    async def send_status_update(
        self,
        to_email: str,
        tracking_code: str,
        report_title: str,
        new_status: ReportStatus,
        remarks: Optional[str],
        tracking_url: str,
    ) -> bool:
        """Send report status update email."""
        if not self.is_configured():
            print("[Email] Notification delivery is not configured")
            return False

        html_content = self._get_status_update_template(
            tracking_code, report_title, new_status, remarks, tracking_url
        )

        return await self._send_email(
            to_email, f"VoiceED Report Update - {tracking_code}", html_content
        )

    async def _send_email(self, to: str, subject: str, html_content: str) -> bool:
        def send():
            """Send email via SMTP."""
            try:
                import smtplib
                from email.mime.text import MIMEText
                from email.mime.multipart import MIMEMultipart

                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = f"{self.from_name} <{self.from_email}>"
                msg["To"] = to

                msg.attach(MIMEText(html_content, "html"))

                with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=10) as server:
                    server.starttls()
                    server.login(self.smtp_user, self.smtp_password)
                    server.send_message(msg)

                return True
            except Exception as e:
                print(f"[Email] Notification failed ({type(e).__name__})")
                return False

        return await run_in_threadpool(send)


# ============================================================================
# Report Service
# ============================================================================


class ReportService:
    """Handle report-related business logic."""

    def __init__(self):
        self.tracking_service = TrackingService()
        self.file_storage = FileStorageService()
        self.email_service = EmailService()

    def relations(self):
        return [
            selectinload(Report.attachments),
            selectinload(Report.assignee),
            selectinload(Report.timeline_entries).selectinload(
                ReportTimeline.created_by
            ),
            selectinload(Report.timeline_entries)
            .selectinload(ReportTimeline.attachments)
            .selectinload(ReportTimelineAttachment.attachment),
        ]

    def validate_transition(self, old, new, assigned):
        old, new = ReportStatus(old), ReportStatus(new)
        allowed = {
            ReportStatus.SUBMITTED: {ReportStatus.UNDER_REVIEW},
            ReportStatus.UNDER_REVIEW: {
                ReportStatus.ASSIGNED,
                ReportStatus.AWAITING_ADDITIONAL_INFO,
                ReportStatus.CLOSED,
            },
            ReportStatus.ASSIGNED: {
                ReportStatus.IN_PROGRESS,
                ReportStatus.AWAITING_ADDITIONAL_INFO,
            },
            ReportStatus.IN_PROGRESS: {
                ReportStatus.RESOLVED,
                ReportStatus.AWAITING_ADDITIONAL_INFO,
            },
            ReportStatus.AWAITING_ADDITIONAL_INFO: {
                ReportStatus.UNDER_REVIEW,
                ReportStatus.IN_PROGRESS,
            },
            ReportStatus.RESOLVED: {ReportStatus.CLOSED},
            ReportStatus.CLOSED: set(),
        }
        if new != old and new not in allowed[old]:
            raise HTTPException(409, "Invalid report status transition")
        if new in (ReportStatus.ASSIGNED, ReportStatus.IN_PROGRESS) and not assigned:
            raise HTTPException(409, "Assign an administrator first")

    # --- Report Creation ---

    async def create_report(
        self,
        db: AsyncSession,
        data: dict,
        user_id: Optional[uuid.UUID] = None,
        is_anonymous: bool = False,
        reporter_email: Optional[str] = None,
        commit: bool = True,
    ) -> Report:
        """Create a new report (authenticated or anonymous)."""
        if (
            not isinstance(data.get("title"), str)
            or not data["title"].strip()
            or len(data["title"]) > 200
        ):
            raise HTTPException(422, "Enter a report title of 1 to 200 characters")
        # Generate tracking code
        tracking_code = await self.tracking_service.ensure_unique_tracking_code(db)

        # Prepare report data
        report_data = {
            "tracking_code": tracking_code,
            "title": data["title"],
            "description": data["description"],
            "category": data["category"],
            "is_anonymous": is_anonymous,
            "location": data.get("location"),
            "incident_date": data.get("incident_date"),
            "user_id": user_id if not is_anonymous else None,
            "reporter_email": reporter_email,
            "reporter_details": None if is_anonymous else data.get("reporter_details"),
            "submission_key": data.get("submission_key"),
            "submission_fingerprint": data.get("submission_fingerprint"),
            "tracking_access_hash": data.get("tracking_access_hash"),
            "notification_status": data.get("notification_status", "not_requested"),
        }

        for attempt in range(10):
            try:
                async with db.begin_nested():
                    report = Report(**report_data)
                    db.add(report)
                    await db.flush()
                break
            except IntegrityError as exc:
                message = str(exc.orig)
                if (
                    "ix_reports_tracking_code" not in message
                    and "reports.tracking_code" not in message
                ):
                    raise
                report_data["tracking_code"] = (
                    self.tracking_service.generate_tracking_code()
                )
        else:
            raise HTTPException(
                503, "Could not allocate a tracking code; retry this submission"
            )

        # Create initial timeline entry
        timeline = ReportTimeline(
            report_id=report.id,
            status=ReportStatus.SUBMITTED,
            remarks="Report submitted",
            created_by_user_id=user_id if not is_anonymous else None,
        )
        db.add(timeline)

        if commit:
            await db.commit()
        else:
            await db.flush()
        await db.refresh(report)
        if commit:
            await self.notify_submission(db, report)
        return await self.get_by_id(db, report.id)

    async def notify_submission(self, db, report):
        is_anonymous, user_id, reporter_email = (
            report.is_anonymous,
            report.user_id,
            report.reporter_email,
        )
        tracking_code = report.tracking_code
        # Send email notification if email available
        email_to_send = None
        if not is_anonymous and user_id:
            user = await profile_service.get_by_id(db, user_id)
            if user:
                email_to_send = user.email
        elif is_anonymous and reporter_email:
            email_to_send = reporter_email

        if email_to_send:
            tracking_url = f"{settings.FRONTEND_URL.rstrip('/')}/track/{tracking_code}"
            await self.email_service.send_report_confirmation(
                to_email=email_to_send,
                tracking_code=tracking_code,
                report_title=report.title,
                submission_date=report.created_at,
                tracking_url=tracking_url,
                is_anonymous=is_anonymous,
            )

        return None

    # --- Report Retrieval ---

    async def get_by_id(
        self, db: AsyncSession, report_id: int, include_relations: bool = True
    ) -> Optional[Report]:
        query = (
            select(Report)
            .where(Report.id == report_id)
            .options(*self.relations())
            .execution_options(populate_existing=True)
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_tracking_code(
        self, db: AsyncSession, tracking_code: str
    ) -> Optional[Report]:
        result = await db.execute(
            select(Report)
            .where(Report.tracking_code == tracking_code)
            .options(*self.relations())
            .execution_options(populate_existing=True)
        )
        return result.scalar_one_or_none()

    async def get_user_reports(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        page: int = 1,
        limit: int = 20,
        status: Optional[ReportStatus] = None,
    ) -> tuple[List[Report], int]:
        query = (
            select(Report).where(Report.user_id == user_id).options(*self.relations())
        )
        if status:
            query = query.where(Report.status == status)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar_one()

        query = (
            query.offset((page - 1) * limit)
            .limit(limit)
            .order_by(Report.created_at.desc(), Report.id.desc())
        )
        result = await db.execute(query)
        reports = result.scalars().all()

        return reports, total

    async def list_reports(
        self,
        db: AsyncSession,
        page: int = 1,
        limit: int = 20,
        status: Optional[ReportStatus] = None,
        category: Optional[ReportCategory] = None,
        is_anonymous: Optional[bool] = None,
        assignee_id: Optional[uuid.UUID] = None,
        search: str = "",
    ) -> tuple[List[Report], int]:
        query = select(Report).options(*self.relations())

        if status:
            query = query.where(Report.status == status)
        if category:
            query = query.where(Report.category == category)
        if is_anonymous is not None:
            query = query.where(Report.is_anonymous == is_anonymous)
        if assignee_id:
            query = query.where(Report.assignee_id == assignee_id)
        if search.strip():
            term = (
                "%"
                + search.strip()
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_")
                + "%"
            )
            query = query.where(
                or_(
                    Report.title.ilike(term, escape="\\"),
                    Report.description.ilike(term, escape="\\"),
                    Report.tracking_code.ilike(term, escape="\\"),
                )
            )

        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar_one()

        query = (
            query.offset((page - 1) * limit)
            .limit(limit)
            .order_by(Report.created_at.desc(), Report.id.desc())
        )
        result = await db.execute(query)
        reports = result.scalars().all()

        return reports, total

    # --- Report Updates ---

    async def update_report(self, db, report_id, data, current_user=None):
        await db.execute(
            select(Report)
            .where(Report.id == report_id)
            .execution_options(populate_existing=True)
            .with_for_update()
        )
        report = await self.get_by_id(db, report_id)
        if not report:
            return None
        if current_user is None:
            raise HTTPException(403, "Authentication required")
        if current_user.is_admin:
            if "assignee_id" in data:
                raise HTTPException(
                    403, "Use the superadministrator assignment workflow"
                )
            if any(
                key in data for key in ("status", "remarks", "attachment_ids")
            ) and str(report.assignee_id) != str(current_user.id):
                raise HTTPException(
                    403, "Only the assigned administrator can update this report"
                )
        if not current_user.is_admin:
            if report.user_id != current_user.id:
                raise HTTPException(403, "Not authorized")
            if any(
                key in data
                for key in ("status", "assignee_id", "remarks", "attachment_ids")
            ):
                raise HTTPException(403, "Administrator access required")
        remarks = data.get("remarks")
        if remarks and len(remarks.split()) > 250:
            raise HTTPException(422, "Remarks exceed 250 words maximum")
        assignment = data.get("assignee_id", report.assignee_id)
        if "assignee_id" in data and assignment:
            if not isinstance(assignment, uuid.UUID):
                try:
                    assignment = uuid.UUID(str(assignment))
                except ValueError:
                    raise HTTPException(422, "Invalid assignee")
            assignee = await profile_service.get_by_id(db, assignment)
            if not assignee or not assignee.is_active or not assignee.is_admin:
                raise HTTPException(422, "Assignee must be an active administrator")
        new_status = ReportStatus(data.get("status", report.status))
        self.validate_transition(report.status, new_status, assignment)
        ids = list(dict.fromkeys(data.get("attachment_ids") or []))
        if ids:
            attachments = (
                (
                    await db.execute(
                        select(ReportAttachment.id).where(
                            ReportAttachment.report_id == report.id,
                            ReportAttachment.id.in_(ids),
                        )
                    )
                )
                .scalars()
                .all()
            )
            if set(attachments) != set(ids):
                raise HTTPException(422, "Attachments must belong to this report")
        changed = new_status != report.status
        for key in ("title", "description", "category", "location", "incident_date"):
            if key in data:
                setattr(report, key, data[key])
        if "assignee_id" in data:
            report.assignee_id = assignment
        report.status = new_status
        report.updated_at = datetime.utcnow()
        if changed or remarks or ids:
            timeline = ReportTimeline(
                report_id=report.id,
                status=new_status,
                remarks=remarks,
                created_by_user_id=current_user.id,
            )
            db.add(timeline)
            await db.flush()
            for identity in ids:
                db.add(
                    ReportTimelineAttachment(
                        timeline_id=timeline.id, attachment_id=identity
                    )
                )
        if new_status == ReportStatus.RESOLVED and not report.resolved_at:
            report.resolved_at = datetime.utcnow()
        if new_status == ReportStatus.CLOSED and not report.closed_at:
            report.closed_at = datetime.utcnow()
        await db.commit()
        if changed:
            email = report.reporter_email if report.is_anonymous else None
            if report.user_id and not report.is_anonymous:
                reporter = await profile_service.get_by_id(db, report.user_id)
                email = reporter.email if reporter else None
            if email:
                await self.email_service.send_status_update(
                    email,
                    report.tracking_code,
                    report.title,
                    new_status,
                    remarks,
                    f"{settings.FRONTEND_URL.rstrip('/')}/track/{report.tracking_code}",
                )
        return await self.get_by_id(db, report.id)

    async def assign_report(
        self, db, report_id, assignee_id, current_user, remarks=None
    ):
        from app.services.report_management import assign

        return await assign(db, report_id, assignee_id, current_user, remarks)

    async def add_timeline_entry(
        self, db, report_id, status, remarks, created_by_user_id, attachment_ids=None
    ):
        actor = await profile_service.get_by_id(db, created_by_user_id)
        report = await self.update_report(
            db,
            report_id,
            {"status": status, "remarks": remarks, "attachment_ids": attachment_ids},
            actor,
        )
        return (
            report.timeline_entries[-1] if report and report.timeline_entries else None
        )

    async def add_attachment(
        self,
        db: AsyncSession,
        report_id: int,
        file_content: bytes,
        original_filename: str,
        mime_type: str,
        uploaded_by_user_id: Optional[uuid.UUID] = None,
        commit: bool = True,
    ) -> Optional[ReportAttachment]:
        """Add an attachment to a report."""
        report = await self.get_by_id(db, report_id)
        if not report:
            return None

        # Validate file
        file_size = len(file_content)
        is_valid, error = self.file_storage.validate_file(
            original_filename, mime_type, file_size
        )
        if not is_valid:
            raise ValueError(error)

        # Upload to Supabase Storage
        stored_filename, file_path, saved_size = await self.file_storage.upload_file(
            file_content, original_filename, report_id
        )

        # Create attachment record
        attachment = ReportAttachment(
            report_id=report_id,
            filename=original_filename,
            stored_filename=stored_filename,
            file_path=file_path,  # Supabase Storage path
            file_size=saved_size,
            mime_type=mime_type,
            extension=Path(original_filename).suffix.lower(),
            uploaded_by_user_id=uploaded_by_user_id,
        )
        try:
            db.add(attachment)
            if commit:
                await db.commit()
            else:
                await db.flush()
            await db.refresh(attachment)
        except Exception:
            await self.file_storage.delete_file(file_path)
            raise

        return attachment

    async def get_attachments(
        self, db: AsyncSession, report_id: int
    ) -> List[ReportAttachment]:
        result = await db.execute(
            select(ReportAttachment).where(ReportAttachment.report_id == report_id)
        )
        return result.scalars().all()

    async def delete_attachment(self, db: AsyncSession, attachment_id: int) -> bool:
        attachment = await db.get(ReportAttachment, attachment_id)
        if not attachment:
            return False

        # Delete file from Supabase Storage
        await self.file_storage.delete_file(attachment.file_path)

        # Delete record
        await db.delete(attachment)
        await db.commit()
        return True

    # --- Admin Stats ---

    async def get_admin_stats(self, db: AsyncSession) -> dict:
        """Get admin dashboard statistics."""
        from app.services.moderation import report_statistics

        counts = await report_statistics(db)
        total_users = (await db.execute(select(func.count(Profile.id)))).scalar_one()
        total_admins = (
            await db.execute(
                select(func.count(Profile.id)).where(
                    Profile.role.in_([UserRole.ADMIN, UserRole.SUPER_ADMIN])
                )
            )
        ).scalar_one()

        return {
            "total_reports": counts["total"],
            "pending_reports": counts["submitted"],
            "under_review_reports": counts["under_review"],
            "assigned_reports": counts["assigned"],
            "in_progress_reports": counts["in_progress"],
            "resolved_reports": counts["resolved"],
            "closed_reports": counts["closed"],
            "awaiting_additional_info_reports": counts["awaiting_additional_info"],
            "anonymous_reports": counts["anonymous"],
            "authenticated_reports": counts["authenticated"],
            "total_users": total_users,
            "total_admins": total_admins,
        }


# ============================================================================
# Wellness Service (placeholder)
# ============================================================================


class WellnessService:
    pass


# ============================================================================
# Inspire Service (placeholder)
# ============================================================================


class InspireService:
    pass


# ============================================================================
# Share Service (placeholder)
# ============================================================================


class ShareService:
    """Persist ShareED materials in PostgreSQL and files in Supabase Storage."""

    ALLOWED_TYPES = {
        ".pdf": {"application/pdf"},
        ".doc": {"application/msword"},
        ".docx": {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        },
        ".ppt": {"application/vnd.ms-powerpoint"},
        ".pptx": {
            "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        },
        ".png": {"image/png"},
        ".jpg": {"image/jpeg", "image/jpg"},
        ".jpeg": {"image/jpeg", "image/jpg"},
    }

    async def get_materials(
        self,
        db,
        subject=None,
        pagination=None,
        search="",
        resource_type=None,
        file_format=None,
        sort="newest",
        owner_id=None,
    ):
        from app.services.share_search import query_materials, is_postgres

        pagination = pagination or {"page": 1, "limit": 20}
        query = query_materials(
            subject, search, resource_type, file_format, sort, is_postgres(db), owner_id
        )
        count = await db.scalar(
            select(func.count()).select_from(query.order_by(None).subquery())
        )
        result = await db.execute(
            query.offset((pagination["page"] - 1) * pagination["limit"]).limit(
                pagination["limit"]
            )
        )
        return result.scalars().all(), count

    async def get_material(self, db, material_id):
        result = await db.execute(
            select(SharedMaterial)
            .options(selectinload(SharedMaterial.user))
            .where(
                SharedMaterial.id == material_id, SharedMaterial.removed_at.is_(None)
            )
        )
        return result.scalar_one_or_none()

    async def increment_download_count(self, db, material_id):
        await db.execute(
            update(SharedMaterial)
            .where(
                SharedMaterial.id == material_id, SharedMaterial.removed_at.is_(None)
            )
            .values(download_count=SharedMaterial.download_count + 1)
        )
        await db.commit()

    async def upload_material(
        self, db, data, user_id, content, filename, mime_type, is_anonymous=False
    ):
        extension = Path(filename).suffix.lower()
        if (
            extension not in self.ALLOWED_TYPES
            or mime_type not in self.ALLOWED_TYPES[extension]
        ):
            raise ValueError(
                "Unsupported file type. Use PDF, Word, PowerPoint, PNG or JPEG."
            )
        if not content or len(content) > 25 * 1024 * 1024:
            raise ValueError("Choose a nonempty file up to 25 MB.")
        if not data["title"].strip() or not data["subject"].strip():
            raise ValueError("Title and subject are required.")
        bucket = supabase_service.get_storage_bucket()
        if not bucket:
            raise ValueError("Study material storage is not configured.")
        path = f"materials/{uuid.uuid4().hex}{extension}"
        await run_in_threadpool(
            bucket.upload,
            path=path,
            file=content,
            file_options={"content-type": mime_type},
        )
        try:
            url = await run_in_threadpool(bucket.get_public_url, path)
            material = SharedMaterial(
                title=data["title"].strip(),
                subject=data["subject"].strip(),
                description=data.get("description"),
                file_url=url,
                file_type=mime_type,
                user_id=user_id,
                is_anonymous=is_anonymous,
            )
            db.add(material)
            await db.commit()
        except Exception:
            await db.rollback()
            await run_in_threadpool(bucket.remove, [path])
            raise
        return await self.get_material(db, material.id)

    async def delete_material(self, db, material_id, user_id):
        material = await self.get_material(db, material_id)
        if not material or material.user_id != user_id:
            return False
        material.removed_at = datetime.now(timezone.utc)
        await db.commit()
        return True

    async def get_subjects(self, db):
        result = await db.execute(
            select(SharedMaterial.subject)
            .where(SharedMaterial.removed_at.is_(None))
            .distinct()
            .order_by(SharedMaterial.subject)
        )
        return list(result.scalars().all())

    async def get_file_types(self, db):
        result = await db.execute(
            select(SharedMaterial.file_type)
            .where(SharedMaterial.removed_at.is_(None))
            .distinct()
            .order_by(SharedMaterial.file_type)
        )
        return list(result.scalars().all())


# ============================================================================
# Service Instances (Singletons)
# ============================================================================

auth_service = AuthService()
profile_service = ProfileService()
report_service = ReportService()
email_service = EmailService()
file_storage_service = FileStorageService()
tracking_service = TrackingService()
wellness_service = WellnessService()
inspire_service = InspireService()
share_service = ShareService()

__all__ = [
    "AuthService",
    "ProfileService",
    "ReportService",
    "EmailService",
    "FileStorageService",
    "TrackingService",
    "WellnessService",
    "InspireService",
    "ShareService",
    "SupabaseService",
    "supabase_service",
    "auth_service",
    "profile_service",
    "report_service",
    "email_service",
    "file_storage_service",
    "tracking_service",
    "wellness_service",
    "inspire_service",
    "share_service",
]
