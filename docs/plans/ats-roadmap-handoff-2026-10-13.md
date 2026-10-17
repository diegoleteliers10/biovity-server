# Handoff: Biovity ATS roadmap

Updated: 2026-10-16

## Current status 2026-10-16

The user chose to finish roadmap items 2–5 before Google Calendar. Keep Calendar last. Preserve all existing changes. Do not stage, commit, deploy, start servers, or run builds. The user authorized Supabase migrations and test rows that are removed after checks.

The backend now exports candidate data and applies the approved 24-month retention policy after all applications close. Supabase applied `candidate_data_retention_lifecycle` and `restrict_candidate_lifecycle_audit_grants`. Both appear in the remote migration list. The TypeORM ledger records `CandidateDataLifecycle1791800000043`. A SQL smoke block confirmed the inactive-candidate trigger and rolled back all test rows. A read-only check confirmed that `service_role` has only `SELECT` and `INSERT` on the audit table, with RLS enabled and no access for `anon` or `authenticated`.

The code now includes offer PDFs in the storage cleanup queue, handles inactive candidates, exports historical profile snapshots, and locks and rereads a profile row before it saves. Focused backend Jest, ESLint, and `tsc --noEmit` passed. Frontend typecheck and 21 focused Node tests passed. A PostgreSQL test with two concurrent connections remains open.

Sentinel approved this review with no blocking findings. It covered candidate export, retention, file cleanup, ATS-07 permissions, and migrations. Its concurrency check covers the row lock in a unit test, not with two PostgreSQL connections. The full route and data ownership audit remains open.

Migration reconciliation on 2026-10-16 found all 32 local Next.js SQL migrations in `public.migrations` and all 18 local backend Supabase migrations in the remote history. No local migration remains pending. The Supabase history also has TypeORM migration entries and older entries without a local SQL migration file.

Still open: confirm scheduled cron and email delivery after deployment; finish the ATS-07 route and data-ownership audit; test concurrent PostgreSQL updates; complete manual portal review; define retention periods for email, AI, logs, backups, and other processors. Google Calendar remains last. Production OAuth, cron, and UI checks remain open.

## Goal

Continue the full Biovity ATS, professional portal, and internal hiring operations roadmap. Work across both repositories. The offer expiry work below is the current stopping point, not the full scope.

## Repositories and working rules

- Frontend: `/Users/dleteliers/Dev/biovity`
- Backend: `/Users/dleteliers/Dev/biovity-server`
- Read `/Users/dleteliers/Dev/biovity/AGENTS.md` before frontend work. No backend `AGENTS.md` existed when this handoff was checked.
- Preserve all staged, unstaged, and untracked changes. Both repositories contain extensive work from earlier roadmap tasks.
- Do not stage, commit, deploy, start servers, or run builds. The user will review the portal manually.
- The user authorized direct Supabase migrations and test data that is removed after each check.
- Keep updating the shared roadmap and task plan as work moves forward.
- Use the current model when project instructions request a worker model that is unavailable.
- The user approved a default offer response period of 7 days. The organizer can edit the date for each offer.

## Current stopping point

The offer lifecycle is implemented across the frontend and backend. An offer defaults to 7 days. The organizer can edit its last response date in `America/Santiago`. The backend stores the start of the next local day as UTC. Recruiters can resend or cancel an unanswered offer. A cron expires offers in batches of 100 with `FOR UPDATE SKIP LOCKED`.

Resend creates a PDF with the updated date, stores its path and expiry in a transaction, marks old chat cards as superseded, sends a new message, queues a notice, and records an audit event. The candidate response update checks expiry atomically. The API validates the PDF path. Old offer cards now derive status from the current realtime message, so a replaced card stops showing response controls.

Sentinel approved the code after review. The Supabase migration `1791800000040-OfferLetterExpiryActions` is applied to project `ozdaoqgtvjdfkpqosnnj` and is recorded in both migration ledgers. The database check confirmed the expiry column, both indexes, RLS on the audit table, and no Data API grants for `anon`, `authenticated`, or `service_role`. An audit insert check succeeded and deleted its row in the same transaction. The final query found zero audit rows, zero offers without an expiry, and zero sent offers.

Local checks passed:

- Frontend: `bun typecheck`, Biome, and 33 Node tests across `data-flows`, `offer-letter-resend`, and `offer-message-status`.
- Backend: `npx tsc --noEmit` and 2 focused Jest suites with 6 tests.
- No browser or production UI check has run. The user will do that manually.

## Supabase advisor result

The security advisor reports `RLS Enabled No Policy` for internal tables, including `offer_letter_action_audit`. The app uses direct backend Postgres access, and the migration revokes Data API access from API roles. This matches the existing internal-table pattern.

