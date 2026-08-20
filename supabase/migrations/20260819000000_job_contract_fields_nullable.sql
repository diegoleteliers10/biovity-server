-- Make job contract and experience level optional.
--
-- Why: organizations publish a job with only title, description, salary and
-- category. The contract type and experience level are no longer required at
-- creation time. Jobs without this data store NULL.
--
-- Idempotent: safe to re-run.

BEGIN;

ALTER TABLE public.job ALTER COLUMN "employmentType" DROP NOT NULL;
ALTER TABLE public.job ALTER COLUMN "experienceLevel" DROP NOT NULL;

COMMIT;