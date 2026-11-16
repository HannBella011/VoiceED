# Phase 9 integration verification

## Scope and implementation

Added a whole-router integration harness that exercises the existing application routes with real signed API tokens, database-backed API sessions, role dependencies and separate ORM sessions for requests. Authentication and authorization dependencies are not replaced. The local version uses SQLite; the explicitly enabled live version uses the configured Supabase PostgreSQL database and approved existing test accounts.

The live harness binds all application sessions to one externally managed transaction, with application commits releasing savepoints. Teardown rolls back the outer transaction and checks that test posts/reports and the current test API tokens are absent and original account role/active/verification fields are restored. This verifies persistence across application requests, not independent-connection visibility of committed test content. PostgreSQL sequences may advance despite rollback.

The frontend bridge starts a loopback HTTP server using the real API router and runs the repository's JavaScript service modules in Node. Tokens arrive through stdin, remain in memory and are not printed or saved. This exercises frontend service -> real HTTP -> FastAPI -> configured PostgreSQL. It does not render a browser or test browser cookie/CORS behavior.

The private attachment test uses real Supabase Storage, validates attachment metadata and downloads the signed object to compare bytes. Its finally block removes only objects associated with its unique test filename and account. Database attachment metadata rolls back with the transaction. This is a file transfer check, not PDF rendering verification.

Supabase Auth Admin operations are mocked in the account status tests: they exercise local role/status/verification/audit changes and session revocation against the real database without remotely banning, unbanning or emailing existing accounts. API sessions are issued by the actual application session service after selecting the approved accounts, rather than by supplying their passwords or exercising a fresh Supabase sign-in.

## Files changed in this phase

- `tests/test_integration_flow.py` — local and opt-in live application integration harness, cross-feature flows and rollback checks.
- `tests/live_service_client.cjs` — actual frontend service calls over HTTP for the live test.
- `tests/live_preflight.py` — read-only migration/column readiness and optional approved-account existence/role checks; errors omit connection details.
- `app/services/accounts.py` — explicitly refresh the profile after verification commits, before serializing server-updated fields.
- `.gitignore` — expose these integration utilities for review.
- This report. Pre-existing fixture, navigation and other user edits were preserved.

No product routes, response schemas, frontend components or styles were changed. The verification service fix preserves its API contract. No dependencies were added.

## Database and API coverage

No new Alembic revision or migration application was needed. Read-only inspection confirmed the live database is at **`eb8031649cd5`**, with no missing ORM columns. The configured InspireED Storage bucket returned 404. It was created as a **private** bucket with a 25 MB per-file limit and PDF/PNG/JPEG MIME restrictions. This bucket remains available to the application; the disposable uploaded test object was removed.

The harness covers existing InspireED feeds/details/reactions/comments/shares/attachments, ShareED search/download counts, personal dashboard summaries, administrator content/statistics/removals/audit, author inbox messages, superadministrator account/statistics/role/status/verification/audit, auth/me and anonymous report submission/tracking/review endpoints.

Test account emails are supplied through environment variables and are not hardcoded in the test source. An initially supplied student address was absent from both Auth and profiles; the corrected address supplied during this phase is used for the live suite. The administrator and superadministrator profiles were confirmed active with the expected roles.

## Reproducing the checks

From `backend`, set `DEBUG=false` and run:

```powershell
.\.venv\Scripts\python.exe -B -m unittest discover -s tests -p 'test_*.py'
.\.venv\Scripts\python.exe -B tests/live_preflight.py
```

The normal suite skips live cases. For an explicitly approved live run, supply active test accounts with their expected roles:

```powershell
$env:DEBUG='false'
$env:VOICEED_LIVE_INTEGRATION='1'
$env:VOICEED_TEST_STUDENT_EMAIL='<approved student email>'
$env:VOICEED_TEST_ADMIN_EMAIL='<approved administrator email>'
$env:VOICEED_TEST_SUPER_EMAIL='<approved superadministrator email>'
.\.venv\Scripts\python.exe -B -m unittest discover -s tests -p test_integration_flow.py
```

