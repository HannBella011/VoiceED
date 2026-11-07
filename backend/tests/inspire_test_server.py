"""Isolated HTTP fixture for frontend integration tests; never import in production."""

import os

os.environ["DEBUG"] = "false"
import socket
import uuid
from unittest.mock import Mock
from fastapi import FastAPI, Header, HTTPException, Response
from sqlalchemy import create_engine, UUID
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
import uvicorn
from app.models import (
    Profile,
    InspireStory,
    InspireQuote,
    InspireReaction,
    InspireComment,
    InspireShare,
    InspireAttachment,
    UserActivity,
    SharedMaterial,
    Report,
    JournalEntry,
    MoodRecord,
    WellnessGoal,
    WellnessGoalProgress,
)
from app.routes import inspire, share, dashboard
from app.services import supabase_service
from app.services import inspire_storage


@compiles(UUID, "sqlite")
def sqlite_uuid(element, compiler, **kwargs):
    return "CHAR(32)"


engine = create_engine(
    "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
for model in [
    Profile,
    InspireStory,
    InspireQuote,
    InspireReaction,
    InspireComment,
    InspireShare,
    InspireAttachment,
    UserActivity,
    SharedMaterial,
    Report,
    JournalEntry,
    MoodRecord,
    WellnessGoal,
    WellnessGoalProgress,
]:
    model.__table__.create(engine)
owner = uuid.uuid4()
other = uuid.uuid4()
with Session(engine) as db:
    db.add_all(
        [
            Profile(id=owner, username="owner", email="owner@example.test"),
            Profile(id=other, username="other", email="other@example.test"),
        ]
    )
    db.commit()


class TestSession:
    def __init__(self, session):
        self.session = session

    def add(self, row):
        self.session.add(row)

    async def execute(self, statement):
        return self.session.execute(statement)

    async def scalar(self, statement):
        return self.session.scalar(statement)

    async def scalars(self, statement):
        return self.session.scalars(statement)

    async def flush(self):
        self.session.flush()

    async def commit(self):
        self.session.commit()

    async def refresh(self, row):
        self.session.refresh(row)

    async def delete(self, row):
        self.session.delete(row)


async def database():
    with Session(engine, expire_on_commit=False) as db:
        try:
            yield TestSession(db)
        except Exception:
            db.rollback()
            raise


async def optional_user(authorization: str | None = Header(None)):
    if authorization is None:
        return None
    identities = {"Bearer test-owner": owner, "Bearer test-other": other}
    if authorization not in identities:
        raise HTTPException(401, "Invalid test session")
    with Session(engine) as db:
        return db.get(Profile, identities[authorization])


async def required_user(authorization: str | None = Header(None)):
    user = await optional_user(authorization)
    if user is None:
        raise HTTPException(401, "Sign in required")
    return user


app = FastAPI()
app.include_router(inspire.router, prefix="/api/v1/inspire")
app.include_router(share.router, prefix="/api/v1/share")
app.include_router(dashboard.router, prefix="/api/v1/dashboard")
app.dependency_overrides[inspire.get_db] = database
app.dependency_overrides[inspire.optional_user] = optional_user
app.dependency_overrides[inspire.get_current_active_user] = required_user

objects = {}
tokens = {}
bucket = Mock()
bucket.upload.side_effect = lambda path, file, **kwargs: objects.update({path: file})
bucket.remove.side_effect = lambda paths: [objects.pop(path, None) for path in paths]
sock = socket.socket()
sock.bind(("127.0.0.1", 0))
port = sock.getsockname()[1]


def signed(path, expires):
    token = uuid.uuid4().hex
    tokens[token] = path
    return {"signedURL": f"http://127.0.0.1:{port}/fixture-object/{token}"}


bucket.create_signed_url.side_effect = signed
bucket.get_public_url.side_effect = lambda path: signed(path, 300)["signedURL"]
supabase_service.get_storage_bucket = lambda *args, **kwargs: bucket


async def private_bucket(name):
    return bucket


inspire_storage.private_bucket = private_bucket


@app.get("/fixture-object/{token}")
async def fixture_object(token: str):
    path = tokens.get(token)
    if path not in objects:
        raise HTTPException(404)
    return Response(objects[path], media_type="application/pdf")


if __name__ == "__main__":
    print(f"FIXTURE_PORT={port}", flush=True)
    uvicorn.Server(uvicorn.Config(app, log_level="error")).run(sockets=[sock])
