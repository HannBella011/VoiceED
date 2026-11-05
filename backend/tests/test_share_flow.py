"""Exercise ShareED against an in-memory database and mocked file storage."""

import unittest
import uuid
from unittest.mock import Mock, patch

import httpx
from fastapi import FastAPI
from sqlalchemy import UUID, create_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import Session

from app.models import Profile, SharedMaterial
from app.routes import share
from app.services import supabase_service


@compiles(UUID, "sqlite")
def sqlite_uuid(element, compiler, **kwargs):
    return "CHAR(32)"


class LocalAsyncSession:
    """Use synchronous SQLite through the service's async session interface."""

    def __init__(self, session):
        self.session = session

    async def execute(self, query):
        return self.session.execute(query)

    async def scalar(self, query):
        return self.session.scalar(query)

    def add(self, value):
        self.session.add(value)

    async def commit(self):
        self.session.commit()

    async def rollback(self):
        self.session.rollback()

    async def delete(self, value):
        self.session.delete(value)


class ShareFlowTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.engine = create_engine("sqlite://")
        Profile.__table__.create(self.engine)
        SharedMaterial.__table__.create(self.engine)
        self.session = Session(self.engine, expire_on_commit=False)
        self.user = Profile(id=uuid.uuid4(), username="student", email="student@example.com")
        self.session.add(self.user)
        self.session.commit()
        self.app = FastAPI()
        self.app.include_router(share.router, prefix="/share")

        async def database():
            yield LocalAsyncSession(self.session)

        self.app.dependency_overrides[share.get_db] = database
        self.app.dependency_overrides[share.get_current_active_user] = lambda: self.user
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app), base_url="http://test")

    async def asyncTearDown(self):
        await self.client.aclose()
        self.session.close()
        self.engine.dispose()

    def material(self, anonymous=False):
        item = SharedMaterial(
            title="Database study notes", subject="CS101", description="Test notes",
            file_url="https://example.com/notes.pdf", file_type="application/pdf",
            user_id=self.user.id, is_anonymous=anonymous,
        )
        self.session.add(item)
        self.session.commit()
        return item

    async def test_empty_database_returns_no_demo_documents(self):
        response = await self.client.get("/share/materials")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    async def test_list_reads_database_and_preserves_anonymity(self):
        self.material(anonymous=True)
        response = await self.client.get("/share/materials")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["title"], "Database study notes")
        self.assertIsNone(response.json()[0]["user_id"])
        self.assertIsNone(response.json()[0]["uploader_name"])

    async def test_preview_does_not_increment_download_count(self):
        item = self.material()
        response = await self.client.get(f"/share/materials/{item.id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["download_count"], 0)
        response = await self.client.post(f"/share/materials/{item.id}/download")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["download_count"], 1)

    async def test_upload_persists_material_and_lists_it(self):
        bucket = Mock()
        bucket.get_public_url.return_value = "https://example.com/upload.pdf"
        with patch.object(supabase_service, "get_storage_bucket", return_value=bucket):
            response = await self.client.post(
                "/share/materials", data={"title": "Uploaded notes", "subject": "MATH101", "is_anonymous": "false"},
                files={"file": ("notes.pdf", b"%PDF-test", "application/pdf")},
            )
        self.assertEqual(response.status_code, 201)
        bucket.upload.assert_called_once()
        response = await self.client.get("/share/materials?subject=MATH101")
        self.assertEqual(response.json()[0]["title"], "Uploaded notes")
        self.assertEqual(response.json()[0]["uploader_name"], "student")

    async def test_unsupported_upload_is_rejected_without_storage_write(self):
        with patch.object(supabase_service, "get_storage_bucket") as storage:
            response = await self.client.post(
                "/share/materials", data={"title": "File", "subject": "CS101"},
                files={"file": ("script.html", b"<script></script>", "text/html")},
            )
        self.assertEqual(response.status_code, 400)
        storage.assert_not_called()

    async def test_pagination_is_validated(self):
        response = await self.client.get("/share/materials?page=0")
        self.assertEqual(response.status_code, 422)
