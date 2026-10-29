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
"""

from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext
from jose import jwt, JWTError
from app.config import settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import User

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# Authentication service
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


# User service
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


# Service instances (singletons)
auth_service = AuthService()
user_service = UserService()