from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from enum import Enum


class UserRole(str, Enum):
    STUDENT = "student"
    ADMIN = "admin"
    MODERATOR = "moderator"


class ReportStatus(str, Enum):
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    RESOLVED = "resolved"
    REJECTED = "rejected"


class ReportCategory(str, Enum):
    BULLYING = "bullying"
    HARASSMENT = "harassment"
    VIOLENCE = "violence"
    DRUGS = "drugs"
    CYBERBULLYING = "cyberbullying"
    OTHER = "other"


# Auth schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None


# User schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    role: UserRole = UserRole.STUDENT


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserResponse(UserBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Report schemas
class ReportBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    category: ReportCategory
    is_anonymous: bool = False
    location: Optional[str] = None


class ReportCreate(ReportBase):
    pass


class ReportUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[ReportStatus] = None
    category: Optional[ReportCategory] = None


class ReportResponse(ReportBase):
    id: str
    status: ReportStatus
    user_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Wellness schemas
class WellnessTipBase(BaseModel):
    title: str
    content: str
    category: str


class WellnessTipCreate(WellnessTipBase):
    pass


class WellnessTipResponse(WellnessTipBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class JournalEntryBase(BaseModel):
    title: str
    content: str
    mood: Optional[str] = None


class JournalEntryCreate(JournalEntryBase):
    pass


class JournalEntryResponse(JournalEntryBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Inspire schemas
class InspireStoryBase(BaseModel):
    title: str
    content: str
    author_name: Optional[str] = None
    is_anonymous: bool = False


class InspireStoryCreate(InspireStoryBase):
    pass


class InspireStoryResponse(InspireStoryBase):
    id: str
    user_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class InspireQuoteBase(BaseModel):
    quote: str
    author: Optional[str] = None


class InspireQuoteCreate(InspireQuoteBase):
    pass


class InspireQuoteResponse(InspireQuoteBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


# Share schemas
class SharedMaterialBase(BaseModel):
    title: str
    description: Optional[str] = None
    subject: str
    file_url: str
    file_type: str


class SharedMaterialCreate(SharedMaterialBase):
    pass


class SharedMaterialResponse(SharedMaterialBase):
    id: str
    user_id: str
    download_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True