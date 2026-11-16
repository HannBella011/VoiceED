"""Whole-router integration with real API sessions and per-request DB sessions.

Default: isolated SQLite. Opt-in VOICEED_LIVE_INTEGRATION=1 additionally runs
against configured PostgreSQL, with all writes enclosed in a rollback transaction.
Auth Admin calls are mocked: existing accounts are never remotely banned/emailed.
"""

import os
import asyncio
import json
import socket
from pathlib import Path
import unittest
import uuid
from datetime import date
from contextlib import asynccontextmanager
from unittest.mock import Mock, patch

import httpx
from fastapi import FastAPI
from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool
from app.database import Base, get_db
from app.models import (
    Profile,
    UserRole,
    Report,
    InspireStory,
    ApiSession,
    SharedMaterial,
    InspireAttachment,
)
from app.routes import api_router
from app.services import auth_service, accounts
from app.settings import settings
from test_share_flow import LocalAsyncSession


class IntegrationSession(LocalAsyncSession):
    @asynccontextmanager
    async def begin_nested(self):
        if not self.session.connection().connection.driver_connection.in_transaction:
            self.session.connection().exec_driver_sql("BEGIN")
        with self.session.begin_nested():
            yield

    async def scalars(self, query):
        return self.session.scalars(query)

    async def flush(self):
        self.session.flush()

    async def refresh(self, row):
        self.session.refresh(row)


class ApplicationIntegrationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.engine = create_engine("sqlite://")
        for table in Base.metadata.sorted_tables:
            table.create(self.engine)
        with Session(self.engine) as db:
            self.identities = {}
            for label, role in [
                ("student", UserRole.STUDENT),
                ("admin", UserRole.ADMIN),
                ("super", UserRole.SUPER_ADMIN),
            ]:
                identity = uuid.uuid4()
                db.add(
                    Profile(
                        id=identity,
                        username=label,
                        email=f"{label}@example.com",
                        role=role,
                    )
                )
                self.identities[label] = identity
            db.commit()

        async def database():
            with Session(self.engine, expire_on_commit=False) as session:
                try:
                    yield IntegrationSession(session)
                except Exception:
                    session.rollback()
                    raise

        self.database = database
        await self.start_application()

    async def start_application(self):
        self.app = FastAPI()
        self.app.include_router(api_router, prefix="/api/v1")
        self.app.dependency_overrides[get_db] = self.database
        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=self.app), base_url="https://test/api/v1/"
        )
        self.remote = Mock()
        self.sdk_patch = patch.object(accounts, "auth_admin", return_value=self.remote)
        self.sdk_patch.start()
        self.prefix = "Integration-" + uuid.uuid4().hex
        self.tokens = {label: await self.issue(label) for label in self.identities}

    async def issue(self, label):
        async for db in self.database():
            profile = await db.scalar(
                select(Profile).where(Profile.id == self.identities[label])
            )
            access, _ = await auth_service.issue_api_session(
                db, profile, email_verified=True
            )
            return access

    async def request(self, method, path, label=None, expected=200, **kwargs):
        headers = kwargs.pop("headers", {})
        if label:
            headers["Authorization"] = "Bearer " + self.tokens[label]
        response = await self.client.request(method, path, headers=headers, **kwargs)
        self.assertEqual(response.status_code, expected, response.text)
        return response.json()

    async def asyncTearDown(self):
        self.sdk_patch.stop()
        await self.client.aclose()
        self.engine.dispose()

    async def test_content_persistence_social_pagination_moderation_and_dashboard(self):
        day = date.today().isoformat()
        baseline = await self.request("GET", f"dashboard?day={day}", "student")
        document = {
            "version": 1,
            "blocks": [
                {
                    "type": "paragraph",
                    "children": [
                        {"text": "Persist bold 😀", "marks": ["bold", "italic"]}
                    ],
                },
                {
                    "type": "bulleted_list",
                    "children": [{"text": "List item", "marks": ["underline"]}],
                },
            ],
        }
        post = await self.request(
            "POST",
            "inspire/stories",
            "student",
            expected=201,
            json={"title": self.prefix, "body": document},
        )
        endpoint = f"inspire/stories/{post['record_id']}"
        refreshed = await self.request("GET", endpoint)
        self.assertEqual(refreshed["body"], document)
        feed = await self.request(
            "GET", f"inspire/feed?envelope=true&limit=1&search={self.prefix}"
        )
        self.assertEqual(feed["total"], 1)
        self.assertEqual(len(feed["items"]), 1)
        for _ in range(2):
            reacted = await self.request("PUT", endpoint + "/reaction", "admin")
            self.assertEqual(reacted["likes"], 1)
        for number in range(3):
            await self.request(
                "POST",
                endpoint + "/comments",
                "admin",
                expected=201,
                json={"content": f"Comment {number}"},
            )
        first = await self.request("GET", endpoint + "/comments?envelope=true&limit=2")
        last = await self.request(
            "GET", endpoint + "/comments?envelope=true&limit=2&page=2"
        )
        self.assertEqual(first["total"], 3)
        self.assertEqual([len(first["items"]), len(last["items"])], [2, 1])
        self.assertFalse(
            set(item["id"] for item in first["items"])
            & set(item["id"] for item in last["items"])
        )
        await self.request(
            "POST",
            endpoint + "/shares",
            "student",
            expected=201,
            json={"method": "copy"},
        )
        summary = await self.request("GET", f"dashboard?day={day}", "student")
        self.assertEqual(summary["stories"], baseline["stories"] + 1)
        self.assertEqual(
            summary["reactions_received"], baseline["reactions_received"] + 1
        )
        await self.request("GET", "admin/stats", "student", expected=403)
        await self.request(
            "POST",
            f"admin/content/story/{post['record_id']}/remove",
            "admin",
            json={
                "reason": self.prefix + " policy reason",
                "internal_notes": "Private integration note",
            },
        )
        await self.request("GET", endpoint, expected=404)
        inbox = await self.request("GET", "messages", "student")
        notice = next(item for item in inbox if self.prefix in item["message"])
        self.assertNotIn("Private integration note", notice["message"])
        review = await self.request(
            "GET", f"admin/content/story/{post['record_id']}", "admin"
        )
        self.assertIn("Private integration note", str(review))
        final = await self.request("GET", f"dashboard?day={day}", "student")
        self.assertEqual(final["stories"], baseline["stories"])

    async def test_verification_roles_sessions_and_suspension_across_requests(self):
        identity = str(self.identities["student"])
        verify = f"super/users/{identity}/verification"
        await self.request(
            "POST",
            verify,
            "super",
            json={
                "is_verified": True,
                "institutional_review_completed": True,
                "notes": self.prefix,
            },
        )
        profile = await self.request("GET", "auth/me", "student")
        self.assertTrue(profile["is_verified"])
        self.assertTrue(profile["email_verified"])
        self.assertEqual(profile["role"], "student")
        await self.request("GET", "admin/stats", "student", expected=403)
        await self.request(
            "PATCH",
            f"super/users/{identity}",
            "super",
            json={"role": "admin", "reason": self.prefix},
        )
        await self.request("GET", "auth/me", "student", expected=401)
        self.tokens["student"] = await self.issue("student")
        await self.request("GET", "admin/stats", "student")
        await self.request("GET", "super/users", "student", expected=403)
        await self.request(
            "POST",
            f"super/users/{identity}/status",
            "super",
            json={"is_active": False, "reason": self.prefix},
        )
        await self.request("GET", "auth/me", "student", expected=401)
        await self.request(
            "POST",
            f"super/users/{identity}/status",
            "super",
            json={"is_active": True, "reason": self.prefix},
        )
        await self.request("GET", "auth/me", "student", expected=401)
        self.tokens["student"] = await self.issue("student")
        current = await self.request("GET", "auth/me", "student")
        self.assertTrue(current["is_verified"])
        self.assertEqual(current["role"], "admin")
        audit = await self.request("GET", f"super/audit?target_id={identity}", "super")
        self.assertTrue(
            {"verify", "update", "suspend", "restore"}
            <= {item["action"] for item in audit["items"]}
        )

    async def test_anonymous_reporting_receipt_retry_and_private_tracking(self):
        values = {
            "title": self.prefix,
            "description": "Integration report",
            "category": "other",
            "incident_date": "2026-01-01T12:00:00Z",
        }
        headers = {"Idempotency-Key": str(uuid.uuid4())}
        receipt = await self.request(
            "POST",
            "reports/submit/anonymous",
            expected=201,
            data=values,
            headers=headers,
        )
        duplicate = await self.request(
            "POST",
            "reports/submit/anonymous",
            expected=201,
            data=values,
            headers=headers,
        )
        self.assertEqual(receipt["id"], duplicate["id"])
        code = receipt["tracking_code"]
        public = await self.request("GET", f"tracking/track/{code}")
        self.assertTrue(public["access_required"])
        tracked = await self.request(
            "GET",
            f"tracking/track/{code}",
            headers={"X-Report-Access": receipt["tracking_access_token"]},
        )
        self.assertEqual(tracked["title"], self.prefix)
        self.assertNotIn("reporter_email", tracked)
        await self.request(
            "GET", f"reports/admin/reports/{receipt['id']}", "student", expected=403
        )
        detail = await self.request(
            "GET", f"reports/admin/reports/{receipt['id']}", "admin"
        )
        self.assertTrue(detail["is_anonymous"])


