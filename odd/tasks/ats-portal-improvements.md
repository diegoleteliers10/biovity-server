# Biovity ATS and portal improvements

## Objective

Implement the approved ATS, professional portal, and internal operations improvements across `biovity` and `biovity-server`. Update the shared roadmap and verify each delivered flow against current code.

## Reconciliación de auditoría 2026-10-17

El estado abierto de ATS-07 en las notas anteriores quedó supersedido por la actualización de cierre al final de este documento. Las notas siguientes conservan su estado histórico.

- Los 23 controladores ATS revisados usan los guards globales de sesión y rol. Las rutas internas usan `InternalSecretGuard` y `INTERNAL_API_KEY`.
- La prueba local de `OrganizationAccessService` pasó 4 casos en PostgreSQL con tablas temporales y rollback. La validación de URL rechaza overrides remotos de `host` y `hostaddr`, incluso con `host` codificado. No cubre cada repositorio ni cada endpoint con una sesión HTTP real.
- En la base activa, las 98 tablas públicas tienen RLS, incluida `public.migrations`. La migración 033 revocó grants API en 17 tablas y cuatro secuencias. La consulta posterior encontró cero grants para `PUBLIC`, `anon` y `authenticated`. Las tablas ya tenían RLS y ninguna tenía políticas.
- Las tablas son `account`, `capsule_module_progress`, `capsule_progress`, `certificates`, `job`, `job_question`, `notification`, `organization`, `resume`, `salary_submissions`, `saved_job`, `saved_search`, `session`, `subscription`, `user`, `verification` y `waitlist`.
- Las secuencias son `admin_operations_queue_assignment_audit_id_seq`, `contact_message_events_id_seq`, `contact_messages_id_seq` y `migrations_id_seq`.
- `typeorm migration:show` registra todas las migraciones TypeORM locales como aplicadas. Supabase registra las 18 migraciones SQL locales del backend y las 33 migraciones Next.js, incluida `033_revoke_default_api_grants.sql`.
- GitHub Actions es el único programador local. `vercel.json` ya no contiene crons. No se verificó la ejecución real de Actions, sus secretos ni el envío de correo.
- Los estados anteriores sobre migraciones pendientes y cron de Vercel son históricos y quedan supersedidos. Google Calendar queda aplazado.
- ATS-07 sigue abierto. La matriz método por método ya está en `docs/audits/ats-07-route-matrix.md`. Faltan pruebas HTTP con sesión y cobertura actor/recurso para los grupos que la matriz marca sin spec.

## Current reconciliation (2026-10-17)

The backend now implements the approved 24-month candidate retention policy and admin export. Supabase applied `candidate_data_retention_lifecycle` and `restrict_candidate_lifecycle_audit_grants`. Both are in the remote migration history. The TypeORM ledger records `CandidateDataLifecycle1791800000043`. A PostgreSQL smoke block confirmed that the trigger blocks applications for inactive candidates and rolls back all test rows. RLS and audit grants are verified.

The cleanup also includes offer PDFs and inactive candidate accounts. The export includes historical profile snapshots. Profile updates lock and reread the row before they save. A two-connection test on a disposable local PostgreSQL database confirmed that an update waits for anonymization, sees the inactive state, and cannot restore stale profile data. The test used the same row-lock strategy, not the full TypeORM repository. The temporary database was dropped.

Sentinel approved the lifecycle review with no blocking findings. The review covers export, retention, storage cleanup, related permissions, and migrations. It does not complete the full ATS-07 route audit. The later local two-connection SQL smoke test checks the lock/read sequence in an isolated schema, not the TypeORM repository.

At that check, `public.migrations` had all 32 local Next.js SQL migrations and the remote history had all 18 local backend Supabase migrations. Migration `033_revoke_default_api_grants.sql` was applied and verified on 2026-10-17.

The next ATS-07 pass fixed the interview outcome role, candidate-tag eligibility, saved-candidate response data, chat ownership, onboarding role checks, and offer PDF role checks. Jest passed 15 backend tests. The frontend passed 8 focused ownership tests and 18 email worker tests. Frontend typecheck and targeted Biome checks passed. Backend Jest passed with the repository runner. `bun test` does not load the TypeORM entity cycle correctly.

The `POST /api/v1/saved-candidates` route now checks that the target is an active professional inside a transaction. It locks the user row before it checks eligibility and saves the record. The list and count queries omit inactive accounts and non-professional users. The controller rejects unauthorized organization access before it calls the service. The focused backend suites passed 10 tests, `npx tsc --noEmit`, ESLint, Prettier, and `git diff --check`. No migration was needed. The full ATS-07 route matrix remains open.

The interview records route now sends separate `canViewOutcome` and `canDecideOutcome` capabilities. Read-only organization members keep the read-only result. Only recruiters and admins get the outcome editor. The backend controller suite passed 11 tests. The frontend API and UI suites passed 4 tests. Both typechecks, targeted ESLint, Biome, and whitespace checks passed.

The email worker now removes expired `sent`, `dead`, and `suppressed` messages and their retry audit rows. It also runs this cleanup when `RESEND_API_KEY` is missing. No migration was needed. The local GitHub Actions workflow schedules queue workers every five minutes, CV cleanup daily, and organization digests weekly. It requires `CRON_SECRET` and `EMAIL_OUTBOX_SECRET` in GitHub. No production execution was verified because the local changes are not deployed.

Still open: complete the ATS-07 route and ownership matrix; configure GitHub Actions secrets and verify cron and email delivery after deployment; perform the user's manual portal checks; set and verify retention for external processors and backups; reconcile old roadmap notes. Google Calendar stays last. Its production OAuth, cron, and UI checks remain open.

The SQL and TypeORM migration inventory was checked against Supabase. The two lifecycle migrations above were applied for candidate retention. Migration `033_revoke_default_api_grants.sql` was applied later on 2026-10-17. Keep each migration in its owner repository.

### Earlier reconciliation (2026-10-13)

The local SQL and TypeORM migration inventory is complete. Migration `021_short_links` is applied and verified. This does not close the roadmap.

The backend deploys through a Vercel Node serverless function. `vercel.json` has no `crons` entries. NestJS `@Cron` handlers therefore have no verified production trigger. The weekly metrics task only writes reports to logs. It does not send email. Cron dispatch and scheduled summary delivery remain open.

ATS-07-9 moves the missing-session check in `GET /applications/:id` before the application read. Focused tests cover unauthenticated denial before service access, authorized recruiter access, and denied organization access. ATS-07 remains open for all routes, database-backed ownership, rollback, concurrency, internal-key boundaries, and the candidate-tag ownership rule.

Still open: user-led production portal review, production cron and email proof, candidate retention/export/deletion policy and workflow, external calendar decision, and a full reconciliation of historical roadmap notes. The earlier sections below retain implementation history and may describe the state before later slices. Use this section and the backend roadmap for current status.

## Problem and motivation

The repositories contain many hiring features, but several cross-system workflows still lack a clear data owner, reliable notifications, complete hiring history, or verified organization controls. The user confirmed that account activation requires a verified corporate inbox whose domain matches the company website. Legal company verification remains a separate review.

## Scope and constraints

- Keep Better Auth as the owner of email verification and NestJS as the owner of organization verification and hiring writes.
- Allow company registration, profile completion, and draft jobs before legal review.
- Require company verification for public job publication and recruiting actions.
- Do not deploy or change production settings. The user authorized migration application and disposable database checks.
- Do not start a server or run a build.
- Keep the existing roadmap as the shared implementation plan.

## Delivery

- Strategy: `feature-branch-chain`, on one feature branch shared by `biovity` and `biovity-server`.
- Branch: `codex/ats-portal-improvements` in both repositories.
- Plan one work-unit commit per completed implementation slice. Record each commit ID and its slice in this document. No commit exists for this documentation update.

## Current database state (2026-10-12)

This note supersedes earlier migration status text. Six TypeORM migration records were reconciled with SQL changes that already existed in Supabase. TypeORM then applied the eight remaining migrations: `1791800000030`, `0032` to `0038`. `migration:show` reports every migration applied. New internal tables have RLS and grant no `SELECT` to `anon`, `authenticated`, or `service_role`. Five focused dispatcher and matcher suites pass with 21 tests. `npx tsc --noEmit` passes. No test rows were added. UI flows and real notification delivery remain unverified.

## Supabase execution update (2026-10-11)

This update supersedes earlier migration status notes for backend TypeORM migrations `1791800000000` through `1791800000021`. All 22 migrations ran in one transaction on the active Supabase database. The migration ledger now has 80 rows, and TypeORM reports no pending migrations.

The first attempt rolled back after it found two SQL defects. Migration `1791800000003` compared enum status values with `varchar`; it now casts those values to text. Migration `1791800000010` named an enum that does not exist; it now uses `participant_status_enum`. A transactional database smoke test covered the new tables, constraints, audit rules, and workflow invariants, then rolled back all test data.

Backend Jest passed 61 suites and 360 tests for TypeORM migrations through `1791800000021`. A later database update enabled RLS and revoked REST privileges on the 21 exposed internal tables. PostgreSQL confirmed that `anon`, `authenticated`, and `service_role` have no DML access while `postgres` retains access. Supabase no longer reports public tables with RLS disabled. Next.js SQL migrations `026` to `029` and `030_internal_ats_rls` also ran. Their new internal tables have RLS and no REST privileges. TypeORM migration `1791800000022` is applied. Its tables have RLS, no API-role DML access, and pass a reversible insert, uniqueness, and audit check. Sentinel approved the code. Browser-flow and live cron delivery checks remain open. Earlier no-production-change records remain historical records.

## Supabase status (2026-10-11)

The active database registers TypeORM migrations `1791800000000` through `1791800000025` and Next.js migrations `026` through `030`. RLS is enabled on all 73 public tables. The focused ATS inventory excludes the shared `chat`, `message`, and `notification` tables. It found 38 ATS tables, and none of those 38 has a client policy. RLS therefore denies row access to `anon` and `authenticated` even where table grants remain. Migration `20261004042909_secure_realtime_channels.sql` removed the old `anon` read policies on `chat`, `message`, and `notification`. Realtime now uses private broadcast channels. The `message` table has an authenticated policy limited to chat participants. `service_role` bypasses RLS and must stay server-only. The five mutable `search_path` warnings reported before migration `20261011233848` are resolved. This status supersedes older migration notes below.

## Supabase update (2026-10-12)

The active database has 76 public tables, and all 76 have RLS enabled. SQL migrations for nullable job contract fields and `job_alert` were reconciled with the database history. Migration `20261012060000_revoke_job_alert_api_access` revoked table grants from `PUBLIC`, `anon`, `authenticated`, and `service_role`. PostgreSQL still owns the table and retains its access for NestJS TypeORM. Verification found zero test rows. The application-source migrations and composite foreign-key index are also applied. The advisor no longer reports the new foreign key. It reports 44 unrelated unindexed foreign keys and 5 duplicate-index warnings.

## Migration audit 2026-10-13

I compared local SQL and TypeORM files with their matching remote ledgers. `021_short_links.sql` was the only pending local migration. It is now applied. Supabase confirms the table and index exist, RLS is enabled, and `anon`, `authenticated`, and `service_role` have no table permissions. A PostgreSQL block inserted and deleted one temporary row. A later query confirmed the row was gone. The server retains access through its private PostgreSQL connection. Sentinel approved the migration. Supabase reports an INFO finding for RLS without a policy on `short_link`; API roles have no table grants. Earlier sections keep their original status at the time of each task; use this audit for current migration status.

## ATS-14 initial candidate data inventory

The initial code inventory is in `docs/plans/candidate-data-inventory.md`. It maps account and profile data, resumes and files, applications, hiring records, messages, offers, AI scores, search preferences, and profile images to their current owners and source files. The code has separate delete flows for a CV, avatar, and job alert. It has no single account-wide export or deletion flow.

The inventory does not set retention periods or legal exceptions. It does not verify retention in backups, email, storage, logs, or AI providers. Confirm those rules before building account-wide export or deletion. Field-level completeness remains open.

**Policy decision 2026-10-13:** retain candidate data for 24 months after case closure, then delete or anonymize it. This records the user's chosen policy. It does not establish that every data class can use the same period. The implementation must define case closure, legal holds, data classes, export, deletion, and anonymization behavior. Ley 21.719 sets a proportionality rule and takes effect on 2026-12-01. It does not prescribe 24 months.

## Work plan

