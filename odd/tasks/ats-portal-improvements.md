# Biovity ATS and portal improvements

## Objective

Implement the approved ATS, professional portal, and internal operations improvements across `biovity` and `biovity-server`. Update the shared roadmap and verify each delivered flow against current code.

## Problem and motivation

The repositories contain many hiring features, but several cross-system workflows still lack a clear data owner, reliable notifications, complete hiring history, or verified organization controls. The user confirmed that account activation requires a verified corporate inbox whose domain matches the company website. Legal company verification remains a separate review.

## Scope and constraints

- Keep Better Auth as the owner of email verification and NestJS as the owner of organization verification and hiring writes.
- Allow company registration, profile completion, and draft jobs before legal review.
- Require company verification for public job publication and recruiting actions.
- Do not deploy, apply database migrations, or change production settings.
- Do not start a server or run a build.
- Keep the existing roadmap as the shared implementation plan.

## Delivery

- Strategy: `feature-branch-chain`, on one feature branch shared by `biovity` and `biovity-server`.
- Branch: `codex/ats-portal-improvements` in both repositories.
- Plan one work-unit commit per completed implementation slice. Record each commit ID and its slice in this document. No commit exists for this documentation update.

## Work plan

| ID | Task | State | Evidence and next action |
| --- | --- | --- | --- |
| ATS-01 | Document table ownership and migrate organization creation, notifications, evaluations, notes, hiring plans, and admin queues to NestJS. | Partially complete | Phase 0 maps NestJS ownership of core ATS records and finds ownership checks in the traced controllers. Full route and production coverage remains open. The offer-response recipient policy is resolved and implemented in ATS-02. See `docs/adr/001-table-ownership.md`. |
| ATS-02 | Add durable offer-response email delivery from NestJS through the Next.js outbox. | Implemented, native review pending | The user chose the first recruiter with active access to the offer organization. The response transaction stores that recipient and an immutable intent. Focused and repository checks pass. The migration is in source and unapplied. |
| ATS-03 | Link interview events to applications and filter them with tenant-safe access. | Focused verification passed, production verification pending | Backend Jest passed (2 suites, 2 tests) and frontend Node test passed (1 test). Sentinel approved the organization-boundary fix. Database deployment remains pending. |
| ATS-04 | Add legal company verification with admin review and server-side hiring gates. | In progress | Added focused edge coverage for verified/suspended submission blocks, rejected-request resubmission, review audit values, repeated review rejection, and admin queue identity checks (2 suites, 12 tests). Public organization lookup/list and public job queries pass separately (2 suites, 3 tests). Backend typecheck passes. The user chose mandatory legal review for existing organizations. Keep them `unverified` until an admin reviews them. Native review and migration remain pending. |
| ATS-05 | Complete interview scheduling with explicit time zones, change history, reminders, and structured interviewer outcomes. | Timezone slice implemented; RSVP rules and history remain open | ATS-05-TZ implements the approved UTC instant and organizer-selected IANA zone, default `America/Santiago`. The 2026-10-10 exploration found RSVP identity and event-access checks in the controller, and ATS-05-1a now verifies missing or mismatched identity and denied event RSVP access with controller mocks (1 suite, 6 tests). Backend typecheck passed. This does not prove cookie-session guards, database membership, persistence, or transition policy. The service accepts the supplied RSVP status. Notifications run best-effort after persistence. Current event and participant models show no change history. See ATS-05-1 and Phase 4 of `docs/plans/backend-roadmap.md`. |
| ATS-06 | Complete offer, candidate, and professional portal workflows in the shared roadmap. | In progress | Phase 5 CV signed-URL tests now cover missing session, invalid and mismatched paths, backend denial, Storage access, and private caching. `node --test tests/cv-security.test.cjs` passed (8 tests). Native review preflight is blocked because this session has no capture interface for schema-bound intended-untracked selection. Remaining Phase 5 policy choices and the other phases stay open. |
| ATS-07 | Audit permissions, error paths, data retention, and cross-repository ownership for all hiring writes. | In progress | Offer creation now commits the offer, chat, and message in one transaction. Earlier focused checks passed (2 suites, 8 tests), and hiring-plan and status-history denial tests passed (1 suite, 7 tests). The 2026-10-10 read-only audit found the listed access checks, but mocked controller tests do not prove guard-to-database behavior. Persistence failure coverage remains incomplete for hiring records, event timezone writes, and each offer-creation transaction write. Retention and deletion/export policy remain open. The inspected frontend application write calls NestJS, but production rewrite, cookie, and internal-key settings remain unverified. Production behavior, native review, and full route coverage remain open. See ATS-07-1 below. |
| ATS-08 | Verify the full delivered scope and update roadmap evidence. | In progress | 2026-10-10: backend `npx jest --runInBand` passed 46 suites and 203 tests. Frontend `node --test tests/*.test.cjs` passed 193 tests with no failures or skips. `npx tsc --noEmit` passed in both repositories. All four commands exited 0. Scoped lint exited 1 in both repositories: ESLint checked 133 changed TypeScript files and reported 1,470 errors in 72 files, including 1,392 Prettier errors and 78 TypeScript lint errors, with no warnings. Biome checked 94 changed supported files and reported 5 errors, 3 warnings, and 1 information item. No base comparison was run. Backend `git diff --check` exited 2 on CRLF lines in three files. `git -c core.whitespace=cr-at-eol diff --check` passed. Frontend diff checks and staged diff checks in both repositories passed. Keep ATS-08 open for lint triage, native review, and production checks. No server, build, migration, or production check ran. |
| ATS-09 | Store the owning organization on each chat and gate organization messages on that organization's verification. | Implemented, follow-up pending | Focused checks passed. The additive migration is staged and unapplied. ATS-10 adds the legacy-chat review and assignment path. Keep ATS-09 open for native review and migration approval. |
| ATS-10 | Add an admin review queue and safe manual organization assignment for legacy chats. | Implemented, native review and migration pending | All queue, detail, verified-organization, and assignment endpoints check for an authenticated admin. Focused checks passed. Migration review and native review remain pending. |
| ATS-11 | Commit an offer response, application outcome, hiring history, chat message, and durable email intent as one transaction. | Implemented, native review pending | The intent repository owns all writes. Focused tests passed (5 suites, 16 tests), backend typecheck passed, and task-path diff check passed. No schema change was needed. |
| ATS-12 | Add a read-only admin queue filter for organizations with no active jobs. | Implemented locally; native review pending | Uses `job.status = active`. Focused backend and frontend tests, both repository type checks, and scoped diff checks passed. No work-unit commit exists. Preserve search, pagination, and current filters. Assignment, ownership, follow-up dates, status changes, and other write actions remain out of scope. |

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

