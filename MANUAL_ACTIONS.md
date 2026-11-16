# ReportED manual actions

## Apply the database migration

Before running the updated backend against your database, activate its existing virtual environment and run from `backend`:

```powershell
alembic current
alembic upgrade head
alembic current
```

Expected new head: `f63a8e014bc2`. This includes the report receipt migration `e52f7d903ab1` and the Moderator-to-Admin migration. Upgrade directly; no downgrade is needed. Back up the database using your normal deployment process. The migration adds reporter snapshots, retry references, private tracking hashes, notification status, private tracking rate counters and restrictive RLS for the report tables. It does not delete existing reports. Downgrade intentionally refuses to discard newly saved report data and retains RLS protection.

## Confirm deployment settings

- Keep the backend `SECRET_KEY` configured and stable across workers and restarts. It derives retry receipt links and tracking counter keys. Plan key rotation: existing stored private-link hashes remain valid, but regenerating an old receipt after rotation produces a different token.
- Confirm `FRONTEND_URL` points at the frontend so emailed tracking links and the logo use the right host.
- Use the existing backend SMTP settings for report receipts. Supabase Auth SMTP settings alone do not configure this application's backend email service. Test with an address your provider permits.
- Keep the evidence bucket private and allow `image/png`, `image/jpeg`, `application/pdf`, with a limit of at least 25 MiB per file. Keep the existing trusted backend storage permissions.
- Tracking throttles trust the ASGI client address. In deployment, configure trusted proxy handling at the server/ingress; do not trust arbitrary forwarded headers. Requests sharing one observed proxy address share its 30-per-minute allowance.

## Browser smoke checks after upgrading

1. Submit a named report while logged in. Confirm all five identity fields prefill. Edit a field, go Back/Next, review and submit. Confirm the saved report snapshot changes but the account profile does not.
2. Submit a named report while logged out. Confirm no login is required.
3. Submit anonymously both logged in and logged out, with and without optional email. Confirm the review contains no account identity and the saved report has no account association.
4. Try PNG, JPEG and PDF evidence, remove a selection, then test an unsupported and oversized file. Confirm failed submission retains all entries.
5. Double-click Submit and retry an interrupted request. Confirm one report/code and one email attempt for the unchanged submission.
6. Confirm Step Four shows the saved code and time. Try both copy buttons, the private tracking link and the return action. A code-only tracking URL should show limited status; the private link should show permitted updates without login.
7. Test allowed SMTP sending and a controlled email failure. A mail failure must still show the saved report and its tracking code. Check the actual inbox separately from the application's acceptance message.
8. Check desktop and narrow mobile layouts, keyboard navigation, progress dots and reduced-motion preference. Confirm emergency resources and the map remain below the submission card.

No live migration or email was performed during implementation. See `REPORT_ED_IMPLEMENTATION.md` for scope and local verification.

## Consolidated roles

Supported roles are Student, Admin and Super Admin. The new migration converts all existing Moderator accounts to Admin, preserving their IDs, report assignments and access. The API and UI no longer accept Moderator. A database constraint rejects it too; the historical PostgreSQL enum label remains unused to avoid rebuilding the enum type. Downgrading does not try to guess which admins used to be moderators. Restart the backend after upgrading and sign in again to refresh the displayed role.
