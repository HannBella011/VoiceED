# VoiceED Backend - Services Package
# Business logic services

"""
Services module for VoiceED backend.

This module contains business logic separated from routes:
- Authentication service (password hashing, JWT tokens)
- User service (profile management, preferences)
- Report service (CRUD, workflow, notifications)
- Wellness service (tips, resources, journal)
- Inspire service (stories, quotes, moderation)
- Share service (materials, uploads, downloads)
- Email service (notifications, verification)
- File storage service (local, S3, Firebase)
- Tracking service (tracking code generation)
"""

from datetime import datetime, timedelta
from typing import Optional, List
from passlib.context import CryptContext
from jose import jwt, JWTError
from app.config import settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from app.models import (
    User, Report, ReportAttachment, ReportTimeline, 
    ReportTimelineAttachment, JournalEntry, WellnessTip,
    InspireStory, InspireQuote, SharedMaterial, UserRole, ReportStatus, ReportCategory
)
import os
import uuid
import secrets
import string
import aiofiles
from pathlib import Path

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ============================================================================
# Authentication Service
# ============================================================================

class AuthService:
    """Handle authentication logic."""

    def hash_password(self, password: str) -> str:
        """Hash a password."""
        return pwd_context.hash(password)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt

    def create_refresh_token(self, data: dict) -> str:
        """Create JWT refresh token."""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt

    def decode_token(self, token: str) -> dict:
        """Decode and validate JWT token."""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            return payload
        except JWTError:
            raise ValueError("Invalid token")

    async def authenticate_user(self, db: AsyncSession, username: str, password: str) -> Optional[User]:
        """Authenticate a user with username and password."""
        result = await db.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()
        if not user:
            return None
        if not self.verify_password(password, user.hashed_password):
            return None
        return user


# ============================================================================
# User Service
# ============================================================================

