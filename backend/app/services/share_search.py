"""ShareED filtering is applied before SQL pagination, never in the browser."""

import re
from sqlalchemy import select, func, or_, literal_column
from sqlalchemy.orm import selectinload, load_only
from app.models import SharedMaterial, Profile

FORMATS = {
    "pdf": ["application/pdf"],
    "doc": ["application/msword"],
    "docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    "ppt": ["application/vnd.ms-powerpoint"],
    "pptx": [
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ],
    "jpeg": ["image/jpeg", "image/jpg"],
    "jpg": ["image/jpeg", "image/jpg"],
    "png": ["image/png"],
}
PRESENTATIONS = FORMATS["ppt"] + FORMATS["pptx"]
IMAGES = FORMATS["png"] + FORMATS["jpeg"]
# Keep this expression identical to the GIN index in the Alembic revision.
SEARCH_VECTOR = "to_tsvector('simple'::regconfig, coalesce(title, '') || ' ' || coalesce(subject, '') || ' ' || coalesce(description, ''))"


def query_materials(
    subject=None,
    search="",
    resource_type=None,
    file_format=None,
    sort="newest",
    postgres=False,
    owner_id=None,
):
    query = (
        select(SharedMaterial)
        .options(
            load_only(
                SharedMaterial.id,
                SharedMaterial.user_id,
                SharedMaterial.title,
                SharedMaterial.description,
                SharedMaterial.subject,
                SharedMaterial.file_url,
                SharedMaterial.file_type,
                SharedMaterial.download_count,
                SharedMaterial.is_anonymous,
                SharedMaterial.created_at,
            ),
            selectinload(SharedMaterial.user).load_only(Profile.id, Profile.username),
        )
        .where(SharedMaterial.removed_at.is_(None))
    )
    if subject:
        query = query.where(SharedMaterial.subject == subject)
    if owner_id is not None:
        query = query.where(SharedMaterial.user_id == owner_id)
    tokens = re.findall(r"[^\W_]+", search, re.UNICODE)
    if search.strip():
        if not tokens:
            query = query.where(False)
        elif postgres:
            # Alphanumeric tokens are bound as a tsquery value, not SQL text.
            query = query.where(
                literal_column(SEARCH_VECTOR).op("@@")(
                    func.to_tsquery(
                        literal_column("'simple'::regconfig"),
                        " & ".join(token + ":*" for token in tokens),
                    )
                )
            )
        else:
            # SQLite test adapter: production uses PostgreSQL's indexed search.
            for token in tokens:
                term = "%" + token + "%"
                query = query.where(
                    or_(
                        SharedMaterial.title.ilike(term),
                        SharedMaterial.subject.ilike(term),
                        SharedMaterial.description.ilike(term),
                    )
                )
    if resource_type == "image":
        query = query.where(SharedMaterial.file_type.in_(IMAGES))
    elif resource_type == "presentation":
        query = query.where(SharedMaterial.file_type.in_(PRESENTATIONS))
    elif resource_type == "document":
        query = query.where(SharedMaterial.file_type.not_in(IMAGES + PRESENTATIONS))
    if file_format:
        query = query.where(SharedMaterial.file_type.in_(FORMATS[file_format]))
    order = {
        "newest": [SharedMaterial.created_at.desc(), SharedMaterial.id.desc()],
        "oldest": [SharedMaterial.created_at.asc(), SharedMaterial.id.asc()],
        "title": [func.lower(SharedMaterial.title).asc(), SharedMaterial.id.asc()],
        "downloads": [SharedMaterial.download_count.desc(), SharedMaterial.id.desc()],
    }[sort]
    return query.order_by(*order)


def is_postgres(db):
    bound = getattr(db, "bind", None) or getattr(
        getattr(db, "session", None), "bind", None
    )
    return bound is None or bound.dialect.name == "postgresql"
