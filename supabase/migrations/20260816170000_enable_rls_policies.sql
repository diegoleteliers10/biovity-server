-- Enable Row Level Security on all public tables.
--
-- Why: the anon key is public in the browser. Without RLS, anyone with the anon
-- key can read and write every table through the Supabase REST API. With RLS
-- enabled and no policies, anon and authenticated get default-deny access.
--
-- What keeps working (verified):
--   - biovity-server (NestJS/TypeORM) connects as `postgres`, table owner:
--     owners bypass RLS because we do NOT use FORCE ROW LEVEL SECURITY.
--   - Next.js server routes use the service_role key: BYPASSRLS.
--   - Better Auth writes user/session/account/verification as `postgres`.
--   - Browser realtime (postgres_changes on message, chat, notification):
--     kept alive with anon SELECT policies below. Presence channels do not
--     touch tables and are unaffected.
--
-- Idempotent: safe to re-run.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Enable RLS on every public table (no FORCE).
-- ---------------------------------------------------------------------------
ALTER TABLE public.account ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_interaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_answer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_evaluation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_note ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_tag_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_note ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participant ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_question ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_alert ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_ai_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_candidate ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_job ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_search ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. anon SELECT policies for browser Realtime (postgres_changes).
--    The browser subscribes with the anon key on:
--      message      (OrganizationMessagesContent, use-messages)
--      chat         (use-chats, channel chat-list-updates)
--      notification (use-notifications)
--    Realtime evaluates the SELECT policy per row; the channels carry no user
--    identity, so the policy must be permissive or events are dropped.
--    This matches the existing pattern on message (anon_select_for_realtime).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS anon_select_for_realtime ON public.message;
CREATE POLICY anon_select_for_realtime ON public.message
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS anon_select_for_realtime ON public.chat;
CREATE POLICY anon_select_for_realtime ON public.chat
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS anon_select_for_realtime ON public.notification;
CREATE POLICY anon_select_for_realtime ON public.notification
  FOR SELECT TO anon USING (true);

COMMIT;
