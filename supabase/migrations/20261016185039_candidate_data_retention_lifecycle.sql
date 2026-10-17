CREATE TABLE public.candidate_data_lifecycle_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('exported', 'purged', 'anonymized')),
  actor_user_id uuid REFERENCES public."user"(id) ON DELETE SET NULL,
  application_count integer NOT NULL DEFAULT 0 CHECK (application_count >= 0),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object')
);

ALTER TABLE public.resume_cv_cleanup
  ADD COLUMN storage_bucket text NOT NULL DEFAULT 'cv';

UPDATE public.resume_cv_cleanup SET storage_bucket = 'biovity_cv';
ALTER TABLE public.resume_cv_cleanup ALTER COLUMN storage_bucket SET DEFAULT 'biovity_cv';

ALTER TABLE public.resume_cv_cleanup
  DROP CONSTRAINT resume_cv_cleanup_object_path_key,
  ADD CONSTRAINT resume_cv_cleanup_bucket_path_key UNIQUE (storage_bucket, object_path);

CREATE OR REPLACE FUNCTION public.reject_event_interview_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'DELETE'
     AND current_setting('app.purge_candidate_data', true) = 'on'
     AND current_user IN ('postgres', 'service_role') THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'event interview audit records are immutable';
END;
$$;

CREATE INDEX candidate_data_lifecycle_audit_candidate_time_idx
  ON public.candidate_data_lifecycle_audit (candidate_id, occurred_at DESC);

ALTER TABLE public.candidate_data_lifecycle_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.candidate_data_lifecycle_audit FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.candidate_data_lifecycle_audit FROM service_role;
GRANT SELECT, INSERT ON TABLE public.candidate_data_lifecycle_audit TO service_role;
COMMENT ON TABLE public.candidate_data_lifecycle_audit IS
  'Audit metadata for candidate-data exports and retention actions. It must not contain candidate PII.';

COMMENT ON COLUMN public.candidate_data_lifecycle_audit.candidate_id IS
  'Internal identifier retained to prevent duplicate lifecycle work. It is not an export of candidate data.';

CREATE FUNCTION public.ensure_application_candidate_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  candidate_active boolean;
  candidate_type text;
BEGIN
  SELECT "isActive", "type"::text
    INTO candidate_active, candidate_type
    FROM public."user"
   WHERE id = NEW."candidateId"
   FOR UPDATE;

  IF candidate_active IS DISTINCT FROM true OR candidate_type IS DISTINCT FROM 'professional' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Applications require an active professional account';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_application_candidate_active() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER ensure_application_candidate_active_before_write
  BEFORE INSERT OR UPDATE OF "candidateId" ON public.application
  FOR EACH ROW EXECUTE FUNCTION public.ensure_application_candidate_active();

INSERT INTO public.migrations (timestamp, name)
SELECT 1791800000043, 'CandidateDataLifecycle1791800000043'
WHERE NOT EXISTS (
  SELECT 1 FROM public.migrations WHERE name = 'CandidateDataLifecycle1791800000043'
);
