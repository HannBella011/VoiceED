"""Real local transactions for administrator permissions, removal and author inbox."""

import unittest
import uuid
from unittest.mock import patch, AsyncMock, Mock
from datetime import datetime, timezone, timedelta
import httpx
from fastapi import FastAPI
from sqlalchemy import create_engine, select, event
from sqlalchemy.orm import Session
from app.models import (
    Profile,
    Report,
    ReportCategory,
    ReportStatus,
    UserRole,
    SharedMaterial,
    InspireStory,
    InspireQuote,
    InspireReaction,
    InspireComment,
    InspireShare,
    InspireAttachment,
    ModerationAction,
    ContactMessage,
    ReportAttachment,
    ReportTimeline,
    ReportTimelineAttachment,
)
from app.routes import admin, inspire, share, messages, reports, users
from app.routes.auth import get_current_user
from app.services import moderation, report_service
from test_share_flow import LocalAsyncSession


class ModerationSession(LocalAsyncSession):
    async def scalars(self, query):
        return self.session.scalars(query)

    async def flush(self):
        self.session.flush()

    async def refresh(self, row):
        self.session.refresh(row)


class ModerationFlowTests(unittest.IsolatedAsyncioTestCase):
    async def test_personal_report_pages_break_timestamp_ties_by_id(self):
        timestamp = datetime.now(timezone.utc)
        reports = [
            Report(
                tracking_code=f"VED-PAGE-{index:04d}",
                title="Same time",
                description="Report",
                category=ReportCategory.OTHER,
                user_id=self.owner.id,
                created_at=timestamp,
            )
            for index in range(3)
        ]
        self.session.add_all(reports)
        self.session.commit()
        first, total = await report_service.get_user_reports(
            ModerationSession(self.session), self.owner.id, page=1, limit=2
        )
        second, _ = await report_service.get_user_reports(
            ModerationSession(self.session), self.owner.id, page=2, limit=2
        )
        self.assertEqual(total, 3)
        self.assertEqual(
            [row.id for row in first + second],
            sorted([row.id for row in reports], reverse=True),
        )

    async def test_platform_statistics_scan_each_source_once_including_empty_sources(
        self,
    ):
        statements = []

        def capture(conn, cursor, statement, parameters, context, many):
            statements.append(statement.lower())

        event.listen(self.engine, "before_cursor_execute", capture)
        try:
            empty = await moderation.statistics(ModerationSession(self.session))
            self.assertTrue(all(value == 0 for value in empty["content"].values()))
            self.assertEqual(empty["moderation"]["removed_content"], 0)
            self.assertEqual(len(statements), 2)
            for table in [
                "shared_materials",
                "inspire_stories",
                "inspire_quotes",
                "inspire_comments",
                "moderation_actions",
            ]:
                self.assertEqual(statements[0].count("from " + table), 1, statements[0])
        finally:
            event.remove(self.engine, "before_cursor_execute", capture)
        story = self.content("story")
        story.removed_at = datetime.now(timezone.utc)
        self.session.commit()
        values = await moderation.statistics(ModerationSession(self.session))
        self.assertEqual(values["content"]["stories"], 1)
        self.assertEqual(values["moderation"]["removed_content"], 1)

    async def asyncSetUp(self):
        self.engine = create_engine("sqlite://")
        for model in [
            Profile,
            Report,
            SharedMaterial,
            InspireStory,
            InspireQuote,
            InspireReaction,
            InspireComment,
            InspireShare,
            InspireAttachment,
            ContactMessage,
            ModerationAction,
            ReportAttachment,
            ReportTimeline,
            ReportTimelineAttachment,
        ]:
            model.__table__.create(self.engine)
        self.session = Session(self.engine, expire_on_commit=False)
        self.owner = Profile(
            id=uuid.uuid4(), username="owner", email="owner@example.test"
        )
        self.other = Profile(
            id=uuid.uuid4(), username="other", email="other@example.test"
        )
        self.admin = Profile(
            id=uuid.uuid4(),
            username="administrator",
            email="admin@example.test",
            role=UserRole.ADMIN,
        )
        self.session.add_all([self.owner, self.other, self.admin])
        self.session.commit()
        self.current = self.admin
        self.app = FastAPI()
        for module, prefix in [
            (admin, "/admin"),
            (inspire, "/inspire"),
            (share, "/share"),
            (messages, "/messages"),
            (reports, "/reports"),
            (users, "/users"),
        ]:
            self.app.include_router(module.router, prefix=prefix)

        async def database():
            try:
                yield ModerationSession(self.session)
            except Exception:
                self.session.rollback()
                raise

        self.app.dependency_overrides[admin.get_db] = database
        self.app.dependency_overrides[get_current_user] = lambda: self.current
        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=self.app, raise_app_exceptions=False),
            base_url="http://test",
        )

    async def asyncTearDown(self):
        await self.client.aclose()
        self.session.close()
        self.engine.dispose()

    def content(self, kind, owner=True):
        user_id = self.owner.id if owner else None
        if kind == "story":
            row = InspireStory(
                user_id=user_id,
                title="Original story",
                content="Story text",
                is_anonymous=True,
            )
        elif kind == "quote":
            row = InspireQuote(user_id=user_id, quote="Original quote")
        elif kind == "resource":
            row = SharedMaterial(
                user_id=user_id,
                title="Original resource",
                subject="CS101",
                description="Resource text",
                file_url="https://example.test/file.pdf",
                file_type="application/pdf",
            )
        else:
            parent = self.content("story")
            row = InspireComment(
                user_id=user_id, story_id=parent.id, content="Original comment"
            )
        self.session.add(row)
        self.session.commit()
        return row

    async def test_all_moderation_routes_require_admin_and_cannot_assign_roles(self):
        row = self.content("story")
        self.current = self.owner
        for method, path, data in [
            ("GET", "/admin/stats", None),
            ("GET", "/admin/content", None),
            ("GET", "/admin/audit", None),
            ("GET", f"/admin/content/story/{row.id}", None),
            ("POST", f"/admin/content/story/{row.id}/remove", {"reason": "Reason"}),
            ("GET", "/admin/attachments/1/access", None),
        ]:
            response = await self.client.request(method, path, json=data)
            self.assertEqual(response.status_code, 403, response.text)
        self.current = self.admin
        response = await self.client.patch(
            f"/users/admin/{self.owner.id}", json={"role": "admin"}
        )
        self.assertEqual(response.status_code, 403, response.text)
        response = await self.client.post(
            f"/admin/content/story/{row.id}/remove",
            json={"reason": "Reason", "administrator_id": str(self.owner.id)},
        )
        self.assertEqual(response.status_code, 422, response.text)

    async def test_anonymous_and_inactive_access_is_rejected(self):
        app = FastAPI()
        app.include_router(admin.router, prefix="/admin")

        async def database():
            yield None

        app.dependency_overrides[admin.get_db] = database
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            self.assertEqual((await client.get("/admin/stats")).status_code, 401)
        self.admin.is_active = False
        self.session.commit()
        self.assertEqual((await self.client.get("/admin/stats")).status_code, 400)

    async def test_stats_keep_assigned_in_progress_resolved_and_closed_separate(self):
        for index, status in enumerate(ReportStatus):
            self.session.add(
                Report(
                    tracking_code=f"VED-TEST-{index:04d}",
                    title="Report",
                    description="Details",
                    category=ReportCategory.SAFETY,
                    status=status,
                    is_anonymous=True,
                )
            )
        self.session.commit()
        for kind in ["resource", "story", "quote", "comment"]:
            self.content(kind)
        response = await self.client.get("/admin/stats")
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()
        self.assertEqual(data["reports"]["total"], len(ReportStatus))
        for status in ReportStatus:
            self.assertEqual(data["reports"][status.value], 1)
        self.assertEqual(
            data["content"],
            {
                "resources": 1,
                "stories": 2,
                "quotes": 1,
                "comments": 1,
                "other_posts": 0,
            },
        )
        response = await self.client.get("/reports/admin/stats")
        self.assertEqual(response.status_code, 200, response.text)
        for key in [
            "assigned_reports",
            "in_progress_reports",
            "resolved_reports",
            "closed_reports",
            "under_review_reports",
        ]:
            self.assertEqual(response.json()[key], 1, key)

    async def test_lists_search_filter_and_paginate_before_returning_content(self):
        for _ in range(5):
            self.content("story")
        self.content("quote")
        response = await self.client.get(
            "/admin/content?kind=story&search=Original&limit=2"
        )
        self.assertEqual(response.status_code, 200, response.text)
        first = response.json()
        self.assertEqual(first["total"], 5)
        self.assertEqual(len(first["items"]), 2)
        second = (
            await self.client.get(
                "/admin/content?kind=story&search=Original&limit=2&page=2"
            )
        ).json()
        self.assertFalse(
            {item["id"] for item in first["items"]}
            & {item["id"] for item in second["items"]}
        )
        self.assertEqual(
            (await self.client.get("/admin/content?search=%25")).json()["total"], 0
        )
        self.assertEqual(
            (await self.client.get("/admin/content?kind=report")).status_code, 422
        )
        self.assertEqual(
            (await self.client.get("/admin/content?limit=101")).status_code, 422
        )

    async def test_each_content_type_is_soft_removed_audited_and_notifies_only_its_author(
        self,
    ):
        for kind in ["resource", "story", "quote", "comment"]:
            row = self.content(kind)
            response = await self.client.post(
                f"/admin/content/{kind}/{row.id}/remove",
                json={
                    "reason": "Public removal reason",
                    "policy_reference": "Community rules",
                    "internal_notes": "PRIVATE ADMIN NOTES",
                },
            )
            self.assertEqual(response.status_code, 200, response.text)
            self.assertIsNotNone(row.removed_at)
            action = self.session.get(ModerationAction, response.json()["id"])
            self.assertEqual(action.administrator_id, self.admin.id)
            message = self.session.get(ContactMessage, action.notification_id)
            self.assertEqual(message.recipient_id, self.owner.id)
            self.assertIsNone(message.sender_id)
            for text in [kind, str(row.id), "Public removal reason", "Community rules"]:
                self.assertIn(text, message.message)
            self.assertNotIn("PRIVATE ADMIN NOTES", message.message)
            again = await self.client.post(
                f"/admin/content/{kind}/{row.id}/remove", json={"reason": "Duplicate"}
            )
            self.assertEqual(again.status_code, 409, again.text)
        self.assertEqual(self.session.query(ModerationAction).count(), 4)
        self.assertEqual(self.session.query(ContactMessage).count(), 4)
        self.current = self.owner
        inbox = (await self.client.get("/messages")).json()
        self.assertEqual(len(inbox), 4)
        self.assertNotIn("PRIVATE ADMIN NOTES", str(inbox))
        self.current = self.other
        self.assertEqual((await self.client.get("/messages")).json(), [])

    async def test_required_reason_and_transaction_rollback(self):
        row = self.content("story")
        for reason in ["", "   "]:
            self.assertEqual(
                (
                    await self.client.post(
                        f"/admin/content/story/{row.id}/remove", json={"reason": reason}
                    )
                ).status_code,
                422,
            )
        with patch.object(
            ModerationSession,
            "commit",
            AsyncMock(side_effect=RuntimeError("Database failure")),
        ):
            response = await self.client.post(
                f"/admin/content/story/{row.id}/remove", json={"reason": "Valid reason"}
            )
            self.assertEqual(response.status_code, 500)
        self.session.expire_all()
        self.assertIsNone(self.session.get(InspireStory, row.id).removed_at)
        self.assertEqual(self.session.query(ContactMessage).count(), 0)
        self.assertEqual(self.session.query(ModerationAction).count(), 0)

    async def test_removed_content_disappears_publicly_but_retains_admin_detail_and_history(
        self,
    ):
        row = self.content("story")
        await self.client.post(
            f"/admin/content/story/{row.id}/remove", json={"reason": "Policy violation"}
        )
        self.assertEqual(
            (await self.client.get(f"/inspire/stories/{row.id}")).status_code, 404
        )
        self.assertEqual((await self.client.get("/inspire/feed")).json(), [])
        response = await self.client.get(f"/admin/content/story/{row.id}")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["text"], "Story text")
        self.assertEqual(
            response.json()["history"]["items"][0]["reason"], "Policy violation"
        )
        self.assertEqual(
            (await self.client.get("/admin/content?state=removed")).json()["total"], 1
        )
        self.assertEqual(
            (await self.client.get("/admin/audit?search=Policy&limit=1")).json()[
                "total"
            ],
            1,
        )

    async def test_legacy_admin_delete_cannot_bypass_reason_and_audit(self):
        row = self.content("story")
        comment = self.content("comment")
        self.assertEqual(
            (await self.client.delete(f"/inspire/stories/{row.id}")).status_code, 409
        )
        self.assertEqual(
            (await self.client.delete(f"/inspire/comments/{comment.id}")).status_code,
            409,
        )
        self.assertIsNone(row.removed_at)
        self.assertEqual(self.session.query(ModerationAction).count(), 0)

    async def test_unowned_legacy_quote_has_audit_without_invented_notification(self):
        row = self.content("quote", owner=False)
        response = await self.client.post(
            f"/admin/content/quote/{row.id}/remove",
            json={"reason": "Legacy content reason"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertFalse(response.json()["author_available"])
        self.assertIsNone(response.json()["notification_id"])
        self.assertEqual(self.session.query(ModerationAction).count(), 1)

    async def test_admin_can_review_removed_post_attachments_but_not_pending_private_uploads(
        self,
    ):
        story = self.content("story")
        linked = InspireAttachment(
            user_id=self.owner.id,
            story_id=story.id,
            storage_bucket="private",
            storage_path="one.pdf",
            filename="one.pdf",
            mime_type="application/pdf",
            file_size=10,
        )
        pending = InspireAttachment(
            user_id=self.owner.id,
            storage_bucket="private",
            storage_path="pending.pdf",
            filename="pending.pdf",
            mime_type="application/pdf",
            file_size=10,
            expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        )
        self.session.add_all([linked, pending])
        self.session.commit()
        await self.client.post(
            f"/admin/content/story/{story.id}/remove", json={"reason": "Removal reason"}
        )
        bucket = Mock()
        bucket.create_signed_url.return_value = {
            "signedURL": "https://private.test/signed"
        }
        with patch.object(
            admin.inspire_storage, "private_bucket", AsyncMock(return_value=bucket)
        ):
            response = await self.client.get(f"/admin/attachments/{linked.id}/access")
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json()["expires_in"], 300)
            self.assertEqual(
                (
                    await self.client.get(f"/admin/attachments/{pending.id}/access")
                ).status_code,
                404,
            )
            self.current = self.owner
            self.assertEqual(
                (
                    await self.client.get(f"/admin/attachments/{linked.id}/access")
                ).status_code,
                403,
            )
            self.assertEqual(
                (
                    await self.client.get(f"/inspire/attachments/{linked.id}/access")
                ).status_code,
                404,
            )

    async def test_author_clearing_inbox_does_not_delete_moderation_history(self):
        story = self.content("story")
        await self.client.post(
            f"/admin/content/story/{story.id}/remove",
            json={"reason": "Preserved reason", "internal_notes": "Restricted"},
        )
        self.current = self.owner
        self.assertEqual((await self.client.delete("/messages")).status_code, 200)
        self.assertEqual(self.session.query(ContactMessage).count(), 0)
        self.current = self.admin
        history = (await self.client.get("/admin/audit")).json()
        self.assertEqual(history["total"], 1)
        self.assertEqual(history["items"][0]["reason"], "Preserved reason")

    async def test_report_search_and_pagination_preserve_existing_management(self):
        for index in range(3):
            self.session.add(
                Report(
                    tracking_code=f"VED-FIND-{index:04d}",
                    title="Searchable report",
                    description="Details",
                    category=ReportCategory.SAFETY,
                    user_id=self.owner.id,
                )
            )
        self.session.commit()
        response = await self.client.get(
            "/reports/admin/reports?search=Searchable&limit=2"
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["total"], 3)
        self.assertEqual(len(response.json()["items"]), 2)

    async def test_legacy_report_delete_cannot_discard_report_evidence_and_history(
        self,
    ):
        report = Report(
            tracking_code="VED-KEEP-0001",
            title="Retained report",
            description="Evidence",
            category=ReportCategory.SAFETY,
            user_id=self.owner.id,
        )
        self.session.add(report)
        self.session.commit()
        response = await self.client.delete(f"/reports/{report.id}")
        self.assertEqual(response.status_code, 409, response.text)
        self.assertIsNotNone(self.session.get(Report, report.id))
