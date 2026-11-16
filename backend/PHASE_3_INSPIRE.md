# Phase 3 completion report

## Implemented

Story/Quote selection is available through Create Post on InspireED and the homepage. The existing Kudos/Milestone flows remain. Posts use a version-1 JSON document with paragraph, bulleted-list-item and numbered-list-item blocks; spans allow bold, italic and underline. Emoji and paragraph breaks survive persistence. The backend rejects unknown elements, marks and attributes and bounds document size. React renders text with an element allowlist, never stored HTML.

PNG/JPEG/PDF attachments support multiple selection, image previews, removal, per-file 25 MiB validation, progress/loading feedback and retry without losing the draft. The backend validates extension, declared MIME and file signature; actual binary decoding/antivirus scanning is not provided. A post can have at most ten attachments. Metadata is saved before object upload so expired uploads remain discoverable after crashes. Post/attachment ownership is checked in the same database transaction.

Uploads require a private Supabase bucket. No public object URLs are generated. Access checks precede five-minute signed URL creation. Random storage paths do not include the author's UUID, including on anonymous posts. Removed posts cannot receive new access URLs; already issued URLs remain usable until their short expiry. Cancelled and failed staged uploads are eligible for the bounded retryable cleanup command described below. Soft-deleted posts retain linked objects for moderation review.

Heart reactions persist with database uniqueness, reflect viewer state and update without reloading the page. Comments display authors/timestamps, load ten per page, and support owner/admin deletion. Deleted comments and posts are soft removed and excluded from reads/counts. Full administrator removal reasons, audit logging and author messages remain Phase 6 work.

Share and Copy link use `/inspire-ed?post=stories%3A<ID>` or `quotes%3A<ID>`. Native sharing receives the URL; clipboard sharing copies the URL. Guest sharing works without a counter write. A counted event is an authenticated client's successful clipboard write or resolved native share, followed by an accepted event request; cancellation/failure is not counted. This counts completed actions, not unique recipients or proven downstream delivery. Copy Quote remains a separate plain-text action and does not increment shares.

Public post/comment reads work without login. Writes still require an active authenticated account. Guest reaction/comment attempts use the existing Login Required notification. Student badges use the persisted student-verification field; email confirmation does not produce a badge and anonymous authors do not display one.

The feed uses twelve records per page, backend search/type/activity filters and stable sorting. Search is debounced and stale/aborted requests are ignored. Authors, attachments, reactions and counts use bounded batch queries rather than per-post queries. Existing list-returning endpoints remain compatible; `envelope=true` adds page/total/has-more metadata. Existing `inspireService` exports remain available.

## Files changed in this phase

- Backend: `.gitignore`, `app/routes/inspire.py`, `app/settings.py`, `app/schemas/inspire.py`, `app/services/inspire_storage.py`, `app/services/inspire_cleanup.py`, `tests/test_inspire_flow.py`, `tests/inspire_test_server.py`, this report.
- Frontend: `.gitignore`, `app/inspire-ed/page.jsx`, `app/inspire-ed/inspire.css`, `app/page.jsx`, `lib/routeProtection.jsx`, `lib/inspire-body.js`, `services/inspire.js`, `tests/inspire-flow.test.cjs`, and the five JSX components under `components/features/inspire/`: `InspireDialog`, `PostComposer`, `PostAttachments`, `RichBody`, `RichEditor`.
- Ignore rules now expose these new regression tests for version control. Existing unrelated edits, including `frontend/tests/service-pages.test.cjs`, were preserved.

## Database and API changes

No new schema changes or Alembic revision were needed. This implementation requires Phase 2 revision `a74c9d205ef1` and its predecessors to be applied before deployment. No migration was applied to live Supabase during this phase.

All routes below use the `/api/v1/inspire` prefix:

- Added `POST /attachments`, `DELETE /attachments/{id}`, `GET /attachments/{id}/access`.
- Extended public `GET /feed`, `/stories`, `/quotes`, `/quotes/daily`, `/{kind}/{id}`, `/{kind}/{id}/comments`.
- Extended structured create/edit routes: `POST /stories`, `/quotes`; `PATCH /stories/{id}`, `/quotes/{id}`. Legacy text inputs are converted and synchronized with JSON bodies.
- Updated reaction PUT/DELETE, comment POST/DELETE, post DELETE and share-event POST routes. Shares require `{"method":"copy"}` or `{"method":"native"}`.

## Locally tested

- Backend unittest discovery: **64 passed**, including 13 InspireED tests. Covers rich-body round trips, allowlist rejection, legacy edit synchronization, ownership, public reads/authenticated writes, pagination, anonymous-author privacy, file validation, private-bucket refusal, cleanup retries, soft removal, reaction uniqueness and student badges. A query-count test verifies that increasing a feed from one to twenty posts does not increase its database query count.
- Frontend Node suites: **48 passed** (40 existing and 8 new). Covers formatting/list/emoji serialization, escaped rendering, real share completion/cancellation, guest login prompts, one-page feed/comment requests, pagination filter preservation, stale-response rejection, duplicate publish prevention and draft/upload retention after failure.
- One new test executes the real frontend API service over HTTP against FastAPI, covering upload, publish/read-back, reactions, comments, share counts, guest access, ownership denial and removed-post attachment access. Its database is isolated SQLite and Storage/auth are test fixtures; it does not use live Supabase.
- `npm.cmd run build`: passed. The existing configuration skips type checking, and Next.js emits its existing React 18 deprecation warning.
- `git diff --check`: passed.

## Deployment dependencies and remaining verification

1. Confirm/apply the Phase 2 Alembic revision using the authorized deployment procedure.
2. Configure `INSPIRE_STORAGE_BUCKET` (default `voiceed-inspire`) as a private Supabase bucket. Review Storage policies so browser roles cannot list/read/write these objects directly; uploads and signed access go through the backend. The application refuses uploads if the bucket is public or its metadata cannot be checked.
3. Schedule the existing-environment command below regularly, for example every fifteen minutes. Each invocation removes at most 100 expired unattached uploads. New staged uploads expire after 24 hours; cancelled/failed uploads expire immediately. Failed object deletions retain metadata for retry. This phase provides the command, but does not install an operating-system scheduler.

```powershell
# Run from backend with the deployment's existing configuration.
.\.venv\Scripts\python.exe -m app.services.inspire_cleanup
```

Live Supabase uploads, deployed storage policies, native sharing on real devices, PDF viewer behavior and browser visual/responsive checks have not been verified. Local HTTP/component checks are not a substitute for the Phase 9 deployed integration tests. Phase 4 ShareED changes have not begun.