Sentinel approved the follow-up migration `1791800000041-OfferLetterActionAuditActorIndex`. The migration creates `idx_offer_letter_action_audit_actor` on `actor_id`. Supabase and TypeORM both record it. The advisor no longer reports this foreign key as unindexed. It still reports the new indexes as unused because they have not supported a query yet.

The `.gitignore` allowlist now includes migrations `1791800000040` and `1791800000041`. Git can include both migration source files in the eventual PR.

## Decisions and local work after the offer index

The user chose one shared Google Calendar connection per organization and one personal connection per professional. OAuth is a profile integration. It does not sign users in. Biovity creates, updates, and cancels events in Google from the ATS. Google-side edits do not sync back.

Local code now includes OAuth routes, encrypted refresh-token storage, event sync status, organization and professional profile controls, and a protected retry endpoint. The frontend Vercel project now has a daily retry route. Vercel Hobby supports daily cron only. Event writes sync at once. The retry handles failed events later.

The TypeORM migration `1791800000042-GoogleCalendarIntegration` is applied to the active Supabase project and recorded in both Supabase and TypeORM migration ledgers. It adds event destination selection (`biovity` or `google`), Google connection and OAuth state tables, RLS, and revokes Data API access from `PUBLIC`, `anon`, `authenticated`, and `service_role`. The event form supports native Biovity events and events synced to the connected Google Calendar. The approved callbacks are `https://biovity.cl/oauth2callback` and `https://localhost:3000/oauth2callback`. Credentials and the Google Cloud OAuth client still need setup. The deployment cron and manual portal flow remain unverified.

The user approved a 24-month retention period after case closure, followed by deletion or anonymization. This is Biovity's chosen policy, not a period set by law. [Ley 21.719](https://www.bcn.cl/leychile/navegar?idNorma=1209272) requires proportional retention and takes effect on 2026-12-01. Local retention, export, and deletion code is implemented, and its migrations are applied. Provider and backup retention rules remain open.

## Continuation 2026-10-13

The custom-stage cohort and detail SQL passed `EXPLAIN` in Supabase. The selected period returned no custom-stage rows, so result behavior with rows remains open. Response-time SQL returned one application with a first response under 24 hours. Closed-stage SQL returned three visits from one application with a 1.650-day average. The funnel counted one application that reached interview, offer, and hire.

The hiring-time check found an initial `contratado` history row at application creation and a later candidate offer acceptance. The old `MIN(changed_at)` selected the initial zero-duration row. Funnel, source attribution, and hiring-time queries now require a previous status. Hiring-time also requires a `stage` transition. The later acceptance remains eligible. Supabase returned a 4.950-day interval. Focused Jest passed 13 tests. Browser review and historical timestamp semantics remain open.

Sentinel approved the change. Backend typecheck and Prettier checks passed for the TypeScript files and task plan. The backend roadmap has a pre-existing Prettier failure on its baseline `HEAD` version.

Source attribution verification also ran in Supabase for the Santiago-local cohort from 2026-09-13 through 2026-10-13. It returned one aggregate `unknown / unknown` row with one application reaching interview and one hire. This validates the query with current data; portal review remains open.

Migration audit 2026-10-13: all local SQL and TypeORM migrations are registered. The audit found `021_short_links.sql` pending. It is now applied. Supabase confirms the table and index exist, RLS is enabled, and `anon`, `authenticated`, and `service_role` have no table permissions. A PostgreSQL block inserted and deleted one temporary row. A later query confirmed the row was gone. Both migration ledgers record the migration. Sentinel approved it. Supabase reports an INFO finding for RLS without a policy on `short_link`; API roles have no table grants.

## Roadmap sources

- Backend roadmap: `/Users/dleteliers/Dev/biovity-server/docs/plans/backend-roadmap.md`
- ATS task plan: `/Users/dleteliers/Dev/biovity-server/odd/tasks/ats-portal-improvements.md`
- Frontend project guide and design rules: `/Users/dleteliers/Dev/biovity/AGENTS.md` and `/Users/dleteliers/Dev/biovity/DESIGN.md`
- Backend project guide: `/Users/dleteliers/Dev/biovity-server/AGENTS.md`

Read the current status in both roadmap files. Continue with the next unfinished frontend or backend task after the offer index follow-up. Keep the full roadmap scope. Do not stop after the offer feature.

## First actions in the next conversation

1. Read this handoff and both `AGENTS.md` files.
2. Check `git status` in both repositories. Do not reset or clean either repository.
3. Inspect the current roadmap rows and open tasks. Confirm they still match the code and database.
4. Choose the next unfinished roadmap item across frontend and backend, implement it, verify it, and update the roadmap.
