# ReportED four-step implementation

Implemented from the supplied prompt and sketch. Existing VoiceED colors, cards, navbar, footer, supporting emergency resources, FastAPI report services, storage and HTML email service are retained.

## Audit and completed phases

1. The generated tracking code was rendered inside the supporting Find Help section rather than the submission receipt. Reporter inputs were not submitted as a snapshot, named guests were unsupported, and email results were discarded.
2. The submission card now appears first with four steps: User Information, Report Details, Confirmation and Tracking ID. Back is on the left, Next/Submit on the right, with four progress indicators below. Previous steps preserve entries; future steps cannot bypass validation. A short transition respects reduced motion.
3. Named accounts prefill five fields from verified API profile data. Corrections are saved with the report, without changing the profile. Named guests need no account. Anonymous mode clears the identity fields and uses a public request without account credentials; an optional contact email carries an explicit privacy caveat.
4. Seven incident categories, editable local incident time, location, description and multiple removable PNG/JPEG/PDF files are supported. Each file is limited to 25 MiB; the API also checks content signatures. Confirmation summarizes the submitted information before any write.
5. The final receipt displays the actual committed report code and timestamp, with copy buttons and a private tracking link. A request key, content fingerprint, PostgreSQL advisory lock and unique constraint protect unchanged retries. Tracking-code collisions retry securely; failed commits produce no success receipt.
6. Named accounts receive notifications at their registered email; guests use the submitted email and anonymous reports use only their optional contact address. Sending occurs after the report commit. SMTP acceptance is described as acceptance for sending, not confirmed delivery. Failures preserve the report and visibly warn the user. Replaying a completed submission does not send another email.
7. Short-code tracking exposes limited status. Detailed updates and shared evidence require the private link or an authorized account. A database counter limits tracking attempts across workers and both public route aliases. Reporter snapshots remain outside public tracking responses. Restrictive RLS rules prevent Supabase browser roles from bypassing the API to read report, attachment or timeline tables, including when an older permissive policy exists.

## Main files

- `frontend/components/features/report/ReportSubmission.jsx` and its CSS module: wizard, review and receipt.
- `frontend/lib/reportSubmission.js`: validation, anonymous payload filtering and hashed retry reference.
- `frontend/app/report-ed/page.jsx`: submission-first layout; `/report` shares the same page.
- `frontend/services/reports.js` and `frontend/app/track/[code]/page.jsx`: API submission and private tracking access.
- `backend/app/services/report_submission.py`: atomic save, idempotency, notification receipt and tracking authorization.
- `backend/app/routes/reports.py`, `tracking.py`, schemas and models: endpoints and persistence fields.
- `backend/alembic/versions/e52f7d903ab1_report_submission_receipts.py`: additive migration following `d4a82e901c73`.

## Verification and limits

Local backend unittest suite: 55 passing tests. Frontend suite: 39 passing tests, including state preservation, confirmation, named prefill, anonymous filtering, copy outcomes, failure retention and duplicate-click prevention. Isolated PGlite suite: 21 passing tests including the suite container, covering PostgreSQL schema parity, constraints, RLS and guarded rollback. Production frontend build and TypeScript check pass.

Tests use local databases and mocked storage/email. No live database migration or real email delivery was performed. Browser interaction, mobile appearance, Supabase storage uploads and actual SMTP delivery still require the manual smoke checks in `MANUAL_ACTIONS.md`. The build reports the existing React 18 deprecation warning. The backend tests use unittest discovery; broad pytest collection also collects standalone migration helpers and is not the supported runner.

The current `backend/.gitignore` ignores `tests`. Updated backend regression tests and the PGlite harness are present locally but will need deliberate inclusion if they should be committed. The ignore rule was preserved.