class UserService:
    """Handle user-related business logic."""

    async def get_by_id(self, db: AsyncSession, user_id: int) -> Optional[User]:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_username(self, db: AsyncSession, username: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    async def create(self, db: AsyncSession, user_data: dict) -> User:
        user = User(**user_data)
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    async def update(self, db: AsyncSession, user_id: int, data: dict) -> Optional[User]:
        user = await self.get_by_id(db, user_id)
        if not user:
            return None
        for key, value in data.items():
            setattr(user, key, value)
        user.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(user)
        return user

    async def delete(self, db: AsyncSession, user_id: int) -> bool:
        user = await self.get_by_id(db, user_id)
        if not user:
            return False
        await db.delete(user)
        await db.commit()
        return True

    async def change_password(self, db: AsyncSession, user_id: int, current_password: str, new_password: str) -> bool:
        user = await self.get_by_id(db, user_id)
        if not user:
            return False
        if not auth_service.verify_password(current_password, user.hashed_password):
            return False
        user.hashed_password = auth_service.hash_password(new_password)
        await db.commit()
        return True

    async def list_users(
        self, 
        db: AsyncSession, 
        page: int = 1, 
        limit: int = 20,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None
    ) -> tuple[List[User], int]:
        query = select(User)
        if role:
            query = query.where(User.role == role)
        if is_active is not None:
            query = query.where(User.is_active == is_active)
        
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar_one()
        
        # Paginate
        query = query.offset((page - 1) * limit).limit(limit).order_by(User.created_at.desc())
        result = await db.execute(query)
        users = result.scalars().all()
        
        return users, total


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
        alphabet = ''.join(c for c in alphabet if c not in 'O0I1L')
        
        part1 = ''.join(secrets.choice(alphabet) for _ in range(4))
        part2 = ''.join(secrets.choice(alphabet) for _ in range(4))
        
        return f"{self.TRACKING_CODE_PREFIX}-{part1}-{part2}"
    
    async def ensure_unique_tracking_code(self, db: AsyncSession, max_attempts: int = 10) -> str:
        """Generate a tracking code guaranteed to be unique in the database."""
        for _ in range(max_attempts):
            code = self.generate_tracking_code()
            result = await db.execute(
                select(Report).where(Report.tracking_code == code)
            )
            if not result.scalar_one_or_none():
                return code
        # Fallback: add timestamp-based uniqueness
        timestamp = datetime.utcnow().strftime("%H%M%S")
        alphabet = string.ascii_uppercase + string.digits
        alphabet = ''.join(c for c in alphabet if c not in 'O0I1L')
        part1 = ''.join(secrets.choice(alphabet) for _ in range(3))
        part2 = ''.join(secrets.choice(alphabet) for _ in range(3))
        return f"{self.TRACKING_CODE_PREFIX}-{part1}{timestamp[:2]}-{part2}{timestamp[2:]}"


# ============================================================================
# File Storage Service
# ============================================================================

class FileStorageService:
    """Handle file uploads, validation, and storage."""
    
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
        self.upload_dir = Path(settings.UPLOAD_DIR) / "reports"
        self.upload_dir.mkdir(parents=True, exist_ok=True)
    
    def validate_file(self, filename: str, mime_type: str, file_size: int) -> tuple[bool, Optional[str]]:
        """Validate file extension, MIME type, and size.
        
        Returns (is_valid, error_message)
        """
        # Check file size
        if file_size > self.MAX_FILE_SIZE:
            return False, f"File size exceeds maximum allowed (25 MB)"
        
        # Check extension
        ext = Path(filename).suffix.lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            return False, f"File type '{ext}' not allowed. Allowed: {', '.join(self.ALLOWED_EXTENSIONS)}"
        
        # Check MIME type
        if mime_type not in self.ALLOWED_MIME_TYPES:
            return False, f"MIME type '{mime_type}' not allowed"
        
        return True, None
    
    def generate_stored_filename(self, original_filename: str) -> str:
        """Generate a unique stored filename using UUID."""
        ext = Path(original_filename).suffix.lower()
        unique_id = uuid.uuid4().hex
        return f"{unique_id}{ext}"
    
    async def save_file(
        self, 
        file_content: bytes, 
        original_filename: str,
        report_id: int
    ) -> tuple[str, str, int]:
        """Save file to disk and return (stored_filename, file_path, file_size)."""
        stored_filename = self.generate_stored_filename(original_filename)
        
        # Create report-specific subdirectory
        report_dir = self.upload_dir / str(report_id)
        report_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = report_dir / stored_filename
        
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(file_content)
        
        file_size = len(file_content)
        
        return stored_filename, str(file_path), file_size
    
    async def delete_file(self, file_path: str) -> bool:
        """Delete a file from storage."""
        try:
            Path(file_path).unlink(missing_ok=True)
            return True
        except Exception:
            return False
    
    def get_file_url(self, file_path: str) -> str:
        """Get the public URL for a file (for serving via static files or CDN)."""
        # In production, this would return a signed URL or CDN URL
        # For now, return a relative path that can be served by FastAPI static files
        rel_path = Path(file_path).relative_to(Path(settings.UPLOAD_DIR))
        return f"/uploads/{rel_path}"


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
        return all([self.smtp_host, self.smtp_port, self.smtp_user, self.smtp_password, self.from_email])
    
    def _get_email_template(self, tracking_code: str, report_title: str, submission_date: datetime, tracking_url: str, is_anonymous: bool) -> str:
        """Generate HTML email template for report submission."""
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
                <h1 style="margin: 0; color: #2c3e50; font-size: 28px;">VoiceED</h1>
                <p style="margin: 10px 0 0; color: #7f8c8d; font-size: 16px;">Your Voice, Your Safety, Our Priority</p>
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
    
    def _get_status_update_template(self, tracking_code: str, report_title: str, new_status: ReportStatus, remarks: Optional[str], tracking_url: str) -> str:
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
        is_anonymous: bool = False
    ) -> bool:
        """Send report submission confirmation email."""
        if not self.is_configured():
            # Log but don't fail - email is optional
            print(f"[Email] Not configured, would send confirmation to {to_email}")
            return False
        
        html_content = self._get_email_template(
            tracking_code, report_title, submission_date, tracking_url, is_anonymous
        )
        
        return await self._send_email(to_email, f"VoiceED Report Confirmation - {tracking_code}", html_content)
    
    async def send_status_update(
        self,
        to_email: str,
        tracking_code: str,
        report_title: str,
        new_status: ReportStatus,
        remarks: Optional[str],
        tracking_url: str
    ) -> bool:
        """Send report status update email."""
        if not self.is_configured():
            print(f"[Email] Not configured, would send status update to {to_email}")
            return False
        
        html_content = self._get_status_update_template(
            tracking_code, report_title, new_status, remarks, tracking_url
        )
        
        return await self._send_email(to_email, f"VoiceED Report Update - {tracking_code}", html_content)
    
    async def _send_email(self, to: str, subject: str, html_content: str) -> bool:
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
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            return True
        except Exception as e:
            print(f"[Email] Failed to send email: {e}")
            return False


