BEGIN;

ALTER TABLE private.realtime_user_channel ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

ALTER TABLE private.realtime_outbox DROP CONSTRAINT IF EXISTS realtime_outbox_event_check;
ALTER TABLE private.realtime_outbox ADD CONSTRAINT realtime_outbox_event_check
  CHECK (event IN ('message_insert', 'notification_insert', 'resource_changed'));

CREATE OR REPLACE FUNCTION private.biovity_resource_recipients(resource text, row_data jsonb)
RETURNS SETOF uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  target_organization_id uuid;
  target_user_id uuid;
  target_job_id uuid;
  target_event_id uuid;
  target_chat_id uuid;
  target_application_id uuid;
BEGIN
  CASE resource
    WHEN 'user' THEN target_user_id := (row_data->>'id')::uuid;
    WHEN 'resume' THEN target_user_id := (row_data->>'userId')::uuid;
    WHEN 'saved_job' THEN target_user_id := (row_data->>'userId')::uuid;
    WHEN 'job_alert' THEN target_user_id := (row_data->>'user_id')::uuid;
    WHEN 'notification' THEN target_user_id := (row_data->>'user_id')::uuid;
    WHEN 'organization' THEN target_organization_id := (row_data->>'id')::uuid;
    WHEN 'organization_member' THEN
      target_organization_id := (row_data->>'organization_id')::uuid;
      target_user_id := (row_data->>'user_id')::uuid;
    WHEN 'job' THEN
      target_organization_id := (row_data->>'organizationId')::uuid;
      target_job_id := (row_data->>'id')::uuid;
    WHEN 'application' THEN
      target_user_id := (row_data->>'candidateId')::uuid;
      target_job_id := (row_data->>'jobId')::uuid;
    WHEN 'event' THEN
      target_organization_id := (row_data->>'organizationId')::uuid;
      target_event_id := (row_data->>'id')::uuid;
      target_user_id := (row_data->>'organizerId')::uuid;
    WHEN 'event_participant' THEN
      target_event_id := (row_data->>'event_id')::uuid;
      target_user_id := (row_data->>'user_id')::uuid;
    WHEN 'event_note' THEN target_event_id := (row_data->>'eventId')::uuid;
    WHEN 'message' THEN target_chat_id := (row_data->>'chatId')::uuid;
    WHEN 'chat' THEN target_chat_id := (row_data->>'id')::uuid;
    WHEN 'pipeline_stage' THEN target_job_id := (row_data->>'job_id')::uuid;
    WHEN 'candidate_tag_assignment' THEN
      SELECT tag.organization_id INTO target_organization_id
      FROM public.candidate_tag AS tag WHERE tag.id = (row_data->>'tag_id')::uuid;
    WHEN 'application_note' THEN target_application_id := (row_data->>'application_id')::uuid;
    WHEN 'application_evaluation' THEN target_application_id := (row_data->>'application_id')::uuid;
    WHEN 'application_status_history' THEN target_application_id := (row_data->>'application_id')::uuid;
    WHEN 'application_answer' THEN target_application_id := (row_data->>'application_id')::uuid;
    WHEN 'capsule_progress' THEN target_user_id := (row_data->>'user_id')::uuid;
    WHEN 'subscription' THEN target_organization_id := (row_data->>'organizationId')::uuid;
    ELSE target_organization_id := (row_data->>'organization_id')::uuid;
  END CASE;

  IF target_application_id IS NOT NULL THEN
    SELECT application."jobId" INTO target_job_id FROM public.application AS application WHERE application.id = target_application_id;
    IF resource IN ('application_answer', 'application_status_history') THEN
      SELECT application."candidateId" INTO target_user_id FROM public.application AS application WHERE application.id = target_application_id;
    END IF;
  END IF;
  IF target_job_id IS NOT NULL AND target_organization_id IS NULL THEN
    SELECT job."organizationId" INTO target_organization_id FROM public.job AS job WHERE job.id = target_job_id;
  END IF;
  IF target_event_id IS NOT NULL AND target_organization_id IS NULL THEN
    SELECT event."organizationId" INTO target_organization_id FROM public.event AS event WHERE event.id = target_event_id;
  END IF;

  RETURN QUERY
  SELECT DISTINCT candidate.id FROM public."user" AS candidate
  WHERE candidate."isActive" IS TRUE
    AND EXISTS (SELECT 1 FROM private.realtime_user_channel AS channel
                JOIN public.session AS session ON session.id = channel.session_id AND session.user_id = channel.user_id
                WHERE channel.user_id = candidate.id AND channel.expires_at > now() AND session.expires_at > now())
    AND (
    candidate.id = target_user_id
    OR candidate.type = 'admin' OR candidate.role = 'admin'
    OR EXISTS (SELECT 1 FROM private.realtime_user_channel AS administrator
               JOIN public.session AS admin_session ON admin_session.id = administrator.session_id AND admin_session.user_id = administrator.user_id
               WHERE administrator.user_id = candidate.id AND administrator.is_admin IS TRUE AND administrator.expires_at > now() AND admin_session.expires_at > now())
    OR (target_organization_id IS NOT NULL AND candidate.type = 'organization' AND (
      candidate."organizationId" = target_organization_id
      OR EXISTS (SELECT 1 FROM public.organization_member AS member
                 WHERE member.organization_id = target_organization_id AND member.user_id = candidate.id)
    ))
    OR (target_event_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.event AS event
      WHERE event.id = target_event_id AND candidate.id IN (event."organizerId", event."candidateId")
    ))
    OR (target_event_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.event_participant AS participant
      WHERE participant.event_id = target_event_id AND participant.user_id = candidate.id
    ))
    OR (resource = 'event' AND candidate.id = (row_data->>'candidateId')::uuid)
    OR (resource = 'chat' AND candidate.id IN ((row_data->>'recruiterId')::uuid, (row_data->>'professionalId')::uuid))
    OR (target_chat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.chat AS chat WHERE chat.id = target_chat_id
        AND candidate.id IN (chat."recruiterId", chat."professionalId")
    ))
    OR (resource = 'job' AND candidate.type = 'professional' AND row_data->>'status' = 'active')
    OR (resource IN ('user', 'resume') AND candidate.type = 'organization' AND EXISTS (
      SELECT 1 FROM public."user" AS professional
      WHERE professional.id = target_user_id AND professional.type = 'professional'
    ))
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.enqueue_biovity_resource_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  before_row jsonb := CASE WHEN TG_OP = 'INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END;
  after_row jsonb := CASE WHEN TG_OP = 'DELETE' THEN '{}'::jsonb ELSE to_jsonb(NEW) END;
  recipient uuid;
  queued_id bigint;
  entity_id text;
