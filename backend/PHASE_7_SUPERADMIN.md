# Phase 7 completion report — superadministrator dashboard

## Implemented

The new `/super-admin` page puts account administration first, with user and administrator statistics, server-paginated account search and filters, invitations, profile edits, role management, deactivation/restoration, student verification and activity history. Broader platform statistics follow account management. The existing profile menu exposes the page only to superadministrators; every underlying endpoint independently requires an active superadministrator.

Account creation uses Supabase invitations rather than administrator-supplied passwords. Invited accounts start as unverified students. A stable request UUID prevents automatic duplicate invitations. An uncertain invitation outcome requires reconciliation against a Supabase identity with a matching email, without resending the invitation. Permanent deletion is intentionally unavailable: deactivation retains authored content, reporting relationships and audit history. The legacy profile-only DELETE now rejects requests and directs callers to the status workflow.

Role changes revoke existing application sessions. Self-demotion and self-deactivation are rejected. Application checks and a PostgreSQL trigger protect the last active superadministrator; authority changes are serialized with a transaction advisory lock. Browser database roles cannot change account authority, even under a broad profile policy.

Student verification requires notes and explicit confirmation of institutional review. A school ID alone is insufficient. Verification records reviewer and timestamp, retains history and does not change roles or permissions. Authentication responses now distinguish student `is_verified` from `email_verified`. The profile page refreshes its current profile and displays the student badge from the persisted value. Existing local profile fields are no longer overwritten with stale Auth user metadata during sign-in.

Database and Supabase Auth operations are not a single transaction. A private account-action journal records invitations and account updates, including pending/failed synchronization. Deactivation takes effect locally before attempting the remote ban; restoration enables local access only after the remote unban succeeds. Retry synchronizes the current profile state. Failed restoration leaves the account disabled; it does not currently create a separate failed-attempt journal record.

## Files added or modified

- Backend models: `app/models/accounts.py`, `app/models/__init__.py`.
- Backend schemas: `app/schemas/accounts.py`, `app/schemas/__init__.py`.
- Backend services: `app/services/accounts.py`, `app/services/__init__.py`, `app/services/moderation.py`.
- Backend routes: `app/routes/super_admin.py`, `app/routes/__init__.py`, `app/routes/users.py`, `app/routes/auth.py`.
- Database: `alembic/versions/da7f20538bc4_account_administration.py`.
- Backend validation: `tests/test_accounts_flow.py`, `tests/inspire_test_server.py`, `tests/migration_sql.py`, `tests/phase2_postgres.test.cjs`, `.gitignore`.
- Frontend: `app/super-admin/page.jsx`, `services/super.js`, `app/profile/page.jsx`, `components/shared/Navbar.jsx`, `context/AuthContext.tsx`, `tests/super-flow.test.cjs`, `tests/service-pages.test.cjs`, `.gitignore`.
- Documentation: this report. Existing unrelated changes and previous-phase files were preserved. No dependencies were added or JSX files converted to TSX.

## Database changes

New revision **`da7f20538bc4`**, following **`c96e1f427ab3`**, adds the indexed `account_actions` journal, restricts direct browser access with RLS and privileges, and installs the account-authority protection trigger. Downgrade refuses to discard persisted journal history. It reuses existing profile verification fields and `verification_actions`.

The complete migration chain was tested locally. **No migration was applied to live Supabase.** Deploy the reviewed chain before deploying the new routes.

## API endpoints

Added under `/api/v1/super`, all requiring an active superadministrator and returning private, non-cacheable responses:

- `GET /stats`
- `GET /users` — bounded page/limit, search, role, verification, active-state and sort parameters
- `POST /users/invite`
- `GET /users/{id}` — profile and bounded verification history
- `PATCH /users/{id}` — editable profile fields and role, with a required reason
- `POST /users/{id}/status` — deactivation/restoration with a required reason
- `POST /users/{id}/verification`
- `GET /audit` — paginated account actions, with actor/target/status filters
- `POST /actions/{id}/retry`
- `POST /actions/{id}/recover-invitation`
- `GET /moderation` — paginated moderation history with an actor filter

Legacy `/api/v1/users/admin` listing and update routes delegate to the guarded account service; legacy DELETE returns a conflict. Existing auth/profile responses expose actual student verification separately from email confirmation. No password, email or arbitrary authority fields are accepted by the profile-edit schema.

## Locally tested

- **97 backend tests passed**, including ten account-management tests covering authorization, filtered pagination/statistics, verification independence, required institutional review, last-superadministrator protections, legacy bypass rejection, session revocation, audited role changes, failed remote suspension and retry, failed restoration, invitation idempotency, invitation recovery and restricted edit fields. Existing authentication, reporting, moderation and content tests passed.
- **69 frontend tests passed**, including four new tests covering role gating before API requests, account-first layout, debounced filters and pagination, institutional-review requirements, and the actual frontend account service against a local FastAPI HTTP fixture.
- The HTTP account flow covers invitation, role changes, verification, suspension, restoration, audit retrieval and rejection of ordinary administrators. It uses isolated SQLite and a mocked Supabase Admin API; it does not test live Supabase identity operations.
- **32 isolated PostgreSQL checks passed**, covering migrations, schema parity, RLS, authority guards, last-superadministrator protection and guarded downgrade. These use PGlite; live multi-connection concurrency was not tested.
- `npm.cmd run build` passed and includes `/super-admin`. The existing configuration skips type checking; the existing React 18 deprecation warning remains.
- `git diff --check` passed. Existing Python datetime deprecation warnings remain.

## Remaining deployment verification

Nothing in this phase is claimed verified against live Supabase. Confirm service-role Admin API configuration, invitation email delivery, callback redirect allowlisting, invitation acceptance/onboarding, real ban/unban behavior and recovery of remote failures in the deployment environment. Review the new migration before applying it. A real browser responsive/visual pass and live PostgreSQL concurrency verification remain outstanding.

Phase 8 (backend optimization) has not started and awaits approval.
