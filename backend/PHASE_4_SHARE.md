# Phase 4 completion report — ShareED

## Implemented

The audit confirmed SQL offset/limit pagination already existed, but the page drained every API page and then searched, filtered and sliced the complete collection locally. The page now requests exactly six records per page with authoritative totals and next-page state. Search, subject, resource type, file format and sorting are applied by SQLAlchemy before pagination. Search is debounced by 300 ms; aborted/stale responses are ignored, and filter/sort state persists through Previous/Next navigation.

Production PostgreSQL search uses a GIN-indexed `simple` text-search vector over title, subject and description. Every alphanumeric search token is a word prefix, and multiple tokens must all match. For example, `databas CS1` finds database resources for CS101. Punctuation is not interpreted as SQL or tsquery syntax. This is prefix-word search, not arbitrary substring/fuzzy matching. The SQLite test adapter uses bound token matching; separate PostgreSQL tests execute the actual production query.

Available sorting is newest, oldest, title and download count, each with an ID tie-breaker. Queries select only the resource fields needed by the page and batch-load uploader names. Removed resources are excluded from listings, subjects, details and download requests. Subject options come from a distinct-column query, without fetching resource records. Format options represent supported upload MIME types; JPG/JPEG share one filter.

The existing combined search/listing card is split into two primary sections named **Resource Search**: the first contains the single set of search/filter/sort controls, and the second contains results and pagination. Existing cards, previews and download controls remain. The permanent upload section is now opened by an **Upload** button. The modal retains the existing form fields and styling, supports Escape/focus handling, blocks duplicate submission and closing while saving, retains inputs after errors, closes after success and refreshes the listing without a document reload. Upload size reads are bounded at 25 MiB plus one byte rather than reading an arbitrarily large file into memory.

The existing ShareED Supabase Storage upload integration remains in place. Preview does not increment download count; accepted download clicks do. When sorting by downloads, a completed count update refreshes the database ordering.

## Files changed in this phase

- Backend: `.gitignore`, `app/models/__init__.py`, `app/routes/share.py`, `app/services/__init__.py`, new `app/services/share_search.py`, new `alembic/versions/b85d0e316fa2_share_search_indexes.py`, `tests/test_share_flow.py`, `tests/inspire_test_server.py`, `tests/migration_sql.py`, `tests/phase2_postgres.test.cjs`, this report.
- Frontend: `.gitignore`, `app/share-ed/page.jsx`, new `app/share-ed/share.css`, `services/share.js`, new `tests/share-flow.test.cjs`.
- Ignore exceptions expose the migration regression tests and new ShareED tests for review. Existing staged work from previous phases and unrelated files was preserved.

## Database changes

Alembic revision **`b85d0e316fa2`**, following `a74c9d205ef1`, adds two indexes on visible resources:

- `ix_shared_materials_search`: partial GIN expression index for multi-field prefix-word search.
- `ix_shared_materials_visible_created`: partial `(created_at, id)` index for the default feed order, complementing the existing subject/created index.

No tables, columns or records are deleted or rewritten. Downgrade removes only the two new indexes. The migration uses ordinary transactional index creation; allow for write locking while building indexes on a large deployment. It has **not** been applied to live Supabase.

## API changes

No route paths were added. `GET /api/v1/share/materials` now accepts `search`, `resource_type`, `file_format`, `sort` and `envelope` alongside subject/page/limit. With `envelope=true`, it returns `items`, `total`, `page`, `limit`, `total_pages` and `has_more`. Its default remains the existing list response for compatibility. Unknown sorts/formats/types and invalid pagination are rejected.

Material detail/download and subject/file-type queries now exclude removed resources. `POST /materials` preserves the multipart fields and Storage integration while bounding the file read. Existing backend authentication and ownership checks remain enforced.

## Locally tested

- **69 backend tests passed**, including eleven ShareED tests: filter-before-pagination semantics, accurate totals, stable sorting, disjoint pages, anonymous uploader privacy, input validation, removed-resource exclusion, oversized uploads, persistence, preview and download counts.
- **53 frontend tests passed**, including five new ShareED tests: one-page requests, backend filter/sort preservation, modal fields, failed-upload retry, duplicate-submit prevention, close/refresh on success, guest login notification, preview/download distinction and stale-response handling.
- A new frontend-service HTTP test uploads thirteen resources through FastAPI, retrieves filtered database pages, verifies anonymity, reads uploaded fixture bytes and confirms download counts persist. It uses SQLite and mocked Supabase Storage/authentication, not live Supabase.
- **29 isolated PostgreSQL checks passed**, covering the complete migration chain, schema/index parity, upgrade/downgrade, production SQLAlchemy prefix search and removed-row filtering. An EXPLAIN check verifies GIN index eligibility using representative test rows with sequential scans disabled; it is not a live performance benchmark.
- `npm.cmd run build` passed. Existing type-check skipping and React 18 deprecation warnings remain unchanged.
- Local Alembic head is `b85d0e316fa2`; `git diff --check` passed.

## Remaining dependencies and verification

Apply the reviewed Alembic chain through the authorized deployment workflow before relying on the new indexes. Live Supabase query plans, bucket configuration, uploads/downloads and browser visual/responsive behavior remain unverified. This phase does not convert legacy ShareED public URLs into a private-object storage scheme; actual access continues to depend on the existing bucket configuration. Existing private objects must retain restrictive Storage policies. No Storage policies or remote data were changed.

Phase 5 navbar and user-dashboard work has not begun.