State: Implemented. Focused tests, both repository type checks, and scoped diff checks pass. Frontend commit: `b64b7a8`. Backend commit: `b930672`. Native RDD review remains pending.

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
- Delivery: frontend work-unit commit `b64b7a8`; backend work-unit commit `b930672`. Native RDD review remains pending. The user selected `feature-branch-chain` for both repositories.

## ATS-05 timezone slice

State: implementation and corrections complete. Focused local checks pass. Sentinel returned APPROVE after the corrections. Native RDD approval and migration deployment remain pending.

Decision: store each event time as a UTC instant plus the organizer-selected IANA zone. Default the event zone to `America/Santiago`. Show each participant the same instant in that participant's local zone and label the event zone.

Scope: event creation, event editing, event persistence, API responses, and participant time display in both repositories. Preserve existing application links and tenant access checks.

Route: delegated direct. The mapping trigger applies because the event contract crosses backend persistence, API writes and reads, frontend forms, and participant views. The bounded writer used the mapped paths listed below. The final corrections cover numeric zone identifiers and participant-local weekly placement.

### Checklist

- [x] ATS-05-TZ: store and preserve the UTC instant and IANA event zone through create and edit, then show participant-local time with the event-zone label. Add the approved public tests and record their observed results.
- [ ] ATS-05-TZ-REVIEW: complete native review for this slice. No native approval is recorded.
- [ ] ATS-05-TZ-DEPLOY: apply any required migration only after native review and approved production credentials, session, and execution context.

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

Next step: complete native RDD review for this slice. Apply ignored migration `1791800000009-EventTimeZone.ts` only after native review and approved production credentials, session, and execution context. Keep invitations, rescheduling, reminders, interviewer results, calendar sync, and the other ATS review and deployment prerequisites pending. The selected delivery strategy is `feature-branch-chain`.

## ATS-05-1 RSVP rules and interview history

State: RSVP transition rules and history remain blocked on the product policy below. ATS-05-1a independently verifies the existing controller authorization checks.

Exploration evidence from 2026-10-10:

- `PATCH /events/:id/participants/:userId` checks requester identity and event RSVP access in the controller.
- The RSVP service accepts the status supplied by the caller. The original exploration found no RSVP controller test. ATS-05-1a adds controller-mock authorization coverage below.
- Organizer edits and cancellations, and participant RSVP changes, trigger best-effort in-app notifications after persistence.
- Current event and participant models do not show a change-history record.
- The frontend supports event creation, editing, deletion, and display of event time, link, and status.

