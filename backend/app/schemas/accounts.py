import uuid
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, EmailStr, model_validator


class InviteInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    request_id: uuid.UUID
    email: EmailStr
    username: str = Field(min_length=1, max_length=50, pattern=r"^[\w.-]+$")
    full_name: str = Field(min_length=1, max_length=255)
    school_id: str = Field(min_length=1, max_length=50)


class AccountUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    username: str | None = Field(
        default=None, min_length=1, max_length=50, pattern=r"^[\w.-]+$"
    )
    school_id: str | None = Field(default=None, min_length=1, max_length=50)
    role: Literal["student", "admin", "super_admin"] | None = None
    reason: str = Field(min_length=1, max_length=2000)

    @model_validator(mode="after")
    def no_null_authority(self):
        for field in ["username", "full_name", "role", "school_id"]:
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class StatusInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    is_active: bool
    reason: str = Field(min_length=1, max_length=2000)


class VerificationInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    is_verified: bool
    institutional_review_completed: bool = False
    notes: str = Field(min_length=1, max_length=5000)

    @model_validator(mode="after")
    def reviewed(self):
        if self.is_verified and not self.institutional_review_completed:
            raise ValueError(
                "Complete an authorized institutional review; a school ID alone is not proof"
            )
        return self


class RecoverInvite(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    auth_user_id: uuid.UUID
    username: str | None = Field(
        default=None, min_length=1, max_length=50, pattern=r"^[\w.-]+$"
    )