The live suite requires backend dependencies, Node, installed frontend dependencies, network access, the configured database and service-role Storage access. It uploads one disposable private attachment and removes it. Do not enable the live suite as part of ordinary unattended unit tests.

## Results

- **103 local backend tests passed**; seven additional opt-in live tests are skipped in ordinary discovery (110 discovered in total).
- **70 frontend tests passed**, including local frontend-service HTTP fixtures and component behavior regressions.
- **33 isolated PostgreSQL checks passed**, covering migrations, schema parity, constraints, RLS, rollback guards and index eligibility.
- **Seven distinct live integration cases passed across the initial run and targeted reruns.** The initial live run passed five cases and exposed two failures: verification response serialization and unavailable private Storage. After fixing the service and provisioning the missing bucket, each previously failing live case passed its targeted rerun. This is not a claim that a single final uninterrupted seven-case run was executed.
- The live cases cover anonymous reporting/retry/private tracking, content/social/dashboard/moderation, administrative read views, anonymous report review, frontend service HTTP flows, private Storage transfer, and verification/role/status/session behavior.
- `npm.cmd run build`, JavaScript syntax checking and `git diff --check` passed.

| Requested behavior | Evidence and boundary |
| --- | --- |
| Post persistence and rich formatting | Actual PostgreSQL create/read across new ORM sessions; bold/italic/underline, list blocks and emoji retain their structured representation. Frontend service HTTP round trip also passed. Outer transaction is rolled back after testing. |
| Attachments | Local frontend HTTP fixture and live private bucket upload, metadata linking, signed URL and byte-for-byte download passed. Browser rendering remains unchecked. |
| Duplicate likes and comment pages | Repeated reaction PUT remains one like; comments persist and adjacent bounded pages have distinct IDs on live PostgreSQL. |
| Share links | Actual frontend share helper produces the direct URL and records a completed share through the live backend. Clipboard implementation is a test stub. |
| ShareED search and pagination | Actual frontend service sends search/limit to live backend; PostgreSQL returns one matching seeded resource and download increment persists across requests. This live case seeds its resource metadata; real ShareED file upload remains covered locally with mocked storage. |
| Dashboard totals | Live baseline plus new owned story/reaction, followed by moderation removal, produces the expected count changes. |
| Moderation and notifications | Administrator/superadministrator removal persists in the test transaction, hides public detail and delivers the sanitized author inbox message; restricted notes stay in administrative review. Frontend HTTP flow passed. |
| Account roles and verification | Live database verification persists across requests without granting admin access; promotion revokes existing API sessions, a fresh session gains admin access, suspension revokes it and restoration requires a new session. Auth Admin ban/unban is mocked. |
| Existing authentication/reporting | Real application JWT/session validation and role guards are used throughout. Local auth/recovery/refresh/report regressions pass. Live anonymous receipt idempotency, private tracking and administrative report review passed. Fresh Supabase sign-in is not tested. |
| Visual preservation | No product component/style changes in this phase; component regressions and build pass. A browser visual comparison has not been performed. |

The verification bug was specific to asynchronous ORM use: `updated_at` is generated by the database when verification fields change, so serializing the expired value after commit attempted implicit I/O and raised `MissingGreenlet`. Explicitly awaiting a profile refresh before serialization resolves the live failure. Synchronous SQLite fixtures had not exposed it.

## Remaining verification boundaries

Fresh Supabase password/OAuth sign-in, invitation delivery/acceptance, live Auth ban/unban behavior, multi-connection concurrency and a browser visual/responsive pass are outside the checks above. There is no installed browser automation package or browser tool in this environment, so the existing component regression tests and production build do not establish visual equivalence. Existing type-check skipping, React 18 deprecation and Python datetime warnings remain.