BEGIN
  IF TG_OP = 'UPDATE' AND
     (before_row - ARRAY['updatedAt', 'updated_at', 'views', 'profileViews']) =
     (after_row - ARRAY['updatedAt', 'updated_at', 'views', 'profileViews']) THEN
    RETURN NEW;
  END IF;
  entity_id := coalesce(after_row->>'id', before_row->>'id', after_row->>'organization_id', before_row->>'organization_id');
  FOR recipient IN
    SELECT private.biovity_resource_recipients(TG_TABLE_NAME, before_row)
    UNION
    SELECT private.biovity_resource_recipients(TG_TABLE_NAME, after_row)
  LOOP
    INSERT INTO private.realtime_outbox (recipient_user_id, event, payload)
    VALUES (recipient, 'resource_changed', jsonb_build_object(
      'resource', TG_TABLE_NAME, 'id', entity_id, 'operation', lower(TG_OP)
    )) RETURNING id INTO queued_id;
    PERFORM private.dispatch_biovity_realtime_event(queued_id);
  END LOOP;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

REVOKE ALL ON FUNCTION private.biovity_resource_recipients(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.enqueue_biovity_resource_change() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  resource text;
BEGIN
  FOREACH resource IN ARRAY ARRAY[
    'user', 'resume', 'job', 'application', 'event', 'event_participant', 'event_note',
    'organization', 'organization_member', 'saved_job', 'job_alert', 'saved_candidate',
    'candidate_tag', 'candidate_tag_assignment', 'pipeline_stage', 'subscription',
    'job_question', 'job_template', 'message_template', 'activity_log', 'saved_search',
    'chat', 'application_note', 'application_evaluation', 'application_status_history',
    'application_answer', 'application_ai_score', 'capsule_progress', 'organization_onboarding'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS biovity_resource_realtime ON public.%I', resource);
    EXECUTE format('CREATE TRIGGER biovity_resource_realtime AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION private.enqueue_biovity_resource_change()', resource);
  END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS biovity_message_state_realtime ON public.message;
CREATE TRIGGER biovity_message_state_realtime
  AFTER UPDATE OR DELETE ON public.message
  FOR EACH ROW EXECUTE FUNCTION private.enqueue_biovity_resource_change();
DROP TRIGGER IF EXISTS biovity_notification_state_realtime ON public.notification;
CREATE TRIGGER biovity_notification_state_realtime
  AFTER UPDATE OR DELETE ON public.notification
  FOR EACH ROW EXECUTE FUNCTION private.enqueue_biovity_resource_change();

COMMIT;