# ============================================================================
# Report Service
# ============================================================================

class ReportService:
    """Handle report-related business logic."""
    
    def __init__(self):
        self.tracking_service = TrackingService()
        self.file_storage = FileStorageService()
        self.email_service = EmailService()
    
    # --- Report Creation ---
    
    async def create_report(
        self,
        db: AsyncSession,
        data: dict,
        user_id: Optional[int] = None,
        is_anonymous: bool = False,
        reporter_email: Optional[str] = None
    ) -> Report:
        """Create a new report (authenticated or anonymous)."""
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
            "reporter_email": reporter_email if is_anonymous else None,
        }
        
        report = Report(**report_data)
        db.add(report)
        await db.flush()  # Get the ID without committing
        
        # Create initial timeline entry
        timeline = ReportTimeline(
            report_id=report.id,
            status=ReportStatus.SUBMITTED,
            remarks="Report submitted",
            created_by_user_id=user_id if not is_anonymous else None
        )
        db.add(timeline)
        
        await db.commit()
        await db.refresh(report)
        
        # Send email notification if email available
        email_to_send = None
        if not is_anonymous and user_id:
            user = await user_service.get_by_id(db, user_id)
            if user:
                email_to_send = user.email
        elif is_anonymous and reporter_email:
            email_to_send = reporter_email
        
        if email_to_send:
            tracking_url = f"{settings.BACKEND_CORS_ORIGINS[0]}/track/{tracking_code}"
            await self.email_service.send_report_confirmation(
                to_email=email_to_send,
                tracking_code=tracking_code,
                report_title=report.title,
                submission_date=report.created_at,
                tracking_url=tracking_url,
                is_anonymous=is_anonymous
            )
        
        return report
    
    # --- Report Retrieval ---
    
    async def get_by_id(self, db: AsyncSession, report_id: int, include_relations: bool = True) -> Optional[Report]:
        query = select(Report).where(Report.id == report_id)
        if include_relations:
            query = query.options(
                # Note: SQLAlchemy 2.0 doesn't use joinedload in select() the same way
                # We'll load relationships separately if needed
            )
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_by_tracking_code(self, db: AsyncSession, tracking_code: str) -> Optional[Report]:
        result = await db.execute(
            select(Report).where(Report.tracking_code == tracking_code)
        )
        return result.scalar_one_or_none()
    
    async def get_user_reports(
        self, 
        db: AsyncSession, 
        user_id: int, 
        page: int = 1, 
        limit: int = 20,
        status: Optional[ReportStatus] = None
    ) -> tuple[List[Report], int]:
        query = select(Report).where(Report.user_id == user_id)
        if status:
            query = query.where(Report.status == status)
        
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar_one()
        
        # Paginate
        query = query.offset((page - 1) * limit).limit(limit).order_by(Report.created_at.desc())
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
        assignee_id: Optional[int] = None
    ) -> tuple[List[Report], int]:
        query = select(Report)
        
        if status:
            query = query.where(Report.status == status)
        if category:
            query = query.where(Report.category == category)
        if is_anonymous is not None:
            query = query.where(Report.is_anonymous == is_anonymous)
        if assignee_id:
            query = query.where(Report.assignee_id == assignee_id)
        
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar_one()
        
        # Paginate
        query = query.offset((page - 1) * limit).limit(limit).order_by(Report.created_at.desc())
        result = await db.execute(query)
        reports = result.scalars().all()
        
        return reports, total
    
    # --- Report Updates ---
    
    async def update_report(
        self, 
        db: AsyncSession, 
        report_id: int, 
        data: dict,
        current_user: Optional[User] = None
    ) -> Optional[Report]:
        report = await self.get_by_id(db, report_id)
        if not report:
            return None
        
        # Track status change for timeline
        old_status = report.status
        
        for key, value in data.items():
            if hasattr(report, key) and key not in ("id", "tracking_code", "user_id", "created_at"):
                setattr(report, key, value)
        
        report.updated_at = datetime.utcnow()
        
        # Handle status change
        if "status" in data and data["status"] != old_status:
            new_status = data["status"]
            
            # Set resolved/closed timestamps
            if new_status == ReportStatus.RESOLVED and not report.resolved_at:
                report.resolved_at = datetime.utcnow()
            elif new_status == ReportStatus.CLOSED and not report.closed_at:
                report.closed_at = datetime.utcnow()
            
            # Create timeline entry
            timeline = ReportTimeline(
                report_id=report.id,
                status=new_status,
                remarks=data.get("remarks"),
                created_by_user_id=current_user.id if current_user else None
            )
            db.add(timeline)
            
            # Send email notification if reporter has email
            email_to_send = None
            if not report.is_anonymous and report.user_id:
                user = await user_service.get_by_id(db, report.user_id)
                if user:
                    email_to_send = user.email
            elif report.is_anonymous and report.reporter_email:
                email_to_send = report.reporter_email
            
            if email_to_send:
                tracking_url = f"{settings.BACKEND_CORS_ORIGINS[0]}/track/{report.tracking_code}"
                await self.email_service.send_status_update(
                    to_email=email_to_send,
                    tracking_code=report.tracking_code,
                    report_title=report.title,
                    new_status=new_status,
                    remarks=data.get("remarks"),
                    tracking_url=tracking_url
                )
        
        await db.commit()
        await db.refresh(report)
        return report
    
    async def assign_report(self, db: AsyncSession, report_id: int, assignee_id: int, current_user: User) -> Optional[Report]:
        """Assign a report to an admin/moderator."""
        report = await self.get_by_id(db, report_id)
        if not report:
            return None
        
        # Verify assignee exists and is admin/moderator
        assignee = await user_service.get_by_id(db, assignee_id)
        if not assignee or assignee.role not in (UserRole.ADMIN, UserRole.MODERATOR, UserRole.SUPER_ADMIN):
            raise ValueError("Assignee must be an admin or moderator")
        
        report.assignee_id = assignee_id
        report.status = ReportStatus.ASSIGNED
        report.updated_at = datetime.utcnow()
        
        # Create timeline entry
        timeline = ReportTimeline(
            report_id=report.id,
            status=ReportStatus.ASSIGNED,
            remarks=f"Assigned to {assignee.full_name or assignee.username}",
            created_by_user_id=current_user.id
        )
        db.add(timeline)
        
        await db.commit()
        await db.refresh(report)
        return report
    
    async def add_timeline_entry(
        self,
        db: AsyncSession,
        report_id: int,
        status: ReportStatus,
        remarks: Optional[str],
        created_by_user_id: Optional[int],
        attachment_ids: Optional[List[int]] = None
    ) -> Optional[ReportTimeline]:
        """Add a timeline entry with optional attachments."""
        report = await self.get_by_id(db, report_id)
        if not report:
            return None
        
        timeline = ReportTimeline(
            report_id=report_id,
            status=status,
            remarks=remarks,
            created_by_user_id=created_by_user_id
        )
        db.add(timeline)
        await db.flush()
        
        # Link attachments if provided
        if attachment_ids:
            for att_id in attachment_ids:
                link = ReportTimelineAttachment(
                    timeline_id=timeline.id,
                    attachment_id=att_id
                )
                db.add(link)
        
        # Update report status if changed
        if status != report.status:
            report.status = status
            report.updated_at = datetime.utcnow()
            if status == ReportStatus.RESOLVED and not report.resolved_at:
                report.resolved_at = datetime.utcnow()
            elif status == ReportStatus.CLOSED and not report.closed_at:
                report.closed_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(timeline)
        return timeline
    
    # --- File Attachments ---
    
    async def add_attachment(
        self,
        db: AsyncSession,
        report_id: int,
        file_content: bytes,
        original_filename: str,
        mime_type: str,
        uploaded_by_user_id: Optional[int] = None
    ) -> Optional[ReportAttachment]:
        """Add an attachment to a report."""
        report = await self.get_by_id(db, report_id)
        if not report:
            return None
        
        # Validate file
        file_size = len(file_content)
        is_valid, error = self.file_storage.validate_file(original_filename, mime_type, file_size)
        if not is_valid:
            raise ValueError(error)
        
        # Save file
        stored_filename, file_path, saved_size = await self.file_storage.save_file(
            file_content, original_filename, report_id
        )
        
        # Create attachment record
        attachment = ReportAttachment(
            report_id=report_id,
            filename=original_filename,
            stored_filename=stored_filename,
            file_path=file_path,
            file_size=saved_size,
            mime_type=mime_type,
            extension=Path(original_filename).suffix.lower(),
            uploaded_by_user_id=uploaded_by_user_id
        )
        db.add(attachment)
        await db.commit()
        await db.refresh(attachment)
        
        return attachment
    
    async def get_attachments(self, db: AsyncSession, report_id: int) -> List[ReportAttachment]:
        result = await db.execute(
            select(ReportAttachment).where(ReportAttachment.report_id == report_id)
        )
        return result.scalars().all()
    
    async def delete_attachment(self, db: AsyncSession, attachment_id: int) -> bool:
        attachment = await db.get(ReportAttachment, attachment_id)
        if not attachment:
            return False
        
        # Delete file from storage
        await self.file_storage.delete_file(attachment.file_path)
        
        # Delete record
        await db.delete(attachment)
        await db.commit()
        return True
    
    # --- Admin Stats ---
    
    async def get_admin_stats(self, db: AsyncSession) -> dict:
        """Get admin dashboard statistics."""
        total = (await db.execute(select(func.count(Report.id)))).scalar_one()
        pending = (await db.execute(select(func.count(Report.id)).where(Report.status == ReportStatus.SUBMITTED))).scalar_one()
        under_review = (await db.execute(select(func.count(Report.id)).where(Report.status == ReportStatus.UNDER_REVIEW))).scalar_one()
        in_progress = (await db.execute(select(func.count(Report.id)).where(Report.status.in_([ReportStatus.ASSIGNED, ReportStatus.IN_PROGRESS])))).scalar_one()
        resolved = (await db.execute(select(func.count(Report.id)).where(Report.status == ReportStatus.RESOLVED))).scalar_one()
        closed = (await db.execute(select(func.count(Report.id)).where(Report.status == ReportStatus.CLOSED))).scalar_one()
        anonymous = (await db.execute(select(func.count(Report.id)).where(Report.is_anonymous == True))).scalar_one()
        authenticated = (await db.execute(select(func.count(Report.id)).where(Report.is_anonymous == False))).scalar_one()
        total_users = (await db.execute(select(func.count(User.id)))).scalar_one()
        total_admins = (await db.execute(select(func.count(User.id)).where(User.role.in_([UserRole.ADMIN, UserRole.MODERATOR, UserRole.SUPER_ADMIN])))).scalar_one()
        
        return {
            "total_reports": total,
            "pending_reports": pending,
            "under_review_reports": under_review,
            "in_progress_reports": in_progress,
            "resolved_reports": resolved + closed,
            "anonymous_reports": anonymous,
            "authenticated_reports": authenticated,
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
    pass


# ============================================================================
# Service Instances (Singletons)
# ============================================================================

auth_service = AuthService()
user_service = UserService()
report_service = ReportService()
email_service = EmailService()
file_storage_service = FileStorageService()
tracking_service = TrackingService()
wellness_service = WellnessService()
inspire_service = InspireService()
share_service = ShareService()

__all__ = [
    "AuthService",
    "UserService",
    "ReportService",
    "EmailService",
    "FileStorageService",
    "TrackingService",
    "WellnessService",
    "InspireService",
    "ShareService",
    "auth_service",
    "user_service",
    "report_service",
    "email_service",
    "file_storage_service",
    "tracking_service",
    "wellness_service",
    "inspire_service",
    "share_service",
]