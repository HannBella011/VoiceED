import unittest, uuid
import httpx
from fastapi import FastAPI
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.models import (
    Profile,
    Report,
    SharedMaterial,
    InspireStory,
    InspireQuote,
    InspireReaction,
    InspireComment,
    JournalEntry,
    MoodRecord,
    WellnessGoal,
    WellnessGoalProgress,
    UserActivity,
    ReportCategory,
)
from app.routes import dashboard
from test_share_flow import LocalAsyncSession
from datetime import datetime, timezone


class DashboardFlowTests(unittest.IsolatedAsyncioTestCase):
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
            JournalEntry,
            MoodRecord,
            WellnessGoal,
            WellnessGoalProgress,
            UserActivity,
        ]:
            model.__table__.create(self.engine)
        self.session = Session(self.engine, expire_on_commit=False)
        self.user = Profile(
            id=uuid.uuid4(), username="student", email="student@example.com"
        )
        self.other = Profile(
            id=uuid.uuid4(), username="other", email="other@example.com"
        )
        self.session.add_all([self.user, self.other])
        self.session.commit()
        app = FastAPI()
        app.include_router(dashboard.router, prefix="/dashboard")

        async def database():
            yield LocalAsyncSession(self.session)

        app.dependency_overrides[dashboard.get_db] = database
        app.dependency_overrides[dashboard.get_current_active_user] = lambda: self.user
        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        )

    async def asyncTearDown(self):
        await self.client.aclose()
        self.session.close()
        self.engine.dispose()

    async def test_summary_uses_only_real_owned_records(self):
        self.session.add(
            Report(
                tracking_code="VED-ABCD-1234",
                title="Owned",
                description="Details",
                category=ReportCategory.SAFETY,
                user_id=self.user.id,
            )
        )
        self.session.add(
            Report(
                tracking_code="VED-ABCD-5678",
                title="Other",
                description="Private",
                category=ReportCategory.SAFETY,
                user_id=self.other.id,
            )
        )
        self.session.commit()
        response = await self.client.get("/dashboard?day=2026-11-06")
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["reports"], {"submitted": 1})
        self.assertEqual(len(body["activity"]), 1)
        self.assertEqual(body["events"], [])
        self.assertIsNone(body["safety_training"])
        self.assertEqual(body["wellness_progress"], 0)
        self.assertNotIn("Private", response.text)

    async def test_anonymous_dashboard_request_is_rejected_without_reading_data(self):
        app = FastAPI()
        app.include_router(dashboard.router, prefix="/dashboard")

        async def database():
            yield None

        app.dependency_overrides[dashboard.get_db] = database
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.get("/dashboard?day=2026-11-06")
        self.assertEqual(response.status_code, 401, response.text)
        self.assertNotIn("reports", response.json())

    async def test_content_counts_and_received_interactions_are_owned_and_visible(self):
        now = datetime.now(timezone.utc)
        story = InspireStory(title="Owned story", content="Text", user_id=self.user.id)
        kudos = InspireStory(
            title="Kudos",
            content="Thanks",
            post_type="kudos",
            recipient_label="Class",
            user_id=self.user.id,
        )
        removed = InspireStory(
            title="Removed", content="Text", user_id=self.user.id, removed_at=now
        )
        other = InspireStory(title="Other", content="Private", user_id=self.other.id)
        quote = InspireQuote(quote="Quote", user_id=self.user.id)
        self.session.add_all([story, kudos, removed, other, quote])
        self.session.flush()
        for target in [story, removed, other]:
            self.session.add(InspireReaction(story_id=target.id, user_id=self.other.id))
            self.session.add(
                InspireComment(
                    story_id=target.id, user_id=self.other.id, content="Comment"
                )
            )
        self.session.add(InspireReaction(quote_id=quote.id, user_id=self.other.id))
        self.session.add(
            InspireComment(
                quote_id=quote.id, user_id=self.other.id, content="Quote comment"
            )
        )
        self.session.add(
            InspireComment(
                story_id=story.id,
                user_id=self.other.id,
                content="Removed comment",
                removed_at=now,
            )
        )
        for owner, removed_at in [
            (self.user.id, None),
            (self.user.id, now),
            (self.other.id, None),
        ]:
            self.session.add(
                SharedMaterial(
                    title="Notes",
                    subject="CS101",
                    file_url="https://example.test/file.pdf",
                    file_type="application/pdf",
                    user_id=owner,
                    removed_at=removed_at,
                )
            )
        self.session.commit()
        response = await self.client.get("/dashboard?day=2026-11-07")
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()
        for key, value in {
            "materials": 1,
            "stories": 1,
            "quotes": 1,
            "other_posts": 1,
            "inspire_posts": 3,
            "reactions_received": 2,
            "comments_received": 2,
            "reports_submitted": 0,
        }.items():
            self.assertEqual(data[key], value, key)
        self.assertEqual(response.headers["cache-control"], "private, no-store")
        self.assertEqual(len(data["activity"]), 4)

    async def test_empty_account_has_zero_counts_and_no_invented_activity(self):
        data = (await self.client.get("/dashboard?day=2026-11-07")).json()
        for key in [
            "materials",
            "stories",
            "quotes",
            "reactions_received",
            "comments_received",
            "reports_submitted",
        ]:
            self.assertEqual(data[key], 0, key)
        self.assertEqual(data["activity"], [])

    async def test_recent_activity_is_globally_bounded_and_stably_sorted(self):
        stamp = datetime(2026, 1, 1, tzinfo=timezone.utc)
        self.session.add_all(
            InspireQuote(user_id=self.user.id, quote=f"Quote {index}", created_at=stamp)
            for index in range(15)
        )
        self.session.commit()
        data = (await self.client.get("/dashboard?day=2026-11-07")).json()
        self.assertEqual(data["quotes"], 15)
        self.assertEqual(
            [row["id"] for row in data["activity"]],
            [f"inspire_quotes:{index}" for index in range(15, 5, -1)],
        )
