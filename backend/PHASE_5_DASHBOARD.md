# Phase 5 completion report — navbar and user dashboard

## Implemented

- Restored the original `fas fa-user` profile icon found in `base/dashboard.html`, keeping the existing gradient control and authenticated dropdown. My Profile, Dashboard, Settings and Logout remain available, including keyboard navigation.
- Moved the authenticated Dashboard navigation item immediately after Home. Guest and authentication-loading navigation omit it. Backend authentication remains independent of navbar visibility.
- Added six database-backed dashboard cards: resources shared, stories published, quotes published, reactions received, comments received and reports submitted. Cards reuse the existing stat-card appearance and palette.
- Corrected grid shrink behavior with `minmax(0, 1fr)`, consistent statistic columns, aligned card headings and responsive wrapping. The existing card padding, gaps and appearance are retained. Statistics do not show invented zeros while loading or after an error.
- Added retry behavior and account-aware summary state: switching accounts immediately hides the previous account's numbers, and late responses are ignored.
- Summary cards link to the account's own paginated ShareED/InspireED content or the existing personal reports page. Personal collection filtering happens on the backend using the authenticated profile ID, not a client-supplied owner identifier. Personal lists retain their existing search/pagination controls and can return to the full feed.

## Statistics definitions

Resource/story/quote counts exclude soft-removed content. Stories count only `post_type='story'`; existing post, kudos and milestone records remain included in the compatible `inspire_posts` total and are separately represented by `other_posts`.

Received reactions/comments count persisted interactions on all of the account's visible InspireED posts and quotes. Removed comments are excluded. Counts include an author's own interaction if it exists, consistent with the post's displayed totals. They do not count interactions on another user's content.

Report totals include submissions linked to the authenticated profile. Guest or anonymous reports without an account relationship are not attributed to an account. No report details from other accounts are included.

Existing wellness progress, profile completion, journal/mood totals and recent activity remain. Counts use database aggregates. Recent activity now selects only identifiers, event labels and timestamps, globally sorts across sources and limits to ten rows in SQL instead of retrieving full records per source. Dashboard responses are marked `private, no-store`.

## Files changed

- Backend: `.gitignore`, `app/models/__init__.py`, `app/routes/dashboard.py`, `app/routes/inspire.py`, `app/routes/share.py`, `app/services/__init__.py`, `app/services/share_search.py`, new migration `alembic/versions/c96e1f427ab3_owned_resources_index.py`, `tests/test_dashboard_flow.py`, `tests/test_inspire_flow.py`, `tests/test_share_flow.py`, `tests/inspire_test_server.py`, `tests/migration_sql.py`, `tests/phase2_postgres.test.cjs`, this report.
- Frontend: `.gitignore`, `components/shared/Navbar.jsx`, `app/dashboard/page.jsx`, `app/dashboard/canonical.module.css`, `app/share-ed/page.jsx`, `app/inspire-ed/page.jsx`, `tests/service-pages.test.cjs`, new `tests/dashboard-flow.test.cjs`.
- Existing unrelated edits in `service-pages.test.cjs` and other files were preserved. Ignore exceptions make the dashboard regression files reviewable.

## Database changes

Alembic revision **`c96e1f427ab3`**, following `b85d0e316fa2`, adds the partial `(user_id, created_at, id)` index `ix_shared_materials_owner_created` for visible resources. This supports the new personal listing and resource-count queries; the existing subject/default-feed indexes do not begin with ownership. Existing story, quote, report and interaction indexes are reused.

No tables, columns or records are removed or rewritten. Downgrade drops only the new index. Ordinary transactional index creation can lock writes while building on a large deployment. No migration was applied to live Supabase during this phase.

## API and frontend changes

No route paths were added. `GET /api/v1/dashboard?day=...` now includes `stories`, `quotes`, `other_posts`, `reactions_received`, `comments_received` and `reports_submitted`, retaining its existing fields. The summary always scopes data to its authenticated user.

`GET /api/v1/share/materials` and `GET /api/v1/inspire/feed` accept `mine=true`. The ShareED endpoint remains authenticated; InspireED requires authentication for personal collections while retaining public general feeds. Counts and filtering precede pagination. The dashboard links use `/share-ed?mine=1` and `/inspire-ed?mine=1&post_type=story` or `quote`; frontend services translate these into the authenticated API filters. Reports use `/dashboard/reports`.

## Locally tested

- **74 backend tests passed.** Added checks cover distinct story/quote counts, received interactions, soft removal, empty accounts, bounded/stable activity ordering, cache headers, unauthorized dashboard access and personal collection ownership.
- **58 distinct frontend tests passed.** Existing navigation checks now verify Home → Dashboard → About, the original icon, loading/guest visibility and the retained dropdown/keyboard actions. Five new dashboard tests cover actual summary values, personal-content links, retry without fake statistics, account switching/stale responses, and personal-view query activation.
- A frontend-service HTTP test creates posts and interactions through FastAPI, reads the dashboard through the real account API service, and verifies summary ownership against the linked personal feed. Its database is isolated SQLite and its authentication/storage are test fixtures, not live Supabase.
- **29 isolated PostgreSQL checks passed**, including schema/index parity and upgrade/downgrade through the new head `c96e1f427ab3`.
- The production Next.js build passed. The existing configuration still skips type checking and emits the existing React 18 deprecation warning.
- `git diff --check` passed.

## Remaining verification

Live Supabase statistics, deployment query plans and browser visual/responsive checks remain unverified. Apply the reviewed migration chain through the authorized deployment procedure. Local component/HTTP tests do not constitute a live browser-to-Supabase verification; that remains part of Phase 9. Phase 6 administrator-dashboard work has not begun.
