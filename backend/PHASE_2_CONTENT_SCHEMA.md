# Phase 2: content and student verification schema

Revision `a74c9d205ef1` follows `f63a8e014bc2`. No frontend or API behavior is changed in this phase.

## Data representation

- Existing stories and quotes gain nullable PostgreSQL JSONB `body`. Existing text is backfilled as a version-1 paragraph with one unformatted text span. The original text, identifiers, authors, types, timestamps and URLs remain unchanged. HTML-looking text remains literal text. The database checks the version and document root; the allowlisted block/mark validator and safe renderer belong to Phase 3.
- `body` remains nullable during the transition so existing plain-text endpoints continue to create records. Phase 3 must handle null bodies and keep plain-text compatibility columns synchronized with structured edits. Do not use a backfilled body as authoritative after a legacy endpoint has edited the text without synchronizing it.
- `inspire_attachments` stores bucket/path, original name, MIME, size and uploader, never public URLs or binary data. An upload targets at most one existing story/quote; unattached uploads require an expiry. Database triggers enforce matching upload/post owners and prevent reassignment of a linked post. Size is limited to 25 MiB and MIME to PNG/JPEG/PDF. Actual byte validation, private bucket configuration, signed access and orphan cleanup run in Phase 3; no worker or bucket is created here.
- Stories, quotes, comments and resources gain nullable `removed_at`. `moderation_actions` snapshots the target identifier, type, title, author, administrator, reason, date, optional policy reference and private notes. Targets deliberately use snapshots rather than cascading foreign keys so audit history survives later content removal. Phase 6 must write the removal state, audit action and author message atomically and exclude removed content from public queries.
- `moderation_actions.notification_id` links the existing inbox. Clearing a message nulls the link without deleting moderation history. Public removal messages must be composed without internal notes.
- `profiles.is_verified` defaults to false for both existing and new profiles, independent of email confirmation. Verified profiles require `verified_by` and `verified_at`; unverified profiles have neither. Restricted `verification_actions` holds review history and notes. Backend authorization continues to use roles and account activity only.
- Legacy API response fields named `is_verified` still carry email-confirmation information. Phase 7 must explicitly separate the email field from the student-verification field in API/client contracts before displaying a student badge. This phase does not change existing authentication responses.
- Shared resources gain optional bucket/path/name/size fields for a later secure-storage transition. Existing public URLs are retained, not converted or made private by this revision.
- Existing reactions, comments, shares and messages are reused rather than duplicated.

## Access and retention

New tables have RLS enabled and browser-role privileges revoked, with no permissive policies. The trusted backend connection must enforce ownership and administrator/superadministrator authorization when later endpoints are implemented. A profile trigger rejects direct browser-role verification changes even if a deployment permits owner profile updates. Verification notes and moderation notes are absent from public profile/content rows.

Audit actors/authors and attachment owners use restrictive foreign keys to preserve attribution. Later account management should deactivate accounts with retained history rather than blindly deleting profiles. No Supabase Auth system table is modified.

## Validation and rollout

Run from the repository root:

```powershell
node --test backend/tests/phase2_postgres.test.cjs
```

This uses the existing temporary PGlite installation and executes each migration operation separately, matching asyncpg's one-statement preparation requirement. Tests compare ORM schema with PostgreSQL and cover backfill, constraints, RLS, triggers and safe downgrade/upgrade. It does not connect to Supabase.

Before live rollout, confirm the deployed revision and review the existing uncommitted predecessor migration `f63a8e014bc2`. Apply through Alembic using the authorized deployment procedure. The JSONB backfill updates existing post rows and requires a suitable maintenance window for the actual table size. No live migration was run during Phase 2.

Downgrade refuses to discard structured edits, moderation state, storage metadata, attachment rows or verification history. Reconcile/export such records first. On an untouched schema it removes only the new columns/tables and retains original content. Live bucket-policy verification and complete frontend-to-backend flows remain for later phases.
