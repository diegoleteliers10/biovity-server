DO $preflight$
DECLARE
  expected RECORD;
  actual RECORD;
BEGIN
  FOR expected IN
    SELECT *
    FROM (
      VALUES
        (
          'reject_event_interview_audit_mutation',
          '028e9efcde8cca44c18808e80b106aa7',
          'event_interview_audit_immutable'
        ),
        (
          'reject_organization_onboarding_assignment_audit_mutation',
          'ecb2c152c0ceb39242cf0b62d0bdd2de',
          'organization_onboarding_assignment_audit_immutable'
        ),
        (
          'revoke_verification_after_organization_profile_change',
          '112ed1ed91bb06d20313aabe0b987ec9',
          'organization_profile_change_revokes_verification'
        ),
        (
          'revoke_verification_after_owner_change',
          'c959ed43ecfc31951fa6bdf1545d2bf3',
          'organization_owner_change_revokes_verification'
        ),
        (
          'update_updated_at_column',
          '7fac8d02041c9c22b3030217cc9371b1',
          'update_event_updatedAt'
        )
    ) AS functions(function_name, expected_body_md5, expected_trigger)
  LOOP
    SELECT
      p.oid,
      p.prosecdef,
      p.proconfig,
      p.prorettype,
      pg_catalog.md5(p.prosrc) AS body_md5,
      pg_catalog.array_agg(t.tgname::text ORDER BY t.tgname::text)
        FILTER (WHERE t.oid IS NOT NULL) AS trigger_names,
      pg_catalog.bool_and(t.tgenabled IN ('O', 'A'))
        FILTER (WHERE t.oid IS NOT NULL) AS triggers_enabled
    INTO actual
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
    LEFT JOIN pg_catalog.pg_trigger AS t
      ON t.tgfoid = p.oid AND NOT t.tgisinternal
    WHERE n.nspname = 'public'
      AND p.proname = expected.function_name
      AND p.pronargs = 0
    GROUP BY p.oid;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Expected trigger function public.%() was not found',
        expected.function_name;
    END IF;

    IF actual.prorettype <> 'pg_catalog.trigger'::pg_catalog.regtype
      OR actual.prosecdef
      OR actual.proconfig IS NOT NULL
      OR actual.body_md5 <> expected.expected_body_md5
      OR actual.trigger_names IS DISTINCT FROM ARRAY[expected.expected_trigger]
      OR actual.triggers_enabled IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION
        'Trigger function public.%() changed from the reviewed definition',
        expected.function_name;
    END IF;
  END LOOP;
END;
$preflight$;

CREATE OR REPLACE FUNCTION public.revoke_verification_after_organization_profile_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name
    OR NEW.website IS DISTINCT FROM OLD.website
    OR NULLIF(pg_catalog.btrim(NEW.description), '') IS NULL
    OR NULLIF(pg_catalog.btrim(NEW.industry), '') IS NULL
    OR NULLIF(pg_catalog.btrim(NEW.size), '') IS NULL
    OR (NEW.address ->> 'city') IS DISTINCT FROM (OLD.address ->> 'city')
    OR (NEW.address ->> 'country') IS DISTINCT FROM (OLD.address ->> 'country') THEN
    UPDATE public.organization AS organization_row
    SET verification_status = 'unverified'
    WHERE organization_row.id = NEW.id
      AND organization_row.verification_status = 'verified';

    IF FOUND THEN
      UPDATE public.job AS job_row
      SET status = 'draft'
      WHERE job_row."organizationId" = NEW.id
        AND job_row.status = 'active';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_verification_after_owner_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
DECLARE
  affected_organization_id uuid;
BEGIN
  IF NEW.email IS NOT DISTINCT FROM OLD.email
    AND NEW."isEmailVerified" IS NOT DISTINCT FROM OLD."isEmailVerified"
    AND NEW."organizationId" IS NOT DISTINCT FROM OLD."organizationId" THEN
    RETURN NEW;
  END IF;

  FOR affected_organization_id IN
    SELECT DISTINCT organization_id
    FROM (
      VALUES (OLD."organizationId"), (NEW."organizationId")
    ) AS linked(organization_id)
    WHERE organization_id IS NOT NULL
  LOOP
    UPDATE public.organization AS organization_row
    SET verification_status = 'unverified'
    WHERE organization_row.id = affected_organization_id
      AND organization_row.verification_status = 'verified';

    IF FOUND THEN
      UPDATE public.job AS job_row
      SET status = 'draft'
      WHERE job_row."organizationId" = affected_organization_id
        AND job_row.status = 'active';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

ALTER FUNCTION public.reject_event_interview_audit_mutation()
  SET search_path = pg_catalog;
ALTER FUNCTION public.reject_organization_onboarding_assignment_audit_mutation()
  SET search_path = pg_catalog;
ALTER FUNCTION public.update_updated_at_column()
  SET search_path = pg_catalog;

DO $postflight$
DECLARE
  configured_function_count integer;
BEGIN
  SELECT pg_catalog.count(*)
  INTO configured_function_count
  FROM pg_catalog.pg_proc AS p
  JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'update_updated_at_column',
      'revoke_verification_after_organization_profile_change',
      'revoke_verification_after_owner_change',
      'reject_event_interview_audit_mutation',
      'reject_organization_onboarding_assignment_audit_mutation'
    )
    AND p.pronargs = 0
    AND NOT p.prosecdef
    AND p.proconfig = ARRAY['search_path=pg_catalog']::text[];

  IF configured_function_count <> 5 THEN
    RAISE EXCEPTION 'Expected five SECURITY INVOKER trigger functions with a pinned search_path, found %',
      configured_function_count;
  END IF;
END;
$postflight$;
