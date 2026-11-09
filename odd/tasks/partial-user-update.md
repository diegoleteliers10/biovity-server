# Biovity partial user update

## Objective

Make partial user updates save the existing user instead of attempting an insert.

## Problem and motivation

`UserRepositoryImpl.update` maps a `Partial<User>` across every column. The controller omits `id`, so the mapper emits `id: undefined`. TypeORM 1.1.2 ignores undefined fields, but `repository.save` then receives no primary key and attempts an insert. PostgreSQL rejects the insert with `23502` on `user.email`. Helen reproduced this with an isolated local PostgreSQL database. Explicit `null` values still write `NULL`; omitted fields stay intact when the existing ID is supplied.

## Scope and constraints

- Preserve the existing user ID when saving a partial update.
- Preserve omitted fields and keep explicit-null behavior.
- Add a regression test for the partial update path.
- Use only a local, isolated database for verification.
- Do not touch the existing `vercel.json` change or untracked `.vercelignore`.
- Do not push, open a PR, merge, or access a remote database.

## Acceptance criteria

- Updating a user with only `name` does not attempt an insert.
- The user row retains its ID and all omitted fields.
- Explicit `null` continues to clear nullable fields.
- Focused tests and the local PostgreSQL reproduction pass.

## Tasks

- [x] BI-131-01 Add a regression test for partial updates that omit the ID.
- [x] BI-131-02 Preserve the ID and omitted fields in the update implementation.
- [x] BI-131-03 Run focused tests and the isolated PostgreSQL reproduction.
- [x] BI-131-04 Commit the work unit locally and record its commit.

## Authorized edit scope

- `src/infrastructure/persistence/user.repository.impl.ts`
- `src/infrastructure/persistence/user.repository.impl.spec.ts`
- `odd/tasks/partial-user-update.md`

## Route and delivery

- Route: delegated direct to Helen, the bug owner.
- Trigger: the fix needs both a regression test and an implementation change.
- Forecast: about 50 authored lines, subject to the test seam.
- Delivery strategy: `ask-on-risk`.
- Remote publication remains unauthorized.

## Checks

- `npx jest user.repository.impl`: RED before the fix, then 3 passed.
- `npx tsc --noEmit`: passed.
- Isolated local PostgreSQL reproduction: partial update without `id` succeeds and preserves omitted fields; explicit `null` still clears.
- Plain `git diff --check` reports the source file's existing CRLF endings. The `cr-at-eol` check passes without mixed line endings.

## Progress and next step

- Diagnosis complete: TypeORM ignores `undefined`; the missing primary key causes an insert and a `23502` error.
- No source files changed during diagnosis. The existing local work remains untouched.
- Branch `fix/agents-131-partial-user-update` created from the local `development` ref. The modified `vercel.json` and untracked `.vercelignore` carried over untouched.
- BI-131-01 RED: `npx jest user.repository.impl` → 1 failed, 2 passed. `expected "candidate-id", received undefined` on the object handed to `repository.save`.
- BI-131-02 fix: `definedColumns()` drops undefined columns from the mapper output and the merge pins `id` to the row loaded under the lock.
- BI-131-03 GREEN: `npx jest user.repository.impl` → 3 passed.
- BI-131-03 isolated PostgreSQL 18 (127.0.0.1:55432, throwaway cluster, stopped afterwards):
  - Name-only partial without `id`: `update threw: no`, `rows in user table: 1`, `changed columns: name`.
  - Same partial with `id`: only `name` changed.
  - Explicit `avatar: null`: column became NULL, other columns unchanged.
- BI-131-04: `npx tsc --noEmit` exits clean.
- `git diff --check` flags the CRLF line endings of `user.repository.impl.ts` (stored as CRLF in the index). With `cr-at-eol` declared — `git -c core.whitespace=...,cr-at-eol diff --check` — it is clean, and the file keeps 302 CRLF lines with no mixed endings.
- Commit: `758bc500bdd1a554b765a3f6fa8620a59409d946` on `fix/agents-131-partial-user-update`, based on local `development`.
- Parent spot check: `./node_modules/.bin/jest user.repository.impl` → 3 passed.
- No push or PR was made. Get Diego's explicit GitHub authorization before publication.
