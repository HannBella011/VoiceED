# Phase 6 completion report — administrator dashboard and moderation

## Implemented

The new `/admin` page provides database-backed report and content statistics, paginated moderation listings, content review, removals with required public reasons, author notifications and moderation history. The authenticated profile dropdown includes Administration for administrator and superadministrator roles. Other users cannot request the underlying APIs.

Report statistics keep Submitted, Under Review, Assigned, In Progress, Awaiting Additional Info, Resolved and Closed separate. The existing report statistics endpoint was corrected to expose under-review/assigned/closed counts and no longer combines assigned with in-progress or closed with resolved. Grouped aggregate queries replace repeated report count queries. Content totals cover resources, stories, quotes, comments and preserved legacy InspireED post types. Totals include retained removed records; the removed-content count is shown separately and includes owner removals as well as administrator removals. Moderation action count covers audited administrator removals only. No flagging system existed, so no flagged-content metric was invented.

Moderators can filter by content type/removal state, search title/body text, sort chronologically, navigate database pages and review full text/rich bodies. Author names are loaded in a joined query rather than per row. Detail views include attachment access and the latest ten audit records; the separate history view supports paginated access to older records. Private signed attachment access is administrator-protected and works for retained removed posts; staged unpublished uploads are excluded.

Removing content requires a nonempty reason. The backend locks the target row, applies `removed_at`, creates an audit snapshot and inserts the author's message in one transaction. The snapshot contains the target/title/type, author, acting administrator, reason, optional policy explanation, restricted notes and removal time. A database failure rolls back the removal, message and audit record together. Repeated removal returns 409 instead of creating duplicate records/messages. UI guards also prevent duplicate submission and preserve entered reasons after errors.

Author messages use the existing Messages inbox, with the content title or identifier, type, reason, removal timestamp and optional policy explanation. Internal administrator notes are never copied into messages or public content responses. Inbox copy now includes platform notifications. Clearing an inbox does not delete moderation history. Content with no linked account, such as historical unowned quotes, retains an audit action and explicitly reports that no account inbox can be notified.

The existing ReportED management page remains the workflow for report review, assignment, status changes and timelines. It now accepts dashboard status links, supports debounced backend search, ignores stale list responses, and exposes working Previous/Next controls. Existing transitions and permissions remain enforced. Its previously available permanent-delete endpoint now returns 409 directing administrators to the retained closure workflow, preventing deletion of report evidence/timeline history.

Legacy InspireED delete endpoints reject administrators deleting someone else's content without the moderation workflow. The public comment moderation button takes administrators to the reason-backed review page. Ordinary owner deletions remain available; resource owner deletion now soft-removes the record rather than destroying it. Public feeds/details/download APIs exclude removed content, while administrators retain review access.

## Files modified or added in this phase

- Backend: `.gitignore`, `app/routes/__init__.py`, new `app/routes/admin.py`, `app/routes/inspire.py`, `app/routes/reports.py`, `app/schemas/__init__.py`, `app/services/__init__.py`, new `app/services/moderation.py`, `tests/inspire_test_server.py`, new `tests/test_moderation_flow.py`, this report.
- Frontend: `.gitignore`, new `app/admin/page.jsx`, new `app/admin/admin.module.css`, `app/admin/reports/page.jsx`, `app/inspire-ed/page.jsx`, `app/message/page.jsx`, `components/shared/Navbar.jsx`, new `services/admin.js`, new `tests/admin-flow.test.cjs`, `tests/service-pages.test.cjs`.
- Existing unrelated work and prior-phase edits were preserved. Ignore exceptions expose the new regression files for review. No dependencies were added and no JSX was converted to TSX.

## Database changes and Alembic revisions

No schema change or new Alembic revision was needed. The implementation reuses the `removed_at`, `moderation_actions`, attachment and message structures from **`a74c9d205ef1`**, including existing audit/message foreign keys and restricted browser access. The local migration head remains **`c96e1f427ab3`**. Apply the reviewed existing migration chain through the deployment workflow before deploying this code. No live Supabase migration or remote data change was performed.

The moderation API exposes no audit edit/delete operations. Administrator role assignment remains outside its scope and protected by the existing superadministrator dependency.

## API endpoints

Added, all requiring an active administrator or superadministrator:

- `GET /api/v1/admin/stats`
- `GET /api/v1/admin/content` — kind/state/search/post-type/sort/page/limit filters
- `GET /api/v1/admin/content/{kind}/{id}` — review detail and bounded history
- `POST /api/v1/admin/content/{kind}/{id}/remove` — reason, optional public policy explanation and optional private notes; actor IDs are server-derived
- `GET /api/v1/admin/audit` — paginated history with kind/content-ID/search filters
- `GET /api/v1/admin/attachments/{id}/access` — short-lived signed access for linked post attachments

Administrator responses are marked `private, no-store`. Unknown input fields, invalid kinds/states and invalid pagination are rejected. New moderation endpoints do not accept role or verification changes.

Modified existing routes: report admin statistics/list search, legacy report deletion, InspireED non-owner administrator deletion, and resource owner deletion behavior. Existing report status/assignment/timeline routes continue to operate.

## Locally tested and results

- **87 backend tests passed**, including thirteen new moderation tests. These cover all content types, required reasons, administrator/guest/inactive-account permissions, prevention of role changes, pagination/search, exact status counts, duplicate removal, atomic rollback, public exclusion, retained audit detail, legacy bypass prevention, unowned legacy content, removed attachment review, pending-upload privacy, author-only inbox delivery and audit retention after inbox clearing. Existing authentication, reporting, ownership and personal dashboards also passed.
- **65 frontend tests passed.** Six new administrator tests cover unauthorized access without API requests, server pagination/search without repeatedly loading statistics, required reason and duplicate-submit handling, successful refresh/history, failure draft retention, status-link/report search/pagination, and an actual frontend-service HTTP moderation/inbox flow. Navigation tests verify role-gated Administration access.
- The HTTP flow runs the real frontend API service against FastAPI with isolated SQLite and fixture authentication/storage. It verifies that the author receives the public reason/policy text and never receives restricted notes. It does not connect to live Supabase.
- **29 isolated PostgreSQL checks passed**, including the existing moderation/message foreign-key behavior, RLS, schema parity and migration round trips through `c96e1f427ab3`. Live PostgreSQL concurrency and query-plan behavior were not tested by the SQLite CRUD tests.
- `npm.cmd run build` passed and includes `/admin`. Existing type-check skipping and the existing React 18 deprecation warning remain unchanged.
- `git diff --check` passed.

## Remaining issues and deployment verification

Live Supabase permissions, notifications, storage access, concurrent removals and browser visual/responsive behavior remain unverified and belong in deployed integration testing. Search/list query plans should be reviewed during Phase 8 using actual data volumes; no unmeasured expensive indexes were added here.

Accounts must be linked to content for an inbox notification; historical unowned content cannot be attributed from an author's display text. Removal hides resources from application listings/access endpoints but cannot revoke an existing public ShareED object URL. Private post attachments use expiring signed URLs, so already issued URLs remain valid until expiry. Existing Storage policy/deployment dependencies still apply.

Phase 7 superadministrator account-management and verification interfaces have not begun.
