import unittest, uuid
from types import SimpleNamespace
from unittest.mock import Mock, patch
from datetime import datetime, timezone, timedelta
import httpx
from fastapi import FastAPI
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from app.models import (
    Profile,
    UserRole,
    AccountAction,
    VerificationAction,
    ApiSession,
    ModerationAction,
    ContactMessage,
)
from app.routes import super_admin, users, auth, tracking
from app.routes.auth import get_current_user
from app.services import accounts
from test_share_flow import LocalAsyncSession


class AccountSession(LocalAsyncSession):
    async def scalars(self, q):
        return self.session.scalars(q)

    async def flush(self):
        self.session.flush()

    async def refresh(self, row):
        self.session.refresh(row)


class AccountFlowTests(unittest.IsolatedAsyncioTestCase):
    async def test_statistics_scan_profiles_once_and_handle_empty_tables(self):
        statements = []

        def capture(conn, cursor, statement, parameters, context, many):
            statements.append(statement.lower())

        event.listen(self.engine, "before_cursor_execute", capture)
        try:
            result = await accounts.statistics(AccountSession(self.session))
            self.assertEqual(
                result,
                dict(
                    total=3,
                    verified=0,
                    unverified=3,
                    administrators=1,
                    superadministrators=1,
                    suspended=0,
                ),
            )
            self.assertEqual(len(statements), 1)
            self.assertEqual(statements[0].count("from profiles"), 1)
            self.session.query(Profile).delete(synchronize_session=False)
            self.session.commit()
            empty = await accounts.statistics(AccountSession(self.session))
            self.assertTrue(all(value == 0 for value in empty.values()))
        finally:
            event.remove(self.engine, "before_cursor_execute", capture)

    async def asyncSetUp(self):
        self.engine = create_engine("sqlite://")
        for model in [
            Profile,
            AccountAction,
            VerificationAction,
            ApiSession,
            ContactMessage,
            ModerationAction,
        ]:
            model.__table__.create(self.engine)
        self.session = Session(self.engine, expire_on_commit=False)
        self.super = Profile(
            id=uuid.uuid4(),
            username="super",
            email="super@example.com",
            role=UserRole.SUPER_ADMIN,
        )
        self.student = Profile(
            id=uuid.uuid4(),
            username="student",
            email="student@example.com",
            school_id="S123",
        )
        self.admin = Profile(
            id=uuid.uuid4(),
            username="admin",
            email="admin@example.com",
            role=UserRole.ADMIN,
        )
        self.session.add_all([self.super, self.student, self.admin])
        self.session.commit()
        self.current = self.super
        self.app = FastAPI()
        self.app.include_router(super_admin.router, prefix="/super")
        self.app.include_router(users.router, prefix="/users")
        self.app.include_router(auth.router, prefix="/auth")
        self.app.include_router(tracking.router, prefix="/tracking")

        async def database():
            try:
                yield AccountSession(self.session)
            except Exception:
                self.session.rollback()
                raise

        self.app.dependency_overrides[super_admin.get_db] = database
        self.app.dependency_overrides[get_current_user] = lambda: self.current
        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=self.app, raise_app_exceptions=False),
            base_url="http://test",
        )
        self.sdk = Mock()
        self.patch = patch.object(accounts, "auth_admin", return_value=self.sdk)
        self.patch.start()

    async def asyncTearDown(self):
        self.patch.stop()
        await self.client.aclose()
        self.session.close()
        self.engine.dispose()

    async def test_school_id_is_required_for_creation_and_cannot_be_cleared(self):
        values = {
            "request_id": str(uuid.uuid4()),
            "email": "new@example.com",
            "username": "newuser",
            "full_name": "New Student",
        }
        for data in [
            values,
            {**values, "school_id": None},
            {**values, "school_id": "   "},
        ]:
            response = await self.client.post("/super/users/invite", json=data)
            self.assertEqual(response.status_code, 422, response.text)
        self.sdk.invite_user_by_email.assert_not_called()
        for value in [None, "", "   "]:
            response = await self.client.patch(
                f"/super/users/{self.student.id}",
                json={"school_id": value, "reason": "Update"},
            )
            self.assertEqual(response.status_code, 422, response.text)
        self.assertEqual(self.student.school_id, "S123")

    async def test_available_assignees_return_valid_verification_booleans(self):
        response = await self.client.get("/tracking/admin/assignees")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(
            {item["role"] for item in response.json()}, {"admin", "super_admin"}
        )
        self.assertTrue(all(item["is_verified"] is False for item in response.json()))
        for path in [
            "/tracking/admin/users",
            f"/tracking/admin/users/{self.student.id}",
        ]:
            response = await self.client.get(path)
            self.assertEqual(response.status_code, 200, response.text)
        self.current = self.student
        self.assertEqual(
            (await self.client.get("/tracking/admin/assignees")).status_code, 403
        )

    async def test_admin_and_student_cannot_manage_users_or_read_restricted_notes(self):
        for person in [self.admin, self.student]:
            self.current = person
            for path in [
                "/super/stats",
                "/super/users",
                "/super/audit",
                f"/super/users/{self.student.id}",
            ]:
                self.assertEqual((await self.client.get(path)).status_code, 403)
            response = await self.client.post(
                f"/super/users/{self.student.id}/verification",
                json={
                    "is_verified": True,
                    "institutional_review_completed": True,
                    "notes": "Attempt",
                },
            )
            self.assertEqual(response.status_code, 403)
        self.sdk.update_user_by_id.assert_not_called()

    async def test_user_search_role_verification_and_active_filters_are_paginated(self):
        response = await self.client.get(
            "/super/users?role=student&verified=false&active=true&search=S123&limit=1"
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["total"], 1)
        self.assertEqual(response.json()["items"][0]["id"], str(self.student.id))
        stats = (await self.client.get("/super/stats")).json()
        self.assertEqual(
            stats,
            {
                "total": 3,
                "verified": 0,
                "unverified": 3,
                "administrators": 1,
                "superadministrators": 1,
                "suspended": 0,
            },
        )
        self.assertEqual(
            (await self.client.get("/super/users?limit=0")).status_code, 422
        )
        self.assertEqual(
            (await self.client.get("/super/users?role=owner")).status_code, 422
        )

    async def test_verification_requires_institutional_check_and_never_changes_permissions(
        self,
    ):
        path = f"/super/users/{self.student.id}/verification"
        self.assertEqual(
            (
                await self.client.post(
                    path, json={"is_verified": True, "notes": "School ID exists"}
                )
            ).status_code,
            422,
        )
        response = await self.client.post(
            path,
            json={
                "is_verified": True,
                "institutional_review_completed": True,
                "notes": "Checked authorized institutional records",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["role"], "student")
        self.assertTrue(response.json()["is_active"])
        self.assertTrue(response.json()["is_verified"])
        self.assertEqual(self.student.verified_by, self.super.id)
        self.assertEqual(self.session.query(VerificationAction).count(), 1)
        self.current = self.student
        self.student._email_verified = True
        profile = (await self.client.get("/auth/me")).json()
        self.assertTrue(profile["is_verified"])
        self.assertTrue(profile["email_verified"])
        self.current = self.super
        await self.client.post(
            path, json={"is_verified": False, "notes": "Review withdrawn"}
        )
        self.assertFalse(self.student.is_verified)
        self.assertIsNone(self.student.verified_at)
        self.current = self.student
        profile = (await self.client.get("/auth/me")).json()
        self.assertFalse(profile["is_verified"])
        self.assertTrue(profile["email_verified"])

    async def test_last_superadministrator_and_legacy_paths_are_protected(self):
        response = await self.client.patch(
            f"/super/users/{self.super.id}",
            json={"role": "student", "reason": "Change"},
        )
        self.assertEqual(response.status_code, 409, response.text)
        self.assertEqual(
            (
                await self.client.post(
                    f"/super/users/{self.super.id}/status",
                    json={"is_active": False, "reason": "Disable"},
                )
            ).status_code,
            409,
        )
        self.assertEqual(
            (await self.client.delete(f"/users/admin/{self.super.id}")).status_code, 409
        )
        self.assertEqual(
            (
                await self.client.patch(
                    f"/users/admin/{self.student.id}", json={"is_active": False}
                )
            ).status_code,
            422,
        )

    async def test_promotion_and_revocation_are_audited_and_revoke_sessions(self):
        api = ApiSession(
            id=uuid.uuid4(),
            user_id=self.student.id,
            refresh_hash="a" * 64,
            expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        )
        self.session.add(api)
        self.session.commit()
        response = await self.client.patch(
            f"/super/users/{self.student.id}",
            json={"role": "admin", "reason": "Authorized administrator appointment"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.student.role, UserRole.ADMIN)
        self.session.refresh(api)
        self.assertIsNotNone(api.revoked_at)
        await self.client.patch(
            f"/super/users/{self.student.id}",
            json={"role": "student", "reason": "Appointment ended"},
        )
        self.assertEqual(self.session.query(AccountAction).count(), 2)
        self.sdk.update_user_by_id.assert_not_called()

    async def test_suspension_fails_closed_and_retry_synchronizes_current_state(self):
        self.sdk.update_user_by_id.side_effect = RuntimeError("Auth unavailable")
        response = await self.client.post(
            f"/super/users/{self.student.id}/status",
            json={"is_active": False, "reason": "Account review"},
        )
        self.assertEqual(response.status_code, 503, response.text)
        self.assertFalse(self.student.is_active)
        action = self.session.query(AccountAction).one()
        self.assertEqual(action.status, "failed")
        self.current = self.student
        self.assertEqual((await self.client.get("/auth/me")).status_code, 400)
        self.current = self.super
        self.sdk.update_user_by_id.side_effect = None
        response = await self.client.post(f"/super/actions/{action.id}/retry")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(action.status, "applied")
        self.assertEqual(
            self.sdk.update_user_by_id.call_args.args[1]["ban_duration"], "876000h"
        )
        response = await self.client.post(
            f"/super/users/{self.student.id}/status",
            json={"is_active": True, "reason": "Review completed"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertTrue(self.student.is_active)
        self.assertEqual(
            self.sdk.update_user_by_id.call_args.args[1]["ban_duration"], "none"
        )

    async def test_failed_restore_keeps_account_disabled(self):
        self.student.is_active = False
        self.session.commit()
        self.sdk.update_user_by_id.side_effect = RuntimeError("Unavailable")
        response = await self.client.post(
            f"/super/users/{self.student.id}/status",
            json={"is_active": True, "reason": "Restore"},
        )
        self.assertEqual(response.status_code, 503)
        self.assertFalse(self.student.is_active)

    async def test_invitation_uses_admin_sdk_and_request_reference_prevents_repeat_mail(
        self,
    ):
        identity = uuid.uuid4()
        self.sdk.invite_user_by_email.return_value = SimpleNamespace(
            user=SimpleNamespace(id=str(identity))
        )
        body = {
            "request_id": str(uuid.uuid4()),
            "email": "new@example.com",
            "username": "new",
            "full_name": "New Student",
            "school_id": "S2",
        }
        response = await self.client.post("/super/users/invite", json=body)
        self.assertEqual(response.status_code, 201, response.text)
        self.assertFalse(response.json()["is_verified"])
        self.assertEqual(response.json()["role"], "student")
        self.assertEqual(response.json()["id"], str(identity))
        response = await self.client.post("/super/users/invite", json=body)
        self.assertEqual(response.status_code, 201, response.text)
        self.sdk.invite_user_by_email.assert_called_once()
        self.assertNotIn("password", response.text)
        self.assertNotIn("service_role", response.text)

    async def test_uncertain_invite_is_reconciled_without_resending(self):
        identity = uuid.uuid4()
        key = uuid.uuid4()
        self.sdk.invite_user_by_email.side_effect = TimeoutError()
        body = {
            "request_id": str(key),
            "email": "recover@example.com",
            "username": "recover",
            "full_name": "Recover Student",
            "school_id": "REC-123",
        }
        self.assertEqual(
            (await self.client.post("/super/users/invite", json=body)).status_code, 503
        )
        self.assertEqual(
            (await self.client.post("/super/users/invite", json=body)).status_code, 409
        )
        self.sdk.get_user_by_id.return_value = SimpleNamespace(
            user=SimpleNamespace(email="recover@example.com")
        )
        response = await self.client.post(
            f"/super/actions/{key}/recover-invitation",
            json={"auth_user_id": str(identity)},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["id"], str(identity))
        self.sdk.invite_user_by_email.assert_called_once()

    async def test_profile_edits_sync_metadata_and_do_not_allow_email_or_password_changes(
        self,
    ):
        response = await self.client.patch(
            f"/super/users/{self.student.id}",
            json={"full_name": "Updated Name", "reason": "Corrected record"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(
            self.sdk.update_user_by_id.call_args.args[1]["user_metadata"]["full_name"],
            "Updated Name",
        )
        self.assertEqual(
            (
                await self.client.patch(
                    f"/super/users/{self.student.id}",
                    json={"email": "other@example.com", "reason": "Change"},
                )
            ).status_code,
            422,
        )
        self.assertEqual(
            (
                await self.client.patch(
                    f"/super/users/{self.student.id}",
                    json={"password": "secret", "reason": "Change"},
                )
            ).status_code,
            422,
        )
