import unittest, uuid
import httpx
from unittest.mock import Mock, patch
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from app.models import (
    Profile,
    InspireStory,
    InspireQuote,
    InspireReaction,
    InspireComment,
    InspireShare,
    InspireAttachment,
    UserActivity,
)
from app.routes import inspire
from app.services import inspire_storage
from test_share_flow import LocalAsyncSession


class InspireFlowTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.engine = create_engine("sqlite://")
        for model in [
            Profile,
            InspireStory,
            InspireQuote,
            InspireReaction,
            InspireComment,
            InspireShare,
            InspireAttachment,
            UserActivity,
        ]:
            model.__table__.create(self.engine)
        self.session = Session(self.engine, expire_on_commit=False)
        self.owner = Profile(
            id=uuid.uuid4(),
            username="owner",
            full_name="Private Author",
            email="owner@example.com",
        )
        self.other = Profile(
            id=uuid.uuid4(), username="other", email="other@example.com"
        )
        self.session.add_all([self.owner, self.other])
        self.session.commit()
        self.current = self.owner
        app = FastAPI()
        app.include_router(inspire.router, prefix="/inspire")

        async def database():
            try:
                yield InspireSession(self.session)
            except Exception:
                self.session.rollback()
                raise

        app.dependency_overrides[inspire.get_db] = database
        app.dependency_overrides[inspire.get_current_active_user] = lambda: self.current
        app.dependency_overrides[inspire.optional_user] = lambda: self.current
        self.app = app
        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        )

    async def asyncTearDown(self):
        await self.client.aclose()
        self.session.close()
        self.engine.dispose()

    async def test_empty_feed_has_no_demo_data(self):
        self.assertEqual((await self.client.get("/inspire/feed")).json(), [])

    async def test_mine_is_owned_only_and_requires_authentication(self):
        await self.client.post(
            "/inspire/stories", json={"content": "Owned", "is_anonymous": True}
        )
        self.current = self.other
        await self.client.post("/inspire/stories", json={"content": "Other"})
        self.current = self.owner
        response = await self.client.get("/inspire/feed?mine=true&envelope=true")
        self.assertEqual(response.json()["total"], 1)
        self.assertEqual(response.json()["items"][0]["content"]["text"], "Owned")
        self.current = None
        self.assertEqual(
            (await self.client.get("/inspire/feed?mine=true")).status_code, 401
        )

    async def test_anonymous_author_hidden_and_ownership_enforced(self):
        data = {
            "content": "Encouragement",
            "post_type": "kudos",
            "recipient_label": "Study group",
            "is_anonymous": True,
        }
        response = await self.client.post("/inspire/stories", json=data)
        self.assertEqual(response.status_code, 201, response.text)
        identity = response.json()["record_id"]
        self.current = self.other
        response = await self.client.get("/inspire/feed")
        self.assertEqual(response.status_code, 200, response.text)
        post = response.json()[0]
        self.assertEqual(post["author"], "Anonymous")
        self.assertIsNone(post["user_id"])
        self.assertNotIn("Private Author", response.text)
        self.assertEqual(
            (
                await self.client.patch(f"/inspire/stories/{identity}", json=data)
            ).status_code,
            404,
        )
        self.assertEqual(
            (await self.client.delete(f"/inspire/stories/{identity}")).status_code, 404
        )

    async def test_quote_comment_and_delete_persist(self):
        response = await self.client.post(
            "/inspire/quotes", json={"quote": "Keep learning", "author": "A Student"}
        )
        self.assertEqual(response.status_code, 201, response.text)
        identity = response.json()["record_id"]
        self.current = self.other
        response = await self.client.post(
            f"/inspire/quotes/{identity}/comments", json={"content": "Thank you"}
        )
        self.assertEqual(response.status_code, 201, response.text)
        comment = response.json()["id"]
        self.assertEqual(
            len((await self.client.get(f"/inspire/quotes/{identity}/comments")).json()),
            1,
        )
        self.current = self.owner
        self.assertEqual(
            (await self.client.delete(f"/inspire/comments/{comment}")).status_code, 404
        )
        self.assertEqual(
            (await self.client.delete(f"/inspire/quotes/{identity}")).status_code, 200
        )
        self.assertEqual((await self.client.get("/inspire/feed")).json(), [])

    async def test_reaction_is_idempotent(self):
        # PostgreSQL dialect ON CONFLICT also executes against local SQLite.
        response = await self.client.post(
            "/inspire/stories", json={"content": "A story"}
        )
        identity = response.json()["record_id"]
        for _ in range(2):
            response = await self.client.put(f"/inspire/stories/{identity}/reaction")
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json()["likes"], 1)
        response = await self.client.delete(f"/inspire/stories/{identity}/reaction")
        self.assertEqual(response.json()["likes"], 0)

    async def test_structured_body_persists_and_legacy_edit_synchronizes(self):
        body = {
            "version": 1,
            "blocks": [
                {
                    "type": "paragraph",
                    "children": [
                        {"text": "Hello 😀", "marks": ["bold", "italic", "underline"]}
                    ],
                },
                {"type": "bulleted_list", "children": [{"text": "One", "marks": []}]},
                {"type": "numbered_list", "children": [{"text": "Two", "marks": []}]},
            ],
        }
        response = await self.client.post(
            "/inspire/stories", json={"title": "Formatted", "body": body}
        )
        self.assertEqual(response.status_code, 201, response.text)
        identity = response.json()["record_id"]
        self.assertEqual(response.json()["content"]["text"], "Hello 😀\nOne\nTwo")
        self.session.expire_all()
        response = await self.client.get(f"/inspire/stories/{identity}")
        self.assertEqual(response.json()["body"], body)
        response = await self.client.patch(
            f"/inspire/stories/{identity}", json={"content": "Legacy updated"}
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(
            response.json()["body"]["blocks"][0]["children"][0]["text"],
            "Legacy updated",
        )
        for invalid in [
            dict(body, onclick="alert(1)"),
            {"version": 1, "blocks": [{"type": "script", "children": [{"text": "x"}]}]},
            {
                "version": 1,
                "blocks": [
                    {
                        "type": "paragraph",
                        "children": [
                            {"text": "x", "marks": ["link"], "href": "javascript:x"}
                        ],
                    }
                ],
            },
        ]:
            response = await self.client.post(
                "/inspire/stories", json={"body": invalid}
            )
            self.assertEqual(response.status_code, 422, response.text)

    async def test_public_reads_and_auth_required_for_writes(self):
        created = (
            await self.client.post("/inspire/quotes", json={"quote": "Public quote"})
        ).json()
        self.current = None
        self.app.dependency_overrides.pop(inspire.get_current_active_user)
        self.app.dependency_overrides.pop(inspire.optional_user)
        response = await self.client.get(f"/inspire/quotes/{created['record_id']}")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertFalse(response.json()["userLiked"])
        self.assertFalse(response.json()["isUserCreated"])
        for path, method, data in [
            ("/inspire/stories", "POST", {"content": "Unauthorized"}),
            (f"/inspire/quotes/{created['record_id']}/reaction", "PUT", None),
            (
                f"/inspire/quotes/{created['record_id']}/comments",
                "POST",
                {"content": "Unauthorized"},
            ),
        ]:
            response = await self.client.request(method, path, json=data)
            self.assertEqual(response.status_code, 401, response.text)

    async def test_server_search_type_pagination_and_anonymous_author_search_privacy(
        self,
    ):
        for index in range(5):
            await self.client.post(
                "/inspire/stories",
                json={"content": f"Unique reflection {index}", "is_anonymous": True},
            )
        await self.client.post("/inspire/quotes", json={"quote": "Unique quote"})
        response = await self.client.get(
            "/inspire/feed?envelope=true&limit=2&search=Unique&post_type=story"
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["total"], 5)
        self.assertEqual(len(response.json()["items"]), 2)
        self.assertTrue(response.json()["has_more"])
        first = {r["id"] for r in response.json()["items"]}
        second = (
            await self.client.get(
                "/inspire/feed?envelope=true&limit=2&page=2&search=Unique&post_type=story"
            )
        ).json()
        self.assertFalse(first & {r["id"] for r in second["items"]})
        self.assertEqual(
            (
                await self.client.get(
                    "/inspire/feed?search=Private%20Author&post_type=story"
                )
            ).json(),
            [],
        )

    async def test_comments_are_paginated_and_deletion_hides_counts(self):
        created = (
            await self.client.post("/inspire/stories", json={"content": "A story"})
        ).json()
        path = f"/inspire/stories/{created['record_id']}"
        for index in range(3):
            await self.client.post(
                path + "/comments", json={"content": f"Comment {index}"}
            )
        first = (await self.client.get(path + "/comments?envelope=true&limit=2")).json()
        self.assertEqual(first["total"], 3)
        self.assertEqual(len(first["items"]), 2)
        self.assertTrue(first["has_more"])
        second = (
            await self.client.get(path + "/comments?envelope=true&limit=2&page=2")
        ).json()
        self.assertEqual(len(second["items"]), 1)
        self.assertFalse(second["has_more"])
        response = await self.client.delete(
            f"/inspire/comments/{first['items'][0]['id']}"
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual((await self.client.get(path)).json()["comments"], 2)
        self.assertIsNotNone(
            self.session.get(InspireComment, first["items"][0]["id"]).removed_at
        )

    async def test_private_upload_link_access_and_removed_post(self):
        bucket = Mock()
        bucket.create_signed_url.return_value = {
            "signedURL": "https://private.test/signed?token=short-lived"
        }
        with patch.object(inspire_storage, "private_bucket", return_value=bucket):
            response = await self.client.post(
                "/inspire/attachments",
                files={"file": ("test.pdf", b"%PDF-1.7\nfixture", "application/pdf")},
            )
            self.assertEqual(response.status_code, 201, response.text)
            attachment = response.json()["id"]
            self.assertNotIn("storage_path", response.json())
            self.current = self.other
            self.assertEqual(
                (
                    await self.client.get(f"/inspire/attachments/{attachment}/access")
                ).status_code,
                404,
            )
            self.assertEqual(
                (
                    await self.client.post(
                        "/inspire/stories",
                        json={"content": "Stolen", "attachment_ids": [attachment]},
                    )
                ).status_code,
                403,
            )
            self.current = self.owner
            created = await self.client.post(
                "/inspire/stories",
                json={"content": "With attachment", "attachment_ids": [attachment]},
            )
            self.assertEqual(created.status_code, 201, created.text)
            self.assertEqual(len(created.json()["attachments"]), 1)
            self.current = None
            response = await self.client.get(
                f"/inspire/attachments/{attachment}/access"
            )
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json()["expires_in"], 300)
            self.current = self.owner
            await self.client.delete(f"/inspire/stories/{created.json()['record_id']}")
            self.assertEqual(
                (
                    await self.client.get(f"/inspire/attachments/{attachment}/access")
                ).status_code,
                404,
            )

    async def test_upload_validation_cleanup_retry_and_public_bucket_refusal(self):
        bucket = Mock()
        with patch.object(inspire_storage, "private_bucket", return_value=bucket):
            for name, content, mime in [
                ("x.svg", b"<svg/>", "image/svg+xml"),
                ("x.png", b"<script>", "image/png"),
                ("x.pdf", b"", "application/pdf"),
                ("x.pdf", b"%PDF-" + b"x" * (25 * 1024 * 1024), "application/pdf"),
            ]:
                response = await self.client.post(
                    "/inspire/attachments", files={"file": (name, content, mime)}
                )
                self.assertEqual(response.status_code, 422, response.text)
            bucket.upload.side_effect = RuntimeError("Storage failed")
            response = await self.client.post(
                "/inspire/attachments",
                files={"file": ("x.pdf", b"%PDF-1.7", "application/pdf")},
            )
            self.assertEqual(response.status_code, 503, response.text)
        self.assertEqual(self.session.query(InspireAttachment).count(), 1)
        with patch.object(
            inspire_storage.supabase_service, "get_storage_bucket", return_value=bucket
        ):
            bucket.remove.side_effect = RuntimeError("Try later")
            self.assertEqual(
                await inspire_storage.cleanup_expired(InspireSession(self.session)), 0
            )
            self.assertEqual(self.session.query(InspireAttachment).count(), 1)
            bucket.remove.side_effect = None
            self.assertEqual(
                await inspire_storage.cleanup_expired(InspireSession(self.session)), 1
            )
        storage = Mock()
        storage.storage.get_bucket.return_value = {"public": True}
        with patch.object(
            type(inspire_storage.supabase_service),
            "client",
            new_callable=unittest.mock.PropertyMock,
            return_value=storage,
        ):
            with self.assertRaises(inspire.HTTPException) as raised:
                await inspire_storage.private_bucket("public")
            self.assertEqual(raised.exception.status_code, 503)

    async def test_share_records_only_accept_defined_events(self):
        created = (
            await self.client.post("/inspire/quotes", json={"quote": "Shareable"})
        ).json()
        path = f"/inspire/quotes/{created['record_id']}/shares"
        self.assertEqual(
            (await self.client.post(path, json={"method": "click"})).status_code, 422
        )
        response = await self.client.post(path, json={"method": "copy"})
        self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual(response.json()["shares"], 1)

    async def test_feed_query_count_does_not_grow_with_post_count(self):
        self.session.add_all(
            [
                InspireStory(
                    user_id=self.owner.id, title=f"Story {index}", content="Body"
                )
                for index in range(20)
            ]
        )
        self.session.commit()
        statements = []

        def capture(connection, cursor, statement, parameters, context, executemany):
            if statement.lstrip().upper().startswith("SELECT"):
                statements.append(statement)

        event.listen(self.engine, "before_cursor_execute", capture)
        try:
            one = await self.client.get("/inspire/feed?limit=1")
            self.assertEqual(one.status_code, 200, one.text)
            first = len(statements)
            statements.clear()
            many = await self.client.get("/inspire/feed?limit=20")
            self.assertEqual(len(many.json()), 20)
            self.assertEqual(len(statements), first)
        finally:
            event.remove(self.engine, "before_cursor_execute", capture)

    async def test_student_badge_uses_persisted_verification_and_hides_anonymous_identity(
        self,
    ):
        self.owner._email_verified = True
        created = (
            await self.client.post("/inspire/stories", json={"content": "A post"})
        ).json()
        self.assertFalse(created["author_verified"])
        self.owner.is_verified = True
        self.owner.verified_at = datetime.now(timezone.utc)
        self.owner.verified_by = self.other.id
        self.session.commit()
        response = await self.client.get(f"/inspire/stories/{created['record_id']}")
        self.assertTrue(response.json()["author_verified"])
        anonymous = (
            await self.client.post(
                "/inspire/stories", json={"content": "Anonymous", "is_anonymous": True}
            )
        ).json()
        self.assertFalse(anonymous["author_verified"])
        self.assertIsNone(anonymous["user_id"])
        self.assertEqual(anonymous["author"], "Anonymous")


class InspireSession(LocalAsyncSession):
    async def flush(self):
        self.session.flush()

    async def scalars(self, query):
        return self.session.scalars(query)

    async def refresh(self, row):
        self.session.refresh(row)
