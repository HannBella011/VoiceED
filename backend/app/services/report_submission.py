"""Report receipts and tracking authorization; reuse report/storage/email services."""

from datetime import date, datetime, timezone, timedelta
import hashlib
import hmac
import json
from typing import Optional
from fastapi import HTTPException, Request
from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    ValidationError,
    field_validator,
)
from sqlalchemy import select, update, delete, func, literal, BigInteger
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from app.models import Report, Profile, TrackingRateLimit
from app.services import report_service, auth_service
from app.schemas import ReportResponse, ReportSubmissionResponse, ReportPublicResponse
from app.settings import settings


class ReporterInformation(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    full_name: str = Field(min_length=1, max_length=255)
    display_name: str = Field(min_length=1, max_length=50)
    birthday: date
    school_id: str = Field(min_length=1, max_length=50)
    email: EmailStr

    @field_validator("birthday")
    @classmethod
    def birthday_in_past(cls, value):
        if value > datetime.now(timezone.utc).date():
            raise ValueError("Birthday cannot be in the future")
        return value


def parse_reporter(raw, profile=None):
    if not raw and profile is not None:
        raw = dict(
            full_name=profile.full_name,
            display_name=profile.username,
            birthday=profile.birthday.date().isoformat() if profile.birthday else None,
            school_id=profile.school_id,
            email=profile.email,
        )
    try:
        return (
            ReporterInformation.model_validate_json(raw).model_dump(mode="json")
            if isinstance(raw, str)
            else ReporterInformation.model_validate(raw).model_dump(mode="json")
        )
    except (ValidationError, ValueError, TypeError):
        raise HTTPException(
            422,
            "Complete valid full name, display name, birthday, school ID and email information",
        )


def parse_incident(value):
    if not value:
        raise HTTPException(422, "Incident date and time are required")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            raise ValueError()
        return parsed.astimezone(timezone.utc)
    except (ValueError, TypeError):
        raise HTTPException(422, "Use an incident timestamp including its time zone")


def access_token(report):
    # Keyed SHA-256 is a 256-bit opaque secret; no secret is exposed by the short code.
    message = f"report-access:{report.tracking_code}:{report.submission_key}".encode()
    return hmac.new(settings.SECRET_KEY.encode(), message, hashlib.sha256).hexdigest()


def dialect_name(db):
    bound = getattr(db, "bind", None) or getattr(
        getattr(db, "session", None), "bind", None
    )
    return bound.dialect.name if bound else "postgresql"


async def submit(
    db, data, files, key, owner=None, anonymous=False, email=None, reporter=None
):
    if not data["title"].strip() or not data["description"].strip():
        raise HTTPException(422, "Report title and description are required")
    if len(data["description"]) > 50000:
        raise HTTPException(422, "Description exceeds 50,000 characters")
    if len(data.get("location") or "") > 255:
        raise HTTPException(422, "Location exceeds 255 characters")
    if anonymous:
        if reporter is not None:
            raise HTTPException(
                422, "Anonymous reports must not include reporter information"
            )
        owner = None
    prepared = []
    for file in files:
        if not file.filename:
            continue
        content = await file.read(report_service.file_storage.MAX_FILE_SIZE + 1)
        mime = file.content_type or "application/octet-stream"
        valid, error = report_service.file_storage.validate_file(
            file.filename, mime, len(content)
        )
        if not valid:
            raise HTTPException(400, error)
        signatures = {
            "image/png": content.startswith(b"\x89PNG\r\n\x1a\n"),
            "image/jpeg": content.startswith(b"\xff\xd8\xff"),
            "application/pdf": b"%PDF-" in content[:1024],
        }
        if not signatures.get(mime):
            raise HTTPException(400, "Evidence content does not match its file type")
        prepared.append((file.filename, mime, content))
    key_hash = hashlib.sha256(str(key).encode()).hexdigest()
    snapshot = {
        **data,
        "incident_date": data["incident_date"].isoformat(),
        "owner": str(owner) if owner else None,
        "anonymous": anonymous,
        "email": email,
        "reporter": reporter,
        "files": [
            (name, mime, hashlib.sha256(content).hexdigest())
            for name, mime, content in prepared
        ],
    }
    fingerprint = hashlib.sha256(
        json.dumps(snapshot, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    if dialect_name(db) == "postgresql":
        # Cross-worker serialization by request key, released by commit/rollback.
        lock = int.from_bytes(bytes.fromhex(key_hash[:16]), "big", signed=True)
        await db.execute(
            select(func.pg_advisory_xact_lock(literal(lock, type_=BigInteger)))
        )
    existing = await db.scalar(select(Report).where(Report.submission_key == key_hash))
    if existing:
        if not hmac.compare_digest(existing.submission_fingerprint or "", fingerprint):
            raise HTTPException(
                409,
                "This submission reference was used for different entries. Review the report and start a new attempt.",
            )
        report = await report_service.get_by_id(db, existing.id)
    else:
        paths = []
        try:
            values = {
                **data,
                "reporter_details": reporter,
                "submission_key": key_hash,
                "submission_fingerprint": fingerprint,
                "notification_status": "pending" if email else "not_requested",
            }
            report = await report_service.create_report(
                db,
                values,
                user_id=owner,
                is_anonymous=anonymous,
                reporter_email=email,
                commit=False,
            )
            report.tracking_access_hash = hashlib.sha256(
                access_token(report).encode()
            ).hexdigest()
            for filename, mime, content in prepared:
                attachment = await report_service.add_attachment(
                    db,
                    report.id,
                    content,
                    filename,
                    mime,
                    uploaded_by_user_id=None if anonymous else owner,
                    commit=False,
                )
                paths.append(attachment.file_path)
            await db.commit()
        except Exception as exc:
            await db.rollback()
            for path in paths:
                try:
                    await report_service.file_storage.delete_file(path)
                except Exception:
                    pass
            if isinstance(exc, HTTPException):
                raise
            raise HTTPException(
                503,
                "Report could not be saved. Your entries can be retried with the same submission reference.",
            ) from exc
        report = await report_service.get_by_id(db, report.id)
    secret = access_token(report)
    receipt = ReportSubmissionResponse.model_validate(
        {
            **ReportResponse.model_validate(report).model_dump(),
            "success": True,
            "tracking_access_token": secret,
            "email_notification": report.notification_status,
        }
    )
    # Snapshot before further commits so async ORM expiration cannot lose the receipt.
    identity = report.id
    destination = report.reporter_email
    try:
        if destination and report.notification_status == "pending":
            claimed = await db.execute(
                update(Report)
                .where(Report.id == identity, Report.notification_status == "pending")
                .values(notification_status="sending")
                .returning(Report.id)
            )
            claimed_id = claimed.scalar_one_or_none()
            await db.commit()
            if claimed_id is not None:
                status = "failed"
                try:
                    url = f"{settings.FRONTEND_URL.rstrip('/')}/track/{receipt.tracking_code}#access={secret}"
                    accepted = (
                        await report_service.email_service.send_report_confirmation(
                            destination,
                            receipt.tracking_code,
                            receipt.title,
                            receipt.created_at,
                            url,
                            anonymous,
                        )
                    )
                    status = "accepted" if accepted else "failed"
                except Exception:
                    pass
                receipt.email_notification = status
                try:
                    await db.execute(
                        update(Report)
                        .where(Report.id == identity)
                        .values(notification_status=status)
                    )
                    await db.commit()
                except Exception:
                    await db.rollback()
            else:
                receipt.email_notification = "sending"
    except Exception:
        await db.rollback()
        receipt.email_notification = "pending"
    return receipt


async def throttle_tracking(db, request):
    now = datetime.now(timezone.utc)
    minute = int(now.timestamp()) // 60
    # Trust only the ASGI server's client address, never arbitrary forwarded headers.
    client = request.client.host if request.client else "unknown"
    statement = pg_insert if dialect_name(db) == "postgresql" else sqlite_insert
    await db.execute(
        delete(TrackingRateLimit).where(TrackingRateLimit.expires_at < now)
    )
    for source, limit in [(f"ip:{client}", 30), ("global", 1000)]:
        bucket = hmac.new(
            settings.SECRET_KEY.encode(),
            f"tracking:{minute}:{source}".encode(),
            hashlib.sha256,
        ).hexdigest()
        query = statement(TrackingRateLimit).values(
            bucket=bucket,
            hits=1,
            expires_at=datetime.fromtimestamp((minute + 2) * 60, timezone.utc),
        )
        query = query.on_conflict_do_update(
            index_elements=["bucket"], set_={"hits": TrackingRateLimit.hits + 1}
        ).returning(TrackingRateLimit.hits)
        hits = (await db.execute(query)).scalar_one()
        if hits > limit:
            await db.commit()
            raise HTTPException(
                429,
                "Too many tracking attempts. Try again shortly.",
                headers={"Retry-After": str(60 - int(now.timestamp()) % 60)},
            )
    await db.commit()


async def public_tracking(db, code, secret, authorization, request):
    import re

    await throttle_tracking(db, request)
    if not re.fullmatch(r"VED-[A-Z0-9]{4}-[A-Z0-9]{4}", code):
        raise HTTPException(404, "Report not found")
    report = await report_service.get_by_tracking_code(db, code)
    if report is None:
        raise HTTPException(404, "Report not found")
    permitted = False
    if secret:
        if not report.tracking_access_hash or not hmac.compare_digest(
            report.tracking_access_hash, hashlib.sha256(secret.encode()).hexdigest()
        ):
            raise HTTPException(404, "Report not found")
        permitted = True
    elif authorization and authorization.startswith("Bearer "):
        from app.routes.auth import get_current_active_user, get_current_user

        try:
            actor = await get_current_user(authorization[7:], db)
            permitted = actor.is_active and (
                actor.is_admin or report.user_id == actor.id
            )
        except (HTTPException, ValueError):
            pass
    if permitted:
        return ReportPublicResponse.model_validate(report)
    # Short codes (including legacy codes) disclose status only, never private content.
    return ReportPublicResponse(
        id=code,
        tracking_code=code,
        title="Report status",
        category="other",
        status=report.status,
        is_anonymous=True,
        created_at=report.created_at,
        updated_at=report.updated_at,
        timeline=[],
        access_required=True,
    )