Open product decision: can participants change an accepted or declined RSVP, and can they RSVP after an event is cancelled or completed? Do not define or enforce these transitions until the user decides.

Next implementation task: enforce the approved RSVP transitions, record event and RSVP changes, and verify authorization, persistence, and notification behavior.

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
- [ ] Get the user's RSVP transition policy before implementing state rules.
- [ ] Add service and controller tests for the approved rules, authorization, and persistence failures.
- [ ] Add durable event-change history and verify notification behavior.
- [ ] Verify frontend RSVP and event status updates against the server response.

Delivery: use `feature-branch-chain` on `codex/ats-portal-improvements` in both repositories. Keep ATS-05-1 as a separate work-unit slice and record its commit ID after the commit. No commit exists for this documentation update.

## ATS-05-1a RSVP controller authorization

State: focused checks passed. Commit and native review are pending. The user authorized controller-mock tests and inclusion of the 3 existing event filter and timezone tests in the same spec commit.

Route: delegated direct. One writer adds tests to the existing controller spec and records evidence in the task plan and roadmap.

Scope: `EventController.updateParticipantStatus` only. Check missing requester, mismatched path identity, and event RSVP access denial before the event service runs. Matching identity must reach the event access check. Keep RSVP transition policy and event history open. Do not test accepted or declined response changes, or cancelled or completed events.

- [x] Record the agreed scope before test code.
- [x] Add the controller authorization regression tests.
- [x] Run the event controller Jest spec, backend typecheck, and scoped diff check.
- [ ] Commit the authorized spec and only ATS-05-1a document changes.

Test-first exception: regression coverage for existing behavior only. Production code stays unchanged, so no behavioral RED is claimed.

Limits: mocked event access and service calls do not prove global session-cookie guard behavior, actual database membership, persistence, notifications, or RSVP transition policy. The global guard is outside this fixture. Runtime HTTP checks are not applicable to this controller-mock slice.

Forecast: below 400 authored changed lines, including the existing spec. Delivery uses the approved `feature-branch-chain` strategy. Native review is pending and the parent will run its assessment after this commit.

Rollback: remove the added RSVP describe block and the ATS-05-1a documentation updates. Preserve the 3 existing filter and timezone tests.

Observed checks on 2026-10-10:

- Baseline `npx jest --runInBand src/interfaces/controllers/event/event.controller.spec.ts`: 1 suite, 3 tests passed.
- After adding authorization coverage, the same command passed 1 suite and 6 tests. Added missing requester, mismatched participant identity, and matching-identity access denial tests. No behavioral RED occurred or is claimed.
- `npx tsc --noEmit`: passed, exit 0.
- `git diff --check -- src/interfaces/controllers/event/event.controller.spec.ts odd/tasks/ats-portal-improvements.md docs/plans/backend-roadmap.md`: passed, exit 0. The isolated cached diff must also cover the untracked spec before commit.
- `npx prettier --write src/interfaces/controllers/event/event.controller.spec.ts`: passed before the final tests. Applied a direct slop check to the new code and prose. The exact `/remove-ai-slop` skill is absent from the configured user and project skill paths.
- No server, build, migration, production source change, or RSVP policy change ran.

Commit: pending. Preserve the unrelated staged migration and all prior document edits. The parent owns native assessment and review after this work-unit commit.

## ATS-10 scope and acceptance

- Add an admin page, navigation entry, backend queue and detail routes, and a frontend API proxy.
- Limit the queue to chats where `organizationId` is null. Show the two participants and the chat message history needed for manual review.
- Require an authenticated admin for queue, detail, and assignment operations.
- Let an admin assign one verified organization to one chat at a time. Do not infer the organization from recruiter ownership or membership.
- Update the chat only if it remains unassigned. Record the authenticated admin ID and assignment time in durable columns.
- Leave a chat unassigned when evidence does not support a choice. Organization sends remain blocked for that chat.
- Add focused tests for queue scope, detail access, verified-organization checks, concurrent assignment, and audit fields.
- Keep migrations `1791800000006-ChatOrganization` and `1791800000007-ChatOrganizationReview` unapplied until native review and deployment access are ready.

Status: implementation complete. Native technical review and migration approval remain pending.

## ATS-07-4 offer transaction write failures

State: tests and checks passed. This test-only slice covers the remaining mocked write failures in offer creation. Commit and native review status remain pending.

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
- [ ] ATS-07-4-COMMIT: commit only this work unit and record its commit ID. The parent owns native assessment and review.

Test-first exception: this slice adds regression tests for existing behavior and changes no production behavior. Do not claim a behavioral RED.

