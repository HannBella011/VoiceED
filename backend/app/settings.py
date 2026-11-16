# VoiceED Backend Configuration
# Environment-based settings using Pydantic Settings

from pydantic_settings import BaseSettings
from typing import List, Optional, Literal
import secrets


class Settings(BaseSettings):
    # App
    PROJECT_NAME: str = "VoiceED API"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False

    # Security (keep for any legacy token validation during transition)
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    REFRESH_COOKIE_SAMESITE: Literal["lax", "strict", "none"] = "lax"
    REFRESH_COOKIE_SECURE: bool = True

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    # Database - Supabase Session Pooler
    # Format: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?pgbouncer=true&connection_limit=1
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/voiceed"
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10

    # Supabase Configuration
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    SUPABASE_JWT_SECRET: Optional[str] = None  # For JWT verification

    # Supabase Storage
    SUPABASE_STORAGE_BUCKET: str = "voiceed-uploads"
    REPORT_STORAGE_BUCKET: str = "voiceed-reports"
    INSPIRE_STORAGE_BUCKET: str = "voiceed-inspire"

    # Firebase (legacy)
    FIREBASE_CREDENTIALS_PATH: Optional[str] = None
    FIREBASE_PROJECT_ID: Optional[str] = None

    SUPPORT_RECIPIENT_ID: Optional[str] = None
    FRONTEND_URL: str = "http://localhost:3000"

    # Email (optional)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: Optional[str] = None
    EMAILS_FROM_NAME: str = "VoiceED"

    # File Upload
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: List[str] = [
        "pdf",
        "doc",
        "docx",
        "ppt",
        "pptx",
        "jpg",
        "jpeg",
        "png",
        "txt",
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"  # Allow extra fields in .env


settings = Settings()
