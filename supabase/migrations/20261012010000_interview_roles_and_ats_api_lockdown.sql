ALTER TABLE public.event_interviewer
	ADD COLUMN role_id text NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001',
	ADD COLUMN role_label_snapshot text NOT NULL DEFAULT 'General',
	ADD CONSTRAINT ck_event_interviewer_role_id
		CHECK (length(btrim(role_id)) BETWEEN 1 AND 80),
	ADD CONSTRAINT ck_event_interviewer_role_label
		CHECK (length(btrim(role_label_snapshot)) BETWEEN 1 AND 80);

ALTER TABLE public.event_interview_evaluation
	ADD COLUMN evaluator_role_id text,
	ADD COLUMN evaluator_role_label text,
	ADD CONSTRAINT ck_event_interview_evaluation_role_snapshot
		CHECK (
			(evaluator_role_id IS NULL AND evaluator_role_label IS NULL)
			OR (
				length(btrim(evaluator_role_id)) BETWEEN 1 AND 80
				AND length(btrim(evaluator_role_label)) BETWEEN 1 AND 80
			)
		);

ALTER TABLE public.pipeline_stage_rubric_version
	ADD COLUMN roles jsonb NOT NULL
		DEFAULT '[{"id":"00000000-0000-4000-8000-000000000001","label":"General"}]'::jsonb,
	ADD CONSTRAINT ck_pipeline_stage_rubric_roles
		CHECK (
			jsonb_typeof(roles) = 'array'
			AND jsonb_array_length(roles) BETWEEN 1 AND 20
		);

DO $migration$
DECLARE
	table_name text;
	internal_ats_tables text[] := ARRAY[
		'activity_log',
		'admin_operations_queue_assignment',
		'admin_operations_queue_assignment_audit',
		'ai_interaction_logs',
		'ai_tool_approval_consumptions',
		'api_keys',
		'application',
		'application_ai_score',
		'application_ai_score_usage',
		'application_answer',
		'application_created_notification_admin_retry',
		'application_created_notification_intent',
		'application_evaluation',
		'application_note',
		'application_status_history',
		'application_status_notification_admin_retry',
		'application_status_notification_intent',
		'candidate_tag',
		'candidate_tag_assignment',
		'chat',
		'email_outbox',
		'event',
		'event_change_history',
		'event_change_notification_admin_retry',
		'event_change_notification_intent',
		'event_interview_audit',
		'event_interview_evaluation',
		'event_interview_outcome',
		'event_interviewer',
		'event_note',
		'event_participant',
		'event_participant_status_history',
		'job_template',
		'message',
		'message_notification_admin_retry',
		'message_notification_intent',
		'message_template',
		'notification_deduplication',
		'offer_letter',
		'offer_response_email_admin_retry',
		'offer_response_email_intent',
		'organization_ai_credentials',
		'organization_member',
		'organization_onboarding',
		'organization_onboarding_assignment',
		'organization_onboarding_assignment_audit',
		'organization_rejection_reason',
		'organization_verification_email_intent',
		'organization_verification_request',
		'pipeline_stage',
		'pipeline_stage_order_backup_1791800000003',
		'pipeline_stage_rubric_version',
		'saved_candidate'
	];
BEGIN
	FOREACH table_name IN ARRAY internal_ats_tables LOOP
		EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
		EXECUTE format(
			'REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated, service_role',
			table_name
		);
	END LOOP;
	GRANT SELECT ON TABLE
		public.application,
		public.event_participant,
		public.chat,
		public.message
	TO service_role;
END
$migration$;