Checks:

- Run Prettier on the three allowed paths before checks.
- Run `npx jest --runInBand src/core/services/offer-letter.service.spec.ts`.
- Run `npx tsc --noEmit`.
- Run scoped `git diff --check` for the three allowed paths.

Mock limits: the tests can prove that a mocked write rejection rejects the transaction callback and skips notification. They cannot prove that a real database rolls back writes or leaves no rows. Database-backed verification remains open.

Verification: `npx jest --runInBand src/core/services/offer-letter.service.spec.ts` passed (1 suite, 9 tests). `npx tsc --noEmit` passed. `npx prettier --write src/core/services/offer-letter.service.spec.ts odd/tasks/ats-portal-improvements.md docs/plans/backend-roadmap.md` passed. Scoped `git diff --check` passed after the final document update.


## ATS-07-5 event timezone persistence tests

State: focused tests and checks passed. The work-unit commit remains pending. No production code changed.

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
- [x] Run `npx jest --runInBand src/infrastructure/persistence/event.repository.impl.spec.ts` (1 suite, 3 tests passed).
- [x] Run `npx tsc --noEmit` (passed).
- [x] Run `git diff --check` scoped to the three allowed paths. It passed. The three paths contain no CRLF.
- [ ] Stage only ATS-07-5 additions, inspect the isolated staged diff, commit the work unit, and record its ID. Preserve the migration and earlier document changes.

Verification: `npx jest --runInBand src/infrastructure/persistence/event.repository.impl.spec.ts` passed (1 suite, 3 tests). `npx tsc --noEmit` passed. `git diff --check -- src/infrastructure/persistence/event.repository.impl.spec.ts odd/tasks/ats-portal-improvements.md docs/plans/backend-roadmap.md` passed. Prettier passed before tests.

Commit: pending. The parent owns native assessment and review. No native approval is claimed.

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

State: focused mock coverage passed. Commit and native review remain pending. The user chose the current mocks and explicit evidence limits.

Route: delegated direct. One bounded writer extends the controller spec and adds a service spec. The agreed public methods are evaluation reads and writes, note reads and creation, and note deletion.

- [x] Record the agreed test scope before changing tests.
- [x] Check denied evaluation and note access before downstream reads or writes. Note deletion first reads metadata, so its denial must prevent deletion only.
- [x] Check rejected evaluation upserts, note creation, and note deletion. Check missing write results and missing notes through the controller.
- [x] Run the focused Jest specs, backend typecheck, and scoped diff check. Record observed results.
- [ ] Record the work-unit commit without staging unrelated changes.

Test-first exception: this slice adds regression coverage for existing behavior and does not change production code. No behavioral RED is claimed. Unexpected failures or defects that need production changes stop this slice.

Limits: access and persistence mocks do not prove database membership, actual PostgreSQL constraints, or rollback semantics. A rejected or missing write result does not prove that no partial record exists. The repository saves evaluation or note data before it reloads the result, so a reload failure can follow a successful write. No database, guard-to-database, HTTP filter, production, RSVP, tag-ownership, or retention-policy coverage is added.

Forecast: about 420 authored changed lines including the existing untracked controller tests. The approved `feature-branch-chain` strategy applies. The user authorized inclusion of the existing 9 hiring-record controller cases. Stage only this slice and preserve the prior document edits and staged migration. Observed checks on 2026-10-10:

- Baseline `npx jest --runInBand src/interfaces/controllers/application/application-hiring-record.controller.spec.ts`: 1 suite, 9 tests passed.
- `npx jest --runInBand src/interfaces/controllers/application/application-hiring-record.controller.spec.ts src/core/services/application-hiring-record.service.spec.ts`: 2 suites, 24 tests passed. Added 12 controller cases and 3 service cases.
- `npx tsc --noEmit`: passed, exit 0.
- `git diff --check -- src/interfaces/controllers/application/application-hiring-record.controller.spec.ts src/core/services/application-hiring-record.service.spec.ts odd/tasks/ats-portal-improvements.md docs/plans/backend-roadmap.md`: passed, exit 0. The specs are untracked, so this diff check covers only tracked documents until staging.
- `npx prettier --write src/interfaces/controllers/application/application-hiring-record.controller.spec.ts src/core/services/application-hiring-record.service.spec.ts`: passed before the focused tests.
- No server, build, migration, production check, or RSVP change ran.

Delivery: commit pending. Include both specs and only the ATS-07-2 document hunks. The existing controller cases are part of the authorized slice. Native RDD mode is on. The current-worktree assessment returned high/unassessable because untracked files need an explicit inventory declaration. No native approval is claimed.

