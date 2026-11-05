"""Auth request contracts, without contacting Supabase or the database."""

import unittest
import uuid
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import httpx
from fastapi import FastAPI
from sqlalchemy import MetaData, Uuid, create_engine, event, inspect
from sqlalchemy.orm import Session, registry

from app.routes import auth
from app.models import Profile


class AuthFlowTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.db = SimpleNamespace(commit=AsyncMock(), refresh=AsyncMock())
        self.app = FastAPI()
        self.app.include_router(auth.router, prefix="/auth")

        async def database():
            yield self.db

        self.app.dependency_overrides[auth.get_db] = database
        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=self.app), base_url="http://test"
        )
        self.profile = SimpleNamespace(
            id=uuid.uuid4(), username="student", email="student@example.com",
            full_name="Test Student", role="student", is_active=True,
            created_at=datetime(2026, 1, 1), updated_at=None, gender=None,
            birthday=datetime(2006, 1, 1), school_id="S123", avatar_url=None,
            last_login=None,
        )
        self.user = SimpleNamespace(
            id=str(self.profile.id), email=self.profile.email,
            email_confirmed_at=datetime(2026, 1, 1), user_metadata={},
        )

    async def asyncTearDown(self):
        await self.client.aclose()

    async def test_username_is_rejected_by_email_contract(self):
        response = await self.client.post(
            "/auth/login", json={"email": "student", "password": "password"}
        )
        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["detail"][0]["loc"], ["body", "email"])

    async def test_email_login_succeeds(self):
        with patch.object(auth.auth_service, "sign_in", AsyncMock(return_value=self.user)), \
             patch.object(auth.profile_service, "ensure_profile_exists", AsyncMock(return_value=self.profile)):
            response = await self.client.post(
                "/auth/login", json={"email": self.user.email, "password": "password"}
            )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["access_token"])

    async def test_invalid_credentials_return_401(self):
        with patch.object(auth.auth_service, "sign_in", AsyncMock(side_effect=ValueError("Invalid credentials"))):
            response = await self.client.post(
                "/auth/login", json={"email": self.user.email, "password": "wrong"}
            )
        self.assertEqual(response.status_code, 401)

    async def test_oauth_requires_authorization_header(self):
        response = await self.client.post("/auth/callback", json={"provider": "google"})
        self.assertEqual(response.status_code, 401)

    async def test_oauth_exchanges_supabase_token_for_api_tokens(self):
        self.profile.school_id = None
        with patch.object(auth.auth_service, "get_user", AsyncMock(return_value=self.user)) as get_user, \
             patch.object(auth.profile_service, "ensure_profile_exists", AsyncMock(return_value=self.profile)):
            response = await self.client.post(
                "/auth/callback", json={"provider": "google"},
                headers={"Authorization": "Bearer supabase-token"},
            )
        get_user.assert_awaited_once_with("supabase-token")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["profile_complete"])
        self.assertTrue(response.json()["access_token"])

    async def test_complete_profile_uses_header_and_saves_date(self):
        with patch.object(auth.auth_service, "get_user", AsyncMock(return_value=self.user)), \
             patch.object(auth.profile_service, "get_by_id", AsyncMock(return_value=self.profile)), \
             patch.object(auth.profile_service, "get_by_username", AsyncMock(return_value=None)):
            response = await self.client.post(
                "/auth/complete-profile",
                headers={"Authorization": "Bearer supabase-token"},
                json={"display_name": "newname", "birthday": "2006-06-15"},
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.profile.username, "newname")
        self.assertEqual(self.profile.birthday, datetime(2006, 6, 15))

    async def test_oauth_refreshes_database_generated_fields_before_response(self):
        # Use real ORM expiration, with SQLite so this needs no external database.
        engine = create_engine("sqlite://")
        table = Profile.__table__.to_metadata(MetaData())
        table.c.id.type = Uuid()
        table.create(engine)
        mapper_registry = registry()

        class TestProfile:
            pass

        mapper_registry.map_imperatively(TestProfile, table)
        with Session(engine, expire_on_commit=False) as session:
            profile = TestProfile(
                id=self.profile.id, username="student", email=self.user.email,
                full_name="Test Student", school_id="S123",
                birthday=datetime(2006, 1, 1),
            )
            session.add(profile)
            session.commit()
            session.refresh(profile)
            explicit_io = False

            @event.listens_for(engine, "before_cursor_execute")
            def forbid_implicit_io(connection, cursor, statement, parameters, context, many):
                if not explicit_io:
                    raise AssertionError("Response triggered implicit database IO")

            async def commit():
                nonlocal explicit_io
                explicit_io = True
                try:
                    session.commit()
                    # SQL onupdate expires updated_at even with expire_on_commit=False.
                    self.assertIn("updated_at", inspect(profile).expired_attributes)
                finally:
                    explicit_io = False

            async def refresh(instance):
                nonlocal explicit_io
                explicit_io = True
                try:
                    session.refresh(instance)
                finally:
                    explicit_io = False

            self.db.commit.side_effect = commit
            self.db.refresh.side_effect = refresh
            try:
                with patch.object(auth.auth_service, "get_user", AsyncMock(return_value=self.user)), \
                     patch.object(auth.profile_service, "ensure_profile_exists", AsyncMock(return_value=profile)):
                    response = await self.client.post(
                        "/auth/callback", json={"provider": "google"},
                        headers={"Authorization": "Bearer supabase-token"},
                    )
                self.assertEqual(response.status_code, 200)
                self.assertIsNotNone(response.json()["user"]["updated_at"])
            finally:
                event.remove(engine, "before_cursor_execute", forbid_implicit_io)
        engine.dispose()
        mapper_registry.dispose()


if __name__ == "__main__":
    unittest.main()