| ID                | Task                                                                                                                                     | State                                                        | Evidence and next action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ATS-01            | Document table ownership and migrate organization creation, notifications, evaluations, notes, hiring plans, and admin queues to NestJS. | Partially complete                                           | Phase 0 maps NestJS ownership of core ATS records and finds ownership checks in the traced controllers. Full route and production coverage remains open. The offer-response recipient policy is resolved and implemented in ATS-02. See `docs/adr/001-table-ownership.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ATS-02            | Add durable offer-response email delivery from NestJS through the Next.js outbox.                                                        | Implemented, native review pending                           | The user chose the first recruiter with active access to the offer organization. The response transaction stores that recipient and an immutable intent. Focused and repository checks pass. Migration `1791800000008-OfferResponseEmailIntent` is applied and registered in Supabase.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ATS-03            | Link interview events to applications and filter them with tenant-safe access.                                                           | Focused verification passed, production verification pending | Backend Jest passed (2 suites, 2 tests) and frontend Node test passed (1 test). Sentinel approved the organization-boundary fix. The active database records migrations through `1791800000025`. Production workflow verification remains pending.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ATS-04            | Add legal company verification with admin review and server-side hiring gates.                                                           | In progress                                                  | Added focused edge coverage for verified/suspended submission blocks, rejected-request resubmission, review audit values, repeated review rejection, and admin queue identity checks (2 suites, 12 tests). Public organization lookup/list and public job queries pass separately (2 suites, 3 tests). Backend typecheck passes. The user chose mandatory legal review for existing organizations. Keep them `unverified` until an admin reviews them. Native review and production behavior remain pending. Migration `1791800000005-OrganizationVerification` is applied and registered in Supabase.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ATS-05            | Complete interview scheduling with explicit time zones, change history, reminders, and structured interviewer outcomes.                  | In progress                                                  | ATS-05-TZ stores the UTC instant and organizer-selected IANA zone, default `America/Santiago`. ATS-05-1a/1b add RSVP access coverage and atomic history writes. ATS-05-1c adds protected RSVP history display. ATS-05-2 adds up to 20 additional active organization recruiters as interview participants. ATS-05-3 adds event-scoped interviewer evaluations, final outcome, and audit. Backend passed 5 suites and 53 focused tests; frontend typecheck, Biome, 1 API test, and diff check passed. Sentinel approved after scores became visible in the evaluation list. Tests use mocks. Migration `1791800000012-EventInterviewRecords` is applied and registered in Supabase. Durable 24-hour reminder intents are in code; 5 suites and 54 focused backend tests and TypeScript passed. Migrations `1791800000038` and `1791800000039` are applied and recorded in the active migration ledgers. Sentinel approved this slice. Admin dead-letter recovery is implemented and Sentinel approved. PostgreSQL, production workflow checks, admin recovery for event lifecycle dead letters, and external calendar sync remain open. See Phase 4 of `docs/plans/backend-roadmap.md`. |
| ATS-06            | Complete offer, candidate, and professional portal workflows in the shared roadmap.                                                      | In progress                                                  | Phase 5 uses immutable CV upload reservations, version checks, and a durable cleanup queue. Application creation locks the current resume and saves only its active CV path. Full resume deletion queues the active CV and upload reservations in the same transaction. The daily worker calls the Storage API and skips paths still referenced by a resume or application. Sentinel approved the scoped code. Migration `1791800000030-ResumeCvLifecycle` is applied and recorded in the active migration ledgers. Focused local mocks pass: 11 frontend CV security tests, 3 cleanup worker tests, and 9 backend tests in 2 suites. Frontend and backend type checks pass. Database, Storage, and browser checks remain open.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ATS-07            | Audit permissions, error paths, data retention, and cross-repository ownership for all hiring writes.                                    | In progress                                                  | Offer creation now commits the offer, chat, and message in one transaction. Earlier focused checks passed (2 suites, 8 tests), and hiring-plan and status-history denial tests passed (1 suite, 7 tests). The 2026-10-10 read-only audit found the listed access checks, but mocked controller tests do not prove guard-to-database behavior. ATS-07-2 mock denial and write-rejection tests passed (2 suites, 24 tests), and backend typecheck passed. ATS-07-9 corrects recruiter metrics that repeated organization-wide totals for each member. Local tests pass, but mocks do not prove PostgreSQL results. The approved retention and export workflow is implemented. Remaining work: complete the route and ownership matrix, verify database membership, constraints, rollback and concurrency against PostgreSQL, check internal-key boundaries, verify external processor and backup retention, and run production and portal checks. See ATS-07-1 below.                                                                                                                                                                                                                    |
| ATS-08            | Verify the full delivered scope and update roadmap evidence.                                                                             | In progress                                                  | 2026-10-10: backend `npx jest --runInBand` passed 46 suites and 203 tests. Frontend `node --test tests/*.test.cjs` passed 193 tests with no failures or skips. `npx tsc --noEmit` passed in both repositories. All four commands exited 0. Scoped lint exited 1 in both repositories: ESLint checked 133 changed TypeScript files and reported 1,470 errors in 72 files, including 1,392 Prettier errors and 78 TypeScript lint errors, with no warnings. Biome checked 94 changed supported files and reported 5 errors, 3 warnings, and 1 information item. No base comparison was run. Backend `git diff --check` exited 2 on CRLF lines in three files. `git -c core.whitespace=cr-at-eol diff --check` passed. Frontend diff checks and staged diff checks in both repositories passed. Keep ATS-08 open for lint triage, native review, and production checks. No server, build, migration, or production check ran.                                                                                                                                                                                                                                                             |
| ATS-09            | Store the owning organization on each chat and gate organization messages on that organization's verification.                           | Implemented, follow-up pending                               | Focused checks passed. Migrations `1791800000006-ChatOrganization` and `1791800000007-ChatOrganizationReview` are applied and registered in Supabase. ATS-10 adds the legacy-chat review and assignment path. Keep ATS-09 open for native review and production workflow verification.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ATS-10            | Add an admin review queue and safe manual organization assignment for legacy chats.                                                      | Implemented, native review pending                           | All queue, detail, verified-organization, and assignment endpoints check for an authenticated admin. Focused checks passed. Migrations `1791800000006-ChatOrganization` and `1791800000007-ChatOrganizationReview` are applied. Native review remains pending.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ATS-11            | Commit an offer response, application outcome, hiring history, chat message, and durable email intent as one transaction.                | Implemented, native review pending                           | The intent repository owns all writes. Focused tests passed (5 suites, 16 tests), backend typecheck passed, and task-path diff check passed. No schema change was needed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ATS-12            | Add a read-only admin queue filter for organizations with no active jobs.                                                                | Implemented locally; native review pending                   | Uses `job.status = active`. Focused backend and frontend tests, both repository type checks, and scoped diff checks passed. No work-unit commit exists. Preserve search, pagination, and current filters. Assignment, ownership, follow-up dates, status changes, and other write actions remain out of scope.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ATS-13            | Require signed human approval for recruiter AI mutations.                                                                                | Implemented; registry coverage added                         | Uses AI SDK 6 tool-level approval flags, signs requests with a per-user and per-organization secret, consumes approved IDs once in PostgreSQL, and shows the exact tool input before approval. Migration `028_ai_tool_approval_consumption.sql` is applied and registered in Supabase. Tests classify every registered tool and send each mutation through the replay guard. Browser and PostgreSQL concurrency checks remain open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ATS-ONBOARDING-2  | Let admins take or release company onboarding cases.                                                                                     | Implemented locally; Sentinel approved; migration applied    | One admin can claim an unassigned case. Only its assignee can release it. The backend rechecks onboarding eligibility, records assignment and append-only activity in one transaction, and uses the authenticated admin identity. The queue filters assigned/unassigned cases and shows the current owner and last action. Backend: 15 focused tests passed across 2 suites and typecheck passed. Frontend: 9 Node tests, typecheck, Biome, and diff checks passed. Migration `1791800000013-OrganizationOnboardingAssignment` is applied and registered in Supabase. Mocks do not prove PostgreSQL concurrency, constraints, or production behavior. No SLA or due date was added.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ATS-OPS-QUEUE-2   | Add admin ownership and follow-up plans for expired jobs and organizations without active jobs.                                          | Implemented locally; Sentinel approved; migration applied    | Admins can claim, replan, and release these two alert types. Source eligibility stays authoritative, and assignment does not resolve or hide an alert. Backend: 2 suites, 29 tests, and typecheck passed. Frontend: 9 Node tests, typecheck, Biome, and diff checks passed. Migration `1791800000018-AdminOperationsQueueAssignment` is applied and registered in Supabase. Mocks do not prove PostgreSQL locks, rollback, constraints, or production behavior.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ATS-EMAIL-PREFS-1 | Respect recipient email preferences for offer-response messages.                                                                         | Implemented locally; Sentinel approved; migration applied    | Next.js checks `channels.email` and `events.application` through an authenticated NestJS endpoint before Resend. A disabled preference or missing user suppresses the message and clears its body. Lookup failures retry without sending. Legacy outbox rows without recipient IDs still send and appear in admin counts. The settings screen now shows an email switch scoped to offer responses. Other emails do not use this setting. Frontend: 10 focused Node tests, typecheck, Biome, and diff check passed. Backend: 6 focused Jest tests, typecheck, ESLint, and diff check passed. Production UI, PostgreSQL, and provider behavior remain unverified. Migration `029_email_outbox_preferences.sql` is applied and registered in Supabase.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ATS-ONBOARDING-5  | Email admins when a legal verification request enters the queue.                                                                         | Implemented locally; review pending                          | NestJS writes a durable admin-email intent in the same transaction as the request. A NestJS bridge retries up to eight times and calls the authenticated Next.js route. Next.js validates the payload and event key, then writes to its email outbox. The existing worker sends and retries. Active admins and `ADMIN_EMAILS` receive alerts; user email preferences do not suppress operational alerts. Backend: 3 suites, 18 tests, typecheck, and scoped ESLint passed. Frontend: 5 Node tests, typecheck, and scoped Biome passed. Migrations `1791800000019-OrganizationVerificationEmailIntent` and `027_email_outbox.sql` are applied and registered in Supabase. No PostgreSQL, Resend, or production test. No SLA added.                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

## Acceptance criteria

- Corporate email verification and legal company review have separate states and owners.
- Unverified organizations can register, complete profiles, and save draft jobs.
- Only verified organizations can publish jobs or perform recruiting actions.
- Public organization and job results hide unverified companies.
- Admin review records the reviewer, decision time, and reason. Rejected requests can be resubmitted.
- Cross-organization interview filters do not return events for a mismatched application.
- New chats store the organization after the server validates the requester's membership. The migration unions direct ownership and organization-member rows, deduplicates organizations, and assigns old chats only when exactly one organization matches. Organization message sends require the stored chat organization to be verified. Candidate messages, candidate reads, and RSVP remain available. Old chats with no unique organization block organization sends until review.
- Each roadmap item that this work changes has current code evidence and a verification result.
- Production migrations and provider settings remain listed as deployment prerequisites.

## ATS-12 operations queue filter

State: Implemented. Focused tests, both repository type checks, and scoped diff checks pass. No work-unit commit exists. Native RDD review remains pending. The user selected `feature-branch-chain` for both repositories.

Objective: let admins find organizations that have no active jobs in the operations queue.

Why: Phase 3 already requires a way to find organizations without an active offer. The current queue filters expired jobs and application follow-ups, but it does not provide this organization filter.

Scope:

- Add a read-only queue filter for organizations with no job whose status is `active`.
- Use the existing `job.status = active` convention to define an active job.
- Preserve search, pagination, and the current queue filters.
- Keep the existing expired-job and application follow-up filters available.
- Do not add assignment, ownership, follow-up dates, status changes, or write actions. The rules for those actions remain unresolved.
- Limit this slice to the no-active-job case. It does not complete the broader Phase 3 queue for new organizations, missing milestones, or next follow-up dates.
- Keep the separate Phase 3 requirement about recent activity open.

Acceptance criteria:

- An admin can select a filter that returns organizations with no active jobs.
- An organization with at least one job where `job.status = active` does not appear in that filtered result.
- Search, pagination, expired-job filters, and application follow-up filters continue to work with the new filter.
- The queue does not change organization or job data.
- No assignment, ownership, follow-up date, status change, or other write action is added.

Route: delegated direct. This task changes the backend queue DTO, service, and spec, plus the frontend queue UI. The behavior crosses backend filtering and frontend controls, so one bounded writer will handle the implementation.

Forecast: under 400 authored changed lines. Generated files do not count.

### Checklist

- [x] ATS-12-1: add and test the backend filter using `job.status = active`.
- [x] ATS-12-2: add the admin queue control and preserve current search, pagination, and filters.
- [x] ATS-12-3: verify read-only behavior, focused backend and frontend checks, and both repository type checks.

### RED and GREEN checks

- RED: the backend queue spec failed because the generated query had no organization branch. The frontend queue test failed because the request builder did not exist.
- GREEN: backend Jest passed (1 suite, 4 tests). The frontend Node test passed (2 tests), including search, paging, and both existing filters.
- GREEN: `npx tsc --noEmit` passed in `biovity-server` and `biovity`.
- Structural check: scoped `git diff --check` passed in both repositories. The backend check used `core.whitespace=cr-at-eol` for the existing CRLF files.
- Read-only check: the service query uses `SELECT` statements and does not write organization or job data.
- Delivery: no work-unit commit exists. Native RDD review remains pending. The user selected `feature-branch-chain` for both repositories.

## ATS-05 timezone slice

State: implementation and corrections complete. Focused local checks pass. Sentinel returned APPROVE after the corrections. Migration `1791800000009-EventTimeZone` is applied. Native RDD review remains pending.

Decision: store each event time as a UTC instant plus the organizer-selected IANA zone. Default the event zone to `America/Santiago`. Show each participant the same instant in that participant's local zone and label the event zone.

Scope: event creation, event editing, event persistence, API responses, and participant time display in both repositories. Preserve existing application links and tenant access checks.

Route: delegated direct. The mapping trigger applies because the event contract crosses backend persistence, API writes and reads, frontend forms, and participant views. The bounded writer used the mapped paths listed below. The final corrections cover numeric zone identifiers and participant-local weekly placement.

### Checklist

- [x] ATS-05-TZ: store and preserve the UTC instant and IANA event zone through create and edit, then show participant-local time with the event-zone label. Add the approved public tests and record their observed results.
- [ ] ATS-05-TZ-REVIEW: complete native review for this slice. No native approval is recorded.
- [x] ATS-05-TZ-DEPLOY: apply migration `1791800000009-EventTimeZone`. Supabase records the migration.

### Acceptance criteria and public test seams

- Backend API create and edit preserve the UTC instant and the organizer-selected IANA zone in persisted data and returned data.
- The backend defaults an omitted event zone to `America/Santiago` and rejects an invalid IANA zone.
- Editing other event fields preserves the saved instant and event zone.
- Frontend participant display converts the saved instant to the participant's local time and shows the event-zone label.
- Tests use explicit participant zones so host timezone settings cannot change the expected result.
- Test dates cover Chile's offset change and a participant outside Chile. Both participants must see the same instant.

### Plan, forecast, and checks

- [x] Map the create, edit, read, and display paths. Record exact paths, focused test commands, and the migration need.
- [x] Observe backend API and frontend display test failures before implementation. Observe RED before both Sentinel corrections.
- [x] Add the timezone contract and persistence. Update frontend forms and participant display. Complete the numeric-zone and weekly-calendar corrections.
- [x] Run focused public tests, both TypeScript checks, scoped format checks, direct DST checks, and diff checks. Record the existing backend CRLF failure below.
- [x] Get Sentinel APPROVE after the corrections.

Forecast: above 400 authored changed lines. The exact timezone-only count cannot be isolated because the dirty files also contain older work. Generated files do not count.

Delivery strategy: `feature-branch-chain` on `codex/ats-portal-improvements` in both repositories. No work-unit commit has run for this slice.

Final check commands and results:

- Backend `npx jest --runInBand src/interfaces/controllers/event/event.controller.spec.ts`: 1 suite and 3 tests passed.
- Frontend `node --test tests/event-timezone-api.test.cjs tests/event-timezone-ui.test.cjs`: 8 tests passed, including API, participant render, and week-view checks.
- `npx tsc --noEmit` in each repository: passed.
- Scoped frontend Biome format and backend Prettier checks: passed. Exact commands: not recorded.
- Direct DST gap and fold checks: passed. Exact command: not recorded. They cover nonexistent and repeated Chile times, valid conversion, and unchanged seconds and milliseconds.
- Frontend `git diff --check`: passed.
- Backend `git diff --check`: failed only on the three existing CRLF files listed below. Backend `git -c core.whitespace=cr-at-eol diff --check`: passed.

Limits: invitations, attendance changes, rescheduling, cancellation, change history, reminders, interview results, and external calendar sync remain pending. No server, build, production check, or migration application belongs to this slice's local implementation. Production migration application and native review remain pending.

## ATS-05-2 interviewer invitations

State: implementation complete after review fixes. Sentinel approved. No production test or migration application is recorded.

Scope: let an organization recruiter invite other active organization owners, admins, or recruiters to an interview. Store each invitee as a pending event participant and send an in-app notice after event creation. The candidate remains the separate `candidateId`. The existing participant enum has no interviewer role, so this slice stores invitees as `attendee`.

Checks: backend Jest passed 4 suites and 56 tests, including authorization after interviewer membership removal. Frontend Node tests passed 8 tests. TypeScript checks passed in both repositories. Biome, Prettier, and scoped diff checks passed.

Review corrections: event read and RSVP now recheck verified recruiting access for non-organizer, non-candidate participants on interviews. Changing the event type clears selected interviewers, and the request sends interviewer IDs only for interviews.

Limits: the existing application scorecard is not reused because its unique application/evaluator record would overwrite evaluations from another interview. Interview-specific scorecards and final outcomes remain a separate pending slice. Notices are best-effort and have no durable retry. Current mocked tests do not prove database membership, participant inserts, notification delivery, or production behavior. The SSR form test checks which members appear but does not simulate changing event type and submitting.

## ATS-05-3 interview evaluations and final outcome

State: implementation complete. Sentinel approved. No production test or migration application is recorded.

Scope: store an independent scorecard for each assigned interviewer and interview. Store the company outcome as a separate event record. Save each change with an audit entry in the same transaction. Keep the application scorecard unchanged. Do not move the application stage automatically.

Access: require a completed interview linked to the application and its job. Require active recruiting access to the event organization. Require interviewer assignment to save an evaluation. The event organizer is assigned as an interviewer at creation. The request uses the signed-in user as evaluator.

Checks: backend Jest passed 5 suites and 53 focused tests. Backend TypeScript passed. Frontend TypeScript, Biome, 1 API mock test, and diff check passed. Sentinel approved after review. The UI shows evaluator, rating, recommendation, skill scores, notes, outcome, and audit activity.

Limits: mocks do not prove PostgreSQL transactions, constraints, authorization against real membership, browser behavior, or production behavior. Migration `1791800000012-EventInterviewRecords` has not been applied. No database, production, build, or server test ran. Candidate stage changes and external calendar sync remain separate work.

### Changed paths and observed checks

Backend paths:

- `src/core/domain/entities/event.entity.ts`
- `src/core/use-cases/event/event.use-case.ts`
- `src/core/services/event.service.ts`
- `src/interfaces/dtos/event/event.dto.ts`
- `src/shared/mappers/event/eventDto-domain.mapper.ts`
- `src/shared/mappers/event/eventDomain-dto.mapper.ts`
- `src/shared/mappers/event/eventDomain-orm.mapper.ts`
- `src/infrastructure/database/orm/event.entity.ts`
- `src/infrastructure/persistence/event.repository.impl.ts`
- `src/interfaces/controllers/event/event.controller.spec.ts`
- `src/infrastructure/database/migrations/1791800000009-EventTimeZone.ts`

Frontend paths:

- `lib/types/events.ts`
- `lib/event-time.ts`
- `components/calendar/event-form-modal/event-form-modal.tsx`
- `components/dashboard/organization/ApplicationInterviews.tsx`
- `components/dashboard/employee/calendar/calendar-section.tsx`
- `components/dashboard/employee/calendar/calendar.tsx`
- `components/dashboard/employee/calendar/week-view.tsx`
- `components/dashboard/employee/calendar/day-modal.tsx`
- `components/dashboard/employee/calendar/event-tooltip.tsx`
- `components/dashboard/employee/calendar/upcoming-events.tsx`
- `components/dashboard/employee/calendar/event-detail-modal.tsx`
- `tests/event-timezone-api.test.cjs`
- `tests/event-timezone-ui.test.cjs`
- `tests/register-ts.cjs`

Observed checks:

- Backend RED: `npx jest --runInBand src/interfaces/controllers/event/event.controller.spec.ts` ran 2 tests. The new API test failed because the create response omitted the event zone. An earlier compile failure used an undeclared response field and was corrected before this behavioral RED.
- Initial backend GREEN: the same command passed 1 suite and 2 tests before the Sentinel corrections. The test uses the real controller, DTO validation, service, repository, and mappers with an in-memory ORM adapter. It checks create, edit, reload, an unrelated title edit, the default zone, invalid zones, and missing UTC offsets.
- Frontend RED: `node --test tests/event-timezone-ui.test.cjs` failed both initial participant render tests because both participants saw Chile time and no event-zone label.
- Initial frontend GREEN: `node --test tests/event-timezone-api.test.cjs tests/event-timezone-ui.test.cjs` passed 6 tests before the Sentinel corrections. Real React render tests cover Los Angeles date rollover, Tokyo time, Chile before and after its September offset change, and the organizer edit form in a Tokyo browser zone. The API transport test checks explicit instant and zone fields on POST and PATCH.
- Direct checks of `organizerInstant` passed for Chile's nonexistent September hour, repeated April hour, a valid conversion, and preservation of seconds and milliseconds on an unchanged repeated hour. A new repeated wall time requires another time. These checks do not use a browser or database.
- `npx tsc --noEmit` passed in each repository.
- Scoped frontend `npx biome format` passed for 11 source files. Scoped backend Prettier formatted the changed source files before the final checks. CJS files are excluded by the current formatter settings.
- Frontend `git diff --check` passed. Backend `git diff --check` reports existing CRLF lines in `src/core/repositories/job.repository.ts`, `src/infrastructure/database/orm/organization.entity.ts`, and `src/infrastructure/persistence/job.repository.impl.ts`. Backend `git -c core.whitespace=cr-at-eol diff --check` passed.
- The new ignored migration adds only the event-zone column with the Chile default. It does not update `startAt` or `endAt`. Its exact path did not exist before this work. It remains unstaged and unapplied.
- Native review, database integration, browser interaction, and production checks remain pending. The organizer SSR test replaces the sheet container and icon renderer. The real icon renderer failed with `currentIcon is not iterable`, outside this time-zone change.
- No server, build, migration application, stage, or commit ran. The Engram mirror remains pending because this session exposes no memory tools.

### Sentinel correction checks

The first Sentinel review rejected numeric fixed-offset zone identifiers and the weekly calendar's 08:00 start. RED preceded both corrections. Both bounded corrections are complete, and Sentinel returned APPROVE after the corrections. This approval is separate from native RDD approval, which remains pending.

- Backend RED: `npx jest --runInBand src/interfaces/controllers/event/event.controller.spec.ts` failed the new create/edit validation test because `+03:00` passed as a zone. Backend GREEN: the same command passed 1 suite and 3 tests after the DTO rejected numeric zone identifiers.
- Frontend RED: `node --test tests/event-timezone-api.test.cjs tests/event-timezone-ui.test.cjs` failed the organizer parser test because it accepted `+03:00`. After that correction, it failed the weekly render test because Sunday lacked a midnight slot and placed the Tokyo 00:30 appointment at the 08:00 grid start.
- Frontend GREEN: the same command passed 8 tests. The organizer parser rejects numeric fixed-offset identifiers. The weekly calendar has 24 hourly rows and places `2026-10-10T15:30:00Z` on local Sunday in Tokyo at 00:30, 24 px after midnight. The current-time marker also uses midnight as its origin.
- The final `npx tsc --noEmit` passed in both repositories. Frontend `git diff --check` passed. Backend raw diff check still reports the three existing CRLF files. Backend `git -c core.whitespace=cr-at-eol diff --check` passed.
- Scoped frontend Biome format and backend Prettier passed before the final checks. No server, build, stage, commit, migration application, or production check ran.

Next step: complete native RDD review for this slice. The migration is applied. Keep invitations, rescheduling, reminders, interviewer results, calendar sync, and other review and production checks open. The selected delivery strategy is `feature-branch-chain`.

## ATS-05-1 RSVP rules and interview history

State: RSVP history persistence, protected read API, calendar display, transition rules, durable event edit/cancellation history, and organization calendar display of event-change history are implemented with focused tests. Migrations `1791800000010` and `1791800000014` are applied. PostgreSQL verification remains pending.

Exploration evidence from 2026-10-10:

- `PATCH /events/:id/participants/:userId` checks requester identity and event RSVP access in the controller.
- The RSVP service accepts the status supplied by the caller. The original exploration found no RSVP controller test. ATS-05-1a adds controller-mock authorization coverage below.
- Organizer edits and cancellations, and participant RSVP changes, trigger best-effort in-app notifications after persistence.
- ATS-05-1d adds an append-only event change-history record with actor, action, timestamp, and changed field values.
- The frontend supports event creation, editing, deletion, and display of event time, link, and status.

RSVP policy: allow a status change only while the event is scheduled and before its start time. Return HTTP 409 after start, cancellation, or completion. Keep same-status retries idempotent, including after the response window closes. The repository locks the event row, then the participant row, in one transaction.

Next implementation task: verify persistence and concurrent transitions with PostgreSQL after the required native review and migration approval.

Acceptance criteria:

- The user-approved RSVP transition rules appear in service tests and the service rejects disallowed transitions.
- Controller tests prove that only the target participant can change their RSVP and that event RSVP access is required.
- Tests cover RSVP writes for cancelled and completed events according to the approved policy.
- Event history records organizer edits and cancellation, and participant RSVP changes, with actor, time, and changed values.
- A persistence failure does not create a history record or send a notification.
- A notification failure does not undo a persisted RSVP or event change, and the failure remains observable.
- The frontend shows the current RSVP and event status after the server accepts a change.

Checklist:

- [x] Record the current RSVP route, service behavior, notification order, model history gap, and frontend support from the 2026-10-10 exploration.
- [x] Define the RSVP policy: changes only before the scheduled event starts, with idempotent same-status retries.
- [x] Add mocked repository and service tests for closed events, elapsed events, idempotent retries, and rejected-change notifications.
- [ ] Verify row-lock behavior and transitions with PostgreSQL.
- [x] Add durable RSVP status history and a protected read path.
- [x] Apply migration `1791800000010-EventParticipantStatusHistory`.
- [ ] Verify the migration and RSVP history with PostgreSQL.
- [x] Add a durable event-edit and cancellation log with a manager-only history API.
- [ ] Show the event-change history in the calendar.
- [ ] Verify event audit, cancellation races, and RSVP row locks with PostgreSQL.
- [ ] Verify frontend RSVP and event status updates against the server response.

Delivery: use `feature-branch-chain` on `codex/ats-portal-improvements` in both repositories. Keep ATS-05-1 as a separate work-unit slice and record its commit ID after the commit. The roadmap and task plan update is commit `9763ec5`. `git diff --cached --check` passed. Tests and runtime checks were not applicable to this documentation-only work unit. Revert `docs/plans/backend-roadmap.md` and `odd/tasks/ats-portal-improvements.md` to roll back the unit.

## ATS-05-1a RSVP controller authorization

State: focused checks passed and committed. Native review is pending. The user authorized controller-mock tests and inclusion of the 3 existing event filter and timezone tests in the same spec commit.

Route: delegated direct. One writer adds tests to the existing controller spec and records evidence in the task plan and roadmap.

Scope: `EventController.updateParticipantStatus` only. Check missing requester, mismatched path identity, and event RSVP access denial before the event service runs. Matching identity must reach the event access check. Keep RSVP transition policy and event history open. Do not test accepted or declined response changes, or cancelled or completed events.

- [x] Record the agreed scope before test code.
- [x] Add the controller authorization regression tests.
- [x] Run the event controller Jest spec, backend typecheck, and scoped diff check.
- [x] Commit the authorized spec and only ATS-05-1a document changes. Commit: `f5a689b8a07d58898afeb67fdae7117fa2c80ff9`.

Test-first exception: regression coverage for existing behavior only. Production code stays unchanged, so no behavioral RED is claimed.

Limits: mocked event access and service calls do not prove global session-cookie guard behavior, actual database membership, persistence, notifications, or RSVP transition policy. The global guard is outside this fixture. Runtime HTTP checks are not applicable to this controller-mock slice.

Forecast: below 400 authored changed lines, including the existing spec. Delivery uses the approved `feature-branch-chain` strategy. Native review is pending and the parent will run its assessment after this commit.

Rollback: remove the added RSVP describe block and the ATS-05-1a documentation updates. Preserve the 3 existing filter and timezone tests.

## ATS-05-1b RSVP status history persistence

State: code and focused mock tests pass. Migration `1791800000010-EventParticipantStatusHistory` is applied. PostgreSQL verification and native review remain pending.

Scope: write one append-only history row for each real participant RSVP status change. Store the participant, event, actor, previous status, new status, and change time. Lock the participant row and save its new status and history row in one transaction. Keep same-status requests idempotent. Keep transition policy, event status rules, and notification delivery unchanged.

The existing controller requires the authenticated requester ID to match the participant path ID. The service passes that ID as the actor. Notification data uses the status pair returned from the locked database row, so concurrent writes do not record a stale transition.

Limits: mocked repositories do not prove PostgreSQL row locks, FK behavior, or rollback. The migration is applied, but its behavior with PostgreSQL remains unverified. This slice does not expose or display history, test database permissions, or decide whether a person can change a prior response or respond after event cancellation or completion.

Observed checks on 2026-10-10:

- `npx jest --runInBand src/infrastructure/persistence/event-participant.repository.impl.spec.ts src/core/services/event.service.spec.ts src/interfaces/controllers/event/event.controller.spec.ts`: 3 suites and 25 tests passed.
- `npx tsc --noEmit`: passed, exit 0.
- Scoped `git diff --check` passed.
- No server, build, or migration ran. No commit was created.

Observed checks on 2026-10-10:

- Baseline `npx jest --runInBand src/interfaces/controllers/event/event.controller.spec.ts`: 1 suite, 3 tests passed.
- After adding authorization coverage, the same command passed 1 suite and 6 tests. Added missing requester, mismatched participant identity, and matching-identity access denial tests. No behavioral RED occurred or is claimed.
- `npx tsc --noEmit`: passed, exit 0.
- `git diff --check -- src/interfaces/controllers/event/event.controller.spec.ts odd/tasks/ats-portal-improvements.md docs/plans/backend-roadmap.md`: passed, exit 0. The isolated-index `git diff --cached --check` also passed and covered all three committed files, including the previously untracked spec.
- `npx prettier --write src/interfaces/controllers/event/event.controller.spec.ts`: passed before the final tests. Applied a direct slop check to the new code and prose. The exact `/remove-ai-slop` skill is absent from the configured user and project skill paths.
- No server, build, migration, production source change, or RSVP policy change ran.

Commit: `f5a689b8a07d58898afeb67fdae7117fa2c80ff9`, `test(events): verify RSVP controller identity checks`. The commit includes the authorized event spec and only ATS-05-1a document changes: 345 additions and 4 deletions. The unrelated migration remains staged. Prior document edits remain unstaged. This commit-ID record remains uncommitted recovery metadata. The parent owns native assessment and review after this work-unit commit. No native approval is claimed.

## ATS-05-1c RSVP status history read and display

State: implementation and focused tests pass. Sentinel approved. Migration `1791800000010-EventParticipantStatusHistory` is applied. Native RDD review and PostgreSQL verification remain pending.

Scope: expose `GET /events/:id/participants/:userId/status-history`. The participant can read their own history. An event organizer, admin, or organization member with read access can read the candidate history. Other participants cannot read another user's timeline. Return transitions in stable chronological order with IDs for stable display keys. Show loading, empty, error, and retry states in month and week calendar event detail. Invalidate the cached history after an RSVP update. Do not change RSVP transition rules or expose actor identifiers.

Observed checks on 2026-10-10:

- Backend: focused Jest passed 3 suites and 31 tests, covering participant query scope and ordering, service membership checks, candidate self access, organization access, empty history, and denial for an unrelated participant. `npx tsc --noEmit` passed.
- Frontend: `node --test tests/event-timezone-api.test.cjs tests/event-timezone-ui.test.cjs` passed 9 tests, including the participant-history API path. `bun typecheck` and scoped Biome checks passed.
- The tests use mocks. They do not prove cookie-session enforcement, production migration state, PostgreSQL ordering, organization membership records, or production UI behavior.
- No server, build, migration, deploy, commit, or stage ran.

## ATS-10 scope and acceptance

- Add an admin page, navigation entry, backend queue and detail routes, and a frontend API proxy.
- Limit the queue to chats where `organizationId` is null. Show the two participants and the chat message history needed for manual review.
- Require an authenticated admin for queue, detail, and assignment operations.
- Let an admin assign one verified organization to one chat at a time. Do not infer the organization from recruiter ownership or membership.
- Update the chat only if it remains unassigned. Record the authenticated admin ID and assignment time in durable columns.
- Leave a chat unassigned when evidence does not support a choice. Organization sends remain blocked for that chat.
- Add focused tests for queue scope, detail access, verified-organization checks, concurrent assignment, and audit fields.
- Migrations `1791800000006-ChatOrganization` and `1791800000007-ChatOrganizationReview` are applied and registered.

Status: implementation complete. Native technical review and migration approval remain pending.

## ATS-07-4 offer transaction write failures

State: tests and checks passed. Commit `a2896f09c50b` is recorded; native review remains pending. This test-only slice covers the remaining mocked write failures in offer creation.

Problem: `OfferLetterRepositoryImpl.createWithMessage` performs the offer save, chat `lastMessage` update, and offer-to-chat/message link update inside its transaction callback. Existing service tests cover chat insert and message insert failures, but they do not cover these three writes.

Route: delegated direct. The bounded change touches this service spec and the two roadmap documents. Forecast: under 400 authored changed lines. The `.atl/skill-registry.md` file is absent. The exact available TypeScript, testing, writing, unslop, and work-unit skills were loaded.

Scope and acceptance:

- Add a mock failure case for offer save, chat `lastMessage` update, and offer-to-chat/message link update.
- For each case, assert that the transaction callback rejects and that the post-commit notification does not run.
- Preserve the existing chat insert and message insert failure cases.
- Do not change production code, database schema, migrations, or database state.
- Do not claim actual database rollback, row absence, membership enforcement, or PostgreSQL constraint behavior.

Checklist:

- [x] ATS-07-4-PLAN: record scope, acceptance, checks, route, forecast, and mock limits in the task plan and Engram.
- [x] ATS-07-4-TESTS: add the three remaining mock write-failure cases and preserve chat/message insert failures.
- [x] ATS-07-4-CHECKS: run the focused Jest spec, backend typecheck, scoped formatter, and scoped diff check.
- [x] ATS-07-4-COMMIT: commit only this work unit and record its commit ID: `a2896f09c50b`

Test-first exception: this slice adds regression tests for existing behavior and changes no production behavior. Do not claim a behavioral RED.

Checks:

- Run Prettier on the three allowed paths before checks.
- Run `npx jest --runInBand src/core/services/offer-letter.service.spec.ts`.
- Run `npx tsc --noEmit`.
- Run scoped `git diff --check` for the three allowed paths.

Mock limits: the tests can prove that a mocked write rejection rejects the transaction callback and skips notification. They cannot prove that a real database rolls back writes or leaves no rows. Database-backed verification remains open.

Verification: `npx jest --runInBand src/core/services/offer-letter.service.spec.ts` passed (1 suite, 9 tests). `npx tsc --noEmit` passed. `npx prettier --write src/core/services/offer-letter.service.spec.ts odd/tasks/ats-portal-improvements.md docs/plans/backend-roadmap.md` passed. Scoped `git diff --check` passed after the final document update.

Commit: `a2896f09c50b`, `test(offers): cover remaining transaction write failures`. The parent owns native assessment and review. No native approval is claimed.

## ATS-07-5 event timezone persistence tests

State: tests and checks passed. Committed as `419d9de5bf8d3c0c857d939e67f3c9bf2ba9dbde`. Native review remains pending. No production code changed.

Objective: verify that event repository create and update preserve the UTC instant and IANA timezone when mapping to and from ORM entities.

Scope and acceptance:

- Add mock-based unit tests for `EventRepositoryImpl.create` and `update`.
- Verify create saves and returns the expected UTC instant and IANA zone.
- Verify update writes the UTC instant and zone together, then returns the values from the reloaded event.
- Keep the test focused on the repository public methods and mocked ORM repository.
- Do not change production code, migrations, RSVP policy, database settings, frontend files, or other tasks.

Route: delegated direct. One writer adds tests to the existing event repository spec and updates this plan and the shared roadmap. Forecast: under 400 authored changed lines. Generated files do not count. Preserve the existing staged migration and prior staged or unstaged document changes. The `.atl/skill-registry.md` file is absent. The requested skill paths were checked; `/Users/dleteliers/.agents/skills/deslop/SKILL.md` is available, while `/remove-ai-slop` is not in the registry.

Test-first exception: the repository already copies `timeZone` and `startAt` through create and update. This slice adds tests for existing behavior and changes no production behavior, so a behavioral RED is not applicable.

Mock limits: these tests prove the values passed to mocked ORM methods and returned by mocked reloads. They do not prove PostgreSQL durability, migration state, database rollback, or behavior in a real database.

Checks:

- [x] Format only the three allowed paths with `npx prettier --write src/infrastructure/persistence/event.repository.impl.spec.ts odd/tasks/ats-portal-improvements.md docs/plans/backend-roadmap.md` before tests.
- [x] Run `npx jest --runInBand src/infrastructure/persistence/event.repository.impl.spec.ts` (1 suite, 3 tests passed, including 2 new timezone cases).
- [x] Run `npx tsc --noEmit` (passed).
- [x] Run `git diff --check` scoped to the three allowed paths. It passed. The three paths contain no CRLF.
- [x] Stage only ATS-07-5 additions, inspect the isolated staged diff, commit the work unit, and record its ID: `419d9de5bf8d3c0c857d939e67f3c9bf2ba9dbde`. Preserve the migration and earlier document changes.

Verification: `npx jest --runInBand src/infrastructure/persistence/event.repository.impl.spec.ts` passed (1 suite, 3 tests). `npx tsc --noEmit` passed. `git diff --check -- src/infrastructure/persistence/event.repository.impl.spec.ts odd/tasks/ats-portal-improvements.md docs/plans/backend-roadmap.md` passed. Prettier passed before tests.

Commit: `419d9de5bf8d3c0c857d939e67f3c9bf2ba9dbde`, `test(events): cover event timezone persistence`. It includes only the two new timezone tests and ATS-07-5 document additions. The pre-existing staged migration, deletion, and earlier document hunks remain outside the commit. The parent owns native assessment and review. No native approval is claimed.

## ATS-07 message attachment access

- Require an authenticated session and confirm that the user matches the chat recruiter or professional before upload or download.
- Fail closed when the chat lookup fails. Do not access Supabase Storage before authorization.
- Accept only `messages/<chatId>/<filename>` downloads whose chat ID matches the requested chat. Reject malformed paths.
- Return sensitive attachments with `Cache-Control: private, no-store`.
- Test participant access, nonparticipant denial, missing chats, malformed and cross-chat paths, lookup failures, and no storage access after denial.
- Keep production behavior and the full route audit open until verified.

Design: use the authenticated session identity and the chat participants from the NestJS API. Check access before using the Supabase service key, because the key bypasses Storage RLS. The download route validates the exact path shape and matches its chat ID before lookup.

Status: implemented in both routes. Organization members and professionals can upload and download their chat attachments. The routes reject nonparticipants and chat lookup failures before Storage access. Download responses use `private, no-store`. Production behavior and the full route audit remain unverified.

Checks:

- `node --test tests/message-attachment-access.test.cjs` (RED before route changes, then GREEN)
- `npx tsc --noEmit` in `biovity`
- `npx biome check app/api/upload/message-attachment/route.ts app/api/messages/attachment/route.ts tests/message-attachment-access.test.cjs`
- `git diff --check` in both repositories

Observed checks:

- RED: `node --test tests/message-attachment-access.test.cjs` failed 4 of 5 tests against the original routes. The routes allowed nonparticipant access, skipped chat lookup, accepted malformed paths, and returned a one-hour cache header.
- GREEN: `node --test tests/message-attachment-access.test.cjs` passed 5 tests.
- `npx tsc --noEmit` in `biovity`: passed.
- `npx biome check app/api/upload/message-attachment/route.ts app/api/messages/attachment/route.ts tests/message-attachment-access.test.cjs`: passed.
- Frontend `git diff --check`: passed.
- Backend `git diff --check`: failed on CRLF lines in `src/core/repositories/job.repository.ts`, `src/infrastructure/database/orm/organization.entity.ts`, and `src/infrastructure/persistence/job.repository.impl.ts`. These files are outside this task's edit scope.
- No production behavior was checked. No server was started, build was run, migration applied, or file staged or committed.

## ATS-07 offer creation atomicity

- Commit offer creation, chat and message writes, and offer-message linking as one database transaction.
- Add failure-injection tests for chat and message writes. A failed operation must leave no sent offer or partial chat message.
- Preserve post-commit notification failures as best-effort.
- Do not add a migration or change production data.

State: implemented; native review and the full route audit remain pending. `OfferLetterRepositoryImpl.createWithMessage` commits the offer, chat reuse or creation, offer message, chat last-message update, and offer-message links through one TypeORM transaction. Notification delivery stays after commit and remains best-effort. Failure-injection tests verify that chat and message write failures reject the transaction and skip notification delivery. A success test verifies the linked result and post-commit notification.

Checks:

- RED: `npx jest --runInBand src/core/services/offer-letter.service.spec.ts src/infrastructure/persistence/offer-letter.repository.impl.spec.ts` failed on the two new failure cases because `createAndSend` still used separate writes.
- GREEN: `npx jest --runInBand src/core/services/offer-letter.service.spec.ts src/infrastructure/persistence/offer-letter.repository.impl.spec.ts` passed (2 suites, 8 tests).
- Backend `npx tsc --noEmit`: passed.
- Scoped `git diff --check` for the six ATS-07 paths: passed.
- No migration was added or applied. No production behavior was checked. Native review remains pending because intended-untracked selection is unavailable in this session.

## ATS-07-1 authorization and failure-path audit

State: read-only audit recorded. ATS-07 remains in progress. This audit did not run tests or verify production.

Verified in the inspected code:

- Application creation checks the professional role and candidate or admin identity. Hiring-plan and stage writes check recruiting access. The repository transaction checks the assignee's organization.
- Event-note writes check event-level manage access.
- Offer response uses a conditional transition from `sent`. Existing tests cover competing responses. Offer creation stores the offer, chat, and message in one transaction.
- Hiring-record reads and writes check recruiting access. Note deletion checks author identity.
- Job-alert routes check session ownership before they call the service.
- Candidate-tag assignment checks access to the tag organization's data.
- The inspected frontend application write calls NestJS.

Still unverified:

- Controller tests mock access or services. They do not prove guard-to-database behavior, real organization membership, or persistence-failure behavior.
- ATS-07-3 adds create/edit authorization-denial, write-rejection, and best-effort notification regression coverage with mocks. Actual membership, database constraints, rollback, and durable delivery remain unverified.
- Offer-creation tests do not yet prove rollback at each transaction write failure.
- ATS-07-2 tests below cover mock denials and rejected writes. They do not prove real membership checks, PostgreSQL constraints, partial-record absence, or rollback.
- The inspected candidate-tag controller does not show a separate check that the candidate belongs to a job or application in the tag organization. Keep this ownership rule open. This audit does not establish a defect.
- Production rewrite, cookie, and internal-key configuration remain unverified.
- No retention interval or candidate-data deletion/export policy was found in the inspected paths. Keep the policy open.

### ATS-07-2 existing-mock coverage

State: focused mock coverage passed and committed. Native review is blocked at intended-untracked selection. The user chose the current mocks and explicit evidence limits.

Route: delegated direct. One bounded writer extends the controller spec and adds a service spec. The agreed public methods are evaluation reads and writes, note reads and creation, and note deletion.

- [x] Record the agreed test scope before changing tests.
- [x] Check denied evaluation and note access before downstream reads or writes. Note deletion first reads metadata, so its denial must prevent deletion only.
- [x] Check rejected evaluation upserts, note creation, and note deletion. Check missing write results and missing notes through the controller.
- [x] Run the focused Jest specs, backend typecheck, and scoped diff check. Record observed results.
- [x] Record the work-unit commit without staging unrelated changes. Commit: `83df59748160bafca0bca7c1b1936a97c265b17b`.

Test-first exception: this slice adds regression coverage for existing behavior and does not change production code. No behavioral RED is claimed. Unexpected failures or defects that need production changes stop this slice.

Limits: access and persistence mocks do not prove database membership, actual PostgreSQL constraints, or rollback semantics. A rejected or missing write result does not prove that no partial record exists. The repository saves evaluation or note data before it reloads the result, so a reload failure can follow a successful write. No database, guard-to-database, HTTP filter, production, RSVP, tag-ownership, or retention-policy coverage is added.

Forecast: about 420 authored changed lines including the existing untracked controller tests. The approved `feature-branch-chain` strategy applies. The user authorized inclusion of the existing 9 hiring-record controller cases. Stage only this slice and preserve the prior document edits and staged migration. Observed checks on 2026-10-10:

- Baseline `npx jest --runInBand src/interfaces/controllers/application/application-hiring-record.controller.spec.ts`: 1 suite, 9 tests passed.
- `npx jest --runInBand src/interfaces/controllers/application/application-hiring-record.controller.spec.ts src/core/services/application-hiring-record.service.spec.ts`: 2 suites, 24 tests passed. Added 12 controller cases and 3 service cases.
- `npx tsc --noEmit`: passed, exit 0.
- `git diff --check -- src/interfaces/controllers/application/application-hiring-record.controller.spec.ts src/core/services/application-hiring-record.service.spec.ts odd/tasks/ats-portal-improvements.md docs/plans/backend-roadmap.md`: passed, exit 0 before and after the commit. The pre-commit isolated-index `git diff --cached --check` also passed and covered all four committed files.
- `npx prettier --write src/interfaces/controllers/application/application-hiring-record.controller.spec.ts src/core/services/application-hiring-record.service.spec.ts`: passed before the focused tests.
- No server, build, migration, production check, or RSVP change ran.

Delivery: work-unit commit `83df59748160bafca0bca7c1b1936a97c265b17b`, `test(ats): cover hiring-record denials and write failures`. It contains only both specs and the ATS-07-2 document hunks: 421 additions and 2 deletions. The existing 9 controller cases are part of the authorized slice. An isolated index kept the pre-existing staged migration out of the commit. The migration remains staged. Prior ATS-05 document hunks remain unstaged. This commit-ID and review-result record remains uncommitted recovery metadata.

Native RDD is on. The first committed-only assessment was high/unassessable because untracked files needed an inventory declaration. After canonical STATUS returned the inventory, this exact reassessment passed:

`gentle-ai review assess --cwd /Users/dleteliers/Dev/biovity-server --agent codex --base-ref 9763ec5229309faa442a8bba16016ad923161248 --committed-only --untracked-scope=exclude --expected-untracked-inventory=sha256:31f1a9ba942fcb6b656c58c85f1ec41412967ed5ad09e67a26d0152cb0063e9b --json`

Result: `risk=medium`, `changed_paths=4`, `changed_lines=423`, `review_due=true`, `review_due_reason=slice_budget_reached`. The returned exact preflight ran:

`gentle-ai review status --cwd=/Users/dleteliers/Dev/biovity-server --contract=gentle-ai.review-integration/v2 --agent=codex --next-transition=true --base-ref=9763ec5229309faa442a8bba16016ad923161248 --committed-only=true`

STATUS returned `collect`, reason `intended_untracked_selection_required`, operation `external.select_intended_untracked`, schema `gentle-ai.review-intended-untracked-selection/v1`, target `sha256:f382f6113cd9eb203c19fdc6d8d58014c7b76c0a10773ba5c300acb321598d28`. This runtime has no tool for that exact capture. No selection was synthesized. START did not run. No native approval is claimed.

Next step: complete the exact native selection capture when available. Keep database membership, PostgreSQL constraints, rollback, event failure paths, production configuration, tag ownership, and retention policy open.

### ATS-07-3 event create/edit failure coverage

State: focused checks passed and committed. Native review is pending. Production behavior stays unchanged.

Objective: verify authorization denials and failure ordering for event creation and editing, and preserve successful saved results after best-effort notification failures.

Route: delegated direct. One bounded writer adds controller cases and a new service spec, then updates only this slice's documentation.

Scope and acceptance:

- Denied create or manage access must prevent service execution.
- Event-save or participant-seed rejection must prevent commit and notification calls. Check the rollback and release calls without claiming database rollback proof.
- An event-update rejection must prevent notification calls.
- Notification rejection after saved create or edit must preserve the successful saved result and reach the existing logger.
- Use the existing public controller/service methods with mocked external dependencies. Do not change production source, RSVP transition rules, event history, connection/start-transaction handling, or migrations.

Checklist:

- [x] ATS-07-3-PLAN: record scope and limits before test edits, then mirror and read back the full task document in Engram.
- [x] ATS-07-3-TESTS: add controller authorization and service failure-order regression cases.
- [x] ATS-07-3-CHECKS: run focused Jest, backend typecheck, scoped diff checks, and isolated cached diff check.
- [x] ATS-07-3-COMMIT: commit only this slice and record its commit ID. Commit: `610db695794c6814c83bbcdf8e974fa7edff048b`. The parent owns native assessment and review.

Checks: `npx jest --runInBand src/interfaces/controllers/event/event.controller.spec.ts src/core/services/event.service.spec.ts`, `npx tsc --noEmit`, and `git diff --check -- src/interfaces/controllers/event/event.controller.spec.ts src/core/services/event.service.spec.ts odd/tasks/ats-portal-improvements.md docs/plans/backend-roadmap.md`. Before commit, check the isolated cached diff.

Test-first exception: these regression tests cover existing behavior without production edits. No behavioral RED is required or claimed. Runtime HTTP checks do not apply to this mock-level slice.

Limits: mocks do not prove global cookie-session guards, database membership, PostgreSQL constraints or rollback, durable notification delivery, or RSVP transition policy. A rollback call is control-flow evidence only. A notification failure log is not retry or delivery proof. Database tests, other persistence paths, full-route coverage, native review, production, retention, and event history remain open.

Forecast: below 400 authored changed lines. Use the existing `feature-branch-chain` strategy. Rollback removes the new service spec, added create/edit controller cases, and ATS-07-3 document hunks only. Preserve all prior tests, document edits, and the staged migration.

Verification on 2026-10-10:

- `npx jest --runInBand src/interfaces/controllers/event/event.controller.spec.ts src/core/services/event.service.spec.ts`: passed, 2 suites and 13 tests. Added 2 controller denial cases and 5 service cases. No behavioral RED occurred because production behavior stayed unchanged.
- `npx tsc --noEmit`: passed, exit 0.
- `git diff --check -- src/interfaces/controllers/event/event.controller.spec.ts src/core/services/event.service.spec.ts odd/tasks/ats-portal-improvements.md docs/plans/backend-roadmap.md`: passed, exit 0. The isolated-index `git diff --cached --check` also passed and covered all four committed paths.
- `npx prettier --write src/interfaces/controllers/event/event.controller.spec.ts src/core/services/event.service.spec.ts`: passed before tests.
- Both full Engram task-document parts were saved and read back before test edits. Refresh them after these results and the commit record.
- No production source, RSVP policy, history, migration, server, or build changed. The exact `/remove-ai-slop` skill remains unavailable. The loaded standards were applied directly.

Commit: `610db695794c6814c83bbcdf8e974fa7edff048b`, `test(events): cover write failures and notification errors`. It contains only both event specs and ATS-07-3 document hunks: 265 additions and 2 deletions. The existing staged migration and prior document edits remain intact. This commit-ID record remains uncommitted recovery metadata. Both full Engram parts were refreshed and read back after the result and commit record. The parent owns native assessment and review. No native approval is claimed.

## ATS-02 checklist

- [x] Choose the chat recruiter only when that user still has recruiter access to the offer organization. Otherwise choose the earliest eligible organization member who can recruit.
- [x] Commit the final offer response and its durable email intent in one transaction. Use a conditional transition from `sent` so competing responses cannot both succeed.
- [x] Store the selected recipient and immutable email source data with the intent. Retries use the same recipient and event payload.
- [x] Add a retrying NestJS bridge to a private Next.js endpoint. Validate its service secret and narrow payload. Accept an identical event-key replay and reject a different payload for that key.
- [x] Reconcile final offer responses that lack an intent. Record safe retry state and errors. Keep email enqueue failure from changing the saved response result.
- [x] Say that the offer response was accepted or rejected. Do not claim that the application stage changed.
- [x] Test recipient access selection, conditional responses, intent durability, idempotency, conflicting payloads, retry recovery, and email wording.
- [x] Apply migration `1791800000008-OfferResponseEmailIntent`. Supabase and TypeORM record the migration.

Design: NestJS stores the final response and a durable intent in one transaction. It snapshots the eligible recipient, candidate name, job title, and response. A NestJS bridge retries that intent through `POST /api/internal/offer-response-email`. Next.js validates the shared secret and payload, then enqueues the message in its existing outbox. The outbox stores a payload fingerprint so it can accept the same event after delivery clears the HTML. It rejects a changed payload for the event key.

Checks:

- `npx jest --runInBand src/core/services/admin-legacy-chats.service.spec.ts src/infrastructure/persistence/chat.repository.impl.spec.ts src/interfaces/controllers/admin/admin-legacy-chats.controller.spec.ts`
- `npx tsc --noEmit` in `biovity-server`
- `node --test tests/*.test.cjs` in `biovity`
- `npx tsc --noEmit` in `biovity`
- `npx jest --runInBand src/core/services/offer-letter.service.spec.ts src/core/services/offer-response-email-bridge.service.spec.ts src/infrastructure/persistence/offer-response-email-intent.repository.impl.spec.ts src/infrastructure/persistence/offer-letter.repository.impl.spec.ts`: 4 suites, 8 tests passed.
- `node --test tests/*.test.cjs`: 184 tests passed.
- `npx tsc --noEmit` passed in both repositories.
- `npx biome check app/api/internal/offer-response-email/route.ts lib/email-outbox.ts tests/email-outbox-offer-response.test.cjs`: passed.
- Frontend `git diff --check`: passed. Backend `git diff --check` reports CRLF in `src/core/repositories/job.repository.ts`, `src/infrastructure/database/orm/organization.entity.ts`, and `src/infrastructure/persistence/job.repository.impl.ts`.
- Test-first RED: the exact focused Jest command failed before implementation because the durable-intent constructor, bridge, and repository did not exist. The same command passed after implementation.
- Migration `1791800000008-OfferResponseEmailIntent` is applied and registered. Production email delivery checks remain open.
- The bridge uses `OFFER_RESPONSE_EMAIL_DISPATCH_URL` and the existing `EMAIL_OUTBOX_SECRET`. Production settings were not changed or verified.
- Native review remains pending. The exact `external.select_intended_untracked` capture is unavailable in this session. No substitute capture or review was run.
- The Engram mirror remains pending because this session exposes no memory tools.
- `npx biome check app/dashboard/@admin/chats/page.tsx components/dashboard/admin/AdminLegacyChatsContent.tsx components/dashboard/admin/sidebarshell.tsx lib/data/nav-data.ts app/api/admin/chats/route.ts 'app/api/admin/chats/[chatId]/organization/route.ts' lib/api/admin-chats.ts lib/api/admin-chats.test.ts`
- `git diff --check` in both repositories

## Authorized edit surfaces

- `docs/plans/backend-roadmap.md`
- `src/core/services/organization-verification.service.ts`
- `src/core/services/organization-verification.service.spec.ts`
- `src/core/services/organization-public.service.ts`
- `src/core/repositories/job.repository.ts`
- `src/infrastructure/database/migrations/1791800000005-OrganizationVerification.ts`
- `src/infrastructure/database/orm/organization.entity.ts`
- `src/infrastructure/persistence/job.repository.impl.ts`
- `src/interfaces/controllers/job/job.controller.ts`
- `src/interfaces/controllers/organization/organization-verification.controller.ts`
- `src/interfaces/controllers/organization/organization.module.ts`
- `src/interfaces/dtos/organization/organization-verification.dto.ts`
- `src/shared/auth/organization-access.service.ts`
- `src/shared/auth/organization-access.service.spec.ts`
- `components/dashboard/admin/AdminOrganizationVerificationQueue.tsx`
- `components/dashboard/admin/AdminOrganizationsContent.tsx`
- `components/dashboard/organization/CompanyVerificationNotice.tsx`
- `components/dashboard/organization/CompanyVerificationTab.tsx`
- `components/dashboard/organization/OrganizationProfileContent.tsx`
- `components/dashboard/organization/sidebarshell.tsx`
- `lib/api/organizations.ts`
- `odd/tasks/ats-portal-improvements.md`
- `src/infrastructure/persistence/job.repository.impl.spec.ts`
- `src/interfaces/controllers/organization/organization-verification.controller.spec.ts`
- `src/core/domain/entities/chat.entity.ts`
- `src/core/use-cases/chat/chat.use-case.ts`
- `src/infrastructure/database/orm/chat.entity.ts`
- `src/infrastructure/persistence/chat.repository.impl.ts`
- `src/infrastructure/persistence/chat.repository.impl.spec.ts`
- `src/interfaces/controllers/chat/chat.controller.ts`
- `src/interfaces/dtos/chat/chat-create.dto.ts`
- `src/interfaces/dtos/chat/chat-response.dto.ts`
- `src/shared/auth/organization-access.service.ts`
- `src/shared/auth/organization-access.service.spec.ts`
- `src/shared/mappers/chat/chatDomain-orm.mapper.ts`
- `src/shared/mappers/chat/chatDomain-dto.mapper.ts`
- `src/shared/mappers/chat/chatDto-domain.mapper.ts`
- `src/infrastructure/database/migrations/1791800000006-ChatOrganization.ts`
- `lib/api/chats.ts`
- `lib/api/use-chats.ts`
- `components/dashboard/organization/TalentContent.tsx`
- `components/dashboard/organization/TalentDetailSheet.tsx`
- `components/dashboard/organization/organizationApplicationsContent.tsx`
- `app/dashboard/@organization/offers/[id]/applications/[applicationId]/page.tsx`
- `src/core/repositories/chat.repository.ts`
- `src/infrastructure/persistence/chat.repository.impl.ts`
- `src/infrastructure/persistence/chat.repository.impl.spec.ts`
- `src/infrastructure/database/orm/chat.entity.ts`
- `src/infrastructure/database/migrations/1791800000007-ChatOrganizationReview.ts`
- `src/interfaces/controllers/admin/admin.module.ts`
- `src/interfaces/controllers/admin/admin-legacy-chats.controller.ts`
- `src/interfaces/controllers/admin/admin-legacy-chats.controller.spec.ts`
- `src/core/services/admin-legacy-chats.service.ts`
- `src/core/services/admin-legacy-chats.service.spec.ts`
- `src/interfaces/dtos/admin/admin-legacy-chats.dto.ts`
- `src/infrastructure/database/orm/index.ts`
- `src/shared/auth/roles.guard.ts`
- `app/dashboard/@admin/chats/page.tsx`
- `components/dashboard/admin/AdminLegacyChatsContent.tsx`
- `components/dashboard/admin/sidebarshell.tsx`
- `lib/data/nav-data.ts`
- `app/api/admin/chats/route.ts`
- `app/api/admin/chats/[chatId]/organization/route.ts`
- `lib/api/admin-chats.ts`
- `lib/api/admin-chats.test.ts`

## Progress

- Current branch: `codex/ats-portal-improvements` in both repositories.
- ATS-09 uses delegated direct work because it changes the chat contract, persistence, migration, authorization, and frontend callers.
- Company verification code has focused Jest and TypeScript checks. Full repository checks for this update are recorded below. Native review remains pending.
- Interview filter work has an approved Sentinel review and focused checks from the prior task turn.
- Backend focused Jest checks passed: 3 suites and 18 tests. Full backend verification passed: 36 suites and 155 tests. Backend `npx tsc --noEmit` passed.
- Frontend verification passed: 180 tests, `npx tsc --noEmit`, and the requested Biome check.
- Server `git diff --check` reports CRLF in three files. `git -c core.whitespace=cr-at-eol diff --check` passed.
- Migration `src/infrastructure/database/migrations/1791800000006-ChatOrganization.ts` is staged and unapplied. No production data changed.
- Full repository checks for ATS-09 passed: backend 36 suites and 155 tests, frontend 180 tests, both TypeScript checks, and frontend Biome. Server `git diff --check` reports CRLF in `src/core/repositories/job.repository.ts`, `src/infrastructure/database/orm/organization.entity.ts`, and `src/infrastructure/persistence/job.repository.impl.ts`; `git -c core.whitespace=cr-at-eol diff --check` passed.
- ATS-10 focused Jest passed: 3 suites and 16 tests. Backend and frontend `npx tsc --noEmit`, frontend `node --test tests/*.test.cjs` (180 tests), and the requested frontend Biome check passed.
- The authenticated-admin correction passed `npx jest --runInBand src/interfaces/controllers/admin/admin-legacy-chats.controller.spec.ts` with 1 suite and 5 tests. Backend `npx tsc --noEmit` passed.
- ATS-10 `git diff --check` passed in the frontend. The backend check reports the same CRLF lines in the three files above.
- Migration `src/infrastructure/database/migrations/1791800000006-ChatOrganization.ts` is staged and unapplied. `1791800000007-ChatOrganizationReview.ts` exists as an ignored file and is unapplied. `1791800000000-application-hiring-records.ts` is untracked. No migration ran in this task. Its production state is not verified.
- ATS-10 implementation is complete, including authenticated-admin checks on every queue, detail, verified-organization, and assignment endpoint. Native technical review and production migration approval remain pending. The admin review page leaves chats unassigned when evidence is insufficient, and organization sends remain blocked for those chats.
- RDD is on in both repositories. Selectorless STATUS returned `collect` with `external.select_intended_untracked`. This session had no tool to perform that exact capture, so no selection was synthesized and no native review transaction started. The native assess result was high or unassessable because files remain untracked. No review passed.
- The user authorized production migrations after native review. The destination credentials, session, and exact production execution context remain unspecified. No production migration was applied.
- The Engram task mirror is pending because this session exposes no memory tools.
- Phase 0 audit mapped applications, messages, events, offers, and job alerts to NestJS. The traced controllers check record ownership. The audit did not verify every route or production behavior.
- Application, message, and event notifications run after the main write. Failures log without durable retry. `NotificationService` can swallow insert failures.
- At the Phase 0 audit, NestJS sent offer-response email directly through `EmailService`, without retry. ATS-02 now stores a durable NestJS intent and sends it through the Next.js outbox.
- ATS-02 recipient policy is resolved and implemented: notify the first active organization member who can recruit. The Phase 0 audit found that the code trusted the chat recruiter without checking access and otherwise selected the earliest direct organization owner. ATS-02 now checks eligibility and saves the selected recipient with the intent.
- Production database state and email provider settings remain unverified. No migration was applied.

## Next step

Keep ATS-09 and ATS-10 open until their native review and migration steps finish. ATS-02 and ATS-11 native reviews are pending. The production migration also needs approved credentials, session details, and an exact execution context. No review capture or migration was run for ATS-02 or ATS-11.

## ATS-11 acceptance

Design: keep the current email-intent repository as the response transaction boundary. Its conditional `sent` update elects one response. In the same transaction, update the application and stage history, update the existing offer message, then insert the durable email intent with the current recipient query and event key. Keep notification after commit. No schema change is planned.

- Accept or reject an offer only when its current state is `sent`.
- Commit the offer response, matching application status and stage history, chat message, and one durable response-email intent in the same database transaction.
- Reject a concurrent second response without partial writes.
- Keep the existing email recipient and idempotency rules.
- Add focused tests for accepted, rejected, transaction failure, and concurrent responses.
- Keep migration and production state unchanged unless a schema change proves necessary. If a new migration is required, stop and report the exact schema need before creating it.
- Run focused backend tests, type checking, and diff checks. Do not start a server or run a build.

Verification: the focused Jest run first failed with 2 suites and 5 tests after the new cases were valid. After implementation, the focused Jest command passed with 5 suites and 16 tests. A parent spot-check repeated that command and passed. `npx tsc --noEmit` passed. `git diff --check` on the ATS-11 paths passed. The service no longer performs application or message writes after the transaction. No migration or production data change was made. Native review remains pending because the selectorless status requests schema-bound untracked-file selection and this session has no valid capture operation for that schema. No substitute review ran.

## ATS-07-7 application initial status-history persistence tests

State: implemented. Focused checks pass. Native review remains pending. Mock-based tests cover initial status-history persistence in `ApplicationRepositoryImpl.create`. Production code is unchanged.

Route: delegated direct. One bounded writer updates this task plan, the existing application repository spec, and the backend roadmap.

Scope and acceptance:

- Verify a successful create inserts one initial status-history row with the saved application ID, status, candidate ID, and creation time.
- Verify a rejected history insert propagates out of the transaction callback after the application save call.
- Use the existing mocks. Do not claim that they prove PostgreSQL rollback or row absence.
- Preserve unrelated staged, unstaged, and untracked work. Commit only the exact test and documentation hunks through an isolated temporary index.
- Do not stage migrations or deletions. Do not open a pull request.

Checklist:

- [x] ATS-07-7-PLAN: record scope, acceptance, route, forecast, commands, and mock limits before editing tests.
- [x] ATS-07-7-TESTS: add success and rejected-history-insert cases without production changes.
- [x] ATS-07-7-CHECKS: run the requested formatter, focused Jest spec, backend typecheck, and scoped diff check.
- [x] ATS-07-7-COMMIT: inspect the complete isolated staged diff, commit only this slice, and record the commit ID: `3b56395`. The parent owns native assessment and review.

Test-first exception: this slice adds regression tests for existing behavior. Production code stays unchanged, so no behavioral RED is claimed. If the rejected-insert test exposes a concrete production defect, stop before changing production code.

Forecast: under 400 authored changed lines. Use the existing `feature-branch-chain` strategy. Rollback removes only the new create tests and ATS-07-7 documentation hunks. Preserve all other worktree and index content.

Checks:

- Run `npx prettier --write src/infrastructure/persistence/application.repository.impl.spec.ts odd/tasks/ats-portal-improvements.md docs/plans/backend-roadmap.md`.
- Run `npx jest --runInBand src/infrastructure/persistence/application.repository.impl.spec.ts`.
- Run `npx tsc --noEmit`.
- Run scoped `git diff --check` for the three allowed paths.
- Inspect and check the complete isolated staged diff before commit.

Mock limits: the tests observe calls and promise rejection in a mocked transaction callback. They do not prove PostgreSQL transaction rollback, row absence, or database constraints.

Verification on 2026-10-10:

- `npx prettier --write src/infrastructure/persistence/application.repository.impl.spec.ts odd/tasks/ats-portal-improvements.md docs/plans/backend-roadmap.md`: passed. The two documentation files were unchanged by formatting.
- `npx jest --runInBand src/infrastructure/persistence/application.repository.impl.spec.ts`: passed (1 suite, 6 tests).
- Parent spot-check on 2026-10-11: the same Jest command passed (1 suite, 6 tests).
- `npx tsc --noEmit`: passed, exit 0.
- `git diff --check -- src/infrastructure/persistence/application.repository.impl.spec.ts odd/tasks/ats-portal-improvements.md docs/plans/backend-roadmap.md`: passed, exit 0.
- Isolated `git diff --cached --check`: passed, exit 0. The complete isolated diff contains only the new application repository spec and ATS-07-7 additions to the task plan and roadmap.
- No production source, migration, server, build, or database action ran. The mocks do not prove real rollback or row absence.

Commit: `3b56395`, `test(ats): cover application status history persistence`. It contains only the new application repository spec and ATS-07-7 documentation additions: 348 insertions across three files. The existing staged migration, deletion, and all earlier document changes remain outside the commit. The commit-ID record remains unstaged recovery metadata. No native approval is claimed.

## ATS-07-8 application-answer repository coverage

State: complete locally. This test-only slice covers answer persistence mapping and query/delete behavior with repository mocks. Production code and schema stay unchanged. Native review and any database-backed check remain pending.

Scope and acceptance:

- Verify all seven repository methods: ID and application reads, multi-application reads, create, bulk create, delete, and question existence.
- Verify `findByApplicationIds` maps returned rows and skips the query when the input list is empty.
- Verify `deleteByApplicationId` returns true for affected rows and false for zero or unknown affected counts.
- Do not claim database constraints, persistence durability, or transaction behavior from repository mocks.
- Preserve unrelated staged, unstaged, and untracked work. Do not commit this slice while the shared roadmap contains earlier uncommitted work.

Checklist:

- [x] ATS-07-8-PLAN: record scope, acceptance, and mock limits before test changes.
- [x] ATS-07-8-TESTS: add focused repository tests without production changes.
- [x] ATS-07-8-CHECKS: run focused Jest, backend typecheck, formatter, and scoped diff check.
- [x] ATS-07-8-ROADMAP: record observed results in this plan and the shared roadmap.

Verification commands:

- `npx jest --runInBand src/infrastructure/persistence/application-answer.repository.impl.spec.ts`
- `npx tsc --noEmit`
- `npx prettier --check src/infrastructure/persistence/application-answer.repository.impl.spec.ts odd/tasks/ats-portal-improvements.md docs/plans/backend-roadmap.md`
- `git diff --check -- src/infrastructure/persistence/application-answer.repository.impl.spec.ts odd/tasks/ats-portal-improvements.md docs/plans/backend-roadmap.md`

Observed results on 2026-10-10:

- Focused Jest passed: 1 suite, 12 tests. Coverage includes missing and found ID reads, application reads, question existence true/false, create and bulk mapping, multi-application reads, empty-list short circuit, and delete result mapping for positive, zero, and null `affected` counts.
- `npx tsc --noEmit` passed.
- Prettier completed for the new spec and reported no documentation changes.
- Scoped `git diff --check` passed.
- The mocks verify TypeORM call arguments and result mapping only. They do not verify PostgreSQL behavior or database constraints.
- No production code, migration, server, build, production test, stage, or commit ran.

## ATS-07-9 recruiter productivity attribution

State: implementation, focused checks, and Sentinel review complete. PostgreSQL, production, and native RDD review remain open.

The previous metric code repeated organization-wide application counts, interview counts, and response averages for every member. It now counts distinct applications with a non-pending transition by the member during the selected period, completed interviews organized by the member and grouped by scheduled start time, and the average time from application creation to the first recorded response. It attributes each application to the author of that first response and selects applications by creation date.

Checks:

- The first test run failed because the old implementation required no status-history query dependency. After the implementation change, `npx jest --runInBand src/core/services/organization-metrics.service.spec.ts` passed (1 suite, 2 tests).
- `npx tsc --noEmit` passed.
- Prettier and the scoped diff check passed.
- Mock tests check actor filters, organizer filters, completed-event status, a recruiter with no responses, deterministic history-ID tie-breaking, and empty-member short-circuiting.
- The mocks do not execute SQL or verify PostgreSQL date, join, aggregate, or data behavior. The schema has no interview completion timestamp, so the metric groups completed events by scheduled start time. Production validation remains open.
- Sentinel approved the service and expanded spec. This review does not replace native RDD review or PostgreSQL validation.
- No migration, database, production, server, build, stage, or commit ran.

## ATS-METRICS-FUNNEL historical conversion

State: code and focused checks complete. Sentinel approved. PostgreSQL and browser validation remain open.

The funnel used current statuses as a proxy for historical progress. That hid candidates who reached an interview or offer and later moved to a rejected or withdrawn stage. The metrics API now counts distinct applications that ever reached each canonical stage from `application_status_history.new_status`. Counts use the same organization and Santiago-local creation-date cohort as total applications. A hire counts as reaching an offer. The dashboard uses those counts; current status totals remain separate.

Checks:

- `npx jest --runInBand src/core/services/organization-metrics.service.spec.ts` passed (1 suite, 7 tests). The focused spec models a cohort where three of four applications reached interview, including one now closed. It expects one offer and a 75% interview conversion.
- The spec checks the historical query and Santiago cohort parameters. Mocks do not execute SQL or prove PostgreSQL behavior.
- Both repository typechecks, scoped Biome, backend ESLint on the changed service and DTO, Prettier, and scoped diff checks passed.
- The public landing showcase keeps its illustrative data contract.
- Sentinel approved the code and matching roadmap entry. PostgreSQL and browser validation remain open.

Open: verify the aggregate query with PostgreSQL data, validate dashboard display in the browser, and implement per-custom-stage conversion with source-row drilldown.

Update 2026-10-13: the PostgreSQL query returned one distinct application in the Santiago cohort from 2026-09-13 through 2026-10-13. That application reached interview, offer, and hire. The result uses aggregate counts only. This confirms the historical query with current data. Browser review remains open.

Update 2026-10-13: the cohort also has an initial history row with `contratado` at application creation. The funnel and source attribution now ignore history rows without a previous status. The later offer acceptance remains a valid hire transition. The SQL check found one progression for each reached stage.

Sentinel approved the query changes. The metrics spec passes 13 tests, `npx tsc --noEmit` passes, and Prettier passes for the touched TypeScript and task-plan files. The mocks check SQL predicates. Supabase confirms the current hire transition returns 4.950 days. Browser review remains open.

## ATS-METRICS-HIRING time to hire

State: code and focused checks complete. Sentinel approved. PostgreSQL and browser validation remain open.

The hiring-time metric used the current status and `stageChangedAt`. This missed applications that reached `contratado` and later reopened. It also ignored the dashboard period. The metric now finds the first historical `contratado` transition, computes elapsed days from application creation, and averages applications created during the selected period. The cohort uses organization scope and Santiago-local half-open date boundaries. SQL interprets both timestamp-without-zone columns as UTC before it calculates elapsed time. Negative intervals do not enter the average. The dashboard label and CSV label now say `Tiempo hasta contratación`.

Checks:

- `npx jest --runInBand src/core/services/organization-metrics.service.spec.ts` passed (1 suite, 9 tests).
- `npx tsc --noEmit`, frontend `bun typecheck`, backend ESLint for the service, Prettier, and frontend Biome passed.
- The service spec checks the first-hire SQL, UTC conversion, organization filter, inclusive start and exclusive end date predicates, positive intervals, rounding, and empty cohort. Mocks do not execute SQL or prove production timestamps.
- No schema change is required.

Open: test the aggregate query and existing timestamp values with PostgreSQL. Check the dashboard and CSV in the browser. Confirm that historical `changed_at` values represent UTC.

Update 2026-10-13: the database has an initial `contratado` history row at application creation and a later `contratado` stage transition when the candidate accepted the offer. The old `MIN(changed_at)` selected the zero-duration initial row and returned no average. The query now requires `transition_kind = 'stage'` and a non-null `previous_status`. Supabase returned a 4.950-day interval for the real transition. The TypeORM columns are `timestamp without time zone`, and the current session uses UTC. This verifies the current row; historic timestamp conventions and browser review remain open.

## Onboarding queue slice

State: implementation and focused local checks complete. Production validation remains for the user.

Decision: a complete company profile requires name, website, description, industry, size, city, and country. Phone and logo stay optional. This follows the user's approval on 2026-10-10.

Scope:

- Add a read-only `organization_onboarding` queue filter for companies that miss one or more approved onboarding milestones: corporate email verified, complete profile, legal review approved, and first job created.
- Read email verification from the organization's owner user. Require both a verified email and an exact normalized match between the email domain and website domain. Treat a missing owner, email domain, website domain, or a mismatch as unverified.
- Count any created job as the first-job milestone. Keep this separate from the existing no-active-jobs filter.
- Return all four milestone states and the missing profile field keys so the admin can see what remains.
- Keep follow-up owners, due dates, and write actions out of scope until their policy is defined.
- Preserve unrelated staged, unstaged, and untracked work. Do not deploy, apply migrations, start a server, build, or test production.

Backend files: `src/core/services/admin-operations-queue.service.ts`, `src/core/services/admin-operations-queue.service.spec.ts`, and `src/interfaces/dtos/admin/operations-queue.dto.ts`.

Acceptance:

- The queue includes a company when any approved milestone is false.
- The profile check requires each of the seven approved fields after trimming whitespace.
- The query treats absent owner data as unverified and does not require phone or logo.
- The query marks the email milestone complete only when the confirmed owner email domain matches the organization's website domain, including `www` and URL protocol normalization.
- Existing queue types, search, and pagination remain unchanged.
- Frontend shows the missing milestones and profile fields from the response.
- Focused tests, type checks, formatting, and scoped diff checks pass locally.

Backend checks so far:

- `npx jest --runInBand src/core/services/admin-operations-queue.service.spec.ts` passed (1 suite, 5 tests).
- A follow-up now requires the owner email to be verified and its domain to match the normalized website domain. Domain mismatches stay in the onboarding queue. The query-mock test checks the SQL condition, but it does not execute PostgreSQL.
- `npx tsc --noEmit` passed.
- Prettier completed for the three backend code paths.
- Scoped `git diff --check` passed for the backend paths.
- These query-mock tests inspect SQL text and pass mock response rows through. They do not run SQL against PostgreSQL or verify database values.

Frontend checks:

- `node --test tests/admin-operations-queue.test.cjs` passed (4 tests).
- Biome and frontend `tsc --noEmit` passed.
- The frontend accepts null milestone data for non-onboarding queue rows and labels onboarding records as organizations.
- Backend focused Jest passed (2 suites, 12 tests), `npx tsc --noEmit`, Prettier, and scoped diff checks passed.
- These checks use mocks. No live PostgreSQL, production, migration, server, or build check ran.

## ATS-10 admin legacy chat proxy tests

State: focused route tests complete. The production routes are unchanged.

Scope: test the Next.js detail and organization-assignment handlers for legacy chat review. Check admin authorization before backend calls, reject invalid payloads, validate backend detail and assignment shapes, forward accepted assignments, and preserve backend conflict status.

Checks:

- `node --test tests/admin-legacy-chat-route.test.cjs` passed (11 tests).
- Frontend TypeScript type check passed.
- Mocks cover the route-level admin decision and NestJS responses. They do not test the real Better Auth session helper, live session cookies, NestJS guards, database membership, PostgreSQL, or production HTTP behavior.
- Biome does not process `.cjs` files in this repository.
- No production code, migration, server, build, stage, or commit ran.

## ATS-04 legal verification tests

State: focused controller and hiring-gate tests complete. Production code is unchanged.

Scope: verify that the legal review endpoint rejects a missing reviewer and records the decision with the authenticated admin ID. Also verify that recruiters cannot perform hiring actions while legal review is pending, rejected, suspended, or has no organization row. The `@Roles('admin')` guard remains outside controller unit tests.

Checks:

- `npx jest --runInBand src/interfaces/controllers/organization/organization-verification.controller.spec.ts src/core/services/organization-verification.service.spec.ts` passed (2 suites, 14 tests).
- `npx jest --runInBand src/shared/auth/organization-access.service.spec.ts` passed (1 suite, 19 tests).
- `npx tsc --noEmit` passed.
- These tests use service, controller, and data-source mocks. They do not verify the global role guard, route session integration, transaction rollback, PostgreSQL, or production behavior.
- No migration, server, build, production test, stage, or commit ran.

## ATS-03 company profile onboarding contract tests

State: focused controller and service tests complete. Production code and schema are unchanged.

Scope: verify that the seven approved profile fields pass from the organization update route to the service. Verify that phone and logo stay optional and that partial updates preserve their saved values.

Checks:

- `npx jest --runInBand src/interfaces/controllers/organization/organization.controller.spec.ts src/core/services/organization.service.spec.ts` passed (2 suites, 2 tests).
- The tests use NestJS testing modules with mocked services and repositories. They do not verify PostgreSQL persistence, the onboarding queue SQL, session guards, or production behavior.
- No migration, server, build, production test, stage, or commit ran.

## ATS-13 signed approval for recruiter AI mutations

State: implementation and focused local checks complete. The migration is applied and registered. Registry-wide local coverage now checks all tools.

Scope: keep AI SDK 6 tool-level approval flags, derive the signing secret from the server-only Better Auth secret plus user and organization IDs, consume each approved tool-call ID once in PostgreSQL at execution time, and show exact tool inputs before approval. Show controls for every SDK approval request, independent of tool name. Require approval for all recruiter mutation tools, including `updateJob`, which had no prior approval marker. A repeated approval returns a tool error and cannot run the mutation again.

Checks:

- `node --test tests/ai-tool-approval.test.cjs` passed (6 tests).
- `bun typecheck` passed.
- Scoped Biome check passed for the route, UI, helper, and organization tool files. It reports 5 existing warnings in unrelated `AgentChat.tsx` lines.
- `bunx biome lint lib/ai/tools/external.ts` passed.
- Scoped diff checks passed.
- Sentinel approved the execution-time, one-use approval guard. The registry-wide test confirms every tool has a classification and every mutation passes through the guard. PostgreSQL concurrency remains unverified.

Limits: local tests check tool classification, approval flags, the one-use guard with a mock consumer, and per-user/per-organization secret derivation. They do not verify PostgreSQL replay behavior, a real browser approval, provider response, secret deployment, or production session. A database failure blocks the mutation. A crash after consuming an ID can require a new AI request. Add a disposable-PostgreSQL concurrency test before release.

### ATS-05-1f avisos persistentes de cambios de entrevista

Estado: código y migración `1791800000022-EventChangeNotificationIntent` aplicados. RLS y permisos de las tablas nuevas verificados. La prueba reversible en PostgreSQL confirmó inserción, unicidad, auditoría y limpieza. Sentinel aprobó el código. Pendientes: validar el flujo desde la interfaz y confirmar la entrega del cron en producción.

- Guarda un aviso por participante afectado en la transacción del cambio y su historial.
- Los cambios omiten a quienes rechazaron. Las cancelaciones incluyen a todos los participantes, excepto a quien organiza.
- El worker revisa las preferencias actuales dentro de la transacción de entrega.
- El worker reintenta hasta 8 veces y deriva los fallos agotados a la cola admin.
- La cola muestra metadatos mínimos y permite un reintento con auditoría del admin.
- El aviso no expone enlaces de reunión ni el detalle privado de los cambios.
- La migración activa RLS y quita permisos REST de los roles API en las tablas nuevas.

Estado actualizado: pruebas focalizadas, typecheck, formato, revisión Sentinel y migración ya constan en esta tarea. Pendiente: validar el flujo desde la interfaz y la entrega del cron en producción.

### ATS-05-1g recordatorio durable de entrevista

Estado: código implementado. Sentinel aprobó esta parte. La migración `1791800000038-InterviewReminderIntent` está aplicada. Usa `0038` porque `0031` ya identifica una migración SQL aplicada en la base activa. Al cerrar `0038`, `migration:show` confirmó que no quedaban migraciones TypeORM pendientes. `0039` se aplicó después y se verificó con consultas SQL. `npx tsc --noEmit`, Prettier y cinco suites focalizadas de avisos y matching pasan. No se probaron PostgreSQL con datos ni la entrega del cron.

- Crea un intento por asistente dentro de la transacción de creación de entrevista.
- Al cambiar la hora, cancela intentos no enviados y crea intentos para el nuevo horario.
- Al rechazar RSVP, suprime el intento. Si la persona acepta después, restablece el intento si el aviso aún no se envió.
- El worker corre cada minuto. Revisa la entrevista, hora, RSVP, cuenta activa y preferencias actuales antes de insertar el aviso y aceptar el intento en la misma transacción.
- Reintenta fallos hasta 8 veces con espera creciente. Después marca el intento como `dead`.
- Admins pueden reencolar intentos `dead` con auditoría. El reintento bloquea la entrevista y vuelve a comprobar horario, estado, participante, cuenta activa y preferencias. Oculta o rechaza avisos vencidos, cancelados, con hora distinta, rechazados o con avisos desactivados.
- La auditoría guarda el admin y el conteo anterior en `interview_reminder_notification_admin_retry`. La tabla tiene RLS y no da acceso directo a roles de API.

Checks: backend Jest pasó 2 suites y 46 pruebas. `npx tsc --noEmit`, Prettier y diff check pasaron. Frontend pasó 15 pruebas, `bun typecheck`, Biome y diff check. Sentinel aprobó la recuperación admin. La migración está aplicada. PostgreSQL con datos y la entrega completa siguen sin probar. Los mocks no prueban bloqueos ni rollback.

## ATS-04/ATS-ONBOARDING: separar acceso rápido y revisión legal

Estado: implementación y migraciones aplicadas. La base activa registra `1791800000005`, `0011`, `0013`, `0017` y `0019`. La revisión nativa y la prueba integral desde la interfaz siguen pendientes.

La empresa conserva acceso al panel y puede preparar ofertas como borradores mientras completa su perfil y la revisión. Solo la revisión legal aprobada habilita publicaciones activas. La solicitud requiere los siete campos de perfil acordados y correo del dueño verificado con el mismo dominio del sitio. El backend vuelve a comprobar esos requisitos al aprobar. La cola admin muestra el correo y el estado de preparación.

Límites: las pruebas usan mocks. No ejecutan SQL, validan correo real, envían avisos ni prueban producción. Una consulta previa confirmó las tablas y triggers. La interfaz y los flujos completos siguen pendientes.

Protección posterior a la aprobación: la migración `1791800000011-RevokeCompanyVerificationOnIdentityChange` revoca la verificación y pasa ofertas activas a borrador si cambia el nombre, sitio, ciudad o país, se vacía un campo obligatorio, o cambia el correo confirmado o el vínculo del dueño. El registro de la base activa confirma que se aplicó. Una consulta de solo lectura confirmó que existen ambos triggers. Falta probar su comportamiento con cambios de datos reversibles.

## ATS-ONBOARDING-2: asignar responsable de activación

Estado: implementación local. Sentinel aprobó el alcance revisado. El registro de la base activa confirma que las migraciones `1791800000013` y `1791800000017` se aplicaron.

El admin puede tomar un caso libre o liberar uno que tiene asignado. La cola solo muestra la acción de liberar a quien tiene el caso asignado. Dos admins no pueden tomar el mismo caso. La asignación no habilita ni reemplaza la revisión legal. El servidor usa la identidad de la sesión, comprueba que el caso siga en la cola, y guarda el cambio con su auditoría en una transacción. La cola permite filtrar casos asignados o libres y muestra el responsable y el último cambio.

Checks:

- Backend Jest: 2 suites y 15 pruebas focalizadas. Incluye autorización admin, claim concurrente condicional, liberación propia, conflictos, auditoría y caso cerrado.
- Backend `npx tsc --noEmit` pasó.
- Frontend `bun typecheck`, Biome y `git diff --check` pasaron.
- `node --test tests/admin-operations-queue.test.cjs tests/admin-onboarding-assignment-route.test.cjs` pasó 9 pruebas.
- DeepWiki confirmó que TypeORM requiere usar el `EntityManager` transaccional para todas las consultas de la transacción.

Límites: los mocks no ejecutan las consultas ni restricciones en PostgreSQL y no prueban la carrera con dos sesiones reales. La migración `1791800000013-OrganizationOnboardingAssignment` agrega estado y auditoría inmutable; no se aplicó. No se añadió SLA ni fecha objetivo. No se inició servidor, build ni prueba de producción.

### ATS-05-1d RSVP response window

- [x] Enforce changes only for scheduled events before start. Return HTTP 409 when the response window is closed.
- [x] Keep same-status retries idempotent after event closure.
- [x] Lock the event row before the participant row in the status-history transaction.
- [x] Add focused mocked repository and service tests.
- [ ] Verify PostgreSQL locks, cancellation races, and exact start-time behavior.

Limits: mocks check branch behavior and ensure rejected changes do not save status/history or send notifications. They do not prove database lock ordering or concurrent transaction behavior. No migration, production database, or UI check ran.

### ATS-05-1e event edit and cancellation history

- [x] Save each real event edit or cancellation with actor, action, timestamp, and field-level before/after values.
- [x] Lock the event row and write the event plus its audit row in one transaction.
- [x] Route PATCH cancellation and DELETE soft-cancel through the same idempotent operation. Keep completed and cancelled events closed to later edits.
- [x] Expose `GET /events/:id/change-history` to users with event-management access.
- [x] Notify participants only after a real edit or cancellation commits.
- [x] Show the event change history in the organization calendar event detail modal. Fetch only while the modal is open, and refresh the history after event edits or cancellations.
- [x] Apply migration `1791800000014-EventChangeHistory`.
- [ ] Verify event history persistence, rollback, and races with PostgreSQL.

Limits: repository and service tests use mocks. They check change snapshots, lock requests, repeated cancellation, and notification flow. They do not prove PostgreSQL rollback, concurrent edits, or guard-to-database access. The event-history API limits access to event managers because the audit can contain meeting links. Hard deletion is blocked while event history exists.

Frontend follow-up: the organization calendar detail modal fetches this history only while open and refreshes it after edits or cancellations. The API and server-rendered UI tests passed with 12 frontend tests total. `bun typecheck`, Biome, and the focused diff check passed. Tests mock the API and do not prove session authorization, browser behavior, or production display.

### ATS-02 structured rejection reasons

State: local implementation complete. Sentinel approved. Migration `1791800000015-ApplicationRejectionReasons` is applied. PostgreSQL constraint, rollback, and concurrency checks remain pending.

- [x] Let each organization manage active rejection reasons. Deactivate reasons instead of deleting them.
- [x] Serialize catalog writes on the organization row so concurrent create and reactivation operations check the latest committed labels.
- [x] Require an active reason for rejected status and pipeline-stage transitions.
- [x] Check that the reason belongs to the organization that owns the application job.
- [x] Save the reason ID and label snapshot with the transition history in one transaction.
- [x] Show reason management in pipeline settings and require a reason for individual and bulk rejection.
- [x] Block drag-and-drop into a rejected stage so it cannot bypass reason selection.
- [x] Pass the reason through organization and external AI mutation tools.
- [x] Add frontend API tests for nested responses and create/update payloads.
- [x] Add repository tests for reason snapshots and rejection without a reason.
- [x] Reject inactive or cross-organization reasons before the transition writes.
- [x] Test catalog read and management access before the controller calls the service.
- [x] Apply migration `1791800000015-ApplicationRejectionReasons`.
- [ ] Verify constraints, ownership, transaction rollback, and concurrent deactivation with PostgreSQL.

Checks: frontend `node --test tests/application-status.test.cjs tests/rejection-reasons.test.cjs` passed 8 tests. Frontend `bun typecheck` and scoped Biome lint passed. Backend Jest passed 3 suites and 13 tests. Backend `npx tsc --noEmit` and scoped ESLint passed. Sentinel approved the implementation. Transaction mocks use explicit awaited returns so they preserve callback results and satisfy the repository lint rule.

Limits: tests mock API responses, repositories, and transaction managers. They do not verify browser behavior, real authorization, SQL constraints, row locks, rollback, or migration behavior in PostgreSQL. No migration, server, build, production test, stage, or commit ran.

## ATS-OPS-NOTIFICATION-1: durable candidate status notices

State: implemented. Migration `1791800000020-ApplicationStatusNotificationIntent` and its admin retry migration `1791800000021-ApplicationStatusNotificationAdminRetry` are registered in the active Supabase database.

- Recruiter-initiated changes to the candidate-facing application status write a notification intent in the same transaction as the application update and status history.
- The NestJS cron claims due intents with `FOR UPDATE SKIP LOCKED`, checks the candidate's current in-app and application preferences, and writes the notification and accepted state in one transaction.
- Each intent uses its status-history ID as its idempotency key. Failed delivery retries with exponential backoff for up to eight attempts. Disabled or missing recipients become `suppressed`.
- The migration is `1791800000020-ApplicationStatusNotificationIntent`. It is visible to Git despite the broad migration ignore rule.

Checks: backend Jest passed 2 suites and 27 tests. `npx tsc --noEmit`, scoped ESLint, Prettier, and `git -c core.whitespace=cr-at-eol diff --check` passed.

Limits: tests use transaction-manager mocks. They do not prove PostgreSQL locking, rollback, concurrent workers, or delivery from production cron. Offer-response-driven status changes and other notification types still use their own paths. No migration, server, build, production test, stage, or commit ran.

### ATS-OPS-NOTIFICATION-2: admin retry for dead candidate notices

State: implemented. Migration `1791800000021-ApplicationStatusNotificationAdminRetry` is registered in the active Supabase database.

- Add `application_status_notification` to the admin operations queue. Show only intents with `status = 'dead'`.
- Show the job, organization when it still exists, candidate name, status label, prior attempt count, and last error code. Do not expose email or message HTML.
- Add an authenticated Next.js proxy and an admin-only NestJS retry route.
- Lock the intent in a transaction. Requeue only a dead intent whose recipient still exists. Reset its automatic retry count and clear its prior lease and error.
- Keep the same intent and status-history deduplication key. The worker checks the current in-app and application preferences after requeue.
- Save the admin ID and prior attempt count in `application_status_notification_admin_retry`. Keep this audit independent of the intent row so later intent deletion cannot remove retry history.
- Add migration `1791800000021-ApplicationStatusNotificationAdminRetry`.

Checks: backend Jest passed 3 suites and 52 tests, including admin authorization and existing preference/deduplication tests. Backend `npx tsc --noEmit`, scoped ESLint for production files, Prettier, and CRLF-tolerant diff check passed. Frontend Node tests passed 11 tests. `bun typecheck`, scoped Biome, and frontend diff check passed.

Limits: mocks do not prove row locks, concurrent worker behavior, or transaction rollback. Retry returns `not_retryable` if another process changed the state or the recipient no longer exists. Current preferences can suppress a requeued notice. No server, build, stage, or commit ran.

### ATS-OPS-NOTIFICATION-3: durable message notices

State: implemented. Sentinel approved. Migration `1791800000023-MessageNotificationIntent` is applied and registered in the active Supabase database as migration row 111.

- Save the message, chat update, and recipient intent in one transaction. Confirm the sender is one of the locked chat participants.
- Keep only the message, chat, and recipient IDs in the intent. Read the live message and sender when the dispatcher runs.
- Check the recipient's current `channels.in_app` and `events.message` preferences. Suppress notices for deleted or already-read messages.
- Write the in-app notice and `accepted` state in one transaction. Use `message:<messageId>` as the deduplication key.
- Retry failed delivery with exponential backoff. Mark an intent dead after eight attempts.
- Show dead intents in the admin operations queue. Let an authenticated admin requeue an intent and record the actor and previous attempt count.
- Do not show message content or preview text in the admin queue.
- Enable RLS and revoke direct API role access on both new tables.

Checks: backend Jest passed 5 suites and 48 tests. `npx tsc --noEmit` and scoped ESLint passed. Frontend `node --test tests/admin-operations-queue.test.cjs` passed 11 tests. Scoped Biome passed. Sentinel approved after a SQL review found and fixed a stale `recipient_email` predicate. A Supabase SQL smoke test verified unique intents, notification deduplication, read-message suppression, and cascade cleanup. The test removed all temporary rows. RLS is enabled on both tables. `anon`, `authenticated`, and `service_role` have no table grants.

Limits: Jest tests use mocks for the NestJS dispatcher and retry route. The SQL smoke test exercised database constraints and equivalent insert/deduplication statements. It did not run the NestJS cron or test concurrent workers. The user still needs to check the admin page and message-notice display through the frontend. No server, build, stage, or commit ran.

Security baseline confirmed on 2026-10-11: all 73 public tables have RLS enabled. Keep RLS in each new ATS table migration. Add client policies only when a workflow requires direct Supabase API access. `anon` and `authenticated` have no access to tables without policies. `service_role` can bypass RLS when granted access, so keep its key on the server. Eight ATS notification intent and retry tables have no policies or table grants for `PUBLIC`, `anon`, `authenticated`, or `service_role`. Their four `BIGSERIAL` sequences have no grants for those roles. Migration `1791800000025-AtsNotificationQueueRls` applies this rule to existing queues and is registered in active Supabase.

### ATS-OPS-NOTIFICATION-4: aviso durable de nueva postulación

Estado: implementado. Sentinel aprobó el código y el SQL. Las migraciones `1791800000024-ApplicationCreatedNotificationIntent` y `1791800000025-AtsNotificationQueueRls` están aplicadas y registradas en la base activa `biovity`.

- Guardar un intent por miembro reclutador de la empresa en la misma transacción que la postulación, el historial inicial y las respuestas.
- Procesar intents con bloqueo de cola, preferencias actuales, deduplicación, reintentos con espera exponencial y estado `dead` después de ocho intentos.
- Agregar los intents `dead` a la cola admin con reintento autenticado y auditoría del admin.
- Mantener los webhooks Slack y Discord fuera de este flujo durable.
- Crear una migración con RLS habilitado y sin acceso directo para roles de API.
- [x] Guardar el intent en la transacción de postulación y probar rollback si falla su inserción.
- [x] Procesar preferencias, deduplicación, supresión, reintentos y estado `dead` con un dispatcher NestJS.
- [x] Agregar la cola admin, el proxy autenticado y la auditoría de reintentos.
- [x] Habilitar RLS y revocar permisos directos en las tablas de intents y auditoría.
- [x] Aplicar la migración a Supabase y probar inserción, restricción de duplicados, RLS y permisos. Limpiar las filas de prueba.
- [x] Habilitar RLS en las ocho tablas internas de avisos ATS, cerrar permisos de tablas y secuencias a todos los roles de API, y revisar las 73 tablas públicas.

Checks: backend Jest pasó 5 suites y 49 pruebas. `npx tsc --noEmit` y ESLint focalizado pasaron. Frontend `node --test tests/admin-operations-queue.test.cjs` pasó 12 pruebas. `bun typecheck` y Biome focalizado pasaron. Sentinel aprobó ATS-OPS-NOTIFICATION-4 y la migración de hardening RLS. Supabase confirmó las tablas, las tres claves foráneas, RLS, revocaciones, registro TypeORM y cero filas de prueba restantes. La prueba SQL insertó un intent y confirmó que la clave única rechaza el duplicado. La revisión RLS confirmó que las 73 tablas públicas tienen RLS y que las ocho tablas internas de avisos y cuatro secuencias de auditoría no dan acceso a los roles API ni a `PUBLIC`. La nueva migración se registró como fila 113. ESLint y `npx tsc --noEmit` pasaron para el cambio de hardening.

Límites: las pruebas Jest usan mocks y no ejecutan el cron NestJS ni prueban concurrencia entre workers. La prueba SQL confirmó esquema e inserción, no ejecutó el servicio NestJS contra Supabase. Falta la comprobación manual del panel admin y la recepción del aviso in-app en frontend.

## ATS-SEC-SEARCH-PATH: fijar rutas de búsqueda de funciones trigger

Estado: implementado y aplicado. La migración `20261011233848-pin_trigger_function_search_paths` está registrada en Supabase.

- Fija `search_path = pg_catalog` en cinco funciones `SECURITY INVOKER`.
- Califica como `public` las tablas que usan los dos triggers de verificación.
- Antes del cambio, compara las cinco definiciones con sus huellas revisadas y comprueba sus triggers activos.
- Después del cambio, verifica los cinco ajustes de función.
- Una prueba reversible confirmó el cambio de verificación y el borrador de vacantes tras cambios de identidad, la marca de tiempo de `updatedAt` y el rechazo de cambios o borrado en las dos auditorías. El `ROLLBACK` dejó cero filas temporales.
- El asesor de Supabase ya no informa `function_search_path_mutable`. Las 73 tablas públicas conservan RLS. El aviso `rls_enabled_no_policy` sigue como `INFO` para tablas que deben operar mediante el servidor. No se agregaron políticas para acceso directo desde el cliente.

Límites: la prueba usó tablas temporales y filas de empresa y vacante dentro de una transacción revertida. No verificó la interfaz ni el flujo de la aplicación en el navegador.

## ATS-PIPELINE-REOPEN: terminalidad y reapertura

Estado: implementado y aplicado en la base activa `biovity`. Sentinel aprobó el cambio.

- La proyección de cada etapa define si la candidatura sigue abierta o queda cerrada. `contratado`, `rechazado` y `desistido` son terminales.
- Un cambio normal de etapa no puede sacar una candidatura de un estado terminal. La reapertura requiere una etapa activa y un motivo no vacío.
- El historial guarda el actor, el estado anterior y nuevo, la etapa anterior y nueva, y el motivo de reapertura. El constraint SQL rechaza motivos nulos, vacíos o mayores a 2.000 caracteres.
- La respuesta a una oferta no puede cambiar una candidatura cerrada.
- La migración `1791800000026-ApplicationReopenHistory` está aplicada y registrada en `public.migrations`.
- Las 73 tablas `public` conservan RLS. Las 25 tablas internas ATS revisadas no dan lectura directa a `anon` ni `authenticated`.

Checks: 3 suites Jest pasaron con 29 pruebas. `npx tsc --noEmit` pasó. La prueba SQL reversible confirmó que el constraint rechaza motivos nulos y en blanco. Sentinel aprobó el cambio. No se ejecutó build ni se probó el flujo en navegador.

Límites: las pruebas Jest usan mocks para la base y la API. La prueba SQL cubrió el constraint real con una transacción revertida. Falta probar la reapertura desde el panel y confirmar sus avisos al candidato.

## ATS-05-RUBRIC: rúbricas por etapa

Estado: rúbricas por rol implementadas. La migración base está aplicada como `20261012002107`; roles y permisos ATS están aplicados como `20261012005740`, con permisos de lectura de servidor restaurados como `20261012010643`. Falta validar el flujo desde la interfaz.

- Cada etapa puede tener una rúbrica versionada con hasta 20 criterios.
- Al agendar la entrevista, el evento guarda la etapa y la versión vigente. Los cambios posteriores no alteran evaluaciones antiguas.
- Cada entrevistador califica cada criterio de 1 a 5 y puede agregar evidencia. La recomendación individual se mantiene separada de la decisión final.
- Al agendar, el organizador asigna un rol a cada entrevistador. La API valida los roles contra la rúbrica vigente y limita cada scorecard a sus criterios asignados. Las evaluaciones guardan el rol del evaluador.
- Las respuestas de evaluación deben coincidir con los criterios guardados en la versión de la entrevista.
- Las 53 tablas internas ATS tienen RLS y no dan acceso a `PUBLIC`, `anon` ni `authenticated`. `service_role` conserva solo `SELECT` en `application`, `event_participant`, `chat` y `message` para rutas de servidor existentes. El backend conserva acceso con su conexión directa PostgreSQL.
- La migración agrega restricciones para vincular la versión de rúbrica con su etapa, evento y evaluación. Un trigger impide editar o borrar versiones.

Checks: 66 suites Jest pasaron con 392 pruebas. `npx tsc --noEmit`, `bun typecheck`, Biome focalizado y Prettier focalizado pasaron. Supabase confirma las columnas de rol, RLS en las 53 tablas, cero lectura para `anon` y `authenticated`, y solo los cuatro grants `SELECT` de servidor indicados arriba. El asesor informa 78 hallazgos `INFO` de RLS sin políticas. Sentinel detectó las rutas Next.js y se restauraron sus lecturas con `service_role`.

Límites: Jest usa mocks para el flujo y no valida concurrencia real de agendamiento ni una evaluación desde la interfaz. El flujo necesita validación manual desde el frontend.

## ATS-EMAIL-PREFERENCES: correo de postulaciones

Estado: implementado en código. Falta validar el flujo desde la interfaz.

- Las cartas de oferta y las respuestas respetan las preferencias de correo y el evento `application` del candidato.
- El worker suprime el envío si la preferencia está apagada o no puede asociar el intent a un usuario. Borra el cuerpo del email, los adjuntos y el ID del usuario.
- El PDF privado, la oferta y el mensaje del chat siguen disponibles en Biovity después de suprimir el email.
- La solución usa `email_outbox.recipient_user_id` de la migración existente `029_email_outbox_preferences.sql`. No agrega una migración.

Checks: Next.js pasó 10 pruebas nuevas y 13 pruebas de regresión de outbox. NestJS pasó 7 pruebas del controller. Los typechecks de ambos repositorios y los chequeos de formato focalizados pasaron. Los tests usan mocks y no prueban Resend, PostgreSQL ni el portal desplegado.

## ATS-METRICS-STAGE: tiempo por etapa

Estado: implementado en código. Falta validar en producción.

- El backend calcula la duración de cada visita cerrada desde el historial de etapas. Agrupa por oferta y etapa, e informa el promedio de días y la cantidad de visitas.
- Una reapertura crea otra visita. La visita que sigue abierta no entra en el promedio.
- El filtro toma la fecha de creación de la postulación. Interpreta el valor sin zona como UTC y lo convierte a Santiago. La prueba de base debe confirmar que los valores guardados representan UTC.
- El panel y el CSV muestran la oferta y la etapa.

Checks: Jest pasó 1 suite con 3 pruebas. Los typechecks y controles de formato focalizados pasaron en ambos repositorios. La prueba mock comprueba parámetros y mapeo. No ejecuta la consulta contra PostgreSQL. No se probaron datos ni interfaz en producción.

Actualización del 2026-10-11: cada fila abre la lista paginada de postulaciones que forma el promedio. El API reutiliza la misma consulta y filtros de cohorte. Incluye solo visitas de etapa cerradas, con nombre del postulante, inicio, fin y duración. La página tiene hasta 50 filas y orden estable por hora e ID de visita. Las fechas se muestran en `America/Santiago` y el API devuelve instantes UTC. Las pruebas mock verifican alcance de organización, filtros y paginación. No ejecutan SQL contra PostgreSQL ni validan la interfaz en producción.

Actualización del 2026-10-13: ejecuté la consulta de visitas cerradas en Supabase. Encontró 3 visitas de 1 postulación en el período 2026-09-13 a 2026-10-13. El promedio fue 1,650 días. La columna `createdAt` es `timestamp without time zone` y la sesión Supabase usa UTC. Esto confirma la consulta con datos y la zona de sesión actual; no confirma la convención de cada dato histórico ni la interfaz.

## ATS-METRICS-RESPONSE: primera respuesta y postulaciones sin respuesta

Estado: implementado en código. Falta validar los timestamps y la consulta con PostgreSQL.

- La primera respuesta es el primer cambio real de etapa después de crear la postulación. El cambio debe venir de una persona distinta al candidato.
- Se excluyen la creación inicial, los cambios sin movimiento y las reaperturas. Las etapas personalizadas cuentan aunque proyecten su estado a `pendiente`.
- El conteo sin respuesta incluye postulaciones que siguen abiertas y no tienen un cambio válido de etapa.
- PostgreSQL calcula el tiempo transcurrido y asigna cada respuesta a uno de cuatro grupos: menos de 24 horas, 1 a menos de 3 días, 3 a menos de 7 días y 7 días o más.
- Los períodos usan fechas del calendario de Santiago. El último día del rango personalizado queda incluido.
- La conversión de `createdAt` interpreta el valor sin zona horaria como UTC. La base debe confirmar esa regla.
- `recruiterProductivity` usa los mismos cambios reales de etapa para atribuir la primera respuesta. Los límites de fechas de postulaciones e historial usan Santiago. Los eventos comparan instantes UTC derivados de la medianoche local.

Actualización del 2026-10-12: el endpoint `response-visits` devuelve páginas de hasta 50 postulaciones para cada grupo y para postulaciones sin respuesta. Reutiliza la misma CTE y los mismos límites de cohorte del resumen. El acceso requiere pertenecer a la organización. El panel permite abrir la candidatura y paginar. Devuelve nombre, oferta, estado y tiempos, sin correo, CV ni notas internas. Las pruebas mock cubren autorización, filtros, parámetros y mapeo. No prueban SQL real ni navegación desde la interfaz.

Reauditoría Supabase del 2026-10-12: RLS está activo en las 76 tablas de `public`. Las tablas internas ATS bloquean `anon` y `authenticated`. `service_role` conserva solo lectura en `application`, `event_participant`, `chat` y `message`.

Actualización del 2026-10-13: `EXPLAIN` en Supabase aceptó la CTE de primera respuesta y el filtro de cohorte por fecha de Santiago. La consulta real, sin nombres ni IDs, encontró 1 postulación en el período 2026-09-13 a 2026-10-13: 1 respuesta menor a 24 horas y 0 sin respuesta. Esto valida el cálculo con una fila actual. No confirma el significado de la zona horaria de cada valor guardado ni el panel en navegador.

Checks: las pruebas enfocadas pasaron en 2 suites, con 16 pruebas. `npx tsc --noEmit`, `bun typecheck`, Biome y Prettier pasaron. Los mocks verifican reglas, acceso, filtros, parámetros y mapeo. No ejecutan las consultas en PostgreSQL ni prueban la navegación real desde la interfaz.

## ATS-05-AI-REVIEW: revisión de sugerencias de IA

Estado: implementado y migrado. Falta validación manual desde la interfaz.

- `AIScoreModal` muestra la sugerencia Jev y permite guardar una decisión humana.
- El servidor toma la recomendación original de `application_ai_score`, valida acceso a la oferta y deriva el autor de Better Auth.
- Si la decisión cambia la sugerencia, exige un motivo de hasta 1000 caracteres.
- Cada envío guarda un evento ligado a la revisión Jev. Un `actionId` repetido con el mismo contenido devuelve el evento guardado; otro contenido devuelve conflicto.
- La tabla `application_ai_recommendation_review` tiene RLS y no otorga permisos a `PUBLIC`, `anon`, `authenticated` ni `service_role`. Conserva solo recomendación, decisión, autor y motivo. Al borrar la revisión Jev, el historial también se borra.
- La ruta no cambia el pipeline ni envía avisos al postulante.

Checks: 4 pruebas focalizadas de ruta y 13 pruebas de explicación pasaron. `bun typecheck`, Biome y `git diff --check` pasaron. Una prueba con PostgreSQL verificó creación, repetición idempotente, conflicto por clave reutilizada, motivo requerido y corrección con motivo. La prueba borró sus dos filas y una consulta posterior confirmó cero filas temporales. La migración `031_application_ai_recommendation_review` está aplicada y registrada en Supabase. El asesor devuelve una nota `INFO` por la tabla sin políticas, que es el acceso backend-only esperado. Falta probar la interacción visual y de teclado desde el portal.

## ATS-05-RUBRIC-ROLE-UI: cobertura por rol

Estado histórico, corregido el 2026-10-16: el servidor y el portal limitan evaluaciones al rol asignado. Antes, cualquier miembro asociado podía guardar el resultado final. La regla actual permite que miembros con permiso de lectura vean solo la etiqueta del resultado. La edición requiere permiso de reclutamiento.

- Los entrevistadores ven criterios comunes y de su rol. El servidor filtra criterios y evaluaciones de otros roles.
- Los miembros sin permiso de contratación no reciben rúbrica, evaluaciones, actividad, notas internas ni identidad del decisor. Pueden ver la etiqueta del resultado, pero no editarlo.
- El servidor vuelve a validar el rol y rechaza criterios ajenos.

Checks: 3 pruebas del componente pasaron. Las 2 suites backend pasaron con 36 pruebas. Pasaron los typechecks de ambos repositorios, Biome en los archivos frontend, Prettier en los archivos backend y `git diff --check`.

Límites: las pruebas usan mocks. No prueban el navegador, una sesión real ni el servidor desplegado.

## ATS-METRICS-CUSTOM-STAGES conversion and source rows

State: implementation and focused local checks complete. Sentinel approved. PostgreSQL and browser validation remain open.

The organization metrics dashboard now shows conversion by custom pipeline stage. Each row opens a paged list of source applications. The cohort uses each application's first ordinary entry into that stage within the selected Santiago-local date range. Reopens do not count as new entries. An application advances only after a later ordinary transition to a different stage. Rejection and withdrawal do not count as advancement. The summary and detail use the same cohort query. Detail ordering uses entry time and application ID.

The API checks organization read access. Its query binds the selected job and stage and filters both through the organization. The dashboard keeps the public conversion showcase unchanged.

Checks:

- Focused service and controller Jest specs pass: 2 suites, 25 tests.
- Backend and frontend TypeScript checks pass.
- Scoped Biome and Prettier checks pass.
- Mock tests check the cohort rule, stage changes, excluded terminal destinations, Santiago date range, access order, pagination parameters, and stable ordering. Mocks do not execute SQL or prove PostgreSQL results.

Open: PostgreSQL query validation and browser review.

Update 2026-10-13: Supabase accepted the cohort and detail SQL with `EXPLAIN`, including the Santiago date conversion, stage filters, and stable ordering. The data query returned zero custom-stage entries from 2026-09-13 through 2026-10-13. This checks SQL syntax. It does not verify results with rows. Browser review remains open.

## ATS-SOURCE application source attribution

Status: candidate source capture, organization summary, tracked offer-channel links, and source-row drilldown are implemented in code.

The application form asks where the candidate found the offer. It uses a closed channel list and an optional answer. `unknown` covers old applications and the “No recuerdo” answer. The API stores whether the candidate reported the channel. Organization metrics count applications, historical interview progression, and hires by channel and capture method. Date filters use the application cohort date in Santiago.

The TypeORM and Supabase migrations add constrained source columns with an `unknown` default, an opaque source token table, RLS, same-job foreign keys, and indexes for source cohorts and the composite foreign key. Members with `recruit` access can create and deactivate offer links. Members with `read` access can list and copy active links. The public application keeps the token through login and stores a tracked channel only when the token is active and belongs to that offer. Source metrics open a paged application list with the same cohort and stable order. The professional login keeps the local destination and rejects external redirects. The three TypeORM migrations are no longer ignored by Git. Sentinel approved the login and index fixes. Six backend suites pass with 48 tests. Both TypeScript checks and the frontend Biome check pass. The redirect test passes with 3 cases.

The three SQL migrations are applied and registered in Supabase. A transaction test checked tracked attribution, source deactivation, rejection of a mismatched source channel, RLS, and role grants. It ended with rollback, and a final query found zero test rows. The performance advisor no longer flags the new composite foreign key. It still reports 44 unrelated unindexed foreign keys and 5 duplicate-index warnings. Browser review remains open.

Update 2026-10-13: the source attribution query ran against Supabase for the Santiago-local cohort from 2026-09-13 through 2026-10-13. It returned one aggregate row: `unknown / unknown`, with one application reaching interview and one hire. This validates the query with current data. It does not validate the source links in the portal.

## ATS-05-1h durable event creation and RSVP notices

Status: backend code is implemented. Migrations `1791800000032-EventLifecycleNotificationIntent` and `1791800000033-EventLifecycleNotificationAdminRetry` are applied and registered.

- Event creation writes one notification intent per non-organizer participant in the event and participant transaction. It snapshots the event title, type, start instant, organizer time zone, and organizer name.
- A changed RSVP writes an intent with the participant status history in the same transaction. An unchanged RSVP writes no new intent. The intent key uses the history ID, so later valid transitions remain distinct.
- The dispatcher checks current account activity and in-app/interview preferences. It suppresses deleted recipients, cancelled or past events, declined invitees, and RSVP notices whose status is stale. It locks the event, participant, recipient, then intent before it writes the notification and accepts the intent in one transaction.
- Delivery retries up to eight times with increasing delay, then marks the intent dead. Admin queue listing and retry are not included in this slice.
- The creation notice formats the start time in the organizer-selected event zone and shows the zone label.

Checks: 3 focused backend suites passed with 34 tests. Sentinel review found and led to a fix for RSVP recipient validation. Backend TypeScript passed. Tests use mocks. PostgreSQL transaction behavior, concurrent dispatch, browser display, and production cron delivery remain unverified.

## ATS-05-1i admin retry for event notices

Status: implemented in code. Migrations `1791800000032-EventLifecycleNotificationIntent` and `1791800000033-EventLifecycleNotificationAdminRetry` are applied and registered. PostgreSQL, production database, and admin panel checks remain open.

- The admin operations queue lists dead event creation and RSVP notices. It shows the event, organization, recipient, attempt count, and last error code.
- Admins can requeue a notice from the operations panel. Both the Next.js route and NestJS controller require an admin session.
- The service checks that the event is scheduled and in the future. It checks the current recipient account, notification preferences, and participant status. Stale notices stay dead.
- The service resets the retry state and writes the admin audit row in one transaction. It follows the event, participant, recipient, then intent lock order. The dispatcher checks that the intent still has processing status under lock before it inserts a notification.
- The migration enables RLS and revokes API-role access to the retry audit table and its sequence. The audit keeps the intent ID without a foreign key so event deletion can still cascade to its queue intent.

Read-only organization members can see the final outcome label. They cannot see decision notes or decision-maker details, and they cannot edit the result. Recruiters and admins receive the full outcome and can edit it.

Checks recorded before the 2026-10-16 correction: backend admin queue, controller, event lifecycle dispatcher, and interview controller specs passed in 4 suites with 65 tests. Those tests said a member with read access could save the final outcome. The current controller test now checks the read-only projection and recruiter edit capability. Backend TypeScript passes. Frontend admin queue tests pass with 14 cases. Frontend TypeScript passes. Formatting and scoped diff checks pass. Tests use mocks. No migration was applied. PostgreSQL concurrency, deployed API access, and the admin panel need manual validation.

## ATS-OPS-NOTIFICATION-OFFER aviso durable de oferta

La creación de una oferta inserta el intent del candidato en la misma transacción que la oferta y el mensaje del chat. El dispatcher actual aplica las preferencias in-app y de mensajes. Deduplica por oferta y suprime avisos si el candidato ya leyó el mensaje o respondió la oferta. Los avisos de mensajes genéricos conservan su payload. Se reutiliza `1791800000023-MessageNotificationIntent`; no hace falta otra migración.

Checks: pruebas enfocadas cubren la inserción transaccional del intent, los payloads genérico y de oferta, la supresión por respuesta y las preferencias y reintentos. La migración `1791800000023-MessageNotificationIntent` está aplicada. Los mocks no prueban rollback ni concurrencia en PostgreSQL. Falta revisar el flujo en navegador.

## ATS-OPS-NOTIFICATION-BROADCAST avisos administrativos durables

Estado: implementado en código. La migración `1791800000034-SystemBroadcastNotificationIntent` está aplicada. Falta validar la interfaz y el flujo con datos de prueba.

- `requestId` evita crear dos broadcasts cuando el cliente repite la solicitud. Si reutiliza el ID con otro contenido, el servidor devuelve conflicto.
- El servidor guarda el broadcast y los intents de sus miembros activos en una transacción. Incluye al propietario y a los colaboradores asociados.
- El dispatcher vuelve a revisar la membresía, la cuenta activa y las preferencias `in_app` y `system` antes de guardar el aviso.
- Los errores reintentan hasta ocho veces. Los intentos agotados aparecen en la cola admin. Un admin puede reintentarlos y cada acción queda auditada.
- La migración activa RLS y revoca permisos de los roles API en las tres tablas internas.
- El panel de organizaciones permite elegir una empresa, redactar el aviso y agregarlo a la cola. La ruta del panel valida la sesión admin y reenvía la solicitud al backend.

Los tests usan mocks. No prueban el SQL ni la concurrencia. Falta revisar la vista del panel en el navegador.

## ATS-SAVED-SEARCH-MATCHING alertas por coincidencias nuevas

Estado: implementación en código. Sentinel aprobó el corte después de corregir la respuesta de `notifyEnabled`. La creación de una búsqueda deja las alertas apagadas por defecto. El reclutador puede activarlas al guardar o pausarlas y reactivarlas después. Las búsquedas antiguas quedan apagadas. `GET /saved-searches/:id/execute` sigue en solo lectura.

- El comparador usa la misma regla de filtros que la búsqueda de talento y procesa cambios de perfil posteriores a la instantánea.
- La cola guarda coincidencias únicas por búsqueda y cambio de perfil, y agrupa cada entrega por destinatario, frecuencia y ventana.
- Los destinatarios son miembros reclutadores activos con `in_app` y `job_alert` activados. El dispatcher vuelve a comprobar tipo, actividad, preferencias, acceso a la empresa, verificación de la empresa y actividad del candidato antes de entregar.
- El resumen diario sale a las 09:00. El semanal sale los lunes a las 09:00, en `America/Santiago`.
- La entrega reintenta hasta ocho veces. Los errores agotados aparecen en la cola admin y admiten reintento auditado.
- La migración `1791800000037-SavedSearchAlertQueue` activa RLS y revoca permisos API en las tablas internas y sus secuencias.

Checks: 5 suites backend pasan con 50 pruebas y `npx tsc --noEmit`. El portal pasa `bun typecheck`, 2 pruebas de API y Biome focalizado. Prettier pasa en los archivos backend. Sentinel aprobó el corte. Los tests usan mocks. No prueban SQL en PostgreSQL ni entrega real. La migración está aplicada y falta revisar el flujo en el portal.

Actualización del panel admin: agregué los filtros para fallos de matching y de entrega, el detalle del candidato y el error, y los botones de reintento. Las rutas Next.js exigen sesión admin, validan el ID y reenvían la sesión a NestJS. Sentinel aprobó. `node --test tests/admin-operations-queue.test.cjs tests/admin-saved-search-retry-routes.test.cjs` pasó 18 pruebas. `bun typecheck`, Biome y `git diff --check` focalizado pasaron. Estos mocks no ejecutan el cron ni SQL.

El usuario confirmó los resúmenes diarios a las 09:00 y los semanales los lunes a las 09:00 en `America/Santiago`. La revisión focalizada pasó 4 suites con 16 pruebas, `npx tsc --noEmit`, Prettier y `git diff --check`. Se corrigió una prueba antigua que esperaba ocultar `notifyEnabled`; el endpoint de ejecución sigue en solo lectura y devuelve el valor guardado. Sentinel aprobó el cambio. La revisión usa mocks y no valida el cálculo SQL en PostgreSQL. La migración está aplicada.

### ATS-TALENT-SEARCH-FILTERS paridad de filtros

Estado: implementación en código. Sentinel aprobó la revisión. La migración `1791800000035-CandidateSearchProfileFilters` está aplicada.

- El perfil profesional guarda nivel declarado (`junior`, `mid`, `senior`, `lead`, `manager`) y disponibilidad (`immediate`, `2weeks`, `1month`, `open`). El candidato puede borrar cualquiera de los dos valores.
- La búsqueda y las búsquedas guardadas usan el mismo contrato de filtros. El portal rechaza filtros guardados con valores desconocidos, campos extra o rangos de experiencia inválidos.
- El nivel y la disponibilidad se comparan con los valores declarados. Un filtro no incluye perfiles sin valor.
- Las habilidades usan cualquier coincidencia de la lista. La comparación aplica Unicode NFKC, espacios colapsados y minúsculas, y acepta datos antiguos como texto o como objeto con `name`.
- La experiencia se calcula desde el CV más reciente, elegido por `updatedAt`, `createdAt` e ID descendentes. Se cuentan años únicos de intervalos válidos, con fin exclusivo y año UTC actual para empleos vigentes. Los límites de búsqueda son inclusivos.
- La búsqueda de perfiles y el preview de búsqueda guardada deben usar esos mismos filtros. Este trabajo no activa avisos. Los datos de nivel y disponibilidad son declaraciones del candidato, no verificaciones.

Checks: 3 suites backend pasan con 12 pruebas para persistencia, limpieza y consulta de filtros. 2 suites frontend pasan con 3 pruebas para ruta y validación de búsquedas guardadas. Pasaron los typechecks de ambos repositorios y Biome en los archivos frontend. Prettier pasa en los archivos backend nuevos.

Límites: los mocks no ejecutan ni validan el SQL de PostgreSQL. La migración está aplicada. Falta validar el flujo en el portal.

### ATS-SAVED-SEARCH-MATCHING disparador de perfil

Las escrituras de perfil y currículum guardan una instantánea de los campos usados por la búsqueda en la misma transacción. Incluye alta de cuenta profesional, cambios de identidad, actividad, profesión, ubicación, nivel, disponibilidad, habilidades y experiencia, además del borrado del currículum estructurado. Los cambios del archivo CV quedan fuera porque los filtros actuales no usan el archivo ni sus metadatos. Las migraciones `1791800000036-CandidateProfileChangeSnapshot` y `1791800000037-SavedSearchAlertQueue` se aplicaron en Supabase el 2026-10-12, junto con las migraciones `1791800000030` y `0032` a `0039`. Una reconciliación registró seis cambios de esquema que ya existían bajo migraciones SQL. La tabla TypeORM registra `0039`; la consulta CLI `migration:show` quedó bloqueada al conectar. El typecheck pasa. No se crearon datos de prueba ni se validaron los flujos desde la interfaz.

Actualización 2026-10-13: la suite de `ResumeRepositoryImpl` encontró que un parche parcial pasaba por el mapper de una entidad completa. La operación podía borrar habilidades y experiencia no incluidas en el parche, cambiar habilidades antiguas de texto a objetos y guardar una instantánea sin `candidateId`. La actualización ahora aplica solo los campos recibidos y conserva la representación histórica de habilidades. Las pruebas focalizadas pasaron 2 suites y 8 pruebas junto con `candidate-profile-change.spec.ts`; `npx tsc --noEmit` y Prettier pasaron. Los mocks comprueban el orden y el uso del manager transaccional. No prueban el rollback real de PostgreSQL ni el SQL de la instantánea.

### ATS-OPS-AI-EXPLANATION reintento admin de explicaciones IA

Estado: implementado y migrado el 2026-10-13. La cola admin muestra explicaciones fallidas de evaluaciones listas que conservan una instantánea no vacía y vigente. El reintento conserva el puntaje, cambia la explicación a pendiente y guarda admin y error anterior en auditoría. Next.js y NestJS requieren sesión admin. La migración `1791800000039-AiExplanationAdminRetry` activa RLS y revoca permisos a `anon`, `authenticated` y `service_role`.

Checks: backend pasó 2 suites y 58 pruebas focalizadas; `npx tsc --noEmit` pasó. Frontend pasó 19 pruebas de cola y rutas; `bun typecheck` pasó. `EXPLAIN` validó el SQL condicional en Supabase. La consulta confirmó RLS, permisos de tabla y secuencia revocados, y el registro `1791800000039` en `public.migrations` y en la tabla TypeORM `migrations`. No se crearon filas de prueba.

Límites: las pruebas usan mocks. No verifican concurrencia real, el procesamiento de IA ni la interfaz manual. Los fallos con instantáneas vencidas no admiten reintento admin. Sentinel revisó y aprobó el filtro por estado, contenido y vigencia de la instantánea. `bun run migration:show` quedó bloqueado al conectar, por eso la nueva fila se comprobó con SQL.

### ATS-OPS-EMAIL-OUTBOX reintento auditado de correos agotados

Estado: código implementado y migración aplicada el 2026-10-13. La ruta requiere sesión admin. Una sola sentencia bloquea una fila elegible, la devuelve a `pending` y registra al admin, los intentos previos y el último error. Filas vencidas o no elegibles no generan auditoría.

Checks: 3 pruebas Node focalizadas, `bun typecheck`, `EXPLAIN` de la sentencia en Supabase y `git diff --check` pasaron. La migración `032_email_outbox_admin_retry_audit` está registrada. La consulta confirmó RLS y permisos de lectura revocados para `anon`, `authenticated` y `service_role`.

Sentinel aprobó la ruta y la validación estricta del ID.

Checks de paginación: 2 pruebas Node cubren permisos, páginas inválidas, límite de 50, orden estable y recorte de destinatario. El typecheck y Biome pasaron.

Límites: las pruebas usan mocks; no crean un correo de prueba ni verifican concurrencia real o entrega de Resend. La vista vive separada de la cola general. La validación manual del panel sigue pendiente.

## ATS-OFERTA-VIGENCIA plazo configurable y acciones

Decisiones confirmadas: cada oferta nueva vence en 7 días y la fecha se puede editar. El organizador ingresa el último día local de `America/Santiago`. La base guarda el instante UTC al inicio del día siguiente. El recruiter puede reenviar la misma oferta con nueva fecha y PDF, cancelar una oferta enviada sin respuesta, o dejar que el cron la venza. Una oferta vencida no cambia el estado de la postulación.

El reenvío renderiza y sube un PDF con la nueva fecha antes de llamar al backend. La transacción actualiza `pdf_path`, `expires_at` y `letter_data`, marca como reemplazados los mensajes anteriores, crea un mensaje y aviso de chat y registra la acción. El evento realtime conserva el tipo `offer` y reemplaza también las tarjetas previas en la caché del chat abierto. Las tarjetas reemplazadas no muestran el PDF actual ni botones de respuesta. NestJS exige que la ruta pertenezca a la carpeta de la postulación y termine en un nombre UUID. Si el backend devuelve un error 4xx, el portal borra el PDF sin referencia. Si la respuesta se pierde o devuelve un error 5xx, conserva el archivo porque el commit puede haber ocurrido. El correo escapa el nombre del candidato antes de insertarlo en HTML.

El cron procesa hasta 100 ofertas con `FOR UPDATE SKIP LOCKED` por transacción y actualiza los mensajes y la auditoría en una consulta. La respuesta de candidato exige que el plazo siga vigente en su actualización condicional.

Checks: `node --test tests/data-flows.test.cjs tests/offer-letter-resend.test.cjs tests/offer-message-status.test.cjs` pasó 33 pruebas; 2 suites Jest pasaron con 6 pruebas de vencimiento, ruta del PDF y persistencia; frontend `bun typecheck` y backend `npx tsc --noEmit` pasaron; Biome, Prettier y diff checks focalizados pasaron. Sentinel aprobó el código y la migración del índice. Supabase confirmó la columna de vencimiento, los índices, RLS y los permisos API revocados. Una inserción de auditoría se verificó y borró dentro de la misma transacción. Las migraciones `1791800000040` y `1791800000041` quedaron aplicadas en los historiales de Supabase y TypeORM. El asesor ya no informa una clave foránea sin índice en `offer_letter_action_audit`. Los índices nuevos aún figuran como no usados. Las pruebas locales usan mocks y no verifican concurrencia, correo, almacenamiento ni flujo de UI.

Pendiente: revisar el flujo desde el portal y probar la respuesta concurrente contra PostgreSQL.

## ATS-07-9 GET detalle de postulación

El controller ahora rechaza una solicitud sin sesión antes de consultar la postulación. Las pruebas también comprueban que el reclutador pasa por la autorización de lectura y que las rutas de lista y eliminación rechazan solicitudes sin sesión antes de llamar al servicio.

Checks: el spec focalizado pasó 13 pruebas. `npx tsc --noEmit` y Prettier pasaron. Sentinel aprobó el orden de autorización. No se hizo una prueba PostgreSQL ni una prueba HTTP con guard y sesión reales.

Verificación remota: Supabase registra las migraciones SQL ATS locales. Algunos registros usan una marca de tiempo distinta y el mismo nombre. RLS está activo en las seis tablas ATS consultadas y `anon` y `authenticated` no tienen permiso de lectura. La configuración actual de Vercel para `biovity-server` no muestra cron ni las variables de entorno que necesitan sus dispatchers. La entrega periódica de recordatorios, avisos y resúmenes no está confirmada.

## ATS-OPS-CRON proteger el ping de base de datos

`GET /api/cron` ahora exige un bearer token igual a `CRON_SECRET` antes de consultar PostgreSQL. Esto cierra la ruta pública que Vercel llama cada cinco días.

Checks: `node --test tests/cron-route.test.cjs` pasó 2 pruebas. `bun typecheck` y Biome pasaron. `CRON_SECRET` existe en el entorno de producción del frontend. No desplegué el cambio ni llamé la ruta de producción. Esto no activa los cron del backend ni programa el correo saliente.

## Verificación completa de suites 2026-10-17

Se corrigieron las pruebas del formulario de entrevistas para simular las consultas de postulación y rúbrica que no forman parte del caso. Los specs backend de entrevistas simulan el servicio de Google Calendar para evitar cargar ESM en suites CommonJS. Los tests con `@InjectDataSource()` usan `getDataSourceToken()`.

Checks: frontend `node --test tests/*.test.cjs` pasó con 322 pruebas. Backend `npx jest --runInBand` pasó 91 suites con 534 pruebas. `bun run typecheck` y `npx tsc --noEmit` pasaron. Google Calendar sigue al final. Las suites locales no verifican entrega real de cron/correo, producción, ni concurrencia PostgreSQL.

## ATS-OPS-CRON configuración anterior supersedida 2026-10-17

La configuración anterior agregó un cron Vercel cada minuto. Ese cron ya no existe en `vercel.json`. La programación local actual usa GitHub Actions para despachar las colas cada cinco minutos, limpiar CV a diario y procesar resúmenes cada lunes. El workflow requiere `CRON_SECRET` y `EMAIL_OUTBOX_SECRET` en GitHub.

La eliminación del cron Vercel solo cambió el archivo local. No se confirmó que GitHub tenga esos secretos, ejecute los jobs o entregue correos. El cambio no está desplegado.

Corrección posterior del 2026-10-17: el worker de correo rechazaba los fallos de red, las respuestas HTTP fallidas y la configuración ausente. El dispatcher ya marca el trabajo de correo como fallido. Siete pruebas cubren el worker y el agregado. La suite backend pasó con 91 suites y 537 pruebas. También pasaron `npx tsc --noEmit`, Prettier y `git diff --check`. Falta confirmar ejecución real tras el despliegue.

## ATS-07 continuación: matriz HTTP y pruebas PostgreSQL locales 2026-10-17

La matriz `docs/audits/ats-07-route-matrix.md` inventaría 198 métodos HTTP de controladores. Excluye Google Calendar. Registra roles declarados y controles de propiedad por grupo. Los controladores de limpieza CV y dispatch cron usan secreto interno. El webhook de pagos valida la firma del proveedor.

Se añadieron pruebas locales para la persistencia atómica de postulación e historial, rollback cuando falla el historial, transición de etapa con aviso durable, respuestas simultáneas a una oferta y RSVP. La prueba RSVP usa el repositorio real y un esquema PostgreSQL temporal. Comprueba el RSVP, su historial, la cola de recordatorios y el aviso de ciclo de evento en una transacción. Comprueba rollback al fallar la inserción del aviso, después de guardar el historial y el recordatorio. Las pruebas de concurrencia lanzan escrituras iguales en paralelo y comprueban un solo historial y aviso. No confirman de forma determinista que la segunda transacción espere un bloqueo. La prueba fija `search_path` en cada conexión porque el repositorio ejecuta SQL sin calificar el esquema.

Checks: 15 pruebas PostgreSQL focalizadas en 4 suites pasan. `npx tsc --noEmit`, Prettier y `git diff --check` pasan.

Actualización ATS-07 de cierre de implementación, 2026-10-17: se añadieron pruebas HTTP con Nest, guards reales y cookies Better Auth firmadas en rutas representativas. La matriz enlaza specs para los 198 métodos. 33 suites de controllers más la suite HTTP pasan 200 pruebas. Cuatro suites PostgreSQL pasan 15 pruebas de propiedad organizacional, persistencia, rollback y concurrencia. Se corrigió la atribución falsa de actores en logs de actividad, incluso para admin, y se ajustaron las políticas de lectura y respuesta de ofertas.

ATS-07 queda implementado en código. Las pruebas HTTP no ejercitan cada método contra PostgreSQL y las pruebas concurrentes no prueban una espera de bloqueo determinista. Queda validar manualmente los flujos del portal, cron y entrega de correo tras el despliegue. Google Calendar sigue aplazado. No se hizo push.