### ATS-07-3 event create/edit failure coverage

State: focused checks passed. Commit and native review are pending. Production behavior stays unchanged.

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
- [ ] ATS-07-3-COMMIT: commit only this slice and record its commit ID. The parent owns native assessment and review.

Checks: `npx jest --runInBand src/interfaces/controllers/event/event.controller.spec.ts src/core/services/event.service.spec.ts`, `npx tsc --noEmit`, and `git diff --check -- src/interfaces/controllers/event/event.controller.spec.ts src/core/services/event.service.spec.ts odd/tasks/ats-portal-improvements.md docs/plans/backend-roadmap.md`. Before commit, check the isolated cached diff.

Test-first exception: these regression tests cover existing behavior without production edits. No behavioral RED is required or claimed. Runtime HTTP checks do not apply to this mock-level slice.

Limits: mocks do not prove global cookie-session guards, database membership, PostgreSQL constraints or rollback, durable notification delivery, or RSVP transition policy. A rollback call is control-flow evidence only. A notification failure log is not retry or delivery proof. Database tests, other persistence paths, full-route coverage, native review, production, retention, and event history remain open.

Forecast: below 400 authored changed lines. Use the existing `feature-branch-chain` strategy. Rollback removes the new service spec, added create/edit controller cases, and ATS-07-3 document hunks only. Preserve all prior tests, document edits, and the staged migration.

Verification on 2026-10-10:

- `npx jest --runInBand src/interfaces/controllers/event/event.controller.spec.ts src/core/services/event.service.spec.ts`: passed, 2 suites and 13 tests. Added 2 controller denial cases and 5 service cases. No behavioral RED occurred because production behavior stayed unchanged.
- `npx tsc --noEmit`: passed, exit 0.
- `git diff --check -- src/interfaces/controllers/event/event.controller.spec.ts src/core/services/event.service.spec.ts odd/tasks/ats-portal-improvements.md docs/plans/backend-roadmap.md`: passed, exit 0. The new service spec also needs the isolated cached diff check before commit.
- `npx prettier --write src/interfaces/controllers/event/event.controller.spec.ts src/core/services/event.service.spec.ts`: passed before tests.
- Both full Engram task-document parts were saved and read back before test edits. Refresh them after these results and the commit record.
- No production source, RSVP policy, history, migration, server, or build changed. The exact `/remove-ai-slop` skill remains unavailable. The loaded standards were applied directly.

Commit: pending. The parent owns native assessment and review. No native approval is claimed.

## ATS-02 checklist

- [x] Choose the chat recruiter only when that user still has recruiter access to the offer organization. Otherwise choose the earliest eligible organization member who can recruit.
- [x] Commit the final offer response and its durable email intent in one transaction. Use a conditional transition from `sent` so competing responses cannot both succeed.
- [x] Store the selected recipient and immutable email source data with the intent. Retries use the same recipient and event payload.
- [x] Add a retrying NestJS bridge to a private Next.js endpoint. Validate its service secret and narrow payload. Accept an identical event-key replay and reject a different payload for that key.
- [x] Reconcile final offer responses that lack an intent. Record safe retry state and errors. Keep email enqueue failure from changing the saved response result.
- [x] Say that the offer response was accepted or rejected. Do not claim that the application stage changed.
- [x] Test recipient access selection, conditional responses, intent durability, idempotency, conflicting payloads, retry recovery, and email wording.
- [ ] Keep migration `1791800000008-OfferResponseEmailIntent` unapplied until native review and approved production access.

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
- The migration `1791800000008-OfferResponseEmailIntent` is in source, unstaged, and unapplied. Production migration execution remains pending native review and approved credentials, session, and execution context.
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

State: planned. Add mock-based coverage for initial status-history persistence in `ApplicationRepositoryImpl.create`. Do not change production code unless a test proves a concrete defect. Stop and report before expanding scope if a production defect appears.

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
- [ ] ATS-07-7-COMMIT: inspect the complete isolated staged diff, commit only this slice, and record the commit ID. The parent owns native assessment and review.

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
- `npx tsc --noEmit`: passed, exit 0.
- `git diff --check -- src/infrastructure/persistence/application.repository.impl.spec.ts odd/tasks/ats-portal-improvements.md docs/plans/backend-roadmap.md`: passed, exit 0.
- Isolated `git diff --cached --check`: passed, exit 0. The complete isolated diff contains only the new application repository spec and ATS-07-7 additions to the task plan and roadmap.
- No production source, migration, server, build, or database action ran. The mocks do not prove real rollback or row absence.

Commit: pending. No native approval is claimed.
