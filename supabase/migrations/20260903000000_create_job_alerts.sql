-- Create the job_alert table for candidate job alerts.
--
-- A job alert stores the criteria (keywords, location, category) a candidate
-- wants to be notified about, plus a frequency for the future scheduler.
-- Matching and notifications are not built yet; this is the CRUD foundation.
--
-- RLS: default-deny like every other public table. The NestJS API connects as
-- the table owner (postgres) and bypasses RLS; the browser never touches this
-- table directly, so no anon SELECT policy.
--
-- Idempotent: safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS "job_alert" (
  "id"          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id"     uuid NOT NULL,
  "keywords"    text,
  "location"    text,
  "category"    character varying(100),
  "frequency"   character varying(20) NOT NULL DEFAULT 'instantanea',
  "created_at"  timestamptz NOT NULL DEFAULT now(),
  "updated_at"  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "chk_job_alert_frequency"
    CHECK ("frequency" IN ('instantanea', 'diaria', 'semanal')),
  CONSTRAINT "fk_job_alert_user"
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_job_alert_user_id" ON "job_alert" ("user_id");

ALTER TABLE public.job_alert ENABLE ROW LEVEL SECURITY;

COMMIT;