@unittest.skipUnless(
    os.getenv("VOICEED_LIVE_INTEGRATION") == "1",
    "Live PostgreSQL test is explicitly opt-in",
)
class LiveApplicationIntegrationTests(ApplicationIntegrationTests):
    async def asyncSetUp(self):
        self.engine = create_async_engine(
            settings.DATABASE_URL,
            poolclass=NullPool,
            hide_parameters=True,
            connect_args={"timeout": 10, "command_timeout": 20},
        )
        self.connection = await self.engine.connect()
        self.outer = await self.connection.begin()
        self.addAsyncCleanup(self.rollback_database)
        identities = [
            ("student", UserRole.STUDENT),
            ("admin", UserRole.ADMIN),
            ("super", UserRole.SUPER_ADMIN),
        ]
        if self._testMethodName.startswith("test_live_"):
            identities = [
                (label, role) for label, role in identities if label != "student"
            ]
        self.identities = {}
        self.original_profiles = {}
        async with AsyncSession(
            bind=self.connection,
            join_transaction_mode="create_savepoint",
            expire_on_commit=False,
        ) as db:
            for label, role in identities:
                email = (
                    os.environ[f"VOICEED_TEST_{label.upper()}_EMAIL"].strip().lower()
                )
                profile = await db.scalar(
                    select(Profile).where(func.lower(Profile.email) == email)
                )
                self.assertIsNotNone(
                    profile, "Approved test account not found: " + label
                )
                self.assertEqual(
                    profile.role, role, "Unexpected role for approved account: " + label
                )
                self.assertTrue(profile.is_active)
                self.identities[label] = profile.id
                self.original_profiles[profile.id] = (
                    profile.role,
                    profile.is_active,
                    profile.is_verified,
                    profile.verified_at,
                    profile.verified_by,
                )

        async def database():
            async with AsyncSession(
                bind=self.connection,
                join_transaction_mode="create_savepoint",
                expire_on_commit=False,
            ) as db:
                yield db

        self.database = database
        await self.start_application()

    async def rollback_database(self):
        try:
            await self.outer.rollback()
            if hasattr(self, "prefix"):
                for model in (Report, InspireStory):
                    self.assertIsNone(
                        await self.connection.scalar(
                            select(model.id).where(model.title == self.prefix)
                        )
                    )
                for token in self.tokens.values():
                    identity = uuid.UUID(auth_service.decode_token(token)["sid"])
                    self.assertIsNone(
                        await self.connection.scalar(
                            select(ApiSession.id).where(ApiSession.id == identity)
                        )
                    )
            for identity, original in self.original_profiles.items():
                current = (
                    await self.connection.execute(
                        select(
                            Profile.role,
                            Profile.is_active,
                            Profile.is_verified,
                            Profile.verified_at,
                            Profile.verified_by,
                        ).where(Profile.id == identity)
                    )
                ).one()
                self.assertEqual(
                    tuple(current), original, "Test account state did not roll back"
                )
        finally:
            await self.connection.close()
            await self.engine.dispose()

    async def test_live_administrator_and_superadministrator_read_views(self):
        await self.request("GET", "auth/me", "admin")
        await self.request("GET", "admin/stats", "admin")
        await self.request("GET", "admin/content?page=1&limit=1", "admin")
        await self.request("GET", "reports/admin/reports?page=1&limit=1", "admin")
        await self.request("GET", "super/stats", "super")
        users = await self.request(
            "GET", "super/users?page=1&limit=1&sort=name", "super"
        )
        self.assertLessEqual(len(users["items"]), 1)
        await self.request("GET", "super/audit?limit=1", "super")
        await self.request("GET", "super/moderation?limit=1", "super")
        await self.request("GET", "super/users?limit=1", "admin", expected=403)

    async def test_live_anonymous_reporting_and_administrator_review(self):
        values = {
            "title": self.prefix,
            "description": "Disposable live integration report",
            "category": "other",
            "incident_date": "2026-01-01T12:00:00Z",
        }
        receipt = await self.request(
            "POST",
            "reports/submit/anonymous",
            expected=201,
            data=values,
            headers={"Idempotency-Key": str(uuid.uuid4())},
        )
        tracked = await self.request(
            "GET",
            f"tracking/track/{receipt['tracking_code']}",
            headers={"X-Report-Access": receipt["tracking_access_token"]},
        )
        self.assertEqual(tracked["title"], self.prefix)
        detail = await self.request(
            "GET", f"reports/admin/reports/{receipt['id']}", "admin"
        )
        self.assertTrue(detail["is_anonymous"])
        self.assertIsNone(detail["user_id"])

    async def test_live_frontend_services_over_http(self):
        import uvicorn

        async for db in self.database():
            db.add(
                SharedMaterial(
                    title=self.prefix,
                    description="Disposable test resource",
                    subject="Integration",
                    file_url="https://example.com/integration.pdf",
                    file_type="application/pdf",
                    user_id=self.identities["admin"],
                )
            )
            await db.commit()
        sock = socket.socket()
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
        server = uvicorn.Server(
            uvicorn.Config(self.app, log_level="error", lifespan="off")
        )
        task = asyncio.create_task(server.serve(sockets=[sock]))
        process = None
        try:
            for _ in range(100):
                if server.started:
                    break
                await asyncio.sleep(0.02)
            self.assertTrue(server.started)
            process = await asyncio.create_subprocess_exec(
                "node",
                str(Path(__file__).with_name("live_service_client.cjs")),
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            data = {
                "api": f"http://127.0.0.1:{port}/api/v1",
                "prefix": self.prefix,
                **self.tokens,
            }
            output, errors = await asyncio.wait_for(
                process.communicate(json.dumps(data).encode()), timeout=120
            )
            self.assertEqual(process.returncode, 0, errors.decode())
            self.assertIn(b"configured PostgreSQL passed", output)
        finally:
            if process and process.returncode is None:
                process.kill()
                await process.wait()
            server.should_exit = True
            await asyncio.wait_for(task, timeout=10)
            sock.close()

    async def test_live_private_attachment_upload_and_download(self):
        from starlette.concurrency import run_in_threadpool
        from app.services import supabase_service

        filename = self.prefix + ".pdf"
        content = b"%PDF-1.7\nDisposable integration attachment"
        try:
            attachment = await self.request(
                "POST",
                "inspire/attachments",
                "admin",
                expected=201,
                files={"file": (filename, content, "application/pdf")},
            )
            post = await self.request(
                "POST",
                "inspire/stories",
                "admin",
                expected=201,
                json={
                    "title": self.prefix,
                    "content": "Attachment test",
                    "attachment_ids": [attachment["id"]],
                },
            )
            loaded = await self.request("GET", f"inspire/stories/{post['record_id']}")
            self.assertEqual(loaded["attachments"][0]["filename"], filename)
            access = await self.request(
                "GET", f"inspire/attachments/{attachment['id']}/access"
            )
            async with httpx.AsyncClient(timeout=30) as client:
                downloaded = await client.get(access["url"])
            self.assertEqual(downloaded.status_code, 200)
            self.assertEqual(downloaded.content, content)
        finally:
            rows = (
                await self.connection.execute(
                    select(
                        InspireAttachment.storage_bucket, InspireAttachment.storage_path
                    ).where(
                        InspireAttachment.filename == filename,
                        InspireAttachment.user_id == self.identities["admin"],
                    )
                )
            ).all()
            for bucket, path in rows:
                await run_in_threadpool(
                    supabase_service.get_storage_bucket(bucket).remove, [path]
                )

    async def asyncTearDown(self):
        self.sdk_patch.stop()
        await self.client.aclose()
